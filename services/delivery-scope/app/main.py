import os
import json
import logging
from datetime import datetime, timezone
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
REGION     = os.environ.get("REGION", "us-central1")
MODEL      = "gemini-2.5-flash"

try:
    log_client = gcloud_logging.Client(project=PROJECT_ID)
    log_client.setup_logging()
except Exception:
    pass

logger = logging.getLogger(__name__)

db     = firestore.Client(project=PROJECT_ID)
gemini = genai.Client(vertexai=True, project=PROJECT_ID, location=REGION)
claude = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

app = FastAPI(title="Delivery Scope Agent", version="1.0.0")

BEN_HOURLY_RATE = 250  # USD/hr — Nouvia internal rate for cost calculations


# ── Helpers ───────────────────────────────────────────────────────────────────

def call_gemini(prompt: str, max_tokens: int = 4096) -> dict:
    response = gemini.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1,
            max_output_tokens=max_tokens,
        ),
    )
    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.rstrip("`").strip()
    return json.loads(text)


def call_claude(system: str, user: str, max_tokens: int = 4096) -> dict:
    msg = claude.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    raw = msg.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rstrip("`").strip()
    return json.loads(raw)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_client_actuals(client_id: str) -> list:
    """Load all delivery_actuals for a client via their engagements."""
    eng_docs = (
        db.collection("engagements")
        .where("client_id", "==", client_id)
        .get()
    )
    eng_ids = [d.id for d in eng_docs]
    if not eng_ids:
        return []

    actuals = []
    for eid in eng_ids:
        docs = (
            db.collection("delivery_actuals")
            .where("engagement_id", "==", eid)
            .get()
        )
        for d in docs:
            actuals.append({**d.to_dict(), "engagement_id": eid})
    return actuals


def get_all_actuals_by_type(engagement_type: str) -> list:
    """Load delivery_actuals across all clients filtered by engagement type."""
    # Get all engagements of this type first
    eng_docs = (
        db.collection("engagements")
        .where("type", "==", engagement_type)
        .get()
    )
    eng_ids = [d.id for d in eng_docs]
    if not eng_ids:
        return []

    actuals = []
    for eid in eng_ids[:20]:  # cap at 20 to avoid runaway reads
        docs = (
            db.collection("delivery_actuals")
            .where("engagement_id", "==", eid)
            .get()
        )
        for d in docs:
            actuals.append(d.to_dict())
    return actuals


def calc_avg_variance(actuals: list) -> Optional[float]:
    variances = [a.get("variance_pct") for a in actuals if a.get("variance_pct") is not None]
    if not variances:
        return None
    return round(sum(variances) / len(variances), 1)


def get_intelligence_rules(cluster_keywords: list) -> list:
    """Load intelligence_rules matching any of the given cluster keywords."""
    docs = db.collection("intelligence_rules").limit(100).get()
    rules = []
    for d in docs:
        data = d.to_dict()
        name = (data.get("cluster_name") or data.get("title") or "").lower()
        if any(kw.lower() in name for kw in cluster_keywords):
            rules.append(data.get("rule") or data.get("content") or "")
    return [r for r in rules if r]


def get_intelligence_patterns(client_id: str) -> list:
    """Load intelligence_patterns relevant to a client."""
    docs = (
        db.collection("intelligence_patterns")
        .where("client_id", "==", client_id)
        .limit(20)
        .get()
    )
    if not list(docs):
        # Try fetching without client filter — get general patterns
        docs = db.collection("intelligence_patterns").limit(20).get()
    return [d.to_dict() for d in docs]


# ── Models ────────────────────────────────────────────────────────────────────

class EstimateRequest(BaseModel):
    client_id: str
    title: str
    scope_description: str
    engagement_type: str  # new_build | improvement | audit | managed_support
    complexity_override: Optional[str] = None  # S | M | L | XL


class SowRequest(BaseModel):
    client_id: str
    title: str
    scope_description: str
    engagement_id: Optional[str] = None
    estimate_id: Optional[str] = None


class PricingAnalysisRequest(BaseModel):
    client_id: str
    engagement_type: str
    scope_summary: str


# ── Endpoint: POST /scope/estimate ────────────────────────────────────────────

