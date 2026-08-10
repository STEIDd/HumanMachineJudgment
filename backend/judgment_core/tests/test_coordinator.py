"""Tests for the judgment_core.coordinator module."""

from __future__ import annotations

from datetime import UTC, datetime

from judgment_core.coordinator import (
    PauseCoordinator,
    WorkflowState,
)
from judgment_core.types import JudgmentPoint

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_point(
    point_id: str = "jp-1",
    intervention_level: str = "pause",
) -> JudgmentPoint:
    """Create a JudgmentPoint with the given id and intervention level."""
    return JudgmentPoint.model_validate(
        {
            "id": point_id,
            "projectId": "proj-1",
            "category": "assumption",
            "question": "Should we use method A?",
            "context": "Test context",
            "trigger": {"source": "agent", "description": "test"},
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
                "interventionLevel": intervention_level,
            },
            "status": "pending",
            "alternatives": [
                {"id": "alt-1", "label": "Method A", "description": "Use method A"},
                {"id": "alt-2", "label": "Method B", "description": "Use method B"},
            ],
            "affectedArtifactIds": [],
            "authority": {"mode": "collaborative"},
            "validityConditions": [],
            "reopenConditions": [],
            "createdAt": datetime.now(UTC).isoformat(),
            "updatedAt": datetime.now(UTC).isoformat(),
        }
    )


# ---------------------------------------------------------------------------
# WorkflowState enum
# ---------------------------------------------------------------------------


class TestWorkflowState:
    """WorkflowState has running, paused, and completed values."""

    def test_values(self) -> None:
        assert WorkflowState.running == "running"
        assert WorkflowState.paused == "paused"
        assert WorkflowState.completed == "completed"


# ---------------------------------------------------------------------------
# PauseCoordinator — initial state
# ---------------------------------------------------------------------------


class TestPauseCoordinatorInitialState:
    """A freshly created coordinator starts in the running state."""

    def test_initial_state_is_running(self) -> None:
        coord = PauseCoordinator()
        assert coord.state == WorkflowState.running

    def test_is_paused_returns_false_initially(self) -> None:
        coord = PauseCoordinator()
        assert coord.is_paused() is False

    def test_paused_point_ids_empty_initially(self) -> None:
        coord = PauseCoordinator()
        assert coord.paused_point_ids == []


# ---------------------------------------------------------------------------
# PauseCoordinator — should_pause
# ---------------------------------------------------------------------------


class TestShouldPause:
    """should_pause is true for pause/require-investigation, false for trace/disclose."""

    def test_pause_level_triggers_pause(self) -> None:
        coord = PauseCoordinator()
        point = _make_point(intervention_level="pause")
        assert coord.should_pause(point) is True

    def test_require_investigation_triggers_pause(self) -> None:
        coord = PauseCoordinator()
        point = _make_point(intervention_level="require-investigation")
        assert coord.should_pause(point) is True

    def test_trace_does_not_trigger_pause(self) -> None:
        coord = PauseCoordinator()
        point = _make_point(intervention_level="trace")
        assert coord.should_pause(point) is False

    def test_disclose_does_not_trigger_pause(self) -> None:
        coord = PauseCoordinator()
        point = _make_point(intervention_level="disclose")
        assert coord.should_pause(point) is False


# ---------------------------------------------------------------------------
# PauseCoordinator — pause / resume lifecycle
# ---------------------------------------------------------------------------


class TestPauseResumeLifecycle:
    """Pausing and resuming transitions the coordinator state correctly."""

    def test_pause_transitions_to_paused(self) -> None:
        coord = PauseCoordinator()
        point = _make_point()
        result = coord.pause(point)
        assert result.paused is True
        assert coord.state == WorkflowState.paused
        assert coord.is_paused() is True

    def test_pause_adds_to_paused_point_ids(self) -> None:
        coord = PauseCoordinator()
        point = _make_point(point_id="jp-42")
        coord.pause(point)
        assert "jp-42" in coord.paused_point_ids

    def test_pause_result_contains_question_and_alternatives(self) -> None:
        coord = PauseCoordinator()
        point = _make_point()
        result = coord.pause(point)
        assert result.question == "Should we use method A?"
        assert len(result.alternatives) == 2
        assert result.alternatives[0]["label"] == "Method A"

    def test_pause_returns_false_for_trace_level(self) -> None:
        coord = PauseCoordinator()
        point = _make_point(intervention_level="trace")
        result = coord.pause(point)
        assert result.paused is False
        assert coord.state == WorkflowState.running

    def test_resume_transitions_back_to_running(self) -> None:
        coord = PauseCoordinator()
        point = _make_point()
        coord.pause(point)
        result = coord.resume("jp-1", {"choice": "alt-1"})
        assert result.resumed is True
        assert coord.state == WorkflowState.running
        assert coord.is_paused() is False

    def test_resume_unknown_point_id_fails(self) -> None:
        coord = PauseCoordinator()
        result = coord.resume("nonexistent")
        assert result.resumed is False
        assert "nonexistent" in result.reason

    def test_get_resume_data_returns_stored_data(self) -> None:
        coord = PauseCoordinator()
        point = _make_point()
        coord.pause(point)
        coord.resume("jp-1", {"selected": "alt-2", "rationale": "better fit"})
        data = coord.get_resume_data("jp-1")
        assert data is not None
        assert data["selected"] == "alt-2"

    def test_get_resume_data_returns_none_for_unknown(self) -> None:
        coord = PauseCoordinator()
        assert coord.get_resume_data("unknown") is None

    def test_complete_marks_workflow_completed(self) -> None:
        coord = PauseCoordinator()
        coord.complete()
        assert coord.state == WorkflowState.completed

    def test_multiple_pauses_keep_state_paused_until_all_resumed(self) -> None:
        coord = PauseCoordinator()
        p1 = _make_point(point_id="jp-a")
        p2 = _make_point(point_id="jp-b")
        coord.pause(p1)
        coord.pause(p2)
        assert coord.state == WorkflowState.paused
        assert set(coord.paused_point_ids) == {"jp-a", "jp-b"}

        # Resume only the first — still paused
        coord.resume("jp-a", {"choice": "A"})
        assert coord.state == WorkflowState.paused
        assert coord.paused_point_ids == ["jp-b"]

        # Resume the second — back to running
        coord.resume("jp-b", {"choice": "B"})
        assert coord.state == WorkflowState.running
        assert coord.paused_point_ids == []
