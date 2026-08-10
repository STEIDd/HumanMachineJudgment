"""Tests for the judgment_core.state_machine transition table and helpers."""

from __future__ import annotations

import pytest

from judgment_core.errors import InvalidTransitionError
from judgment_core.state_machine import (
    assert_transition,
    get_transition_event,
    get_valid_target_states,
    is_valid_transition,
)
from judgment_core.types import EventType, JudgmentStatus

# ---- Valid transitions (all 12) ------------------------------------------------


class TestValidTransitions:
    """Each of the 12 defined transitions should be recognized as valid."""

    def test_candidate_to_pending(self) -> None:
        assert is_valid_transition(JudgmentStatus.candidate, JudgmentStatus.pending) is True

    def test_pending_to_investigating(self) -> None:
        assert is_valid_transition(JudgmentStatus.pending, JudgmentStatus.investigating) is True

    def test_pending_to_dismissed(self) -> None:
        assert is_valid_transition(JudgmentStatus.pending, JudgmentStatus.dismissed) is True

    def test_pending_to_delegated(self) -> None:
        assert is_valid_transition(JudgmentStatus.pending, JudgmentStatus.delegated) is True

    def test_investigating_to_resolved(self) -> None:
        assert is_valid_transition(JudgmentStatus.investigating, JudgmentStatus.resolved) is True

    def test_delegated_to_resolved(self) -> None:
        assert is_valid_transition(JudgmentStatus.delegated, JudgmentStatus.resolved) is True

    def test_resolved_to_stale(self) -> None:
        assert is_valid_transition(JudgmentStatus.resolved, JudgmentStatus.stale) is True

    def test_resolved_to_reopened(self) -> None:
        assert is_valid_transition(JudgmentStatus.resolved, JudgmentStatus.reopened) is True

    def test_stale_to_reopened(self) -> None:
        assert is_valid_transition(JudgmentStatus.stale, JudgmentStatus.reopened) is True

    def test_dismissed_to_reopened(self) -> None:
        assert is_valid_transition(JudgmentStatus.dismissed, JudgmentStatus.reopened) is True

    def test_reopened_to_investigating(self) -> None:
        assert is_valid_transition(JudgmentStatus.reopened, JudgmentStatus.investigating) is True

    def test_reopened_to_dismissed(self) -> None:
        assert is_valid_transition(JudgmentStatus.reopened, JudgmentStatus.dismissed) is True


# ---- Transition events (all 12) ------------------------------------------------


class TestTransitionEvents:
    """get_transition_event returns the correct EventType for each valid transition."""

    def test_candidate_to_pending_event(self) -> None:
        assert (
            get_transition_event(JudgmentStatus.candidate, JudgmentStatus.pending)
            == EventType.promoted
        )

    def test_pending_to_investigating_event(self) -> None:
        assert (
            get_transition_event(JudgmentStatus.pending, JudgmentStatus.investigating)
            == EventType.investigation_started
        )

    def test_pending_to_dismissed_event(self) -> None:
        assert (
            get_transition_event(JudgmentStatus.pending, JudgmentStatus.dismissed)
            == EventType.dismissed
        )

    def test_pending_to_delegated_event(self) -> None:
        assert (
            get_transition_event(JudgmentStatus.pending, JudgmentStatus.delegated)
            == EventType.delegated
        )

    def test_investigating_to_resolved_event(self) -> None:
        assert (
            get_transition_event(JudgmentStatus.investigating, JudgmentStatus.resolved)
            == EventType.resolution_recorded
        )

    def test_delegated_to_resolved_event(self) -> None:
        assert (
            get_transition_event(JudgmentStatus.delegated, JudgmentStatus.resolved)
            == EventType.resolution_recorded
        )

    def test_resolved_to_stale_event(self) -> None:
        assert (
            get_transition_event(JudgmentStatus.resolved, JudgmentStatus.stale)
            == EventType.marked_stale
        )

    def test_resolved_to_reopened_event(self) -> None:
        assert (
            get_transition_event(JudgmentStatus.resolved, JudgmentStatus.reopened)
            == EventType.reopened
        )

    def test_stale_to_reopened_event(self) -> None:
        assert (
            get_transition_event(JudgmentStatus.stale, JudgmentStatus.reopened)
            == EventType.reopened
        )

    def test_dismissed_to_reopened_event(self) -> None:
        assert (
            get_transition_event(JudgmentStatus.dismissed, JudgmentStatus.reopened)
            == EventType.reopened
        )

    def test_reopened_to_investigating_event(self) -> None:
        assert (
            get_transition_event(JudgmentStatus.reopened, JudgmentStatus.investigating)
            == EventType.investigation_started
        )

    def test_reopened_to_dismissed_event(self) -> None:
        assert (
            get_transition_event(JudgmentStatus.reopened, JudgmentStatus.dismissed)
            == EventType.dismissed
        )


