"""Tests for judgment_core.authority."""

from __future__ import annotations

from datetime import UTC, datetime

from judgment_core.authority import (
    can_actor_resolve,
    can_delegate,
    can_dismiss,
    can_investigate,
    can_mark_stale,
    can_promote,
    can_reopen,
    can_resolve,
    get_default_authority,
    validate_delegation_conditions,
)
from judgment_core.types import (
    Actor,
    AuthorityMode,
    DelegationConditions,
    InterventionLevel,
    JudgmentAuthority,
    JudgmentPoint,
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


# ===================================================================
# get_default_authority
# ===================================================================


class TestGetDefaultAuthority:
    """Tests for get_default_authority()."""

    def test_trace_returns_collaborative(self):
        assert get_default_authority(InterventionLevel.trace) == AuthorityMode.collaborative

    def test_disclose_returns_collaborative(self):
        assert get_default_authority(InterventionLevel.disclose) == AuthorityMode.collaborative

    def test_pause_returns_collaborative(self):
        assert get_default_authority(InterventionLevel.pause) == AuthorityMode.collaborative

    def test_require_investigation_returns_human(self):
        assert get_default_authority(InterventionLevel.require_investigation) == AuthorityMode.human


# ===================================================================
# can_actor_resolve
# ===================================================================


class TestCanActorResolve:
    """Tests for can_actor_resolve()."""

    def test_human_mode_user_actor_allowed(self):
        actor = Actor(id="user-1", type="user")
        authority = JudgmentAuthority.model_validate({"mode": "human"})
        assert can_actor_resolve(actor, authority) is True

    def test_human_mode_agent_actor_denied(self):
        actor = Actor(id="agent-1", type="agent")
        authority = JudgmentAuthority.model_validate({"mode": "human"})
        assert can_actor_resolve(actor, authority) is False

    def test_collaborative_mode_user_allowed(self):
        actor = Actor(id="user-1", type="user")
        authority = JudgmentAuthority.model_validate({"mode": "collaborative"})
        assert can_actor_resolve(actor, authority) is True

    def test_collaborative_mode_agent_denied(self):
        actor = Actor(id="agent-1", type="agent")
        authority = JudgmentAuthority.model_validate({"mode": "collaborative"})
        assert can_actor_resolve(actor, authority) is False

    def test_delegated_mode_user_allowed(self):
        actor = Actor(id="user-1", type="user")
        authority = JudgmentAuthority.model_validate({"mode": "delegated"})
        assert can_actor_resolve(actor, authority) is True

    def test_delegated_mode_agent_allowed(self):
        actor = Actor(id="agent-1", type="agent")
        authority = JudgmentAuthority.model_validate({"mode": "delegated"})
        assert can_actor_resolve(actor, authority) is True

    def test_rule_mode_any_actor_allowed(self):
        actor = Actor(id="system-1", type="agent")
        authority = JudgmentAuthority.model_validate({"mode": "rule"})
        assert can_actor_resolve(actor, authority) is True


# ===================================================================
# validate_delegation_conditions
# ===================================================================


class TestValidateDelegationConditions:
    """Tests for validate_delegation_conditions()."""

    def test_allowed_false_produces_reason(self):
        point = _make_point()
        conditions = DelegationConditions.model_validate({"allowed": False})
        result = validate_delegation_conditions(point, conditions)
        assert result.allowed is False
        assert any("not allowed" in r.lower() for r in result.reasons)

    def test_max_materiality_score_exceeded(self):
        point = _make_point()  # score=10
        conditions = DelegationConditions.model_validate(
            {
                "allowed": True,
                "maxMaterialityScore": 5,
            }
        )
        result = validate_delegation_conditions(point, conditions)
        assert result.allowed is False
        assert any("exceeds maximum" in r.lower() for r in result.reasons)

    def test_max_materiality_score_within_limit(self):
        point = _make_point()  # score=10
        conditions = DelegationConditions.model_validate(
            {
                "allowed": True,
                "maxMaterialityScore": 15,
            }
        )
        result = validate_delegation_conditions(point, conditions)
        assert result.allowed is True

    def test_required_confidence_below_threshold(self):
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
                "detectorConfidence": 0.5,
            },
        )
        conditions = DelegationConditions.model_validate(
            {
                "allowed": True,
                "requiredConfidence": 0.8,
            }
        )
        result = validate_delegation_conditions(point, conditions)
        assert result.allowed is False
        assert any("confidence" in r.lower() for r in result.reasons)

    def test_required_confidence_unset_on_point(self):
        point = _make_point()  # detectorConfidence is None by default
        conditions = DelegationConditions.model_validate(
            {
                "allowed": True,
                "requiredConfidence": 0.8,
            }
        )
        result = validate_delegation_conditions(point, conditions)
        assert result.allowed is False

    def test_required_confidence_met(self):
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
                "detectorConfidence": 0.95,
            },
        )
        conditions = DelegationConditions.model_validate(
            {
                "allowed": True,
                "requiredConfidence": 0.8,
            }
        )
        result = validate_delegation_conditions(point, conditions)
        assert result.allowed is True

    def test_excluded_category_matched(self):
        point = _make_point(category="assumption")
        conditions = DelegationConditions.model_validate(
            {
                "allowed": True,
                "excludedCategories": ["assumption", "method"],
            }
        )
        result = validate_delegation_conditions(point, conditions)
        assert result.allowed is False
        assert any("excluded" in r.lower() for r in result.reasons)

    def test_excluded_category_not_matched(self):
        point = _make_point(category="data")
        conditions = DelegationConditions.model_validate(
            {
                "allowed": True,
                "excludedCategories": ["assumption", "method"],
            }
        )
        result = validate_delegation_conditions(point, conditions)
        assert result.allowed is True

    def test_all_conditions_pass(self):
        point = _make_point(
            category="data",
            materiality={
                "score": 5,
                "dimensions": {
                    "methodologicalDiscretion": 1,
                    "downstreamInfluence": 1,
                    "uncertainty": 1,
                    "consequence": 1,
                    "reversibility": 1,
                    "accountabilityRequirement": 0,
                },
                "interventionLevel": "disclose",
                "detectorConfidence": 0.9,
            },
        )
        conditions = DelegationConditions.model_validate(
            {
                "allowed": True,
                "maxMaterialityScore": 10,
                "requiredConfidence": 0.8,
                "excludedCategories": ["assumption"],
            }
        )
        result = validate_delegation_conditions(point, conditions)
        assert result.allowed is True
        assert result.reasons == []


