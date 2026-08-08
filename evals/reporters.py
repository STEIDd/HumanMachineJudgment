"""Generate machine-readable JSON evaluation reports."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from evals.harness import FixtureResult


def generate_report(results: list[FixtureResult]) -> dict[str, Any]:
    """Produce a JSON-serialisable evaluation report from fixture results.

    The report format follows the machine-readable results specification
    described in ``docs/evaluation-plan.md``.
    """
    passed = sum(1 for r in results if r.passed)
    failed = sum(1 for r in results if not r.passed)
    total = len(results)

    return {
        "evaluationId": f"eval-{datetime.now(UTC).strftime('%Y%m%d-%H%M%S')}",
        "timestamp": datetime.now(UTC).isoformat(),
        "harness": {
            "version": "0.1.0",
            "fixtureCount": total,
            "passCount": passed,
            "failCount": failed,
            "passRate": passed / total if total > 0 else 0.0,
        },
        "fixtures": [r.to_dict() for r in results],
    }
