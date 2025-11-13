#!/usr/bin/env python3
"""
Agentic AI Verification System using LangGraph
Multiple AI agents work together to verify content authenticity
"""

import os
import json
import asyncio
from typing import Dict, List, Optional, Any, Literal
from datetime import datetime
from dataclasses import dataclass
from enum import Enum

from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
import httpx
from dotenv import load_dotenv

# Import our custom modules
from image_processor import ImageProcessor
from content_scraper import ContentScraper
from web_search_module import WebSearchModule

# Load environment variables
load_dotenv()

class VerificationResult(str, Enum):
    AUTHENTIC = "authentic"
    FAKE = "fake"
    UNCERTAIN = "uncertain"

@dataclass
class AgentDecision:
    agent_name: str
    decision: VerificationResult
    confidence: float
    reasoning: str
    evidence: List[str]

@dataclass
class GroupDecision:
    final_decision: VerificationResult
    confidence: float
    consensus_score: float
    individual_decisions: List[AgentDecision]
    group_reasoning: str
    popularity_score: float = 0.0
    dynamic_reward: float = 0.0
    web_search_results: List[Dict[str, Any]] = None

class VerificationState(BaseModel):
    content_url: str
    content_text: str = ""
    content_images: List[str] = []
    metadata: Dict[str, Any] = {}
    
    # Image analysis results
    image_analyses: List[Dict[str, Any]] = []
    extracted_texts: List[str] = []
    manipulation_indicators: List[Dict[str, Any]] = []
    
    # Web search results
    web_search_results: List[Dict[str, Any]] = []
    fact_check_results: List[Dict[str, Any]] = []
    
    # Agent decisions
    fact_checker_decision: Optional[AgentDecision] = None
    image_analyst_decision: Optional[AgentDecision] = None
    source_verifier_decision: Optional[AgentDecision] = None
    context_analyst_decision: Optional[AgentDecision] = None
    
    # Popularity and engagement data
    popularity_score: float = 0.0
    engagement_metrics: Dict[str, Any] = {}
    
    # Final result
    group_decision: Optional[GroupDecision] = None
    verification_complete: bool = False