@app.post("/scope/estimate")
async def generate_estimate(req: EstimateRequest):

    # 1. Client historical actuals
    client_actuals = get_client_actuals(req.client_id)
    avg_variance_pct = calc_avg_variance(client_actuals)
    variance_buffer = avg_variance_pct if avg_variance_pct is not None else 25.0

    # Summarise actuals for the prompt
    client_actuals_summary = []
    for a in client_actuals[:5]:
        client_actuals_summary.append({
            "estimated_hours":  a.get("estimated_hours"),
            "actual_hours":     a.get("actual_hours"),
            "estimated_cost":   a.get("estimated_cost_usd"),
            "actual_cost":      a.get("actual_cost_usd"),
            "variance_pct":     a.get("variance_pct"),
        })

    # 2. Reference class actuals (all clients, same engagement type)
    ref_actuals = get_all_actuals_by_type(req.engagement_type)
    industry_avg_variance = calc_avg_variance(ref_actuals)

    ref_summary = []
    for a in ref_actuals[:8]:
        ref_summary.append({
            "estimated_hours": a.get("estimated_hours"),
            "actual_hours":    a.get("actual_hours"),
            "variance_pct":    a.get("variance_pct"),
        })

    # 3. Pricing + estimation intelligence rules
    pricing_rules    = get_intelligence_rules(["pricing", "price", "estimation", "estimate"])
    pricing_rules_txt = "\n".join(f"- {r}" for r in pricing_rules[:10]) or "No specific rules loaded."

    # 4. Gemini estimation
    prompt = f"""You are the Scope Agent for Nouvia, an AI implementation consultancy.
Generate a calibrated delivery estimate.

REQUEST:
Client: {req.client_id}
Title: {req.title}
Scope: {req.scope_description}
Type: {req.engagement_type}
Complexity override: {req.complexity_override or 'auto-detect'}

HISTORICAL DATA (this client):
{json.dumps(client_actuals_summary, indent=2)}
Average variance: {avg_variance_pct if avg_variance_pct is not None else 'no data'}%

REFERENCE CLASS (all clients, same type — {req.engagement_type}):
{json.dumps(ref_summary, indent=2)}
Industry average variance: {industry_avg_variance if industry_avg_variance is not None else 'no data'}%

PRICING INTELLIGENCE:
{pricing_rules_txt}

Ben's rate: ${BEN_HOURLY_RATE}/hr. AI compute is typically 8-12% of total project cost.

Complexity guidance:
- S: 40-80h total  | M: 80-160h | L: 160-320h | XL: 320-600h

Generate a JSON estimate following this schema exactly:
{{
  "estimated_hours": {{
    "discovery": <number>,
    "architecture": <number>,
    "build": <number>,
    "testing": <number>,
    "deployment": <number>,
    "training": <number>,
    "total": <number>
  }},
  "estimated_cost": {{
    "ben_time_usd": <number>,
    "ai_compute_usd": <number>,
    "infrastructure_usd": <number>,
    "total_usd": <number>,
    "monthly_run_rate_usd": <number or null>
  }},
  "pricing_recommendation": {{
    "project_fee_usd": <number>,
    "monthly_retainer_usd": <number or null>,
    "value_anchor": "<the business outcome to lead with>",
    "negotiation_lever": "<what to remove if client pushes back>"
  }},
  "confidence": "<high|medium|low>",
  "variance_buffer_pct": {variance_buffer},
  "risk_factors": ["<risk>"],
  "assumptions": ["<assumption>"],
  "comparable_engagements": [
    {{"title": "<string>", "estimated_hours": <number>, "actual_hours": <number>, "variance_pct": <number>}}
  ],
  "bias_warnings": ["<bias>"]
}}"""

    estimate = call_gemini(prompt, max_tokens=4096)

    # 5. Apply variance buffer to project_fee if not already reflected
    raw_fee = estimate.get("pricing_recommendation", {}).get("project_fee_usd", 0)
    buffered_fee = round(raw_fee * (1 + variance_buffer / 100))
    if buffered_fee > raw_fee:
        estimate["pricing_recommendation"]["project_fee_usd"] = buffered_fee
        estimate["pricing_recommendation"]["buffer_applied"] = f"+{variance_buffer}% variance buffer"

    # 6. Write to Firestore
    doc = {
        "client_id":            req.client_id,
        "title":                req.title,
        "engagement_type":      req.engagement_type,
        "scope_description":    req.scope_description,
        "estimate":             estimate,
        "comparable_engagements": estimate.get("comparable_engagements", []),
        "confidence":           estimate.get("confidence", "medium"),
        "variance_buffer_pct":  variance_buffer,
        "created_at":           now_iso(),
        "created_by":           "scope_agent",
        "status":               "draft",
    }
    ref = db.collection("delivery_estimates").add(doc)
    estimate_id = ref[1].id

    logger.info(f"estimate generated: client={req.client_id}, id={estimate_id}, confidence={estimate.get('confidence')}")
    return {"estimate_id": estimate_id, **estimate}


