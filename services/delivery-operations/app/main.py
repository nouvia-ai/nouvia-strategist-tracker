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


# ── Endpoint: GET /operations/health ─────────────────────────────────────────

@app.get("/operations/health")
async def service_health():
    return {
        "service": "delivery-operations",
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": now_iso(),
    }
