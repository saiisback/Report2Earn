#!/usr/bin/env python3
"""
Facebook Post Scraper using Selenium
Scrapes Facebook post data including images, text, likes, comments, and shares.
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


class FacebookScraper:
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
    
    def extract_post_id(self, url: str) -> Optional[str]:
        """Extract post ID from Facebook URL"""
        patterns = [
            r'facebook\.com/.*?/posts/(\d+)',
            r'facebook\.com/.*?/activity/(\d+)',
            r'facebook\.com/.*?/photos/.*?/(\d+)',
            r'facebook\.com/.*?/videos/.*?/(\d+)',
            r'facebook\.com/.*?/permalink/(\d+)',
            r'facebook\.com/.*?/story\.php\?story_fbid=(\d+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
    
    def scrape_post(self, url: str) -> Dict:
        """Main function to scrape Facebook post data"""
        print(f"Scraping Facebook post: {url}")
        
        # Extract post ID
        post_id = self.extract_post_id(url)
        if not post_id:
            return {"error": "Invalid Facebook URL format"}
        
        print(f"Post ID: {post_id}")
        
        try:
            # Navigate to the post
            self.driver.get(url)
            time.sleep(5)  # Wait for page to load
            
            # Wait for the main content to load
            try:
                WebDriverWait(self.driver, 15).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="post_message"], [role="article"]'))
                )
            except TimeoutException:
                print("Timeout waiting for Facebook content")
                return {"error": "Timeout waiting for Facebook content"}
            
            # Scroll to ensure content is loaded
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            
            # Extract data
            result = self._extract_post_data(post_id, url)
            return result
            
        except Exception as e:
            return {"error": f"Failed to scrape post: {str(e)}"}
    
    def _extract_post_data(self, post_id: str, url: str) -> Dict:
        """Extract post data from the loaded page"""
        print("Extracting post data...")
        
        result = {
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
            # Extract author information
            try:
                author_element = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="post_chevron_button"] h3 a, [role="article"] h3 a, strong a')
                author_url = author_element.get_attribute('href')
                author_name = author_element.text
                result['author']['full_name'] = author_name
                print(f"Found author: {author_name}")
            except NoSuchElementException:
                print("Author not found")
            
            # Extract post text
            try:
                text_element = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="post_message"] div, [role="article"] div[data-ad-preview="message"]')
                result['caption'] = text_element.text
                result['hashtags'] = self._extract_hashtags(result['caption'])
                result['mentions'] = self._extract_mentions(result['caption'])
                print(f"Found text: {result['caption'][:50]}...")
            except NoSuchElementException:
                print("Post text not found")
            
            # Extract engagement metrics
            self._extract_engagement_metrics(result)
            
            # Extract media
            self._extract_media(result)
            
            # Extract timestamp
            try:
                time_element = self.driver.find_element(By.CSS_SELECTOR, 'abbr[data-utime], a[role="link"] abbr')
                result['timestamp'] = time_element.get_attribute('data-utime') or time_element.get_attribute('title')
                print(f"Found timestamp: {result['timestamp']}")
            except NoSuchElementException:
                print("Timestamp not found")
            
            print(f"Extraction complete. Found: {len(result['media']['urls'])} media, {result['engagement']['likes']} likes, {result['engagement']['comments']} comments")
            
        except Exception as e:
            print(f"Error during extraction: {e}")
        
        return result
    
    def _extract_engagement_metrics(self, result: Dict):
        """Extract likes, comments, shares, etc."""
        try:
            # Look for like count
            like_selectors = [
                '[data-testid="UFI2ReactionsCount/root"] span',
                '[aria-label*="reaction"] span',
                'span[aria-label*="like"]'
            ]
            
            for selector in like_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in elements:
                        text = element.text
                        if text and ('like' in text.lower() or 'reaction' in text.lower() or text.replace(',', '').replace('.', '').isdigit()):
                            count = self._extract_number_from_text(text)
                            if count is not None and count > 0:
                                result['engagement']['likes'] = count
                                print(f"Found likes: {count}")
                                break
                    if result['engagement']['likes'] > 0:
                        break
                except NoSuchElementException:
                    continue
            
            # Look for comment count
            comment_selectors = [
                '[data-testid="UFI2CommentsCount/root"] span',
                'span[aria-label*="comment"]'
            ]
            
            for selector in comment_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in elements:
                        text = element.text
                        if text and ('comment' in text.lower() or text.replace(',', '').replace('.', '').isdigit()):
                            count = self._extract_number_from_text(text)
                            if count is not None and count > 0:
                                result['engagement']['comments'] = count
                                print(f"Found comments: {count}")
                                break
                    if result['engagement']['comments'] > 0:
                        break
                except NoSuchElementException:
                    continue
            
            # Look for share count
            share_selectors = [
                '[data-testid="UFI2SharesCount/root"] span',
                'span[aria-label*="share"]'
            ]
            
            for selector in share_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in elements:
                        text = element.text
                        if text and ('share' in text.lower() or text.replace(',', '').replace('.', '').isdigit()):
                            count = self._extract_number_from_text(text)
                            if count is not None and count > 0:
                                result['engagement']['shares'] = count
                                print(f"Found shares: {count}")
                                break
                    if result['engagement']['shares'] > 0:
                        break
                except NoSuchElementException:
                    continue
        
        except Exception as e:
            print(f"Error extracting engagement metrics: {e}")
    
    def _extract_number_from_text(self, text: str) -> Optional[int]:
        """Extract number from text like '1,234 likes' or '5.2K likes'"""
        if not text:
            return None
        
        # Remove non-numeric characters except for K, M, B
        clean_text = re.sub(r'[^\d.,KMB]', '', text)
        
        # Handle K, M, B suffixes
        if 'K' in clean_text:
            number = float(re.sub(r'[^\d.,]', '', clean_text))
            return int(number * 1000)
        elif 'M' in clean_text:
            number = float(re.sub(r'[^\d.,]', '', clean_text))
            return int(number * 1000000)
        elif 'B' in clean_text:
            number = float(re.sub(r'[^\d.,]', '', clean_text))
            return int(number * 1000000000)
        else:
            # Regular number
            number = re.sub(r'[^\d]', '', clean_text)
            return int(number) if number else None
    
    def _extract_media(self, result: Dict):
        """Extract media URLs from the post"""
        try:
            # Look for images
            image_elements = self.driver.find_elements(By.CSS_SELECTOR, '[data-testid="post_message"] img, [role="article"] img, [data-testid="photo"] img')
            
            for element in image_elements:
                src = element.get_attribute('src')
                if src and ('scontent' in src or 'fbcdn' in src or 'facebook' in src):
                    result['media']['urls'].append(src)
                    result['media']['type'] = 'GraphImage'
                    print(f"Found image: {src[:50]}...")
            
            # Look for videos
            video_elements = self.driver.find_elements(By.CSS_SELECTOR, '[data-testid="post_message"] video, [role="article"] video, [data-testid="video"] video')
            
            for element in video_elements:
                src = element.get_attribute('src')
                if src and ('video' in src or 'mp4' in src):
                    result['media']['urls'].append(src)
                    result['media']['type'] = 'GraphVideo'
                    print(f"Found video: {src[:50]}...")
            
            # If no specific media found, try to get any media URLs from the page
            if not result['media']['urls']:
                all_images = self.driver.find_elements(By.TAG_NAME, 'img')
                for img in all_images:
                    src = img.get_attribute('src')
                    if src and ('scontent' in src or 'fbcdn' in src or 'facebook' in src) and 'profile' not in src.lower():
                        result['media']['urls'].append(src)
                        result['media']['type'] = 'GraphImage'
                        print(f"Found image (fallback): {src[:50]}...")
                        break
        
        except Exception as e:
            print(f"Error extracting media: {e}")
    
    def _extract_hashtags(self, text: str) -> List[str]:
        """Extract hashtags from text"""
        hashtag_pattern = r'#\w+'
        return re.findall(hashtag_pattern, text)
    
    def _extract_mentions(self, text: str) -> List[str]:
        """Extract mentions from text"""
        mention_pattern = r'@\w+'
        return re.findall(mention_pattern, text)
    
    def download_media(self, post_info: Dict, download_dir: str = "downloads") -> List[str]:
        """Download media files from the post"""
        if not os.path.exists(download_dir):
            os.makedirs(download_dir)
        
        downloaded_files = []
        media_urls = post_info.get('media', {}).get('urls', [])
        
        for i, url in enumerate(media_urls):
            if not url:
                continue
                
            try:
                response = requests.get(url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                })
                response.raise_for_status()
                
                # Determine file extension
                if post_info.get('media', {}).get('is_video', False):
                    ext = '.mp4'
                else:
                    ext = '.jpg'
                
                filename = f"facebook_{post_info['post_id']}_{i+1}{ext}"
                filepath = os.path.join(download_dir, filename)
                
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                
                downloaded_files.append(filepath)
                print(f"Downloaded: {filename}")
                
                # Rate limiting
                time.sleep(1)
                
            except Exception as e:
                print(f"Failed to download media {i+1}: {e}")
        
        return downloaded_files
    
    def close(self):
        """Close the browser driver"""
        if self.driver:
            self.driver.quit()


def main():
    print("Facebook Post Scraper with Selenium")
    print("=" * 40)
    
    # Get URL from user input
    url = input("Enter Facebook post URL: ").strip()
    
    if not url:
        print("No URL provided. Exiting.")
        return
    
    # Ask if user wants to download media
    download_media = input("Download media files? (y/n): ").lower().strip() == 'y'
    
    scraper = FacebookScraper()
    
    try:
        print(f"\nScraping: {url}")
        print("Please wait...")
        
        # Scrape the post
        result = scraper.scrape_post(url)
        
        if 'error' in result:
            print(f"Error: {result['error']}")
            return
        
        # Print results
        print("\n" + "="*50)
        print("FACEBOOK POST DATA")
        print("="*50)
        
        print(f"Post ID: {result.get('post_id', 'N/A')}")
        
        author_username = result.get('author', {}).get('username', '')
        author_fullname = result.get('author', {}).get('full_name', '')
        if author_fullname:
            print(f"Author: {author_fullname}" + (f" (@{author_username})" if author_username else ""))
        else:
            print("Author: Not found")
        
        caption = result.get('caption', '')
        if caption:
            print(f"Text: {caption[:100]}{'...' if len(caption) > 100 else ''}")
        else:
            print("Text: Not found")
        
        likes = result.get('engagement', {}).get('likes', 0)
        comments = result.get('engagement', {}).get('comments', 0)
        shares = result.get('engagement', {}).get('shares', 0)
        print(f"Likes: {likes:,}")
        print(f"Comments: {comments:,}")
        print(f"Shares: {shares:,}")
        
        media_type = result.get('media', {}).get('type', 'Unknown')
        media_urls = result.get('media', {}).get('urls', [])
        print(f"Media Type: {media_type}")
        print(f"Media URLs: {len(media_urls)} file(s)")
        
        hashtags = result.get('hashtags', [])
        if hashtags:
            print(f"Hashtags: {', '.join(hashtags)}")
        else:
            print("Hashtags: None found")
        
        mentions = result.get('mentions', [])
        if mentions:
            print(f"Mentions: {', '.join(mentions)}")
        else:
            print("Mentions: None found")
        
        timestamp = result.get('timestamp', '')
        print(f"Timestamp: {timestamp or 'Not found'}")
        
        # Save to JSON file
        output_file = f"facebook_post_{result['post_id']}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"\nData saved to: {output_file}")
        
        # Download media if requested
        if download_media:
            print(f"\nDownloading media...")
            downloaded_files = scraper.download_media(result, 'downloads')
            print(f"Downloaded {len(downloaded_files)} file(s)")
            for file in downloaded_files:
                print(f"  - {file}")
    
    finally:
        # Always close the browser
        scraper.close()


if __name__ == "__main__":
    main()