# ===================================================================
# can_promote
# ===================================================================


class TestCanPromote:
    """Tests for can_promote()."""

    def test_candidate_with_sufficient_materiality(self):
        point = _make_point(status="candidate")  # intervention_level=pause
        result = can_promote(point)
        assert result.allowed is True

    def test_wrong_status_disallowed(self):
        point = _make_point(status="pending")
        result = can_promote(point)
        assert result.allowed is False
        assert any("candidate" in r for r in result.reasons)

    def test_trace_intervention_no_hard_trigger_disallowed(self):
        point = _make_point(
            status="candidate",
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
                "interventionLevel": "trace",
            },
        )
        result = can_promote(point)
        assert result.allowed is False
        assert any("threshold" in r.lower() for r in result.reasons)

    def test_trace_but_hard_trigger_allowed(self):
        point = _make_point(
            status="candidate",
            trigger={"source": "rule", "description": "hard", "hardTrigger": "safety"},
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
                "interventionLevel": "trace",
            },
        )
        result = can_promote(point)
        assert result.allowed is True


# ===================================================================
# can_investigate
# ===================================================================


class TestCanInvestigate:
    """Tests for can_investigate()."""

    def test_pending_with_alternatives(self):
        point = _make_point(
            status="pending",
            alternatives=[
                {
                    "id": "alt-1",
                    "label": "Option A",
                    "description": "First option",
                }
            ],
        )
        result = can_investigate(point)
        assert result.allowed is True

    def test_reopened_with_alternatives(self):
        point = _make_point(
            status="reopened",
            alternatives=[
                {
                    "id": "alt-1",
                    "label": "Option A",
                    "description": "First option",
                }
            ],
        )
        result = can_investigate(point)
        assert result.allowed is True

    def test_wrong_status_disallowed(self):
        point = _make_point(
            status="candidate",
            alternatives=[
                {
                    "id": "alt-1",
                    "label": "Option A",
                    "description": "First option",
                }
            ],
        )
        result = can_investigate(point)
        assert result.allowed is False

    def test_no_alternatives_disallowed(self):
        point = _make_point(status="pending", alternatives=[])
        result = can_investigate(point)
        assert result.allowed is False
        assert any("alternative" in r.lower() for r in result.reasons)


