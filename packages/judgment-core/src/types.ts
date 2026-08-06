/**
 * Core domain types for the Human-Machine Judgment system.
 *
 * These types are hand-written from the canonical JSON schemas.
 * This package owns the canonical TypeScript types (ADR-004).
 */

// ---------------------------------------------------------------------------
// Enums / Union Types
// ---------------------------------------------------------------------------

export const JUDGMENT_CATEGORIES = [
  'objective',
  'framing',
  'assumption',
  'method',
  'data',
  'parameter',
  'validation',
  'interpretation',
] as const;
export type JudgmentCategory = (typeof JUDGMENT_CATEGORIES)[number];

export const JUDGMENT_STATUSES = [
  'candidate',
  'pending',
  'investigating',
  'resolved',
  'delegated',
  'stale',
  'reopened',
  'dismissed',
] as const;
export type JudgmentStatus = (typeof JUDGMENT_STATUSES)[number];

export const INTERVENTION_LEVELS = ['trace', 'disclose', 'pause', 'require-investigation'] as const;
export type InterventionLevel = (typeof INTERVENTION_LEVELS)[number];

export const AUTHORITY_MODES = ['human', 'collaborative', 'delegated', 'rule'] as const;
export type AuthorityMode = (typeof AUTHORITY_MODES)[number];

export const ACTOR_TYPES = ['user', 'agent', 'system', 'policy'] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const TRIGGER_SOURCES = [
  'agent',
  'rule',
  'skill',
  'tool',
  'user',
  'dependency-change',
] as const;
export type TriggerSource = (typeof TRIGGER_SOURCES)[number];

