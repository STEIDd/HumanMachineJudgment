#!/usr/bin/env python3
"""
Validate a Judgment Candidate against the JSON schema.

This script checks whether a candidate JSON object conforms to the
expected structure for a Judgment Candidate. It validates required fields,
enum values, and structural constraints.

Usage:
    python validate_candidate.py <candidate.json>
    echo '{"category": "method", ...}' | python validate_candidate.py -

Exit codes:
    0: Valid candidate
    1: Invalid candidate (with error details on stderr)
    2: Input error (file not found, invalid JSON)
"""

import json
import sys
from typing import Any

VALID_CATEGORIES = {
    "objective",
    "framing",
    "assumption",
    "method",
    "data",
    "parameter",
    "validation",
    "interpretation",
}

REQUIRED_FIELDS = {"category", "question", "reason", "alternatives", "confidence"}

ALTERNATIVE_REQUIRED_FIELDS = {"id", "label", "description"}


def validate_candidate(candidate: dict[str, Any]) -> list[str]:
    """Validate a Judgment Candidate and return a list of errors."""
    errors: list[str] = []

    for field in REQUIRED_FIELDS:
        if field not in candidate:
            errors.append(f"Missing required field: {field}")

    if "category" in candidate and candidate["category"] not in VALID_CATEGORIES:
        errors.append(
            f"Invalid category: {candidate['category']}. "
            f"Must be one of: {', '.join(sorted(VALID_CATEGORIES))}"
        )

    if "confidence" in candidate:
        conf = candidate["confidence"]
        if not isinstance(conf, (int, float)) or conf < 0 or conf > 1:
            errors.append(f"Confidence must be a number between 0.0 and 1.0, got: {conf}")

    if "alternatives" in candidate:
        alts = candidate["alternatives"]
        if not isinstance(alts, list):
            errors.append("Alternatives must be an array.")
        elif len(alts) < 2:
            errors.append("At least two alternatives are required.")
        else:
            for i, alt in enumerate(alts):
                if not isinstance(alt, dict):
                    errors.append(f"Alternative {i} must be an object.")
                    continue
                for field in ALTERNATIVE_REQUIRED_FIELDS:
                    if field not in alt:
                        errors.append(f"Alternative {i} missing required field: {field}")

    if "affected_artifacts" in candidate:
        artifacts = candidate["affected_artifacts"]
        if not isinstance(artifacts, list):
            errors.append("affected_artifacts must be an array.")

    if "question" in candidate:
        question = candidate["question"]
        if not isinstance(question, str) or len(question.strip()) < 10:
            errors.append("Question must be a string of at least 10 characters.")

    return errors


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: validate_candidate.py <candidate.json | ->", file=sys.stderr)
        sys.exit(2)

    source = sys.argv[1]

    try:
        if source == "-":
            data = json.load(sys.stdin)
        else:
            with open(source, "r", encoding="utf-8") as f:
                data = json.load(f)
    except FileNotFoundError:
        print(f"File not found: {source}", file=sys.stderr)
        sys.exit(2)
    except json.JSONDecodeError as e:
        print(f"Invalid JSON: {e}", file=sys.stderr)
        sys.exit(2)

    errors = validate_candidate(data)

    if errors:
        print("Validation failed:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        sys.exit(1)
    else:
        print("Candidate is valid.")
        sys.exit(0)


if __name__ == "__main__":
    main()
