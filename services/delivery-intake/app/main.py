"""
Delivery Intake Service — Nouvia Intelligence Platform
Processes requirements from 4 channels: transcript, email, document, AITS portal
Uses Vertex AI (Gemini 1.5 Flash) for requirement extraction.

NOTE: Requires Vertex AI Model Garden Gemini terms acceptance in GCP Console:
  console.cloud.google.com/vertex-ai/model-garden?project=nouvia-os
"""
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import vertexai
from vertexai.generative_models import GenerativeModel
from google.cloud import firestore

# ── Setup ─────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PROJECT_ID = "nouvia-os"
REGION = "us-central1"

vertexai.init(project=PROJECT_ID, location=REGION)
db = firestore.Client(project=PROJECT_ID)

app = FastAPI(title="Nouvia Delivery Intake", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Extraction Prompt ─────────────────────────────────────────────────────────
REQUIREMENT_EXTRACTION_PROMPT = """
You are analyzing a client communication for Nouvia, an AI implementation consultancy.
Extract actionable work items from this text.

Client: {client_id}
Source: {source_type}
Content:
{content}

For each actionable item, output JSON:
{{
  "items": [
    {{
      "title": "Short descriptive title",
      "description": "Detailed requirement description",
      "priority": "high|medium|low",
      "category": "new_feature|bug_fix|enhancement|question|change_request",
      "complexity": "S|M|L|XL",
      "rationale": "Why this was extracted as a requirement"
    }}
  ],
  "summary": "Brief summary of what the client is asking for",
  "client_sentiment": "positive|neutral|concerned|urgent"
}}

Rules:
- Only extract ACTIONABLE items, not general discussion
- If the text is purely informational with no action needed, return empty items array
- Classify complexity based on: S (<1 day), M (1-3 days), L (1-2 weeks), XL (2+ weeks)
- Preserve the client's language in descriptions — do not over-formalize
- Output ONLY valid JSON, no markdown fences or extra text
"""

EMAIL_CLASSIFICATION_PROMPT = """
You are classifying a client email for Nouvia, an AI implementation consultancy.

From: {from_email}
Subject: {subject}
Body:
{body}

First classify this email:
- "requirement": contains actionable requests, bug reports, or feature requests
- "question": asks for information, clarification, or status update
- "informational": FYI, acknowledgements, scheduling, no action needed

Then if "requirement" or "question", extract items.

Output ONLY valid JSON:
{{
  "classification": "requirement|question|informational",
  "client_sentiment": "positive|neutral|concerned|urgent",
  "items": [
    {{
      "title": "Short descriptive title",
      "description": "Detailed description",
      "priority": "high|medium|low",
      "category": "new_feature|bug_fix|enhancement|question|change_request",
      "complexity": "S|M|L|XL"
    }}
  ],
  "summary": "One sentence summary"
}}
"""

# ── Helpers ───────────────────────────────────────────────────────────────────

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def call_gemini(prompt: str) -> dict:
    """Call Gemini 1.5 Flash via Vertex AI and parse JSON response."""
    model = GenerativeModel("gemini-1.5-flash-001")
    response = model.generate_content(
        prompt,
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.1,
            "max_output_tokens": 2048,
        },
    )
    text = response.text.strip()
    # Strip markdown fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.rstrip("`").strip()
    return json.loads(text)


