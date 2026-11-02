"""REST route for server-side document redaction. Called by the API, never by browsers."""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response

from app.pii_redact.redactor import RedactionError, RedactionSpec, redact_document

logger = logging.getLogger("orchestrator.pii_redact")

router = APIRouter(tags=["pii"])

MAX_FILE_BYTES = 50 * 1024 * 1024
MAX_ITEMS = 500


def _str_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(v).strip()[:300] for v in value[:MAX_ITEMS] if str(v or "").strip()]


@router.post("/api/pii/redact")
async def pii_redact(
    file: UploadFile = File(...),
    spec: str = Form("{}"),
) -> Response:
    """Return the file with sensitive values burned out (PDF → PDF, image → PNG).

    `spec` (JSON): {"values": [...], "labels": [...], "patterns": true}. Values and labels are
    never logged.
    """
    try:
        raw_spec = json.loads(spec or "{}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="spec must be JSON")
    if not isinstance(raw_spec, dict):
        raise HTTPException(status_code=422, detail="spec must be a JSON object")

    data = await file.read(MAX_FILE_BYTES + 1)
    if not data:
        raise HTTPException(status_code=422, detail="file is empty")
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="file is too large to redact")

    redaction_spec = RedactionSpec(
        values=_str_list(raw_spec.get("values")),
        labels=_str_list(raw_spec.get("labels")),
        patterns=bool(raw_spec.get("patterns", True)),
    )
    try:
        result = await run_in_threadpool(
            redact_document, data, file.filename or "document", file.content_type, redaction_spec)
    except RedactionError as exc:
        logger.warning("pii_redact_failed", extra={"error": str(exc)})
        raise HTTPException(status_code=422, detail=str(exc))

    logger.info("pii_redact", extra={
        "pages": result.pages, "redactions": result.redactions, "ocr_pages": result.ocr_pages})
    return Response(
        content=result.content,
        media_type=result.content_type,
        headers={
            "X-Pii-Redactions": str(result.redactions),
            "X-Pii-Pages": str(result.pages),
            "X-Pii-Ocr-Pages": str(result.ocr_pages),
        },
    )
