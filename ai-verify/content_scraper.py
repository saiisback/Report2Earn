#!/usr/bin/env python3
"""
Content Scraper for various social media platforms
Integrated from the main scrapper for use with AI verification system
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

class ContentScraper:
    def __init__(self):
        self.driver = None
        self.setup_driver()
        
    def is_instagram_url(self, url: str) -> bool:
        try:
            parsed = urlparse(url)
            host = (parsed.netloc or '').lower()
            path = parsed.path or ''
            if 'instagram.com' in host or 'instagr.am' in host:
                return path.startswith('/p/') or path.startswith('/reel/') or path.startswith('/tv/')
            return False
        except Exception:
            return False

    def is_reddit_url(self, url: str) -> bool:
        try:
            parsed = urlparse(url)
            host = (parsed.netloc or '').lower()
            path = parsed.path or ''
            return ('reddit.com' in host) and ('/comments/' in path or '/r/' in path)
        except Exception:
            return False

    def is_twitter_url(self, url: str) -> bool:
        try:
            parsed = urlparse(url)
            host = (parsed.netloc or '').lower()
            return 'twitter.com' in host or 'x.com' in host
        except Exception:
            return False

    def is_youtube_url(self, url: str) -> bool:
        try:
            parsed = urlparse(url)
            host = (parsed.netloc or '').lower()
            return 'youtube.com' in host or 'youtu.be' in host
        except Exception:
            return False

    def setup_driver(self):
        """Setup Chrome driver with appropriate options"""
        try:
            chrome_options = Options()
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")
            chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
            
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            print("Chrome driver initialized successfully")
        except Exception as e:
            print(f"Failed to initialize Chrome driver: {e}")
            self.driver = None

    def extract_post_id(self, url: str) -> Optional[str]:
        """Extract post ID from X/Twitter URL"""
        try:
            # Handle both twitter.com and x.com URLs
            if 'twitter.com' in url or 'x.com' in url:
                # Extract post ID from URL like https://x.com/username/status/1234567890
                match = re.search(r'/(?:status|posts)/(\d+)', url)
                if match:
                    return match.group(1)
            return None
        except Exception:
            return None

    def scrape_content(self, url: str) -> Dict:
        """Main function to scrape content from any supported platform"""
        try:
            if self.is_instagram_url(url):
                return self._scrape_instagram_post(url)
            elif self.is_reddit_url(url):
                return self._scrape_reddit_post(url)
            elif self.is_twitter_url(url):
                return self._scrape_twitter_post(url)
            elif self.is_youtube_url(url):
                return self._scrape_youtube_post(url)
            else:
                return self._scrape_generic_content(url)
        except Exception as e:
            return {"error": f"Failed to scrape content: {str(e)}"}

    def _scrape_twitter_post(self, url: str) -> Dict:
        """Scrape Twitter/X post"""
        print(f"Scraping Twitter post: {url}")
        
        post_id = self.extract_post_id(url)
        if not post_id:
            return {"error": "Invalid Twitter URL format"}
        
        try:
            self.driver.get(url)
            time.sleep(3)
            
            # Wait for content to load
            try:
                WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="tweet"]'))
                )
            except TimeoutException:
                return {"error": "Timeout waiting for tweet content"}
            
            # Extract data
            result = self._extract_twitter_data(post_id, url)
            return result
            
        except Exception as e:
            return {"error": f"Failed to scrape Twitter post: {str(e)}"}

    def _extract_twitter_data(self, post_id: str, url: str) -> Dict:
        """Extract Twitter post data"""
        result = {
            'platform': 'twitter',
            'post_id': post_id,
            'url': url,
            'content_text': '',
            'content_images': [],
            'author': {'username': '', 'full_name': ''},
            'engagement': {'likes': 0, 'comments': 0, 'shares': 0},
            'timestamp': '',
            'hashtags': [],
            'mentions': []
        }
        
        try:
            # Extract author information
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
            
            # Extract full name
            try:
                full_name_element = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="User-Name"] span')
                result['author']['full_name'] = full_name_element.text
            except NoSuchElementException:
                pass
            
            # Extract tweet text
            try:
                text_element = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="tweetText"]')
                result['content_text'] = text_element.text
                result['hashtags'] = self._extract_hashtags(result['content_text'])
                result['mentions'] = self._extract_mentions(result['content_text'])
            except NoSuchElementException:
                pass
            
            # Extract images
            try:
                image_elements = self.driver.find_elements(By.CSS_SELECTOR, '[data-testid="tweetPhoto"] img')
                for img in image_elements:
                    img_url = img.get_attribute('src')
                    if img_url and 'media' in img_url:
                        result['content_images'].append(img_url)
            except NoSuchElementException:
                pass
            
            # Extract engagement metrics
            try:
                # Likes
                like_elements = self.driver.find_elements(By.CSS_SELECTOR, '[data-testid="like"]')
                if like_elements:
                    like_text = like_elements[0].get_attribute('aria-label')
                    if like_text:
                        like_count = re.search(r'(\d+)', like_text)
                        if like_count:
                            result['engagement']['likes'] = int(like_count.group(1))
            except NoSuchElementException:
                pass
            
            # Extract timestamp
            try:
                time_element = self.driver.find_element(By.CSS_SELECTOR, 'time')
                result['timestamp'] = time_element.get_attribute('datetime')
            except NoSuchElementException:
                pass
                
        except Exception as e:
            print(f"Error extracting Twitter data: {e}")
        
        return result

    def _scrape_instagram_post(self, url: str) -> Dict:
        """Scrape Instagram post"""
        print(f"Scraping Instagram post: {url}")
        
        try:
            self.driver.get(url)
            time.sleep(5)
            
            result = {
                'platform': 'instagram',
                'url': url,
                'content_text': '',
                'content_images': [],
                'author': {'username': ''},
                'engagement': {'likes': 0, 'comments': 0},
                'timestamp': ''
            }
            
            # Extract caption
            try:
                caption_element = self.driver.find_element(By.CSS_SELECTOR, 'h1')
                result['content_text'] = caption_element.text
            except NoSuchElementException:
                pass
            
            # Extract images
            try:
                img_elements = self.driver.find_elements(By.CSS_SELECTOR, 'img')
                for img in img_elements:
                    src = img.get_attribute('src')
                    if src and 'instagram' in src:
                        result['content_images'].append(src)
            except NoSuchElementException:
                pass
            
            return result
            
        except Exception as e:
            return {"error": f"Failed to scrape Instagram post: {str(e)}"}

    def _scrape_reddit_post(self, url: str) -> Dict:
        """Scrape Reddit post"""
        print(f"Scraping Reddit post: {url}")
        
        try:
            self.driver.get(url)
            time.sleep(3)
            
            result = {
                'platform': 'reddit',
                'url': url,
                'content_text': '',
                'content_images': [],
                'author': {'username': ''},
                'engagement': {'upvotes': 0, 'comments': 0},
                'subreddit': ''
            }
            
            # Extract title and text
            try:
                title_element = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="post-content"] h1')
                result['content_text'] = title_element.text
            except NoSuchElementException:
                pass
            
            # Extract subreddit
            try:
                subreddit_element = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="subreddit-name"]')
                result['subreddit'] = subreddit_element.text
            except NoSuchElementException:
                pass
            
            return result
            
        except Exception as e:
            return {"error": f"Failed to scrape Reddit post: {str(e)}"}

    def _scrape_youtube_post(self, url: str) -> Dict:
        """Scrape YouTube video"""
        print(f"Scraping YouTube video: {url}")
        
        try:
            self.driver.get(url)
            time.sleep(3)
            
            result = {
                'platform': 'youtube',
                'url': url,
                'content_text': '',
                'content_images': [],
                'author': {'username': ''},
                'engagement': {'views': 0, 'likes': 0, 'comments': 0},
                'title': '',
                'description': ''
            }
            
            # Extract title
            try:
                title_element = self.driver.find_element(By.CSS_SELECTOR, 'h1.title')
                result['title'] = title_element.text
                result['content_text'] = title_element.text
            except NoSuchElementException:
                pass
            
            # Extract description
            try:
                desc_element = self.driver.find_element(By.CSS_SELECTOR, '#description-text')
                result['description'] = desc_element.text
                if not result['content_text']:
                    result['content_text'] = desc_element.text
            except NoSuchElementException:
                pass
            
            return result
            
        except Exception as e:
            return {"error": f"Failed to scrape YouTube video: {str(e)}"}

    def _scrape_generic_content(self, url: str) -> Dict:
        """Scrape generic web content"""
        print(f"Scraping generic content: {url}")
        
        try:
            self.driver.get(url)
            time.sleep(3)
            
            result = {
                'platform': 'generic',
                'url': url,
                'content_text': '',
                'content_images': [],
                'title': '',
                'description': ''
            }
            
            # Extract title
            try:
                title_element = self.driver.find_element(By.TAG_NAME, 'title')
                result['title'] = title_element.text
                result['content_text'] = title_element.text
            except NoSuchElementException:
                pass
            
            # Extract meta description
            try:
                desc_element = self.driver.find_element(By.CSS_SELECTOR, 'meta[name="description"]')
                result['description'] = desc_element.get_attribute('content')
                if not result['content_text']:
                    result['content_text'] = desc_element.get_attribute('content')
            except NoSuchElementException:
                pass
            
            # Extract images
            try:
                img_elements = self.driver.find_elements(By.TAG_NAME, 'img')
                for img in img_elements[:5]:  # Limit to first 5 images
                    src = img.get_attribute('src')
                    if src and src.startswith('http'):
                        result['content_images'].append(src)
            except NoSuchElementException:
                pass
            
            return result
            
        except Exception as e:
            return {"error": f"Failed to scrape generic content: {str(e)}"}

    def _extract_hashtags(self, text: str) -> List[str]:
        """Extract hashtags from text"""
        return re.findall(r'#\w+', text)

    def _extract_mentions(self, text: str) -> List[str]:
        """Extract mentions from text"""
        return re.findall(r'@\w+', text)

    def close(self):
        """Close the driver"""
        if self.driver:
            self.driver.quit()
