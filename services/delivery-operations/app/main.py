import os
import json
import logging
from datetime import datetime, timezone, date
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import google.cloud.firestore as firestore
from google.cloud import logging as gcloud_logging
from google import genai
from google.genai import types
import anthropic

# ── Init ──────────────────────────────────────────────────────────────────────
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "nouvia-os")
REGION = os.environ.get("REGION", "us-central1")
MODEL = "gemini-2.5-flash"

try:
    log_client = gcloud_logging.Client(project=PROJECT_ID)
    log_client.setup_logging()
except Exception:
    pass

logger = logging.getLogger(__name__)

db = firestore.Client(project=PROJECT_ID)
gemini = genai.Client(vertexai=True, project=PROJECT_ID, location=REGION)
claude = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

app = FastAPI(title="Delivery Operations Agent", version="1.0.0")


# ── Helpers ───────────────────────────────────────────────────────────────────

def call_gemini(prompt: str) -> dict:
    response = gemini.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1,
            max_output_tokens=4096,
        ),
    )
    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.rstrip("`").strip()
    return json.loads(text)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_str() -> str:
    return date.today().isoformat()


def get_engagement(engagement_id: str) -> dict:
    doc = db.collection("engagements").document(engagement_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Engagement {engagement_id} not found")
    return doc.to_dict()


def get_delivery_tasks(engagement_id: str) -> list:
    docs = (
        db.collection("delivery_tasks")
        .where("engagement_id", "==", engagement_id)
        .get()
    )
    return [d.to_dict() for d in docs]


def get_defects(engagement_id: str) -> list:
    docs = (
        db.collection("defects")
        .where("engagement_id", "==", engagement_id)
        .get()
    )
    return [d.to_dict() for d in docs]


def get_delivery_costs(engagement_id: str) -> list:
    docs = (
        db.collection("delivery_costs")
        .where("engagement_id", "==", engagement_id)
        .get()
    )
    return [d.to_dict() for d in docs]


def get_actuals(engagement_id: str) -> Optional[dict]:
    docs = (
        db.collection("delivery_actuals")
        .where("engagement_id", "==", engagement_id)
        .limit(1)
        .get()
    )
    for d in docs:
        return d.to_dict()
    return None


# ── Models ────────────────────────────────────────────────────────────────────

class HealthCheckRequest(BaseModel):
    engagement_id: str
    notes: Optional[str] = None


class AdoptionReportRequest(BaseModel):
    engagement_id: str
    usage_signals: Optional[str] = None  # comma-separated observations


class EnablementRequest(BaseModel):
    engagement_id: str
    audience: Optional[str] = "client team"
    format: Optional[str] = "guide"  # guide | faq | checklist


class DefectScanRequest(BaseModel):
    engagement_id: str


class AutoEnablementRequest(BaseModel):
    engagement_id: str


# ── Enablement Templates ───────────────────────────────────────────────────────

ONBOARDING_GUIDE_PROMPT = """Create a client onboarding guide for {client_name}'s {platform_name}.

Platform: {platform_description}
Key Features: {feature_list}
Client Industry: {industry}
Client Context: {client_patterns}

Structure:
1. Welcome & What to Expect (1 paragraph)
2. Getting Started (3-5 numbered steps, each with estimated time)
3. Quick Wins — The 3 Fastest Ways to Get Value
   (specific actions the client can take in their first session)
4. Feature Overview (table: Feature | What It Does | When to Use It)
5. Tips for Success (3-5 best practices specific to their industry)
6. Getting Help (how to submit requests through AIMS, response times)
7. What's Coming Next (upcoming features from the engagement roadmap)

Tone: Professional but warm. No jargon. Write for the end user,
not the technical team. Use the client's industry language.
Length: 800-1200 words."""

FEATURE_GUIDE_PROMPT = """Create a feature guide for {feature_name} on {client_name}'s platform.

Feature: {feature_description}
Current Usage: {usage_stats}
Client Industry: {industry}

Structure:
1. The Problem This Solves (in the client's language)
2. How It Works (step-by-step with action verbs)
3. Real Example (specific to their industry/workflow)
4. Pro Tips (3 tips for getting the most out of it)
5. Common Questions

Tone: Clear, actionable, specific to their workflow.
Length: 400-600 words."""

RE_ENGAGEMENT_PROMPT = """Draft a re-engagement message for {client_name}.

Adoption Score: {adoption_score}% (target: 80%)
Unused Features: {unused_features}
Last Active: {last_active}
Client Champion: {champion_name}

Structure:
1. Friendly check-in (not pushy)
2. Highlight 1-2 specific wins they've had so far
3. Introduce ONE unused feature with a concrete benefit
4. Suggest a 15-minute walkthrough session
5. Close with enthusiasm about their progress

Tone: Supportive, not salesy. Like a helpful colleague, not a vendor.
Length: 150-250 words (email length)."""

SUCCESS_STORY_PROMPT = """Draft a client success story for {client_name}.

Engagement: {engagement_title}
Before: {before_state}
After: {after_state}
Adoption Score: {adoption_score}%
Key Metrics: {metrics}
Time to Value: {ttfv}

Structure:
1. The Challenge (what the client was dealing with before)
2. The Solution (what Nouvia built — focus on outcomes not tech)
3. The Results (specific, measurable improvements)
4. Client Quote Placeholder (suggest what to ask for)
5. What's Next (future roadmap)

Tone: Results-focused. Quantify everything possible.
Length: 500-700 words."""


# ── Auto-enablement helpers ───────────────────────────────────────────────────

def get_latest_adoption(engagement_id: str) -> Optional[dict]:
    docs = (
        db.collection("adoption_reports")
        .where("engagement_id", "==", engagement_id)
        .order_by("date", direction=firestore.Query.DESCENDING)
        .limit(1)
        .get()
    )
    for d in docs:
        return d.to_dict()
    return None


def get_recent_adoptions(engagement_id: str, n: int = 4) -> list:
    docs = (
        db.collection("adoption_reports")
        .where("engagement_id", "==", engagement_id)
        .order_by("date", direction=firestore.Query.DESCENDING)
        .limit(n)
        .get()
    )
    return [d.to_dict() for d in docs]


def get_intelligence_patterns(client_id: str) -> list:
    docs = (
        db.collection("intelligence_patterns")
        .where("client_id", "==", client_id)
        .limit(5)
        .get()
    )
    return [d.to_dict() for d in docs]


def call_claude_text(prompt: str, system: str = "", max_tokens: int = 3000) -> str:
    kwargs = {
        "model": "claude-sonnet-4-6",
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system:
        kwargs["system"] = system
    msg = claude.messages.create(**kwargs)
    return msg.content[0].text.strip()


def check_adoption_declining(recent: list) -> bool:
    """True if adoption score declined across the last 3 reports (newest first)."""
    if len(recent) < 3:
        return False
    scores = [a.get("adoption_score", 0) for a in recent[:3]]
    return scores[0] < scores[1] and scores[1] < scores[2]


def save_comm_doc(engagement_id: str, client_id: str, doc_type: str,
                  title: str, body: str) -> str:
    word_count = len(body.split())
    comm_doc = {
        "engagement_id": engagement_id,
        "client_id": client_id,
        "type": "enablement",
        "doc_type": doc_type,
        "title": title,
        "content": {"body": body},
        "status": "draft",
        "word_count": word_count,
        "generated_at": now_iso(),
        "model": "claude-sonnet-4-6",
    }
    ref = db.collection("client_communications").add(comm_doc)
    doc_id = ref[1].id
    db.collection("change_requests").add({
        "engagement_id": engagement_id,
        "client_id": client_id,
        "category": "enablement_review",
        "title": f"Review enablement doc: {title}",
        "description": f"Auto-generated {doc_type.replace('_', ' ')} — review and approve before sending to client.",
        "priority": "normal",
        "status": "submitted",
        "source": "operations_agent",
        "comm_doc_id": doc_id,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    return doc_id


# ── Endpoint: POST /operations/health-check ───────────────────────────────────

@app.post("/operations/health-check")
async def health_check(req: HealthCheckRequest):
    eng = get_engagement(req.engagement_id)
    tasks = get_delivery_tasks(req.engagement_id)
    defects = get_defects(req.engagement_id)
    costs = get_delivery_costs(req.engagement_id)
    actuals = get_actuals(req.engagement_id)

    # Task metrics
    total_tasks = len(tasks)
    done_tasks = sum(1 for t in tasks if t.get("status") in ("done", "complete", "completed"))
    blocked_tasks = sum(1 for t in tasks if t.get("status") == "blocked")
    completion_pct = round((done_tasks / total_tasks * 100) if total_tasks else 0, 1)

    # Defect metrics
    open_defects = [d for d in defects if d.get("status") not in ("resolved", "closed")]
    critical_defects = [d for d in open_defects if d.get("severity") in ("critical", "high")]

    # Cost variance
    total_cost = sum(c.get("amount", 0) for c in costs)
    variance_pct = actuals.get("variance_pct", 0) if actuals else 0

    prompt = f"""You are a delivery health analyst. Given the following engagement data, compute a health_score (0-100) and return a JSON assessment.

Engagement: {json.dumps(eng)}
Task metrics: total={total_tasks}, done={done_tasks}, blocked={blocked_tasks}, completion_pct={completion_pct}%
Open defects: {len(open_defects)} (critical/high: {len(critical_defects)})
Total cost logged: ${total_cost:,.2f}
Cost variance vs estimate: {variance_pct}%
Additional notes: {req.notes or 'none'}

Scoring guidance:
- Base score starts at 100
- Deduct 5 per blocked task (max -20)
- Deduct 10 per critical/high defect (max -30)
- Deduct up to 20 if cost variance > 25%
- Add up to 10 if completion_pct > 75%

Return ONLY valid JSON:
{{
  "health_score": <int 0-100>,
  "status": "<green|amber|red>",
  "summary": "<2-3 sentence narrative>",
  "risks": ["<risk 1>", "<risk 2>"],
  "recommendations": ["<rec 1>", "<rec 2>"],
  "completion_pct": {completion_pct},
  "open_defects": {len(open_defects)},
  "critical_defects": {len(critical_defects)},
  "cost_variance_pct": {variance_pct}
}}"""

    result = call_gemini(prompt)

    health_doc = {
        "engagement_id": req.engagement_id,
        "client_id": eng.get("client_id", ""),
        "health_score": result.get("health_score", 0),
        "status": result.get("status", "amber"),
        "summary": result.get("summary", ""),
        "risks": result.get("risks", []),
        "recommendations": result.get("recommendations", []),
        "completion_pct": completion_pct,
        "open_defects": len(open_defects),
        "critical_defects": len(critical_defects),
        "cost_variance_pct": variance_pct,
        "checked_at": now_iso(),
    }

    db.collection("delivery_health").document(req.engagement_id).set(health_doc, merge=True)

    # Escalate if health is poor
    score = result.get("health_score", 100)
    if score < 60:
        db.collection("change_requests").add({
            "engagement_id": req.engagement_id,
            "client_id": eng.get("client_id", ""),
            "category": "escalation",
            "title": f"Health score alert: {score}/100 for {eng.get('title', req.engagement_id)}",
            "description": result.get("summary", ""),
            "priority": "high" if score < 40 else "medium",
            "status": "submitted",
            "source": "operations_agent",
            "created_at": now_iso(),
        })
        logger.warning(f"Escalation raised for {req.engagement_id} — score={score}")

    logger.info(f"health-check {req.engagement_id}: score={score}")
    return {"engagement_id": req.engagement_id, **result}


# ── Endpoint: POST /operations/adoption-report ────────────────────────────────

@app.post("/operations/adoption-report")
async def adoption_report(req: AdoptionReportRequest):
    eng = get_engagement(req.engagement_id)
    tasks = get_delivery_tasks(req.engagement_id)
    defects = get_defects(req.engagement_id)

    total_tasks = len(tasks)
    done_tasks = sum(1 for t in tasks if t.get("status") in ("done", "complete", "completed"))
    completion_pct = round((done_tasks / total_tasks * 100) if total_tasks else 0, 1)

    usage_signals = req.usage_signals or "none provided"

    prompt = f"""You are an adoption success analyst. Generate an adoption report for a client engagement.

Engagement: {json.dumps(eng)}
Task completion: {done_tasks}/{total_tasks} ({completion_pct}%)
Open defects: {sum(1 for d in defects if d.get("status") not in ("resolved","closed"))}
Usage signals from field: {usage_signals}

Return ONLY valid JSON:
{{
  "adoption_score": <int 0-100>,
  "adoption_tier": "<champion|active|at_risk|inactive>",
  "headline": "<one-line summary>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "next_actions": ["<action 1>", "<action 2>", "<action 3>"],
  "enablement_needed": <true|false>,
  "enablement_topic": "<topic if enablement_needed is true, else null>"
}}"""

    result = call_gemini(prompt)

    report_doc = {
        "engagement_id": req.engagement_id,
        "client_id": eng.get("client_id", ""),
        "date": today_str(),
        "adoption_score": result.get("adoption_score", 0),
        "adoption_tier": result.get("adoption_tier", "at_risk"),
        "headline": result.get("headline", ""),
        "strengths": result.get("strengths", []),
        "gaps": result.get("gaps", []),
        "next_actions": result.get("next_actions", []),
        "enablement_needed": result.get("enablement_needed", False),
        "enablement_topic": result.get("enablement_topic"),
        "generated_at": now_iso(),
    }

    doc_id = f"{req.engagement_id}_{today_str()}"
    db.collection("adoption_reports").document(doc_id).set(report_doc)

    # If adoption declining, raise change request
    if result.get("adoption_tier") in ("at_risk", "inactive"):
        db.collection("change_requests").add({
            "engagement_id": req.engagement_id,
            "client_id": eng.get("client_id", ""),
            "category": "escalation",
            "title": f"Adoption at risk: {eng.get('title', req.engagement_id)}",
            "description": result.get("headline", ""),
            "priority": "high" if result.get("adoption_tier") == "inactive" else "medium",
            "status": "submitted",
            "source": "operations_agent",
            "created_at": now_iso(),
        })

    logger.info(f"adoption-report {req.engagement_id}: tier={result.get('adoption_tier')}")
    return {"engagement_id": req.engagement_id, "report_id": doc_id, **result}


# ── Endpoint: POST /operations/generate-enablement ───────────────────────────

@app.post("/operations/generate-enablement")
async def generate_enablement(req: EnablementRequest):
    eng = get_engagement(req.engagement_id)
    tasks = get_delivery_tasks(req.engagement_id)
    defects = get_defects(req.engagement_id)

    done_tasks = [t for t in tasks if t.get("status") in ("done", "complete", "completed")]
    open_defects = [d for d in defects if d.get("status") not in ("resolved", "closed")]

    # Use Claude Sonnet for high-quality enablement content
    system_prompt = """You are a delivery enablement specialist who writes practical, concise client-facing materials.
Your writing is clear, action-oriented, and avoids jargon. Format output as valid JSON."""

    user_prompt = f"""Generate a {req.format} for {req.audience} based on this delivery engagement.

Client: {eng.get("client_id", "Unknown")}
Engagement: {eng.get("title", "")}
Description: {eng.get("description", "")}
Completed deliverables: {[t.get("title","") for t in done_tasks[:10]]}
Known issues: {[d.get("title","") for d in open_defects[:5]]}

Return ONLY valid JSON:
{{
  "title": "<document title>",
  "format": "{req.format}",
  "audience": "{req.audience}",
  "sections": [
    {{
      "heading": "<section heading>",
      "content": "<section content — 2-4 sentences or bullet list>"
    }}
  ],
  "key_takeaways": ["<takeaway 1>", "<takeaway 2>", "<takeaway 3>"],
  "next_steps": ["<step 1>", "<step 2>"]
}}"""

    message = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": user_prompt}],
        system=system_prompt,
    )

    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rstrip("`").strip()
    result = json.loads(raw)

    comm_doc = {
        "engagement_id": req.engagement_id,
        "client_id": eng.get("client_id", ""),
        "type": f"enablement_{req.format}",
        "audience": req.audience,
        "title": result.get("title", ""),
        "content": result,
        "generated_at": now_iso(),
        "model": "claude-sonnet-4-6",
    }

    ref = db.collection("client_communications").add(comm_doc)
    doc_id = ref[1].id

    logger.info(f"generate-enablement {req.engagement_id}: doc_id={doc_id}")
    return {"engagement_id": req.engagement_id, "communication_id": doc_id, **result}


# ── Endpoint: POST /operations/defect-scan ────────────────────────────────────

@app.post("/operations/defect-scan")
async def defect_scan(req: DefectScanRequest):
    eng = get_engagement(req.engagement_id)
    tasks = get_delivery_tasks(req.engagement_id)
    defects = get_defects(req.engagement_id)
    costs = get_delivery_costs(req.engagement_id)

    open_defects = [d for d in defects if d.get("status") not in ("resolved", "closed")]
    stale_defects = []
    now = datetime.now(timezone.utc)

    for d in open_defects:
        created_raw = d.get("created_at", "")
        try:
            if isinstance(created_raw, str):
                created_dt = datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
            else:
                created_dt = created_raw
            age_days = (now - created_dt).days
            if age_days > 7:
                stale_defects.append({**d, "age_days": age_days})
        except Exception:
            pass

    blocked_tasks = [t for t in tasks if t.get("status") == "blocked"]
    ai_costs = [c for c in costs if c.get("cost_type") in ("ai_compute", "llm_api")]
    total_ai_cost = sum(c.get("amount", 0) for c in ai_costs)

    prompt = f"""You are a delivery quality analyst. Scan for risks and quality issues.

Engagement: {json.dumps({k: v for k, v in eng.items() if k in ('title','client_id','status','budget')})}
Open defects: {len(open_defects)} (stale >7 days: {len(stale_defects)})
Stale defect details: {json.dumps([{k: d.get(k,'') for k in ('title','severity','age_days')} for d in stale_defects[:5]])}
Blocked tasks: {len(blocked_tasks)} — {[t.get('title','') for t in blocked_tasks[:5]]}
AI compute cost to date: ${total_ai_cost:,.2f}

Return ONLY valid JSON:
{{
  "risk_level": "<low|medium|high|critical>",
  "scan_summary": "<2-3 sentence overview>",
  "stale_defect_count": {len(stale_defects)},
  "blocked_task_count": {len(blocked_tasks)},
  "ai_cost_flag": <true if total_ai_cost > 1000 else false>,
  "findings": [
    {{"type": "<defect|blocker|cost|quality>", "title": "<finding>", "severity": "<low|medium|high>", "recommendation": "<action>"}}
  ],
  "immediate_actions": ["<action 1>", "<action 2>"]
}}"""

    result = call_gemini(prompt)

    # Write findings to delivery_health as supplementary scan
    scan_doc = {
        "engagement_id": req.engagement_id,
        "client_id": eng.get("client_id", ""),
        "scan_type": "defect_scan",
        "risk_level": result.get("risk_level", "medium"),
        "scan_summary": result.get("scan_summary", ""),
        "findings": result.get("findings", []),
        "stale_defect_count": len(stale_defects),
        "blocked_task_count": len(blocked_tasks),
        "scanned_at": now_iso(),
    }
    db.collection("delivery_health").document(f"{req.engagement_id}_scan").set(scan_doc)

    # Escalate critical risk
    if result.get("risk_level") == "critical":
        db.collection("change_requests").add({
            "engagement_id": req.engagement_id,
            "client_id": eng.get("client_id", ""),
            "category": "escalation",
            "title": f"Critical risk scan: {eng.get('title', req.engagement_id)}",
            "description": result.get("scan_summary", ""),
            "priority": "high",
            "status": "submitted",
            "source": "operations_agent",
            "created_at": now_iso(),
        })

    logger.info(f"defect-scan {req.engagement_id}: risk={result.get('risk_level')}")
    return {"engagement_id": req.engagement_id, **result}


# ── Endpoint: POST /operations/auto-enablement ───────────────────────────────

@app.post("/operations/auto-enablement")
async def auto_enablement(req: AutoEnablementRequest):
    eng = get_engagement(req.engagement_id)
    adoption      = get_latest_adoption(req.engagement_id)
    recent        = get_recent_adoptions(req.engagement_id, 4)
    patterns      = get_intelligence_patterns(eng.get("client_id", ""))

    client_name   = eng.get("client_name") or eng.get("client_id", "the client")
    platform_name = eng.get("title", "the platform")
    platform_desc = eng.get("description", "")
    industry      = eng.get("industry", "technology")
    status        = eng.get("status", "")
    client_id     = eng.get("client_id", "")

    adoption_score    = adoption.get("adoption_score", 0) if adoption else 0
    adoption_declining = check_adoption_declining(recent)

    client_patterns_str = json.dumps([
        {"pattern": p.get("pattern_text", ""), "category": p.get("category", "")}
        for p in patterns[:5]
    ]) if patterns else "No specific patterns available."

    system_prompt = (
        "You are a delivery enablement specialist who writes clear, practical "
        "client-facing materials. Your writing is professional, warm, and avoids "
        "jargon. Write for the end user, not the technical team."
    )

    docs_generated = []

    if status == "deployed":
        # ── Path 1: Just launched → onboarding + checklist + FAQ ─────────────
        tasks      = get_delivery_tasks(req.engagement_id)
        feat_list  = ", ".join(t.get("title", "") for t in tasks[:10]) or "core features"

        # Onboarding Guide
        body = call_claude_text(ONBOARDING_GUIDE_PROMPT.format(
            client_name=client_name, platform_name=platform_name,
            platform_description=platform_desc, feature_list=feat_list,
            industry=industry, client_patterns=client_patterns_str,
        ), system_prompt, max_tokens=3000)
        title = f"{client_name} — Onboarding Guide"
        docs_generated.append({"id": save_comm_doc(req.engagement_id, client_id, "onboarding_guide", title, body),
                                "type": "onboarding_guide", "title": title})

        # Quick Start Checklist
        body = call_claude_text(
            f"Create a quick start checklist for {client_name}'s {platform_name}.\n\n"
            f"Platform: {platform_desc}\nIndustry: {industry}\n\n"
            "Format as a numbered checklist of 5-8 action-oriented items, each completable "
            "in under 15 minutes. Include a time estimate per item. Total: under 60 minutes. "
            "Write for a non-technical user.",
            system_prompt, max_tokens=1000)
        title = f"{client_name} — Quick Start Checklist"
        docs_generated.append({"id": save_comm_doc(req.engagement_id, client_id, "checklist", title, body),
                                "type": "checklist", "title": title})

        # FAQ
        body = call_claude_text(
            f"Create an FAQ document for {client_name}'s {platform_name}.\n\n"
            f"Platform: {platform_desc}\nIndustry: {industry}\n"
            f"Client context: {client_patterns_str}\n\n"
            "Generate 8-12 questions and answers a new user would ask: getting started, "
            "common tasks, troubleshooting, and how to submit requests through AIMS.\n"
            "Format: **Q: [question]**\nA: [clear, specific answer]",
            system_prompt, max_tokens=2000)
        title = f"{client_name} — FAQ"
        docs_generated.append({"id": save_comm_doc(req.engagement_id, client_id, "faq", title, body),
                                "type": "faq", "title": title})

    elif status == "operating" and adoption_score < 50:
        # ── Path 2: Low adoption → feature guide + re-engagement email ────────
        gaps    = adoption.get("gaps", []) if adoption else []
        unused  = ", ".join(gaps[:5]) if gaps else "several platform features"
        last_active = adoption.get("date", "recently") if adoption else "recently"
        champion = eng.get("champion_name") or eng.get("client_contact", "your team")

        body = call_claude_text(FEATURE_GUIDE_PROMPT.format(
            feature_name="Key Platform Features",
            client_name=client_name,
            feature_description=f"Core capabilities underutilized: {unused}",
            usage_stats=f"Adoption score: {adoption_score}% — these features are underutilised",
            industry=industry,
        ), system_prompt, max_tokens=2000)
        title = f"{client_name} — Feature Discovery Guide"
        docs_generated.append({"id": save_comm_doc(req.engagement_id, client_id, "feature_guide", title, body),
                                "type": "feature_guide", "title": title})

        body = call_claude_text(RE_ENGAGEMENT_PROMPT.format(
            client_name=client_name, adoption_score=adoption_score,
            unused_features=unused, last_active=last_active, champion_name=champion,
        ), system_prompt, max_tokens=1000)
        title = f"{client_name} — Re-engagement Email"
        docs_generated.append({"id": save_comm_doc(req.engagement_id, client_id, "re_engagement", title, body),
                                "type": "re_engagement", "title": title})

    elif status == "operating" and adoption_declining:
        # ── Path 3: Declining adoption → playbook + executive summary ─────────
        scores_trend = [a.get("adoption_score", 0) for a in recent[:4]]
        gaps_json    = json.dumps(adoption.get("gaps", []) if adoption else [])

        body = call_claude_text(
            f"Create an adoption intervention playbook for {client_name}'s {platform_name}.\n\n"
            f"Current adoption score: {adoption_score}% (declining trend: {scores_trend})\n"
            f"Platform: {platform_desc}\nIndustry: {industry}\nIdentified gaps: {gaps_json}\n\n"
            "Structure:\n"
            "1. Situation Assessment\n2. Root Cause Analysis (3 likely causes)\n"
            "3. Intervention Steps (5-7 actions, ordered by impact)\n"
            "4. Success Metrics (30-day measurement plan)\n"
            "5. Escalation Path (if no improvement in 2 weeks)\n\n"
            "Tone: Direct and action-oriented. Internal document for Ben's use.\n"
            "Length: 600-800 words.",
            system_prompt, max_tokens=2500)
        title = f"{client_name} — Adoption Intervention Playbook"
        docs_generated.append({"id": save_comm_doc(req.engagement_id, client_id, "intervention_playbook", title, body),
                                "type": "intervention_playbook", "title": title})

        body = call_claude_text(
            f"Write an executive summary of adoption trends for {client_name}.\n\n"
            f"Current adoption score: {adoption_score}%\n"
            f"Recent trend (newest first): {scores_trend}\n"
            f"Platform: {platform_name}\nKey gaps: {gaps_json}\n\n"
            "Structure:\n"
            "1. Current State (1 paragraph, numbers-forward)\n"
            "2. Trend Analysis\n3. Business Impact\n"
            "4. Recommended Actions (3 executive-level bullets)\n"
            "5. 30-Day Outlook\n\n"
            "Tone: Executive-level. Concise. Data-driven.\nLength: 300-400 words.",
            system_prompt, max_tokens=1500)
        title = f"{client_name} — Adoption Executive Summary"
        docs_generated.append({"id": save_comm_doc(req.engagement_id, client_id, "executive_summary", title, body),
                                "type": "executive_summary", "title": title})

    elif status == "operating" and adoption_score > 80:
        # ── Path 4: High adoption → success story + ROI + expansion ──────────
        strengths    = adoption.get("strengths", []) if adoption else []
        strengths_j  = json.dumps(strengths[:5])
        ttfv         = eng.get("time_to_value", "within 90 days")

        body = call_claude_text(SUCCESS_STORY_PROMPT.format(
            client_name=client_name,
            engagement_title=platform_name,
            before_state=eng.get("description", "manual processes and inefficiencies"),
            after_state=f"AI-powered platform with {adoption_score}% adoption",
            adoption_score=adoption_score,
            metrics=strengths_j,
            ttfv=ttfv,
        ), system_prompt, max_tokens=2500)
        title = f"{client_name} — Success Story Draft"
        docs_generated.append({"id": save_comm_doc(req.engagement_id, client_id, "success_story", title, body),
                                "type": "success_story", "title": title})

        body = call_claude_text(
            f"Create an ROI summary for {client_name}'s {platform_name}.\n\n"
            f"Adoption score: {adoption_score}%\nStrengths: {strengths_j}\n"
            f"Industry: {industry}\n\n"
            "Structure:\n"
            "1. Investment Summary\n2. Value Delivered\n"
            "3. ROI Indicators (3-5 specific metrics)\n"
            "4. Cost of Not Acting\n5. Path to Greater ROI (2-3 expansion opportunities)\n\n"
            "Tone: Business case language. Numbers wherever possible.\nLength: 400-500 words.",
            system_prompt, max_tokens=2000)
        title = f"{client_name} — ROI Summary"
        docs_generated.append({"id": save_comm_doc(req.engagement_id, client_id, "roi_summary", title, body),
                                "type": "roi_summary", "title": title})

        body = call_claude_text(
            f"Draft expansion proposal elements for {client_name}.\n\n"
            f"Current engagement: {platform_name}\n"
            f"Adoption: {adoption_score}% — performing well\n"
            f"Industry: {industry}\nClient strengths: {strengths_j}\n"
            f"Client patterns: {client_patterns_str}\n\n"
            "Generate:\n"
            "1. Expansion Opportunities (3-4 specific next phases)\n"
            "2. Value Proposition for Each\n"
            "3. Recommended Starting Point (with rationale)\n"
            "4. Success Metrics for Expansion\n"
            "5. Conversation Starter (how to introduce to client)\n\n"
            "Tone: Strategic, forward-looking, client-focused.\nLength: 500-600 words.",
            system_prompt, max_tokens=2500)
        title = f"{client_name} — Expansion Proposal Elements"
        docs_generated.append({"id": save_comm_doc(req.engagement_id, client_id, "expansion_proposal", title, body),
                                "type": "expansion_proposal", "title": title})

    else:
        logger.info(f"auto-enablement {req.engagement_id}: no trigger matched "
                    f"(status={status}, adoption={adoption_score})")
        return {
            "engagement_id": req.engagement_id,
            "documents_generated": 0,
            "titles": [],
            "reason": f"No enablement trigger matched for status={status}, adoption_score={adoption_score}",
        }

    logger.info(f"auto-enablement {req.engagement_id}: generated {len(docs_generated)} docs")
    return {
        "engagement_id": req.engagement_id,
        "documents_generated": len(docs_generated),
        "titles": [d["title"] for d in docs_generated],
        "details": docs_generated,
    }


# ── Endpoint: POST /operations/auto-enablement-all ────────────────────────────

@app.post("/operations/auto-enablement-all")
async def auto_enablement_all():
    snap = (
        db.collection("engagements")
        .where("status", "in", ["deployed", "operating"])
        .get()
    )
    results = []
    errors  = []
    for doc in snap:
        try:
            result = await auto_enablement(AutoEnablementRequest(engagement_id=doc.id))
            results.append(result)
        except Exception as e:
            logger.warning(f"auto-enablement-all: failed for {doc.id}: {e}")
            errors.append({"engagement_id": doc.id, "error": str(e)})

    total_docs = sum(r.get("documents_generated", 0) for r in results)
    logger.info(f"auto-enablement-all: {len(results)} engagements, {total_docs} docs")
    return {
        "engagements_processed": len(results),
        "documents_generated": total_docs,
        "results": results,
        "errors": errors,
    }


# ── Endpoint: GET /operations/health ─────────────────────────────────────────

@app.get("/operations/health")
async def service_health():
    return {
        "service": "delivery-operations",
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": now_iso(),
    }