# ---- Invalid transitions -------------------------------------------------------


class TestInvalidTransitions:
    """Transitions not in the table should be rejected."""

    def test_candidate_to_resolved_is_invalid(self) -> None:
        assert is_valid_transition(JudgmentStatus.candidate, JudgmentStatus.resolved) is False

    def test_resolved_to_candidate_is_invalid(self) -> None:
        assert is_valid_transition(JudgmentStatus.resolved, JudgmentStatus.candidate) is False

    def test_pending_to_resolved_is_invalid(self) -> None:
        assert is_valid_transition(JudgmentStatus.pending, JudgmentStatus.resolved) is False

    def test_dismissed_to_resolved_is_invalid(self) -> None:
        assert is_valid_transition(JudgmentStatus.dismissed, JudgmentStatus.resolved) is False

    def test_stale_to_candidate_is_invalid(self) -> None:
        assert is_valid_transition(JudgmentStatus.stale, JudgmentStatus.candidate) is False

    def test_invalid_transition_returns_none_event(self) -> None:
        assert get_transition_event(JudgmentStatus.candidate, JudgmentStatus.resolved) is None


# ---- Self-transitions ----------------------------------------------------------


class TestSelfTransitions:
    """A status should not be able to transition to itself."""

    @pytest.mark.parametrize("status", list(JudgmentStatus))
    def test_self_transition_is_invalid(self, status: JudgmentStatus) -> None:
        assert is_valid_transition(status, status) is False


# ---- assert_transition ----------------------------------------------------------


class TestAssertTransition:
    """assert_transition raises InvalidTransitionError for invalid transitions."""

    def test_valid_transition_does_not_raise(self) -> None:
        # Should complete without raising
        assert_transition(JudgmentStatus.candidate, JudgmentStatus.pending)

    def test_invalid_transition_raises(self) -> None:
        with pytest.raises(InvalidTransitionError) as exc_info:
            assert_transition(JudgmentStatus.candidate, JudgmentStatus.resolved)
        assert exc_info.value.from_status == "candidate"
        assert exc_info.value.to_status == "resolved"


# ---- get_valid_target_states ----------------------------------------------------


class TestGetValidTargetStates:
    """get_valid_target_states returns all valid destinations from a given status."""

    def test_candidate_targets(self) -> None:
        targets = get_valid_target_states(JudgmentStatus.candidate)
        assert set(targets) == {JudgmentStatus.pending}

    def test_pending_targets(self) -> None:
        targets = get_valid_target_states(JudgmentStatus.pending)
        assert set(targets) == {
            JudgmentStatus.investigating,
            JudgmentStatus.dismissed,
            JudgmentStatus.delegated,
        }

    def test_investigating_targets(self) -> None:
        targets = get_valid_target_states(JudgmentStatus.investigating)
        assert set(targets) == {JudgmentStatus.resolved}

    def test_delegated_targets(self) -> None:
        targets = get_valid_target_states(JudgmentStatus.delegated)
        assert set(targets) == {JudgmentStatus.resolved}

    def test_resolved_targets(self) -> None:
        targets = get_valid_target_states(JudgmentStatus.resolved)
        assert set(targets) == {JudgmentStatus.stale, JudgmentStatus.reopened}

    def test_stale_targets(self) -> None:
        targets = get_valid_target_states(JudgmentStatus.stale)
        assert set(targets) == {JudgmentStatus.reopened}

    def test_dismissed_targets(self) -> None:
        targets = get_valid_target_states(JudgmentStatus.dismissed)
        assert set(targets) == {JudgmentStatus.reopened}

    def test_reopened_targets(self) -> None:
        targets = get_valid_target_states(JudgmentStatus.reopened)
        assert set(targets) == {JudgmentStatus.investigating, JudgmentStatus.dismissed}
