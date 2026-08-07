"""Tests for the judgment_core.detection module."""

from __future__ import annotations

import pytest

from judgment_core.detection import (
    DetectionContext,
    DeterministicDetector,
    HardTriggerDetectionRule,
    KeywordDetectionRule,
    create_default_hard_trigger_rules,
)
from judgment_core.types import InterventionLevel, JudgmentCategory

# ---------------------------------------------------------------------------
# KeywordDetectionRule
# ---------------------------------------------------------------------------


class TestKeywordDetectionRuleMatching:
    """Keyword rules match when keywords appear in action or description."""

    def test_matches_keyword_in_action(self) -> None:
        rule = KeywordDetectionRule(
            rule_id="r1",
            keywords=["delete"],
            category=JudgmentCategory.data,
        )
        ctx = DetectionContext(action="delete file", description="removing old data")
        result = rule.evaluate(ctx)
        assert result.detected is True
        assert result.rule_id == "r1"
        assert result.suggested_category == JudgmentCategory.data
        assert result.confidence == 1.0

    def test_matches_keyword_in_description(self) -> None:
        rule = KeywordDetectionRule(
            rule_id="r2",
            keywords=["safety factor"],
            category=JudgmentCategory.parameter,
        )
        ctx = DetectionContext(action="set value", description="choosing safety factor")
        result = rule.evaluate(ctx)
        assert result.detected is True
        assert "safety factor" in result.reason

    def test_no_match_when_keywords_absent(self) -> None:
        rule = KeywordDetectionRule(
            rule_id="r3",
            keywords=["override", "bypass"],
            category=JudgmentCategory.assumption,
        )
        ctx = DetectionContext(action="read config", description="load settings")
        result = rule.evaluate(ctx)
        assert result.detected is False
        assert result.rule_id == "r3"

    def test_match_is_case_insensitive(self) -> None:
        rule = KeywordDetectionRule(
            rule_id="r4",
            keywords=["EXCLUDE"],
            category=JudgmentCategory.data,
        )
        ctx = DetectionContext(action="exclude outliers", description="filter data")
        result = rule.evaluate(ctx)
        assert result.detected is True

    def test_default_intervention_is_pause(self) -> None:
        rule = KeywordDetectionRule(
            rule_id="r5",
            keywords=["modify"],
            category=JudgmentCategory.method,
        )
        ctx = DetectionContext(action="modify model", description="change approach")
        result = rule.evaluate(ctx)
        assert result.suggested_intervention == InterventionLevel.pause

    def test_custom_intervention_level(self) -> None:
        rule = KeywordDetectionRule(
            rule_id="r6",
            keywords=["log"],
            category=JudgmentCategory.assumption,
            intervention=InterventionLevel.trace,
        )
        ctx = DetectionContext(action="log decision", description="trace action")
        result = rule.evaluate(ctx)
        assert result.suggested_intervention == InterventionLevel.trace

    def test_hard_trigger_field_propagated(self) -> None:
        rule = KeywordDetectionRule(
            rule_id="r7",
            keywords=["redefin"],
            category=JudgmentCategory.objective,
            hard_trigger="objective-redefinition",
        )
        ctx = DetectionContext(action="redefine scope", description="changing objective")
        result = rule.evaluate(ctx)
        assert result.hard_trigger == "objective-redefinition"


# ---------------------------------------------------------------------------
# HardTriggerDetectionRule
# ---------------------------------------------------------------------------


