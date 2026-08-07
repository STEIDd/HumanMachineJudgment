"""Comprehensive tests for the JudgmentClient SDK.

Tests cover the full lifecycle, guard enforcement, query operations,
alternative/artifact management, comparison workflow, and materiality
assessment.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from judgment_core.errors import GuardError, InvalidTransitionError, NotFoundError
from judgment_core.types import (
    Actor,
    ArtifactReference,
    InterventionLevel,
    JudgmentAlternative,
    JudgmentResolution,
    JudgmentStatus,
    MaterialityDimensions,
)
from judgment_sdk import CreateCandidateParams, JudgmentClient
from judgment_storage_memory import MemoryStorage

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

USER_ACTOR = Actor(id="user-1", type="user")
AGENT_ACTOR = Actor(id="agent-1", type="agent")


def _candidate_params(
    *,
    project_id: str = "proj-1",
    intervention_level: str = "pause",
    alternatives: list[dict] | None = None,
    authority: dict | None = None,
) -> CreateCandidateParams:
    """Return a standard set of candidate parameters for tests."""
    return CreateCandidateParams(
        project_id=project_id,
        category="method",
        question="Which model to use?",
        context="Selecting a turbulence model",
        trigger={"source": "agent", "description": "Agent detected choice"},
        materiality={
            "score": 10,
            "dimensions": {
                "methodologicalDiscretion": 2,
                "downstreamInfluence": 2,
                "uncertainty": 1,
                "consequence": 2,
                "reversibility": 1,
                "accountabilityRequirement": 2,
            },
            "interventionLevel": intervention_level,
        },
        alternatives=alternatives
        if alternatives is not None
        else [
            {"id": "alt-1", "label": "k-epsilon", "description": "Standard k-epsilon model"},
            {"id": "alt-2", "label": "k-omega SST", "description": "Menter SST model"},
        ],
        authority=authority if authority is not None else {"mode": "human"},
    )


async def _create_test_candidate(
    client: JudgmentClient,
    *,
    project_id: str = "proj-1",
    intervention_level: str = "pause",
    alternatives: list[dict] | None = None,
    authority: dict | None = None,
):
    """Helper that creates and returns a candidate judgment point."""
    params = _candidate_params(
        project_id=project_id,
        intervention_level=intervention_level,
        alternatives=alternatives,
        authority=authority,
    )
    return await client.create_candidate(params, USER_ACTOR)


def _make_resolution(*, alternative_id: str = "alt-1") -> JudgmentResolution:
    """Create a valid resolution object for tests."""
    return JudgmentResolution.model_validate(
        {
            "selectedAlternativeId": alternative_id,
            "rationale": "k-epsilon is more validated for this flow regime",
            "resolvedAt": datetime.now(UTC).isoformat(),
            "resolvedBy": "user-1",
        }
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def storage() -> MemoryStorage:
    return MemoryStorage()


@pytest.fixture
def client(storage: MemoryStorage) -> JudgmentClient:
    return JudgmentClient(storage)


# ===========================================================================
# createCandidate tests
# ===========================================================================


class TestCreateCandidate:
    async def test_creates_candidate_with_correct_status(self, client: JudgmentClient):
        point = await _create_test_candidate(client)
        assert point.status == JudgmentStatus.candidate

    async def test_assigns_unique_id(self, client: JudgmentClient):
        point = await _create_test_candidate(client)
        assert point.id
        assert len(point.id) > 0

    async def test_stores_point_in_storage(self, client: JudgmentClient):
        point = await _create_test_candidate(client)
        stored = await client.get_judgment_point(point.id)
        assert stored is not None
        assert stored.id == point.id

    async def test_creates_created_event(self, client: JudgmentClient):
        point = await _create_test_candidate(client)
        events = await client.get_events(point.id)
        assert len(events) == 1
        assert events[0].event_type == "created"

    async def test_preserves_category_and_question(self, client: JudgmentClient):
        point = await _create_test_candidate(client)
        assert point.category == "method"
        assert point.question == "Which model to use?"

    async def test_preserves_alternatives(self, client: JudgmentClient):
        point = await _create_test_candidate(client)
        assert len(point.alternatives) == 2
        assert point.alternatives[0].id == "alt-1"
        assert point.alternatives[1].id == "alt-2"


# ===========================================================================
# Full lifecycle tests
# ===========================================================================


class TestFullLifecycle:
    async def test_candidate_to_pending_to_investigating_to_resolved(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)
        assert candidate.status == JudgmentStatus.candidate

        pending = await client.promote(candidate.id, USER_ACTOR)
        assert pending.status == JudgmentStatus.pending

        investigating = await client.start_investigation(pending.id, USER_ACTOR)
        assert investigating.status == JudgmentStatus.investigating

        resolution = _make_resolution()
        resolved = await client.resolve(investigating.id, resolution, USER_ACTOR)
        assert resolved.status == JudgmentStatus.resolved
        assert resolved.resolution is not None
        assert resolved.resolution.selected_alternative_id == "alt-1"

        events = await client.get_events(resolved.id)
        assert len(events) == 4

    async def test_resolved_to_stale_to_reopened(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)
        await client.promote(candidate.id, USER_ACTOR)
        await client.start_investigation(candidate.id, USER_ACTOR)
        await client.resolve(candidate.id, _make_resolution(), USER_ACTOR)

        stale = await client.mark_stale(candidate.id, "Upstream dependency changed", USER_ACTOR)
        assert stale.status == JudgmentStatus.stale

        reopened = await client.reopen(candidate.id, "Re-evaluate with new data", USER_ACTOR)
        assert reopened.status == JudgmentStatus.reopened

    async def test_pending_to_dismissed_to_reopened(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)
        await client.promote(candidate.id, USER_ACTOR)

        dismissed = await client.dismiss(candidate.id, "Not relevant", USER_ACTOR)
        assert dismissed.status == JudgmentStatus.dismissed

        reopened = await client.reopen(candidate.id, "New information available", USER_ACTOR)
        assert reopened.status == JudgmentStatus.reopened

    async def test_pending_to_delegated_to_resolved(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)
        await client.promote(candidate.id, USER_ACTOR)

        delegated = await client.delegate(
            candidate.id, "agent-1", "delegation-policy-1", USER_ACTOR
        )
        assert delegated.status == JudgmentStatus.delegated

        # Delegated authority mode allows any actor to resolve
        resolution = _make_resolution()
        resolved = await client.resolve(candidate.id, resolution, AGENT_ACTOR)
        assert resolved.status == JudgmentStatus.resolved


# ===========================================================================
# Promote tests
# ===========================================================================


class TestPromote:
    async def test_promotes_candidate_to_pending(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)
        pending = await client.promote(candidate.id, USER_ACTOR)
        assert pending.status == JudgmentStatus.pending

    async def test_raises_not_found_for_unknown_id(self, client: JudgmentClient):
        with pytest.raises(NotFoundError):
            await client.promote("unknown-id", USER_ACTOR)

    async def test_raises_invalid_transition_from_pending(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)
        await client.promote(candidate.id, USER_ACTOR)

        with pytest.raises(InvalidTransitionError):
            await client.promote(candidate.id, USER_ACTOR)


# ===========================================================================
# Resolve guards
# ===========================================================================


class TestResolveGuards:
    async def test_resolve_unauthorized_actor_raises_guard_error(self, client: JudgmentClient):
        """An agent cannot resolve a point with human authority mode."""
        candidate = await _create_test_candidate(client, authority={"mode": "human"})
        await client.promote(candidate.id, USER_ACTOR)
        await client.start_investigation(candidate.id, USER_ACTOR)

        resolution = _make_resolution()
        with pytest.raises(GuardError):
            await client.resolve(candidate.id, resolution, AGENT_ACTOR)

    async def test_resolve_nonexistent_alternative_raises_guard_error(self, client: JudgmentClient):
        """Resolving with an alternative ID that does not exist is rejected."""
        candidate = await _create_test_candidate(client)
        await client.promote(candidate.id, USER_ACTOR)
        await client.start_investigation(candidate.id, USER_ACTOR)

        bad_resolution = _make_resolution(alternative_id="alt-nonexistent")
        with pytest.raises(GuardError):
            await client.resolve(candidate.id, bad_resolution, USER_ACTOR)

    async def test_resolve_from_wrong_status_raises(self, client: JudgmentClient):
        """Cannot resolve from candidate status."""
        candidate = await _create_test_candidate(client)

        resolution = _make_resolution()
        with pytest.raises(InvalidTransitionError):
            await client.resolve(candidate.id, resolution, USER_ACTOR)


# ===========================================================================
# Dismiss guards
# ===========================================================================


class TestDismissGuards:
    async def test_dismiss_from_pending(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)
        await client.promote(candidate.id, USER_ACTOR)

        dismissed = await client.dismiss(candidate.id, "Not relevant", USER_ACTOR)
        assert dismissed.status == JudgmentStatus.dismissed

    async def test_dismiss_require_investigation_raises_guard_error(self, client: JudgmentClient):
        """Points with require-investigation intervention cannot be dismissed."""
        candidate = await _create_test_candidate(client, intervention_level="require-investigation")
        await client.promote(candidate.id, USER_ACTOR)

        with pytest.raises(GuardError):
            await client.dismiss(candidate.id, "Not relevant", USER_ACTOR)

    async def test_dismiss_from_wrong_status_raises(self, client: JudgmentClient):
        """Cannot dismiss from candidate status."""
        candidate = await _create_test_candidate(client)

        with pytest.raises(InvalidTransitionError):
            await client.dismiss(candidate.id, "reason", USER_ACTOR)


# ===========================================================================
# Reopen tests
# ===========================================================================


class TestReopen:
    async def test_reopen_dismissed(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)
        await client.promote(candidate.id, USER_ACTOR)
        await client.dismiss(candidate.id, "Not relevant", USER_ACTOR)

        reopened = await client.reopen(candidate.id, "New information available", USER_ACTOR)
        assert reopened.status == JudgmentStatus.reopened

    async def test_reopen_resolved(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)
        await client.promote(candidate.id, USER_ACTOR)
        await client.start_investigation(candidate.id, USER_ACTOR)
        await client.resolve(candidate.id, _make_resolution(), USER_ACTOR)

        reopened = await client.reopen(candidate.id, "Decision needs revisiting", USER_ACTOR)
        assert reopened.status == JudgmentStatus.reopened
        # Resolution should be cleared on reopen
        assert reopened.resolution is None

    async def test_reopen_stale(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)
        await client.promote(candidate.id, USER_ACTOR)
        await client.start_investigation(candidate.id, USER_ACTOR)
        await client.resolve(candidate.id, _make_resolution(), USER_ACTOR)
        await client.mark_stale(candidate.id, "Upstream changed", USER_ACTOR)

        reopened = await client.reopen(candidate.id, "Reassessing", USER_ACTOR)
        assert reopened.status == JudgmentStatus.reopened

    async def test_reopen_from_wrong_status_raises(self, client: JudgmentClient):
        """Cannot reopen from candidate status."""
        candidate = await _create_test_candidate(client)

        with pytest.raises(InvalidTransitionError):
            await client.reopen(candidate.id, "reason", USER_ACTOR)


# ===========================================================================
# Mark stale tests
# ===========================================================================


class TestMarkStale:
    async def test_marks_resolved_as_stale(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)
        await client.promote(candidate.id, USER_ACTOR)
        await client.start_investigation(candidate.id, USER_ACTOR)
        await client.resolve(candidate.id, _make_resolution(), USER_ACTOR)

        stale = await client.mark_stale(candidate.id, "Upstream dependency changed", USER_ACTOR)
        assert stale.status == JudgmentStatus.stale

    async def test_mark_stale_from_pending_raises(self, client: JudgmentClient):
        """Can only mark stale from resolved."""
        candidate = await _create_test_candidate(client)
        await client.promote(candidate.id, USER_ACTOR)

        with pytest.raises((InvalidTransitionError, GuardError)):
            await client.mark_stale(candidate.id, "reason", USER_ACTOR)


# ===========================================================================
# Delegate tests
# ===========================================================================


class TestDelegate:
    async def test_delegates_from_pending(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)
        await client.promote(candidate.id, USER_ACTOR)

        delegated = await client.delegate(
            candidate.id, "agent-1", "delegation-policy-1", USER_ACTOR
        )
        assert delegated.status == JudgmentStatus.delegated

    async def test_delegate_from_wrong_status_raises(self, client: JudgmentClient):
        """Cannot delegate from candidate status."""
        candidate = await _create_test_candidate(client)

        with pytest.raises(InvalidTransitionError):
            await client.delegate(candidate.id, "agent-1", "policy-1", USER_ACTOR)


# ===========================================================================
# Query tests
# ===========================================================================


class TestQueries:
    async def test_get_judgment_point_returns_none_for_unknown(self, client: JudgmentClient):
        result = await client.get_judgment_point("unknown-id")
        assert result is None

    async def test_list_judgment_points_returns_paginated(self, client: JudgmentClient):
        await _create_test_candidate(client)
        await _create_test_candidate(client)

        result = await client.list_judgment_points("proj-1")
        assert len(result.items) == 2
        assert result.total == 2

    async def test_list_judgment_points_different_project(self, client: JudgmentClient):
        await _create_test_candidate(client, project_id="proj-1")
        await _create_test_candidate(client, project_id="proj-2")

        result = await client.list_judgment_points("proj-1")
        assert len(result.items) == 1
        assert result.total == 1

    async def test_get_events_returns_event_history(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)
        await client.promote(candidate.id, USER_ACTOR)

        events = await client.get_events(candidate.id)
        assert len(events) == 2
        assert events[0].event_type == "created"
        assert events[1].event_type == "promoted"

    async def test_get_events_returns_empty_for_unknown(self, client: JudgmentClient):
        events = await client.get_events("unknown-id")
        assert events == []


# ===========================================================================
# Alternative tests
# ===========================================================================


class TestAlternatives:
    async def test_add_alternative_appends(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)

        alt = JudgmentAlternative.model_validate(
            {
                "id": "alt-3",
                "label": "SA model",
                "description": "Spalart-Allmaras model",
            }
        )
        updated = await client.add_alternative(candidate.id, alt, USER_ACTOR)
        assert len(updated.alternatives) == 3
        assert updated.alternatives[2].id == "alt-3"

    async def test_add_alternative_creates_event(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)

        alt = JudgmentAlternative.model_validate(
            {
                "id": "alt-3",
                "label": "SA model",
                "description": "Spalart-Allmaras model",
            }
        )
        await client.add_alternative(candidate.id, alt, USER_ACTOR)

        events = await client.get_events(candidate.id)
        assert len(events) == 2
        assert events[1].event_type == "alternative-added"


# ===========================================================================
# Artifact tests
# ===========================================================================


class TestArtifacts:
    async def test_link_artifact(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)

        artifact = ArtifactReference.model_validate(
            {
                "id": "art-1",
                "artifactType": "document",
                "label": "Turbulence modeling guide",
                "relationship": "informs",
            }
        )
        updated = await client.link_artifact(candidate.id, artifact, USER_ACTOR)
        assert updated.evidence_refs is not None
        assert len(updated.evidence_refs) == 1
        assert updated.evidence_refs[0].id == "art-1"

    async def test_unlink_artifact(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)

        artifact = ArtifactReference.model_validate(
            {
                "id": "art-1",
                "artifactType": "document",
                "label": "Turbulence modeling guide",
                "relationship": "informs",
            }
        )
        with_artifact = await client.link_artifact(candidate.id, artifact, USER_ACTOR)
        assert len(with_artifact.evidence_refs) == 1

        without = await client.unlink_artifact(
            candidate.id, "art-1", "No longer relevant", USER_ACTOR
        )
        assert len(without.evidence_refs) == 0

    async def test_link_artifact_creates_event(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)

        artifact = ArtifactReference.model_validate(
            {
                "id": "art-1",
                "artifactType": "document",
                "label": "Turbulence modeling guide",
                "relationship": "informs",
            }
        )
        await client.link_artifact(candidate.id, artifact, USER_ACTOR)

        events = await client.get_events(candidate.id)
        assert len(events) == 2
        assert events[1].event_type == "artifact-linked"

    async def test_unlink_artifact_creates_event(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)

        artifact = ArtifactReference.model_validate(
            {
                "id": "art-1",
                "artifactType": "document",
                "label": "Guide",
                "relationship": "informs",
            }
        )
        await client.link_artifact(candidate.id, artifact, USER_ACTOR)
        await client.unlink_artifact(candidate.id, "art-1", "reason", USER_ACTOR)

        events = await client.get_events(candidate.id)
        assert len(events) == 3
        assert events[2].event_type == "artifact-unlinked"


# ===========================================================================
# Comparison tests
# ===========================================================================


class TestComparisons:
    async def test_request_comparison(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)

        updated = await client.request_comparison(
            candidate.id,
            ["alt-1", "alt-2"],
            USER_ACTOR,
            criteria="accuracy vs speed",
        )
        # The point itself doesn't change status on comparison request
        assert updated.id == candidate.id

        events = await client.get_events(candidate.id)
        assert events[-1].event_type == "comparison-requested"

    async def test_complete_comparison(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)

        results = {
            "winner": "alt-1",
            "scores": {"alt-1": 0.85, "alt-2": 0.72},
        }
        updated = await client.complete_comparison(candidate.id, results, USER_ACTOR)
        assert updated.id == candidate.id

        events = await client.get_events(candidate.id)
        assert events[-1].event_type == "comparison-completed"


# ===========================================================================
# Materiality tests
# ===========================================================================


class TestMateriality:
    def test_assess_materiality_computes_score(self, client: JudgmentClient):
        dims = MaterialityDimensions.model_validate(
            {
                "methodologicalDiscretion": 3,
                "downstreamInfluence": 3,
                "uncertainty": 3,
                "consequence": 3,
                "reversibility": 3,
                "accountabilityRequirement": 3,
            }
        )
        assessment = client.assess_materiality(dims)
        assert assessment.score == 18
        assert assessment.intervention_level == InterventionLevel.require_investigation

    def test_assess_materiality_trace_level(self, client: JudgmentClient):
        dims = MaterialityDimensions.model_validate(
            {
                "methodologicalDiscretion": 0,
                "downstreamInfluence": 0,
                "uncertainty": 0,
                "consequence": 0,
                "reversibility": 0,
                "accountabilityRequirement": 0,
            }
        )
        assessment = client.assess_materiality(dims)
        assert assessment.score == 0
        assert assessment.intervention_level == InterventionLevel.trace

    def test_assess_materiality_with_hard_trigger(self, client: JudgmentClient):
        dims = MaterialityDimensions.model_validate(
            {
                "methodologicalDiscretion": 1,
                "downstreamInfluence": 0,
                "uncertainty": 0,
                "consequence": 0,
                "reversibility": 0,
                "accountabilityRequirement": 0,
            }
        )
        assessment = client.assess_materiality(dims, hard_trigger="safety-critical")
        assert assessment.hard_trigger == "safety-critical"
        assert assessment.score == 1

    def test_assess_materiality_disclose_level(self, client: JudgmentClient):
        dims = MaterialityDimensions.model_validate(
            {
                "methodologicalDiscretion": 1,
                "downstreamInfluence": 1,
                "uncertainty": 1,
                "consequence": 1,
                "reversibility": 1,
                "accountabilityRequirement": 1,
            }
        )
        assessment = client.assess_materiality(dims)
        assert assessment.score == 6
        assert assessment.intervention_level == InterventionLevel.disclose


# ===========================================================================
# Policy tests
# ===========================================================================


class TestPolicies:
    async def test_add_and_get_policies(self, client: JudgmentClient):
        from judgment_core.types import JudgmentPolicy

        now = datetime.now(UTC)
        policy = JudgmentPolicy.model_validate(
            {
                "id": "policy-1",
                "projectId": "proj-1",
                "name": "Test Policy",
                "description": "A policy for testing",
                "scope": {},
                "rules": [
                    {
                        "id": "rule-1",
                        "condition": {},
                        "intervention": "pause",
                    }
                ],
                "priority": 1,
                "enabled": True,
                "createdAt": now.isoformat(),
                "updatedAt": now.isoformat(),
            }
        )

        await client.add_policy(policy)
        policies = await client.get_policies("proj-1")
        assert len(policies) == 1
        assert policies[0].id == "policy-1"

    async def test_update_policy(self, client: JudgmentClient):
        from judgment_core.types import JudgmentPolicy

        now = datetime.now(UTC)
        policy = JudgmentPolicy.model_validate(
            {
                "id": "policy-1",
                "projectId": "proj-1",
                "name": "Test Policy",
                "description": "A policy for testing",
                "scope": {},
                "rules": [
                    {
                        "id": "rule-1",
                        "condition": {},
                        "intervention": "pause",
                    }
                ],
                "priority": 1,
                "enabled": True,
                "createdAt": now.isoformat(),
                "updatedAt": now.isoformat(),
            }
        )

        await client.add_policy(policy)

        updated_policy = JudgmentPolicy.model_validate(
            {
                "id": "policy-1",
                "projectId": "proj-1",
                "name": "Updated Policy",
                "description": "An updated policy",
                "scope": {},
                "rules": [
                    {
                        "id": "rule-1",
                        "condition": {},
                        "intervention": "require-investigation",
                    }
                ],
                "priority": 0,
                "enabled": True,
                "createdAt": now.isoformat(),
                "updatedAt": now.isoformat(),
            }
        )
        await client.update_policy(updated_policy)

        policies = await client.get_policies("proj-1")
        assert len(policies) == 1
        assert policies[0].name == "Updated Policy"


# ===========================================================================
# Revision history tests
# ===========================================================================


class TestRevisionHistory:
    async def test_reopen_populates_revision_history(self, client: JudgmentClient):
        candidate = await _create_test_candidate(client)
        await client.promote(candidate.id, USER_ACTOR)
        await client.start_investigation(candidate.id, USER_ACTOR)
        await client.resolve(candidate.id, _make_resolution(), USER_ACTOR)

        reopened = await client.reopen(candidate.id, "New evidence found", USER_ACTOR)
        assert reopened.revision_history is not None
        assert len(reopened.revision_history) == 1
        assert reopened.revision_history[0].reason == "New evidence found"
        assert reopened.revision_history[0].previous_status == "resolved"
        assert reopened.revision_history[0].new_status == "reopened"