def write_change_requests(client_id: str, items: list, source: str,
                           source_detail: str, client_sentiment: str) -> list:
    """Write extracted items to Firestore change_requests collection."""
    written = []
    for item in items:
        doc = {
            "client_id": client_id,
            "title": item.get("title", "Untitled"),
            "description": item.get("description", ""),
            "priority": item.get("priority", "medium"),
            "category": item.get("category", "change_request"),
            "complexity": item.get("complexity", "M"),
            "source": source,
            "source_detail": source_detail,
            "status": "submitted",
            "client_sentiment": client_sentiment,
            "extracted_by": "gemini-intake",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        ref = db.collection("change_requests").add(doc)
        written.append({"id": ref[1].id, **doc})
    return written


# ── Request Models ────────────────────────────────────────────────────────────

class TranscriptRequest(BaseModel):
    client_id: str
    title: str
    content: str
    source_type: str = "transcript"  # transcript | meeting_notes | video_transcript


class EmailRequest(BaseModel):
    client_id: str
    from_email: str
    subject: str
    body: str
    thread_id: Optional[str] = None


class AITSRequest(BaseModel):
    client_id: str
    title: str
    description: str
    priority: str = "medium"
    category: str = "change_request"


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/intake/health")
def health():
    return {"status": "healthy", "version": "1.0", "intake_channels": 4}


@app.post("/intake/transcript")
async def intake_transcript(req: TranscriptRequest):
    """Extract requirements from a transcript or meeting notes."""
    try:
        prompt = REQUIREMENT_EXTRACTION_PROMPT.format(
            client_id=req.client_id,
            source_type=req.source_type,
            content=req.content,
        )
        result = call_gemini(prompt)
        items = result.get("items", [])
        sentiment = result.get("client_sentiment", "neutral")
        written = write_change_requests(
            client_id=req.client_id,
            items=items,
            source=req.source_type,
            source_detail=req.title,
            client_sentiment=sentiment,
        )
        logger.info(f"[intake/transcript] {req.client_id} — extracted {len(written)} items from '{req.title}'")
        return {
            "requirements_extracted": len(written),
            "summary": result.get("summary", ""),
            "client_sentiment": sentiment,
            "items": written,
        }
    except Exception as e:
        logger.error(f"[intake/transcript] error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/intake/email")
async def intake_email(req: EmailRequest):
    """Classify a client email and extract requirements if present."""
    try:
        prompt = EMAIL_CLASSIFICATION_PROMPT.format(
            from_email=req.from_email,
            subject=req.subject,
            body=req.body,
        )
        result = call_gemini(prompt)
        classification = result.get("classification", "informational")
        items = result.get("items", [])
        sentiment = result.get("client_sentiment", "neutral")

        written = []
        if classification in ("requirement", "question") and items:
            written = write_change_requests(
                client_id=req.client_id,
                items=items,
                source="email",
                source_detail=f"{req.from_email} — {req.subject}",
                client_sentiment=sentiment,
            )

        logger.info(f"[intake/email] {req.client_id} — {classification}, {len(written)} items created")
        return {
            "classification": classification,
            "client_sentiment": sentiment,
            "summary": result.get("summary", ""),
            "items_created": len(written),
            "items": written,
        }
    except Exception as e:
        logger.error(f"[intake/email] error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/intake/document")
async def intake_document(
    client_id: str = Form(...),
    file: UploadFile = File(...),
):
    """Extract text from an uploaded PDF/DOCX/TXT and extract requirements."""
    try:
        filename = file.filename or "upload"
        content_bytes = await file.read()
        text = ""

        if filename.lower().endswith(".pdf"):
            import io
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(content_bytes))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)

        elif filename.lower().endswith(".docx"):
            import io
            import docx
            doc = docx.Document(io.BytesIO(content_bytes))
            text = "\n".join(p.text for p in doc.paragraphs)

        else:
            text = content_bytes.decode("utf-8", errors="ignore")

        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from document")

        prompt = REQUIREMENT_EXTRACTION_PROMPT.format(
            client_id=client_id,
            source_type="document",
            content=text[:8000],  # Trim to token limit
        )
        result = call_gemini(prompt)
        items = result.get("items", [])
        sentiment = result.get("client_sentiment", "neutral")
        written = write_change_requests(
            client_id=client_id,
            items=items,
            source="document",
            source_detail=filename,
            client_sentiment=sentiment,
        )
        logger.info(f"[intake/document] {client_id} — extracted {len(written)} items from '{filename}'")
        return {
            "requirements_extracted": len(written),
            "summary": result.get("summary", ""),
            "client_sentiment": sentiment,
            "items": written,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[intake/document] error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/intake/aits")
async def intake_aits(req: AITSRequest):
    """Direct intake from AITS client portal — already structured, no AI extraction needed."""
    try:
        doc = {
            "client_id": req.client_id,
            "title": req.title,
            "description": req.description,
            "priority": req.priority,
            "category": req.category,
            "complexity": "M",
            "source": "aits_portal",
            "source_detail": "AITS client portal submission",
            "status": "submitted",
            "client_sentiment": "neutral",
            "extracted_by": "aits_portal",
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        ref = db.collection("change_requests").add(doc)
        logger.info(f"[intake/aits] {req.client_id} — created request '{req.title}'")
        return {"request_id": ref[1].id, **doc}
    except Exception as e:
        logger.error(f"[intake/aits] error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
