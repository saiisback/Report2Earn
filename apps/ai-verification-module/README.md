# R2E AI Verification Module

Modular FastAPI service that powers the Report2Earn agentic verification workflow. This package exposes reusable primitives for scraping, image analysis, multi-model reasoning, and reward scoring while also bundling a production-ready FastAPI application.

## Usage

```bash
pip install -e .
r2e-ai-verification
```

To embed the FastAPI application:

```python
from r2e_ai_verification.api import create_app

app = create_app()
```
