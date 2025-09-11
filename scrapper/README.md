# Social Media Scrapers

A collection of Selenium-based scrapers for extracting data from various social media platforms.

## Supported Platforms

- **X (Twitter)** - `main.py` (working ✅)
- **Instagram** - `instagram_scraper.py`
- **Facebook** - `facebook_scraper.py`
- **Reddit** - `reddit_scraper.py`
- **Unified** - `unified_scraper.py` (detects platform automatically)

## Installation

1. **Create virtual environment:**
```bash
python3 -m venv venv
source venv/bin/activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

## Usage

### Individual Platform Scrapers

#### X (Twitter) - Working ✅
```bash
python main.py
# Enter X post URL when prompted
```

#### Instagram
```bash
python instagram_scraper.py
# Enter Instagram post URL when prompted
```

#### Facebook
```bash
python facebook_scraper.py
# Enter Facebook post URL when prompted
```

#### Reddit
```bash
python reddit_scraper.py
# Enter Reddit post URL when prompted
```

### Unified Scraper (Auto-detect platform)
```bash
python unified_scraper.py
# Enter any social media post URL when prompted
```

## What Each Scraper Extracts

### X (Twitter)
- Post ID, Author (@username), Text content
- Likes, Replies, Retweets, Bookmarks
- Media (images/videos), Hashtags, Mentions
- Timestamp

### Instagram
- Post ID, Author (@username), Caption
- Likes, Comments, Media (images/videos)
- Hashtags, Mentions, Location
- Timestamp

### Facebook
- Post ID, Author (Full Name), Text content
- Likes, Comments, Shares
- Media (images/videos), Hashtags, Mentions
- Timestamp

### Reddit
- Post ID, Author (u/username), Subreddit
- Title, Text content, Upvotes, Comments, Awards
- Media (images/videos), Flair
- Timestamp

## Output

Each scraper saves data to a JSON file:
- `x_post_POSTID.json`
- `instagram_post_POSTID.json`
- `facebook_post_POSTID.json`
- `reddit_post_POSTID.json`

## Media Download

All scrapers can download media files to a `downloads/` directory when prompted.

## Requirements

- Python 3.7+
- Chrome browser
- Selenium
- WebDriver Manager
- Requests

## Notes

- All scrapers run in headless mode (background)
- Rate limiting is implemented to avoid being blocked
- Some platforms may have anti-bot measures that could affect scraping
- The X (Twitter) scraper has been tested and works reliably
- Other platforms may need adjustments based on their current structure

## Troubleshooting

If a scraper fails:
1. Check if the URL format is correct
2. Ensure Chrome is installed
3. Try running with a different post URL
4. Check if the platform has changed its structure
