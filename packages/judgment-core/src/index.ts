/**
 * @human-machine-judgment/core
 *
 * Core domain types, state machine, lifecycle guards, materiality scoring,
 * hard-trigger evaluation, policy evaluation, authority evaluation,
 * resolution validation, dependency invalidation, staleness detection,
 * and event creation for Judgment Points.
 *
 * This package has no dependencies on React, MCP, LangGraph, storage
 * drivers, or model providers.
 */

export const VERSION = '0.1.0';

// Domain types
export type {
  Actor,
  AlternativeSource,
  ArtifactLocation,
  ArtifactReference,
  ArtifactType,
  ActorType,
  AuthorityMode,
  AuthorityOverride,
  DelegationConditions,
  EventMetadata,
  EventType,
  InterventionLevel,
  JudgmentAlternative,
  JudgmentAuthority,
  JudgmentCategory,
  JudgmentEvent,
  JudgmentPoint,
  JudgmentPolicy,
  JudgmentResolution,
  JudgmentRevision,
  JudgmentStatus,
  JudgmentTrigger,
  MaterialityAssessment,
  MaterialityDimensions,
  PolicyRule,
  PolicyScope,
  RelationshipType,
  ResolutionType,
  RuleCondition,
  StandaloneResolution,
  TriggerSource,
} from './types.js';

export {
  JUDGMENT_CATEGORIES,
  JUDGMENT_STATUSES,
  INTERVENTION_LEVELS,
  AUTHORITY_MODES,
  ACTOR_TYPES,
  TRIGGER_SOURCES,
  ARTIFACT_TYPES,
  RELATIONSHIP_TYPES,
  EVENT_TYPES,
  RESOLUTION_TYPES,
  ALTERNATIVE_SOURCES,
} from './types.js';

// ID generation
export { generateId } from './id.js';

// Errors
export {
  JudgmentError,
  InvalidTransitionError,
  UnauthorizedResolutionError,
  ValidationError,
  PolicyViolationError,
  DuplicateError,
  NotFoundError,
  GuardError,
} from './errors.js';

// State machine
export {
  isValidTransition,
  getTransitionEvent,
  assertTransition,
  getValidTargetStates,
} from './state-machine.js';

// Materiality scoring
export {
  computeAggregateScore,
  scoreToInterventionLevel,
  computeInterventionLevel,
  moreRestrictive,
  compareInterventionLevels,
} from './materiality.js';

// Hard triggers
export type { HardTriggerDefinition } from './hard-triggers.js';
export {
  ALL_HARD_TRIGGERS,
  getHardTrigger,
  getHardTriggerIntervention,
  isHardTrigger,
} from './hard-triggers.js';

// Policy engine
export type { PolicyRuleMatch, PolicyEvalResult } from './policy-engine.js';
export {
  matchesScope,
  evaluateRuleCondition,
  evaluatePolicy,
  evaluatePolicies,
  resolveConflicts,
} from './policy-engine.js';

// Authority and guards
export type { GuardResult } from './authority.js';
export {
  getDefaultAuthority,
  canActorResolve,
  validateDelegationConditions,
  canPromote,
  canInvestigate,
  canResolve,
  canDismiss,
  canDelegate,
  canMarkStale,
  canReopen,
} from './authority.js';

// Events
export type {
  CreateCandidateEventParams,
  StatusTransitionEventParams,
  ResolutionEventParams,
  DelegationEventParams,
  DismissalEventParams,
  ReopenEventParams,
  StaleEventParams,
  DependencyChangedEventParams,
  ArtifactLinkedEventParams,
  ArtifactUnlinkedEventParams,
  AlternativeAddedEventParams,
  ComparisonRequestedEventParams,
  ComparisonCompletedEventParams,
  ValidityConditionChangedEventParams,
} from './events.js';
export {
  createCreatedEvent,
  createPromotedEvent,
  createInvestigationStartedEvent,
  createResolutionRecordedEvent,
  createDelegatedEvent,
  createDismissedEvent,
  createReopenedEvent,
  createMarkedStaleEvent,
  createDependencyChangedEvent,
  createArtifactLinkedEvent,
  createArtifactUnlinkedEvent,
  createAlternativeAddedEvent,
  createComparisonRequestedEvent,
  createComparisonCompletedEvent,
  createValidityConditionChangedEvent,
} from './events.js';

// Projection
export { projectCurrentState, applyEvent } from './projection.js';

// Dependency graph
export { DependencyGraph } from './dependency-graph.js';

// Staleness
export type { StalenessCheckResult } from './staleness.js';
export { checkStaleness, propagateStaleness } from './staleness.js';

// Storage interface
export type {
  EventFilters,
  JudgmentPointFilters,
  PaginatedResult,
  JudgmentStorage,
} from './storage.js';
