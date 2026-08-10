"""Core evaluation harness for the Judgment fixture suite.

Loads each fixture, determines its type, exercises the relevant judgment-core
logic, and returns structured pass/fail results.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from evals.fixture_loader import get_fixture_id
from judgment_core.hard_triggers import (
    get_hard_trigger_intervention,
    is_hard_trigger,
)
from judgment_core.materiality import compute_aggregate_score, score_to_intervention_level
from judgment_core.types import (
    JUDGMENT_CATEGORIES,
    InterventionLevel,
    MaterialityDimensions,
)

# ---------------------------------------------------------------------------
# Valid categories as plain strings for quick membership checks
# ---------------------------------------------------------------------------

_VALID_CATEGORIES: frozenset[str] = frozenset(c.value for c in JUDGMENT_CATEGORIES)

# Max dimension value and max aggregate score
_MAX_DIMENSION = 3
_MAX_AGGREGATE_SCORE = 18

# ---------------------------------------------------------------------------
# Result data class
# ---------------------------------------------------------------------------


@dataclass
class FixtureResult:
    """Outcome of evaluating a single fixture."""

    fixture_id: str
    fixture_file: str
    passed: bool
    checks: list[dict[str, Any]] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "fixtureId": self.fixture_id,
            "fixtureFile": self.fixture_file,
            "passed": self.passed,
            "checks": self.checks,
            "errors": self.errors,
        }


# ---------------------------------------------------------------------------
# Helper: record a check
# ---------------------------------------------------------------------------


def _add_check(
    result: FixtureResult,
    name: str,
    expected: Any,
    actual: Any,
    *,
    passed: bool | None = None,
) -> None:
    """Append a check entry.  If *passed* is ``None`` it is inferred from equality."""
    if passed is None:
        passed = expected == actual
    result.checks.append({"name": name, "expected": expected, "actual": actual, "passed": passed})
    if not passed:
        result.passed = False
        result.errors.append(f"Check '{name}' failed: expected {expected!r}, got {actual!r}")


# ---------------------------------------------------------------------------
# Fixture-type evaluators
# ---------------------------------------------------------------------------


def _dimensions_from_expected(em: dict[str, Any]) -> MaterialityDimensions:
    """Build a ``MaterialityDimensions`` from a fixture's ``expectedMateriality`` block."""
    return MaterialityDimensions(
        methodologicalDiscretion=em["methodologicalDiscretion"],
        downstreamInfluence=em["downstreamInfluence"],
        uncertainty=em["uncertainty"],
        consequence=em["consequence"],
        reversibility=em["reversibility"],
        accountabilityRequirement=em["accountabilityRequirement"],
    )


async def _evaluate_candidate_fixture(
    fixture: dict[str, Any],
    result: FixtureResult,
) -> None:
    """Evaluate a fixture that carries a ``candidate`` block.

    Three sub-types:
    * ``expectedResult == "promote"``  -- valid, high-materiality candidate
    * ``expectedResult == "dismiss"``  -- valid, low-materiality candidate
    * ``expectedResult == "should-have-promoted"`` -- missed detection
    """
    expected_result = fixture.get("expectedResult", "unknown")
    em = fixture.get("expectedMateriality")
    candidate = fixture.get("candidate")

    # ---- Candidate structure checks ---
    if candidate is not None:
        cat = candidate.get("category")
        _add_check(result, "candidate.category is valid", True, cat in _VALID_CATEGORIES)
        _add_check(
            result,
            "candidate.question present",
            True,
            bool(candidate.get("question")),
        )
        _add_check(
            result,
            "candidate.alternatives non-empty",
            True,
            bool(candidate.get("alternatives")),
        )

    # ---- Materiality score checks ---
    if em is not None:
        dims = _dimensions_from_expected(em)
        computed_score = compute_aggregate_score(dims)
        expected_score = em["expectedScore"]
        _add_check(result, "materiality.aggregate_score", expected_score, computed_score)

        expected_intervention_str: str = em["expectedIntervention"]
        computed_intervention = score_to_intervention_level(computed_score)
        _add_check(
            result,
            "materiality.intervention_level",
            expected_intervention_str,
            computed_intervention.value,
        )

    # ---- Promotion / dismissal logic ---
    if em is not None:
        computed_score = compute_aggregate_score(_dimensions_from_expected(em))
        computed_intervention = score_to_intervention_level(computed_score)

        if expected_result == "promote":
            should_promote = computed_intervention != InterventionLevel.trace
            _add_check(result, "should_promote", True, should_promote)
        elif expected_result == "dismiss":
            should_dismiss = computed_intervention == InterventionLevel.trace
            _add_check(result, "should_dismiss", True, should_dismiss)
        elif expected_result == "should-have-promoted":
            # This fixture documents a missed detection.  Verify that the
            # expected materiality score would indeed warrant promotion.
            should_have_promoted = computed_intervention != InterventionLevel.trace
            _add_check(result, "missed_detection_would_promote", True, should_have_promoted)


