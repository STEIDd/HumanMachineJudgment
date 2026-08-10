"""Exception hierarchy for the Judgment system."""

from __future__ import annotations


class JudgmentError(Exception):
    """Base error class for the Judgment system."""


class InvalidTransitionError(JudgmentError):
    """Thrown when an invalid state machine transition is attempted."""

    def __init__(self, from_status: str, to_status: str) -> None:
        super().__init__(f"Invalid transition from '{from_status}' to '{to_status}'")
        self.from_status = from_status
        self.to_status = to_status


class UnauthorizedResolutionError(JudgmentError):
    """Thrown when an actor is not authorized to perform a resolution."""


class ValidationError(JudgmentError):
    """Thrown when field validation fails."""

    def __init__(self, message: str, fields: list[str] | None = None) -> None:
        super().__init__(message)
        self.fields: list[str] = fields or []


class PolicyViolationError(JudgmentError):
    """Thrown when a policy constraint is violated."""


class DuplicateError(JudgmentError):
    """Thrown when a duplicate ID is encountered."""


class NotFoundError(JudgmentError):
    """Thrown when a requested resource is not found."""


class GuardError(JudgmentError):
    """Thrown when a guard precondition is not met."""

    def __init__(self, message: str, reasons: list[str] | None = None) -> None:
        super().__init__(message)
        self.reasons: list[str] = reasons or []
