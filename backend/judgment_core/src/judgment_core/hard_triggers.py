"""Hard trigger definitions from the specification.

Hard triggers force a specific intervention level regardless of materiality score.
"""

from __future__ import annotations

from dataclasses import dataclass

from judgment_core.types import InterventionLevel


@dataclass(frozen=True)
class HardTriggerDefinition:
    name: str
    description: str
    default_intervention: InterventionLevel


ALL_HARD_TRIGGERS: tuple[HardTriggerDefinition, ...] = (
    HardTriggerDefinition(
        name="objective-redefinition",
        description="The agent is changing or redefining the stated objective of the analysis.",
        default_intervention=InterventionLevel.require_investigation,
    ),
    HardTriggerDefinition(
        name="safety-factor-selection",
        description=(
            "The agent is selecting or modifying a safety factor, "
            "design margin, or knockdown factor."
        ),
        default_intervention=InterventionLevel.pause,
    ),
    HardTriggerDefinition(
        name="data-exclusion",
        description="The agent is excluding, filtering, or discarding data points from a dataset.",
        default_intervention=InterventionLevel.pause,
    ),
    HardTriggerDefinition(
        name="irreversible-commitment",
        description=(
            "The agent is making a commitment that cannot be reversed within the project timeline."
        ),
        default_intervention=InterventionLevel.pause,
    ),
    HardTriggerDefinition(
        name="validation-criterion-selection",
        description=(
            "The agent is defining or modifying the criteria used to determine "
            "whether results are acceptable."
        ),
        default_intervention=InterventionLevel.pause,
    ),
    HardTriggerDefinition(
        name="external-requirement-interpretation",
        description=(
            "The agent is interpreting an external requirement, standard, or specification "
            "in a way that involves discretion."
        ),
        default_intervention=InterventionLevel.pause,
    ),
    HardTriggerDefinition(
        name="contradictory-evidence",
        description=(
            "The agent has encountered evidence that contradicts a prior assumption or decision."
        ),
        default_intervention=InterventionLevel.require_investigation,
    ),
    HardTriggerDefinition(
        name="model-substitution",
        description=(
            "The agent is replacing one analytical or computational model with a different model."
        ),
        default_intervention=InterventionLevel.pause,
    ),
    HardTriggerDefinition(
        name="worst-case-best-case-assumption",
        description=(
            "The agent is assuming a worst-case or best-case value for a parameter "
            "where the actual value is uncertain."
        ),
        default_intervention=InterventionLevel.disclose,
    ),
    HardTriggerDefinition(
        name="conclusion-recommendation-formulation",
        description=(
            "The agent is formulating a conclusion or recommendation based on analysis results."
        ),
        default_intervention=InterventionLevel.pause,
    ),
)

_TRIGGER_MAP: dict[str, HardTriggerDefinition] = {t.name: t for t in ALL_HARD_TRIGGERS}


def get_hard_trigger(name: str) -> HardTriggerDefinition | None:
    """Look up a hard trigger definition by name."""
    return _TRIGGER_MAP.get(name)


def get_hard_trigger_intervention(name: str) -> InterventionLevel:
    """Get the default intervention level for a named hard trigger.

    Returns ``pause`` if the trigger name is unknown.
    """
    trigger = _TRIGGER_MAP.get(name)
    return trigger.default_intervention if trigger is not None else InterventionLevel.pause


def is_hard_trigger(name: str) -> bool:
    """Check whether a name corresponds to a known hard trigger."""
    return name in _TRIGGER_MAP