class TestHardTriggerDetectionRule:
    """Hard trigger rules validate trigger names and match keywords."""

    def test_rejects_unknown_trigger_name(self) -> None:
        with pytest.raises(ValueError, match="Unknown hard trigger"):
            HardTriggerDetectionRule(trigger_name="nonexistent-trigger", keywords=["x"])

    def test_matches_keyword(self) -> None:
        rule = HardTriggerDetectionRule(
            trigger_name="data-exclusion",
            keywords=["exclud"],
        )
        ctx = DetectionContext(action="exclude rows", description="filtering")
        result = rule.evaluate(ctx)
        assert result.detected is True
        assert result.hard_trigger == "data-exclusion"
        assert result.rule_id == "hard-trigger:data-exclusion"

    def test_no_match_returns_not_detected(self) -> None:
        rule = HardTriggerDetectionRule(
            trigger_name="data-exclusion",
            keywords=["exclud"],
        )
        ctx = DetectionContext(action="read file", description="loading")
        result = rule.evaluate(ctx)
        assert result.detected is False


# ---------------------------------------------------------------------------
# DeterministicDetector
# ---------------------------------------------------------------------------


class TestDeterministicDetector:
    """Detector runs multiple rules and aggregates into a summary."""

    def test_no_rules_returns_empty_summary(self) -> None:
        detector = DeterministicDetector()
        ctx = DetectionContext(action="anything", description="whatever")
        summary = detector.detect(ctx)
        assert summary.has_detections is False
        assert summary.results == []
        assert summary.highest_intervention is None

    def test_no_matches_returns_empty_summary(self) -> None:
        rule = KeywordDetectionRule(
            rule_id="miss", keywords=["zzzzz"], category=JudgmentCategory.data
        )
        detector = DeterministicDetector(rules=[rule])
        ctx = DetectionContext(action="read", description="nothing special")
        summary = detector.detect(ctx)
        assert summary.has_detections is False
        assert summary.results == []

    def test_aggregates_multiple_matches(self) -> None:
        r1 = KeywordDetectionRule(
            rule_id="kw-1",
            keywords=["delete"],
            category=JudgmentCategory.data,
            intervention=InterventionLevel.disclose,
        )
        r2 = KeywordDetectionRule(
            rule_id="kw-2",
            keywords=["permanent"],
            category=JudgmentCategory.data,
            intervention=InterventionLevel.pause,
        )
        detector = DeterministicDetector(rules=[r1, r2])
        ctx = DetectionContext(action="delete record", description="permanent removal")
        summary = detector.detect(ctx)
        assert summary.has_detections is True
        assert len(summary.results) == 2
        rule_ids = {r.rule_id for r in summary.results}
        assert rule_ids == {"kw-1", "kw-2"}

    def test_highest_intervention_computed_correctly(self) -> None:
        r_trace = KeywordDetectionRule(
            rule_id="t",
            keywords=["log"],
            category=JudgmentCategory.assumption,
            intervention=InterventionLevel.trace,
        )
        r_require = KeywordDetectionRule(
            rule_id="ri",
            keywords=["redefin"],
            category=JudgmentCategory.objective,
            intervention=InterventionLevel.require_investigation,
        )
        detector = DeterministicDetector(rules=[r_trace, r_require])
        ctx = DetectionContext(action="log and redefine", description="test")
        summary = detector.detect(ctx)
        assert summary.highest_intervention == InterventionLevel.require_investigation

    def test_add_rule(self) -> None:
        detector = DeterministicDetector()
        rule = KeywordDetectionRule(
            rule_id="added", keywords=["hello"], category=JudgmentCategory.method
        )
        detector.add_rule(rule)
        ctx = DetectionContext(action="hello world", description="greeting")
        summary = detector.detect(ctx)
        assert summary.has_detections is True
        assert summary.results[0].rule_id == "added"


# ---------------------------------------------------------------------------
# create_default_hard_trigger_rules
# ---------------------------------------------------------------------------


class TestCreateDefaultHardTriggerRules:
    """Factory function should return one rule per known hard trigger."""

    def test_returns_ten_rules(self) -> None:
        rules = create_default_hard_trigger_rules()
        assert len(rules) == 10

    def test_all_rules_are_hard_trigger_rules(self) -> None:
        rules = create_default_hard_trigger_rules()
        for rule in rules:
            assert isinstance(rule, HardTriggerDetectionRule)
