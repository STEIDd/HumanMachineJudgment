"""Tests for judgment_core.policy_engine."""

from __future__ import annotations

from datetime import UTC, datetime

from judgment_core.policy_engine import (
    evaluate_policies,
    evaluate_policy,
    evaluate_rule_condition,
    matches_scope,
    resolve_conflicts,
)
from judgment_core.types import (
    JudgmentPoint,
    JudgmentPolicy,
    PolicyScope,
    RuleCondition,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_NOW = datetime.now(UTC).isoformat()


def _make_point(**overrides) -> JudgmentPoint:
    """Create a minimal JudgmentPoint, merging *overrides* on top of defaults."""
    data = {
        "id": "jp-1",
        "projectId": "proj-1",
        "category": "assumption",
        "question": "Test question?",
        "context": "Test context",
        "trigger": {"source": "agent", "description": "test trigger"},
        "materiality": {
            "score": 10,
            "dimensions": {
                "methodologicalDiscretion": 2,
                "downstreamInfluence": 2,
                "uncertainty": 2,
                "consequence": 1,
                "reversibility": 2,
                "accountabilityRequirement": 1,
            },
            "interventionLevel": "pause",
        },
        "status": "candidate",
        "alternatives": [],
        "affectedArtifactIds": [],
        "authority": {"mode": "collaborative"},
        "validityConditions": [],
        "reopenConditions": [],
        "createdAt": _NOW,
        "updatedAt": _NOW,
    }
    data.update(overrides)
    return JudgmentPoint.model_validate(data)


def _make_policy(**overrides) -> JudgmentPolicy:
    """Create a minimal JudgmentPolicy, merging *overrides* on top of defaults."""
    data = {
        "id": "pol-1",
        "projectId": "proj-1",
        "name": "Test Policy",
        "description": "A test policy",
        "scope": {},
        "rules": [
            {
                "id": "rule-1",
                "condition": {},
                "intervention": "pause",
            }
        ],
        "priority": 10,
        "enabled": True,
        "createdAt": _NOW,
        "updatedAt": _NOW,
    }
    data.update(overrides)
    return JudgmentPolicy.model_validate(data)


# ===================================================================
# matches_scope
# ===================================================================


class TestMatchesScope:
    """Tests for matches_scope()."""

    def test_empty_scope_matches_everything(self):
        point = _make_point()
        scope = PolicyScope.model_validate({})
        assert matches_scope(point, scope) is True

    def test_category_match(self):
        point = _make_point(category="assumption")
        scope = PolicyScope.model_validate({"categories": ["assumption", "method"]})
        assert matches_scope(point, scope) is True

    def test_category_mismatch(self):
        point = _make_point(category="data")
        scope = PolicyScope.model_validate({"categories": ["assumption", "method"]})
        assert matches_scope(point, scope) is False

    def test_trigger_source_match(self):
        point = _make_point(trigger={"source": "rule", "description": "rule trigger"})
        scope = PolicyScope.model_validate({"triggerSources": ["rule", "user"]})
        assert matches_scope(point, scope) is True

    def test_trigger_source_mismatch(self):
        point = _make_point(trigger={"source": "agent", "description": "agent trigger"})
        scope = PolicyScope.model_validate({"triggerSources": ["rule", "user"]})
        assert matches_scope(point, scope) is False

    def test_materiality_score_min_match(self):
        point = _make_point()  # score=10
        scope = PolicyScope.model_validate({"materialityScoreMin": 5})
        assert matches_scope(point, scope) is True

    def test_materiality_score_min_mismatch(self):
        point = _make_point()  # score=10
        scope = PolicyScope.model_validate({"materialityScoreMin": 15})
        assert matches_scope(point, scope) is False

    def test_materiality_score_max_match(self):
        point = _make_point()  # score=10
        scope = PolicyScope.model_validate({"materialityScoreMax": 15})
        assert matches_scope(point, scope) is True

    def test_materiality_score_max_mismatch(self):
        point = _make_point()  # score=10
        scope = PolicyScope.model_validate({"materialityScoreMax": 5})
        assert matches_scope(point, scope) is False

    def test_combined_scope_all_match(self):
        point = _make_point(
            category="method",
            trigger={"source": "user", "description": "user trigger"},
        )
        # score=10, so min=5 max=15 should match
        scope = PolicyScope.model_validate(
            {
                "categories": ["method"],
                "triggerSources": ["user"],
                "materialityScoreMin": 5,
                "materialityScoreMax": 15,
            }
        )
        assert matches_scope(point, scope) is True

    def test_combined_scope_one_mismatch_fails(self):
        point = _make_point(
            category="data",
            trigger={"source": "user", "description": "user trigger"},
        )
        scope = PolicyScope.model_validate(
            {
                "categories": ["method"],
                "triggerSources": ["user"],
            }
        )
        assert matches_scope(point, scope) is False


# ===================================================================
# evaluate_rule_condition
# ===================================================================


class TestEvaluateRuleCondition:
    """Tests for evaluate_rule_condition()."""

    def test_empty_condition_matches_everything(self):
        point = _make_point()
        condition = RuleCondition.model_validate({})
        assert evaluate_rule_condition(point, condition) is True

    def test_score_min_match(self):
        point = _make_point()  # score=10
        condition = RuleCondition.model_validate({"materialityScoreMin": 8})
        assert evaluate_rule_condition(point, condition) is True

    def test_score_min_mismatch(self):
        point = _make_point()  # score=10
        condition = RuleCondition.model_validate({"materialityScoreMin": 12})
        assert evaluate_rule_condition(point, condition) is False

    def test_score_max_match(self):
        point = _make_point()  # score=10
        condition = RuleCondition.model_validate({"materialityScoreMax": 12})
        assert evaluate_rule_condition(point, condition) is True

    def test_score_max_mismatch(self):
        point = _make_point()  # score=10
        condition = RuleCondition.model_validate({"materialityScoreMax": 8})
        assert evaluate_rule_condition(point, condition) is False

    def test_dimension_threshold_any_meets(self):
        """If any dimension meets or exceeds the threshold, condition matches."""
        point = _make_point()  # methodologicalDiscretion=2, uncertainty=2
        condition = RuleCondition.model_validate(
            {
                "dimensionThresholds": {"methodologicalDiscretion": 3, "uncertainty": 2},
            }
        )
        # uncertainty (2) >= threshold (2) => match
        assert evaluate_rule_condition(point, condition) is True

    def test_dimension_threshold_none_meets(self):
        """If no dimension meets the threshold, condition fails."""
        point = _make_point()  # consequence=1, accountabilityRequirement=1
        condition = RuleCondition.model_validate(
            {
                "dimensionThresholds": {"consequence": 3, "accountabilityRequirement": 3},
            }
        )
        assert evaluate_rule_condition(point, condition) is False

    def test_hard_trigger_match_on_trigger(self):
        point = _make_point(
            trigger={
                "source": "rule",
                "description": "hard",
                "hardTrigger": "regulatory_compliance",
            },
        )
        condition = RuleCondition.model_validate({"hardTrigger": "regulatory_compliance"})
        assert evaluate_rule_condition(point, condition) is True

    def test_hard_trigger_match_on_materiality(self):
        point = _make_point(
            materiality={
                "score": 10,
                "dimensions": {
                    "methodologicalDiscretion": 2,
                    "downstreamInfluence": 2,
                    "uncertainty": 2,
                    "consequence": 1,
                    "reversibility": 2,
                    "accountabilityRequirement": 1,
                },
                "interventionLevel": "pause",
                "hardTrigger": "safety_critical",
            },
        )
        condition = RuleCondition.model_validate({"hardTrigger": "safety_critical"})
        assert evaluate_rule_condition(point, condition) is True

    def test_hard_trigger_mismatch(self):
        point = _make_point()  # no hard trigger
        condition = RuleCondition.model_validate({"hardTrigger": "regulatory_compliance"})
        assert evaluate_rule_condition(point, condition) is False

    def test_categories_match(self):
        point = _make_point(category="data")
        condition = RuleCondition.model_validate({"categories": ["data", "parameter"]})
        assert evaluate_rule_condition(point, condition) is True

    def test_categories_mismatch(self):
        point = _make_point(category="assumption")
        condition = RuleCondition.model_validate({"categories": ["data", "parameter"]})
        assert evaluate_rule_condition(point, condition) is False


# ===================================================================
# evaluate_policy
# ===================================================================


class TestEvaluatePolicy:
    """Tests for evaluate_policy()."""

    def test_disabled_policy_returns_none(self):
        point = _make_point()
        policy = _make_policy(enabled=False)
        assert evaluate_policy(point, policy) is None

    def test_scope_mismatch_returns_none(self):
        point = _make_point(category="data")
        policy = _make_policy(scope={"categories": ["method"]})
        assert evaluate_policy(point, policy) is None

    def test_first_matching_rule_returned(self):
        point = _make_point()  # score=10, category=assumption
        policy = _make_policy(
            rules=[
                {
                    "id": "rule-no-match",
                    "condition": {"materialityScoreMin": 15},
                    "intervention": "trace",
                },
                {
                    "id": "rule-match",
                    "condition": {"materialityScoreMin": 5},
                    "intervention": "pause",
                },
                {
                    "id": "rule-also-match",
                    "condition": {},
                    "intervention": "disclose",
                },
            ],
        )
        result = evaluate_policy(point, policy)
        assert result is not None
        assert result.id == "rule-match"

    def test_no_rule_matches_returns_none(self):
        point = _make_point()  # score=10
        policy = _make_policy(
            rules=[
                {
                    "id": "rule-1",
                    "condition": {"materialityScoreMin": 15},
                    "intervention": "trace",
                },
            ],
        )
        assert evaluate_policy(point, policy) is None


# ===================================================================
# evaluate_policies / resolve_conflicts
# ===================================================================


class TestEvaluatePolicies:
    """Tests for evaluate_policies() and resolve_conflicts()."""

    def test_no_matching_policies_falls_back_to_point_intervention(self):
        point = _make_point()  # interventionLevel=pause
        result = evaluate_policies(point, [])
        assert result.intervention == "pause"
        assert result.matched_rules == []

    def test_no_matching_policies_no_intervention_falls_back_to_trace(self):
        point = _make_point(
            materiality={
                "score": 2,
                "dimensions": {
                    "methodologicalDiscretion": 1,
                    "downstreamInfluence": 0,
                    "uncertainty": 1,
                    "consequence": 0,
                    "reversibility": 0,
                    "accountabilityRequirement": 0,
                },
            },
        )
        # No intervention_level set on the point
        result = evaluate_policies(point, [])
        assert result.intervention == "trace"

    def test_single_matching_policy(self):
        point = _make_point()
        policy = _make_policy()
        result = evaluate_policies(point, [policy])
        assert result.intervention == "pause"
        assert len(result.matched_rules) == 1
        assert result.matched_rules[0].rule.id == "rule-1"

    def test_priority_sorting_lower_takes_precedence(self):
        point = _make_point()
        high_priority = _make_policy(
            id="pol-high",
            priority=1,
            rules=[{"id": "r-high", "condition": {}, "intervention": "require-investigation"}],
        )
        low_priority = _make_policy(
            id="pol-low",
            priority=100,
            rules=[{"id": "r-low", "condition": {}, "intervention": "trace"}],
        )
        result = evaluate_policies(point, [low_priority, high_priority])
        # First in sorted order is high_priority (priority=1)
        assert result.intervention == "require-investigation"

    def test_most_restrictive_intervention_at_equal_priority(self):
        point = _make_point()
        pol_a = _make_policy(
            id="pol-a",
            priority=10,
            rules=[{"id": "r-a", "condition": {}, "intervention": "disclose"}],
        )
        pol_b = _make_policy(
            id="pol-b",
            priority=10,
            rules=[{"id": "r-b", "condition": {}, "intervention": "pause"}],
        )
        result = evaluate_policies(point, [pol_a, pol_b])
        # Both at priority 10; pause is more restrictive than disclose
        assert result.intervention == "pause"

    def test_authority_override_propagated(self):
        point = _make_point()
        policy = _make_policy(
            rules=[
                {
                    "id": "rule-1",
                    "condition": {},
                    "intervention": "pause",
                    "authorityOverride": {"mode": "human"},
                }
            ],
        )
        result = evaluate_policies(point, [policy])
        assert result.authority == "human"

    def test_most_restrictive_authority_wins(self):
        point = _make_point()
        pol_a = _make_policy(
            id="pol-a",
            priority=5,
            rules=[
                {
                    "id": "r-a",
                    "condition": {},
                    "intervention": "pause",
                    "authorityOverride": {"mode": "collaborative"},
                }
            ],
        )
        pol_b = _make_policy(
            id="pol-b",
            priority=5,
            rules=[
                {
                    "id": "r-b",
                    "condition": {},
                    "intervention": "pause",
                    "authorityOverride": {"mode": "human"},
                }
            ],
        )
        result = evaluate_policies(point, [pol_a, pol_b])
        # human (rank 3) is more restrictive than collaborative (rank 2)
        assert result.authority == "human"

    def test_delegation_disallowed_overrides_all(self):
        point = _make_point()
        pol_a = _make_policy(
            id="pol-a",
            priority=5,
            rules=[
                {
                    "id": "r-a",
                    "condition": {},
                    "intervention": "pause",
                    "delegationConditions": {
                        "allowed": True,
                        "maxMaterialityScore": 12,
                    },
                }
            ],
        )
        pol_b = _make_policy(
            id="pol-b",
            priority=5,
            rules=[
                {
                    "id": "r-b",
                    "condition": {},
                    "intervention": "pause",
                    "delegationConditions": {"allowed": False},
                }
            ],
        )
        result = evaluate_policies(point, [pol_a, pol_b])
        assert result.delegation_conditions is not None
        assert result.delegation_conditions.allowed is False

    def test_delegation_conditions_merged(self):
        """Merging picks min of maxMaterialityScore, max of requiredConfidence,
        union of excludedCategories, and OR of requiresPriorHumanResolution."""
        point = _make_point()
        pol_a = _make_policy(
            id="pol-a",
            priority=1,
            rules=[
                {
                    "id": "r-a",
                    "condition": {},
                    "intervention": "pause",
                    "delegationConditions": {
                        "allowed": True,
                        "maxMaterialityScore": 10,
                        "requiredConfidence": 0.7,
                        "excludedCategories": ["data"],
                        "requiresPriorHumanResolution": False,
                    },
                }
            ],
        )
        pol_b = _make_policy(
            id="pol-b",
            priority=2,
            rules=[
                {
                    "id": "r-b",
                    "condition": {},
                    "intervention": "pause",
                    "delegationConditions": {
                        "allowed": True,
                        "maxMaterialityScore": 8,
                        "requiredConfidence": 0.9,
                        "excludedCategories": ["assumption"],
                        "requiresPriorHumanResolution": True,
                    },
                }
            ],
        )
        result = evaluate_policies(point, [pol_a, pol_b])
        dc = result.delegation_conditions
        assert dc is not None
        assert dc.allowed is True
        assert dc.max_materiality_score == 8  # min(10, 8)
        assert dc.required_confidence == 0.9  # max(0.7, 0.9)
        assert dc.requires_prior_human_resolution is True  # OR
        assert set(dc.excluded_categories) == {"data", "assumption"}

    def test_resolve_conflicts_empty_returns_trace(self):
        result = resolve_conflicts([])
        assert result.intervention == "trace"
        assert result.matched_rules == []

    def test_disabled_policy_skipped_in_evaluate_policies(self):
        point = _make_point()
        enabled = _make_policy(
            id="pol-en",
            priority=10,
            rules=[{"id": "r-en", "condition": {}, "intervention": "disclose"}],
        )
        disabled = _make_policy(
            id="pol-dis",
            priority=1,
            enabled=False,
            rules=[{"id": "r-dis", "condition": {}, "intervention": "require-investigation"}],
        )
        result = evaluate_policies(point, [enabled, disabled])
        assert len(result.matched_rules) == 1
        assert result.matched_rules[0].policy.id == "pol-en"
        assert result.intervention == "disclose"
