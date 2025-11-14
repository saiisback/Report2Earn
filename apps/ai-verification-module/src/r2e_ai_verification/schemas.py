"""Pydantic schemas used by the AI verification FastAPI service."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from .system import GroupDecision


class VerificationRequest(BaseModel):
    content_url: str
    content_text: Optional[str] = ""
    content_images: Optional[List[str]] = Field(default_factory=list)


class ScrapeAndVerifyRequest(BaseModel):
    url: str


class ScrapedContent(BaseModel):
    platform: str
    url: str
    content_text: str
    content_images: List[str]
    author: Dict[str, Any]
    engagement: Dict[str, Any]
    metadata: Dict[str, Any]


class VerificationResponse(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    success: bool
    result: Optional[GroupDecision] = None
    scraped_content: Optional[ScrapedContent] = None
    error: Optional[str] = None


class SearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = 5


class ImageSearchRequest(BaseModel):
    image_url: str
    max_results: Optional[int] = 5


class SearchResponse(BaseModel):
    success: bool
    results: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None
