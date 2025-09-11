#!/usr/bin/env python3
"""
X (Twitter) Post Scraper using Selenium
Scrapes X post data including images, text, likes, comments, and shares.
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


class XScraper:
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
        """Extract post ID from X URL"""
        patterns = [
            r'x\.com/\w+/status/(\d+)',
            r'twitter\.com/\w+/status/(\d+)',
            r'twitter\.com/i/web/status/(\d+)',
            r'x\.com/i/web/status/(\d+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None
    
    def scrape_post(self, url: str) -> Dict:
        """Main function to scrape post data from X or Instagram based on URL"""
        if self.is_instagram_url(url):
            return self._scrape_instagram_post(url)
        if self.is_reddit_url(url):
            return self._scrape_reddit_post(url)
        
        print(f"Scraping X post: {url}")
        
        # Extract post ID
        post_id = self.extract_post_id(url)
        if not post_id:
            return {"error": "Invalid X URL format"}
        
        print(f"Post ID: {post_id}")
        
        try:
            # Navigate to the post
            self.driver.get(url)
            time.sleep(3)  # Wait for page to load
            
            # Wait for the main content to load
            try:
                WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="tweet"]'))
                )
            except TimeoutException:
                print("Timeout waiting for tweet content")
                return {"error": "Timeout waiting for tweet content"}
            
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
                author_element = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="User-Name"]')
                author_links = author_element.find_elements(By.TAG_NAME, 'a')
                if author_links:
                    author_url = author_links[0].get_attribute('href')
                    username_match = re.search(r'/([^/]+)$', author_url)
                    if username_match:
                        result['author']['username'] = username_match.group(1)
                        print(f"Found username: {result['author']['username']}")
            except NoSuchElementException:
                print("Author username not found")
            
            # Extract full name
            try:
                full_name_element = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="User-Name"] span')
                result['author']['full_name'] = full_name_element.text
                print(f"Found full name: {result['author']['full_name']}")
            except NoSuchElementException:
                print("Author full name not found")
            
            # Extract tweet text
            try:
                text_element = self.driver.find_element(By.CSS_SELECTOR, '[data-testid="tweetText"]')
                result['caption'] = text_element.text
                result['hashtags'] = self._extract_hashtags(result['caption'])
                result['mentions'] = self._extract_mentions(result['caption'])
                print(f"Found text: {result['caption'][:50]}...")
            except NoSuchElementException:
                print("Tweet text not found")
            
            # Extract engagement metrics
            self._extract_engagement_metrics(result)
            
            # Extract media
            self._extract_media(result)
            
            # Extract timestamp
            try:
                time_element = self.driver.find_element(By.CSS_SELECTOR, 'time')
                result['timestamp'] = time_element.get_attribute('datetime')
                print(f"Found timestamp: {result['timestamp']}")
            except NoSuchElementException:
                print("Timestamp not found")
            
            print(f"Extraction complete. Found: {len(result['media']['urls'])} media, {result['engagement']['likes']} likes, {result['engagement']['comments']} replies, {result['engagement']['shares']} retweets")
            
        except Exception as e:
            print(f"Error during extraction: {e}")
        
        return result
    
    def _extract_engagement_metrics(self, result: Dict):
        """Extract likes, replies, retweets, etc."""
        try:
            # Find all engagement buttons
            engagement_elements = self.driver.find_elements(
                By.CSS_SELECTOR,
                '[data-testid*="reply"], [data-testid*="retweet"], [data-testid*="repost"], [data-testid*="like"], [data-testid*="bookmark"]'
            )
            
            for element in engagement_elements:
                try:
                    # Get the parent container to find the count
                    parent = element.find_element(By.XPATH, '..')
                    count_element = parent.find_element(
                        By.CSS_SELECTOR,
                        '[data-testid*="reply"], [data-testid*="retweet"], [data-testid*="repost"], [data-testid*="like"], [data-testid*="bookmark"]'
                    )
                    
                    # Get the text content which should contain the count
                    text = count_element.get_attribute('aria-label') or count_element.text
                    
                    if 'reply' in text.lower() or 'replies' in text.lower():
                        count = self._extract_number_from_text(text)
                        if count is not None:
                            result['engagement']['comments'] = count
                            print(f"Found replies: {count}")
                    
                    elif (
                        'retweet' in text.lower() or 'retweets' in text.lower() or
                        'repost' in text.lower() or 'reposts' in text.lower()
                    ):
                        count = self._extract_number_from_text(text)
                        if count is not None:
                            result['engagement']['shares'] = count
                            print(f"Found retweets/reposts: {count}")
                    
                    elif 'like' in text.lower() or 'likes' in text.lower():
                        count = self._extract_number_from_text(text)
                        if count is not None:
                            result['engagement']['likes'] = count
                            print(f"Found likes: {count}")
                    
                    elif 'bookmark' in text.lower() or 'bookmarks' in text.lower():
                        count = self._extract_number_from_text(text)
                        if count is not None:
                            result['engagement']['saves'] = count
                            print(f"Found bookmarks: {count}")
                
                except NoSuchElementException:
                    continue
        
        except Exception as e:
            print(f"Error extracting engagement metrics: {e}")
        
        # Additional retweet extraction if not found above
        if result['engagement']['shares'] == 0:
            self._extract_retweets_specific(result)
    
    def _extract_retweets_specific(self, result: Dict):
        """Specific method to extract retweets with better selectors"""
        try:
            # Try different selectors for retweets/reposts
            retweet_selectors = [
                '[data-testid="retweet"]',
                '[data-testid="repost"]',
                '[aria-label*="retweet"]',
                '[aria-label*="repost"]',
                'button[aria-label*="retweet"]',
                'button[aria-label*="repost"]',
                '[data-testid="retweet"] span',
                '[data-testid="repost"] span',
                'div[data-testid="retweet"] span',
                'div[data-testid="repost"] span'
            ]
            
            for selector in retweet_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in elements:
                        text = element.text.strip()
                        if not text:
                            text = element.get_attribute('aria-label') or ''
                        
                        if text and ('retweet' in text.lower() or 'repost' in text.lower()):
                            count = self._extract_number_from_text(text)
                            if count is not None and count > 0:
                                result['engagement']['shares'] = count
                                print(f"Found retweets (specific): {count}")
                                return
                except NoSuchElementException:
                    continue
        except Exception as e:
            print(f"Error in specific retweet extraction: {e}")
    
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
            image_elements = self.driver.find_elements(By.CSS_SELECTOR, '[data-testid="tweetPhoto"] img, [data-testid="tweetPhoto"] source')
            
            for element in image_elements:
                src = element.get_attribute('src')
                if src and ('pbs.twimg.com' in src or 'abs.twimg.com' in src):
                    result['media']['urls'].append(src)
                    result['media']['type'] = 'GraphImage'
                    print(f"Found image: {src[:50]}...")
            
            # Look for videos
            video_elements = self.driver.find_elements(By.CSS_SELECTOR, 'video source, video')
            
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
                    if src and ('pbs.twimg.com' in src or 'abs.twimg.com' in src) and 'profile' not in src.lower():
                        result['media']['urls'].append(src)
                        result['media']['type'] = 'GraphImage'
                        print(f"Found image (fallback): {src[:50]}...")
                        break
        
        except Exception as e:
            print(f"Error extracting media: {e}")

    def _scrape_reddit_post(self, url: str) -> Dict:
        """Scrape Reddit post data using meta tags and DOM, plus user karma via about.json."""
        print(f"Scraping Reddit post: {url}")
        result = {
            'post_id': '',
            'url': url,
            'caption': '',
            'author': {'username': '', 'full_name': '', 'karma': None},
            'media': {'urls': [], 'type': 'Unknown'},
            'engagement': {'likes': 0, 'comments': 0, 'shares': 0, 'saves': 0},
            'comments': [],
            'timestamp': 0,
            'location': '',
            'hashtags': [],
            'mentions': [],
            'reddit': {'upvotes': 0, 'downvotes': 0, 'awards': 0}
        }
        try:
            # Try robust JSON API first
            try:
                post_json = self._fetch_reddit_post_json(url)
            except Exception:
                post_json = None

            if post_json:
                try:
                    post = post_json[0]['data']['children'][0]['data']
                except Exception:
                    post = None
                if isinstance(post, dict):
                    # Caption/title
                    result['caption'] = post.get('title') or ''
                    # Author
                    result['author']['username'] = post.get('author') or ''
                    # IDs
                    result['post_id'] = post.get('id') or ''
                    # Timestamps
                    if post.get('created_utc'):
                        try:
                            result['timestamp'] = int(post['created_utc'])
                        except Exception:
                            pass
                    # Upvotes/Downvotes estimation
                    score = post.get('score')
                    upvote_ratio = post.get('upvote_ratio')
                    ups = post.get('ups')
                    downs = post.get('downs')
                    awards = post.get('total_awards_received')

                    # Upvotes
                    if isinstance(ups, int):
                        result['reddit']['upvotes'] = max(0, ups)
                        result['engagement']['likes'] = result['reddit']['upvotes']

                    # Awards: prefer total_awards_received, otherwise sum all_awardings and gildings
                    total_awards = 0
                    if isinstance(awards, int) and awards >= 0:
                        total_awards = awards
                    # Sum all_awardings counts
                    for a in post.get('all_awardings') or []:
                        try:
                            total_awards += int(a.get('count') or 0)
                        except Exception:
                            continue
                    # Sum gildings (gid_1/2/3)
                    gildings = post.get('gildings') or {}
                    if isinstance(gildings, dict):
                        for key in ['gid_1', 'gid_2', 'gid_3']:
                            try:
                                total_awards += int(gildings.get(key) or 0)
                            except Exception:
                                continue
                    result['reddit']['awards'] = max(0, total_awards)

                    # Comments
                    if isinstance(post.get('num_comments'), int):
                        result['engagement']['comments'] = max(0, int(post['num_comments']))

                    # Downvotes estimation
                    if isinstance(downs, int):
                        result['reddit']['downvotes'] = max(0, downs)
                    else:
                        # Try derive from score and ups
                        if isinstance(score, int) and isinstance(result['reddit']['upvotes'], int) and result['reddit']['upvotes']:
                            est_downs = result['reddit']['upvotes'] - score
                            if isinstance(est_downs, (int, float)):
                                result['reddit']['downvotes'] = max(0, int(round(est_downs)))
                        # If still zero, try from score and ratio
                        if (not result['reddit']['downvotes']) and isinstance(score, int) and isinstance(upvote_ratio, (int, float)):
                            r = float(upvote_ratio)
                            if abs(2*r - 1.0) > 1e-6:
                                total_votes = score / (2*r - 1.0)
                                if total_votes > 0:
                                    est_ups = r * total_votes
                                    est_downs = total_votes - est_ups
                                    result['reddit']['upvotes'] = max(result['reddit']['upvotes'], int(round(max(0, est_ups))))
                                    result['reddit']['downvotes'] = max(0, int(round(max(0, est_downs))))
                                    result['engagement']['likes'] = result['reddit']['upvotes']
                    # Comments
                    if isinstance(post.get('num_comments'), int):
                        result['engagement']['comments'] = max(0, int(post['num_comments']))
                    # Media
                    media_url = post.get('url_overridden_by_dest') or post.get('url') or ''
                    if media_url and any(media_url.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.gifv', '.mp4', '.webm']):
                        result['media']['urls'].append(media_url)
                        result['media']['type'] = 'GraphImage' if any(media_url.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif']) else 'GraphVideo'
                    elif post.get('preview') and post['preview'].get('images'):
                        try:
                            src = post['preview']['images'][0]['source']['url']
                            if src:
                                result['media']['urls'].append(src)
                                result['media']['type'] = 'GraphImage'
                        except Exception:
                            pass
                # Fetch user karma if author present
                if result['author']['username']:
                    karma = self._fetch_reddit_user_karma(result['author']['username'])
                    if karma is not None:
                        result['author']['karma'] = karma
                return result

            self.driver.get(url)
            time.sleep(3)
            # Wait for core content
            try:
                WebDriverWait(self.driver, 8).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, 'meta[property="og:title"], h1, shreddit-post'))
                )
            except TimeoutException:
                pass

            # Extract via meta tags
            try:
                meta_title_el = self.driver.find_element(By.CSS_SELECTOR, 'meta[property="og:title"]')
                result['caption'] = meta_title_el.get_attribute('content') or ''
            except NoSuchElementException:
                try:
                    h1 = self.driver.find_element(By.TAG_NAME, 'h1')
                    result['caption'] = h1.text
                except NoSuchElementException:
                    pass

            # Description may contain points and comments
            try:
                meta_desc_el = self.driver.find_element(By.CSS_SELECTOR, 'meta[property="og:description"]')
                meta_desc = meta_desc_el.get_attribute('content') or ''
                # e.g., "123 points and 45 comments so far on reddit"
                points_match = re.search(r'(\d+[.,\d]*\s*[KMB]?)\s+points', meta_desc, re.IGNORECASE)
                comments_match = re.search(r'(\d+[.,\d]*\s*[KMB]?)\s+comments?', meta_desc, re.IGNORECASE)
                if points_match:
                    result['reddit']['upvotes'] = self._extract_number_from_text(points_match.group(1)) or 0
                    result['engagement']['likes'] = result['reddit']['upvotes']
                if comments_match:
                    result['engagement']['comments'] = self._extract_number_from_text(comments_match.group(1)) or 0
            except NoSuchElementException:
                pass

            # Media image if available
            try:
                og_image_el = self.driver.find_element(By.CSS_SELECTOR, 'meta[property="og:image"]')
                og_image = og_image_el.get_attribute('content') or ''
                if og_image:
                    result['media']['urls'].append(og_image)
                    result['media']['type'] = 'GraphImage'
            except NoSuchElementException:
                pass

            # Awards count: scan for award elements
            try:
                award_candidates = self.driver.find_elements(By.CSS_SELECTOR, '[aria-label*="award" i], [title*="award" i], img[alt*="award" i], span:contains("Awards")')
            except Exception:
                award_candidates = []
            awards_total = 0
            for el in award_candidates:
                label = (el.get_attribute('aria-label') or el.get_attribute('title') or el.get_attribute('alt') or el.text or '').strip()
                if not label:
                    continue
                m = re.search(r'(\d+[.,\d]*\s*[KMB]?)', label)
                if m:
                    val = self._extract_number_from_text(m.group(1))
                    if val is not None:
                        awards_total = max(awards_total, val)
            result['reddit']['awards'] = awards_total

            # Author username
            try:
                author_link = self.driver.find_element(By.CSS_SELECTOR, 'a[href*="/user/"]')
                author_url = author_link.get_attribute('href') or ''
                m = re.search(r'/user/([^/]+)/?', author_url)
                if m:
                    result['author']['username'] = m.group(1)
            except NoSuchElementException:
                # Try meta author
                try:
                    meta_author = self.driver.find_element(By.CSS_SELECTOR, 'meta[name="author"]')
                    result['author']['username'] = meta_author.get_attribute('content') or ''
                except NoSuchElementException:
                    pass

            # Fetch user karma via public about.json if username present
            if result['author']['username']:
                karma = self._fetch_reddit_user_karma(result['author']['username'])
                if karma is not None:
                    result['author']['karma'] = karma

            # Reddit downvotes not public—remain 0; shares/saves N/A remain 0
            return result
        except Exception as e:
            return {"error": f"Failed to scrape Reddit post: {str(e)}"}

    def _fetch_reddit_user_karma(self, username: str) -> Optional[int]:
        """Fetch Reddit user total karma from about.json."""
        try:
            api_url = f"https://www.reddit.com/user/{username}/about.json"
            resp = requests.get(api_url, headers={
                'User-Agent': 'Mozilla/5.0 (compatible; Report2EarnBot/1.0)'
            }, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, dict):
                    user = data.get('data') or {}
                    karma = user.get('total_karma')
                    if isinstance(karma, int):
                        return karma
        except Exception:
            pass
        return None

    def _fetch_reddit_post_json(self, url: str):
        """Fetch Reddit post JSON by appending .json to the post URL."""
        try:
            headers = { 'User-Agent': 'Mozilla/5.0 (compatible; Report2EarnBot/1.0)' }
            parsed = urlparse(url)
            path = parsed.path
            # Try original URL + .json
            base = f"{parsed.scheme}://{parsed.netloc}{path}"
            json_urls = []
            if base.endswith('/'):
                json_urls.append(base + '.json')
            else:
                json_urls.append(base + '/.json')
            # Try removing trailing slash variant
            if base.endswith('/'):
                json_urls.append(base[:-1] + '.json')
            else:
                json_urls.append(base + '.json')
            # Try old.reddit host
            old_host = parsed.netloc.replace('www.reddit.com', 'old.reddit.com')
            json_urls.append(f"{parsed.scheme}://{old_host}{path}.json")

            for json_url in json_urls:
                try:
                    resp = requests.get(json_url, headers=headers, timeout=10)
                    if resp.status_code == 200:
                        return resp.json()
                except Exception:
                    continue
        except Exception:
            pass
        return None

    def _scrape_instagram_post(self, url: str) -> Dict:
        """Scrape Instagram post data using Open Graph meta tags (works for public posts)"""
        print(f"Scraping Instagram post: {url}")
        try:
            self.driver.get(url)
            time.sleep(3)
            
            # Sometimes IG lazy loads; try a small scroll
            self.driver.execute_script("window.scrollTo(0, 400);")
            time.sleep(1)
            
            # Prepare base result
            result = {
                'post_id': '',
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
            
            # Extract meta tags
            meta_desc_el = self.driver.find_element(By.CSS_SELECTOR, 'meta[property="og:description"]')
            meta_title_el = self.driver.find_element(By.CSS_SELECTOR, 'meta[property="og:title"]')
            og_image_el = self.driver.find_element(By.CSS_SELECTOR, 'meta[property="og:image"]')
            
            meta_desc = meta_desc_el.get_attribute('content') or ''
            meta_title = meta_title_el.get_attribute('content') or ''
            og_image = og_image_el.get_attribute('content') or ''
            
            # Likes and comments from description (e.g., "1,234 likes, 56 comments - ...")
            likes_match = re.search(r'(\d+[.,\d]*\s*[KMB]?)\s+likes', meta_desc, re.IGNORECASE)
            comments_match = re.search(r'(\d+[.,\d]*\s*[KMB]?)\s+comments?', meta_desc, re.IGNORECASE)
            if likes_match:
                likes_str = likes_match.group(1)
                result['engagement']['likes'] = self._extract_number_from_text(likes_str) or 0
                print(f"IG likes: {result['engagement']['likes']}")
            if comments_match:
                comments_str = comments_match.group(1)
                result['engagement']['comments'] = self._extract_number_from_text(comments_str) or 0
                print(f"IG comments: {result['engagement']['comments']}")
            
            # Try to extract shares count from structured data and visible buttons/labels if present
            self._extract_instagram_shares_from_ld_json(result)
            self._extract_instagram_shares(result)
            
            # Extract author details (username, full name)
            self._extract_instagram_author(result, meta_title)
            
            # Caption and username from title (e.g., "username on Instagram: \"Caption...\"")
            username_match = re.match(r'([^\s]+)\s+on\s+Instagram', meta_title)
            if username_match:
                result['author']['username'] = username_match.group(1)
                print(f"IG username: {result['author']['username']}")
            caption_match = re.search(r':\s+"([\s\S]*?)"', meta_title)
            if caption_match:
                result['caption'] = caption_match.group(1)
            
            # Fallback: sometimes caption is in og:description after the hyphen
            if not result['caption']:
                desc_caption = meta_desc.split(' - ')
                if len(desc_caption) > 1:
                    result['caption'] = desc_caption[-1].strip('"')
            
            # Hashtags and mentions from caption
            result['hashtags'] = self._extract_hashtags(result['caption'])
            result['mentions'] = self._extract_mentions(result['caption'])
            
            # Media: primary image from og:image
            if og_image:
                result['media']['urls'].append(og_image)
                result['media']['type'] = 'GraphImage'
                print(f"IG image: {og_image[:50]}...")
            
            # Post ID: extract from URL path
            try:
                parsed = urlparse(url)
                parts = [p for p in parsed.path.split('/') if p]
                if len(parts) >= 2:
                    result['post_id'] = parts[1]
            except Exception:
                pass
            
            return result
        except Exception as e:
            return {"error": f"Failed to scrape Instagram post: {str(e)}"}

    def _extract_instagram_shares_from_ld_json(self, result: Dict) -> None:
        """Parse application/ld+json for interactionStatistic ShareAction."""
        try:
            scripts = self.driver.find_elements(By.CSS_SELECTOR, 'script[type="application/ld+json"]')
            for script in scripts:
                raw = script.get_attribute('innerHTML') or script.get_attribute('text') or ''
                if not raw.strip():
                    continue
                try:
                    data = json.loads(raw)
                except Exception:
                    # Some pages include multiple JSON objects; try to extract a JSON object heuristically
                    candidates = re.findall(r'\{[\s\S]*\}', raw)
                    parsed_any = False
                    for c in candidates:
                        try:
                            data = json.loads(c)
                            parsed_any = True
                            break
                        except Exception:
                            continue
                    if not parsed_any:
                        continue
                
                # Normalize to list for easier iteration
                data_list = data if isinstance(data, list) else [data]
                for obj in data_list:
                    interaction_stats = obj.get('interactionStatistic') if isinstance(obj, dict) else None
                    if not interaction_stats:
                        continue
                    # Normalize to list
                    if isinstance(interaction_stats, dict):
                        interaction_stats = [interaction_stats]
                    for stat in interaction_stats:
                        if not isinstance(stat, dict):
                            continue
                        interaction_type = stat.get('interactionType')
                        user_count = stat.get('userInteractionCount')
                        # interactionType can be a dict with @type=ShareAction or a URL string
                        type_name = ''
                        if isinstance(interaction_type, dict):
                            type_name = interaction_type.get('@type', '')
                        elif isinstance(interaction_type, str):
                            type_name = interaction_type
                        if user_count is not None and (
                            'ShareAction' in type_name or 'share' in str(type_name).lower()
                        ):
                            try:
                                shares_val = int(user_count)
                            except Exception:
                                shares_val = None
                            if shares_val is not None and shares_val >= 0:
                                result['engagement']['shares'] = shares_val
                                print(f"IG shares (ld+json): {shares_val}")
                                return
        except Exception as e:
            print(f"Error parsing IG ld+json: {e}")

    def _extract_instagram_author(self, result: Dict, meta_title: str) -> None:
        """Extract Instagram author username and full name from ld+json or DOM."""
        try:
            # 1) Try ld+json author fields
            scripts = self.driver.find_elements(By.CSS_SELECTOR, 'script[type="application/ld+json"]')
            for script in scripts:
                raw = script.get_attribute('innerHTML') or script.get_attribute('text') or ''
                if not raw.strip():
                    continue
                candidates = [raw]
                if not raw.strip().startswith('{'):
                    candidates = re.findall(r'\{[\s\S]*?\}', raw)
                for c in candidates:
                    try:
                        data = json.loads(c)
                    except Exception:
                        continue
                    data_list = data if isinstance(data, list) else [data]
                    for obj in data_list:
                        if not isinstance(obj, dict):
                            continue
                        author_obj = obj.get('author') or obj.get('creator')
                        if isinstance(author_obj, dict):
                            name = author_obj.get('name') or ''
                            alt = author_obj.get('alternateName') or ''
                            if name and not result['author']['full_name']:
                                result['author']['full_name'] = name
                            # alternateName sometimes is like "@username"
                            if alt and not result['author']['username']:
                                result['author']['username'] = alt.lstrip('@')
                        # Some variants store author as a string
                        if isinstance(author_obj, str) and not result['author']['full_name']:
                            result['author']['full_name'] = author_obj
            
            # 2) Fallback from meta_title already parsed above for username
            if not result['author']['username']:
                uname_match = re.match(r'([^\s]+)\s+on\s+Instagram', meta_title)
                if uname_match:
                    result['author']['username'] = uname_match.group(1)
            
            # 3) DOM heuristics: header area contains username link and full name span
            if not result['author']['username'] or not result['author']['full_name']:
                try:
                    header = self.driver.find_element(By.CSS_SELECTOR, 'header')
                    # Username: clickable link text that looks like a handle (no spaces)
                    username_links = header.find_elements(By.CSS_SELECTOR, 'a[role="link"], a[href]')
                    for a in username_links:
                        text = (a.text or '').strip()
                        href = a.get_attribute('href') or ''
                        if text and ' ' not in text and '/p/' not in href and '/reel/' not in href and '/tv/' not in href:
                            # likely the profile username
                            if not result['author']['username']:
                                result['author']['username'] = text
                                break
                except Exception:
                    pass
                
                # Full name often appears near the header as a span next to username
                if not result['author']['full_name']:
                    try:
                        name_candidates = self.driver.find_elements(By.CSS_SELECTOR, 'header span, header h2, header div')
                        for el in name_candidates:
                            txt = (el.text or '').strip()
                            if txt and txt != result['author']['username'] and len(txt.split()) >= 2:
                                result['author']['full_name'] = txt
                                break
                    except Exception:
                        pass
        except Exception as e:
            print(f"Error extracting IG author: {e}")

    def _extract_instagram_shares(self, result: Dict) -> None:
        """Best-effort extraction of Instagram shares (send) count from the DOM."""
        try:
            # Look for buttons or elements with aria-label or title referencing share/send/save
            candidate_selectors = [
                '[role="button"][aria-label]',
                '[aria-label]',
                '[title]'
            ]
            elements = []
            for selector in candidate_selectors:
                elements.extend(self.driver.find_elements(By.CSS_SELECTOR, selector))
            
            shares_count: Optional[int] = None
            
            for el in elements:
                label = (el.get_attribute('aria-label') or el.get_attribute('title') or el.text or '').strip()
                text_lower = label.lower()
                if not label:
                    continue
                
                # Shares (aka Send)
                if any(k in text_lower for k in ['share', 'shared', 'shares', 'send', 'sends']):
                    # Examples could be: "Share", "Share 12", "12 shares", "Send 3"
                    count = self._extract_number_from_text(label)
                    if count is not None:
                        shares_count = max(shares_count or 0, count)
                        continue
            
            # Fallback: sometimes the number is in a sibling element
            if shares_count is None:
                possible_counters = self.driver.find_elements(By.CSS_SELECTOR, 'span, div')
                for el in possible_counters:
                    txt = (el.get_attribute('aria-label') or el.text or '').strip()
                    low = txt.lower()
                    if not txt:
                        continue
                    if (shares_count is None) and any(k in low for k in ['share', 'shared', 'shares', 'send', 'sends']):
                        num = self._extract_number_from_text(txt)
                        if num is not None:
                            shares_count = num
            
            # Last-resort: parse page inner text for a pattern like "1,234 shares"
            if shares_count is None:
                inner_text = self.driver.execute_script("return document.body.innerText || '';") or ''
                match = re.search(r'(\d+[.,\d]*\s*[KMB]?)\s+shares?', inner_text, re.IGNORECASE)
                if match:
                    shares_count = self._extract_number_from_text(match.group(0))
            
            if shares_count is not None:
                result['engagement']['shares'] = shares_count
                print(f"IG shares: {shares_count}")
        except Exception as e:
            print(f"Error extracting IG shares/saves: {e}")
    
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
                
                filename = f"{post_info['post_id']}_{i+1}{ext}"
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
    print("X (Twitter) Post Scraper with Selenium")
    print("=" * 40)
    
    # Get URL from user input
    url = input("Enter the URL to report: ").strip()
    
    if not url:
        print("No URL provided. Exiting.")
        return
    
    # Ask if user wants to download media
    download_media = input("Download media files? (y/n): ").lower().strip() == 'y'
    
    scraper = XScraper()
    
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
        if scraper.is_instagram_url(url):
            print("INSTAGRAM POST DATA")
            print("="*50)
            
            caption = result.get('caption', '')
            # Print author
            author_username = result.get('author', {}).get('username', '')
            author_fullname = result.get('author', {}).get('full_name', '')
            if author_username:
                print(f"Author: @{author_username}" + (f" ({author_fullname})" if author_fullname else ""))
            elif author_fullname:
                print(f"Author: {author_fullname}")
            else:
                print("Author: Not found")
            
            if caption:
                print(f"Text: {caption[:200]}{'...' if len(caption) > 200 else ''}")
            else:
                print("Text: Not found")
            
            likes = result.get('engagement', {}).get('likes', 0)
            comments = result.get('engagement', {}).get('comments', 0)
            shares = result.get('engagement', {}).get('shares', 0)
            print(f"Likes: {likes:,}")
            print(f"Comments: {comments:,}")
            print(f"Shares: {shares:,}")
            
            media_urls = result.get('media', {}).get('urls', [])
            if media_urls:
                print(f"Image: {media_urls[0]}")
            else:
                print("Image: Not found")
        
        elif scraper.is_reddit_url(url):
            print("REDDIT POST DATA")
            print("="*50)
            
            # Safety sentence as requested
            print("On Reddit, upvotes, downvotes, comments, awards, user karma, and engagement patterns help detect fake news")
            
            # Author
            r_author = result.get('author', {})
            uname = r_author.get('username', '')
            karma = r_author.get('karma', None)
            if uname:
                if karma is not None:
                    print(f"Author: u/{uname} (karma: {karma:,})")
                else:
                    print(f"Author: u/{uname}")
            else:
                print("Author: Not found")
            
            caption = result.get('caption', '')
            if caption:
                print(f"Text: {caption[:200]}{'...' if len(caption) > 200 else ''}")
            else:
                print("Text: Not found")
            
            upvotes = result.get('reddit', {}).get('upvotes', 0)
            downvotes = result.get('reddit', {}).get('downvotes', 0)
            comments = result.get('engagement', {}).get('comments', 0)
            awards = result.get('reddit', {}).get('awards', 0)
            print(f"Upvotes: {upvotes:,}")
            print(f"Downvotes: {downvotes:,}")
            print(f"Comments: {comments:,}")
            print(f"Awards: {awards:,}")
            
            media_urls = result.get('media', {}).get('urls', [])
            if media_urls:
                print(f"Image: {media_urls[0]}")
            else:
                print("Image: Not found")
        else:
            print("X POST DATA")
            print("="*50)
            
            print(f"Post ID: {result.get('post_id', 'N/A')}")
            
            author_username = result.get('author', {}).get('username', '')
            author_fullname = result.get('author', {}).get('full_name', '')
            if author_username:
                print(f"Author: @{author_username}" + (f" ({author_fullname})" if author_fullname else ""))
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
            saves = result.get('engagement', {}).get('saves', 0)
            print(f"Likes: {likes:,}")
            print(f"Replies: {comments:,}")
            print(f"Retweets: {shares:,}")
            print(f"Bookmarks: {saves:,}")
            
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
        output_file = f"x_post_{result['post_id']}.json"
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