# ===================================================================
# can_resolve
# ===================================================================


class TestCanResolve:
    """Tests for can_resolve()."""

    def test_valid_resolve(self):
        point = _make_point(
            status="investigating",
            authority={"mode": "collaborative"},
            alternatives=[
                {
                    "id": "alt-1",
                    "label": "Option A",
                    "description": "First option",
                }
            ],
        )
        actor = Actor(id="user-1", type="user")
        result = can_resolve(point, actor, "alt-1", "Good rationale")
        assert result.allowed is True

    def test_delegated_status_valid(self):
        point = _make_point(
            status="delegated",
            authority={"mode": "delegated"},
            alternatives=[
                {
                    "id": "alt-1",
                    "label": "Option A",
                    "description": "First option",
                }
            ],
        )
        actor = Actor(id="agent-1", type="agent")
        result = can_resolve(point, actor, "alt-1", "Delegated resolution")
        assert result.allowed is True

    def test_wrong_status_disallowed(self):
        point = _make_point(
            status="pending",
            alternatives=[
                {
                    "id": "alt-1",
                    "label": "Option A",
                    "description": "First option",
                }
            ],
        )
        actor = Actor(id="user-1", type="user")
        result = can_resolve(point, actor, "alt-1", "Rationale")
        assert result.allowed is False

    def test_unauthorized_actor_disallowed(self):
        point = _make_point(
            status="investigating",
            authority={"mode": "human"},
            alternatives=[
                {
                    "id": "alt-1",
                    "label": "Option A",
                    "description": "First option",
                }
            ],
        )
        actor = Actor(id="agent-1", type="agent")
        result = can_resolve(point, actor, "alt-1", "Rationale")
        assert result.allowed is False
        assert any("not authorized" in r.lower() for r in result.reasons)

    def test_nonexistent_alternative_disallowed(self):
        point = _make_point(
            status="investigating",
            alternatives=[
                {
                    "id": "alt-1",
                    "label": "Option A",
                    "description": "First option",
                }
            ],
        )
        actor = Actor(id="user-1", type="user")
        result = can_resolve(point, actor, "alt-99", "Rationale")
        assert result.allowed is False
        assert any("does not exist" in r.lower() for r in result.reasons)

    def test_empty_rationale_disallowed(self):
        point = _make_point(
            status="investigating",
            alternatives=[
                {
                    "id": "alt-1",
                    "label": "Option A",
                    "description": "First option",
                }
            ],
        )
        actor = Actor(id="user-1", type="user")
        result = can_resolve(point, actor, "alt-1", "   ")
        assert result.allowed is False
        assert any("rationale" in r.lower() for r in result.reasons)

    def test_multiple_reasons_accumulated(self):
        point = _make_point(
            status="pending",  # wrong status
            authority={"mode": "human"},  # agent not allowed
            alternatives=[
                {
                    "id": "alt-1",
                    "label": "Option A",
                    "description": "First option",
                }
            ],
        )
        actor = Actor(id="agent-1", type="agent")
        result = can_resolve(point, actor, "alt-99", "")  # bad alt, empty rationale
        assert result.allowed is False
        assert len(result.reasons) >= 3


