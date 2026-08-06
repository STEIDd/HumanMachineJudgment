import { generateId } from './id.js';
import type {
  Actor,
  ArtifactReference,
  EventType,
  JudgmentAlternative,
  JudgmentEvent,
  JudgmentResolution,
  JudgmentStatus,
} from './types.js';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function createBaseEvent(
  eventType: EventType,
  judgmentPointId: string,
  projectId: string,
  actor: Actor,
  payload?: Record<string, unknown>,
  metadata?: Record<string, unknown>,
): JudgmentEvent {
  return {
    id: generateId(),
    judgmentPointId,
    projectId,
    eventType,
    timestamp: new Date().toISOString(),
    actorId: actor.id,
    actorType: actor.type,
    payload,
    metadata,
  };
}

// ---------------------------------------------------------------------------
// Event creation functions
// ---------------------------------------------------------------------------

export interface CreateCandidateEventParams {
  readonly judgmentPointId: string;
  readonly projectId: string;
  readonly actor: Actor;
  readonly candidateData: Record<string, unknown>;
}

export function createCreatedEvent(params: CreateCandidateEventParams): JudgmentEvent {
  return createBaseEvent(
    'created',
    params.judgmentPointId,
    params.projectId,
    params.actor,
    params.candidateData,
    { previousStatus: undefined, newStatus: 'candidate' },
  );
}

export interface StatusTransitionEventParams {
  readonly judgmentPointId: string;
  readonly projectId: string;
  readonly actor: Actor;
  readonly previousStatus: JudgmentStatus;
  readonly newStatus: JudgmentStatus;
  readonly payload?: Record<string, unknown>;
}

export function createPromotedEvent(params: StatusTransitionEventParams): JudgmentEvent {
  return createBaseEvent(
    'promoted',
    params.judgmentPointId,
    params.projectId,
    params.actor,
    params.payload,
    {
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
    },
  );
}

export function createInvestigationStartedEvent(
  params: StatusTransitionEventParams,
): JudgmentEvent {
  return createBaseEvent(
    'investigation-started',
    params.judgmentPointId,
    params.projectId,
    params.actor,
    params.payload,
    {
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
    },
  );
}

export interface ResolutionEventParams {
  readonly judgmentPointId: string;
  readonly projectId: string;
  readonly actor: Actor;
  readonly previousStatus: JudgmentStatus;
  readonly resolution: JudgmentResolution;
}

export function createResolutionRecordedEvent(params: ResolutionEventParams): JudgmentEvent {
  return createBaseEvent(
    'resolution-recorded',
    params.judgmentPointId,
    params.projectId,
    params.actor,
    params.resolution as unknown as Record<string, unknown>,
    { previousStatus: params.previousStatus, newStatus: 'resolved' },
  );
}

export interface DelegationEventParams {
  readonly judgmentPointId: string;
  readonly projectId: string;
  readonly actor: Actor;
  readonly previousStatus: JudgmentStatus;
  readonly delegateId: string;
  readonly policyId: string;
}

export function createDelegatedEvent(params: DelegationEventParams): JudgmentEvent {
  return createBaseEvent(
    'delegated',
    params.judgmentPointId,
    params.projectId,
    params.actor,
    {
      delegateId: params.delegateId,
      policyId: params.policyId,
    },
    { previousStatus: params.previousStatus, newStatus: 'delegated' },
  );
}

export interface DismissalEventParams {
  readonly judgmentPointId: string;
  readonly projectId: string;
  readonly actor: Actor;
  readonly previousStatus: JudgmentStatus;
  readonly reason: string;
}

export function createDismissedEvent(params: DismissalEventParams): JudgmentEvent {
  return createBaseEvent(
    'dismissed',
    params.judgmentPointId,
    params.projectId,
    params.actor,
    { reason: params.reason },
    { previousStatus: params.previousStatus, newStatus: 'dismissed' },
  );
}

export interface ReopenEventParams {
  readonly judgmentPointId: string;
  readonly projectId: string;
  readonly actor: Actor;
  readonly previousStatus: JudgmentStatus;
  readonly reason: string;
}

export function createReopenedEvent(params: ReopenEventParams): JudgmentEvent {
  return createBaseEvent(
    'reopened',
    params.judgmentPointId,
    params.projectId,
    params.actor,
    { reason: params.reason },
    { previousStatus: params.previousStatus, newStatus: 'reopened' },
  );
}

