#!/usr/bin/env python3
"""Generate Pydantic models and TypeScript interfaces from JSON Schemas.

This script generates:
  - Python Pydantic v2 models → backend/judgment_core/src/judgment_core/_generated/
  - TypeScript interfaces → packages/judgment-schemas/src/generated/types.ts (if json-schema-to-typescript is installed)

Run from the repository root:
    python scripts/generate_types.py

Generated files must not be edited manually.
"""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEMAS_DIR = ROOT / "schemas"
PYTHON_OUTPUT = ROOT / "backend" / "judgment_core" / "src" / "judgment_core" / "_generated"
TS_OUTPUT = ROOT / "packages" / "judgment-schemas" / "src" / "generated"


def generate_python() -> None:
    """Generate Pydantic v2 models from JSON schemas."""
    print("Generating Python Pydantic models...")
    PYTHON_OUTPUT.mkdir(parents=True, exist_ok=True)

    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "datamodel_code_generator",
            "--input",
            str(SCHEMAS_DIR),
            "--input-file-type",
            "jsonschema",
            "--output",
            str(PYTHON_OUTPUT),
            "--output-model-type",
            "pydantic_v2.BaseModel",
            "--target-python-version",
            "3.12",
            "--use-annotated",
            "--snake-case-field",
            "--use-default",
            "--field-constraints",
            "--formatters",
            "builtin",
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        print(f"Error generating Python models:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)

    # Ensure __init__.py has the DO NOT EDIT header
    init_file = PYTHON_OUTPUT / "__init__.py"
    init_file.write_text("# DO NOT EDIT — generated from schemas/*.schema.json\n")

    print(f"  Generated Python models in {PYTHON_OUTPUT}")


def generate_typescript() -> None:
    """Generate TypeScript interfaces from JSON schemas (if tooling is available)."""
    TS_OUTPUT.mkdir(parents=True, exist_ok=True)

    # Check if json-schema-to-typescript is available
    npx_check = subprocess.run(
        ["npx", "--yes", "json-schema-to-typescript", "--help"],
        capture_output=True,
        text=True,
    )
    if npx_check.returncode != 0:
        print("  Skipping TypeScript generation (json-schema-to-typescript not available)")
        return

    print("Generating TypeScript interfaces...")
    schema_files = sorted(SCHEMAS_DIR.glob("*.schema.json"))
    ts_parts: list[str] = [
        "// DO NOT EDIT — generated from schemas/*.schema.json",
        "",
    ]

    for schema_file in schema_files:
        result = subprocess.run(
            [
                "npx",
                "--yes",
                "json-schema-to-typescript",
                str(schema_file),
                "--style.semi",
                "--style.singleQuote",
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            ts_parts.append(f"// From {schema_file.name}")
            ts_parts.append(result.stdout)

    output_file = TS_OUTPUT / "types.ts"
    output_file.write_text("\n".join(ts_parts))
    print(f"  Generated TypeScript interfaces in {output_file}")


def main() -> None:
    generate_python()
    generate_typescript()
    print("Type generation complete.")


if __name__ == "__main__":
    main()
