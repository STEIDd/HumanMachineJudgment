"""Unique identifier generation for domain entities."""

from __future__ import annotations

import uuid


def generate_id() -> str:
    """Generate a unique identifier using UUID v4."""
    return str(uuid.uuid4())
