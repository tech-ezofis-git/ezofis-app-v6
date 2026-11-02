"""Wire models for POST /api/pii/field-recommendations (snake_case, like the API's other agent calls)."""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

MAX_FIELDS = 150
MAX_CATEGORIES = 30
MAX_RECOMMENDATIONS = 30


class FolderFieldIn(BaseModel):
    field_id: str = Field(default="", max_length=64)
    field_name: str = Field(default="", max_length=200)
    data_type: Optional[str] = Field(default=None, max_length=50)


class PiiFieldRecommendationRequest(BaseModel):
    """Folder context the API verified server-side. Never document content or record values."""

    tenant_id: Optional[str] = Field(default=None, max_length=64)
    folder_id: str = Field(max_length=64)
    folder_name: str = Field(max_length=300)
    folder_description: Optional[str] = Field(default=None, max_length=2000)
    fields: list[FolderFieldIn] = Field(default_factory=list, max_length=500)
    document_categories: list[str] = Field(default_factory=list, max_length=100)
    existing_selected_keys: list[str] = Field(default_factory=list, max_length=200)
    include_contextual: bool = True
    model: Optional[str] = Field(default=None, max_length=120)


class PiiFieldRecommendation(BaseModel):
    field_key: str
    display_name: str
    category: str
    source: Literal["existing_metadata", "ai_inferred"]
    existing_field_id: Optional[str] = None
    confidence: float
    recommended: bool = True
    detection_type: str
    reason: str = ""
    already_selected: bool = False


class PiiFieldRecommendationResponse(BaseModel):
    folder_id: str
    recommendations: list[PiiFieldRecommendation]
    model_version: str
    # "ai" when the LLM answered; "fallback" when the deterministic catalog was used instead.
    mode: Literal["ai", "fallback"]
    warnings: list[str] = Field(default_factory=list)
