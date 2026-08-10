"""Pytest configuration for the evaluation harness."""

from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def _reset_test_state() -> None:  # noqa: PT004
    """Clean up test state between fixtures."""
    yield  # type: ignore[misc]
