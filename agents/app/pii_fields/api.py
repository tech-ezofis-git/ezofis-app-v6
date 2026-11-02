"""REST route for PII field recommendations. Called by the API, which verifies the folder first."""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.pii_fields.models import PiiFieldRecommendationRequest, PiiFieldRecommendationResponse
from app.pii_fields.recommender import recommend_pii_fields

router = APIRouter(tags=["pii"])


@router.post("/api/pii/field-recommendations", response_model=PiiFieldRecommendationResponse)
async def pii_field_recommendations(
    request: Request, body: PiiFieldRecommendationRequest
) -> PiiFieldRecommendationResponse:
    """Suggest sensitive field types for a folder. Falls back to the built-in catalog on LLM failure."""
    adapter = getattr(request.app.state, "llm_adapter", None)
    runtime = getattr(request.app.state, "runtime_models", None)
    fallback = getattr(runtime, "fallback_preset_id", None)
    return await recommend_pii_fields(body, adapter, fallback_model=fallback)