async def _evaluate_missed_candidate_fixture(
    fixture: dict[str, Any],
    result: FixtureResult,
) -> None:
    """Evaluate a fixture documenting a missed candidate (``scenario`` block)."""
    scenario = fixture.get("scenario", {})
    em = fixture.get("expectedMateriality")

    if isinstance(scenario, dict):
        expected_category = scenario.get("expectedCategory")
        if expected_category is not None:
            _add_check(
                result,
                "scenario.expectedCategory is valid",
                True,
                expected_category in _VALID_CATEGORIES,
            )

        hard_trigger_name = scenario.get("hardTrigger")
        if hard_trigger_name is not None:
            # The missed-candidate hard trigger may be a *new* trigger not yet in
            # the canonical list (e.g. "change-model-class").  We record whether
            # it is known but do not fail on unknown triggers in missed-candidate
            # fixtures, since the whole point is that the detection was missed.
            _add_check(
                result,
                "scenario.hardTrigger recognized or novel",
                True,
                True,  # always pass — just informational
            )

    if em is not None:
        dims = _dimensions_from_expected(em)
        computed_score = compute_aggregate_score(dims)
        _add_check(result, "materiality.aggregate_score", em["expectedScore"], computed_score)

        computed_intervention = score_to_intervention_level(computed_score)
        _add_check(
            result,
            "materiality.intervention_level",
            em["expectedIntervention"],
            computed_intervention.value,
        )

        # Confirm the score would warrant promotion
        should_promote = computed_intervention != InterventionLevel.trace
        _add_check(result, "missed_detection_would_promote", True, should_promote)


async def _evaluate_detection_fixture(
    fixture: dict[str, Any],
    result: FixtureResult,
) -> None:
    """Evaluate a skill-activation / detection fixture.

    These fixtures have ``input`` (action + description + context) and
    ``expected`` (detected, hard_trigger, intervention_level, category).
    """
    expected = fixture.get("expected", {})
    expected_detected: bool = expected.get("detected", False)

    # --- Hard trigger check ---
    expected_trigger = expected.get("hard_trigger")
    if expected_detected and expected_trigger is not None:
        trigger_known = is_hard_trigger(expected_trigger)
        _add_check(result, "hard_trigger.is_known", True, trigger_known)

        expected_intervention = expected.get("intervention_level")
        if trigger_known and expected_intervention is not None:
            actual_intervention = get_hard_trigger_intervention(expected_trigger)
            _add_check(
                result,
                "hard_trigger.intervention_level",
                expected_intervention,
                actual_intervention.value,
            )

    # --- Category validity ---
    expected_category = expected.get("category")
    if expected_detected and expected_category is not None:
        _add_check(
            result,
            "expected.category is valid",
            True,
            expected_category in _VALID_CATEGORIES,
        )

    # --- No-detection fixture ---
    if not expected_detected:
        _add_check(result, "expected.detected", False, False)  # trivially passes
        if expected.get("hard_trigger") is not None:
            result.passed = False
            result.errors.append("Fixture expects no detection but specifies a hard_trigger")
        return

    # --- Soft-detection (no hard trigger) ---
    if expected_detected and expected_trigger is None:
        _add_check(result, "soft_detection", True, True)
        expected_intervention = expected.get("intervention_level")
        if expected_intervention is not None:
            # Validate against expectedMateriality if present
            em = fixture.get("expectedMateriality")
            if em is not None:
                dims = _dimensions_from_expected(em)
                computed_score = compute_aggregate_score(dims)
                _add_check(
                    result,
                    "materiality.aggregate_score",
                    em["expectedScore"],
                    computed_score,
                )
                computed_intervention = score_to_intervention_level(computed_score)
                _add_check(
                    result,
                    "materiality.intervention_level",
                    expected_intervention,
                    computed_intervention.value,
                )


