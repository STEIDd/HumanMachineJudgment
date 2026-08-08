"""Discovers and loads JSON evaluation fixtures from the fixtures directory."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def load_fixture(path: Path) -> dict[str, Any]:
    """Load a single fixture file and return its parsed contents."""
    with open(path, encoding="utf-8") as f:
        return json.load(f)  # type: ignore[no-any-return]


def load_all_fixtures(fixtures_dir: Path | None = None) -> list[dict[str, Any]]:
    """Load all JSON fixtures from the fixtures directory.

    Each returned dict is augmented with a ``_fixture_file`` key containing the
    file name so that downstream code can identify the source fixture.
    """
    if fixtures_dir is None:
        fixtures_dir = Path(__file__).parent / "fixtures"

    fixtures: list[dict[str, Any]] = []
    for path in sorted(fixtures_dir.glob("*.json")):
        fixture = load_fixture(path)
        fixture["_fixture_file"] = path.name
        fixtures.append(fixture)
    return fixtures


def get_fixture_id(fixture: dict[str, Any]) -> str:
    """Return a human-readable identifier for a fixture.

    Prefers the ``scenario`` field, then ``description``, then the file name.
    """
    return str(
        fixture.get("scenario", fixture.get("description", fixture.get("_fixture_file", "unknown")))
    )
