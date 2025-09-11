#!/usr/bin/env python3
"""
Test client for the Agentic AI Verification System
"""

import asyncio
import httpx
import json
from typing import Dict, Any

class VerificationClient:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
    
    async def verify_content(self, content_url: str, content_text: str = "", content_images: list = None):
        """Verify content using the API"""
        
        if content_images is None:
            content_images = []
        
        payload = {
            "content_url": content_url,
            "content_text": content_text,
            "content_images": content_images
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/verify",
                json=payload,
                timeout=60.0
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"API Error: {response.status_code} - {response.text}")
    
    async def get_agents(self):
        """Get information about available agents"""
        
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/agents")
            return response.json()
    
    async def health_check(self):
        """Check system health"""
        
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/health")
            return response.json()

async def test_verification():
    """Test the verification system with sample content"""
    
    client = VerificationClient()
    
    # Test cases
    test_cases = [
        {
            "name": "Fake News Example",
            "content_url": "https://example.com/fake-news",
            "content_text": "Breaking: Scientists discover that the Earth is actually flat and all space agencies have been lying to us for decades. This shocking revelation comes from a secret government document leaked by an anonymous whistleblower.",
            "content_images": []
        },
        {
            "name": "Legitimate News Example", 
            "content_url": "https://example.com/real-news",
            "content_text": "NASA successfully launched the James Webb Space Telescope on December 25, 2021. The telescope is now operational and has already captured stunning images of distant galaxies.",
            "content_images": []
        },
        {
            "name": "Uncertain Content",
            "content_url": "https://example.com/uncertain",
            "content_text": "Some researchers suggest that there might be undiscovered particles in quantum physics that could explain dark matter, but this is still theoretical and requires more evidence.",
            "content_images": []
        }
    ]
    
    print("=== TESTING AGENTIC AI VERIFICATION SYSTEM ===\n")
    
    # Check system health
    try:
        health = await client.health_check()
        print(f"System Health: {health['status']}")
        print(f"Agents Ready: {health['agents_ready']}\n")
    except Exception as e:
        print(f"Health check failed: {e}\n")
        return
    
    # Test each case
    for i, test_case in enumerate(test_cases, 1):
        print(f"--- Test Case {i}: {test_case['name']} ---")
        
        try:
            result = await client.verify_content(
                content_url=test_case["content_url"],
                content_text=test_case["content_text"],
                content_images=test_case["content_images"]
            )
            
            if result["success"]:
                decision = result["result"]
                print(f"Final Decision: {decision['final_decision'].upper()}")
                print(f"Confidence: {decision['confidence']:.2f}")
                print(f"Consensus Score: {decision['consensus_score']:.2f}")
                print(f"Group Reasoning:\n{decision['group_reasoning']}")
            else:
                print(f"Verification failed: {result['error']}")
                
        except Exception as e:
            print(f"Error: {e}")
        
        print("\n" + "="*50 + "\n")

async def main():
    """Main test function"""
    await test_verification()

if __name__ == "__main__":
    asyncio.run(main())
