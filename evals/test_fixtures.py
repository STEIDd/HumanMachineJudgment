"""Pytest suite that runs every JSON fixture through the evaluation harness.

Each fixture is parametrised as its own test case so that failures are reported
individually.
"""

from __future__ import annotations

from typing import Any

import pytest

from evals.fixture_loader import get_fixture_id, load_all_fixtures
from evals.harness import evaluate_fixture

ALL_FIXTURES: list[dict[str, Any]] = load_all_fixtures()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "fixture",
    ALL_FIXTURES,
    ids=lambda f: get_fixture_id(f),
)
async def test_fixture(fixture: dict[str, Any]) -> None:
    """Run a single fixture through the evaluation harness and assert it passes."""
    result = await evaluate_fixture(fixture)
    assert result.passed, f"Fixture '{result.fixture_id}' failed:\n" + "\n".join(result.errors)
