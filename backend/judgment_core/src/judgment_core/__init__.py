"""Core domain types, state machine, lifecycle guards, and business logic for Judgment Points."""

__version__ = "0.1.0"

from judgment_core.authority import (
    can_delegate as can_delegate,
)
from judgment_core.authority import (
    can_dismiss as can_dismiss,
)
from judgment_core.authority import (
    can_investigate as can_investigate,
)
from judgment_core.authority import (
    can_mark_stale as can_mark_stale,
)
from judgment_core.authority import (
    can_promote as can_promote,
)
from judgment_core.authority import (
    can_reopen as can_reopen,
)
from judgment_core.authority import (
    can_resolve as can_resolve,
)
from judgment_core.authority import (
    get_default_authority as get_default_authority,
)
from judgment_core.coordinator import (
    PauseCoordinator as PauseCoordinator,
)
from judgment_core.coordinator import (
    PauseResult as PauseResult,
)
from judgment_core.coordinator import (
    ResumeResult as ResumeResult,
)
from judgment_core.coordinator import (
    WorkflowState as WorkflowState,
)
from judgment_core.dependency_graph import DependencyGraph as DependencyGraph
from judgment_core.detection import (
    DetectionContext as DetectionContext,
)
from judgment_core.detection import (
    DetectionResult as DetectionResult,
)
from judgment_core.detection import (
    DetectionRule as DetectionRule,
)
from judgment_core.detection import (
    DetectionSummary as DetectionSummary,
)
from judgment_core.detection import (
    DeterministicDetector as DeterministicDetector,
)
from judgment_core.detection import (
    HardTriggerDetectionRule as HardTriggerDetectionRule,
)
from judgment_core.detection import (
    KeywordDetectionRule as KeywordDetectionRule,
)
from judgment_core.detection import (
    ModelDetectorAdapter as ModelDetectorAdapter,
)
from judgment_core.detection import (
    create_default_hard_trigger_rules as create_default_hard_trigger_rules,
)
from judgment_core.errors import (
    DuplicateError as DuplicateError,
)
from judgment_core.errors import (
    GuardError as GuardError,
)
from judgment_core.errors import (
    InvalidTransitionError as InvalidTransitionError,
)
from judgment_core.errors import (
    JudgmentError as JudgmentError,
)
from judgment_core.errors import (
    NotFoundError as NotFoundError,
)
from judgment_core.errors import (
    PolicyViolationError as PolicyViolationError,
)
from judgment_core.errors import (
    UnauthorizedResolutionError as UnauthorizedResolutionError,
)
from judgment_core.errors import (
    ValidationError as ValidationError,
)
from judgment_core.events import (
    create_alternative_added_event as create_alternative_added_event,
)
from judgment_core.events import (
    create_artifact_linked_event as create_artifact_linked_event,
)
from judgment_core.events import (
    create_artifact_unlinked_event as create_artifact_unlinked_event,
)
from judgment_core.events import (
    create_comparison_completed_event as create_comparison_completed_event,
)
from judgment_core.events import (
    create_comparison_requested_event as create_comparison_requested_event,
)
from judgment_core.events import (
    create_created_event as create_created_event,
)
from judgment_core.events import (
    create_delegated_event as create_delegated_event,
)
from judgment_core.events import (
    create_dependency_changed_event as create_dependency_changed_event,
)
from judgment_core.events import (
    create_dismissed_event as create_dismissed_event,
)
from judgment_core.events import (
    create_investigation_started_event as create_investigation_started_event,
)
from judgment_core.events import (
    create_marked_stale_event as create_marked_stale_event,
)
from judgment_core.events import (
    create_promoted_event as create_promoted_event,
)
from judgment_core.events import (
    create_reopened_event as create_reopened_event,
)
from judgment_core.events import (
    create_resolution_recorded_event as create_resolution_recorded_event,
)
from judgment_core.events import (
    create_validity_condition_changed_event as create_validity_condition_changed_event,
)
from judgment_core.hard_triggers import (
    ALL_HARD_TRIGGERS as ALL_HARD_TRIGGERS,
)
from judgment_core.hard_triggers import (
    HardTriggerDefinition as HardTriggerDefinition,
)
from judgment_core.hard_triggers import (
    get_hard_trigger as get_hard_trigger,
)
from judgment_core.hard_triggers import (
    get_hard_trigger_intervention as get_hard_trigger_intervention,
)
from judgment_core.hard_triggers import (
    is_hard_trigger as is_hard_trigger,
)
from judgment_core.id_gen import generate_id as generate_id
from judgment_core.materiality import (
    compare_intervention_levels as compare_intervention_levels,
)
from judgment_core.materiality import (
    compute_aggregate_score as compute_aggregate_score,
)
from judgment_core.materiality import (
    compute_intervention_level as compute_intervention_level,
)
from judgment_core.materiality import (
    more_restrictive as more_restrictive,
)
from judgment_core.materiality import (
    score_to_intervention_level as score_to_intervention_level,
)
from judgment_core.policy_engine import (
    PolicyEvalResult as PolicyEvalResult,
)
from judgment_core.policy_engine import (
    PolicyRuleMatch as PolicyRuleMatch,
)
from judgment_core.policy_engine import (
    evaluate_policies as evaluate_policies,
)
from judgment_core.policy_engine import (
    evaluate_policy as evaluate_policy,
)
from judgment_core.policy_engine import (
    evaluate_rule_condition as evaluate_rule_condition,
)
from judgment_core.policy_engine import (
    matches_scope as matches_scope,
)
from judgment_core.policy_engine import (
    resolve_conflicts as resolve_conflicts,
)
from judgment_core.projection import (
    apply_event as apply_event,
)
from judgment_core.projection import (
    project_current_state as project_current_state,
)
from judgment_core.roles import (
    AgentContext as AgentContext,
)
from judgment_core.roles import (
    AnalystRole as AnalystRole,
)
from judgment_core.roles import (
    CriticRole as CriticRole,
)
from judgment_core.roles import (
    DetectorRole as DetectorRole,
)
from judgment_core.roles import (
    ExecutorRole as ExecutorRole,
)
from judgment_core.roles import (
    RoleName as RoleName,
)
from judgment_core.roles import (
    select_role as select_role,
)
from judgment_core.staleness import (
    StalenessCheckResult as StalenessCheckResult,
)
from judgment_core.staleness import (
    check_staleness as check_staleness,
)
from judgment_core.staleness import (
    propagate_staleness as propagate_staleness,
)
from judgment_core.state_machine import (
    assert_transition as assert_transition,
)
from judgment_core.state_machine import (
    get_transition_event as get_transition_event,
)
from judgment_core.state_machine import (
    get_valid_target_states as get_valid_target_states,
)
from judgment_core.state_machine import (
    is_valid_transition as is_valid_transition,
)
from judgment_core.storage import (
    EventFilters as EventFilters,
)
from judgment_core.storage import (
    JudgmentPointFilters as JudgmentPointFilters,
)
from judgment_core.storage import (
    JudgmentStorage as JudgmentStorage,
)
from judgment_core.storage import (
    PaginatedResult as PaginatedResult,
)
from judgment_core.types import (
    ACTOR_TYPES as ACTOR_TYPES,
)
from judgment_core.types import (
    ALTERNATIVE_SOURCES as ALTERNATIVE_SOURCES,
)
from judgment_core.types import (
    ARTIFACT_TYPES as ARTIFACT_TYPES,
)
from judgment_core.types import (
    AUTHORITY_MODES as AUTHORITY_MODES,
)
from judgment_core.types import (
    EVENT_TYPES as EVENT_TYPES,
)
from judgment_core.types import (
    INTERVENTION_LEVELS as INTERVENTION_LEVELS,
)
from judgment_core.types import (
    JUDGMENT_CATEGORIES as JUDGMENT_CATEGORIES,
)
from judgment_core.types import (
    JUDGMENT_STATUSES as JUDGMENT_STATUSES,
)
from judgment_core.types import (
    RELATIONSHIP_TYPES as RELATIONSHIP_TYPES,
)
from judgment_core.types import (
    RESOLUTION_TYPES as RESOLUTION_TYPES,
)
from judgment_core.types import (
    TRIGGER_SOURCES as TRIGGER_SOURCES,
)
from judgment_core.types import (
    Actor as Actor,
)
from judgment_core.types import (
    ActorType as ActorType,
)
from judgment_core.types import (
    AlternativeSource as AlternativeSource,
)
from judgment_core.types import (
    ArtifactLineRange as ArtifactLineRange,
)
from judgment_core.types import (
    ArtifactLocation as ArtifactLocation,
)
from judgment_core.types import (
    ArtifactReference as ArtifactReference,
)
from judgment_core.types import (
    ArtifactType as ArtifactType,
)
from judgment_core.types import (
    AuthorityMode as AuthorityMode,
)
from judgment_core.types import (
    AuthorityOverride as AuthorityOverride,
)
from judgment_core.types import (
    DelegationConditions as DelegationConditions,
)
from judgment_core.types import (
    DimensionThresholds as DimensionThresholds,
)
from judgment_core.types import (
    EventMetadata as EventMetadata,
)
from judgment_core.types import (
    EventType as EventType,
)
from judgment_core.types import (
    GuardResult as GuardResult,
)
from judgment_core.types import (
    InterventionLevel as InterventionLevel,
)
from judgment_core.types import (
    JudgmentAlternative as JudgmentAlternative,
)
from judgment_core.types import (
    JudgmentAuthority as JudgmentAuthority,
)
from judgment_core.types import (
    JudgmentCategory as JudgmentCategory,
)
from judgment_core.types import (
    JudgmentEvent as JudgmentEvent,
)
from judgment_core.types import (
    JudgmentPoint as JudgmentPoint,
)
from judgment_core.types import (
    JudgmentPolicy as JudgmentPolicy,
)
from judgment_core.types import (
    JudgmentResolution as JudgmentResolution,
)
from judgment_core.types import (
    JudgmentRevision as JudgmentRevision,
)
from judgment_core.types import (
    JudgmentStatus as JudgmentStatus,
)
from judgment_core.types import (
    JudgmentTrigger as JudgmentTrigger,
)
from judgment_core.types import (
    MaterialityAssessment as MaterialityAssessment,
)
from judgment_core.types import (
    MaterialityDimensions as MaterialityDimensions,
)
from judgment_core.types import (
    PolicyRule as PolicyRule,
)
from judgment_core.types import (
    PolicyScope as PolicyScope,
)
from judgment_core.types import (
    RelationshipType as RelationshipType,
)
from judgment_core.types import (
    ResolutionType as ResolutionType,
)
from judgment_core.types import (
    RuleCondition as RuleCondition,
)
from judgment_core.types import (
    StandaloneResolution as StandaloneResolution,
)
from judgment_core.types import (
    TriggerSource as TriggerSource,
)
