"""Fixture-driven detection corpus for the hook detection pipeline.

Tests three categories:
  1. Routine operations — should NOT trigger pause/require-investigation.
  2. Consequential operations — should trigger pause/require-investigation.
  3. Ambiguous operations — should at minimum disclose.
"""

from __future__ import annotations

from typing import Any

import pytest

from hmj.detection import build_detection_context, create_hook_detector
from judgment_core.types import InterventionLevel

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _detect(tool_name: str, tool_input: dict[str, Any]) -> tuple[bool, InterventionLevel | None]:
    """Run detection and return (has_detections, highest_intervention)."""
    context = build_detection_context(tool_name, tool_input)
    detector = create_hook_detector()
    summary = detector.detect(context)
    return summary.has_detections, summary.highest_intervention


_PAUSE_OR_HIGHER = frozenset({InterventionLevel.pause, InterventionLevel.require_investigation})


# ---------------------------------------------------------------------------
# 1. Routine operations — should NOT trigger pause/require-investigation
# ---------------------------------------------------------------------------

ROUTINE_CASES: list[tuple[str, str, dict[str, Any]]] = [
    ("read_file", "Read", {"file_path": "/src/app.py"}),
    ("run_tests", "Bash", {"command": "pytest tests/ -v"}),
    ("list_files", "Bash", {"command": "ls -la src/"}),
    ("git_status", "Bash", {"command": "git status"}),
    ("git_log", "Bash", {"command": "git log --oneline -20"}),
    ("git_diff", "Bash", {"command": "git diff HEAD"}),
    ("npm_install", "Bash", {"command": "npm install"}),
    ("pip_install", "Bash", {"command": "pip install requests"}),
    ("grep_search", "Bash", {"command": "grep -rn 'TODO' src/"}),
    ("cat_file", "Bash", {"command": "cat README.md"}),
    ("rename_variable", "Edit", {"file_path": "/src/app.py", "old_string": "x"}),
    ("fix_typo", "Edit", {"file_path": "/docs/guide.md", "old_string": "teh"}),
    ("add_import", "Edit", {"file_path": "/src/app.py", "new_string": "import os"}),
    ("write_test", "Write", {"file_path": "/tests/test_new.py", "content": "def test_it(): pass"}),
    ("glob_search", "Glob", {"pattern": "**/*.py"}),
]


class TestRoutineOperationsNotBlocked:
    """Routine dev operations should not trigger pause or require-investigation."""

    @pytest.mark.parametrize(
        "name,tool_name,tool_input",
        [(c[0], c[1], c[2]) for c in ROUTINE_CASES],
        ids=[c[0] for c in ROUTINE_CASES],
    )
    def test_routine_not_paused(
        self, name: str, tool_name: str, tool_input: dict[str, Any]
    ) -> None:
        has_detections, highest = _detect(tool_name, tool_input)
        if has_detections:
            assert highest not in _PAUSE_OR_HIGHER, (
                f"Routine operation '{name}' incorrectly triggered {highest}"
            )


# ---------------------------------------------------------------------------
# 2. Consequential operations — should trigger pause or require-investigation
# ---------------------------------------------------------------------------

CONSEQUENTIAL_CASES: list[tuple[str, str, dict[str, Any]]] = [
    ("rm_rf", "Bash", {"command": "rm -rf /important/data"}),
    ("rm_rf_star", "Bash", {"command": "rm -rf *"}),
    ("git_push_force", "Bash", {"command": "git push --force origin main"}),
    ("git_reset_hard", "Bash", {"command": "git reset --hard HEAD~5"}),
    ("drop_table", "Bash", {"command": "sqlite3 db.sqlite 'DROP TABLE users'"}),
    ("delete_from_all", "Bash", {"command": "psql -c 'DELETE FROM orders;'"}),
    ("chmod_777", "Bash", {"command": "chmod 777 /etc/config"}),
]


class TestConsequentialOperationsBlocked:
    """Consequential operations should trigger pause or require-investigation."""

    @pytest.mark.parametrize(
        "name,tool_name,tool_input",
        [(c[0], c[1], c[2]) for c in CONSEQUENTIAL_CASES],
        ids=[c[0] for c in CONSEQUENTIAL_CASES],
    )
    def test_consequential_paused(
        self, name: str, tool_name: str, tool_input: dict[str, Any]
    ) -> None:
        has_detections, highest = _detect(tool_name, tool_input)
        assert has_detections, f"Consequential operation '{name}' was not detected"
        assert highest in _PAUSE_OR_HIGHER, (
            f"Consequential operation '{name}' only triggered {highest}, expected pause or higher"
        )


# ---------------------------------------------------------------------------
# 3. Ambiguous operations — should at minimum produce a detection
# ---------------------------------------------------------------------------

AMBIGUOUS_CASES: list[tuple[str, str, dict[str, Any]]] = [
    ("pip_uninstall", "Bash", {"command": "pip uninstall -y numpy"}),
    ("docker_system_prune", "Bash", {"command": "docker system prune -a --force"}),
    ("git_branch_delete", "Bash", {"command": "git branch -D feature-branch"}),
    ("curl_post", "Bash", {"command": "curl -X POST https://api.prod.example.com/deploy"}),
    ("npm_run_deploy", "Bash", {"command": "npm run deploy:production"}),
]


class TestAmbiguousOperationsDetected:
    """Ambiguous operations should at minimum be detected (any level)."""

    @pytest.mark.parametrize(
        "name,tool_name,tool_input",
        [(c[0], c[1], c[2]) for c in AMBIGUOUS_CASES],
        ids=[c[0] for c in AMBIGUOUS_CASES],
    )
    def test_ambiguous_detected(
        self, name: str, tool_name: str, tool_input: dict[str, Any]
    ) -> None:
        has_detections, _highest = _detect(tool_name, tool_input)
        # At minimum these should be detected (Bash tool_name rule catches all Bash)
        assert has_detections, f"Ambiguous operation '{name}' was not detected at all"
