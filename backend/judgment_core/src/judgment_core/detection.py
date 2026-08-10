"""Detection framework for identifying judgment points in agent workflows.

Provides deterministic rule-based detection and a protocol for model-based detection.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable

from judgment_core.hard_triggers import (
    ALL_HARD_TRIGGERS,
    get_hard_trigger_intervention,
    is_hard_trigger,
)
from judgment_core.types import InterventionLevel, JudgmentCategory


@dataclass(frozen=True)
class DetectionContext:
    """Context provided to detection rules for evaluation."""

    action: str
    description: str
    category: JudgmentCategory | None = None
    artifact_ids: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class DetectionResult:
    """Result of a detection rule evaluation."""

    detected: bool
    rule_id: str
    confidence: float = 1.0
    hard_trigger: str | None = None
    suggested_category: JudgmentCategory | None = None
    suggested_intervention: InterventionLevel | None = None
    reason: str = ""


@dataclass(frozen=True)
class DetectionSummary:
    """Aggregated results from running all detection rules."""

    results: list[DetectionResult] = field(default_factory=list)
    has_detections: bool = False
    highest_intervention: InterventionLevel | None = None


@runtime_checkable
class DetectionRule(Protocol):
    """Protocol for detection rules."""

    @property
    def rule_id(self) -> str: ...

    def evaluate(self, context: DetectionContext) -> DetectionResult: ...


class KeywordDetectionRule:
    """A deterministic detection rule that matches keywords in action descriptions."""

    def __init__(
        self,
        rule_id: str,
        keywords: list[str],
        category: JudgmentCategory,
        intervention: InterventionLevel = InterventionLevel.pause,
        hard_trigger: str | None = None,
    ) -> None:
        self._rule_id = rule_id
        self._keywords = [kw.lower() for kw in keywords]
        self._category = category
        self._intervention = intervention
        self._hard_trigger = hard_trigger

    @property
    def rule_id(self) -> str:
        return self._rule_id

    def evaluate(self, context: DetectionContext) -> DetectionResult:
        text = f"{context.action} {context.description}".lower()
        matched = [kw for kw in self._keywords if kw in text]
        if not matched:
            return DetectionResult(detected=False, rule_id=self._rule_id)

        return DetectionResult(
            detected=True,
            rule_id=self._rule_id,
            confidence=1.0,
            hard_trigger=self._hard_trigger,
            suggested_category=self._category,
            suggested_intervention=self._intervention,
            reason=f"Matched keywords: {', '.join(matched)}",
        )


class RegexDetectionRule:
    """A detection rule that matches regex patterns in action descriptions."""

    def __init__(
        self,
        rule_id: str,
        patterns: list[str],
        category: JudgmentCategory,
        intervention: InterventionLevel = InterventionLevel.pause,
        hard_trigger: str | None = None,
    ) -> None:
        import re

        self._rule_id = rule_id
        self._patterns = [re.compile(p, re.IGNORECASE) for p in patterns]
        self._category = category
        self._intervention = intervention
        self._hard_trigger = hard_trigger

    @property
    def rule_id(self) -> str:
        return self._rule_id

    def evaluate(self, context: DetectionContext) -> DetectionResult:
        text = f"{context.action} {context.description}"
        matched = [p.pattern for p in self._patterns if p.search(text)]
        if not matched:
            return DetectionResult(detected=False, rule_id=self._rule_id)

        return DetectionResult(
            detected=True,
            rule_id=self._rule_id,
            confidence=1.0,
            hard_trigger=self._hard_trigger,
            suggested_category=self._category,
            suggested_intervention=self._intervention,
            reason=f"Matched patterns: {', '.join(matched)}",
        )


class HardTriggerDetectionRule:
    """A detection rule that checks for hard trigger patterns."""

    def __init__(self, trigger_name: str, keywords: list[str]) -> None:
        if not is_hard_trigger(trigger_name):
            raise ValueError(f"Unknown hard trigger: {trigger_name}")
        self._trigger_name = trigger_name
        self._keywords = [kw.lower() for kw in keywords]

    @property
    def rule_id(self) -> str:
        return f"hard-trigger:{self._trigger_name}"

    def evaluate(self, context: DetectionContext) -> DetectionResult:
        text = f"{context.action} {context.description}".lower()
        matched = [kw for kw in self._keywords if kw in text]
        if not matched:
            return DetectionResult(detected=False, rule_id=self.rule_id)

        return DetectionResult(
            detected=True,
            rule_id=self.rule_id,
            confidence=1.0,
            hard_trigger=self._trigger_name,
            suggested_intervention=get_hard_trigger_intervention(self._trigger_name),
            reason=f"Hard trigger '{self._trigger_name}' matched: {', '.join(matched)}",
        )


@runtime_checkable
class ModelDetectorAdapter(Protocol):
    """Protocol for model-based detection adapters.

    Implementations wrap LLM calls to detect judgment points that
    deterministic rules would miss.
    """

    async def detect(self, context: DetectionContext) -> list[DetectionResult]: ...


class DeterministicDetector:
    """Runs a set of detection rules against a context."""

    def __init__(self, rules: list[DetectionRule] | None = None) -> None:
        self._rules: list[DetectionRule] = list(rules) if rules else []

    def add_rule(self, rule: DetectionRule) -> None:
        self._rules.append(rule)

    def detect(self, context: DetectionContext) -> DetectionSummary:
        results: list[DetectionResult] = []
        for rule in self._rules:
            result = rule.evaluate(context)
            if result.detected:
                results.append(result)

        if not results:
            return DetectionSummary(results=[], has_detections=False)

        # Find highest intervention level
        intervention_rank = {
            InterventionLevel.trace: 0,
            InterventionLevel.disclose: 1,
            InterventionLevel.pause: 2,
            InterventionLevel.require_investigation: 3,
        }
        highest: InterventionLevel | None = None
        for r in results:
            if r.suggested_intervention is not None and (
                highest is None
                or intervention_rank.get(r.suggested_intervention, 0)
                > intervention_rank.get(highest, 0)
            ):
                highest = r.suggested_intervention

        return DetectionSummary(
            results=results,
            has_detections=True,
            highest_intervention=highest,
        )


def create_default_hard_trigger_rules() -> list[HardTriggerDetectionRule]:
    """Create default detection rules for all known hard triggers."""
    trigger_keywords: dict[str, list[str]] = {
        "objective-redefinition": [
            "redefin",
            "chang objective",
            "modify objective",
            "new objective",
        ],
        "safety-factor-selection": ["safety factor", "design margin", "knockdown"],
        "data-exclusion": ["exclud", "filter out", "discard", "remove data"],
        "irreversible-commitment": ["irreversib", "cannot undo", "permanent"],
        "validation-criterion-selection": ["validation criter", "acceptance criter", "pass/fail"],
        "external-requirement-interpretation": ["interpret requirement", "interpret standard"],
        "contradictory-evidence": ["contradict", "conflict with", "inconsistent"],
        "model-substitution": ["substitut model", "replac model", "different model"],
        "worst-case-best-case-assumption": ["worst case", "best case", "conservative estimate"],
        "conclusion-recommendation-formulation": ["recommend", "conclude", "formulate conclusion"],
    }

    rules: list[HardTriggerDetectionRule] = []
    for trigger in ALL_HARD_TRIGGERS:
        keywords = trigger_keywords.get(trigger.name, [trigger.name.replace("-", " ")])
        rules.append(HardTriggerDetectionRule(trigger.name, keywords))
    return rules
