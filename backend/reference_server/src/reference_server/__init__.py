"""Reference HTTP API server for Judgment Points, built with FastAPI."""

__version__ = "0.1.0"

from reference_server.app import create_app

__all__ = ["create_app"]
