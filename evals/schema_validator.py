"""Validates fixture data against JSON schemas.

If ``jsonschema`` is installed, fixtures are validated against the project
schemas in ``schemas/``.  When the library is absent validation is skipped
gracefully so that the harness can still run.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

try:
    import jsonschema

    HAS_JSONSCHEMA = True
except ImportError:
    jsonschema = None  # type: ignore[assignment]
    HAS_JSONSCHEMA = False

SCHEMA_DIR = Path(__file__).parent.parent / "schemas"


def load_schema(schema_name: str) -> dict[str, Any]:
    """Load a JSON schema by file name from the project schemas directory."""
    path = SCHEMA_DIR / schema_name
    with open(path, encoding="utf-8") as f:
        return json.load(f)  # type: ignore[no-any-return]


def validate_against_schema(data: dict[str, Any], schema_name: str) -> list[str]:
    """Validate *data* against the named JSON schema.

    Returns a list of human-readable error messages.  If ``jsonschema`` is not
    installed the list is always empty (validation is skipped).
    """
    if not HAS_JSONSCHEMA or jsonschema is None:
        return []

    schema = load_schema(schema_name)
    validator = jsonschema.Draft202012Validator(schema)
    return [str(e.message) for e in validator.iter_errors(data)]