class AgenticVerificationSystem:
    def __init__(self):
        # Initialize image processor, content scraper, and web search module
        self.image_processor = ImageProcessor()
        self.content_scraper = ContentScraper()
        
        # Debug environment variables
        print(f"🔍 Environment Debug:")
        print(f"   All env vars containing 'API': {[k for k in os.environ.keys() if 'API' in k]}")
        print(f"   SERPAPI_API_KEY exists: {bool(os.getenv('SERPAPI_API_KEY'))}")
        print(f"   OPENROUTER_API_KEY exists: {bool(os.getenv('OPENROUTER_API_KEY'))}")
        
        # Get SerpAPI key from environment (try multiple possible names)
        serpapi_key = (
            os.getenv("SERPAPI_API_KEY") or 
            os.getenv("SERPAPI_KEY") or 
            os.getenv("SERP_API_KEY")
        )
        
        if not serpapi_key:
            print("❌ SERPAPI_API_KEY not found in environment variables!")
            print("   Please set SERPAPI_API_KEY in your .env file or environment")
            print("   Example: SERPAPI_API_KEY=your_api_key_here")
        else:
            print(f"✅ SerpAPI key loaded: {serpapi_key[:10]}...")
        
        print(f"   SerpAPI key value: {serpapi_key[:10] + '...' if serpapi_key else 'None'}")
        
        self.web_search_module = WebSearchModule(serpapi_key)
        
        # Initialize multiple OpenRouter clients using free models
        self.models = {
            "nvidia_nemotron": ChatOpenAI(
                model="nvidia/nemotron-nano-9b-v2:free",
                openai_api_base="https://openrouter.ai/api/v1",
                openai_api_key=os.getenv("OPENROUTER_API_KEY"),
                temperature=0,
                timeout=30,
                max_retries=2
            ),
            "z_ai_glm": ChatOpenAI(
                model="z-ai/glm-4.5-air:free",
                openai_api_base="https://openrouter.ai/api/v1",
                openai_api_key=os.getenv("OPENROUTER_API_KEY"),
                temperature=0,
                timeout=30,
                max_retries=2
            ),
            "mistral_small": ChatOpenAI(
                model="mistralai/mistral-small-3.2-24b-instruct:free",
                openai_api_base="https://openrouter.ai/api/v1",
                openai_api_key=os.getenv("OPENROUTER_API_KEY"),
                temperature=0,
                timeout=30,
                max_retries=2
            ),
            "dolphin_mistral_24b": ChatOpenAI(
                model="cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
                openai_api_base="https://openrouter.ai/api/v1",
                openai_api_key=os.getenv("OPENROUTER_API_KEY"),
                temperature=0,
                timeout=30,
                max_retries=2
            ),
            "kimi_dev_72b": ChatOpenAI(
                model="moonshotai/kimi-dev-72b:free",
                openai_api_base="https://openrouter.ai/api/v1",
                openai_api_key=os.getenv("OPENROUTER_API_KEY"),
                temperature=0,
                timeout=30,
                max_retries=2
            )
        }
        
        # Create the verification workflow
        self.workflow = self._create_verification_workflow()
    
    def _create_verification_workflow(self) -> StateGraph:
        """Create the LangGraph workflow for multi-model verification"""
        
        workflow = StateGraph(VerificationState)
        
        # Add nodes for each verification step using multiple models
        workflow.add_node("image_processing", self._process_images)
        workflow.add_node("web_search", self._perform_web_search)
        workflow.add_node("multi_model_verification", self._multi_model_verification)
        workflow.add_node("popularity_analysis", self._analyze_popularity)
        workflow.add_node("group_decision", self._group_decision_maker)
        
        # Define the flow
        workflow.set_entry_point("image_processing")
        workflow.add_edge("image_processing", "web_search")
        workflow.add_edge("web_search", "multi_model_verification")
        workflow.add_edge("multi_model_verification", "popularity_analysis")
        workflow.add_edge("popularity_analysis", "group_decision")
        workflow.add_edge("group_decision", END)
        
        return workflow.compile()
    
    async def _process_images(self, state: VerificationState) -> VerificationState:
        """Process images using Groq vision models"""
        
        print(f"🖼️ Starting image processing for {len(state.content_images)} images...")
        
        if not state.content_images:
            print("📝 No images to process")
            return state
        
        try:
            # Process all images in batch
            image_results = await self.image_processor.analyze_images_batch(
                state.content_images,
                analysis_prompt="""Analyze this image for content verification purposes. Focus on:
1. What objects, people, or scenes are visible
2. Any text or writing in the image
3. The overall context and setting
4. Any potential signs of manipulation or editing
5. The emotional tone or mood
6. Any notable details that could be relevant for content verification
7. Whether the image appears to be AI-generated or manipulated

Provide a detailed analysis that can help determine the authenticity of the content."""
            )
            
            # Store image analysis results
            state.image_analyses = image_results
            
            # Extract text from images
            extracted_texts = []
            manipulation_indicators = []
            
            for i, image_url in enumerate(state.content_images):
                print(f"🔍 Processing image {i+1}/{len(state.content_images)}: {image_url}")
                
                # Encode image for text extraction and manipulation detection
                image_data = self.image_processor.encode_image_from_url(image_url)
                if image_data:
                    # Extract text
                    text_result = self.image_processor.extract_text_from_image(image_data)
                    if text_result["success"]:
                        extracted_texts.append(text_result["extracted_text"])
                        print(f"📝 Extracted text: {text_result['extracted_text'][:100]}...")
                    
                    # Detect manipulation
                    manipulation_result = self.image_processor.detect_manipulation_indicators(image_data)
                    if manipulation_result["success"]:
                        manipulation_indicators.append({
                            "image_url": image_url,
                            "analysis": manipulation_result["manipulation_analysis"]
                        })
                        print(f"🔍 Manipulation analysis: {manipulation_result['manipulation_analysis'][:100]}...")
            
            state.extracted_texts = extracted_texts
            state.manipulation_indicators = manipulation_indicators
            
            # Combine extracted text with content text
            if extracted_texts:
                combined_text = state.content_text + "\n\n[Text from images:]\n" + "\n".join(extracted_texts)
                state.content_text = combined_text
                print(f"📝 Combined text length: {len(state.content_text)} characters")
            
            print(f"✅ Image processing completed: {len(image_results)} analyses, {len(extracted_texts)} text extractions, {len(manipulation_indicators)} manipulation checks")
            
        except Exception as e:
            print(f"❌ Image processing failed: {e}")
            # Continue with verification even if image processing fails
        
        return state
    
    async def _perform_web_search(self, state: VerificationState) -> VerificationState:
        """Perform web search for fact-checking information"""
        
        print(f"🔍 Starting web search for content verification...")
        print(f"📝 Content text length: {len(state.content_text)} characters")
        
        try:
            # Search for fact-checking information
            search_results = await self.web_search_module.search_for_fact_check(
                state.content_text, 
                state.content_url
            )
            
            # Store search results
            state.web_search_results = [
                {
                    "title": result.title,
                    "url": result.url,
                    "snippet": result.snippet,
                    "source": result.source,
                    "relevance_score": result.relevance_score
                }
                for result in search_results
            ]
            
            # Search for image verification if images exist
            if state.content_images:
                print(f"🖼️ Searching for image verification for {len(state.content_images)} images...")
                for image_url in state.content_images:
                    image_results = await self.web_search_module.search_for_image_verification(image_url)
                    state.fact_check_results.extend([
                        {
                            "type": "image_verification",
                            "image_url": image_url,
                            "title": result.title,
                            "url": result.url,
                            "snippet": result.snippet,
                            "source": result.source,
                            "relevance_score": result.relevance_score
                        }
                        for result in image_results
                    ])
            
            print(f"✅ Web search completed: {len(state.web_search_results)} text results, {len(state.fact_check_results)} image results")
            
            # Log search results summary
            if state.web_search_results:
                print(f"📊 Top search result: {state.web_search_results[0]['title'][:50]}...")
                print(f"🔗 Source: {state.web_search_results[0]['source']}")
                print(f"📈 Relevance: {state.web_search_results[0]['relevance_score']:.2f}")
            
        except Exception as e:
            print(f"❌ Web search failed: {e}")
            # Continue with verification even if web search fails
            state.web_search_results = []
            state.fact_check_results = []
        
        return state
    
    async def _multi_model_verification(self, state: VerificationState) -> VerificationState:
        """Multi-model verification using all 5 free OpenRouter models"""
        
        print(f"🔍 Starting multi-model verification for URL: {state.content_url}")
        print(f"📝 Content text length: {len(state.content_text)} characters")
        print(f"🖼️ Images count: {len(state.content_images) if state.content_images else 0}")
        
        # Create verification prompt with image analysis
        image_analysis_text = ""
        if state.image_analyses:
            image_analysis_text = "\n\n[Image Analysis Results:]\n"
            for i, analysis in enumerate(state.image_analyses):
                if analysis.get("success"):
                    image_analysis_text += f"Image {i+1}: {analysis.get('analysis', 'No analysis available')}\n"
        
        manipulation_text = ""
        if state.manipulation_indicators:
            manipulation_text = "\n\n[Manipulation Detection Results:]\n"
            for i, indicator in enumerate(state.manipulation_indicators):
                manipulation_text += f"Image {i+1}: {indicator.get('analysis', 'No analysis available')}\n"
        
        # Add web search results
        web_search_text = ""
        if state.web_search_results:
            web_search_text = "\n\n[Web Search Results for Fact-Checking:]\n"
            for i, result in enumerate(state.web_search_results[:5]):  # Top 5 results
                web_search_text += f"Result {i+1}:\n"
                web_search_text += f"Title: {result['title']}\n"
                web_search_text += f"URL: {result['url']}\n"
                web_search_text += f"Snippet: {result['snippet']}\n"
                web_search_text += f"Source: {result['source']}\n"
                web_search_text += f"Relevance: {result['relevance_score']:.2f}\n"
                web_search_text += "---\n"
        
        # Add image verification results
        image_verification_text = ""
        if state.fact_check_results:
            image_verification_text = "\n\n[Image Verification Search Results:]\n"
            for i, result in enumerate(state.fact_check_results[:3]):  # Top 3 image results
                image_verification_text += f"Image Verification {i+1}:\n"
                image_verification_text += f"Image URL: {result['image_url']}\n"
                image_verification_text += f"Title: {result['title']}\n"
                image_verification_text += f"URL: {result['url']}\n"
                image_verification_text += f"Snippet: {result['snippet']}\n"
                image_verification_text += f"Source: {result['source']}\n"
                image_verification_text += "---\n"
        
        # Create verification prompt
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content="""You are an AI content verification expert. Analyze the given content and determine if it's authentic, fake, or uncertain.

Your analysis should cover:
1. Factual accuracy and logical consistency
2. Source credibility and attribution
3. Context and timing relevance
4. Potential manipulation indicators (including image manipulation)
5. Overall authenticity assessment
6. Image content analysis and text extraction results
7. Any signs of AI-generated or manipulated content
8. Web search results and fact-checking information
9. Cross-reference claims with available online sources
10. Consider the reliability and relevance of search results

IMPORTANT: You MUST respond with ONLY valid JSON in this exact format:
{
    "decision": "authentic",
    "confidence": 0.8,
    "reasoning": "Your detailed analysis here",
    "evidence": ["evidence1", "evidence2"]
}

Valid decision values: "authentic", "fake", "uncertain"
Confidence must be a number between 0.0 and 1.0
Do not include any text outside the JSON object."""),
            HumanMessage(content=f"""Content to verify:
URL: {state.content_url}
Text: {state.content_text}
Images: {state.content_images if state.content_images else "None"}{image_analysis_text}{manipulation_text}{web_search_text}{image_verification_text}

Analyze this content and respond with ONLY the JSON format specified above.""")
        ])
        
        # Run verification with models in parallel for better performance
        model_names = list(self.models.keys())
        
        print(f"🤖 Starting verification with {len(model_names)} models: {model_names}")
        
        # Create tasks for all models
        tasks = []
        for model_name, client in self.models.items():
            task = asyncio.create_task(
                self._verify_with_model_safe(client, model_name, prompt, state)
            )
            tasks.append((model_name, task))
        
        # Wait for all tasks to complete
        results = []
        for model_name, task in tasks:
            try:
                result = await task
                results.append(result)
                print(f"✅ Model {model_name} completed successfully")
            except Exception as e:
                print(f"❌ Model {model_name} failed: {e}")
                results.append(self._create_fallback_decision(model_name, str(e)))
        
        print(f"✅ All models processed. Results count: {len(results)}")
        
        # Process results and create agent decisions
        decisions = []
        print(f"📊 Processing results from {len(results)} models...")
        
        for i, result in enumerate(results):
            model_name = model_names[i]
            print(f"🔍 Processing result {i+1}/{len(results)} for model: {model_name}")
            
            if isinstance(result, Exception):
                print(f"❌ Model {model_name} failed with exception: {result}")
                continue
                
            print(f"✅ Model {model_name} returned result: {result}")
            decision_data = result
            
            # Create agent decision
            agent_decision = AgentDecision(
                agent_name=f"Model: {model_name.replace('_', ' ').title()}",
                decision=VerificationResult(decision_data["decision"]),
                confidence=decision_data["confidence"],
                reasoning=decision_data["reasoning"],
                evidence=decision_data["evidence"]
            )
            decisions.append(agent_decision)
            print(f"✅ Created decision for {model_name}: {decision_data['decision']} (confidence: {decision_data['confidence']})")
        
        print(f"📋 Total valid decisions: {len(decisions)}")
        
        # Ensure we have at least some decisions
        if len(decisions) == 0:
            print(f"⚠️ No valid decisions, creating fallback")
            decisions.append(AgentDecision(
                agent_name="Fallback",
                decision=VerificationResult.UNCERTAIN,
                confidence=0.0,
                reasoning="All models failed",
                evidence=[]
            ))
        
        # Store all decisions in the state
        state.fact_checker_decision = decisions[0] if len(decisions) > 0 else None
        state.image_analyst_decision = decisions[1] if len(decisions) > 1 else None
        state.source_verifier_decision = decisions[2] if len(decisions) > 2 else None
        state.context_analyst_decision = decisions[3] if len(decisions) > 3 else None
        
        return state
    
    async def _analyze_popularity(self, state: VerificationState) -> VerificationState:
        """Analyze content popularity and engagement metrics"""
        
        print(f"📊 Analyzing popularity for URL: {state.content_url}")
        
        try:
            # Simulate popularity analysis based on content characteristics
            # In a real implementation, this would analyze social media metrics,
            # view counts, shares, etc.
            
            popularity_score = await self._calculate_popularity_score(state)
            state.popularity_score = popularity_score
            
            # Store engagement metrics
            state.engagement_metrics = {
                "estimated_views": int(popularity_score * 10000),  # Simulate view count
                "estimated_shares": int(popularity_score * 1000),   # Simulate share count
                "estimated_engagement": popularity_score,
                "content_virality": "high" if popularity_score > 0.7 else "medium" if popularity_score > 0.4 else "low"
            }
            
            print(f"📈 Popularity score: {popularity_score:.2f}")
            print(f"📊 Engagement metrics: {state.engagement_metrics}")
            
        except Exception as e:
            print(f"❌ Popularity analysis failed: {e}")
            state.popularity_score = 0.5  # Default moderate popularity
            state.engagement_metrics = {
                "estimated_views": 5000,
                "estimated_shares": 500,
                "estimated_engagement": 0.5,
                "content_virality": "medium"
            }
        
        return state
    
    async def _calculate_popularity_score(self, state: VerificationState) -> float:
        """Calculate popularity score based on content analysis"""
        
        # Analyze content characteristics that might indicate popularity
        content_text = state.content_text.lower()
        
        # Keywords that suggest viral content
        viral_keywords = [
            "breaking", "exclusive", "shocking", "amazing", "incredible", 
            "unbelievable", "must see", "viral", "trending", "hot",
            "urgent", "alert", "warning", "scandal", "leaked"
        ]
        
        # Count viral keywords
        viral_count = sum(1 for keyword in viral_keywords if keyword in content_text)
        
        # Analyze content length (medium length content tends to be more shareable)
        text_length = len(state.content_text)
        length_score = 0.5  # Default
        if 100 <= text_length <= 500:
            length_score = 0.8  # Optimal length
        elif 50 <= text_length <= 1000:
            length_score = 0.6  # Good length
        elif text_length > 1000:
            length_score = 0.4  # Too long
        
        # Analyze emotional content
        emotional_keywords = [
            "love", "hate", "angry", "excited", "scared", "surprised",
            "disgusted", "happy", "sad", "furious", "thrilled"
        ]
        emotional_count = sum(1 for keyword in emotional_keywords if keyword in content_text)
        
        # Calculate base popularity score
        base_score = 0.3  # Base score
        
        # Add viral keyword bonus
        viral_bonus = min(viral_count * 0.1, 0.3)  # Max 0.3 bonus
        
        # Add emotional content bonus
        emotional_bonus = min(emotional_count * 0.05, 0.2)  # Max 0.2 bonus
        
        # Add length score
        length_bonus = length_score * 0.2
        
        # Calculate final score
        popularity_score = base_score + viral_bonus + emotional_bonus + length_bonus
        
        # Ensure score is between 0 and 1
        popularity_score = max(0.0, min(1.0, popularity_score))
        
        print(f"🔍 Popularity analysis: viral={viral_count}, emotional={emotional_count}, length={text_length}")
        print(f"📊 Score breakdown: base={base_score:.2f}, viral={viral_bonus:.2f}, emotional={emotional_bonus:.2f}, length={length_bonus:.2f}")
        
        return popularity_score
    
    def _calculate_dynamic_reward(self, popularity_score: float) -> float:
        """Calculate dynamic reward based on popularity score"""
        
        # Base fee: 0.05 ALGO
        base_fee = 0.05
        
        # Popularity multiplier: 1.0 to 5.0 based on popularity score
        # Higher popularity = higher multiplier
        popularity_multiplier = 1.0 + (popularity_score * 4.0)  # Range: 1.0 to 5.0
        
        # Calculate dynamic reward
        dynamic_reward = base_fee * popularity_multiplier
        
        # Cap the maximum reward at 1.0 ALGO to prevent excessive rewards
        dynamic_reward = min(dynamic_reward, 1.0)
        
        print(f"💰 Reward calculation: base={base_fee:.3f}, multiplier={popularity_multiplier:.2f}, final={dynamic_reward:.4f}")
        
        return dynamic_reward
    
    async def _verify_with_model_safe(self, client, model_name, prompt, state):
        """Safely verify content with a specific model, handling timeouts and errors"""
        try:
            result = await asyncio.wait_for(
                self._verify_with_model(client, model_name, prompt, state),
                timeout=45  # 45 second timeout per model
            )
            return result
        except asyncio.TimeoutError:
            print(f"⏰ Model {model_name} timed out, creating fallback")
            return self._create_fallback_decision(model_name, "Timeout")
        except Exception as e:
            print(f"❌ Model {model_name} failed: {e}")
            return self._create_fallback_decision(model_name, str(e))

    async def _verify_with_model(self, client, model_name, prompt, state):
        """Verify content with a specific model"""
        print(f"🔄 Calling model: {model_name}")
        try:
            response = await client.ainvoke(prompt.format_messages())
            print(f"📨 Model {model_name} responded with content length: {len(response.content) if response.content else 0}")
            
            # Check if response is valid
            if not response or not response.content:
                print(f"❌ Empty response from model {model_name}")
                return self._create_fallback_decision(model_name, "Empty response from model")
            
            # Try to parse JSON response
            try:
                # Clean the response content (remove markdown code blocks)
                content = response.content.strip()
                if content.startswith("```json"):
                    content = content[7:]  # Remove ```json
                if content.startswith("```"):
                    content = content[3:]   # Remove ```
                if content.endswith("```"):
                    content = content[:-3]  # Remove trailing ```
                content = content.strip()
                
                decision_data = json.loads(content)
                print(f"✅ Model {model_name} returned valid JSON: {decision_data}")
                
                # Validate required fields
                required_fields = ["decision", "confidence", "reasoning", "evidence"]
                if not all(field in decision_data for field in required_fields):
                    print(f"❌ Invalid response format from model {model_name} - missing fields")
                    return self._create_fallback_decision(model_name, "Invalid response format")
                
                # Validate decision value
                if decision_data["decision"] not in ["authentic", "fake", "uncertain"]:
                    print(f"⚠️ Model {model_name} returned invalid decision: {decision_data['decision']}, setting to uncertain")
                    decision_data["decision"] = "uncertain"
                
                # Validate confidence range
                if not isinstance(decision_data["confidence"], (int, float)) or not 0 <= decision_data["confidence"] <= 1:
                    print(f"⚠️ Model {model_name} returned invalid confidence: {decision_data['confidence']}, setting to 0.5")
                    decision_data["confidence"] = 0.5
                
                print(f"✅ Model {model_name} validation passed")
                return decision_data
                
            except json.JSONDecodeError as json_err:
                print(f"JSON parse error from model {model_name}: {json_err}")
                print(f"Raw response: {response.content[:200]}...")
                
                # Try to extract JSON from the response using regex
                import re
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    try:
                        json_str = json_match.group(0)
                        decision_data = json.loads(json_str)
                        return decision_data
                    except json.JSONDecodeError:
                        pass
                
                # Try to extract decision from text response
                return self._parse_text_response(response.content, model_name)
                
        except Exception as e:
            print(f"Error with model {model_name}: {e}")
            return self._create_fallback_decision(model_name, str(e))
    
    def _create_fallback_decision(self, model_name, error_msg):
        """Create a fallback decision when model fails"""
        return {
            "decision": "uncertain",
            "confidence": 0.0,
            "reasoning": f"Model {model_name} failed: {error_msg}",
            "evidence": []
        }
    
    def _parse_text_response(self, text, model_name):
        """Try to parse a text response and extract decision"""
        text_lower = text.lower()
        
        # Try to determine decision from text
        if "authentic" in text_lower or "real" in text_lower or "genuine" in text_lower:
            decision = "authentic"
            confidence = 0.6
        elif "fake" in text_lower or "false" in text_lower or "misleading" in text_lower:
            decision = "fake"
            confidence = 0.6
        else:
            decision = "uncertain"
            confidence = 0.3
        
        return {
            "decision": decision,
            "confidence": confidence,
            "reasoning": f"Parsed from text response: {text[:200]}...",
            "evidence": []
        }
    
    async def _group_decision_maker(self, state: VerificationState) -> VerificationState:
        """Group decision maker that synthesizes all model decisions"""
        
        print(f"🤝 Starting group decision making...")
        
        decisions = [
            state.fact_checker_decision,
            state.image_analyst_decision,
            state.source_verifier_decision,
            state.context_analyst_decision
        ]
        
        print(f"📋 Raw decisions count: {len(decisions)}")
        
        # Filter out None decisions
        valid_decisions = [d for d in decisions if d is not None]
        print(f"✅ Valid decisions count: {len(valid_decisions)}")
        
        if not valid_decisions:
            state.group_decision = GroupDecision(
                final_decision=VerificationResult.UNCERTAIN,
                confidence=0.0,
                consensus_score=0.0,
                individual_decisions=[],
                group_reasoning="No valid decisions from models",
                web_search_results=state.web_search_results
            )
            state.verification_complete = True
            return state
        
        # Filter out failed/timeout decisions for consensus calculation
        successful_decisions = [d for d in valid_decisions if d.confidence > 0.0 and "failed" not in d.reasoning.lower() and "timeout" not in d.reasoning.lower()]
        failed_decisions = [d for d in valid_decisions if d not in successful_decisions]
        
        print(f"✅ Successful decisions: {len(successful_decisions)}")
        print(f"❌ Failed decisions: {len(failed_decisions)}")
        
        # Require minimum number of successful models for reliable consensus
        min_models = 2
        if len(successful_decisions) < min_models:
            print(f"⚠️ Insufficient successful models ({len(successful_decisions)} < {min_models}), defaulting to uncertain")
            state.group_decision = GroupDecision(
                final_decision=VerificationResult.UNCERTAIN,
                confidence=0.0,
                consensus_score=0.0,
                individual_decisions=valid_decisions,
                group_reasoning=f"Insufficient successful model responses ({len(successful_decisions)}/{len(valid_decisions)}). Need at least {min_models} successful models for reliable consensus.",
                web_search_results=state.web_search_results
            )
            state.verification_complete = True
            return state
        
        # Calculate consensus using only successful decisions
        authentic_count = sum(1 for d in successful_decisions if d.decision == VerificationResult.AUTHENTIC)
        fake_count = sum(1 for d in successful_decisions if d.decision == VerificationResult.FAKE)
        uncertain_count = sum(1 for d in successful_decisions if d.decision == VerificationResult.UNCERTAIN)
        
        print(f"📊 Successful decision counts - Authentic: {authentic_count}, Fake: {fake_count}, Uncertain: {uncertain_count}")
        
        # Calculate confidence-weighted scores
        authentic_weighted = sum(d.confidence for d in successful_decisions if d.decision == VerificationResult.AUTHENTIC)
        fake_weighted = sum(d.confidence for d in successful_decisions if d.decision == VerificationResult.FAKE)
        uncertain_weighted = sum(d.confidence for d in successful_decisions if d.decision == VerificationResult.UNCERTAIN)
        
        print(f"⚖️ Weighted scores - Authentic: {authentic_weighted:.2f}, Fake: {fake_weighted:.2f}, Uncertain: {uncertain_weighted:.2f}")
        
        # Determine final decision using both count and confidence weighting
        total_successful = len(successful_decisions)
        consensus_score = max(authentic_count, fake_count) / total_successful
        
        # Use confidence-weighted voting as primary method
        # Add minimum confidence threshold for reliable decisions
        min_confidence_threshold = 0.6
        
        if fake_weighted > authentic_weighted and fake_weighted > uncertain_weighted:
            # Check if we have high-confidence fake decisions
            high_conf_fake = [d for d in successful_decisions if d.decision == VerificationResult.FAKE and d.confidence >= min_confidence_threshold]
            if high_conf_fake:
                final_decision = VerificationResult.FAKE
                print(f"🏆 Final decision: FAKE (weighted: {fake_weighted:.2f}, count: {fake_count}, high-conf: {len(high_conf_fake)})")
            else:
                final_decision = VerificationResult.UNCERTAIN
                print(f"🏆 Final decision: UNCERTAIN (fake weighted: {fake_weighted:.2f} but low confidence)")
        elif authentic_weighted > fake_weighted and authentic_weighted > uncertain_weighted:
            # Check if we have high-confidence authentic decisions
            high_conf_authentic = [d for d in successful_decisions if d.decision == VerificationResult.AUTHENTIC and d.confidence >= min_confidence_threshold]
            if high_conf_authentic:
                final_decision = VerificationResult.AUTHENTIC
                print(f"🏆 Final decision: AUTHENTIC (weighted: {authentic_weighted:.2f}, count: {authentic_count}, high-conf: {len(high_conf_authentic)})")
            else:
                final_decision = VerificationResult.UNCERTAIN
                print(f"🏆 Final decision: UNCERTAIN (authentic weighted: {authentic_weighted:.2f} but low confidence)")
        elif fake_count > authentic_count and fake_count > uncertain_count:
            # Fallback to count-based voting
            high_conf_fake = [d for d in successful_decisions if d.decision == VerificationResult.FAKE and d.confidence >= min_confidence_threshold]
            if high_conf_fake:
                final_decision = VerificationResult.FAKE
                print(f"🏆 Final decision: FAKE (count majority: {fake_count}, high-conf: {len(high_conf_fake)})")
            else:
                final_decision = VerificationResult.UNCERTAIN
                print(f"🏆 Final decision: UNCERTAIN (fake count: {fake_count} but low confidence)")
        elif authentic_count > fake_count and authentic_count > uncertain_count:
            # Fallback to count-based voting
            high_conf_authentic = [d for d in successful_decisions if d.decision == VerificationResult.AUTHENTIC and d.confidence >= min_confidence_threshold]
            if high_conf_authentic:
                final_decision = VerificationResult.AUTHENTIC
                print(f"🏆 Final decision: AUTHENTIC (count majority: {authentic_count}, high-conf: {len(high_conf_authentic)})")
            else:
                final_decision = VerificationResult.UNCERTAIN
                print(f"🏆 Final decision: UNCERTAIN (authentic count: {authentic_count} but low confidence)")
        else:
            final_decision = VerificationResult.UNCERTAIN
            print(f"🏆 Final decision: UNCERTAIN (no clear majority)")
        
        # Calculate weighted average confidence based on decision alignment
        aligned_decisions = [d for d in successful_decisions if d.decision == final_decision]
        if aligned_decisions:
            avg_confidence = sum(d.confidence for d in aligned_decisions) / len(aligned_decisions)
            print(f"📈 Average confidence from aligned decisions: {avg_confidence:.2f} ({len(aligned_decisions)} models)")
        else:
            # Fallback to average of all successful decisions
            avg_confidence = sum(d.confidence for d in successful_decisions) / len(successful_decisions)
            print(f"📈 Average confidence from all successful decisions: {avg_confidence:.2f}")
        
        print(f"🎯 Final consensus score: {consensus_score:.2f}")
        
        # Calculate dynamic reward if content is fake
        dynamic_reward = 0.0
        if final_decision == VerificationResult.FAKE:
            dynamic_reward = self._calculate_dynamic_reward(state.popularity_score)
            print(f"💰 Dynamic reward calculated: {dynamic_reward:.4f} ALGO (popularity: {state.popularity_score:.2f})")
        
        # Generate group reasoning
        group_reasoning = self._generate_group_reasoning(valid_decisions, final_decision)
        print(f"💭 Generated group reasoning: {len(group_reasoning)} characters")
        
        state.group_decision = GroupDecision(
            final_decision=final_decision,
            confidence=avg_confidence,
            consensus_score=consensus_score,
            individual_decisions=valid_decisions,
            group_reasoning=group_reasoning,
            popularity_score=state.popularity_score,
            dynamic_reward=dynamic_reward,
            web_search_results=state.web_search_results
        )
        
        print(f"🎉 Group decision created successfully!")
        print(f"📊 Final result: {final_decision.value.upper()} (confidence: {avg_confidence:.2f}, consensus: {consensus_score:.2f})")
        
        state.verification_complete = True
        return state
    
    def _generate_group_reasoning(self, decisions: List[AgentDecision], final_decision: VerificationResult) -> str:
        """Generate reasoning for the group decision"""
        
        # Separate successful and failed decisions
        successful_decisions = [d for d in decisions if d.confidence > 0.0 and "failed" not in d.reasoning.lower() and "timeout" not in d.reasoning.lower()]
        failed_decisions = [d for d in decisions if d not in successful_decisions]
        
        reasoning_parts = [f"Group Decision: {final_decision.value.upper()}"]
        
        # Add consensus information
        if successful_decisions:
            authentic_count = sum(1 for d in successful_decisions if d.decision == VerificationResult.AUTHENTIC)
            fake_count = sum(1 for d in successful_decisions if d.decision == VerificationResult.FAKE)
            uncertain_count = sum(1 for d in successful_decisions if d.decision == VerificationResult.UNCERTAIN)
            
            reasoning_parts.append(f"Consensus: {fake_count} fake, {authentic_count} authentic, {uncertain_count} uncertain")
            reasoning_parts.append(f"Successful Models: {len(successful_decisions)}/{len(decisions)}")
            
            # Add confidence-weighted information
            fake_weighted = sum(d.confidence for d in successful_decisions if d.decision == VerificationResult.FAKE)
            authentic_weighted = sum(d.confidence for d in successful_decisions if d.decision == VerificationResult.AUTHENTIC)
            reasoning_parts.append(f"Confidence Weighted: Fake {fake_weighted:.2f}, Authentic {authentic_weighted:.2f}")
        
        if failed_decisions:
            reasoning_parts.append(f"\nFailed Models: {len(failed_decisions)}")
            for decision in failed_decisions:
                reasoning_parts.append(f"- {decision.agent_name}: {decision.reasoning}")
        
        reasoning_parts.append("\nIndividual Agent Analysis:")
        
        for decision in successful_decisions:
            status = "✅" if decision.decision == final_decision else "❌"
            reasoning_parts.append(f"\n{status} {decision.agent_name}: {decision.decision.value.upper()} (confidence: {decision.confidence:.2f})")
            reasoning_parts.append(f"Reasoning: {decision.reasoning}")
            if decision.evidence:
                reasoning_parts.append(f"Evidence: {', '.join(decision.evidence)}")
        
        return "\n".join(reasoning_parts)
    
    async def verify_content(self, content_url: str, content_text: str = "", content_images: List[str] = None) -> GroupDecision:
        """Main method to verify content using the multi-agent system"""
        
        print(f"🚀 Starting content verification...")
        print(f"🔗 URL: {content_url}")
        
        # If no content provided, try to scrape it
        if not content_text and not content_images:
            print(f"📥 No content provided, attempting to scrape from URL...")
            try:
                scraped_data = self.content_scraper.scrape_content(content_url)
                if "error" not in scraped_data:
                    content_text = scraped_data.get("content_text", "")
                    content_images = scraped_data.get("content_images", [])
                    print(f"✅ Scraped content: {len(content_text)} chars, {len(content_images)} images")
                else:
                    print(f"❌ Scraping failed: {scraped_data['error']}")
            except Exception as e:
                print(f"❌ Scraping error: {e}")
        
        if content_images is None:
            content_images = []
        
        print(f"📝 Text length: {len(content_text)} characters")
        print(f"🖼️ Images: {len(content_images)}")
        
        # Create initial state
        initial_state = VerificationState(
            content_url=content_url,
            content_text=content_text,
            content_images=content_images
        )
        
        print(f"📋 Initial state created, starting workflow...")
        
        # Run the verification workflow
        result = await self.workflow.ainvoke(initial_state)
        print(f"✅ Workflow completed, processing result...")
        
        # Check if result is a dict or VerificationState object
        print(f"🔍 Result type: {type(result)}")
        
        if isinstance(result, dict):
            print(f"📋 Result is dict, checking for group_decision...")
            # If it's a dict, extract the group_decision
            if 'group_decision' in result:
                print(f"✅ Found group_decision in dict result")
                return result['group_decision']
            else:
                print(f"❌ No group_decision found in dict result, creating fallback")
                # Create a fallback decision
                return GroupDecision(
                    final_decision=VerificationResult.UNCERTAIN,
                    confidence=0.0,
                    consensus_score=0.0,
                    individual_decisions=[],
                    group_reasoning="Workflow execution failed",
                    web_search_results=[]
                )
        else:
            print(f"📋 Result is VerificationState object, accessing group_decision...")
            # If it's a VerificationState object, return the group_decision
            if hasattr(result, 'group_decision'):
                print(f"✅ Found group_decision attribute")
                return result.group_decision
            else:
                print(f"❌ No group_decision attribute found, creating fallback")
                return GroupDecision(
                    final_decision=VerificationResult.UNCERTAIN,
                    confidence=0.0,
                    consensus_score=0.0,
                    individual_decisions=[],
                    group_reasoning="Workflow execution failed - no group_decision attribute",
                    web_search_results=[]
                )
    
    def cleanup(self):
        """Cleanup resources"""
        if hasattr(self, 'content_scraper'):
            self.content_scraper.close()
        if hasattr(self, 'web_search_module'):
            self.web_search_module.close()

# Example usage and API endpoint
async def main():
    """Example usage of the verification system"""
    
    # Initialize the system
    verifier = AgenticVerificationSystem()
    
    try:
        # Example content to verify with images
        content_url = "https://example.com/fake-news"
        content_text = "Breaking: Scientists discover that the Earth is actually flat and all space agencies have been lying to us for decades."
        content_images = [
            "https://upload.wikimedia.org/wikipedia/commons/f/f2/LPU-v1-die.jpg"
        ]
        
        # Verify the content
        result = await verifier.verify_content(
            content_url=content_url,
            content_text=content_text,
            content_images=content_images
        )
        
        print("=== VERIFICATION RESULT ===")
        print(f"Final Decision: {result.final_decision.value.upper()}")
        print(f"Confidence: {result.confidence:.2f}")
        print(f"Consensus Score: {result.consensus_score:.2f}")
        print(f"Popularity Score: {result.popularity_score:.2f}")
        print(f"Dynamic Reward: {result.dynamic_reward:.4f} ALGO")
        print(f"\nGroup Reasoning:\n{result.group_reasoning}")
        
    finally:
        # Cleanup resources
        verifier.cleanup()

if __name__ == "__main__":
    asyncio.run(main())
