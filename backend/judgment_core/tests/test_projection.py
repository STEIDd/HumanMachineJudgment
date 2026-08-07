"""Tests for judgment_core.projection — event-sourced state projection."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from judgment_core.events import (
    create_alternative_added_event,
    create_artifact_linked_event,
    create_artifact_unlinked_event,
    create_created_event,
    create_delegated_event,
    create_investigation_started_event,
    create_promoted_event,
    create_reopened_event,
    create_resolution_recorded_event,
    create_validity_condition_changed_event,
)
from judgment_core.projection import apply_event, project_current_state
from judgment_core.types import (
    Actor,
    ArtifactReference,
    JudgmentAlternative,
    JudgmentResolution,
    JudgmentStatus,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

ACTOR = Actor(id="user-1", type="user")
JP_ID = "jp-001"
PROJECT_ID = "proj-001"

CANDIDATE_DATA = {
    "category": "assumption",
    "question": "Which model to use?",
    "context": "We need a regression model.",
    "trigger": {"source": "agent", "description": "Detected assumption"},
    "materiality": {
        "score": 6,
        "dimensions": {
            "methodologicalDiscretion": 1,
            "downstreamInfluence": 1,
            "uncertainty": 1,
            "consequence": 1,
            "reversibility": 1,
            "accountabilityRequirement": 1,
        },
    },
    "alternatives": [],
    "affectedArtifactIds": [],
    "authority": {"mode": "collaborative"},
    "validityConditions": [],
    "reopenConditions": [],
}


def _make_resolution() -> JudgmentResolution:
    return JudgmentResolution.model_validate(
        {
            "selectedAlternativeId": "alt-1",
            "rationale": "Best fit for our data",
            "resolvedAt": datetime.now(UTC).isoformat(),
        }
    )


def _make_artifact(artifact_id: str = "art-1") -> ArtifactReference:
    return ArtifactReference.model_validate(
        {
            "id": artifact_id,
            "label": "Test artifact",
            "artifactType": "cell",
            "relationship": "informs",
        }
    )


def _make_alternative(alt_id: str = "alt-1") -> JudgmentAlternative:
    return JudgmentAlternative.model_validate(
        {
            "id": alt_id,
            "label": f"Alternative {alt_id}",
            "description": "A test alternative",
        }
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestProjectCurrentStateErrors:
    def test_empty_events_raises_value_error(self) -> None:
        with pytest.raises(ValueError, match="empty"):
            project_current_state([])

    def test_first_event_not_created_raises_value_error(self) -> None:
        event = create_promoted_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            previous_status=JudgmentStatus.candidate,
            new_status=JudgmentStatus.pending,
        )
        with pytest.raises(ValueError, match="created"):
            project_current_state([event])


class TestProjectCurrentStateBasic:
    def test_single_created_event_produces_candidate(self) -> None:
        event = create_created_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            candidate_data=CANDIDATE_DATA,
        )
        point = project_current_state([event])

        assert point.id == JP_ID
        assert point.project_id == PROJECT_ID
        assert point.status == JudgmentStatus.candidate
        assert point.question == "Which model to use?"


class TestFullLifecycleProjection:
    def test_create_promote_investigate_resolve(self) -> None:
        created = create_created_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            candidate_data=CANDIDATE_DATA,
        )
        promoted = create_promoted_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            previous_status=JudgmentStatus.candidate,
            new_status=JudgmentStatus.pending,
        )
        investigated = create_investigation_started_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            previous_status=JudgmentStatus.pending,
            new_status=JudgmentStatus.investigating,
        )
        resolution = _make_resolution()
        resolved = create_resolution_recorded_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            previous_status=JudgmentStatus.investigating,
            resolution=resolution,
        )

        point = project_current_state([created, promoted, investigated, resolved])

        assert point.status == JudgmentStatus.resolved
        assert point.resolution is not None
        assert point.resolution.selected_alternative_id == "alt-1"


class TestReopenedPreservesRevisionHistory:
    def test_reopen_creates_revision_entry(self) -> None:
        created = create_created_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            candidate_data=CANDIDATE_DATA,
        )
        promoted = create_promoted_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            previous_status=JudgmentStatus.candidate,
            new_status=JudgmentStatus.pending,
        )
        investigated = create_investigation_started_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            previous_status=JudgmentStatus.pending,
            new_status=JudgmentStatus.investigating,
        )
        resolution = _make_resolution()
        resolved = create_resolution_recorded_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            previous_status=JudgmentStatus.investigating,
            resolution=resolution,
        )
        reopened = create_reopened_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            previous_status=JudgmentStatus.resolved,
            reason="New data invalidates previous conclusion",
        )

        point = project_current_state([created, promoted, investigated, resolved, reopened])

        assert point.status == JudgmentStatus.reopened
        assert point.resolution is None
        assert point.revision_history is not None
        assert len(point.revision_history) == 1
        revision = point.revision_history[0]
        assert revision.previous_status == "resolved"
        assert revision.new_status == "reopened"
        assert revision.reason == "New data invalidates previous conclusion"
        assert revision.previous_resolution is not None
        assert revision.previous_resolution.selected_alternative_id == "alt-1"


class TestArtifactLinkedUnlinked:
    def test_artifact_linked_adds_to_evidence_refs(self) -> None:
        created = create_created_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            candidate_data=CANDIDATE_DATA,
        )
        artifact = _make_artifact("art-1")
        linked = create_artifact_linked_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            artifact=artifact,
        )

        point = project_current_state([created, linked])

        assert point.evidence_refs is not None
        assert len(point.evidence_refs) == 1
        assert point.evidence_refs[0].id == "art-1"

    def test_artifact_unlinked_removes_from_evidence_refs(self) -> None:
        created = create_created_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            candidate_data=CANDIDATE_DATA,
        )
        artifact = _make_artifact("art-1")
        linked = create_artifact_linked_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            artifact=artifact,
        )
        unlinked = create_artifact_unlinked_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            artifact_id="art-1",
            reason="No longer relevant",
        )

        point = project_current_state([created, linked, unlinked])

        assert point.evidence_refs is not None
        assert len(point.evidence_refs) == 0


class TestAlternativeAdded:
    def test_adds_alternative_to_point(self) -> None:
        created = create_created_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            candidate_data=CANDIDATE_DATA,
        )
        alt = _make_alternative("alt-new")
        added = create_alternative_added_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            alternative=alt,
        )

        point = project_current_state([created, added])

        assert len(point.alternatives) == 1
        assert point.alternatives[0].id == "alt-new"
        assert point.alternatives[0].label == "Alternative alt-new"


class TestValidityConditionChanged:
    def test_add_new_condition(self) -> None:
        created = create_created_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            candidate_data=CANDIDATE_DATA,
        )
        changed = create_validity_condition_changed_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            reason="Adding temperature constraint",
            new_condition="Temperature < 500K",
        )

        point = project_current_state([created, changed])

        assert "Temperature < 500K" in point.validity_conditions

    def test_replace_existing_condition(self) -> None:
        data_with_conditions = {**CANDIDATE_DATA, "validityConditions": ["Temperature < 500K"]}
        created = create_created_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            candidate_data=data_with_conditions,
        )
        changed = create_validity_condition_changed_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            reason="Relaxing constraint",
            previous_condition="Temperature < 500K",
            new_condition="Temperature < 900K",
        )

        point = project_current_state([created, changed])

        assert "Temperature < 500K" not in point.validity_conditions
        assert "Temperature < 900K" in point.validity_conditions


class TestDelegatedUpdatesAuthority:
    def test_delegation_sets_authority_mode_and_actor(self) -> None:
        created = create_created_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            candidate_data=CANDIDATE_DATA,
        )
        promoted = create_promoted_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            previous_status=JudgmentStatus.candidate,
            new_status=JudgmentStatus.pending,
        )
        delegated = create_delegated_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            previous_status=JudgmentStatus.pending,
            delegate_id="agent-42",
            policy_id="policy-7",
        )

        point = project_current_state([created, promoted, delegated])

        assert point.status == JudgmentStatus.delegated
        assert point.authority.mode == "delegated"
        assert point.authority.actor_id == "agent-42"
        assert point.authority.policy_id == "policy-7"


class TestApplyEventDirectly:
    def test_apply_event_returns_new_point(self) -> None:
        created = create_created_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            candidate_data=CANDIDATE_DATA,
        )
        point = project_current_state([created])

        promoted = create_promoted_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            previous_status=JudgmentStatus.candidate,
            new_status=JudgmentStatus.pending,
        )
        updated = apply_event(point, promoted)

        assert updated.status == JudgmentStatus.pending
        # Original point is unchanged (model_validate creates a new instance)
        assert point.status == JudgmentStatus.candidate
