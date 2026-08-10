"""False-interruption burden test.

Runs a large set of ordinary development operations through the detection
pipeline and asserts that the overwhelming majority are allowed silently
(not paused). This is a regression test, not an accuracy claim.

Target: >= 90% of routine operations allowed without pause/require-investigation.
"""

from __future__ import annotations

from typing import Any

from hmj.detection import build_detection_context, create_hook_detector
from judgment_core.types import InterventionLevel

# ---------------------------------------------------------------------------
# Ordinary development operations (should NOT pause)
# ---------------------------------------------------------------------------

ORDINARY_OPS: list[tuple[str, dict[str, Any]]] = [
    # File reading
    ("Read", {"file_path": "/src/main.py"}),
    ("Read", {"file_path": "/package.json"}),
    ("Read", {"file_path": "/README.md"}),
    ("Read", {"file_path": "/tests/conftest.py"}),
    ("Read", {"file_path": "/src/components/Header.tsx"}),
    # Glob/search
    ("Glob", {"pattern": "**/*.py"}),
    ("Glob", {"pattern": "src/**/*.ts"}),
    ("Grep", {"pattern": "import", "path": "/src"}),
    # Standard Bash commands
    ("Bash", {"command": "pytest tests/ -v"}),
    ("Bash", {"command": "pytest tests/test_api.py -k test_login"}),
    ("Bash", {"command": "python -m pytest --cov=src"}),
    ("Bash", {"command": "npm test"}),
    ("Bash", {"command": "npm run build"}),
    ("Bash", {"command": "npm install express"}),
    ("Bash", {"command": "pip install -r requirements.txt"}),
    ("Bash", {"command": "pip install flask"}),
    ("Bash", {"command": "uv sync"}),
    ("Bash", {"command": "uv run ruff check src/"}),
    ("Bash", {"command": "uv run mypy src/"}),
    ("Bash", {"command": "git status"}),
    ("Bash", {"command": "git log --oneline -10"}),
    ("Bash", {"command": "git diff HEAD~1"}),
    ("Bash", {"command": "git add src/app.py"}),
    ("Bash", {"command": "git commit -m 'fix: correct typo in header'"}),
    ("Bash", {"command": "git pull origin main"}),
    ("Bash", {"command": "git checkout -b feature/new-button"}),
    ("Bash", {"command": "git merge feature/login"}),
    ("Bash", {"command": "git stash"}),
    ("Bash", {"command": "git stash pop"}),
    ("Bash", {"command": "ls -la"}),
    ("Bash", {"command": "ls src/components/"}),
    ("Bash", {"command": "cat pyproject.toml"}),
    ("Bash", {"command": "head -20 src/main.py"}),
    ("Bash", {"command": "wc -l src/**/*.py"}),
    ("Bash", {"command": "find . -name '*.pyc' -delete"}),
    ("Bash", {"command": "mkdir -p src/utils"}),
    ("Bash", {"command": "cp src/config.py src/config.bak.py"}),
    ("Bash", {"command": "mv src/old_name.py src/new_name.py"}),
    ("Bash", {"command": "echo $PATH"}),
    ("Bash", {"command": "python --version"}),
    ("Bash", {"command": "node --version"}),
    ("Bash", {"command": "which python"}),
    ("Bash", {"command": "pwd"}),
    ("Bash", {"command": "date"}),
    ("Bash", {"command": "docker build -t myapp ."}),
    ("Bash", {"command": "docker run --rm myapp python -m pytest"}),
    ("Bash", {"command": "curl http://localhost:3000/health"}),
    ("Bash", {"command": "black src/"}),
    ("Bash", {"command": "isort src/"}),
    ("Bash", {"command": "ruff format src/"}),
    ("Bash", {"command": "eslint src/ --fix"}),
    ("Bash", {"command": "prettier --write src/"}),
    ("Bash", {"command": "tsc --noEmit"}),
    # File editing
    ("Edit", {"file_path": "/src/app.py", "old_string": "x = 1", "new_string": "count = 1"}),
    ("Edit", {"file_path": "/src/utils.py", "old_string": "pass", "new_string": "return None"}),
    ("Edit", {"file_path": "/docs/README.md", "old_string": "teh", "new_string": "the"}),
    # File writing
    ("Write", {"file_path": "/tests/test_new_feature.py", "content": "def test_it(): pass"}),
    ("Write", {"file_path": "/src/helpers.py", "content": "def helper(): pass"}),
]


_PAUSE_OR_HIGHER = frozenset({InterventionLevel.pause, InterventionLevel.require_investigation})


class TestInterruptionBurden:
    """Measure false-interruption rate across ordinary dev operations."""

    def test_at_least_90_percent_allowed(self) -> None:
        """At least 90% of ordinary operations should not trigger pause."""
        total = len(ORDINARY_OPS)
        assert total >= 50, f"Need at least 50 test cases, got {total}"

        paused_count = 0
        paused_ops: list[str] = []

        for tool_name, tool_input in ORDINARY_OPS:
            context = build_detection_context(tool_name, tool_input)
            detector = create_hook_detector()
            summary = detector.detect(context)

            if summary.has_detections and summary.highest_intervention in _PAUSE_OR_HIGHER:
                paused_count += 1
                cmd = tool_input.get("command", tool_input.get("file_path", str(tool_input)))
                paused_ops.append(f"{tool_name}: {cmd}")

        allowed_rate = (total - paused_count) / total
        assert allowed_rate >= 0.90, (
            f"Only {allowed_rate:.0%} of operations allowed silently "
            f"({paused_count}/{total} paused). "
            f"Paused operations: {paused_ops}"
        )

    def test_zero_routine_false_positives(self) -> None:
        """No routine read/test/format operations should be paused."""
        safe_ops = [
            ("Read", {"file_path": "/src/main.py"}),
            ("Glob", {"pattern": "**/*.py"}),
            ("Bash", {"command": "pytest tests/ -v"}),
            ("Bash", {"command": "npm test"}),
            ("Bash", {"command": "git status"}),
            ("Bash", {"command": "git log --oneline"}),
            ("Bash", {"command": "ls -la"}),
            ("Bash", {"command": "python --version"}),
            ("Bash", {"command": "ruff format src/"}),
            ("Bash", {"command": "black src/"}),
            ("Edit", {"file_path": "/src/app.py", "old_string": "x", "new_string": "y"}),
        ]

        for tool_name, tool_input in safe_ops:
            context = build_detection_context(tool_name, tool_input)
            detector = create_hook_detector()
            summary = detector.detect(context)

            if summary.has_detections:
                assert summary.highest_intervention not in _PAUSE_OR_HIGHER, (
                    f"Safe operation {tool_name}({tool_input}) incorrectly paused "
                    f"at level {summary.highest_intervention}"
                )
