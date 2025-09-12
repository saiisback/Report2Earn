#!/usr/bin/env python3
"""
Test script for dynamic reward system
"""

import asyncio
import sys
import os

# Add the ai-verify directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'ai-verify'))

from ai_verification_system import AgenticVerificationSystem

async def test_dynamic_rewards():
    """Test the dynamic reward calculation"""
    
    print("🧪 Testing Dynamic Reward System")
    print("=" * 50)
    
    # Initialize the verification system
    verifier = AgenticVerificationSystem()
    
    # Test cases with different content types
    test_cases = [
        {
            "name": "Low Popularity Content",
            "url": "https://example.com/boring-news",
            "text": "Local weather report: It will be sunny today with a high of 75°F.",
            "expected_popularity": "low"
        },
        {
            "name": "Medium Popularity Content", 
            "url": "https://example.com/interesting-news",
            "text": "Breaking: New technology breakthrough announced by local company. The innovation could change how we work.",
            "expected_popularity": "medium"
        },
        {
            "name": "High Popularity Content",
            "url": "https://example.com/viral-news",
            "text": "SHOCKING: Scientists discover amazing breakthrough that will change everything! This incredible finding is unbelievable and must be seen!",
            "expected_popularity": "high"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📝 Test Case {i}: {test_case['name']}")
        print(f"URL: {test_case['url']}")
        print(f"Text: {test_case['text'][:100]}...")
        
        try:
            # Run verification
            result = await verifier.verify_content(
                content_url=test_case['url'],
                content_text=test_case['text'],
                content_images=[]
            )
            
            # Display results
            print(f"✅ Verification completed!")
            print(f"📊 Decision: {result.final_decision.value.upper()}")
            print(f"🎯 Confidence: {result.confidence:.2f}")
            print(f"📈 Popularity Score: {result.popularity_score:.2f}")
            print(f"💰 Dynamic Reward: {result.dynamic_reward:.4f} ALGO")
            
            # Calculate multiplier
            multiplier = result.dynamic_reward / 0.05 if result.dynamic_reward > 0 else 0
            print(f"🔢 Multiplier: {multiplier:.2f}x")
            
            # Verify expectations
            if result.popularity_score < 0.4:
                actual_popularity = "low"
            elif result.popularity_score < 0.7:
                actual_popularity = "medium"
            else:
                actual_popularity = "high"
                
            if actual_popularity == test_case['expected_popularity']:
                print(f"✅ Popularity expectation met: {actual_popularity}")
            else:
                print(f"⚠️ Popularity expectation not met: expected {test_case['expected_popularity']}, got {actual_popularity}")
            
            # Show reward breakdown
            print(f"💡 Reward breakdown:")
            print(f"   - Base fee: 0.05 ALGO")
            print(f"   - Popularity multiplier: {multiplier:.2f}x")
            print(f"   - Final reward: {result.dynamic_reward:.4f} ALGO")
            
        except Exception as e:
            print(f"❌ Test failed: {e}")
        
        print("-" * 50)
    
    print("\n🎉 Dynamic reward testing completed!")

if __name__ == "__main__":
    asyncio.run(test_dynamic_rewards())
