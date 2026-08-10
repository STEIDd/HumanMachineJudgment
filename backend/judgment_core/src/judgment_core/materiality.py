"""Materiality scoring and intervention level computation.

Each materiality dimension is scored 0–3; the aggregate ranges from 0 to 18.
Default thresholds: 0–4 trace, 5–8 disclose, 9–13 pause, 14–18 require-investigation.
"""

from __future__ import annotations

from judgment_core.types import InterventionLevel, MaterialityAssessment, MaterialityDimensions

_DEFAULT_THRESHOLDS: list[tuple[int, InterventionLevel]] = [
    (4, InterventionLevel.trace),
    (8, InterventionLevel.disclose),
    (13, InterventionLevel.pause),
    (18, InterventionLevel.require_investigation),
]

_INTERVENTION_RANK: dict[InterventionLevel, int] = {
    InterventionLevel.trace: 0,
    InterventionLevel.disclose: 1,
    InterventionLevel.pause: 2,
    InterventionLevel.require_investigation: 3,
}


def compute_aggregate_score(dimensions: MaterialityDimensions) -> int:
    """Compute the aggregate materiality score from the six dimensions."""
    return (
        (dimensions.methodological_discretion or 0)
        + (dimensions.downstream_influence or 0)
        + (dimensions.uncertainty or 0)
        + (dimensions.consequence or 0)
        + (dimensions.reversibility or 0)
        + (dimensions.accountability_requirement or 0)
    )


def score_to_intervention_level(score: int) -> InterventionLevel:
    """Map an aggregate score to an intervention level using the default thresholds."""
    for max_score, level in _DEFAULT_THRESHOLDS:
        if score <= max_score:
            return level
    return InterventionLevel.require_investigation


def compute_intervention_level(assessment: MaterialityAssessment) -> InterventionLevel:
    """Compute the effective intervention level for a materiality assessment.

    If a hard trigger is present, its intervention overrides the score-based level
    only if it is more restrictive.
    """
    score_based = score_to_intervention_level(assessment.score)

    if assessment.hard_trigger is not None and assessment.intervention_level is not None:
        return more_restrictive(score_based, assessment.intervention_level)

    return score_based


def more_restrictive(a: InterventionLevel, b: InterventionLevel) -> InterventionLevel:
    """Return the more restrictive of two intervention levels."""
    return a if _INTERVENTION_RANK[a] >= _INTERVENTION_RANK[b] else b


def compare_intervention_levels(a: InterventionLevel, b: InterventionLevel) -> int:
    """Compare two intervention levels.

    Returns a positive number if *a* is more restrictive, negative if less, 0 if equal.
    """
    return _INTERVENTION_RANK[a] - _INTERVENTION_RANK[b]