export const ARTIFACT_TYPES = [
  'cell',
  'parameter',
  'model',
  'plot',
  'conclusion',
  'dataset',
  'standard',
  'requirement',
  'document',
  'computation',
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const RELATIONSHIP_TYPES = [
  'depends-on',
  'informs',
  'produced-by',
  'validates',
  'contradicts',
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const EVENT_TYPES = [
  'created',
  'promoted',
  'investigation-started',
  'resolution-recorded',
  'delegated',
  'dismissed',
  'reopened',
  'marked-stale',
  'dependency-changed',
  'artifact-linked',
  'artifact-unlinked',
  'alternative-added',
  'comparison-requested',
  'comparison-completed',
  'validity-condition-changed',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const RESOLUTION_TYPES = [
  'direct-human',
  'collaborative',
  'delegated',
  'rule-based',
  'inherited',
] as const;
export type ResolutionType = (typeof RESOLUTION_TYPES)[number];

export const ALTERNATIVE_SOURCES = ['agent', 'user', 'standard', 'prior-decision'] as const;
export type AlternativeSource = (typeof ALTERNATIVE_SOURCES)[number];

// ---------------------------------------------------------------------------
// Actor
// ---------------------------------------------------------------------------

export interface Actor {
  readonly id: string;
  readonly type: ActorType;
}

// ---------------------------------------------------------------------------
// Artifact Reference
// ---------------------------------------------------------------------------

export interface ArtifactLocation {
  readonly filePath?: string;
  readonly cellId?: string;
  readonly lineRange?: {
    readonly start: number;
    readonly end: number;
  };
  readonly uri?: string;
}

export interface ArtifactReference {
  readonly id: string;
  readonly artifactType: ArtifactType;
  readonly label: string;
  readonly relationship: RelationshipType;
  readonly location?: ArtifactLocation;
  readonly description?: string;
}

// ---------------------------------------------------------------------------
// Judgment Trigger
// ---------------------------------------------------------------------------

export interface JudgmentTrigger {
  readonly source: TriggerSource;
  readonly description: string;
  readonly hardTrigger?: string;
  readonly ruleId?: string;
}

// ---------------------------------------------------------------------------
// Materiality
// ---------------------------------------------------------------------------

export interface MaterialityDimensions {
  readonly methodologicalDiscretion: number;
  readonly downstreamInfluence: number;
  readonly uncertainty: number;
  readonly consequence: number;
  readonly reversibility: number;
  readonly accountabilityRequirement: number;
}

export interface MaterialityAssessment {
  readonly score: number;
  readonly dimensions: MaterialityDimensions;
  readonly detectorConfidence?: number;
  readonly hardTrigger?: string;
  readonly interventionLevel?: InterventionLevel;
}

// ---------------------------------------------------------------------------
// Judgment Alternative
// ---------------------------------------------------------------------------

export interface JudgmentAlternative {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly tradeoffs?: string;
  readonly evidenceRefs?: readonly ArtifactReference[];
  readonly source?: AlternativeSource;
  readonly comparisonData?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Judgment Authority
// ---------------------------------------------------------------------------

export interface JudgmentAuthority {
  readonly mode: AuthorityMode;
  readonly actorId?: string;
  readonly policyId?: string;
}

// ---------------------------------------------------------------------------
// Judgment Resolution (embedded in JudgmentPoint)
// ---------------------------------------------------------------------------

export interface JudgmentResolution {
  readonly selectedAlternativeId: string;
  readonly rationale: string;
  readonly uncertainty?: readonly string[];
  readonly conditions?: readonly string[];
  readonly validationRequirements?: readonly string[];
  readonly resolvedAt: string;
  readonly resolvedBy?: string;
}

// ---------------------------------------------------------------------------
// Standalone Resolution (from judgment-resolution.schema.json)
// Extends embedded resolution with bias-awareness fields.
// ---------------------------------------------------------------------------

export interface StandaloneResolution extends JudgmentResolution {
  readonly resolutionType: ResolutionType;
  readonly informationPresented?: readonly string[];
  readonly alternativesConsidered: readonly string[];
  readonly initialPosition?: string;
  readonly recommendationShown: boolean;
}

// ---------------------------------------------------------------------------
// Judgment Revision
// ---------------------------------------------------------------------------

export interface JudgmentRevision {
  readonly timestamp: string;
  readonly previousStatus: JudgmentStatus;
  readonly newStatus: JudgmentStatus;
  readonly reason: string;
  readonly previousResolution?: JudgmentResolution;
  readonly actorId?: string;
}

// ---------------------------------------------------------------------------
// Judgment Point
// ---------------------------------------------------------------------------

export interface JudgmentPoint {
  readonly id: string;
  readonly projectId: string;
  readonly category: JudgmentCategory;
  readonly question: string;
  readonly context: string;
  readonly trigger: JudgmentTrigger;
  readonly materiality: MaterialityAssessment;
  readonly status: JudgmentStatus;
  readonly alternatives: readonly JudgmentAlternative[];
  readonly evidenceRefs?: readonly ArtifactReference[];
  readonly affectedArtifactIds: readonly string[];
  readonly authority: JudgmentAuthority;
  readonly resolution?: JudgmentResolution;
  readonly validityConditions: readonly string[];
  readonly reopenConditions: readonly string[];
  readonly revisionHistory?: readonly JudgmentRevision[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

// ---------------------------------------------------------------------------
// Judgment Event
// ---------------------------------------------------------------------------

export interface EventMetadata {
  readonly correlationId?: string;
  readonly sessionId?: string;
  readonly toolName?: string;
  readonly policyId?: string;
  readonly previousStatus?: JudgmentStatus;
  readonly newStatus?: JudgmentStatus;
  readonly notes?: string;
  readonly [key: string]: unknown;
}

export interface JudgmentEvent {
  readonly id: string;
  readonly judgmentPointId: string;
  readonly projectId: string;
  readonly eventType: EventType;
  readonly timestamp: string;
  readonly actorId: string;
  readonly actorType: ActorType;
  readonly payload?: Record<string, unknown>;
  readonly metadata?: EventMetadata;
}

// ---------------------------------------------------------------------------
// Policy Types
// ---------------------------------------------------------------------------

export interface PolicyScope {
  readonly categories?: readonly JudgmentCategory[];
  readonly triggerSources?: readonly TriggerSource[];
  readonly artifactTypes?: readonly ArtifactType[];
  readonly materialityScoreMin?: number;
  readonly materialityScoreMax?: number;
}

export interface RuleCondition {
  readonly materialityScoreMin?: number;
  readonly materialityScoreMax?: number;
  readonly dimensionThresholds?: Partial<MaterialityDimensions>;
  readonly hardTrigger?: string;
  readonly categories?: readonly JudgmentCategory[];
  readonly expression?: string;
}

export interface AuthorityOverride {
  readonly mode: AuthorityMode;
  readonly actorId?: string;
  readonly policyId?: string;
}

export interface DelegationConditions {
  readonly allowed?: boolean;
  readonly maxMaterialityScore?: number;
  readonly requiredConfidence?: number;
  readonly excludedCategories?: readonly JudgmentCategory[];
  readonly requiresPriorHumanResolution?: boolean;
  readonly auditRequired?: boolean;
}

export interface PolicyRule {
  readonly id: string;
  readonly condition: RuleCondition;
  readonly intervention: InterventionLevel;
  readonly authorityOverride?: AuthorityOverride;
  readonly delegationConditions?: DelegationConditions;
  readonly description?: string;
}

export interface JudgmentPolicy {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly description: string;
  readonly scope: PolicyScope;
  readonly rules: readonly PolicyRule[];
  readonly priority: number;
  readonly enabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}
