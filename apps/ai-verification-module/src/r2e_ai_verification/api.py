"""FastAPI application factory for the R2E AI verification service."""

from __future__ import annotations

import os
from typing import Iterable, Optional, Sequence

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    ImageSearchRequest,
    ScrapeAndVerifyRequest,
    ScrapedContent,
    SearchRequest,
    SearchResponse,
    VerificationRequest,
    VerificationResponse,
)
from .system import AgenticVerificationSystem
from .web_search import WebSearchModule


class AppSettings:
    """Configuration object for the FastAPI app factory."""

    def __init__(
        self,
        *,
        title: str = "Agentic AI Verification System",
        description: str = "Multi-agent AI system for content verification using LangGraph",
        version: str = "1.0.0",
        cors_origins: Optional[Sequence[str]] = None,
        load_environment: bool = True,
        serpapi_key: Optional[str] = None,
    ) -> None:
        self.title = title
        self.description = description
        self.version = version
        self.cors_origins = list(cors_origins or [])
        self.load_environment = load_environment
        self.serpapi_key = serpapi_key


DEFAULT_CORS_ORIGINS = [
    "https://r2e-web3.vercel.app",
    "https://*.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
]


def create_app(settings: Optional[AppSettings] = None) -> FastAPI:
    """Create a FastAPI application that exposes the verification endpoints."""

    settings = settings or AppSettings()

    if settings.load_environment:
        load_dotenv()

    app = FastAPI(
        title=settings.title,
        description=settings.description,
        version=settings.version,
    )

    cors_origins = settings.cors_origins or []
    if not cors_origins:
        cors_origins = DEFAULT_CORS_ORIGINS

    if cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(cors_origins),
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allow_headers=["*"],
        )

    serpapi_key = settings.serpapi_key or os.getenv("SERPAPI_API_KEY")
    verifier = AgenticVerificationSystem()
    web_search = WebSearchModule(serpapi_key)

    @app.on_event("shutdown")
    async def _shutdown() -> None:
        verifier.cleanup()

    @app.get("/")
    async def root() -> dict[str, object]:
        return {
            "message": "Agentic AI Verification System is running",
            "status": "healthy",
            "agents": [
                "Fact Checker",
                "Image Analyst",
                "Source Verifier",
                "Context Analyst",
            ],
        }

    @app.get("/health")
    async def health_check() -> dict[str, object]:
        return {
            "status": "healthy",
            "version": settings.version,
            "agents_ready": True,
            "openrouter_connected": True,
        }

    @app.post("/verify", response_model=VerificationResponse)
    async def verify_content(request: VerificationRequest) -> VerificationResponse:
        try:
            result = await verifier.verify_content(
                content_url=request.content_url,
                content_text=request.content_text or "",
                content_images=request.content_images or [],
            )
            return VerificationResponse(success=True, result=result)
        except Exception as exc:  # pragma: no cover - log friendly message
            return VerificationResponse(success=False, error=str(exc))

    @app.post("/scrape-and-verify", response_model=VerificationResponse)
    async def scrape_and_verify(request: ScrapeAndVerifyRequest) -> VerificationResponse:
        scraper = verifier.content_scraper
        try:
            scraped_data = scraper.scrape_content(request.url)
            if "error" in scraped_data:
                return VerificationResponse(success=False, error=f"Scraping failed: {scraped_data['error']}")

            scraped_content = ScrapedContent(
                platform=scraped_data.get("platform", "unknown"),
                url=scraped_data.get("url", request.url),
                content_text=scraped_data.get("content_text", ""),
                content_images=scraped_data.get("content_images", []),
                author=scraped_data.get("author", {}),
                engagement=scraped_data.get("engagement", {}),
                metadata=scraped_data,
            )

            result = await verifier.verify_content(
                content_url=request.url,
                content_text=scraped_content.content_text,
                content_images=scraped_content.content_images,
            )

            return VerificationResponse(
                success=True,
                result=result,
                scraped_content=scraped_content,
            )
        except Exception as exc:  # pragma: no cover
            return VerificationResponse(success=False, error=str(exc))

    @app.get("/agents")
    async def get_agents() -> dict[str, object]:
        return {
            "models": [
                {
                    "name": "NVIDIA Nemotron Nano 9B v2",
                    "model_id": "nvidia/nemotron-nano-9b-v2:free",
                    "specialty": "Efficient reasoning and fact-checking",
                    "strengths": "Fast processing, good at logical analysis",
                },
                {
                    "name": "Z-AI GLM 4.5 Air",
                    "model_id": "z-ai/glm-4.5-air:free",
                    "specialty": "Chinese-developed model with unique perspective",
                    "strengths": "Different cultural context, alternative viewpoints",
                },
                {
                    "name": "Mistral Small 3.2 24B Instruct",
                    "model_id": "mistralai/mistral-small-3.2-24b-instruct:free",
                    "specialty": "High-quality instruction following",
                    "strengths": "Detailed analysis, comprehensive reasoning",
                },
                {
                    "name": "Dolphin Mistral 24B Venice Edition",
                    "model_id": "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
                    "specialty": "Advanced reasoning capabilities",
                    "strengths": "Complex logical analysis, pattern recognition",
                },
                {
                    "name": "Kimi Dev 72B",
                    "model_id": "moonshotai/kimi-dev-72b:free",
                    "specialty": "Latest reasoning model",
                    "strengths": "State-of-the-art analysis, cutting-edge capabilities",
                },
            ],
            "workflow": "Parallel analysis with consensus-based decision-making",
            "total_models": 5,
            "consensus_method": "Majority voting with confidence weighting",
        }

    @app.post("/search", response_model=SearchResponse)
    async def search_web(request: SearchRequest) -> SearchResponse:
        try:
            results = await web_search.search_for_fact_check(
                content_text=request.query,
                content_url="",
            )
            if request.max_results is not None:
                results = results[: request.max_results]
            return SearchResponse(
                success=True,
                results=[result.__dict__ for result in results],
            )
        except Exception as exc:  # pragma: no cover
            return SearchResponse(success=False, error=str(exc))

    @app.post("/search-image", response_model=SearchResponse)
    async def search_image(request: ImageSearchRequest) -> SearchResponse:
        try:
            results = await web_search.search_for_image_verification(request.image_url)
            if request.max_results is not None:
                results = results[: request.max_results]
            return SearchResponse(success=True, results=[result.__dict__ for result in results])
        except Exception as exc:  # pragma: no cover
            return SearchResponse(success=False, error=str(exc))

    return app
