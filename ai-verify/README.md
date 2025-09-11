# Agentic AI Verification System

A multi-agent AI system using LangGraph that simulates a group of AI agents working together to verify content authenticity. Each agent has a specific role and expertise, and they collaborate to make a final decision.

## 🤖 AI Agents

### 1. **Fact Checker**
- **Role**: Verifies factual claims and checks for logical inconsistencies
- **Specialty**: Fact-checking and misinformation detection
- **Analysis**: Examines claims, checks for logical fallacies, identifies potential misinformation patterns

### 2. **Image Analyst**
- **Role**: Analyzes visual content for manipulation and authenticity
- **Specialty**: Image verification and deepfake detection
- **Analysis**: Examines images for signs of manipulation, checks consistency with text content

### 3. **Source Verifier**
- **Role**: Checks credibility and reliability of sources
- **Specialty**: Source credibility and attribution verification
- **Analysis**: Verifies sources, checks attribution, looks for bias indicators

### 4. **Context Analyst**
- **Role**: Examines broader context, timing, and narrative patterns
- **Specialty**: Contextual analysis and agenda detection
- **Analysis**: Analyzes timing, relevance, and overall narrative patterns

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

### 3. Run the API Server

```bash
python api_server.py
```

The server will start on `http://localhost:8000`

### 4. Test the System

```bash
python test_client.py
```

## 📡 API Endpoints

### POST `/verify`
Verify content using the multi-agent system

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
   const verifyWithAI = async (contentUrl, contentText) => {
     const response = await fetch('http://localhost:8000/verify', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         content_url: contentUrl,
         content_text: contentText,
         content_images: []
       })
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
