#!/usr/bin/env python3
"""
Reddit Post Scraper V2 - Enhanced with multiple fallback methods
Uses requests + BeautifulSoup as primary method with Selenium fallback
"""

import requests
import json
import re
import os
import time
import random
from urllib.parse import urlparse, parse_qs
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import TimeoutException, NoSuchElementException


class RedditScraperV2:
    def __init__(self):
        self.session = requests.Session()
        self.driver = None
        self.setup_session()
        
    def setup_session(self):
        """Setup requests session with proper headers"""
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
    
    def setup_driver(self):
        """Setup Chrome driver with stealth options"""
        if self.driver:
            return
            
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_argument('--disable-web-security')
        chrome_options.add_argument('--allow-running-insecure-content')
        chrome_options.add_argument('--disable-extensions')
        chrome_options.add_argument('--disable-plugins')
        chrome_options.add_argument('--disable-background-timer-throttling')
        chrome_options.add_argument('--disable-renderer-backgrounding')
        chrome_options.add_argument('--disable-features=VizDisplayCompositor')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        # Additional stealth options
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        
        try:
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            self.driver.set_page_load_timeout(60)
            print("Chrome driver initialized successfully")
        except Exception as e:
            print(f"Failed to initialize Chrome driver: {e}")
            raise
    
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
        """Main function to scrape Reddit post with multiple fallback methods"""
        print(f"Scraping Reddit post: {url}")
        
        # Extract post ID
        post_id = self.extract_post_id(url)
        if not post_id:
            return {"error": "Invalid Reddit URL format"}
        
        print(f"Post ID: {post_id}")
        
        # Try method 1: Direct requests + BeautifulSoup
        result = self._scrape_with_requests(url, post_id)
        if result and not result.get('error'):
            print("✅ Successfully scraped with requests method")
            return result
        
        print("⚠️ Requests method failed, trying Selenium...")
        
        # Try method 2: Selenium with enhanced stealth
        result = self._scrape_with_selenium(url, post_id)
        if result and not result.get('error'):
            print("✅ Successfully scraped with Selenium method")
            return result
        
        print("❌ All methods failed")
        return {"error": "All scraping methods failed"}
    
    def _scrape_with_requests(self, url: str, post_id: str) -> Dict:
        """Scrape using requests + BeautifulSoup"""
        try:
            # Add random delay to avoid rate limiting
            time.sleep(random.uniform(1, 3))
            
            # Try to get the page
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            result = {
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
            
            # Extract title
            title_selectors = [
                'h1[data-testid="post-title"]',
                'h1[slot="title"]',
                'h1',
                '[data-testid="post-content"] h1',
                'article h1'
            ]
            
            for selector in title_selectors:
                title_elem = soup.select_one(selector)
                if title_elem and title_elem.get_text(strip=True):
                    result['title'] = title_elem.get_text(strip=True)
                    break
            
            # Extract author
            author_selectors = [
                'a[href*="/user/"]',
                'a[href*="/u/"]',
                '[data-testid="post-content"] a[href*="/user/"]'
            ]
            
            for selector in author_selectors:
                author_elem = soup.select_one(selector)
                if author_elem:
                    author_text = author_elem.get_text(strip=True)
                    if author_text and not author_text.startswith('u/'):
                        result['author']['username'] = author_text
                        break
            
            # Extract subreddit
            subreddit_selectors = [
                'a[href*="/r/"]',
                '[data-testid="subreddit-name"]'
            ]
            
            for selector in subreddit_selectors:
                subreddit_elem = soup.select_one(selector)
                if subreddit_elem:
                    subreddit_text = subreddit_elem.get_text(strip=True)
                    if subreddit_text and 'r/' in subreddit_text:
                        result['subreddit'] = subreddit_text
                        break
            
            # Extract text content
            text_selectors = [
                '[data-testid="post-content"] div',
                'div[data-testid="post-content"]',
                'article div'
            ]
            
            for selector in text_selectors:
                text_elem = soup.select_one(selector)
                if text_elem:
                    text_content = text_elem.get_text(strip=True)
                    if text_content and len(text_content) > 10:  # Ensure meaningful content
                        result['text'] = text_content
                        result['hashtags'] = self._extract_hashtags(text_content)
                        result['mentions'] = self._extract_mentions(text_content)
                        break
            
            # Extract media
            self._extract_media_requests(soup, result)
            
            # Check if we got meaningful data
            if result['title'] or result['author']['username'] or result['text']:
                return result
            else:
                return {"error": "No meaningful data found with requests method"}
                
        except Exception as e:
            print(f"Requests method failed: {e}")
            return {"error": f"Requests method failed: {str(e)}"}
    
    def _scrape_with_selenium(self, url: str, post_id: str) -> Dict:
        """Scrape using Selenium with enhanced stealth"""
        try:
            self.setup_driver()
            
            # Navigate to the post
            self.driver.get(url)
            time.sleep(random.uniform(3, 6))
            
            # Wait for content with multiple strategies
            content_found = False
            
            # Strategy 1: Wait for specific elements
            selectors_to_try = [
                '[data-testid="post-content"]',
                '[data-testid="post-container"]',
                'article[data-testid="post"]',
                'article',
                'div[data-testid="post"]'
            ]
            
            for selector in selectors_to_try:
                try:
                    WebDriverWait(self.driver, 15).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                    )
                    print(f"Found content with selector: {selector}")
                    content_found = True
                    break
                except TimeoutException:
                    continue
            
            # Strategy 2: Wait for any content
            if not content_found:
                try:
                    WebDriverWait(self.driver, 20).until(
                        EC.presence_of_element_located((By.TAG_NAME, "body"))
                    )
                    # Check if page has loaded
                    if self.driver.find_elements(By.TAG_NAME, "h1") or self.driver.find_elements(By.TAG_NAME, "article"):
                        content_found = True
                        print("Found content with fallback method")
                except TimeoutException:
                    pass
            
            if not content_found:
                return {"error": "No content found with Selenium"}
            
            # Additional wait for dynamic content
            time.sleep(3)
            
            # Scroll to load more content
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            
            # Extract data
            result = self._extract_post_data_selenium(post_id, url)
            return result
            
        except Exception as e:
            print(f"Selenium method failed: {e}")
            return {"error": f"Selenium method failed: {str(e)}"}
    
    def _extract_post_data_selenium(self, post_id: str, url: str) -> Dict:
        """Extract post data using Selenium"""
        result = {
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
            # Extract title with multiple selectors
            title_selectors = [
                'h1[data-testid="post-title"]',
                'h1[slot="title"]',
                'h1',
                '[data-testid="post-content"] h1',
                'article h1'
            ]
            
            for selector in title_selectors:
                try:
                    title_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    if title_element.text.strip():
                        result['title'] = title_element.text.strip()
                        break
                except NoSuchElementException:
                    continue
            
            # Extract author
            author_selectors = [
                'a[href*="/user/"]',
                'a[href*="/u/"]',
                '[data-testid="post-content"] a[href*="/user/"]'
            ]
            
            for selector in author_selectors:
                try:
                    author_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    author_text = author_element.text.strip()
                    if author_text and not author_text.startswith('u/'):
                        result['author']['username'] = author_text
                        break
                except NoSuchElementException:
                    continue
            
            # Extract subreddit
            subreddit_selectors = [
                'a[href*="/r/"]',
                '[data-testid="subreddit-name"]'
            ]
            
            for selector in subreddit_selectors:
                try:
                    subreddit_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    subreddit_text = subreddit_element.text.strip()
                    if subreddit_text and 'r/' in subreddit_text:
                        result['subreddit'] = subreddit_text
                        break
                except NoSuchElementException:
                    continue
            
            # Extract text
            text_selectors = [
                '[data-testid="post-content"] div',
                'div[data-testid="post-content"]',
                'article div'
            ]
            
            for selector in text_selectors:
                try:
                    text_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                    text_content = text_element.text.strip()
                    if text_content and len(text_content) > 10:
                        result['text'] = text_content
                        result['hashtags'] = self._extract_hashtags(text_content)
                        result['mentions'] = self._extract_mentions(text_content)
                        break
                except NoSuchElementException:
                    continue
            
            # Extract media
            self._extract_media_selenium(result)
            
            # Extract engagement metrics
            self._extract_engagement_selenium(result)
            
        except Exception as e:
            print(f"Error extracting data with Selenium: {e}")
        
        return result
    
    def _extract_media_requests(self, soup: BeautifulSoup, result: Dict):
        """Extract media from BeautifulSoup object"""
        try:
            # Look for images
            images = soup.find_all('img')
            for img in images:
                src = img.get('src', '')
                if src and ('reddit' in src or 'i.redd.it' in src or 'preview.redd.it' in src):
                    if 'profile' not in src.lower() and 'avatar' not in src.lower():
                        result['media']['urls'].append(src)
                        result['media']['type'] = 'GraphImage'
            
            # Look for videos
            videos = soup.find_all('video')
            for video in videos:
                src = video.get('src', '')
                if src and ('video' in src or 'mp4' in src):
                    result['media']['urls'].append(src)
                    result['media']['type'] = 'GraphVideo'
        
        except Exception as e:
            print(f"Error extracting media: {e}")
    
    def _extract_media_selenium(self, result: Dict):
        """Extract media using Selenium"""
        try:
            # Look for images
            image_elements = self.driver.find_elements(By.TAG_NAME, 'img')
            for element in image_elements:
                src = element.get_attribute('src')
                if src and ('reddit' in src or 'i.redd.it' in src or 'preview.redd.it' in src):
                    if 'profile' not in src.lower() and 'avatar' not in src.lower():
                        result['media']['urls'].append(src)
                        result['media']['type'] = 'GraphImage'
            
            # Look for videos
            video_elements = self.driver.find_elements(By.TAG_NAME, 'video')
            for element in video_elements:
                src = element.get_attribute('src')
                if src and ('video' in src or 'mp4' in src):
                    result['media']['urls'].append(src)
                    result['media']['type'] = 'GraphVideo'
        
        except Exception as e:
            print(f"Error extracting media: {e}")
    
    def _extract_engagement_selenium(self, result: Dict):
        """Extract engagement metrics using Selenium"""
        try:
            # Look for upvote count
            upvote_selectors = [
                'button[aria-label*="upvote"] span',
                '[data-testid="post-content"] button[aria-label*="upvote"] span'
            ]
            
            for selector in upvote_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in elements:
                        text = element.text
                        if text and text.replace(',', '').replace('.', '').isdigit():
                            count = int(text.replace(',', '').replace('.', ''))
                            if count > 0:
                                result['engagement']['upvotes'] = count
                                break
                    if result['engagement']['upvotes'] > 0:
                        break
                except NoSuchElementException:
                    continue
            
            # Look for comment count
            comment_selectors = [
                'button[aria-label*="comment"] span',
                '[data-testid="post-content"] button[aria-label*="comment"] span'
            ]
            
            for selector in comment_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in elements:
                        text = element.text
                        if text and text.replace(',', '').replace('.', '').isdigit():
                            count = int(text.replace(',', '').replace('.', ''))
                            if count > 0:
                                result['engagement']['comments'] = count
                                break
                    if result['engagement']['comments'] > 0:
                        break
                except NoSuchElementException:
                    continue
        
        except Exception as e:
            print(f"Error extracting engagement: {e}")
    
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
            self.driver = None


def main():
    print("Reddit Post Scraper V2 - Enhanced with Multiple Methods")
    print("=" * 60)
    
    # Get URL from user input
    url = input("Enter Reddit post URL: ").strip()
    
    if not url:
        print("No URL provided. Exiting.")
        return
    
    scraper = RedditScraperV2()
    
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
        print("REDDIT POST DATA")
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
        print(f"Upvotes: {upvotes:,}")
        print(f"Comments: {comments:,}")
        
        media_type = result.get('media', {}).get('type', 'Unknown')
        media_urls = result.get('media', {}).get('urls', [])
        print(f"Media Type: {media_type}")
        print(f"Media URLs: {len(media_urls)} file(s)")
        
        # Save to JSON file
        output_file = f"reddit_post_{result['post_id']}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"\nData saved to: {output_file}")
    
    finally:
        # Always close the browser
        scraper.close()


if __name__ == "__main__":
    main()
