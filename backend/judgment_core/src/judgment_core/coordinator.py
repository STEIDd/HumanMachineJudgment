"""Pause/resume coordinator for managing workflow interruptions.

Tracks which judgment points are currently pausing execution
and manages the lifecycle of pause/resume operations.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any

from judgment_core.types import InterventionLevel, JudgmentPoint


class WorkflowState(StrEnum):
    running = "running"
    paused = "paused"
    completed = "completed"


@dataclass
class PauseResult:
    """Result of a pause request."""

    paused: bool
    judgment_point_id: str
    intervention_level: InterventionLevel
    question: str
    alternatives: list[dict[str, Any]] = field(default_factory=list)
    reason: str = ""


@dataclass
class ResumeResult:
    """Result of a resume request."""

    resumed: bool
    judgment_point_id: str
    reason: str = ""


class PauseCoordinator:
    """Manages pause/resume lifecycle for judgment points in a workflow."""

    def __init__(self) -> None:
        self._state = WorkflowState.running
        self._paused_points: dict[str, JudgmentPoint] = {}
        self._resume_data: dict[str, dict[str, Any]] = {}

    @property
    def state(self) -> WorkflowState:
        return self._state

    @property
    def paused_point_ids(self) -> list[str]:
        return list(self._paused_points.keys())

    def is_paused(self) -> bool:
        return self._state == WorkflowState.paused

    def should_pause(self, point: JudgmentPoint) -> bool:
        """Determine whether a judgment point should cause a pause."""
        level = point.materiality.intervention_level
        return level in (
            InterventionLevel.pause,
            InterventionLevel.require_investigation,
        )

    def pause(self, point: JudgmentPoint) -> PauseResult:
        """Pause the workflow for a judgment point."""
        if not self.should_pause(point):
            return PauseResult(
                paused=False,
                judgment_point_id=point.id,
                intervention_level=point.materiality.intervention_level or InterventionLevel.trace,
                question=point.question,
                reason="Intervention level does not require pause",
            )

        self._state = WorkflowState.paused
        self._paused_points[point.id] = point

        return PauseResult(
            paused=True,
            judgment_point_id=point.id,
            intervention_level=point.materiality.intervention_level or InterventionLevel.pause,
            question=point.question,
            alternatives=[
                {"id": alt.id, "label": alt.label, "description": alt.description}
                for alt in point.alternatives
            ],
            reason=f"Paused for judgment: {point.question}",
        )

    def resume(
        self,
        judgment_point_id: str,
        resolution_data: dict[str, Any] | None = None,
    ) -> ResumeResult:
        """Resume the workflow after a judgment point has been resolved."""
        if judgment_point_id not in self._paused_points:
            return ResumeResult(
                resumed=False,
                judgment_point_id=judgment_point_id,
                reason=f"Judgment point '{judgment_point_id}' is not currently paused",
            )

        del self._paused_points[judgment_point_id]
        if resolution_data:
            self._resume_data[judgment_point_id] = resolution_data

        if not self._paused_points:
            self._state = WorkflowState.running

        return ResumeResult(
            resumed=True,
            judgment_point_id=judgment_point_id,
            reason="Workflow resumed",
        )

    def get_resume_data(self, judgment_point_id: str) -> dict[str, Any] | None:
        """Get the resolution data provided when resuming a judgment point."""
        return self._resume_data.get(judgment_point_id)

    def complete(self) -> None:
        """Mark the workflow as completed."""
        self._state = WorkflowState.completed
        self._paused_points.clear()
