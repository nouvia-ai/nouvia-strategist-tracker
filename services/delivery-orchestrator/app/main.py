"""
Delivery Orchestrator — Nouvia Intelligence Platform
Routes change_requests to the correct destination: defects, governance queue, or delivery tasks.
Triggered every 5 minutes by Cloud Scheduler.
"""
import logging
from datetime import datetime, timezone

from fastapi import FastAPI
from google.cloud import firestore

# ── Setup ─────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PROJECT_ID = "nouvia-os"
db = firestore.Client(project=PROJECT_ID)

app = FastAPI(title="Nouvia Delivery Orchestrator", version="1.0.0")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Routing logic ─────────────────────────────────────────────────────────────

def route_to_defect(req_id: str, req: dict) -> str:
    """Create a defect from a bug_fix change_request."""
    defect = {
        "client_id": req.get("client_id"),
        "engagement_id": req.get("engagement_id", ""),
        "severity": "medium" if req.get("priority") == "high" else "low",
        "status": "detected",
        "description": req.get("description", req.get("title", "")),
        "detected_at": now_iso(),
        "detected_by": "orchestrator",
        "source_request_id": req_id,
        "created_by": "orchestrator",
    }
    ref = db.collection("defects").add(defect)
    db.collection("change_requests").document(req_id).update({
        "status": "routed_to_defects",
        "routed_to": f"defects/{ref[1].id}",
        "updated_at": now_iso(),
    })
    logger.info(f"[orchestrator] {req_id} → defects/{ref[1].id}")
    return ref[1].id


def route_to_governance(req_id: str, req: dict) -> str:
    """Flag a question for Ben's response queue."""
    db.collection("change_requests").document(req_id).update({
        "status": "pending_response",
        "updated_at": now_iso(),
    })
    logger.info(f"[orchestrator] {req_id} → governance (question)")
    return req_id


def find_active_engagement(client_id: str):
    """Find the most recent non-operating engagement for a client."""
    active_statuses = ["intake", "scoping", "building", "testing", "deployed"]
    snap = (
        db.collection("engagements")
        .where("client_id", "==", client_id)
        .where("status", "in", active_statuses)
        .order_by("created_at", direction=firestore.Query.DESCENDING)
        .limit(1)
        .get()
    )
    docs = list(snap)
    if docs:
        return docs[0].id, docs[0].data()
    return None, None


def route_to_delivery(req_id: str, req: dict) -> dict:
    """Create a delivery_task or new engagement, route the change_request."""
    client_id = req.get("client_id", "unknown")
    eng_id, eng = find_active_engagement(client_id)
    result = {}

    if eng_id:
        # Add as a task on the existing engagement
        task = {
            "engagement_id": eng_id,
            "client_id": client_id,
            "title": req.get("title", "Untitled task"),
            "description": req.get("description", ""),
            "priority": req.get("priority", "medium"),
            "complexity": req.get("complexity", "M"),
            "category": req.get("category", "change_request"),
            "status": "backlog",
            "source_request_id": req_id,
            "created_at": now_iso(),
            "updated_at": now_iso(),
            "created_by": "orchestrator",
        }
        ref = db.collection("delivery_tasks").add(task)
        result = {"routed_to": "delivery_task", "task_id": ref[1].id, "engagement_id": eng_id}
        db.collection("change_requests").document(req_id).update({
            "status": "routed_to_delivery",
            "routed_to": f"delivery_tasks/{ref[1].id}",
            "engagement_id": eng_id,
            "updated_at": now_iso(),
        })
        logger.info(f"[orchestrator] {req_id} → delivery_tasks/{ref[1].id} (eng: {eng_id})")

    else:
        # No active engagement — create new one at intake
        new_eng = {
            "client_id": client_id,
            "title": f"{client_id} — {req.get('title', 'New Engagement')}",
            "type": "new_build",
            "scope_summary": req.get("description", ""),
            "status": "intake",
            "estimated_value_usd": "",
            "source_request_id": req_id,
            "created_at": now_iso(),
            "updated_at": now_iso(),
            "created_by": "orchestrator",
        }
        eng_ref = db.collection("engagements").add(new_eng)
        new_eng_id = eng_ref[1].id
        result = {"routed_to": "new_engagement", "engagement_id": new_eng_id}
        db.collection("change_requests").document(req_id).update({
            "status": "routed_to_delivery",
            "routed_to": f"engagements/{new_eng_id}",
            "engagement_id": new_eng_id,
            "updated_at": now_iso(),
        })
        logger.info(f"[orchestrator] {req_id} → new engagement/{new_eng_id}")

    return result


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/orchestrate/health")
def health():
    return {"status": "healthy", "version": "1.0"}


