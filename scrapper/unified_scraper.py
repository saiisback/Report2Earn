#!/usr/bin/env python3
"""
Unified Social Media Scraper using Selenium
Scrapes posts from X (Twitter), Instagram, Facebook, and Reddit.
"""

import requests
import json
import re
import os
import time
from urllib.parse import urlparse, parse_qs
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import TimeoutException, NoSuchElementException


class UnifiedScraper:
    def __init__(self):
        self.driver = None
        self.setup_driver()
        
    def setup_driver(self):
        """Setup Chrome driver with appropriate options"""
        chrome_options = Options()
        chrome_options.add_argument('--headless')  # Run in background
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        try:
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            print("Chrome driver initialized successfully")
        except Exception as e:
            print(f"Failed to initialize Chrome driver: {e}")
            raise
    
    def detect_platform(self, url: str) -> str:
        """Detect which social media platform the URL belongs to"""
        if 'x.com' in url or 'twitter.com' in url:
            return 'x'
        elif 'instagram.com' in url:
            return 'instagram'
        elif 'facebook.com' in url or 'fb.com' in url:
            return 'facebook'
        elif 'reddit.com' in url:
            return 'reddit'
        else:
            return 'unknown'
    
    def extract_post_id(self, url: str, platform: str) -> Optional[str]:
        """Extract post ID from URL based on platform"""
        if platform == 'x':
            patterns = [
                r'x\.com/\w+/status/(\d+)',
                r'twitter\.com/\w+/status/(\d+)',
                r'twitter\.com/i/web/status/(\d+)',
                r'x\.com/i/web/status/(\d+)'
            ]
        elif platform == 'instagram':
            patterns = [
                r'instagram\.com/p/([^/?]+)',
                r'instagram\.com/reel/([^/?]+)',
                r'instagram\.com/tv/([^/?]+)',
            ]
        elif platform == 'facebook':
            patterns = [
                r'facebook\.com/.*?/posts/(\d+)',
                r'facebook\.com/.*?/activity/(\d+)',
                r'facebook\.com/.*?/photos/.*?/(\d+)',
                r'facebook\.com/.*?/videos/.*?/(\d+)',
                r'facebook\.com/.*?/permalink/(\d+)',
                r'facebook\.com/.*?/story\.php\?story_fbid=(\d+)',
            ]
        elif platform == 'reddit':
            patterns = [
                r'reddit\.com/r/\w+/comments/([^/]+)',
                r'reddit\.com/r/\w+/comments/[^/]+/[^/]+/([^/]+)',
                r'reddit\.com/comments/([^/]+)',
            ]
        else:
            return None
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
    
    def scrape_post(self, url: str) -> Dict:
        """Main function to scrape social media post data"""
        platform = self.detect_platform(url)
        print(f"Detected platform: {platform.upper()}")
        
        if platform == 'unknown':
            return {"error": "Unsupported platform"}
        
        # Extract post ID
        post_id = self.extract_post_id(url, platform)
        if not post_id:
            return {"error": f"Invalid {platform} URL format"}
        
        print(f"Post ID: {post_id}")
        
        try:
            # Navigate to the post
            self.driver.get(url)
            time.sleep(5)  # Wait for page to load
            
            # Wait for content based on platform
            self._wait_for_content(platform)
            
            # Scroll to ensure content is loaded
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            
            # Extract data based on platform
            result = self._extract_post_data(post_id, url, platform)
            return result
            
        except Exception as e:
            return {"error": f"Failed to scrape post: {str(e)}"}
    
    def _wait_for_content(self, platform: str):
        """Wait for content to load based on platform with improved Reddit handling"""
        selectors = {
            'x': '[data-testid="tweet"]',
            'instagram': 'article, [role="main"]',
            'facebook': '[data-testid="post_message"], [role="article"]',
            'reddit': '[data-testid="post-content"], [data-testid="post-container"], article, div[data-testid="post"]'
        }
        
        selector = selectors.get(platform)
        if selector:
            try:
                # Use longer timeout for Reddit
                timeout = 30 if platform == 'reddit' else 15
                WebDriverWait(self.driver, timeout).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                )
            except TimeoutException:
                # For Reddit, try additional fallback selectors
                if platform == 'reddit':
                    fallback_selectors = [
                        'article[data-testid="post"]',
                        'div[data-testid="post-content"]',
                        'div[data-testid="post-container"]',
                        'article',
                        'div[data-testid="post"]'
                    ]
                    for fallback_selector in fallback_selectors:
                        try:
                            WebDriverWait(self.driver, 20).until(
                                EC.presence_of_element_located((By.CSS_SELECTOR, fallback_selector))
                            )
                            print(f"Found Reddit content with fallback selector: {fallback_selector}")
                            return
                        except TimeoutException:
                            continue
                print(f"Timeout waiting for {platform} content")
                raise
    
    def _extract_post_data(self, post_id: str, url: str, platform: str) -> Dict:
        """Extract post data based on platform"""
        print(f"Extracting {platform} post data...")
        
        if platform == 'x':
            return self._extract_x_data(post_id, url)
        elif platform == 'instagram':
            return self._extract_instagram_data(post_id, url)
        elif platform == 'facebook':
            return self._extract_facebook_data(post_id, url)
        elif platform == 'reddit':
            return self._extract_reddit_data_enhanced(post_id, url)
        else:
            return {"error": "Unsupported platform"}
    
    def _extract_x_data(self, post_id: str, url: str) -> Dict:
        """Extract X (Twitter) post data"""
        result = {
            'platform': 'x',
            'post_id': post_id,
            'url': url,
            'caption': '',
            'author': {'username': '', 'full_name': ''},
            'media': {'urls': [], 'type': 'Unknown'},
            'engagement': {'likes': 0, 'comments': 0, 'shares': 0, 'saves': 0},
            'comments': [],
            'timestamp': 0,
            'location': '',
            'hashtags': [],
            'mentions': []
        }
        
        try:
            # Extract author
            try:
                author_element = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="User-Name"]')
                author_links = author_element.find_elements(By.TAG_NAME, 'a')
                if author_links:
                    author_url = author_links[0].get_attribute('href')
                    username_match = re.search(r'/([^/]+)$', author_url)
                    if username_match:
                        result['author']['username'] = username_match.group(1)
            except NoSuchElementException:
                pass
            
            # Extract text
            try:
                text_element = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="tweetText"]')
                result['caption'] = text_element.text
                result['hashtags'] = self._extract_hashtags(result['caption'])
                result['mentions'] = self._extract_mentions(result['caption'])
            except NoSuchElementException:
                pass
            
            # Extract engagement
            self._extract_x_engagement(result)
            
            # Extract media
            self._extract_x_media(result)
            
        except Exception as e:
            print(f"Error extracting X data: {e}")
        
        return result
    
    def _extract_instagram_data(self, post_id: str, url: str) -> Dict:
        """Extract Instagram post data"""
        result = {
            'platform': 'instagram',
            'post_id': post_id,
            'url': url,
            'caption': '',
            'author': {'username': '', 'full_name': ''},
            'media': {'urls': [], 'type': 'Unknown'},
            'engagement': {'likes': 0, 'comments': 0, 'shares': 0, 'saves': 0},
            'comments': [],
            'timestamp': 0,
            'location': '',
            'hashtags': [],
            'mentions': []
        }
        
        try:
            # Extract author
            try:
                author_element = self.driver.find_element(By.CSS_SELECTOR, 'header a, [data-testid="user-name"] a')
                author_url = author_element.get_attribute('href')
                username_match = re.search(r'/([^/]+)/?$', author_url)
                if username_match:
                    result['author']['username'] = username_match.group(1)
            except NoSuchElementException:
                pass
            
            # Extract caption
            try:
                caption_element = self.driver.find_element(By.CSS_SELECTOR, 'article div[data-testid="post-caption"], article span')
                result['caption'] = caption_element.text
                result['hashtags'] = self._extract_hashtags(result['caption'])
                result['mentions'] = self._extract_mentions(result['caption'])
            except NoSuchElementException:
                pass
            
            # Extract engagement
            self._extract_instagram_engagement(result)
            
            # Extract media
            self._extract_instagram_media(result)
            
        except Exception as e:
            print(f"Error extracting Instagram data: {e}")
        
        return result
    
    def _extract_facebook_data(self, post_id: str, url: str) -> Dict:
        """Extract Facebook post data"""
        result = {
            'platform': 'facebook',
            'post_id': post_id,
            'url': url,
            'caption': '',
            'author': {'username': '', 'full_name': ''},
            'media': {'urls': [], 'type': 'Unknown'},
            'engagement': {'likes': 0, 'comments': 0, 'shares': 0, 'saves': 0},
            'comments': [],
            'timestamp': 0,
            'location': '',
            'hashtags': [],
            'mentions': []
        }
        
        try:
            # Extract author
            try:
                author_element = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="post_chevron_button"] h3 a, [role="article"] h3 a, strong a')
                result['author']['full_name'] = author_element.text
            except NoSuchElementException:
                pass
            
            # Extract text
            try:
                text_element = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="post_message"] div, [role="article"] div[data-ad-preview="message"]')
                result['caption'] = text_element.text
                result['hashtags'] = self._extract_hashtags(result['caption'])
                result['mentions'] = self._extract_mentions(result['caption'])
            except NoSuchElementException:
                pass
            
            # Extract engagement
            self._extract_facebook_engagement(result)
            
            # Extract media
            self._extract_facebook_media(result)
            
        except Exception as e:
            print(f"Error extracting Facebook data: {e}")
        
        return result
    
    def _extract_reddit_data(self, post_id: str, url: str) -> Dict:
        """Extract Reddit post data"""
        result = {
            'platform': 'reddit',
            'post_id': post_id,
            'url': url,
            'title': '',
            'text': '',
            'author': {'username': '', 'full_name': ''},
            'subreddit': '',
            'media': {'urls': [], 'type': 'Unknown'},
            'engagement': {'upvotes': 0, 'downvotes': 0, 'comments': 0, 'awards': 0},
            'comments': [],
            'timestamp': 0,
            'flair': '',
            'hashtags': [],
            'mentions': []
        }
        
        try:
            # Extract title with multiple fallback selectors
            title_selectors = [
                '[data-testid="post-content"] h1',
                '[data-testid="post-container"] h1', 
                'h1[data-testid="post-title"]',
                'article h1',
                'h1',
                '[data-testid="post"] h1',
                'div[data-testid="post-content"] h1'
            ]
            
            for selector in title_selectors:
                try:
                    title_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    if title_element.text.strip():
                        result['title'] = title_element.text.strip()
                        break
                except NoSuchElementException:
                    continue
            
            # Extract author information with multiple fallback selectors
            author_selectors = [
                '[data-testid="post-content"] a[href*="/user/"]',
                '[data-testid="post-container"] a[href*="/user/"]',
                'a[href*="/user/"]',
                'a[href*="/u/"]',
                '[data-testid="post"] a[href*="/user/"]',
                'article a[href*="/user/"]'
            ]
            
            for selector in author_selectors:
                try:
                    author_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    author_url = author_element.get_attribute('href')
                    author_name = author_element.text.strip()
                    if author_name and author_url:
                        result['author']['username'] = author_name
                        break
                except NoSuchElementException:
                    continue
            
            # Extract subreddit with multiple fallback selectors
            subreddit_selectors = [
                '[data-testid="subreddit-name"]',
                'a[href*="/r/"]',
                '[data-testid="post"] a[href*="/r/"]',
                'article a[href*="/r/"]',
                'a[href*="/r/"]'
            ]
            
            for selector in subreddit_selectors:
                try:
                    subreddit_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    subreddit_text = subreddit_element.text.strip()
                    if subreddit_text and (subreddit_text.startswith('r/') or '/r/' in subreddit_element.get_attribute('href', '')):
                        result['subreddit'] = subreddit_text if subreddit_text.startswith('r/') else f"r/{subreddit_text}"
                        break
                except NoSuchElementException:
                    continue
            
            # Extract post text with multiple fallback selectors
            text_selectors = [
                '[data-testid="post-content"] div[data-testid="post-content"] div',
                '[data-testid="post-container"] div[data-testid="post-content"] div',
                '[data-testid="post-content"] div',
                '[data-testid="post-container"] div',
                'article div',
                'div[data-testid="post-content"] div'
            ]
            
            for selector in text_selectors:
                try:
                    text_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    if text_element.text.strip():
                        result['text'] = text_element.text.strip()
                        result['hashtags'] = self._extract_hashtags(result['text'])
                        result['mentions'] = self._extract_mentions(result['text'])
                        break
                except NoSuchElementException:
                    continue
            
            # Extract engagement
            self._extract_reddit_engagement(result)
            
            # Extract media
            self._extract_reddit_media(result)
            
            # Extract timestamp
            try:
                time_element = self.driver.find_element(By.CSS_SELECTOR, 'time[datetime], [data-testid="post-content"] time')
                result['timestamp'] = time_element.get_attribute('datetime') or time_element.text
            except NoSuchElementException:
                pass
            
            # Extract flair
            try:
                flair_element = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="post-content"] span[data-testid="post-flair"], [data-testid="post-container"] span[data-testid="post-flair"]')
                result['flair'] = flair_element.text
            except NoSuchElementException:
                pass
            
        except Exception as e:
            print(f"Error extracting Reddit data: {e}")
        
        return result
    
    def _extract_reddit_data_enhanced(self, post_id: str, url: str) -> Dict:
        """Enhanced Reddit data extraction with multiple fallback methods"""
        print("Using enhanced Reddit extraction...")
        
        # Try Reddit JSON API first (most reliable)
        try:
            api_url = url.rstrip('/') + '.json'
            response = self.session.get(api_url, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            if data and len(data) >= 1:
                post_data = data[0]['data']['children'][0]['data']
                
                result = {
                    'platform': 'reddit',
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
                
                # Extract media from API
                self._extract_reddit_media_api(post_data, result)
                
                # Convert timestamp
                if result['timestamp']:
                    from datetime import datetime
                    result['timestamp'] = datetime.fromtimestamp(result['timestamp']).isoformat()
                
                print("✅ Successfully extracted with Reddit API")
                return result
                
        except Exception as e:
            print(f"Reddit API failed: {e}")
        
        # Fallback to original method
        return self._extract_reddit_data(post_id, url)
    
    def _extract_reddit_media_api(self, post_data: Dict, result: Dict):
        """Extract media from Reddit API data"""
        try:
            # Check for images
            if 'preview' in post_data and 'images' in post_data['preview']:
                for image in post_data['preview']['images']:
                    if 'source' in image:
                        url = image['source']['url']
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
            
            # Check for external links
            if 'url_overridden_by_dest' in post_data:
                url = post_data['url_overridden_by_dest']
                if any(ext in url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                    result['media']['urls'].append(url)
                    result['media']['type'] = 'GraphImage'
                elif any(ext in url.lower() for ext in ['.mp4', '.webm', '.mov']):
                    result['media']['urls'].append(url)
                    result['media']['type'] = 'GraphVideo'
        
        except Exception as e:
            print(f"Error extracting media from API: {e}")
    
    def _extract_x_engagement(self, result: Dict):
        """Extract X engagement metrics"""
        # Implementation for X engagement extraction
        pass
    
    def _extract_instagram_engagement(self, result: Dict):
        """Extract Instagram engagement metrics"""
        # Implementation for Instagram engagement extraction
        pass
    
    def _extract_facebook_engagement(self, result: Dict):
        """Extract Facebook engagement metrics"""
        # Implementation for Facebook engagement extraction
        pass
    
    def _extract_reddit_engagement(self, result: Dict):
        """Extract Reddit engagement metrics"""
        # Implementation for Reddit engagement extraction
        pass
    
    def _extract_x_media(self, result: Dict):
        """Extract X media"""
        # Implementation for X media extraction
        pass
    
    def _extract_instagram_media(self, result: Dict):
        """Extract Instagram media"""
        # Implementation for Instagram media extraction
        pass
    
    def _extract_facebook_media(self, result: Dict):
        """Extract Facebook media"""
        # Implementation for Facebook media extraction
        pass
    
    def _extract_reddit_media(self, result: Dict):
        """Extract Reddit media"""
        # Implementation for Reddit media extraction
        pass
    
    def _extract_hashtags(self, text: str) -> List[str]:
        """Extract hashtags from text"""
        hashtag_pattern = r'#\w+'
        return re.findall(hashtag_pattern, text)
    
    def _extract_mentions(self, text: str) -> List[str]:
        """Extract mentions from text"""
        mention_pattern = r'@\w+'
        return re.findall(mention_pattern, text)
    
    def close(self):
        """Close the browser driver"""
        if self.driver:
            self.driver.quit()


def main():
    print("Unified Social Media Scraper")
    print("=" * 40)
    print("Supports: X (Twitter), Instagram, Facebook, Reddit")
    print("=" * 40)
    
    # Get URL from user input
    url = input("Enter social media post URL: ").strip()
    
    if not url:
        print("No URL provided. Exiting.")
        return
    
    # Ask if user wants to download media
    download_media = input("Download media files? (y/n): ").lower().strip() == 'y'
    
    scraper = UnifiedScraper()
    
    try:
        print(f"\nScraping: {url}")
        print("Please wait...")
        
        # Scrape the post
        result = scraper.scrape_post(url)
        
        if 'error' in result:
            print(f"Error: {result['error']}")
            return
        
        # Print results
        platform = result.get('platform', 'unknown').upper()
        print(f"\n{'='*50}")
        print(f"{platform} POST DATA")
        print(f"{'='*50}")
        
        print(f"Platform: {platform}")
        print(f"Post ID: {result.get('post_id', 'N/A')}")
        
        # Platform-specific display
        if platform == 'X':
            author_username = result.get('author', {}).get('username', '')
            if author_username:
                print(f"Author: @{author_username}")
            else:
                print("Author: Not found")
            
            caption = result.get('caption', '')
            if caption:
                print(f"Text: {caption[:100]}{'...' if len(caption) > 100 else ''}")
            else:
                print("Text: Not found")
        
        elif platform == 'INSTAGRAM':
            author_username = result.get('author', {}).get('username', '')
            if author_username:
                print(f"Author: @{author_username}")
            else:
                print("Author: Not found")
            
            caption = result.get('caption', '')
            if caption:
                print(f"Caption: {caption[:100]}{'...' if len(caption) > 100 else ''}")
            else:
                print("Caption: Not found")
        
        elif platform == 'FACEBOOK':
            author_fullname = result.get('author', {}).get('full_name', '')
            if author_fullname:
                print(f"Author: {author_fullname}")
            else:
                print("Author: Not found")
            
            caption = result.get('caption', '')
            if caption:
                print(f"Text: {caption[:100]}{'...' if len(caption) > 100 else ''}")
            else:
                print("Text: Not found")
        
        elif platform == 'REDDIT':
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
        
        # Save to JSON file
        output_file = f"{platform.lower()}_post_{result['post_id']}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"\nData saved to: {output_file}")
        
    finally:
        # Always close the browser
        scraper.close()


if __name__ == "__main__":
    main()
