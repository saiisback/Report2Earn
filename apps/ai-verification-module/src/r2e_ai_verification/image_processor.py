#!/usr/bin/env python3
"""
Image Processing Module using Groq Vision Models
Processes images from social media platforms and provides analysis
"""

import os
import base64
import asyncio
import httpx
from typing import List, Dict, Optional, Any
from PIL import Image
import io
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class ImageProcessor:
    def __init__(self):
        """Initialize the image processor with Groq client"""
        self.groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.supported_models = [
            "meta-llama/llama-4-scout-17b-16e-instruct",
            "meta-llama/llama-4-maverick-17b-128e-instruct"
        ]
    
    def encode_image_from_url(self, image_url: str) -> Optional[str]:
        """Download and encode image from URL to base64"""
        try:
            print(f"📥 Downloading image from URL: {image_url}")
            
            # Download image
            response = httpx.get(image_url, timeout=30)
            response.raise_for_status()
            
            # Check if it's a valid image
            try:
                image = Image.open(io.BytesIO(response.content))
                print(f"✅ Image loaded successfully: {image.size} pixels, mode: {image.mode}")
            except Exception as e:
                print(f"❌ Invalid image format: {e}")
                return None
            
            # Convert to base64
            buffer = io.BytesIO()
            # Convert to RGB if necessary (for JPEG compatibility)
            if image.mode in ('RGBA', 'LA', 'P'):
                image = image.convert('RGB')
            image.save(buffer, format='JPEG', quality=85)
            buffer.seek(0)
            
            base64_image = base64.b64encode(buffer.getvalue()).decode('utf-8')
            print(f"✅ Image encoded to base64: {len(base64_image)} characters")
            
            return f"data:image/jpeg;base64,{base64_image}"
            
        except Exception as e:
            print(f"❌ Failed to process image from URL {image_url}: {e}")
            return None
    
    def encode_image_from_file(self, image_path: str) -> Optional[str]:
        """Encode local image file to base64"""
        try:
            print(f"📁 Loading image from file: {image_path}")
            
            with open(image_path, "rb") as image_file:
                # First, validate it's an image
                image = Image.open(image_file)
                print(f"✅ Image loaded: {image.size} pixels, mode: {image.mode}")
                
                # Reset file pointer
                image_file.seek(0)
                
                # Convert to RGB if necessary
                if image.mode in ('RGBA', 'LA', 'P'):
                    image = image.convert('RGB')
                    buffer = io.BytesIO()
                    image.save(buffer, format='JPEG', quality=85)
                    image_data = buffer.getvalue()
                else:
                    image_data = image_file.read()
                
                base64_image = base64.b64encode(image_data).decode('utf-8')
                print(f"✅ Image encoded to base64: {len(base64_image)} characters")
                
                return f"data:image/jpeg;base64,{base64_image}"
                
        except Exception as e:
            print(f"❌ Failed to process image file {image_path}: {e}")
            return None
    
    async def analyze_image(self, image_data: str, analysis_prompt: str = None) -> Dict[str, Any]:
        """Analyze image using Groq vision models"""
        
        if not analysis_prompt:
            analysis_prompt = """Analyze this image and provide a detailed description. Focus on:
1. What objects, people, or scenes are visible
2. Any text or writing in the image
3. The overall context and setting
4. Any potential signs of manipulation or editing
5. The emotional tone or mood
6. Any notable details that could be relevant for content verification

Provide your analysis in a clear, structured format."""
        
        print(f"🔍 Starting image analysis with Groq vision models...")
        
        # Try both models and return the best result
        results = []
        
        for model in self.supported_models:
            try:
                print(f"🤖 Analyzing with model: {model}")
                
                response = self.groq_client.chat.completions.create(
                    model=model,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": analysis_prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {"url": image_data}
                                }
                            ]
                        }
                    ],
                    temperature=0.7,
                    max_completion_tokens=1024,
                    top_p=1,
                    stream=False
                )
                
                if response and response.choices and response.choices[0].message:
                    result = {
                        "model": model,
                        "analysis": response.choices[0].message.content,
                        "success": True
                    }
                    results.append(result)
                    print(f"✅ Model {model} completed successfully")
                else:
                    print(f"❌ Model {model} returned empty response")
                    
            except Exception as e:
                print(f"❌ Model {model} failed: {e}")
                results.append({
                    "model": model,
                    "analysis": f"Analysis failed: {str(e)}",
                    "success": False
                })
        
        # Return the best result (first successful one)
        successful_results = [r for r in results if r["success"]]
        
        if successful_results:
            best_result = successful_results[0]
            print(f"✅ Image analysis completed using {best_result['model']}")
            return {
                "success": True,
                "analysis": best_result["analysis"],
                "model_used": best_result["model"],
                "all_results": results
            }
        else:
            print(f"❌ All models failed to analyze the image")
            return {
                "success": False,
                "analysis": "Failed to analyze image with any available model",
                "model_used": None,
                "all_results": results
            }
    
    async def analyze_images_batch(self, image_urls: List[str], analysis_prompt: str = None) -> List[Dict[str, Any]]:
        """Analyze multiple images in batch"""
        
        print(f"📸 Starting batch analysis of {len(image_urls)} images...")
        
        results = []
        
        for i, image_url in enumerate(image_urls):
            print(f"🔄 Processing image {i+1}/{len(image_urls)}: {image_url}")
            
            # Encode image
            image_data = self.encode_image_from_url(image_url)
            if not image_data:
                results.append({
                    "image_url": image_url,
                    "success": False,
                    "analysis": "Failed to download or encode image",
                    "error": "Image processing failed"
                })
                continue
            
            # Analyze image
            analysis_result = await self.analyze_image(image_data, analysis_prompt)
            
            results.append({
                "image_url": image_url,
                "success": analysis_result["success"],
                "analysis": analysis_result["analysis"],
                "model_used": analysis_result["model_used"],
                "error": None if analysis_result["success"] else "Analysis failed"
            })
        
        print(f"✅ Batch analysis completed: {sum(1 for r in results if r['success'])}/{len(results)} successful")
        return results
    
    def extract_text_from_image(self, image_data: str) -> Dict[str, Any]:
        """Extract text from image using OCR capabilities"""
        
        ocr_prompt = """Extract all text visible in this image. Include:
1. Any visible text, captions, or labels
2. Text on signs, documents, or screens
3. Watermarks or copyright notices
4. Any handwritten text
5. Text in different languages

Format the extracted text clearly, preserving line breaks and structure where possible."""
        
        try:
            response = self.groq_client.chat.completions.create(
                model=self.supported_models[0],  # Use first model for OCR
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": ocr_prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": image_data}
                            }
                        ]
                    }
                ],
                temperature=0.3,  # Lower temperature for more accurate OCR
                max_completion_tokens=512,
                top_p=1,
                stream=False
            )
            
            if response and response.choices and response.choices[0].message:
                return {
                    "success": True,
                    "extracted_text": response.choices[0].message.content,
                    "model_used": self.supported_models[0]
                }
            else:
                return {
                    "success": False,
                    "extracted_text": "",
                    "error": "No text extracted"
                }
                
        except Exception as e:
            return {
                "success": False,
                "extracted_text": "",
                "error": str(e)
            }
    
    def detect_manipulation_indicators(self, image_data: str) -> Dict[str, Any]:
        """Detect potential image manipulation or editing indicators"""
        
        manipulation_prompt = """Analyze this image for signs of manipulation or editing. Look for:
1. Inconsistent lighting or shadows
2. Blurred or pixelated areas that might indicate editing
3. Unnatural color gradients or patterns
4. Duplicated elements or cloned regions
5. Inconsistent perspective or proportions
6. Watermarks or editing artifacts
7. Any signs of AI-generated content
8. Unusual patterns that might indicate deepfakes

Provide a detailed analysis of any suspicious elements found."""
        
        try:
            response = self.groq_client.chat.completions.create(
                model=self.supported_models[0],
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": manipulation_prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": image_data}
                            }
                        ]
                    }
                ],
                temperature=0.5,
                max_completion_tokens=1024,
                top_p=1,
                stream=False
            )
            
            if response and response.choices and response.choices[0].message:
                return {
                    "success": True,
                    "manipulation_analysis": response.choices[0].message.content,
                    "model_used": self.supported_models[0]
                }
            else:
                return {
                    "success": False,
                    "manipulation_analysis": "",
                    "error": "Analysis failed"
                }
                
        except Exception as e:
            return {
                "success": False,
                "manipulation_analysis": "",
                "error": str(e)
            }

# Example usage
async def main():
    """Example usage of the image processor"""
    
    processor = ImageProcessor()
    
    # Example with image URL
    image_url = "https://upload.wikimedia.org/wikipedia/commons/f/f2/LPU-v1-die.jpg"
    
    # Encode image
    image_data = processor.encode_image_from_url(image_url)
    if image_data:
        # Analyze image
        result = await processor.analyze_image(image_data)
        print("Analysis Result:", result)
        
        # Extract text
        text_result = processor.extract_text_from_image(image_data)
        print("Text Extraction:", text_result)
        
        # Detect manipulation
        manipulation_result = processor.detect_manipulation_indicators(image_data)
        print("Manipulation Detection:", manipulation_result)

if __name__ == "__main__":
    asyncio.run(main())
