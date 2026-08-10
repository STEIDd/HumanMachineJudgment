"""Public type aliases and re-exports from generated Pydantic models.

The generated models in ``_generated/`` are the source of truth for data shapes.
This module re-exports them with canonical names and adds lightweight types
(e.g. ``Actor``) that are not part of the JSON Schema but are used throughout
the domain logic.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

# ---------------------------------------------------------------------------
# Re-export generated models
# ---------------------------------------------------------------------------
from judgment_core._generated.artifact_reference_schema import (
    ArtifactReference,
    ArtifactType,
)
from judgment_core._generated.artifact_reference_schema import (
    LineRange as ArtifactLineRange,
)
from judgment_core._generated.artifact_reference_schema import (
    Location as ArtifactLocation,
)
from judgment_core._generated.artifact_reference_schema import (
    Relationship as RelationshipType,
)
from judgment_core._generated.judgment_event_schema import (
    ActorType,
    EventType,
    JudgmentEvent,
)
from judgment_core._generated.judgment_event_schema import (
    Metadata as EventMetadata,
)
from judgment_core._generated.judgment_point_schema import (
    Category as JudgmentCategory,
)
from judgment_core._generated.judgment_point_schema import (
    Dimensions as MaterialityDimensions,
)
from judgment_core._generated.judgment_point_schema import (
    InterventionLevel,
    JudgmentAlternative,
    JudgmentAuthority,
    JudgmentPoint,
    JudgmentResolution,
    JudgmentRevision,
    JudgmentTrigger,
    MaterialityAssessment,
)
from judgment_core._generated.judgment_point_schema import (
    Mode as AuthorityMode,
)
from judgment_core._generated.judgment_point_schema import (
    Source as TriggerSource,
)
from judgment_core._generated.judgment_point_schema import (
    Source1 as AlternativeSource,
)
from judgment_core._generated.judgment_point_schema import (
    Status as JudgmentStatus,
)
from judgment_core._generated.judgment_policy_schema import (
    AuthorityOverride,
    DelegationConditions,
    DimensionThresholds,
    JudgmentPolicy,
    PolicyRule,
    PolicyScope,
    RuleCondition,
)
from judgment_core._generated.judgment_resolution_schema import (
    JudgmentResolution as StandaloneResolution,
)
from judgment_core._generated.judgment_resolution_schema import (
    ResolutionType,
)

# ---------------------------------------------------------------------------
# Constant tuples (useful for iteration and validation)
# ---------------------------------------------------------------------------

JUDGMENT_CATEGORIES = tuple(JudgmentCategory)
JUDGMENT_STATUSES = tuple(JudgmentStatus)
INTERVENTION_LEVELS = tuple(InterventionLevel)
AUTHORITY_MODES = tuple(AuthorityMode)
ACTOR_TYPES = tuple(ActorType)
TRIGGER_SOURCES = tuple(TriggerSource)
ARTIFACT_TYPES = tuple(ArtifactType)
RELATIONSHIP_TYPES = tuple(RelationshipType)
EVENT_TYPES = tuple(EventType)
RESOLUTION_TYPES = tuple(ResolutionType)
ALTERNATIVE_SOURCES = tuple(AlternativeSource)


# ---------------------------------------------------------------------------
# Actor — not part of the JSON schemas but used throughout domain logic
# ---------------------------------------------------------------------------


class Actor(BaseModel):
    """Identifies who performed an action."""

    model_config = ConfigDict(frozen=True)

    id: str
    type: ActorType


# ---------------------------------------------------------------------------
# Guard result — used by lifecycle guard functions
# ---------------------------------------------------------------------------


class GuardResult(BaseModel):
    """Result of a lifecycle guard check."""

    model_config = ConfigDict(frozen=True)

    allowed: bool
    reasons: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Re-export everything for ``from judgment_core.types import *``
# ---------------------------------------------------------------------------

__all__ = [
    # Generated model classes
    "ArtifactLineRange",
    "ArtifactLocation",
    "ArtifactReference",
    "ArtifactType",
    "AuthorityOverride",
    "DelegationConditions",
    "DimensionThresholds",
    "EventMetadata",
    "EventType",
    "InterventionLevel",
    "JudgmentAlternative",
    "JudgmentAuthority",
    "JudgmentCategory",
    "JudgmentEvent",
    "JudgmentPoint",
    "JudgmentPolicy",
    "JudgmentResolution",
    "JudgmentRevision",
    "JudgmentTrigger",
    "MaterialityAssessment",
    "MaterialityDimensions",
    "PolicyRule",
    "PolicyScope",
    "RelationshipType",
    "ResolutionType",
    "RuleCondition",
    "StandaloneResolution",
    # Generated enums re-exported with canonical names
    "ActorType",
    "AlternativeSource",
    "AuthorityMode",
    "JudgmentCategory",
    "JudgmentStatus",
    "TriggerSource",
    # Constant tuples
    "JUDGMENT_CATEGORIES",
    "JUDGMENT_STATUSES",
    "INTERVENTION_LEVELS",
    "AUTHORITY_MODES",
    "ACTOR_TYPES",
    "TRIGGER_SOURCES",
    "ARTIFACT_TYPES",
    "RELATIONSHIP_TYPES",
    "EVENT_TYPES",
    "RESOLUTION_TYPES",
    "ALTERNATIVE_SOURCES",
    # Hand-written types
    "Actor",
    "GuardResult",
]
