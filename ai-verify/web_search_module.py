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

@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str
    source: str
    relevance_score: float = 0.0

class WebSearchModule:
    def __init__(self):
        # Initialize search APIs
        self.serpapi_key = os.getenv("SERPAPI_API_KEY")
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.google_cse_id = os.getenv("GOOGLE_CSE_ID")
        self.bing_api_key = os.getenv("BING_API_KEY")
        
        # Fallback to free search if no API keys
        self.use_free_search = not any([self.serpapi_key, self.google_api_key, self.bing_api_key])
        
        if self.use_free_search:
            print("🔍 Using free web search (limited functionality)")
        else:
            print("🔍 Web search APIs configured")
    
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
        
        # Search with multiple queries in parallel
        tasks = []
        for query in search_queries[:3]:  # Limit to top 3 queries
            if self.serpapi_key:
                tasks.append(self._search_serpapi(query))
            elif self.google_api_key and self.google_cse_id:
                tasks.append(self._search_google_custom(query))
            elif self.bing_api_key:
                tasks.append(self._search_bing(query))
            else:
                tasks.append(self._search_free(query))
        
        # Wait for all searches to complete
        search_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for i, result in enumerate(search_results):
            if isinstance(result, Exception):
                print(f"❌ Search query {i+1} failed: {result}")
                continue
            
            if result:
                all_results.extend(result)
                print(f"✅ Search query {i+1} returned {len(result)} results")
        
        # Remove duplicates and rank by relevance
        unique_results = self._deduplicate_results(all_results)
        ranked_results = self._rank_results(unique_results, content_text)
        
        print(f"📊 Total unique results: {len(ranked_results)}")
        return ranked_results[:10]  # Return top 10 results
    
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
    
    async def _search_serpapi(self, query: str) -> List[SearchResult]:
        """Search using SerpAPI"""
        try:
            async with aiohttp.ClientSession() as session:
                params = {
                    'q': query,
                    'api_key': self.serpapi_key,
                    'engine': 'google',
                    'num': 10,
                    'gl': 'us',
                    'hl': 'en'
                }
                
                async with session.get('https://serpapi.com/search', params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return self._parse_serpapi_results(data)
                    else:
                        print(f"❌ SerpAPI error: {response.status}")
                        return []
        except Exception as e:
            print(f"❌ SerpAPI search failed: {e}")
            return []
    
    async def _search_google_custom(self, query: str) -> List[SearchResult]:
        """Search using Google Custom Search API"""
        try:
            async with aiohttp.ClientSession() as session:
                params = {
                    'key': self.google_api_key,
                    'cx': self.google_cse_id,
                    'q': query,
                    'num': 10
                }
                
                async with session.get('https://www.googleapis.com/customsearch/v1', params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return self._parse_google_results(data)
                    else:
                        print(f"❌ Google Custom Search error: {response.status}")
                        return []
        except Exception as e:
            print(f"❌ Google Custom Search failed: {e}")
            return []
    
    async def _search_bing(self, query: str) -> List[SearchResult]:
        """Search using Bing Search API"""
        try:
            headers = {'Ocp-Apim-Subscription-Key': self.bing_api_key}
            params = {'q': query, 'count': 10, 'mkt': 'en-US'}
            
            async with aiohttp.ClientSession() as session:
                async with session.get('https://api.bing.microsoft.com/v7.0/search', 
                                    headers=headers, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return self._parse_bing_results(data)
                    else:
                        print(f"❌ Bing Search error: {response.status}")
                        return []
        except Exception as e:
            print(f"❌ Bing Search failed: {e}")
            return []
    
    async def _search_free(self, query: str) -> List[SearchResult]:
        """Fallback free search (limited functionality)"""
        # This is a placeholder for free search implementation
        # In practice, you might use DuckDuckGo or other free APIs
        print(f"🔍 Free search for: {query}")
        
        # Return mock results for demonstration
        return [
            SearchResult(
                title=f"Search result for: {query[:50]}...",
                url="https://example.com/search-result",
                snippet=f"This is a mock search result for the query: {query}",
                source="Free Search",
                relevance_score=0.5
            )
        ]
    
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
    
    def _parse_google_results(self, data: Dict) -> List[SearchResult]:
        """Parse Google Custom Search results"""
        results = []
        
        if 'items' in data:
            for item in data['items']:
                result = SearchResult(
                    title=item.get('title', ''),
                    url=item.get('link', ''),
                    snippet=item.get('snippet', ''),
                    source='Google Custom Search',
                    relevance_score=0.8
                )
                results.append(result)
        
        return results
    
    def _parse_bing_results(self, data: Dict) -> List[SearchResult]:
        """Parse Bing Search results"""
        results = []
        
        if 'webPages' in data and 'value' in data['webPages']:
            for item in data['webPages']['value']:
                result = SearchResult(
                    title=item.get('name', ''),
                    url=item.get('url', ''),
                    snippet=item.get('snippet', ''),
                    source='Bing Search',
                    relevance_score=0.8
                )
                results.append(result)
        
        return results
    
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
        """Search for image verification information"""
        print(f"🔍 Searching for image verification: {image_url}")
        
        # This would typically use reverse image search APIs
        # For now, return a placeholder
        return [
            SearchResult(
                title="Image Verification Search",
                url="https://example.com/image-search",
                snippet="This is a placeholder for image verification search results",
                source="Image Search",
                relevance_score=0.5
            )
        ]
    
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