# ── Endpoint: POST /scope/generate-sow ───────────────────────────────────────

@app.post("/scope/generate-sow")
async def generate_sow(req: SowRequest):

    # 1. Load engagement details if provided
    eng_data = {}
    if req.engagement_id:
        eng_doc = db.collection("engagements").document(req.engagement_id).get()
        if eng_doc.exists:
            eng_data = eng_doc.to_dict()

    # 2. Load estimate if provided
    estimate_data = {}
    if req.estimate_id:
        est_doc = db.collection("delivery_estimates").document(req.estimate_id).get()
        if est_doc.exists:
            est_d = est_doc.to_dict()
            estimate_data = est_d.get("estimate", {})

    # 3. Intelligence rules for selling patterns
    selling_rules = get_intelligence_rules(["sell", "proposal", "sow", "pricing", "client"])
    selling_rules_txt = "\n".join(f"- {r}" for r in selling_rules[:10]) or "Standard Nouvia approach."

    # 4. Client intelligence patterns
    patterns = get_intelligence_patterns(req.client_id)
    patterns_txt = "\n".join(
        f"- {p.get('title','')}: {p.get('content','')}" for p in patterns[:8]
    ) or "No specific client patterns available."

    # 5. Claude Sonnet SOW generation
    system_prompt = """You are the Scope Agent for Nouvia, an elite AI implementation consultancy.
You write compelling, confident SOW documents that lead with business outcomes.
Nouvia's positioning: we're not a vendor, we're a strategic AI partner.
Output must be valid JSON exactly matching the requested schema."""

    user_prompt = f"""Generate SOW elements for a Nouvia AI implementation engagement.

Client: {req.client_id}
Title: {req.title}
Scope: {req.scope_description}
Engagement data: {json.dumps(eng_data, indent=2) if eng_data else 'New engagement'}
Estimate: {json.dumps(estimate_data, indent=2) if estimate_data else 'No estimate provided'}

Client Intelligence:
{patterns_txt}

Nouvia SOW Rules:
{selling_rules_txt}
- Four-section format: Situation, Approach, Investment, Next Steps
- Lead with business outcome, not features
- Never justify price — present with confidence
- Frame as value propositions: Peace of Mind + Simplifier + Front of the Line
- Include TTFV milestone (Time to First Value < 30 minutes) in Phase 1
- IP ownership: Nouvia retains frameworks/patterns; client gets their data/customizations

Generate JSON:
{{
  "situation": "<2-3 paragraphs: client's current state, pain points, cost of inaction>",
  "approach": {{
    "phases": [
      {{
        "phase_number": <int>,
        "title": "<string>",
        "description": "<string>",
        "deliverables": ["<string>"],
        "duration_weeks": <int>,
        "ttfv_milestone": "<string, phase 1 only — or null>"
      }}
    ],
    "methodology": "<brief description of Nouvia's delivery approach>",
    "ai_components": ["<AI capability being deployed>"]
  }},
  "investment": {{
    "project_fee_usd": <number>,
    "monthly_retainer_usd": <number or null>,
    "payment_schedule": "<string>",
    "whats_included": ["<string>"],
    "whats_not_included": ["<string>"]
  }},
  "next_steps": [
    {{"step": <int>, "action": "<string>", "owner": "Nouvia or Client", "timeline": "<string>"}}
  ],
  "ip_classification": {{
    "nouvia_ip": ["<framework/pattern Nouvia retains>"],
    "client_ip": ["<client-specific data/customization>"],
    "shared_ip": ["<jointly developed component>"]
  }}
}}"""

    sow = call_claude(system_prompt, user_prompt, max_tokens=6000)

    # Merge investment data from estimate if SOW didn't get concrete numbers
    if estimate_data and sow.get("investment", {}).get("project_fee_usd", 0) == 0:
        rec = estimate_data.get("pricing_recommendation", {})
        sow["investment"]["project_fee_usd"]    = rec.get("project_fee_usd", 0)
        sow["investment"]["monthly_retainer_usd"] = rec.get("monthly_retainer_usd")

    # 6. Write to Firestore
    comm_doc = {
        "client_id":     req.client_id,
        "engagement_id": req.engagement_id,
        "estimate_id":   req.estimate_id,
        "type":          "sow_elements",
        "title":         req.title,
        "content":       sow,
        "generated_by":  "scope_agent",
        "generated_at":  now_iso(),
        "status":        "draft",
    }
    ref = db.collection("client_communications").add(comm_doc)
    sow_id = ref[1].id

    logger.info(f"SOW generated: client={req.client_id}, sow_id={sow_id}")
    return {"sow_id": sow_id, **sow}


