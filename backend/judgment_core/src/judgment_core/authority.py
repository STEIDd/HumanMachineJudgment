"""Authority model and transition guard functions.

Determines who can resolve a judgment point and validates lifecycle transitions.
"""

from __future__ import annotations

from judgment_core.types import (
    Actor,
    AuthorityMode,
    DelegationConditions,
    GuardResult,
    InterventionLevel,
    JudgmentAuthority,
    JudgmentPoint,
)


def get_default_authority(intervention_level: InterventionLevel) -> AuthorityMode:
    """Get the default authority mode for a given intervention level.

    - trace / disclose → collaborative
    - pause → collaborative
    - require-investigation → human
    """
    if intervention_level == InterventionLevel.require_investigation:
        return AuthorityMode.human
    return AuthorityMode.collaborative


def can_actor_resolve(actor: Actor, authority: JudgmentAuthority) -> bool:
    """Check whether an actor is authorized to resolve a judgment point."""
    if authority.mode == AuthorityMode.human:
        return actor.type == "user"
    if authority.mode == AuthorityMode.collaborative:
        return actor.type == "user"
    # delegated and rule allow any actor
    return True


def validate_delegation_conditions(
    point: JudgmentPoint,
    conditions: DelegationConditions,
) -> GuardResult:
    """Validate delegation conditions against a judgment point."""
    reasons: list[str] = []

    if conditions.allowed is False:
        reasons.append("Delegation is not allowed by the policy")

    if (
        conditions.max_materiality_score is not None
        and point.materiality.score > conditions.max_materiality_score
    ):
        reasons.append(
            f"Materiality score {point.materiality.score} exceeds maximum "
            f"{conditions.max_materiality_score} for delegation"
        )

    if conditions.required_confidence is not None and (
        point.materiality.detector_confidence is None
        or point.materiality.detector_confidence < conditions.required_confidence
    ):
        confidence = point.materiality.detector_confidence
        reasons.append(
            f"Detector confidence {confidence if confidence is not None else 'unset'} "
            f"is below required {conditions.required_confidence}"
        )

    if conditions.excluded_categories is not None and point.category.value in [
        c.value for c in conditions.excluded_categories
    ]:
        reasons.append(f"Category '{point.category}' is excluded from delegation")

    return GuardResult(allowed=len(reasons) == 0, reasons=reasons)


# ---------------------------------------------------------------------------
# Transition guard functions
# ---------------------------------------------------------------------------


def can_promote(point: JudgmentPoint) -> GuardResult:
    """Check whether a candidate can be promoted to pending."""
    reasons: list[str] = []

    if point.status != "candidate":
        reasons.append(f"Point status is '{point.status}', expected 'candidate'")

    if point.materiality.dimensions is None:
        reasons.append("Materiality assessment dimensions are missing")

    has_hard_trigger = (
        point.trigger.hard_trigger is not None or point.materiality.hard_trigger is not None
    )
    level = point.materiality.intervention_level

    if not has_hard_trigger and (level == "trace" or level is None):
        reasons.append(
            "Materiality score does not meet promotion threshold and no hard trigger is present"
        )

    return GuardResult(allowed=len(reasons) == 0, reasons=reasons)


def can_investigate(point: JudgmentPoint) -> GuardResult:
    """Check whether a judgment point can begin investigation."""
    reasons: list[str] = []

    if point.status not in ("pending", "reopened"):
        reasons.append(f"Point status is '{point.status}', expected 'pending' or 'reopened'")

    if not point.alternatives:
        reasons.append("At least one alternative must be defined before investigation")

    return GuardResult(allowed=len(reasons) == 0, reasons=reasons)


def can_resolve(
    point: JudgmentPoint,
    actor: Actor,
    selected_alternative_id: str,
    rationale: str,
) -> GuardResult:
    """Check whether a judgment point can be resolved."""
    reasons: list[str] = []

    if point.status not in ("investigating", "delegated"):
        reasons.append(f"Point status is '{point.status}', expected 'investigating' or 'delegated'")

    if not can_actor_resolve(actor, point.authority):
        reasons.append(
            f"Actor '{actor.id}' (type '{actor.type}') is not authorized to resolve "
            f"with authority mode '{point.authority.mode}'"
        )

    if not any(a.id == selected_alternative_id for a in point.alternatives):
        reasons.append(
            f"Selected alternative '{selected_alternative_id}' does not exist "
            "in the point's alternatives"
        )

    if not rationale.strip():
        reasons.append("Rationale must not be empty")

    return GuardResult(allowed=len(reasons) == 0, reasons=reasons)


def can_dismiss(
    point: JudgmentPoint,
    intervention_level: InterventionLevel,
) -> GuardResult:
    """Check whether a judgment point can be dismissed."""
    reasons: list[str] = []

    if point.status not in ("pending", "reopened"):
        reasons.append(f"Point status is '{point.status}', expected 'pending' or 'reopened'")

    if intervention_level == InterventionLevel.require_investigation:
        reasons.append(
            "Judgment Points with require-investigation intervention level cannot be "
            "dismissed without first completing investigation"
        )

    return GuardResult(allowed=len(reasons) == 0, reasons=reasons)


def can_delegate(
    point: JudgmentPoint,
    delegation_conditions: DelegationConditions,
) -> GuardResult:
    """Check whether a judgment point can be delegated."""
    reasons: list[str] = []

    if point.status != "pending":
        reasons.append(f"Point status is '{point.status}', expected 'pending'")

    condition_result = validate_delegation_conditions(point, delegation_conditions)
    reasons.extend(condition_result.reasons)

    return GuardResult(allowed=len(reasons) == 0, reasons=reasons)


def can_mark_stale(point: JudgmentPoint, reason: str) -> GuardResult:
    """Check whether a judgment point can be marked stale."""
    reasons: list[str] = []

    if point.status != "resolved":
        reasons.append(f"Point status is '{point.status}', expected 'resolved'")

    if not reason.strip():
        reasons.append("Staleness reason must not be empty")

    return GuardResult(allowed=len(reasons) == 0, reasons=reasons)


def can_reopen(point: JudgmentPoint, reason: str) -> GuardResult:
    """Check whether a judgment point can be reopened."""
    reasons: list[str] = []

    if point.status not in ("resolved", "stale", "dismissed"):
        reasons.append(
            f"Point status is '{point.status}', expected 'resolved', 'stale', or 'dismissed'"
        )

    if not reason.strip():
        reasons.append("Reopen reason must not be empty")

    return GuardResult(allowed=len(reasons) == 0, reasons=reasons)