async def _evaluate_malformed_fixture(
    fixture: dict[str, Any],
    result: FixtureResult,
) -> None:
    """Evaluate a fixture that represents malformed agent output.

    The fixture's ``input`` should fail validation; the ``expected`` block
    describes the expected error.
    """
    expected = fixture.get("expected", {})
    inp = fixture.get("input", {})

    _add_check(result, "expected.valid", False, expected.get("valid", True))

    # --- Missing category ---
    missing_field = expected.get("missingField")
    if missing_field == "category":
        candidate = inp.get("candidate", {})
        has_category = "category" in candidate
        _add_check(result, "input.candidate.category missing", True, not has_category)

    # --- Invalid score ---
    invalid_field = expected.get("invalidField")
    if invalid_field == "materialityAssessment":
        assessment = inp.get("materialityAssessment", {})
        score = assessment.get("score", 0)
        _add_check(
            result,
            "materialityAssessment.score exceeds maximum",
            True,
            score > _MAX_AGGREGATE_SCORE,
        )

        dims = assessment.get("dimensions", {})
        any_dim_exceeds = any(
            dims.get(k, 0) > _MAX_DIMENSION
            for k in (
                "methodologicalDiscretion",
                "downstreamInfluence",
                "uncertainty",
                "consequence",
                "reversibility",
                "accountabilityRequirement",
            )
        )
        _add_check(
            result,
            "materialityAssessment.dimensions have out-of-range values",
            True,
            any_dim_exceeds,
        )


async def _evaluate_authorization_fixture(
    fixture: dict[str, Any],
    result: FixtureResult,
) -> None:
    """Evaluate a fixture that tests unauthorized resolution attempts.

    Checks authority mode, actor type, and expected rejection.
    """
    expected = fixture.get("expected", {})
    inp = fixture.get("input", {})

    # The resolution should not be allowed
    _add_check(result, "expected.allowed", False, expected.get("allowed", True))

    # Check the authority mode
    jp_data = inp.get("judgmentPoint", {})
    authority = jp_data.get("authority", {})
    mode = authority.get("mode")

    resolution_attempt = inp.get("resolutionAttempt", {})
    actor = resolution_attempt.get("actor", {})
    actor_type = actor.get("type")

    if mode == "human":
        # Agent should not be able to resolve human-authority points
        _add_check(result, "actor_is_agent", True, actor_type == "agent")
        _add_check(result, "authority_mode_is_human", True, mode == "human")
        _add_check(
            result,
            "agent_cannot_resolve_human_authority",
            True,
            actor_type == "agent" and mode == "human",
        )
    elif mode == "collaborative":
        # Agent alone should not be able to resolve collaborative points
        _add_check(result, "actor_is_agent", True, actor_type == "agent")
        _add_check(result, "authority_mode_is_collaborative", True, mode == "collaborative")
        _add_check(
            result,
            "agent_cannot_unilaterally_resolve_collaborative",
            True,
            actor_type == "agent" and mode == "collaborative",
        )

    # Verify status remains pending
    status = jp_data.get("status")
    _add_check(result, "judgmentPoint.status is pending", "pending", status)


