#!/usr/bin/env python3
"""
Reddit API Scraper - Uses Reddit's JSON API as fallback
This is the most reliable method when available
"""

import requests
import json
import re
import os
import time
from urllib.parse import urlparse, parse_qs
from typing import Dict, List, Optional, Tuple
from datetime import datetime


class RedditAPIScraper:
    def __init__(self):
        self.session = requests.Session()
        self.setup_session()
        
    def setup_session(self):
        """Setup requests session with proper headers"""
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
    
    def extract_post_id(self, url: str) -> Optional[str]:
        """Extract post ID from Reddit URL"""
        patterns = [
            r'reddit\.com/r/\w+/comments/([^/]+)',
            r'reddit\.com/r/\w+/comments/[^/]+/[^/]+/([^/]+)',
            r'reddit\.com/comments/([^/]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
    
    def scrape_post(self, url: str) -> Dict:
        """Scrape Reddit post using JSON API"""
        print(f"Scraping Reddit post via API: {url}")
        
        # Extract post ID
        post_id = self.extract_post_id(url)
        if not post_id:
            return {"error": "Invalid Reddit URL format"}
        
        print(f"Post ID: {post_id}")
        
        try:
            # Convert Reddit URL to JSON API URL
            api_url = url.rstrip('/') + '.json'
            
            # Add random delay
            time.sleep(1)
            
            # Make request to Reddit's JSON API
            response = self.session.get(api_url, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            # Reddit JSON API returns a list with two items: post data and comments
            if not data or len(data) < 1:
                return {"error": "No data returned from Reddit API"}
            
            post_data = data[0]['data']['children'][0]['data']
            
            result = self._parse_reddit_data(post_data, post_id, url)
            return result
            
        except Exception as e:
            print(f"Reddit API method failed: {e}")
            return {"error": f"Reddit API method failed: {str(e)}"}
    
    def _parse_reddit_data(self, post_data: Dict, post_id: str, url: str) -> Dict:
        """Parse Reddit API response data"""
        result = {
            'post_id': post_id,
            'url': url,
            'title': post_data.get('title', ''),
            'text': post_data.get('selftext', ''),
            'author': {
                'username': post_data.get('author', ''),
                'full_name': ''
            },
            'subreddit': f"r/{post_data.get('subreddit', '')}",
            'media': {'urls': [], 'type': 'Unknown'},
            'engagement': {
                'upvotes': post_data.get('ups', 0),
                'downvotes': post_data.get('downs', 0),
                'comments': post_data.get('num_comments', 0),
                'awards': post_data.get('total_awards_received', 0)
            },
            'comments': [],
            'timestamp': post_data.get('created_utc', 0),
            'flair': post_data.get('link_flair_text', ''),
            'hashtags': [],
            'mentions': []
        }
        
        # Extract hashtags and mentions from text
        full_text = f"{result['title']} {result['text']}"
        result['hashtags'] = self._extract_hashtags(full_text)
        result['mentions'] = self._extract_mentions(full_text)
        
        # Extract media
        self._extract_media_from_api(post_data, result)
        
        # Convert timestamp to readable format
        if result['timestamp']:
            result['timestamp'] = datetime.fromtimestamp(result['timestamp']).isoformat()
        
        return result
    
    def _extract_media_from_api(self, post_data: Dict, result: Dict):
        """Extract media from Reddit API data"""
        try:
            # Check for images
            if 'preview' in post_data and 'images' in post_data['preview']:
                for image in post_data['preview']['images']:
                    if 'source' in image:
                        url = image['source']['url']
                        # Unescape Reddit's escaped URLs
                        url = url.replace('&amp;', '&')
                        result['media']['urls'].append(url)
                        result['media']['type'] = 'GraphImage'
            
            # Check for video
            if 'media' in post_data and post_data['media']:
                if 'reddit_video' in post_data['media']:
                    video_url = post_data['media']['reddit_video'].get('fallback_url', '')
                    if video_url:
                        result['media']['urls'].append(video_url)
                        result['media']['type'] = 'GraphVideo'
            
            # Check for external links (images/videos)
            if 'url_overridden_by_dest' in post_data:
                url = post_data['url_overridden_by_dest']
                if any(ext in url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                    result['media']['urls'].append(url)
                    result['media']['type'] = 'GraphImage'
                elif any(ext in url.lower() for ext in ['.mp4', '.webm', '.mov']):
                    result['media']['urls'].append(url)
                    result['media']['type'] = 'GraphVideo'
            
            # Check for gallery posts
            if 'is_gallery' in post_data and post_data['is_gallery']:
                if 'media_metadata' in post_data:
                    for media_id, media_info in post_data['media_metadata'].items():
                        if 's' in media_info:
                            url = media_info['s'].get('u', '')
                            if url:
                                url = url.replace('&amp;', '&')
                                result['media']['urls'].append(url)
                                result['media']['type'] = 'GraphImage'
        
        except Exception as e:
            print(f"Error extracting media from API: {e}")
    
    def _extract_hashtags(self, text: str) -> List[str]:
        """Extract hashtags from text"""
        hashtag_pattern = r'#\w+'
        return re.findall(hashtag_pattern, text)
    
    def _extract_mentions(self, text: str) -> List[str]:
        """Extract mentions from text"""
        mention_pattern = r'@\w+'
        return re.findall(mention_pattern, text)


def main():
    print("Reddit API Scraper")
    print("=" * 30)
    
    # Get URL from user input
    url = input("Enter Reddit post URL: ").strip()
    
    if not url:
        print("No URL provided. Exiting.")
        return
    
    scraper = RedditAPIScraper()
    
    try:
        print(f"\nScraping: {url}")
        print("Please wait...")
        
        # Scrape the post
        result = scraper.scrape_post(url)
        
        if 'error' in result:
            print(f"❌ Error: {result['error']}")
            return
        
        # Print results
        print("\n" + "="*50)
        print("REDDIT POST DATA (API)")
        print("="*50)
        
        print(f"Post ID: {result.get('post_id', 'N/A')}")
        
        author_username = result.get('author', {}).get('username', '')
        if author_username:
            print(f"Author: u/{author_username}")
        else:
            print("Author: Not found")
        
        subreddit = result.get('subreddit', '')
        if subreddit:
            print(f"Subreddit: {subreddit}")
        else:
            print("Subreddit: Not found")
        
        title = result.get('title', '')
        if title:
            print(f"Title: {title[:100]}{'...' if len(title) > 100 else ''}")
        else:
            print("Title: Not found")
        
        text = result.get('text', '')
        if text:
            print(f"Text: {text[:100]}{'...' if len(text) > 100 else ''}")
        else:
            print("Text: Not found")
        
        upvotes = result.get('engagement', {}).get('upvotes', 0)
        comments = result.get('engagement', {}).get('comments', 0)
        awards = result.get('engagement', {}).get('awards', 0)
        print(f"Upvotes: {upvotes:,}")
        print(f"Comments: {comments:,}")
        print(f"Awards: {awards:,}")
        
        media_type = result.get('media', {}).get('type', 'Unknown')
        media_urls = result.get('media', {}).get('urls', [])
        print(f"Media Type: {media_type}")
        print(f"Media URLs: {len(media_urls)} file(s)")
        
        flair = result.get('flair', '')
        if flair:
            print(f"Flair: {flair}")
        else:
            print("Flair: None")
        
        timestamp = result.get('timestamp', '')
        print(f"Timestamp: {timestamp or 'Not found'}")
        
        # Save to JSON file
        output_file = f"reddit_api_post_{result['post_id']}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"\nData saved to: {output_file}")
    
    except Exception as e:
        print(f"Unexpected error: {e}")


if __name__ == "__main__":
    main()
