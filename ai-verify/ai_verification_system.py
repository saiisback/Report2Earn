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

class VerificationState(BaseModel):
    content_url: str
    content_text: str = ""
    content_images: List[str] = []
    metadata: Dict[str, Any] = {}
    
    # Agent decisions
    fact_checker_decision: Optional[AgentDecision] = None
    image_analyst_decision: Optional[AgentDecision] = None
    source_verifier_decision: Optional[AgentDecision] = None
    context_analyst_decision: Optional[AgentDecision] = None
    
    # Final result
    group_decision: Optional[GroupDecision] = None
    verification_complete: bool = False

class AgenticVerificationSystem:
    def __init__(self):
        # Initialize OpenRouter client (using free models from the list)
        self.client = ChatOpenAI(
            model="openai/gpt-3.5-turbo",  # Free model from OpenRouter
            openai_api_base="https://openrouter.ai/api/v1",
            openai_api_key=os.getenv("OPENROUTER_API_KEY"),
            temperature=0.7
        )
        
        # Create the verification workflow
        self.workflow = self._create_verification_workflow()
    
    def _create_verification_workflow(self) -> StateGraph:
        """Create the LangGraph workflow for multi-agent verification"""
        
        workflow = StateGraph(VerificationState)
        
        # Add nodes for each agent
        workflow.add_node("fact_checker", self._fact_checker_agent)
        workflow.add_node("image_analyst", self._image_analyst_agent)
        workflow.add_node("source_verifier", self._source_verifier_agent)
        workflow.add_node("context_analyst", self._context_analyst_agent)
        workflow.add_node("group_decision", self._group_decision_maker)
        
        # Define the flow
        workflow.set_entry_point("fact_checker")
        workflow.add_edge("fact_checker", "image_analyst")
        workflow.add_edge("image_analyst", "source_verifier")
        workflow.add_edge("source_verifier", "context_analyst")
        workflow.add_edge("context_analyst", "group_decision")
        workflow.add_edge("group_decision", END)
        
        return workflow.compile()
    
    async def _fact_checker_agent(self, state: VerificationState) -> VerificationState:
        """Fact-checking agent that verifies claims and statements"""
        
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content="""You are a fact-checking expert. Your job is to:
1. Analyze the content for factual claims
2. Check for logical inconsistencies
3. Identify potential misinformation patterns
4. Provide a confidence score (0-1) and detailed reasoning

Respond with JSON format:
{
    "decision": "authentic" | "fake" | "uncertain",
    "confidence": 0.0-1.0,
    "reasoning": "detailed explanation",
    "evidence": ["evidence1", "evidence2"]
}"""),
            HumanMessage(content=f"Please fact-check this content: {state.content_text}")
        ])
        
        response = await self.client.ainvoke(prompt.format_messages())
        decision_data = json.loads(response.content)
        
        state.fact_checker_decision = AgentDecision(
            agent_name="Fact Checker",
            decision=VerificationResult(decision_data["decision"]),
            confidence=decision_data["confidence"],
            reasoning=decision_data["reasoning"],
            evidence=decision_data["evidence"]
        )
        
        return state
    
    async def _image_analyst_agent(self, state: VerificationState) -> VerificationState:
        """Image analysis agent that examines visual content"""
        
        if not state.content_images:
            # No images to analyze
            state.image_analyst_decision = AgentDecision(
                agent_name="Image Analyst",
                decision=VerificationResult.UNCERTAIN,
                confidence=0.0,
                reasoning="No images provided for analysis",
                evidence=[]
            )
            return state
        
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content="""You are an image analysis expert. Your job is to:
1. Analyze images for signs of manipulation
2. Check for consistency with the text content
3. Look for visual red flags (deepfakes, edited content, etc.)
4. Provide a confidence score (0-1) and detailed reasoning

Respond with JSON format:
{
    "decision": "authentic" | "fake" | "uncertain",
    "confidence": 0.0-1.0,
    "reasoning": "detailed explanation",
    "evidence": ["evidence1", "evidence2"]
}"""),
            HumanMessage(content=f"Analyze these images in relation to the content: {state.content_text}\nImages: {state.content_images}")
        ])
        
        response = await self.client.ainvoke(prompt.format_messages())
        decision_data = json.loads(response.content)
        
        state.image_analyst_decision = AgentDecision(
            agent_name="Image Analyst",
            decision=VerificationResult(decision_data["decision"]),
            confidence=decision_data["confidence"],
            reasoning=decision_data["reasoning"],
            evidence=decision_data["evidence"]
        )
        
        return state
    
    async def _source_verifier_agent(self, state: VerificationState) -> VerificationState:
        """Source verification agent that checks credibility and sources"""
        
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content="""You are a source verification expert. Your job is to:
1. Analyze the credibility of sources mentioned
2. Check for proper attribution
3. Look for bias or agenda indicators
4. Verify if sources are reliable and authoritative

Respond with JSON format:
{
    "decision": "authentic" | "fake" | "uncertain",
    "confidence": 0.0-1.0,
    "reasoning": "detailed explanation",
    "evidence": ["evidence1", "evidence2"]
}"""),
            HumanMessage(content=f"Verify the sources and credibility of this content: {state.content_text}")
        ])
        
        response = await self.client.ainvoke(prompt.format_messages())
        decision_data = json.loads(response.content)
        
        state.source_verifier_decision = AgentDecision(
            agent_name="Source Verifier",
            decision=VerificationResult(decision_data["decision"]),
            confidence=decision_data["confidence"],
            reasoning=decision_data["reasoning"],
            evidence=decision_data["evidence"]
        )
        
        return state
    
    async def _context_analyst_agent(self, state: VerificationState) -> VerificationState:
        """Context analysis agent that examines broader context and timing"""
        
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content="""You are a context analysis expert. Your job is to:
1. Analyze the broader context and timing
2. Check for relevance to current events
3. Look for patterns that might indicate manipulation
4. Consider the overall narrative and agenda

Respond with JSON format:
{
    "decision": "authentic" | "fake" | "uncertain",
    "confidence": 0.0-1.0,
    "reasoning": "detailed explanation",
    "evidence": ["evidence1", "evidence2"]
}"""),
            HumanMessage(content=f"Analyze the context and timing of this content: {state.content_text}")
        ])
        
        response = await self.client.ainvoke(prompt.format_messages())
        decision_data = json.loads(response.content)
        
        state.context_analyst_decision = AgentDecision(
            agent_name="Context Analyst",
            decision=VerificationResult(decision_data["decision"]),
            confidence=decision_data["confidence"],
            reasoning=decision_data["reasoning"],
            evidence=decision_data["evidence"]
        )
        
        return state
    
    async def _group_decision_maker(self, state: VerificationState) -> VerificationState:
        """Group decision maker that synthesizes all agent decisions"""
        
        decisions = [
            state.fact_checker_decision,
            state.image_analyst_decision,
            state.source_verifier_decision,
            state.context_analyst_decision
        ]
        
        # Filter out None decisions
        valid_decisions = [d for d in decisions if d is not None]
        
        if not valid_decisions:
            state.group_decision = GroupDecision(
                final_decision=VerificationResult.UNCERTAIN,
                confidence=0.0,
                consensus_score=0.0,
                individual_decisions=[],
                group_reasoning="No valid decisions from agents"
            )
            state.verification_complete = True
            return state
        
        # Calculate consensus
        authentic_count = sum(1 for d in valid_decisions if d.decision == VerificationResult.AUTHENTIC)
        fake_count = sum(1 for d in valid_decisions if d.decision == VerificationResult.FAKE)
        uncertain_count = sum(1 for d in valid_decisions if d.decision == VerificationResult.UNCERTAIN)
        
        total_decisions = len(valid_decisions)
        consensus_score = max(authentic_count, fake_count) / total_decisions
        
        # Determine final decision
        if authentic_count > fake_count and authentic_count > uncertain_count:
            final_decision = VerificationResult.AUTHENTIC
        elif fake_count > authentic_count and fake_count > uncertain_count:
            final_decision = VerificationResult.FAKE
        else:
            final_decision = VerificationResult.UNCERTAIN
        
        # Calculate average confidence
        avg_confidence = sum(d.confidence for d in valid_decisions) / len(valid_decisions)
        
        # Generate group reasoning
        group_reasoning = self._generate_group_reasoning(valid_decisions, final_decision)
        
        state.group_decision = GroupDecision(
            final_decision=final_decision,
            confidence=avg_confidence,
            consensus_score=consensus_score,
            individual_decisions=valid_decisions,
            group_reasoning=group_reasoning
        )
        
        state.verification_complete = True
        return state
    
    def _generate_group_reasoning(self, decisions: List[AgentDecision], final_decision: VerificationResult) -> str:
        """Generate reasoning for the group decision"""
        
        reasoning_parts = [f"Group Decision: {final_decision.value.upper()}"]
        reasoning_parts.append(f"Consensus Score: {max(sum(1 for d in decisions if d.decision == VerificationResult.AUTHENTIC), sum(1 for d in decisions if d.decision == VerificationResult.FAKE)) / len(decisions):.2f}")
        reasoning_parts.append("\nIndividual Agent Analysis:")
        
        for decision in decisions:
            reasoning_parts.append(f"\n{decision.agent_name}: {decision.decision.value.upper()} (confidence: {decision.confidence:.2f})")
            reasoning_parts.append(f"Reasoning: {decision.reasoning}")
            if decision.evidence:
                reasoning_parts.append(f"Evidence: {', '.join(decision.evidence)}")
        
        return "\n".join(reasoning_parts)
    
    async def verify_content(self, content_url: str, content_text: str = "", content_images: List[str] = None) -> GroupDecision:
        """Main method to verify content using the multi-agent system"""
        
        if content_images is None:
            content_images = []
        
        # Create initial state
        initial_state = VerificationState(
            content_url=content_url,
            content_text=content_text,
            content_images=content_images
        )
        
        # Run the verification workflow
        result = await self.workflow.ainvoke(initial_state)
        
        return result.group_decision

# Example usage and API endpoint
async def main():
    """Example usage of the verification system"""
    
    # Initialize the system
    verifier = AgenticVerificationSystem()
    
    # Example content to verify
    content_url = "https://example.com/fake-news"
    content_text = "Breaking: Scientists discover that the Earth is actually flat and all space agencies have been lying to us for decades."
    
    # Verify the content
    result = await verifier.verify_content(
        content_url=content_url,
        content_text=content_text,
        content_images=[]
    )
    
    print("=== VERIFICATION RESULT ===")
    print(f"Final Decision: {result.final_decision.value.upper()}")
    print(f"Confidence: {result.confidence:.2f}")
    print(f"Consensus Score: {result.consensus_score:.2f}")
    print(f"\nGroup Reasoning:\n{result.group_reasoning}")

if __name__ == "__main__":
    asyncio.run(main())
