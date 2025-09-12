#!/usr/bin/env python3
"""
FastAPI server for the Agentic AI Verification System
Provides REST API endpoints for content verification
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import uvicorn
from ai_verification_system import AgenticVerificationSystem, GroupDecision
from content_scraper import ContentScraper

app = FastAPI(
    title="Agentic AI Verification System",
    description="Multi-agent AI system for content verification using LangGraph",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://r2e-web3.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "AI Verification System is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-verification"}

# Initialize the verification system
verifier = AgenticVerificationSystem()

class VerificationRequest(BaseModel):
    content_url: str
    content_text: Optional[str] = ""
    content_images: Optional[List[str]] = []

class ScrapeAndVerifyRequest(BaseModel):
    url: str

class ScrapedContent(BaseModel):
    platform: str
    url: str
    content_text: str
    content_images: List[str]
    author: dict
    engagement: dict
    metadata: dict

class VerificationResponse(BaseModel):
    success: bool
    result: Optional[GroupDecision] = None
    scraped_content: Optional[ScrapedContent] = None
    error: Optional[str] = None

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Agentic AI Verification System is running",
        "status": "healthy",
        "agents": [
            "Fact Checker",
            "Image Analyst", 
            "Source Verifier",
            "Context Analyst"
        ]
    }

@app.post("/verify", response_model=VerificationResponse)
async def verify_content(request: VerificationRequest):
    """
    Verify content using the multi-agent AI system
    
    Args:
        request: VerificationRequest containing content details
        
    Returns:
        VerificationResponse with verification results
    """
    try:
        # Verify the content
        result = await verifier.verify_content(
            content_url=request.content_url,
            content_text=request.content_text,
            content_images=request.content_images or []
        )
        
        return VerificationResponse(
            success=True,
            result=result,
            error=None
        )
        
    except Exception as e:
        return VerificationResponse(
            success=False,
            result=None,
            error=str(e)
        )

@app.post("/scrape-and-verify", response_model=VerificationResponse)
async def scrape_and_verify(request: ScrapeAndVerifyRequest):
    """
    Scrape content from any platform and verify using AI agents
    
    Args:
        request: ScrapeAndVerifyRequest containing URL to scrape
        
    Returns:
        VerificationResponse with scraped content and verification results
    """
    scraper = None
    try:
        # Initialize scraper
        scraper = ContentScraper()
        
        # Scrape content from the URL
        print(f"Scraping content from: {request.url}")
        scraped_data = scraper.scrape_content(request.url)
        
        if "error" in scraped_data:
            return VerificationResponse(
                success=False,
                result=None,
                scraped_content=None,
                error=f"Scraping failed: {scraped_data['error']}"
            )
        
        # Prepare scraped content for verification
        scraped_content = ScrapedContent(
            platform=scraped_data.get('platform', 'unknown'),
            url=scraped_data.get('url', request.url),
            content_text=scraped_data.get('content_text', ''),
            content_images=scraped_data.get('content_images', []),
            author=scraped_data.get('author', {}),
            engagement=scraped_data.get('engagement', {}),
            metadata=scraped_data
        )
        
        # Verify the scraped content using AI agents
        print("🤖 Running AI verification...")
        print(f"📝 Content text length: {len(scraped_content.content_text)}")
        print(f"🖼️ Images count: {len(scraped_content.content_images)}")
        
        result = await verifier.verify_content(
            content_url=request.url,
            content_text=scraped_content.content_text,
            content_images=scraped_content.content_images
        )
        
        print(f"✅ AI verification completed!")
        print(f"📊 Result: {result.final_decision.value} (confidence: {result.confidence:.2f})")
        
        return VerificationResponse(
            success=True,
            result=result,
            scraped_content=scraped_content,
            error=None
        )
        
    except Exception as e:
        return VerificationResponse(
            success=False,
            result=None,
            scraped_content=None,
            error=str(e)
        )
    finally:
        # Clean up scraper
        if scraper:
            scraper.close()

@app.get("/agents")
async def get_agents():
    """Get information about available AI models"""
    return {
        "models": [
            {
                "name": "NVIDIA Nemotron Nano 9B v2",
                "model_id": "nvidia/nemotron-nano-9b-v2:free",
                "specialty": "Efficient reasoning and fact-checking",
                "strengths": "Fast processing, good at logical analysis"
            },
            {
                "name": "Z-AI GLM 4.5 Air",
                "model_id": "z-ai/glm-4.5-air:free", 
                "specialty": "Chinese-developed model with unique perspective",
                "strengths": "Different cultural context, alternative viewpoints"
            },
            {
                "name": "Mistral Small 3.2 24B Instruct",
                "model_id": "mistralai/mistral-small-3.2-24b-instruct:free",
                "specialty": "High-quality instruction following",
                "strengths": "Detailed analysis, comprehensive reasoning"
            },
            {
                "name": "Dolphin Mistral 24B Venice Edition",
                "model_id": "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
                "specialty": "Advanced reasoning capabilities",
                "strengths": "Complex logical analysis, pattern recognition"
            },
            {
                "name": "Kimi Dev 72B",
                "model_id": "moonshotai/kimi-dev-72b:free",
                "specialty": "Latest reasoning model",
                "strengths": "State-of-the-art analysis, cutting-edge capabilities"
            }
        ],
        "workflow": "Parallel analysis with consensus-based decision-making",
        "total_models": 5,
        "consensus_method": "Majority voting with confidence weighting"
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z",
        "version": "1.0.0",
        "agents_ready": True,
        "openrouter_connected": True
    }

if __name__ == "__main__":
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