export interface StaleEventParams {
  readonly judgmentPointId: string;
  readonly projectId: string;
  readonly actor: Actor;
  readonly reason: string;
  readonly previousStatus?: JudgmentStatus;
}

export function createMarkedStaleEvent(params: StaleEventParams): JudgmentEvent {
  return createBaseEvent(
    'marked-stale',
    params.judgmentPointId,
    params.projectId,
    params.actor,
    { reason: params.reason },
    { previousStatus: params.previousStatus ?? 'resolved', newStatus: 'stale' },
  );
}

export interface DependencyChangedEventParams {
  readonly judgmentPointId: string;
  readonly projectId: string;
  readonly actor: Actor;
  readonly upstreamId: string;
  readonly changeDescription: string;
}

export function createDependencyChangedEvent(params: DependencyChangedEventParams): JudgmentEvent {
  return createBaseEvent(
    'dependency-changed',
    params.judgmentPointId,
    params.projectId,
    params.actor,
    {
      upstreamId: params.upstreamId,
      changeDescription: params.changeDescription,
    },
  );
}

export interface ArtifactLinkedEventParams {
  readonly judgmentPointId: string;
  readonly projectId: string;
  readonly actor: Actor;
  readonly artifact: ArtifactReference;
}

export function createArtifactLinkedEvent(params: ArtifactLinkedEventParams): JudgmentEvent {
  return createBaseEvent(
    'artifact-linked',
    params.judgmentPointId,
    params.projectId,
    params.actor,
    params.artifact as unknown as Record<string, unknown>,
  );
}

export interface ArtifactUnlinkedEventParams {
  readonly judgmentPointId: string;
  readonly projectId: string;
  readonly actor: Actor;
  readonly artifactId: string;
  readonly reason: string;
}

export function createArtifactUnlinkedEvent(params: ArtifactUnlinkedEventParams): JudgmentEvent {
  return createBaseEvent(
    'artifact-unlinked',
    params.judgmentPointId,
    params.projectId,
    params.actor,
    { artifactId: params.artifactId, reason: params.reason },
  );
}

export interface AlternativeAddedEventParams {
  readonly judgmentPointId: string;
  readonly projectId: string;
  readonly actor: Actor;
  readonly alternative: JudgmentAlternative;
}

export function createAlternativeAddedEvent(params: AlternativeAddedEventParams): JudgmentEvent {
  return createBaseEvent(
    'alternative-added',
    params.judgmentPointId,
    params.projectId,
    params.actor,
    params.alternative as unknown as Record<string, unknown>,
  );
}

export interface ComparisonRequestedEventParams {
  readonly judgmentPointId: string;
  readonly projectId: string;
  readonly actor: Actor;
  readonly alternativeIds: readonly string[];
  readonly criteria?: string;
}

export function createComparisonRequestedEvent(
  params: ComparisonRequestedEventParams,
): JudgmentEvent {
  return createBaseEvent(
    'comparison-requested',
    params.judgmentPointId,
    params.projectId,
    params.actor,
    {
      alternativeIds: params.alternativeIds,
      criteria: params.criteria,
    },
  );
}

export interface ComparisonCompletedEventParams {
  readonly judgmentPointId: string;
  readonly projectId: string;
  readonly actor: Actor;
  readonly results: Record<string, unknown>;
}

export function createComparisonCompletedEvent(
  params: ComparisonCompletedEventParams,
): JudgmentEvent {
  return createBaseEvent(
    'comparison-completed',
    params.judgmentPointId,
    params.projectId,
    params.actor,
    params.results,
  );
}

export interface ValidityConditionChangedEventParams {
  readonly judgmentPointId: string;
  readonly projectId: string;
  readonly actor: Actor;
  readonly previousCondition?: string;
  readonly newCondition?: string;
  readonly reason: string;
}

export function createValidityConditionChangedEvent(
  params: ValidityConditionChangedEventParams,
): JudgmentEvent {
  return createBaseEvent(
    'validity-condition-changed',
    params.judgmentPointId,
    params.projectId,
    params.actor,
    {
      previousCondition: params.previousCondition,
      newCondition: params.newCondition,
      reason: params.reason,
    },
  );
}
