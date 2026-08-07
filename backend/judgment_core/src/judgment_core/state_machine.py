"""Data-driven state transition table for the Judgment Point lifecycle.

Each entry maps (from_status, to_status) -> event_type that triggers the transition.
Only transitions listed here are valid.
"""

from __future__ import annotations

from judgment_core.errors import InvalidTransitionError
from judgment_core.types import EventType, JudgmentStatus

# (from_status, to_status) -> event_type
TRANSITIONS: dict[JudgmentStatus, dict[JudgmentStatus, EventType]] = {
    JudgmentStatus.candidate: {
        JudgmentStatus.pending: EventType.promoted,
    },
    JudgmentStatus.pending: {
        JudgmentStatus.investigating: EventType.investigation_started,
        JudgmentStatus.dismissed: EventType.dismissed,
        JudgmentStatus.delegated: EventType.delegated,
    },
    JudgmentStatus.investigating: {
        JudgmentStatus.resolved: EventType.resolution_recorded,
    },
    JudgmentStatus.delegated: {
        JudgmentStatus.resolved: EventType.resolution_recorded,
    },
    JudgmentStatus.resolved: {
        JudgmentStatus.stale: EventType.marked_stale,
        JudgmentStatus.reopened: EventType.reopened,
    },
    JudgmentStatus.stale: {
        JudgmentStatus.reopened: EventType.reopened,
    },
    JudgmentStatus.dismissed: {
        JudgmentStatus.reopened: EventType.reopened,
    },
    JudgmentStatus.reopened: {
        JudgmentStatus.investigating: EventType.investigation_started,
        JudgmentStatus.dismissed: EventType.dismissed,
    },
}


def is_valid_transition(from_status: JudgmentStatus, to_status: JudgmentStatus) -> bool:
    """Check whether a transition from one status to another is valid."""
    targets = TRANSITIONS.get(from_status)
    if targets is None:
        return False
    return to_status in targets


def get_transition_event(
    from_status: JudgmentStatus, to_status: JudgmentStatus
) -> EventType | None:
    """Get the event type that triggers a given transition, or None if invalid."""
    targets = TRANSITIONS.get(from_status)
    if targets is None:
        return None
    return targets.get(to_status)


def assert_transition(from_status: JudgmentStatus, to_status: JudgmentStatus) -> None:
    """Assert that a transition is valid. Raises InvalidTransitionError if not."""
    if not is_valid_transition(from_status, to_status):
        raise InvalidTransitionError(from_status.value, to_status.value)


def get_valid_target_states(from_status: JudgmentStatus) -> list[JudgmentStatus]:
    """Get all valid target states from a given status."""
    targets = TRANSITIONS.get(from_status)
    if targets is None:
        return []
    return list(targets.keys())
