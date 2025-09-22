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
        return ranked_results[:10]  # Return top 10 results
    
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
                    'hl': 'en'
                }
                
                print(f"📡 Requesting: https://serpapi.com/search")
                
                async with session.get('https://serpapi.com/search', params=params) as response:
                    print(f"📊 Response status: {response.status}")
                    
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Received data with keys: {list(data.keys())}")
                        return self._parse_serpapi_results(data)
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
        
        if 'organic_results' in data:
            for item in data['organic_results']:
                result = SearchResult(
                    title=item.get('title', ''),
                    url=item.get('link', ''),
                    snippet=item.get('snippet', ''),
                    source='SerpAPI',
                    relevance_score=0.8
                )
                results.append(result)
        
        return results
    
    
    def _generate_search_queries(self, content_text: str, content_url: str = "") -> List[str]:
        """Generate search queries from content text"""
        
        # Extract key phrases and entities
        key_phrases = self._extract_key_phrases(content_text)
        
        queries = []
        
        # Original content query
        if content_text:
            # Clean and truncate content for search
            clean_text = re.sub(r'[^\w\s]', ' ', content_text)
            clean_text = ' '.join(clean_text.split()[:20])  # First 20 words
            queries.append(f'"{clean_text}" fact check')
        
        # Key phrases with fact check
        for phrase in key_phrases[:3]:
            if len(phrase) > 10:  # Only use substantial phrases
                queries.append(f'"{phrase}" fact check verification')
        
        # Claims-based queries
        claims = self._extract_claims(content_text)
        for claim in claims[:2]:
            queries.append(f'"{claim}" true false verification')
        
        # Source verification queries
        if content_url:
            domain = self._extract_domain(content_url)
            if domain:
                queries.append(f'"{domain}" credibility reputation fact check')
        
        # Remove duplicates and empty queries
        queries = list(set([q for q in queries if q.strip()]))
        
        print(f"🔍 Generated {len(queries)} search queries")
        return queries
    
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
        # Look for statements that could be fact-checked
        claim_indicators = [
            r'([^.!?]*(?:is|are|was|were|will be|has been|have been)[^.!?]*)',
            r'([^.!?]*(?:scientists|research|study|study shows|according to)[^.!?]*)',
            r'([^.!?]*(?:discovered|found|revealed|proven)[^.!?]*)',
            r'([^.!?]*(?:breaking|exclusive|shocking)[^.!?]*)'
        ]
        
        claims = []
        for pattern in claim_indicators:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                clean_claim = match.strip()
                if len(clean_claim) > 20 and len(clean_claim) < 200:
                    claims.append(clean_claim)
        
        return claims[:3]  # Top 3 claims
    
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
    
    def _rank_results(self, results: List[SearchResult], content_text: str) -> List[SearchResult]:
        """Rank results by relevance to content"""
        
        # Simple relevance scoring based on text similarity
        content_words = set(content_text.lower().split())
        
        for result in results:
            # Calculate relevance score
            result_words = set((result.title + ' ' + result.snippet).lower().split())
            
            # Word overlap score
            overlap = len(content_words.intersection(result_words))
            total_words = len(content_words.union(result_words))
            
            if total_words > 0:
                overlap_score = overlap / total_words
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
