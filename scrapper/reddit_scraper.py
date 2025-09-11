#!/usr/bin/env python3
"""
Reddit Post Scraper using Selenium
Scrapes Reddit post data including images, text, upvotes, comments, and awards.
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


class RedditScraper:
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
        chrome_options.add_argument('--disable-web-security')
        chrome_options.add_argument('--allow-running-insecure-content')
        chrome_options.add_argument('--disable-extensions')
        chrome_options.add_argument('--disable-plugins')
        chrome_options.add_argument('--disable-images')  # Speed up loading
        chrome_options.add_argument('--disable-background-timer-throttling')
        chrome_options.add_argument('--disable-renderer-backgrounding')
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        try:
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            # Set page load timeout
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
    
    def scrape_post(self, url: str, max_retries: int = 3) -> Dict:
        """Main function to scrape Reddit post data with retry mechanism"""
        print(f"Scraping Reddit post: {url}")
        
        # Extract post ID
        post_id = self.extract_post_id(url)
        if not post_id:
            return {"error": "Invalid Reddit URL format"}
        
        print(f"Post ID: {post_id}")
        
        for attempt in range(max_retries):
            try:
                print(f"Attempt {attempt + 1}/{max_retries}")
                
                # Navigate to the post
                self.driver.get(url)
                time.sleep(5)  # Initial wait for page to start loading
                
                # Wait for the main content to load with multiple fallback selectors
                content_loaded = False
                selectors_to_try = [
                    '[data-testid="post-content"]',
                    '[data-testid="post-container"]',
                    'article[data-testid="post"]',
                    'div[data-testid="post-content"]',
                    'div[data-testid="post-container"]',
                    'article',
                    'div[data-testid="post"]'
                ]
                
                for selector in selectors_to_try:
                    try:
                        print(f"Trying selector: {selector}")
                        WebDriverWait(self.driver, 25).until(
                            EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                        )
                        print(f"Successfully found content with selector: {selector}")
                        content_loaded = True
                        break
                    except TimeoutException:
                        print(f"Timeout with selector: {selector}")
                        continue
                
                if not content_loaded:
                    # Try one more time with a longer timeout and any element containing "post"
                    try:
                        WebDriverWait(self.driver, 35).until(
                            EC.presence_of_element_located((By.XPATH, "//*[contains(@data-testid, 'post') or contains(@class, 'post')]"))
                        )
                        print("Found content with fallback XPath")
                        content_loaded = True
                    except TimeoutException:
                        print(f"Final timeout on attempt {attempt + 1}")
                        if attempt < max_retries - 1:
                            print("Retrying...")
                            time.sleep(5)
                            continue
                        else:
                            return {"error": "Timeout waiting for Reddit content - page may be slow or structure changed"}
                
                # Additional wait for dynamic content
                time.sleep(5)
                
                # Scroll to ensure content is loaded
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(3)
                
                # Extract data
                result = self._extract_post_data(post_id, url)
                
                # Check if we got meaningful data
                if result.get('title') or result.get('author', {}).get('username'):
                    print(f"Successfully scraped data on attempt {attempt + 1}")
                    return result
                else:
                    print(f"No meaningful data found on attempt {attempt + 1}")
                    if attempt < max_retries - 1:
                        print("Retrying...")
                        time.sleep(5)
                        continue
                    else:
                        return {"error": "No meaningful data found after all attempts"}
                
            except Exception as e:
                print(f"Error on attempt {attempt + 1}: {str(e)}")
                if attempt < max_retries - 1:
                    print("Retrying...")
                    time.sleep(5)
                    continue
                else:
                    return {"error": f"Failed to scrape post after {max_retries} attempts: {str(e)}"}
        
        return {"error": "Unexpected error in retry loop"}
    
    def _extract_post_data(self, post_id: str, url: str) -> Dict:
        """Extract post data from the loaded page"""
        print("Extracting post data...")
        
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
                        print(f"Found title: {result['title'][:50]}...")
                        break
                except NoSuchElementException:
                    continue
            
            if not result['title']:
                print("Title not found")
            
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
                        print(f"Found author: {author_name}")
                        break
                except NoSuchElementException:
                    continue
            
            if not result['author']['username']:
                print("Author not found")
            
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
                        print(f"Found subreddit: {result['subreddit']}")
                        break
                except NoSuchElementException:
                    continue
            
            if not result['subreddit']:
                print("Subreddit not found")
            
            # Extract post text
            try:
                text_element = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="post-content"] div[data-testid="post-content"] div, [data-testid="post-container"] div[data-testid="post-content"] div')
                result['text'] = text_element.text
                result['hashtags'] = self._extract_hashtags(result['text'])
                result['mentions'] = self._extract_mentions(result['text'])
                print(f"Found text: {result['text'][:50]}...")
            except NoSuchElementException:
                print("Post text not found")
            
            # Extract engagement metrics
            self._extract_engagement_metrics(result)
            
            # Extract media
            self._extract_media(result)
            
            # Extract timestamp
            try:
                time_element = self.driver.find_element(By.CSS_SELECTOR, 'time[datetime], [data-testid="post-content"] time')
                result['timestamp'] = time_element.get_attribute('datetime') or time_element.text
                print(f"Found timestamp: {result['timestamp']}")
            except NoSuchElementException:
                print("Timestamp not found")
            
            # Extract flair
            try:
                flair_element = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="post-content"] span[data-testid="post-flair"], [data-testid="post-container"] span[data-testid="post-flair"]')
                result['flair'] = flair_element.text
                print(f"Found flair: {result['flair']}")
            except NoSuchElementException:
                print("Flair not found")
            
            print(f"Extraction complete. Found: {len(result['media']['urls'])} media, {result['engagement']['upvotes']} upvotes, {result['engagement']['comments']} comments")
            
        except Exception as e:
            print(f"Error during extraction: {e}")
        
        return result
    
    def _extract_engagement_metrics(self, result: Dict):
        """Extract upvotes, downvotes, comments, awards, etc."""
        try:
            # Look for upvote count
            upvote_selectors = [
                '[data-testid="post-content"] button[aria-label*="upvote"] span',
                '[data-testid="post-container"] button[aria-label*="upvote"] span',
                'button[aria-label*="upvote"] span'
            ]
            
            for selector in upvote_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in elements:
                        text = element.text
                        if text and ('upvote' in text.lower() or text.replace(',', '').replace('.', '').isdigit()):
                            count = self._extract_number_from_text(text)
                            if count is not None and count > 0:
                                result['engagement']['upvotes'] = count
                                print(f"Found upvotes: {count}")
                                break
                    if result['engagement']['upvotes'] > 0:
                        break
                except NoSuchElementException:
                    continue
            
            # Look for comment count
            comment_selectors = [
                '[data-testid="post-content"] button[aria-label*="comment"] span',
                '[data-testid="post-container"] button[aria-label*="comment"] span',
                'button[aria-label*="comment"] span'
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
            
            # Look for awards
            award_selectors = [
                '[data-testid="post-content"] button[aria-label*="award"] span',
                '[data-testid="post-container"] button[aria-label*="award"] span',
                'button[aria-label*="award"] span'
            ]
            
            for selector in award_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in elements:
                        text = element.text
                        if text and ('award' in text.lower() or text.replace(',', '').replace('.', '').isdigit()):
                            count = self._extract_number_from_text(text)
                            if count is not None and count > 0:
                                result['engagement']['awards'] = count
                                print(f"Found awards: {count}")
                                break
                    if result['engagement']['awards'] > 0:
                        break
                except NoSuchElementException:
                    continue
        
        except Exception as e:
            print(f"Error extracting engagement metrics: {e}")
    
    def _extract_number_from_text(self, text: str) -> Optional[int]:
        """Extract number from text like '1,234 upvotes' or '5.2K upvotes'"""
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
            image_elements = self.driver.find_elements(By.CSS_SELECTOR, '[data-testid="post-content"] img, [data-testid="post-container"] img, [data-testid="post-media"] img')
            
            for element in image_elements:
                src = element.get_attribute('src')
                if src and ('reddit' in src or 'i.redd.it' in src or 'preview.redd.it' in src):
                    result['media']['urls'].append(src)
                    result['media']['type'] = 'GraphImage'
                    print(f"Found image: {src[:50]}...")
            
            # Look for videos
            video_elements = self.driver.find_elements(By.CSS_SELECTOR, '[data-testid="post-content"] video, [data-testid="post-container"] video, [data-testid="post-media"] video')
            
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
                    if src and ('reddit' in src or 'i.redd.it' in src or 'preview.redd.it' in src) and 'profile' not in src.lower():
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
                
                filename = f"reddit_{post_info['post_id']}_{i+1}{ext}"
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
    print("Reddit Post Scraper with Selenium")
    print("=" * 40)
    
    # Get URL from user input
    url = input("Enter Reddit post URL: ").strip()
    
    if not url:
        print("No URL provided. Exiting.")
        return
    
    # Ask if user wants to download media
    download_media = input("Download media files? (y/n): ").lower().strip() == 'y'
    
    scraper = RedditScraper()
    
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
        output_file = f"reddit_post_{result['post_id']}.json"
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