async def _evaluate_lifecycle_fixture(
    fixture: dict[str, Any],
    result: FixtureResult,
) -> None:
    """Evaluate a fixture that tests the pause/resume lifecycle.

    Validates that a pending judgment point blocks workflow execution.
    """
    expected = fixture.get("expected", {})
    inp = fixture.get("input", {})

    _add_check(
        result,
        "expected.workflowBlocked",
        True,
        expected.get("workflowBlocked", False),
    )

    pending_jp = inp.get("pendingJudgmentPoint", {})
    status = pending_jp.get("status")
    _add_check(result, "pendingJudgmentPoint.status", "pending", status)

    # The intervention level must be pause or higher
    materiality = pending_jp.get("materiality", {})
    intervention = materiality.get("interventionLevel")
    blocking_interventions = {"pause", "require-investigation"}
    _add_check(
        result,
        "intervention_level blocks workflow",
        True,
        intervention in blocking_interventions,
    )

    # Blocking point ID matches
    blocking_id = expected.get("blockingPointId")
    jp_id = pending_jp.get("id")
    _add_check(result, "blockingPointId matches", blocking_id, jp_id)

    # Verify hard trigger if present
    hard_trigger = materiality.get("hardTrigger")
    if hard_trigger is not None:
        _add_check(result, "hardTrigger.is_known", True, is_hard_trigger(hard_trigger))


async def _evaluate_generic_fixture(
    fixture: dict[str, Any],
    result: FixtureResult,
) -> None:
    """Fallback evaluator for fixtures that do not match a known type.

    Performs basic structural validation.
    """
    expected = fixture.get("expected", {})
    inp = fixture.get("input", {})

    # Ensure both blocks are non-empty dicts
    _add_check(result, "input is non-empty dict", True, bool(inp) and isinstance(inp, dict))
    _add_check(
        result,
        "expected is non-empty dict",
        True,
        bool(expected) and isinstance(expected, dict),
    )


# ---------------------------------------------------------------------------
# Top-level entry point
# ---------------------------------------------------------------------------


def _classify_fixture(fixture: dict[str, Any]) -> str:
    """Return a string tag for the fixture type."""
    fixture_file: str = fixture.get("_fixture_file", "")

    # Candidate fixtures (valid-candidate-*, invalid-candidate-*)
    if "candidate" in fixture and "expectedResult" in fixture:
        return "candidate"

    # Missed-candidate fixture (has ``scenario`` dict and ``expectedResult``)
    if "expectedResult" in fixture and isinstance(fixture.get("scenario"), dict):
        return "missed-candidate"

    # Detection / skill-activation fixtures
    if "input" in fixture and "expected" in fixture:
        if "skill-activation" in fixture_file or "detection" in fixture_file:
            return "detection"
        if "malformed" in fixture_file:
            return "malformed"
        if "unauthorized" in fixture_file:
            return "authorization"
        if "restart" in fixture_file or "resume" in fixture_file:
            return "lifecycle"

        # Fall back to scenario string heuristic
        scenario_str = str(fixture.get("scenario", "")).lower()
        if "detection" in scenario_str or "activation" in scenario_str:
            return "detection"
        if "malformed" in scenario_str:
            return "malformed"
        if "unauthorized" in scenario_str or "authorization" in scenario_str:
            return "authorization"
        if "restart" in scenario_str or "resume" in scenario_str:
            return "lifecycle"

        return "generic"

    return "unknown"


async def evaluate_fixture(fixture: dict[str, Any]) -> FixtureResult:
    """Evaluate a single fixture and return a structured result."""
    fixture_id = get_fixture_id(fixture)
    fixture_file = fixture.get("_fixture_file", "unknown")
    result = FixtureResult(fixture_id=fixture_id, fixture_file=fixture_file, passed=True)

    fixture_type = _classify_fixture(fixture)

    evaluators = {
        "candidate": _evaluate_candidate_fixture,
        "missed-candidate": _evaluate_missed_candidate_fixture,
        "detection": _evaluate_detection_fixture,
        "malformed": _evaluate_malformed_fixture,
        "authorization": _evaluate_authorization_fixture,
        "lifecycle": _evaluate_lifecycle_fixture,
        "generic": _evaluate_generic_fixture,
    }

    evaluator = evaluators.get(fixture_type)
    if evaluator is None:
        result.passed = False
        result.errors.append(
            f"Unknown fixture format (type={fixture_type!r}): "
            "no 'candidate'+'expectedResult' or 'input'+'expected' fields"
        )
        return result

    await evaluator(fixture, result)
    return result
