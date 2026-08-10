"""Tests for the judgment_core.hard_triggers definitions and lookup functions."""

from __future__ import annotations

from judgment_core.hard_triggers import (
    ALL_HARD_TRIGGERS,
    get_hard_trigger,
    get_hard_trigger_intervention,
    is_hard_trigger,
)
from judgment_core.types import InterventionLevel

# The 10 expected hard trigger names in specification order.
EXPECTED_TRIGGER_NAMES: list[str] = [
    "objective-redefinition",
    "safety-factor-selection",
    "data-exclusion",
    "irreversible-commitment",
    "validation-criterion-selection",
    "external-requirement-interpretation",
    "contradictory-evidence",
    "model-substitution",
    "worst-case-best-case-assumption",
    "conclusion-recommendation-formulation",
]


# ---- ALL_HARD_TRIGGERS ---------------------------------------------------------


class TestAllHardTriggers:
    """ALL_HARD_TRIGGERS contains exactly the 10 specified triggers."""

    def test_count_is_ten(self) -> None:
        assert len(ALL_HARD_TRIGGERS) == 10

    def test_all_expected_names_present(self) -> None:
        actual_names = [t.name for t in ALL_HARD_TRIGGERS]
        assert actual_names == EXPECTED_TRIGGER_NAMES

    def test_all_triggers_have_nonempty_description(self) -> None:
        for trigger in ALL_HARD_TRIGGERS:
            assert trigger.description, f"Trigger '{trigger.name}' has empty description"


# ---- get_hard_trigger -----------------------------------------------------------


class TestGetHardTrigger:
    """get_hard_trigger looks up a trigger definition by name."""

    def test_known_trigger_returns_definition(self) -> None:
        trigger = get_hard_trigger("data-exclusion")
        assert trigger is not None
        assert trigger.name == "data-exclusion"
        assert trigger.default_intervention == InterventionLevel.pause

    def test_unknown_trigger_returns_none(self) -> None:
        assert get_hard_trigger("nonexistent-trigger") is None

    def test_each_trigger_is_retrievable(self) -> None:
        for name in EXPECTED_TRIGGER_NAMES:
            trigger = get_hard_trigger(name)
            assert trigger is not None, f"Expected to find trigger '{name}'"
            assert trigger.name == name


# ---- get_hard_trigger_intervention -----------------------------------------------


class TestGetHardTriggerIntervention:
    """get_hard_trigger_intervention returns the default level, or pause for unknowns."""

    def test_objective_redefinition_is_require_investigation(self) -> None:
        assert (
            get_hard_trigger_intervention("objective-redefinition")
            == InterventionLevel.require_investigation
        )

    def test_safety_factor_selection_is_pause(self) -> None:
        assert get_hard_trigger_intervention("safety-factor-selection") == InterventionLevel.pause

    def test_worst_case_best_case_assumption_is_disclose(self) -> None:
        assert (
            get_hard_trigger_intervention("worst-case-best-case-assumption")
            == InterventionLevel.disclose
        )

    def test_contradictory_evidence_is_require_investigation(self) -> None:
        assert (
            get_hard_trigger_intervention("contradictory-evidence")
            == InterventionLevel.require_investigation
        )

    def test_unknown_trigger_defaults_to_pause(self) -> None:
        assert get_hard_trigger_intervention("unknown-trigger") == InterventionLevel.pause


# ---- is_hard_trigger ------------------------------------------------------------


class TestIsHardTrigger:
    """is_hard_trigger checks whether a name is a known hard trigger."""

    def test_known_trigger_returns_true(self) -> None:
        assert is_hard_trigger("data-exclusion") is True

    def test_unknown_trigger_returns_false(self) -> None:
        assert is_hard_trigger("not-a-trigger") is False

    def test_empty_string_returns_false(self) -> None:
        assert is_hard_trigger("") is False
