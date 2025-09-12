#!/usr/bin/env python3
"""
Test script for image processing functionality
Tests the integration of Groq vision models with the AI verification system
"""

import asyncio
import os
from dotenv import load_dotenv
from ai_verification_system import AgenticVerificationSystem

# Load environment variables
load_dotenv()

async def test_image_processing():
    """Test the image processing functionality"""
    
    print("🧪 Testing Image Processing Integration")
    print("=" * 50)
    
    # Initialize the verification system
    verifier = AgenticVerificationSystem()
    
    try:
        # Test cases with different types of content
        test_cases = [
            {
                "name": "Twitter Post with Image",
                "url": "https://twitter.com/example/status/1234567890",
                "text": "Check out this amazing sunset! 🌅 #nature #photography",
                "images": [
                    "https://upload.wikimedia.org/wikipedia/commons/f/f2/LPU-v1-die.jpg"
                ]
            },
            {
                "name": "Instagram Post with Multiple Images",
                "url": "https://instagram.com/p/example123",
                "text": "Beautiful day at the beach! 🏖️ #summer #vacation",
                "images": [
                    "https://upload.wikimedia.org/wikipedia/commons/d/da/SF_From_Marin_Highlands3.jpg",
                    "https://upload.wikimedia.org/wikipedia/commons/f/f2/LPU-v1-die.jpg"
                ]
            },
            {
                "name": "Reddit Post with Image",
                "url": "https://reddit.com/r/pics/comments/example123",
                "text": "Found this interesting artifact in my backyard. Any ideas what it could be?",
                "images": [
                    "https://upload.wikimedia.org/wikipedia/commons/f/f2/LPU-v1-die.jpg"
                ]
            },
            {
                "name": "Text-only Content (No Images)",
                "url": "https://example.com/news/article",
                "text": "Scientists discover new species of butterfly in the Amazon rainforest. The discovery was made during a routine biodiversity survey.",
                "images": []
            }
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n🔍 Test Case {i}: {test_case['name']}")
            print("-" * 40)
            
            try:
                # Verify the content
                result = await verifier.verify_content(
                    content_url=test_case["url"],
                    content_text=test_case["text"],
                    content_images=test_case["images"]
                )
                
                # Display results
                print(f"✅ Verification completed!")
                print(f"📊 Final Decision: {result.final_decision.value.upper()}")
                print(f"🎯 Confidence: {result.confidence:.2f}")
                print(f"🤝 Consensus Score: {result.consensus_score:.2f}")
                print(f"📈 Popularity Score: {result.popularity_score:.2f}")
                print(f"💰 Dynamic Reward: {result.dynamic_reward:.4f} ALGO")
                
                # Show individual agent decisions
                print(f"\n🤖 Individual Agent Decisions:")
                for decision in result.individual_decisions:
                    print(f"  • {decision.agent_name}: {decision.decision.value.upper()} (confidence: {decision.confidence:.2f})")
                
                # Show group reasoning
                print(f"\n💭 Group Reasoning:")
                print(f"  {result.group_reasoning[:200]}...")
                
            except Exception as e:
                print(f"❌ Test case {i} failed: {e}")
            
            print("\n" + "=" * 50)
    
    finally:
        # Cleanup resources
        verifier.cleanup()
        print("🧹 Cleanup completed")

async def test_direct_image_processing():
    """Test direct image processing without verification"""
    
    print("\n🖼️ Testing Direct Image Processing")
    print("=" * 50)
    
    from image_processor import ImageProcessor
    
    processor = ImageProcessor()
    
    # Test image URL
    test_image_url = "https://upload.wikimedia.org/wikipedia/commons/f/f2/LPU-v1-die.jpg"
    
    try:
        print(f"📥 Testing image: {test_image_url}")
        
        # Encode image
        image_data = processor.encode_image_from_url(test_image_url)
        if not image_data:
            print("❌ Failed to encode image")
            return
        
        print("✅ Image encoded successfully")
        
        # Analyze image
        analysis_result = await processor.analyze_image(image_data)
        print(f"🔍 Analysis Result: {analysis_result['success']}")
        if analysis_result['success']:
            print(f"📝 Analysis: {analysis_result['analysis'][:200]}...")
        
        # Extract text
        text_result = processor.extract_text_from_image(image_data)
        print(f"📝 Text Extraction: {text_result['success']}")
        if text_result['success']:
            print(f"📄 Extracted Text: {text_result['extracted_text'][:200]}...")
        
        # Detect manipulation
        manipulation_result = processor.detect_manipulation_indicators(image_data)
        print(f"🔍 Manipulation Detection: {manipulation_result['success']}")
        if manipulation_result['success']:
            print(f"⚠️ Manipulation Analysis: {manipulation_result['manipulation_analysis'][:200]}...")
        
    except Exception as e:
        print(f"❌ Direct image processing test failed: {e}")

async def main():
    """Main test function"""
    
    print("🚀 Starting Image Processing Tests")
    print("=" * 60)
    
    # Check if GROQ_API_KEY is set
    if not os.getenv("GROQ_API_KEY"):
        print("❌ GROQ_API_KEY not found in environment variables")
        print("Please set your Groq API key in the .env file")
        return
    
    # Run tests
    await test_direct_image_processing()
    await test_image_processing()
    
    print("\n🎉 All tests completed!")

if __name__ == "__main__":
    asyncio.run(main())
