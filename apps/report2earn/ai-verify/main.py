#!/usr/bin/env python3
"""FastAPI entrypoint that proxies to the reusable r2e-ai-verification module."""

from __future__ import annotations

import os
import sys
from pathlib import Path


def _ensure_module_on_path() -> None:
    """Allow running without installing the shared module first."""

    module_src = Path(__file__).resolve().parents[2] / "ai-verification-module" / "src"
    module_path = str(module_src)
    if module_src.exists() and module_path not in sys.path:
        sys.path.insert(0, module_path)


_ensure_module_on_path()

from r2e_ai_verification import AppSettings, create_app  # noqa: E402


cors_env = os.getenv("R2E_CORS_ORIGINS")
cors_origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()] if cors_env else None

app_settings = AppSettings(cors_origins=cors_origins)
app = create_app(app_settings)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
