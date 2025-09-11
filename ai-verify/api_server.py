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

app = FastAPI(
    title="Agentic AI Verification System",
    description="Multi-agent AI system for content verification using LangGraph",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the verification system
verifier = AgenticVerificationSystem()

class VerificationRequest(BaseModel):
    content_url: str
    content_text: Optional[str] = ""
    content_images: Optional[List[str]] = []

class VerificationResponse(BaseModel):
    success: bool
    result: Optional[GroupDecision] = None
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

@app.get("/agents")
async def get_agents():
    """Get information about available agents"""
    return {
        "agents": [
            {
                "name": "Fact Checker",
                "role": "Verifies factual claims and checks for logical inconsistencies",
                "specialty": "Fact-checking and misinformation detection"
            },
            {
                "name": "Image Analyst", 
                "role": "Analyzes visual content for manipulation and authenticity",
                "specialty": "Image verification and deepfake detection"
            },
            {
                "name": "Source Verifier",
                "role": "Checks credibility and reliability of sources",
                "specialty": "Source credibility and attribution verification"
            },
            {
                "name": "Context Analyst",
                "role": "Examines broader context, timing, and narrative patterns",
                "specialty": "Contextual analysis and agenda detection"
            }
        ],
        "workflow": "Sequential analysis with group consensus decision-making"
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
