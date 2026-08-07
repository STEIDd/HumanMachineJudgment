"""Tests for judgment_core.events — event creation functions."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from judgment_core.events import (
    create_alternative_added_event,
    create_artifact_linked_event,
    create_artifact_unlinked_event,
    create_comparison_completed_event,
    create_comparison_requested_event,
    create_created_event,
    create_delegated_event,
    create_dependency_changed_event,
    create_dismissed_event,
    create_investigation_started_event,
    create_marked_stale_event,
    create_promoted_event,
    create_reopened_event,
    create_resolution_recorded_event,
    create_validity_condition_changed_event,
)
from judgment_core.types import (
    Actor,
    ArtifactReference,
    EventType,
    JudgmentAlternative,
    JudgmentEvent,
    JudgmentResolution,
    JudgmentStatus,
)

# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

ACTOR = Actor(id="user-1", type="user")
JP_ID = "jp-001"
PROJECT_ID = "proj-001"


def _is_valid_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False


def _assert_common_fields(event: JudgmentEvent, expected_type: EventType) -> None:
    """Assert the fields common to every event."""
    assert isinstance(event, JudgmentEvent)
    assert _is_valid_uuid(event.id)
    assert event.judgment_point_id == JP_ID
    assert event.project_id == PROJECT_ID
    assert event.event_type == expected_type
    assert event.timestamp is not None
    assert event.actor_id == ACTOR.id
    assert event.actor_type == ACTOR.type


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestCreateCreatedEvent:
    def test_returns_valid_event(self) -> None:
        candidate_data = {
            "category": "assumption",
            "question": "Which model to use?",
            "context": "We need a regression model.",
        }
        event = create_created_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            candidate_data=candidate_data,
        )
        _assert_common_fields(event, EventType.created)
        assert event.payload == candidate_data
        assert event.metadata is not None
        assert event.metadata.new_status == "candidate"

    def test_timestamp_is_timezone_aware(self) -> None:
        event = create_created_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            candidate_data={"question": "test"},
        )
        assert event.timestamp.tzinfo is not None


class TestCreatePromotedEvent:
    def test_returns_valid_event(self) -> None:
        event = create_promoted_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            previous_status=JudgmentStatus.candidate,
            new_status=JudgmentStatus.pending,
        )
        _assert_common_fields(event, EventType.promoted)
        assert event.metadata is not None
        assert event.metadata.previous_status == "candidate"
        assert event.metadata.new_status == "pending"

    def test_accepts_optional_payload(self) -> None:
        payload = {"reason": "high materiality"}
        event = create_promoted_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            previous_status=JudgmentStatus.candidate,
            new_status=JudgmentStatus.pending,
            payload=payload,
        )
        assert event.payload == payload


class TestCreateInvestigationStartedEvent:
    def test_returns_valid_event(self) -> None:
        event = create_investigation_started_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            previous_status=JudgmentStatus.pending,
            new_status=JudgmentStatus.investigating,
        )
        _assert_common_fields(event, EventType.investigation_started)
        assert event.metadata is not None
        assert event.metadata.previous_status == "pending"
        assert event.metadata.new_status == "investigating"


class TestCreateResolutionRecordedEvent:
    def test_returns_valid_event(self) -> None:
        resolution = JudgmentResolution.model_validate(
            {
                "selectedAlternativeId": "alt-1",
                "rationale": "test",
                "resolvedAt": datetime.now(UTC).isoformat(),
            }
        )
        event = create_resolution_recorded_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            previous_status=JudgmentStatus.investigating,
            resolution=resolution,
        )
        _assert_common_fields(event, EventType.resolution_recorded)
        assert event.payload is not None
        assert event.payload["selectedAlternativeId"] == "alt-1"
        assert event.payload["rationale"] == "test"
        assert event.metadata is not None
        assert event.metadata.new_status == "resolved"


class TestCreateDelegatedEvent:
    def test_returns_valid_event(self) -> None:
        event = create_delegated_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            previous_status=JudgmentStatus.pending,
            delegate_id="agent-42",
            policy_id="policy-7",
        )
        _assert_common_fields(event, EventType.delegated)
        assert event.payload is not None
        assert event.payload["delegateId"] == "agent-42"
        assert event.payload["policyId"] == "policy-7"
        assert event.metadata is not None
        assert event.metadata.new_status == "delegated"


class TestCreateDismissedEvent:
    def test_returns_valid_event(self) -> None:
        event = create_dismissed_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            previous_status=JudgmentStatus.candidate,
            reason="Not material",
        )
        _assert_common_fields(event, EventType.dismissed)
        assert event.payload is not None
        assert event.payload["reason"] == "Not material"
        assert event.metadata is not None
        assert event.metadata.new_status == "dismissed"


class TestCreateReopenedEvent:
    def test_returns_valid_event(self) -> None:
        event = create_reopened_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            previous_status=JudgmentStatus.resolved,
            reason="New data available",
        )
        _assert_common_fields(event, EventType.reopened)
        assert event.payload is not None
        assert event.payload["reason"] == "New data available"


class TestCreateMarkedStaleEvent:
    def test_returns_valid_event(self) -> None:
        event = create_marked_stale_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            reason="Upstream dependency changed",
        )
        _assert_common_fields(event, EventType.marked_stale)
        assert event.payload is not None
        assert event.payload["reason"] == "Upstream dependency changed"
        assert event.metadata is not None
        assert event.metadata.new_status == "stale"

    def test_accepts_previous_status(self) -> None:
        event = create_marked_stale_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            reason="Upstream dependency changed",
            previous_status=JudgmentStatus.resolved,
        )
        assert event.metadata is not None
        assert event.metadata.previous_status == "resolved"


class TestCreateDependencyChangedEvent:
    def test_returns_valid_event(self) -> None:
        event = create_dependency_changed_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            upstream_id="jp-upstream",
            change_description="Resolution updated",
        )
        _assert_common_fields(event, EventType.dependency_changed)
        assert event.payload is not None
        assert event.payload["upstreamId"] == "jp-upstream"
        assert event.payload["changeDescription"] == "Resolution updated"


class TestCreateArtifactLinkedEvent:
    def test_returns_valid_event(self) -> None:
        artifact = ArtifactReference.model_validate(
            {
                "id": "art-1",
                "label": "Test artifact",
                "artifactType": "cell",
                "relationship": "informs",
            }
        )
        event = create_artifact_linked_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            artifact=artifact,
        )
        _assert_common_fields(event, EventType.artifact_linked)
        assert event.payload is not None
        assert event.payload["id"] == "art-1"
        assert event.payload["artifactType"] == "cell"


class TestCreateArtifactUnlinkedEvent:
    def test_returns_valid_event(self) -> None:
        event = create_artifact_unlinked_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            artifact_id="art-1",
            reason="No longer relevant",
        )
        _assert_common_fields(event, EventType.artifact_unlinked)
        assert event.payload is not None
        assert event.payload["artifactId"] == "art-1"
        assert event.payload["reason"] == "No longer relevant"


class TestCreateAlternativeAddedEvent:
    def test_returns_valid_event(self) -> None:
        alternative = JudgmentAlternative.model_validate(
            {
                "id": "alt-1",
                "label": "Alt 1",
                "description": "Test alt",
            }
        )
        event = create_alternative_added_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            alternative=alternative,
        )
        _assert_common_fields(event, EventType.alternative_added)
        assert event.payload is not None
        assert event.payload["id"] == "alt-1"
        assert event.payload["label"] == "Alt 1"


class TestCreateComparisonRequestedEvent:
    def test_returns_valid_event(self) -> None:
        event = create_comparison_requested_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            alternative_ids=["alt-1", "alt-2"],
            criteria="accuracy",
        )
        _assert_common_fields(event, EventType.comparison_requested)
        assert event.payload is not None
        assert event.payload["alternativeIds"] == ["alt-1", "alt-2"]
        assert event.payload["criteria"] == "accuracy"

    def test_criteria_defaults_to_none(self) -> None:
        event = create_comparison_requested_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            alternative_ids=["alt-1"],
        )
        assert event.payload is not None
        assert event.payload["criteria"] is None


class TestCreateComparisonCompletedEvent:
    def test_returns_valid_event(self) -> None:
        results = {"winner": "alt-1", "score": 0.95}
        event = create_comparison_completed_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            results=results,
        )
        _assert_common_fields(event, EventType.comparison_completed)
        assert event.payload == results


class TestCreateValidityConditionChangedEvent:
    def test_returns_valid_event(self) -> None:
        event = create_validity_condition_changed_event(
            judgment_point_id=JP_ID,
            project_id=PROJECT_ID,
            actor=ACTOR,
            reason="Constraint relaxed",
            previous_condition="Temperature < 500K",
            new_condition="Temperature < 900K",
        )
        _assert_common_fields(event, EventType.validity_condition_changed)
        assert event.payload is not None
        assert event.payload["previousCondition"] == "Temperature < 500K"
        assert event.payload["newCondition"] == "Temperature < 900K"
        assert event.payload["reason"] == "Constraint relaxed"
