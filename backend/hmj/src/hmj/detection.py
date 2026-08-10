"""Claude Code-specific detection rules for the hook pipeline.

Provides tool-name-based and argument-pattern-based detection rules
that understand which Claude Code tool calls are consequential.
"""

from __future__ import annotations

import json
from typing import Any

from judgment_core.detection import (
    DetectionContext,
    DetectionResult,
    DeterministicDetector,
    create_default_hard_trigger_rules,
)
from judgment_core.types import InterventionLevel, JudgmentCategory


class ToolNameDetectionRule:
    """Matches specific Claude Code tool names to judgment categories."""

    # Tools that could involve consequential choices, with defaults.
    CONSEQUENTIAL_TOOLS: dict[str, dict[str, str]] = {
        "Bash": {"category": "method", "intervention": "disclose"},
    }

    def __init__(self, rule_id: str = "tool-name-detection") -> None:
        self._rule_id = rule_id

    @property
    def rule_id(self) -> str:
        return self._rule_id

    def evaluate(self, context: DetectionContext) -> DetectionResult:
        tool_name = context.action
        config = self.CONSEQUENTIAL_TOOLS.get(tool_name)
        if config is None:
            return DetectionResult(detected=False, rule_id=self._rule_id)

        return DetectionResult(
            detected=True,
            rule_id=self._rule_id,
            confidence=0.3,
            suggested_category=JudgmentCategory(config["category"]),
            suggested_intervention=InterventionLevel(config["intervention"]),
            reason=f"Tool '{tool_name}' may involve consequential choices",
        )


class ArgumentPatternRule:
    """Matches dangerous patterns in tool arguments."""

    DANGEROUS_PATTERNS: list[dict[str, Any]] = [
        {
            "pattern": r"rm\s+-r[f ]",
            "category": "data",
            "intervention": "pause",
            "reason": "Recursive file deletion",
        },
        {
            "pattern": r"git\s+push\s+--force",
            "category": "method",
            "intervention": "pause",
            "reason": "Force push to remote",
        },
        {
            "pattern": r"git\s+reset\s+--hard",
            "category": "method",
            "intervention": "pause",
            "reason": "Hard reset discards changes",
        },
        {
            "pattern": r"DROP\s+TABLE",
            "category": "data",
            "intervention": "require-investigation",
            "reason": "Database table deletion",
        },
        {
            "pattern": r"DELETE\s+FROM\s+\w+\s*(;|$|\s+WHERE\s+1)",
            "category": "data",
            "intervention": "require-investigation",
            "reason": "Bulk data deletion",
        },
        {
            "pattern": r"chmod\s+777",
            "category": "method",
            "intervention": "pause",
            "reason": "Overly permissive file permissions",
        },
    ]

    def __init__(self, rule_id: str = "argument-pattern-detection") -> None:
        import re

        self._rule_id = rule_id
        self._compiled = [
            {
                "regex": re.compile(p["pattern"], re.IGNORECASE),
                "category": p["category"],
                "intervention": p["intervention"],
                "reason": p["reason"],
            }
            for p in self.DANGEROUS_PATTERNS
        ]

    @property
    def rule_id(self) -> str:
        return self._rule_id

    def evaluate(self, context: DetectionContext) -> DetectionResult:
        text = f"{context.action} {context.description}"
        for entry in self._compiled:
            if entry["regex"].search(text):
                return DetectionResult(
                    detected=True,
                    rule_id=self._rule_id,
                    confidence=0.9,
                    suggested_category=JudgmentCategory(entry["category"]),
                    suggested_intervention=InterventionLevel(entry["intervention"]),
                    reason=entry["reason"],
                )
        return DetectionResult(detected=False, rule_id=self._rule_id)


def create_hook_detector() -> DeterministicDetector:
    """Create a detector configured for Claude Code hook processing.

    Combines tool-name rules, argument-pattern rules, and hard trigger
    rules into a single detector.
    """
    detector = DeterministicDetector()

    # Tool-name based detection
    detector.add_rule(ToolNameDetectionRule())

    # Argument pattern detection
    detector.add_rule(ArgumentPatternRule())

    # Hard trigger detection rules from core
    for rule in create_default_hard_trigger_rules():
        detector.add_rule(rule)

    return detector


def build_detection_context(
    tool_name: str,
    tool_input: dict[str, Any],
) -> DetectionContext:
    """Build a DetectionContext from a Claude Code hook event."""
    # Flatten tool input to a description string
    if tool_name == "Bash":
        description = tool_input.get("command", "")
    elif tool_name in ("Edit", "Write"):
        description = tool_input.get("file_path", "")
    else:
        description = json.dumps(tool_input, default=str)[:500]

    return DetectionContext(
        action=tool_name,
        description=description,
    )
