# Agentic AI Verification System

A multi-agent AI system using LangGraph that simulates a group of AI agents working together to verify content authenticity. Each agent has a specific role and expertise, and they collaborate to make a final decision.

## 🤖 Multi-Model AI Verification

The system uses **5 different free AI models** from [OpenRouter](https://openrouter.ai/models?max_price=0) to provide diverse perspectives and robust verification:

### 1. **NVIDIA Nemotron Nano 9B v2** (Free)
- **Model**: `nvidia/nemotron-nano-9b-v2:free`
- **Specialty**: Efficient reasoning and fact-checking
- **Strengths**: Fast processing, good at logical analysis

### 2. **Z-AI GLM 4.5 Air** (Free)
- **Model**: `z-ai/glm-4.5-air:free`
- **Specialty**: Chinese-developed model with unique perspective
- **Strengths**: Different cultural context, alternative viewpoints

### 3. **Mistral Small 3.2 24B Instruct** (Free)
- **Model**: `mistralai/mistral-small-3.2-24b-instruct:free`
- **Specialty**: High-quality instruction following
- **Strengths**: Detailed analysis, comprehensive reasoning

### 4. **DeepSeek R1 Qwen3 8B** (Free)
- **Model**: `deepseek/deepseek-r1-0528-qwen3-8b:free`
- **Specialty**: Advanced reasoning capabilities
- **Strengths**: Complex logical analysis, pattern recognition

### 5. **DeepSeek R1** (Free)
- **Model**: `deepseek/deepseek-r1:free`
- **Specialty**: Latest reasoning model
- **Strengths**: State-of-the-art analysis, cutting-edge capabilities

### **Consensus-Based Decision Making**
All 5 models analyze the content independently, then the system:
1. **Collects individual decisions** from each model
2. **Calculates consensus** based on majority voting
3. **Weights confidence scores** from aligned models
4. **Generates comprehensive reasoning** from all perspectives

## 🌐 Supported Platforms

The scraper supports content from multiple platforms:

- **Twitter/X** - Posts, images, engagement metrics
- **Instagram** - Posts, reels, stories, captions
- **Reddit** - Posts, comments, subreddit info
- **YouTube** - Videos, titles, descriptions
- **Generic Websites** - Any web page content

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ai-verify
pip install -r requirements.txt
```

### 2. Set Up Environment Variables

Create a `.env` file:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

Get your free API key from [OpenRouter](https://openrouter.ai/models?max_price=0&fmt=cards&input_modalities=text)

**Note**: This system uses OpenRouter exclusively - no OpenAI API key needed!

### 3. Run the API Server

```bash
python api_server.py
```

The server will start on `http://localhost:8000`

### 4. Test the System

See **Manual Testing** section below for testing instructions.

## 📡 API Endpoints

### POST `/scrape-and-verify` ⭐ **NEW**
Scrape content from any platform and verify using AI agents

**Request:**
```json
{
    "url": "https://twitter.com/username/status/1234567890"
}
```

**Response:**
```json
{
    "success": true,
    "scraped_content": {
        "platform": "twitter",
        "url": "https://twitter.com/username/status/1234567890",
        "content_text": "Scraped text content...",
        "content_images": ["image1.jpg", "image2.jpg"],
        "author": {"username": "username", "full_name": "Full Name"},
        "engagement": {"likes": 100, "comments": 50, "shares": 25},
        "metadata": {...}
    },
    "result": {
        "final_decision": "authentic|fake|uncertain",
        "confidence": 0.85,
        "consensus_score": 0.75,
        "individual_decisions": [...],
        "group_reasoning": "Detailed explanation..."
    }
}
```

### POST `/verify`
Verify content using the multi-agent system (manual input)

**Request:**
```json
{
    "content_url": "https://example.com/content",
    "content_text": "Content to verify...",
    "content_images": ["image1.jpg", "image2.jpg"]
}
```

**Response:**
```json
{
    "success": true,
    "result": {
        "final_decision": "authentic|fake|uncertain",
        "confidence": 0.85,
        "consensus_score": 0.75,
        "individual_decisions": [...],
        "group_reasoning": "Detailed explanation..."
    }
}
```

### GET `/agents`
Get information about available agents

### GET `/health`
Check system health

## 🔄 How It Works

1. **Sequential Analysis**: Each agent analyzes the content in sequence
2. **Individual Decisions**: Each agent makes their own decision with confidence score
3. **Group Consensus**: The system synthesizes all decisions into a final verdict
4. **Detailed Reasoning**: Provides comprehensive reasoning from all agents

## 🎯 Decision Process

The system uses a consensus-based approach:

- **Authentic**: Majority of agents agree content is authentic
- **Fake**: Majority of agents agree content is fake/manipulated
- **Uncertain**: No clear consensus or mixed signals

## 🧪 Manual Testing

### Using curl (Command Line)

1. **Test Health Check**:
   ```bash
   curl http://localhost:8000/health
   ```

2. **Test Scrape and Verify**:
   ```bash
   curl -X POST http://localhost:8000/scrape-and-verify \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com"}'
   ```

3. **Test Manual Verification**:
   ```bash
   curl -X POST http://localhost:8000/verify \
     -H "Content-Type: application/json" \
     -d '{
       "content_url": "https://example.com",
       "content_text": "This is fake news about aliens invading Earth",
       "content_images": []
     }'
   ```

### Using Postman

1. **Import Collection**: Create a new collection in Postman
2. **Add Requests**:
   - `GET` `http://localhost:8000/health`
   - `POST` `http://localhost:8000/scrape-and-verify` with body:
     ```json
     {
       "url": "https://twitter.com/username/status/1234567890"
     }
     ```
   - `POST` `http://localhost:8000/verify` with body:
     ```json
     {
       "content_url": "https://example.com",
       "content_text": "Your content here",
       "content_images": []
     }
     ```

### Test URLs to Try

- **Twitter**: `https://twitter.com/elonmusk/status/1234567890`
- **Instagram**: `https://www.instagram.com/p/ABC123/`
- **Reddit**: `https://www.reddit.com/r/technology/comments/abc123/`
- **YouTube**: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- **Generic**: `https://example.com`

## 🔧 Integration with Frontend

To integrate with your existing verification flow:

1. **Start the AI verification server**:
   ```bash
   cd ai-verify
   python api_server.py
   ```

2. **Update your frontend** to call the AI verification API before the blockchain verification

3. **Example integration**:
   ```javascript
   // In your VerificationFlow component
   const verifyWithAI = async (contentUrl) => {
     const response = await fetch('http://localhost:8000/scrape-and-verify', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ url: contentUrl })
     });
     
     const result = await response.json();
     return result.result.final_decision; // 'authentic', 'fake', or 'uncertain'
   };
   ```

## 🛠️ Customization

### Adding New Agents
1. Create a new agent method in `ai_verification_system.py`
2. Add the agent to the workflow in `_create_verification_workflow()`
3. Update the decision synthesis logic

### Modifying Decision Logic
- Edit the `_group_decision_maker()` method
- Adjust consensus thresholds
- Add custom weighting for different agents

## 📊 Example Output

```
=== VERIFICATION RESULT ===
Final Decision: FAKE
Confidence: 0.82
Consensus Score: 0.75

Group Reasoning:
Group Decision: FAKE
Consensus Score: 0.75

Individual Agent Analysis:

Fact Checker: FAKE (confidence: 0.90)
Reasoning: Multiple factual claims are demonstrably false...
Evidence: ['Claim about Earth being flat is scientifically impossible', 'No credible sources provided']

Image Analyst: UNCERTAIN (confidence: 0.30)
Reasoning: No images provided for analysis
Evidence: []

Source Verifier: FAKE (confidence: 0.85)
Reasoning: No credible sources cited, anonymous whistleblower claims...
Evidence: ['Anonymous sources are unreliable', 'No official documentation provided']

Context Analyst: FAKE (confidence: 0.80)
Reasoning: Content follows typical conspiracy theory patterns...
Evidence: ['Claims of government cover-up', 'Lack of peer review']
```

## 🔒 Security Notes

- Keep your OpenRouter API key secure
- Consider rate limiting for production use
- Validate input content before processing
- Monitor API usage and costs

## 📈 Performance

- **Processing Time**: ~10-30 seconds per verification
- **Cost**: Uses free OpenRouter models
- **Scalability**: Can handle multiple concurrent requests
- **Accuracy**: High accuracy with multi-agent consensus
