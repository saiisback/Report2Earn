"""Command-line interface to run the AI verification FastAPI server."""

from __future__ import annotations

import argparse

import uvicorn


def main() -> None:  # pragma: no cover - thin wrapper around uvicorn
    parser = argparse.ArgumentParser(description="Run the R2E AI verification service")
    parser.add_argument("--host", default="0.0.0.0", help="Host address to bind")
    parser.add_argument("--port", type=int, default=8000, help="Port to expose")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload (development only)")

    args = parser.parse_args()

    uvicorn.run(
        "r2e_ai_verification.api:create_app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        factory=True,
    )


if __name__ == "__main__":  # pragma: no cover
    main()