# ── Endpoint: POST /scope/pricing-analysis ───────────────────────────────────

@app.post("/scope/pricing-analysis")
async def pricing_analysis(req: PricingAnalysisRequest):

    # 1. Client actuals
    client_actuals = get_client_actuals(req.client_id)
    avg_variance   = calc_avg_variance(client_actuals)

    # 2. Pricing intelligence rules
    pricing_rules     = get_intelligence_rules(["pricing", "price", "negotiation", "budget"])
    pricing_rules_txt = "\n".join(f"- {r}" for r in pricing_rules[:12]) or "Standard Nouvia pricing rules."

    # 3. Client buying behavior patterns
    patterns     = get_intelligence_patterns(req.client_id)
    patterns_txt = "\n".join(
        f"- {p.get('title','')}: {p.get('content','')}" for p in patterns[:10]
    ) or "No specific client patterns."

    # Historical spend summary
    total_spend = sum(a.get("actual_cost_usd", 0) or a.get("estimated_cost_usd", 0)
                      for a in client_actuals)
    engagement_count = len(set(a.get("engagement_id") for a in client_actuals))

    prompt = f"""You are Nouvia's Scope Agent analyzing pricing strategy for a client.

Client: {req.client_id}
Engagement type: {req.engagement_type}
Scope: {req.scope_summary}

Client engagement history:
- Total engagements with actuals: {engagement_count}
- Total historical spend: ${total_spend:,.0f}
- Average cost variance: {avg_variance if avg_variance is not None else 'no data'}%

Client Behavior Patterns:
{patterns_txt}

Nouvia Pricing Intelligence:
{pricing_rules_txt}

Nouvia Ben rate: ${BEN_HOURLY_RATE}/hr. Projects typically price at 1.4-1.8x cost.

Analyze and return JSON:
{{
  "recommended_structure": "<project_fee|retainer|hybrid>",
  "price_range": {{
    "low_usd": <number>,
    "mid_usd": <number>,
    "high_usd": <number>
  }},
  "anchor_price_usd": <number — lead with this in proposal>,
  "anchor_rationale": "<why this anchor>",
  "price_sensitivity": "<low|medium|high>",
  "sensitivity_signals": ["<signal from client patterns>"],
  "willingness_to_pay": "<string — qualitative assessment>",
  "optimal_structure_rationale": "<why project vs retainer vs hybrid>",
  "anchoring_strategy": "<how to present price>",
  "negotiation_levers": ["<what to remove/add to adjust scope>"],
  "competitor_context": "<positioning vs alternatives>",
  "risk_of_losing_deal": "<low|medium|high>",
  "deal_acceleration_tactics": ["<tactic>"]
}}"""

    result = call_gemini(prompt, max_tokens=2048)

    logger.info(f"pricing-analysis: client={req.client_id}, structure={result.get('recommended_structure')}")
    return {"client_id": req.client_id, "engagement_type": req.engagement_type, **result}


# ── Endpoint: GET /scope/health ───────────────────────────────────────────────

@app.get("/scope/health")
async def service_health():
    return {
        "service":      "delivery-scope",
        "status":       "healthy",
        "version":      "1.0.0",
        "capabilities": ["estimate", "sow_generation", "pricing_analysis"],
        "timestamp":    now_iso(),
    }