@app.post("/orchestrate/process-queue")
async def process_queue():
    """Pull submitted change_requests and route each one."""
    snap = (
        db.collection("change_requests")
        .where("status", "==", "submitted")
        .order_by("created_at")
        .limit(50)
        .get()
    )
    requests = [(doc.id, doc.data()) for doc in snap]

    routed = {"defects": 0, "governance": 0, "delivery": 0, "skipped": 0}
    details = []

    for req_id, req in requests:
        category = req.get("category", "")
        try:
            if category == "bug_fix":
                defect_id = route_to_defect(req_id, req)
                routed["defects"] += 1
                details.append({"req_id": req_id, "routed_to": "defects", "id": defect_id})

            elif category == "question":
                route_to_governance(req_id, req)
                routed["governance"] += 1
                details.append({"req_id": req_id, "routed_to": "governance"})

            elif category in ("new_feature", "enhancement", "change_request"):
                r = route_to_delivery(req_id, req)
                routed["delivery"] += 1
                details.append({"req_id": req_id, **r})

            else:
                # Unknown category — mark as pending_response for Ben
                db.collection("change_requests").document(req_id).update({
                    "status": "pending_response",
                    "updated_at": now_iso(),
                })
                routed["skipped"] += 1
                details.append({"req_id": req_id, "routed_to": "pending_response"})

        except Exception as e:
            logger.error(f"[orchestrator] failed to route {req_id}: {e}")
            details.append({"req_id": req_id, "error": str(e)})

    logger.info(f"[orchestrate/process-queue] processed={len(requests)}, routed={routed}")
    return {"processed": len(requests), "routed": routed, "details": details}


@app.post("/orchestrate/check-health")
async def check_health():
    """Assess delivery system health and write a summary to Firestore."""
    # Critical open defects
    crit_snap = (
        db.collection("defects")
        .where("status", "!=", "resolved")
        .where("severity", "==", "critical")
        .get()
    )
    critical_defects = len(list(crit_snap))

    # Overdue engagements (building/testing past estimated_delivery)
    today = datetime.now(timezone.utc).date().isoformat()
    building_snap = (
        db.collection("engagements")
        .where("status", "in", ["building", "testing"])
        .get()
    )
    overdue = []
    for doc in building_snap:
        d = doc.data()
        delivery = d.get("estimated_delivery", "")
        if delivery and delivery < today:
            overdue.append({"id": doc.id, "title": d.get("title", ""), "due": delivery})

    # Health score: 100 base, -20 per critical defect, -10 per overdue engagement
    health_score = max(0, 100 - (critical_defects * 20) - (len(overdue) * 10))

    summary = {
        "critical_defects": critical_defects,
        "overdue_engagements": len(overdue),
        "overdue_details": overdue,
        "over_budget": 0,  # Future: compare delivery_costs vs estimated_value_usd
        "health_score": health_score,
        "checked_at": now_iso(),
    }

    db.collection("delivery_health").document("latest").set(summary)
    logger.info(f"[orchestrate/check-health] score={health_score}, critical={critical_defects}, overdue={len(overdue)}")
    return summary
