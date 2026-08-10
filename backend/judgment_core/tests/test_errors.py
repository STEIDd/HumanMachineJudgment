"""Tests for the judgment_core.errors exception hierarchy."""

from __future__ import annotations

from judgment_core.errors import (
    DuplicateError,
    GuardError,
    InvalidTransitionError,
    JudgmentError,
    NotFoundError,
    PolicyViolationError,
    UnauthorizedResolutionError,
    ValidationError,
)


class TestJudgmentErrorHierarchy:
    """All domain errors inherit from JudgmentError."""

    def test_judgment_error_is_base_exception(self) -> None:
        err = JudgmentError("base error")
        assert isinstance(err, Exception)
        assert str(err) == "base error"

    def test_invalid_transition_error_inherits_from_judgment_error(self) -> None:
        err = InvalidTransitionError("pending", "candidate")
        assert isinstance(err, JudgmentError)

    def test_unauthorized_resolution_error_inherits_from_judgment_error(self) -> None:
        err = UnauthorizedResolutionError("not allowed")
        assert isinstance(err, JudgmentError)

    def test_validation_error_inherits_from_judgment_error(self) -> None:
        err = ValidationError("bad input", fields=["name"])
        assert isinstance(err, JudgmentError)

    def test_policy_violation_error_inherits_from_judgment_error(self) -> None:
        err = PolicyViolationError("policy breach")
        assert isinstance(err, JudgmentError)

    def test_duplicate_error_inherits_from_judgment_error(self) -> None:
        err = DuplicateError("already exists")
        assert isinstance(err, JudgmentError)

    def test_not_found_error_inherits_from_judgment_error(self) -> None:
        err = NotFoundError("missing resource")
        assert isinstance(err, JudgmentError)

    def test_guard_error_inherits_from_judgment_error(self) -> None:
        err = GuardError("guard failed")
        assert isinstance(err, JudgmentError)


class TestInvalidTransitionError:
    """InvalidTransitionError stores from_status and to_status with a descriptive message."""

    def test_stores_from_and_to_status(self) -> None:
        err = InvalidTransitionError("pending", "resolved")
        assert err.from_status == "pending"
        assert err.to_status == "resolved"

    def test_message_includes_statuses(self) -> None:
        err = InvalidTransitionError("candidate", "resolved")
        msg = str(err)
        assert "candidate" in msg
        assert "resolved" in msg
        assert "Invalid transition" in msg


class TestValidationError:
    """ValidationError stores a list of fields."""

    def test_stores_fields_list(self) -> None:
        err = ValidationError("bad fields", fields=["email", "name"])
        assert err.fields == ["email", "name"]

    def test_defaults_to_empty_fields(self) -> None:
        err = ValidationError("something wrong")
        assert err.fields == []


class TestGuardError:
    """GuardError stores a list of reasons."""

    def test_stores_reasons_list(self) -> None:
        err = GuardError("precondition failed", reasons=["missing auth", "stale data"])
        assert err.reasons == ["missing auth", "stale data"]

    def test_defaults_to_empty_reasons(self) -> None:
        err = GuardError("precondition failed")
        assert err.reasons == []
