#!/usr/bin/env python3
"""
Web Search Module for AI Verification System
Provides web search capabilities to enhance content verification accuracy
"""

import os
import json
import asyncio
import aiohttp
from typing import Dict, List, Optional, Any
from datetime import datetime
from urllib.parse import quote_plus
import re
from dataclasses import dataclass
from groq import Groq
# Environment variables are loaded in the main verification system

@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str
    source: str
    relevance_score: float = 0.0

class WebSearchModule:
    def __init__(self, serpapi_key: Optional[str] = None):
        # Initialize SerpAPI key (passed from main system)
        self.serpapi_key = serpapi_key or os.getenv("SERPAPI_API_KEY")
        
        # Initialize Groq client for intelligent query generation
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key:
            self.groq_client = Groq(api_key=groq_key)
            print(f"✅ Groq client initialized for intelligent query generation")
        else:
            self.groq_client = None
            print("⚠️ GROQ_API_KEY not found - will use basic query generation")
        
        print(f"🔍 WebSearchModule initialized with key: {bool(self.serpapi_key)}")
        if self.serpapi_key:
            print(f"✅ Using SerpAPI for web search (key: {self.serpapi_key[:10]}...)")
        else:
            print("❌ SERPAPI_API_KEY not found - web search will not work")
            print("   Please set SERPAPI_API_KEY in your .env file")
    
    async def search_for_fact_check(self, content_text: str, content_url: str = "") -> List[SearchResult]:
        """
        Search for fact-checking information related to the content
        
        Args:
            content_text: The text content to fact-check
            content_url: The URL of the content (optional)
            
        Returns:
            List of SearchResult objects with relevant information
        """
        print(f"🔍 Starting fact-check search for content: {content_text[:100]}...")
        
        # Extract key search terms from content
        search_queries = self._generate_search_queries(content_text, content_url)
        
        all_results = []
        
        # Search with SerpAPI
        if self.serpapi_key:
            print(f"🚀 Using SerpAPI to search for {len(search_queries)} queries...")
            for i, query in enumerate(search_queries[:3]):  # Limit to top 3 queries
                print(f"🔍 Searching query {i+1}: {query}")
                try:
                    results = await self._search_serpapi(query)
                    if results:
                        all_results.extend(results)
                        print(f"✅ Query {i+1} returned {len(results)} results")
                    else:
                        print(f"⚠️ Query {i+1} returned no results")
                except Exception as e:
                    print(f"❌ Query {i+1} failed: {e}")
        else:
            print("❌ SerpAPI key not available, cannot perform web search")
        
        # Remove duplicates and rank by relevance
        unique_results = self._deduplicate_results(all_results)
        ranked_results = self._rank_results(unique_results, content_text)
        
        print(f"📊 Total unique results: {len(ranked_results)}")
        if ranked_results:
            print(f"🔍 Top sources: {[r.source for r in ranked_results[:3]]}")
        return ranked_results  # Return all results - no limit
    
    async def _search_serpapi(self, query: str) -> List[SearchResult]:
        """Search using SerpAPI"""
        try:
            print(f"🔍 Making SerpAPI request for: {query[:50]}...")
            
            async with aiohttp.ClientSession() as session:
                params = {
                    'q': query,
                    'api_key': self.serpapi_key,
                    'engine': 'google',
                    'num': 10,
                    'gl': 'us',
                    'hl': 'en',
                    'safe': 'active',
                    'google_domain': 'google.com'
                }
                
                print(f"📡 Requesting: https://serpapi.com/search")
                
                async with session.get('https://serpapi.com/search', params=params) as response:
                    print(f"📊 Response status: {response.status}")
                    
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Received data with keys: {list(data.keys())}")
                        
                        # Check for errors in response
                        if 'error' in data:
                            print(f"⚠️ SerpAPI error: {data['error']}")
                            return []
                        
                        # Parse results
                        results = self._parse_serpapi_results(data)
                        print(f"✅ Query returned {len(results)} results")
                        
                        # Debug: Show first few results
                        if results:
                            print(f"🔍 Sample results:")
                            for i, result in enumerate(results[:2], 1):
                                print(f"   {i}. {result.title[:50]}...")
                                print(f"      Source: {result.source}")
                        else:
                            print("⚠️ No results found for this query")
                        
                        return results
                    else:
                        error_text = await response.text()
                        print(f"❌ SerpAPI error: {response.status} - {error_text}")
                        return []
        except aiohttp.ClientError as e:
            print(f"❌ SerpAPI client error: {e}")
            return []
        except Exception as e:
            print(f"❌ SerpAPI search failed: {e}")
            print(f"Error type: {type(e).__name__}")
            return []
    
    def _parse_serpapi_results(self, data: Dict) -> List[SearchResult]:
        """Parse SerpAPI search results"""
        results = []
        
        # Parse organic results - show all results
        if 'organic_results' in data:
            for item in data['organic_results']:
                if item.get('title') and item.get('link'):  # Only basic validation
                    result = SearchResult(
                        title=item.get('title', ''),
                        url=item.get('link', ''),
                        snippet=item.get('snippet', ''),
                        source=self._extract_domain(item.get('link', '')),
                        relevance_score=0.8
                    )
                    results.append(result)
        
        # Parse news results if available
        if 'news_results' in data:
            for item in data['news_results']:
                if item.get('title') and item.get('link'):  # Only basic validation
                    result = SearchResult(
                        title=item.get('title', ''),
                        url=item.get('link', ''),
                        snippet=item.get('snippet', ''),
                        source=self._extract_domain(item.get('link', '')),
                        relevance_score=0.9  # Higher score for news
                    )
                    results.append(result)
        
        # Parse answer box if available
        if 'answer_box' in data:
            answer_box = data['answer_box']
            if answer_box.get('answer'):
                result = SearchResult(
                    title=answer_box.get('title', 'Answer'),
                    url=answer_box.get('link', ''),
                    snippet=answer_box.get('answer', ''),
                    source=self._extract_domain(answer_box.get('link', '')),
                    relevance_score=1.0  # Highest score for direct answers
                )
                results.append(result)
        
        # Parse knowledge graph if available
        if 'knowledge_graph' in data:
            kg = data['knowledge_graph']
            if kg.get('description'):
                result = SearchResult(
                    title=kg.get('title', 'Knowledge Graph'),
                    url=kg.get('website', ''),
                    snippet=kg.get('description', ''),
                    source=self._extract_domain(kg.get('website', '')),
                    relevance_score=0.9  # High score for knowledge graph
                )
                results.append(result)
        
        return results
    
    
    def _generate_search_queries(self, content_text: str, content_url: str = "") -> List[str]:
        """Generate intelligent fact-checking search queries using Groq LLM"""
        
        if self.groq_client:
            return self._generate_llm_queries(content_text, content_url)
        else:
            return self._generate_basic_queries(content_text, content_url)
    
    def _generate_llm_queries(self, content_text: str, content_url: str = "") -> List[str]:
        """Generate search queries using Groq LLM (Llama-3.1-8b-instant)"""
        try:
            print("🤖 Generating intelligent search queries with Groq...")
            
            prompt = f"""
Generate 8-10 search queries to find information about this content:

Content: "{content_text[:200]}"

Create diverse search queries that will find:
- News articles
- Official statements
- Fact-checking information
- Expert opinions
- Recent updates
- Background information

Make queries simple and broad. Use quotes only for exact phrases.
Search everywhere - no restrictions.

Return only the search queries, one per line.
"""

            response = self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You are a fact-checking expert who generates precise search queries for verification."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.3
            )
            
            # Parse the response
            queries_text = response.choices[0].message.content.strip()
            queries = [q.strip() for q in queries_text.split('\n') if q.strip()]
            
            # Filter and clean queries
            clean_queries = []
            for query in queries:
                if len(query) > 10 and len(query) < 200:  # Reasonable length
                    # Remove any numbering or bullets
                    query = re.sub(r'^\d+\.\s*', '', query)
                    query = re.sub(r'^[-*]\s*', '', query)
                    clean_queries.append(query)
            
            print(f"✅ Generated {len(clean_queries)} intelligent queries")
            for i, query in enumerate(clean_queries[:3], 1):
                print(f"   {i}. {query[:60]}...")
            
            return clean_queries[:10]  # Return top 10 queries
            
        except Exception as e:
            print(f"❌ Error generating LLM queries: {e}")
            print("🔄 Falling back to basic query generation...")
            return self._generate_basic_queries(content_text, content_url)
    
    def _generate_basic_queries(self, content_text: str, content_url: str = "") -> List[str]:
        """Fallback basic query generation"""
        queries = []
        
        # Basic fact-check queries
        if content_text:
            clean_text = re.sub(r'[^\w\s]', ' ', content_text)
            clean_text = ' '.join(clean_text.split()[:15])
            
            # Generate simple, broad queries
            queries.extend([
                clean_text,  # Direct search
                f'{clean_text} news',
                f'{clean_text} facts',
                f'{clean_text} information',
                f'{clean_text} latest',
                f'{clean_text} 2024',
                f'{clean_text} official',
                f'{clean_text} government'
            ])
        
        return queries[:8]
    
    def _extract_key_phrases(self, text: str) -> List[str]:
        """Extract key phrases from text"""
        # Simple key phrase extraction
        words = text.lower().split()
        
        # Remove common words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'}
        
        filtered_words = [w for w in words if w not in stop_words and len(w) > 3]
        
        # Create phrases
        phrases = []
        for i in range(len(filtered_words) - 2):
            phrase = ' '.join(filtered_words[i:i+3])
            if len(phrase) > 10:
                phrases.append(phrase)
        
        return phrases[:5]  # Top 5 phrases
    
    def _extract_claims(self, text: str) -> List[str]:
        """Extract factual claims from text"""
        claims = []
        
        # Look for statements that could be fact-checked
        sentences = re.split(r'[.!?]+', text)
        
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) > 20:  # Substantial sentences
                # Look for factual indicators
                if any(word in sentence.lower() for word in ['said', 'claims', 'reports', 'according to', 'study shows', 'research', 'data', 'statistics', 'percent', '%', 'million', 'billion']):
                    claims.append(sentence)
        
        return claims[:5]  # Top 5 claims
    
    def _extract_topics(self, text: str) -> List[str]:
        """Extract main topics from text"""
        topics = []
        
        # Look for capitalized words (potential proper nouns)
        words = text.split()
        for word in words:
            if word[0].isupper() and len(word) > 3:
                topics.append(word)
        
        # Look for common topic indicators
        topic_indicators = ['law', 'policy', 'government', 'court', 'judge', 'legal', 'bill', 'act', 'regulation', 'rule', 'law', 'crime', 'police', 'arrest', 'trial', 'verdict', 'sentence']
        
        for indicator in topic_indicators:
            if indicator in text.lower():
                # Extract surrounding context
                start = text.lower().find(indicator)
                if start != -1:
                    # Get 5 words before and after
                    words = text.split()
                    for i, word in enumerate(words):
                        if indicator in word.lower():
                            context_start = max(0, i - 2)
                            context_end = min(len(words), i + 3)
                            topic = ' '.join(words[context_start:context_end])
                            if len(topic) > 10:
                                topics.append(topic)
                            break
        
        return topics[:3]  # Top 3 topics
    
    
    def _extract_domain(self, url: str) -> Optional[str]:
        """Extract domain from URL"""
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            return parsed.netloc
        except:
            return None
    
    
    def _deduplicate_results(self, results: List[SearchResult]) -> List[SearchResult]:
        """Remove duplicate search results"""
        seen_urls = set()
        unique_results = []
        
        for result in results:
            if result.url not in seen_urls:
                seen_urls.add(result.url)
                unique_results.append(result)
        
        return unique_results
    
    def _rank_results(self, results: List[SearchResult], content_text: str = "") -> List[SearchResult]:
        """Rank results by relevance to content"""
        
        # Simple relevance scoring based on text similarity
        content_words = set(content_text.lower().split()) if content_text else set()
        
        for result in results:
            # Calculate relevance score
            result_words = set((result.title + ' ' + result.snippet).lower().split())
            
            # Word overlap score (only if content provided)
            if content_words:
                overlap = len(content_words.intersection(result_words))
                total_words = len(content_words.union(result_words))
                
                if total_words > 0:
                    overlap_score = overlap / total_words
                else:
                    overlap_score = 0
            else:
                overlap_score = 0
            
            # Boost score for fact-checking sites
            fact_check_sites = ['snopes', 'factcheck', 'politifact', 'reuters', 'ap.org', 'bbc', 'cnn']
            site_boost = 0.2 if any(site in result.url.lower() for site in fact_check_sites) else 0
            
            # Final relevance score
            result.relevance_score = min(1.0, overlap_score + site_boost + 0.1)
        
        # Sort by relevance score
        return sorted(results, key=lambda x: x.relevance_score, reverse=True)
    
    async def search_for_image_verification(self, image_url: str) -> List[SearchResult]:
        """Search for image verification using SerpAPI"""
        print(f"🔍 Searching for image verification: {image_url}")
        
        if not self.serpapi_key:
            print("❌ SerpAPI key not available for image search")
            return []
        
        try:
            print(f"🔍 Making SerpAPI image search request for: {image_url}")
            
            async with aiohttp.ClientSession() as session:
                params = {
                    'engine': 'google_reverse_image',
                    'image_url': image_url,
                    'api_key': self.serpapi_key,
                    'num': 5
                }
                
                print(f"📡 Requesting image search: https://serpapi.com/search")
                
                async with session.get('https://serpapi.com/search', params=params) as response:
                    print(f"📊 Image search response status: {response.status}")
                    
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Received image data with keys: {list(data.keys())}")
                        return self._parse_serpapi_image_results(data)
                    else:
                        error_text = await response.text()
                        print(f"❌ SerpAPI image search error: {response.status} - {error_text}")
                        return []
        except aiohttp.ClientError as e:
            print(f"❌ SerpAPI image search client error: {e}")
            return []
        except Exception as e:
            print(f"❌ SerpAPI image search failed: {e}")
            print(f"Error type: {type(e).__name__}")
            return []
    
    def _parse_serpapi_image_results(self, data: Dict) -> List[SearchResult]:
        """Parse SerpAPI image search results"""
        results = []
        
        if 'image_results' in data:
            for item in data['image_results'][:5]:  # Limit to 5 results
                result = SearchResult(
                    title=item.get('title', 'Image Search Result'),
                    url=item.get('link', ''),
                    snippet=item.get('snippet', 'Image verification result'),
                    source='SerpAPI Images',
                    relevance_score=0.7
                )
                results.append(result)
        
        return results
    
    def close(self):
        """Close method for compatibility"""
        # SerpAPI doesn't need cleanup
        pass
    
    def format_search_results_for_ai(self, search_results: List[SearchResult]) -> str:
        """Format search results for AI analysis"""
        if not search_results:
            return "No web search results available."
        
        formatted = "=== WEB SEARCH RESULTS ===\n\n"
        
        for i, result in enumerate(search_results, 1):
            formatted += f"Result {i}:\n"
            formatted += f"Title: {result.title}\n"
            formatted += f"URL: {result.url}\n"
            formatted += f"Snippet: {result.snippet}\n"
            formatted += f"Source: {result.source}\n"
            formatted += f"Relevance: {result.relevance_score:.2f}\n"
            formatted += "---\n\n"
        
        return formatted

# Example usage
async def main():
    """Example usage of the web search module"""
    
    search_module = WebSearchModule()
    
    # Example content to fact-check
    content_text = "Scientists discover that the Earth is actually flat and all space agencies have been lying to us for decades."
    
    # Search for fact-checking information
    results = await search_module.search_for_fact_check(content_text)
    
    print(f"Found {len(results)} search results:")
    for result in results:
        print(f"- {result.title} ({result.source})")
        print(f"  {result.snippet[:100]}...")
        print(f"  Relevance: {result.relevance_score:.2f}")
        print()

if __name__ == "__main__":
    asyncio.run(main())