# ===================================================================
# can_dismiss
# ===================================================================


class TestCanDismiss:
    """Tests for can_dismiss()."""

    def test_pending_with_non_investigation_level(self):
        point = _make_point(status="pending")
        result = can_dismiss(point, InterventionLevel.pause)
        assert result.allowed is True

    def test_reopened_allowed(self):
        point = _make_point(status="reopened")
        result = can_dismiss(point, InterventionLevel.disclose)
        assert result.allowed is True

    def test_wrong_status_disallowed(self):
        point = _make_point(status="investigating")
        result = can_dismiss(point, InterventionLevel.pause)
        assert result.allowed is False

    def test_require_investigation_level_disallowed(self):
        point = _make_point(status="pending")
        result = can_dismiss(point, InterventionLevel.require_investigation)
        assert result.allowed is False
        assert any("require-investigation" in r.lower() for r in result.reasons)


# ===================================================================
# can_delegate
# ===================================================================


class TestCanDelegate:
    """Tests for can_delegate()."""

    def test_pending_with_valid_conditions(self):
        point = _make_point(status="pending")
        conditions = DelegationConditions.model_validate(
            {
                "allowed": True,
                "maxMaterialityScore": 15,
            }
        )
        result = can_delegate(point, conditions)
        assert result.allowed is True

    def test_wrong_status_disallowed(self):
        point = _make_point(status="investigating")
        conditions = DelegationConditions.model_validate({"allowed": True})
        result = can_delegate(point, conditions)
        assert result.allowed is False

    def test_delegation_not_allowed_in_conditions(self):
        point = _make_point(status="pending")
        conditions = DelegationConditions.model_validate({"allowed": False})
        result = can_delegate(point, conditions)
        assert result.allowed is False


# ===================================================================
# can_mark_stale
# ===================================================================


class TestCanMarkStale:
    """Tests for can_mark_stale()."""

    def test_resolved_with_reason(self):
        point = _make_point(status="resolved")
        result = can_mark_stale(point, "Data changed")
        assert result.allowed is True

    def test_wrong_status_disallowed(self):
        point = _make_point(status="pending")
        result = can_mark_stale(point, "Data changed")
        assert result.allowed is False

    def test_empty_reason_disallowed(self):
        point = _make_point(status="resolved")
        result = can_mark_stale(point, "   ")
        assert result.allowed is False
        assert any("reason" in r.lower() for r in result.reasons)


# ===================================================================
# can_reopen
# ===================================================================


class TestCanReopen:
    """Tests for can_reopen()."""

    def test_resolved_with_reason(self):
        point = _make_point(status="resolved")
        result = can_reopen(point, "New evidence found")
        assert result.allowed is True

    def test_stale_with_reason(self):
        point = _make_point(status="stale")
        result = can_reopen(point, "Validity condition changed")
        assert result.allowed is True

    def test_dismissed_with_reason(self):
        point = _make_point(status="dismissed")
        result = can_reopen(point, "Reconsidered")
        assert result.allowed is True

    def test_wrong_status_disallowed(self):
        point = _make_point(status="pending")
        result = can_reopen(point, "Some reason")
        assert result.allowed is False

    def test_empty_reason_disallowed(self):
        point = _make_point(status="resolved")
        result = can_reopen(point, "")
        assert result.allowed is False
        assert any("reason" in r.lower() for r in result.reasons)

    def test_whitespace_only_reason_disallowed(self):
        point = _make_point(status="resolved")
        result = can_reopen(point, "   \t  ")
        assert result.allowed is False
