"""Tests for the judgment_core.materiality scoring and intervention level functions."""

from __future__ import annotations

from judgment_core.materiality import (
    compare_intervention_levels,
    compute_aggregate_score,
    compute_intervention_level,
    more_restrictive,
    score_to_intervention_level,
)
from judgment_core.types import InterventionLevel, MaterialityAssessment, MaterialityDimensions

# ---- Helpers to build Pydantic models via alias dicts --------------------------


def _dims(
    md: int = 0,
    di: int = 0,
    unc: int = 0,
    con: int = 0,
    rev: int = 0,
    ar: int = 0,
) -> MaterialityDimensions:
    """Construct a MaterialityDimensions using model_validate with camelCase aliases."""
    return MaterialityDimensions.model_validate(
        {
            "methodologicalDiscretion": md,
            "downstreamInfluence": di,
            "uncertainty": unc,
            "consequence": con,
            "reversibility": rev,
            "accountabilityRequirement": ar,
        }
    )


def _assessment(
    score: int,
    dims: MaterialityDimensions,
    *,
    detector_confidence: float | None = None,
    hard_trigger: str | None = None,
    intervention_level: InterventionLevel | None = None,
) -> MaterialityAssessment:
    """Construct a MaterialityAssessment using model_validate with camelCase aliases."""
    data: dict = {
        "score": score,
        "dimensions": dims.model_dump(by_alias=True),
    }
    if detector_confidence is not None:
        data["detectorConfidence"] = detector_confidence
    if hard_trigger is not None:
        data["hardTrigger"] = hard_trigger
    if intervention_level is not None:
        data["interventionLevel"] = intervention_level.value
    return MaterialityAssessment.model_validate(data)


# ---- compute_aggregate_score ---------------------------------------------------


class TestComputeAggregateScore:
    """Aggregate score is the sum of all six dimension values."""

    def test_all_zeros(self) -> None:
        dims = _dims(0, 0, 0, 0, 0, 0)
        assert compute_aggregate_score(dims) == 0

    def test_all_threes(self) -> None:
        dims = _dims(3, 3, 3, 3, 3, 3)
        assert compute_aggregate_score(dims) == 18

    def test_mixed_values(self) -> None:
        dims = _dims(1, 2, 0, 3, 1, 2)
        assert compute_aggregate_score(dims) == 9

    def test_single_dimension_set(self) -> None:
        dims = _dims(md=2)
        assert compute_aggregate_score(dims) == 2


# ---- score_to_intervention_level -----------------------------------------------


class TestScoreToInterventionLevel:
    """Thresholds: 0-4 trace, 5-8 disclose, 9-13 pause, 14-18 require-investigation."""

    def test_score_zero_is_trace(self) -> None:
        assert score_to_intervention_level(0) == InterventionLevel.trace

    def test_score_four_is_trace(self) -> None:
        assert score_to_intervention_level(4) == InterventionLevel.trace

    def test_score_five_is_disclose(self) -> None:
        assert score_to_intervention_level(5) == InterventionLevel.disclose

    def test_score_eight_is_disclose(self) -> None:
        assert score_to_intervention_level(8) == InterventionLevel.disclose

    def test_score_nine_is_pause(self) -> None:
        assert score_to_intervention_level(9) == InterventionLevel.pause

    def test_score_thirteen_is_pause(self) -> None:
        assert score_to_intervention_level(13) == InterventionLevel.pause

    def test_score_fourteen_is_require_investigation(self) -> None:
        assert score_to_intervention_level(14) == InterventionLevel.require_investigation

    def test_score_eighteen_is_require_investigation(self) -> None:
        assert score_to_intervention_level(18) == InterventionLevel.require_investigation


# ---- compute_intervention_level ------------------------------------------------


class TestComputeInterventionLevel:
    """compute_intervention_level applies hard trigger override when present."""

    def test_score_based_level_without_hard_trigger(self) -> None:
        dims = _dims(0, 0, 0, 0, 0, 0)
        assessment = _assessment(score=0, dims=dims)
        assert compute_intervention_level(assessment) == InterventionLevel.trace

    def test_hard_trigger_overrides_when_more_restrictive(self) -> None:
        dims = _dims(0, 0, 0, 0, 0, 0)
        assessment = _assessment(
            score=2,
            dims=dims,
            hard_trigger="safety-factor-selection",
            intervention_level=InterventionLevel.pause,
        )
        # score=2 -> trace, but hard trigger forces pause (more restrictive)
        assert compute_intervention_level(assessment) == InterventionLevel.pause

    def test_score_wins_when_more_restrictive_than_hard_trigger(self) -> None:
        dims = _dims(3, 3, 3, 3, 3, 3)
        assessment = _assessment(
            score=18,
            dims=dims,
            hard_trigger="worst-case-best-case-assumption",
            intervention_level=InterventionLevel.disclose,
        )
        # score=18 -> require-investigation, hard trigger = disclose, score wins
        assert compute_intervention_level(assessment) == InterventionLevel.require_investigation

    def test_hard_trigger_without_intervention_level_uses_score(self) -> None:
        dims = _dims(1, 1, 1, 0, 0, 0)
        assessment = _assessment(
            score=3,
            dims=dims,
            hard_trigger="data-exclusion",
        )
        # hard_trigger set but intervention_level is None -> falls through to score
        assert compute_intervention_level(assessment) == InterventionLevel.trace


# ---- more_restrictive -----------------------------------------------------------


class TestMoreRestrictive:
    """more_restrictive returns the higher-ranked intervention level."""

    def test_trace_vs_disclose(self) -> None:
        assert (
            more_restrictive(InterventionLevel.trace, InterventionLevel.disclose)
            == InterventionLevel.disclose
        )

    def test_pause_vs_disclose(self) -> None:
        assert (
            more_restrictive(InterventionLevel.pause, InterventionLevel.disclose)
            == InterventionLevel.pause
        )

    def test_same_level_returns_that_level(self) -> None:
        assert (
            more_restrictive(InterventionLevel.pause, InterventionLevel.pause)
            == InterventionLevel.pause
        )

    def test_require_investigation_is_most_restrictive(self) -> None:
        assert (
            more_restrictive(InterventionLevel.require_investigation, InterventionLevel.trace)
            == InterventionLevel.require_investigation
        )


# ---- compare_intervention_levels ------------------------------------------------


class TestCompareInterventionLevels:
    """compare_intervention_levels returns positive, negative, or zero."""

    def test_equal_levels_returns_zero(self) -> None:
        assert compare_intervention_levels(InterventionLevel.pause, InterventionLevel.pause) == 0

    def test_more_restrictive_returns_positive(self) -> None:
        result = compare_intervention_levels(
            InterventionLevel.require_investigation, InterventionLevel.trace
        )
        assert result > 0

    def test_less_restrictive_returns_negative(self) -> None:
        result = compare_intervention_levels(
            InterventionLevel.trace, InterventionLevel.require_investigation
        )
        assert result < 0

    def test_adjacent_levels(self) -> None:
        result = compare_intervention_levels(InterventionLevel.disclose, InterventionLevel.trace)
        assert result > 0
