/**
 * TypeScript types matching the Python FastAPI backend's Pydantic models.
 *
 * The backend serialises with `by_alias=True`, so every field name here
 * uses the camelCase alias that appears on the wire.
 */

// ---------------------------------------------------------------------------
// Shared / enum-like constants
// ---------------------------------------------------------------------------

export type JudgmentCategory =
  | 'objective'
  | 'framing'
  | 'assumption'
  | 'method'
  | 'data'
  | 'parameter'
  | 'validation'
  | 'interpretation';

export type JudgmentStatus =
  | 'candidate'
  | 'pending'
  | 'investigating'
  | 'resolved'
  | 'delegated'
  | 'stale'
  | 'reopened'
  | 'dismissed';

export type TriggerSource = 'agent' | 'rule' | 'skill' | 'tool' | 'user' | 'dependency-change';

export type InterventionLevel = 'trace' | 'disclose' | 'pause' | 'require-investigation';

export type AuthorityMode = 'human' | 'collaborative' | 'delegated' | 'rule';

export type ActorType = 'user' | 'agent' | 'system' | 'policy';

export type EventType =
  | 'created'
  | 'promoted'
  | 'investigation-started'
  | 'resolution-recorded'
  | 'delegated'
  | 'dismissed'
  | 'reopened'
  | 'marked-stale'
  | 'dependency-changed'
  | 'artifact-linked'
  | 'artifact-unlinked'
  | 'alternative-added'
  | 'comparison-requested'
  | 'comparison-completed'
  | 'validity-condition-changed';

export type ArtifactType =
  | 'cell'
  | 'parameter'
  | 'model'
  | 'plot'
  | 'conclusion'
  | 'dataset'
  | 'standard'
  | 'requirement'
  | 'document'
  | 'computation';

export type RelationshipType =
  'depends-on' | 'informs' | 'produced-by' | 'validates' | 'contradicts';

export type AlternativeSource = 'agent' | 'user' | 'standard' | 'prior-decision';

export type ResolutionType =
  'direct-human' | 'collaborative' | 'delegated' | 'rule-based' | 'inherited';

// ---------------------------------------------------------------------------
// Nested response sub-types (match JSON from model_dump(by_alias=True))
// ---------------------------------------------------------------------------

export interface LineRange {
  start: number;
  end: number;
}

export interface ArtifactLocation {
  filePath?: string | null;
  cellId?: string | null;
  lineRange?: LineRange | null;
  uri?: string | null;
}

export interface ArtifactReference {
  id: string;
  artifactType: ArtifactType;
  label: string;
  location?: ArtifactLocation | null;
  relationship: RelationshipType;
  description?: string | null;
}

export interface JudgmentTrigger {
  source: TriggerSource;
  description: string;
  hardTrigger?: string | null;
  ruleId?: string | null;
}

export interface MaterialityDimensions {
  methodologicalDiscretion: number;
  downstreamInfluence: number;
  uncertainty: number;
  consequence: number;
  reversibility: number;
  accountabilityRequirement: number;
}

export interface MaterialityAssessment {
  score: number;
  dimensions: MaterialityDimensions;
  detectorConfidence?: number | null;
  hardTrigger?: string | null;
  interventionLevel?: InterventionLevel | null;
}

export interface JudgmentAlternative {
  id: string;
  label: string;
  description: string;
  tradeoffs?: string | null;
  evidenceRefs?: ArtifactReference[] | null;
  source?: AlternativeSource | null;
  comparisonData?: Record<string, unknown> | null;
}

export interface JudgmentAuthority {
  mode: AuthorityMode;
  actorId?: string | null;
  policyId?: string | null;
}

export interface JudgmentResolution {
  selectedAlternativeId: string;
  rationale: string;
  uncertainty?: string[] | null;
  conditions?: string[] | null;
  validationRequirements?: string[] | null;
  resolvedAt: string;
  resolvedBy?: string | null;
}

export interface JudgmentRevision {
  timestamp: string;
  previousStatus: JudgmentStatus;
  newStatus: JudgmentStatus;
  reason: string;
  previousResolution?: JudgmentResolution | null;
  actorId?: string | null;
}

// ---------------------------------------------------------------------------
// Main response types
// ---------------------------------------------------------------------------

export interface JudgmentPointResponse {
  id: string;
  projectId: string;
  category: JudgmentCategory;
  question: string;
  context: string;
  trigger: JudgmentTrigger;
  materiality: MaterialityAssessment;
  status: JudgmentStatus;
  alternatives: JudgmentAlternative[];
  evidenceRefs?: ArtifactReference[] | null;
  affectedArtifactIds: string[];
  authority: JudgmentAuthority;
  resolution?: JudgmentResolution | null;
  validityConditions: string[];
  reopenConditions: string[];
  revisionHistory?: JudgmentRevision[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventMetadata {
  correlationId?: string | null;
  sessionId?: string | null;
  toolName?: string | null;
  policyId?: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  notes?: string | null;
  [key: string]: unknown;
}

export interface JudgmentEventResponse {
  id: string;
  judgmentPointId: string;
  projectId: string;
  eventType: EventType;
  timestamp: string;
  actorId: string;
  actorType: ActorType;
  payload?: Record<string, unknown> | null;
  metadata?: EventMetadata | null;
}

// ---------------------------------------------------------------------------
// Policy response types
// ---------------------------------------------------------------------------

export interface PolicyScope {
  categories?: JudgmentCategory[] | null;
  triggerSources?: TriggerSource[] | null;
  artifactTypes?: ArtifactType[] | null;
  materialityScoreMin?: number | null;
  materialityScoreMax?: number | null;
}

export interface DimensionThresholds {
  methodologicalDiscretion?: number | null;
  downstreamInfluence?: number | null;
  uncertainty?: number | null;
  consequence?: number | null;
  reversibility?: number | null;
  accountabilityRequirement?: number | null;
}

export interface RuleCondition {
  materialityScoreMin?: number | null;
  materialityScoreMax?: number | null;
  dimensionThresholds?: DimensionThresholds | null;
  hardTrigger?: string | null;
  categories?: JudgmentCategory[] | null;
  expression?: string | null;
}

export interface AuthorityOverride {
  mode: AuthorityMode;
  actorId?: string | null;
  policyId?: string | null;
}

export interface DelegationConditions {
  allowed?: boolean | null;
  maxMaterialityScore?: number | null;
  requiredConfidence?: number | null;
  excludedCategories?: JudgmentCategory[] | null;
  requiresPriorHumanResolution?: boolean | null;
  auditRequired?: boolean | null;
}

export interface PolicyRule {
  id: string;
  condition: RuleCondition;
  intervention: InterventionLevel;
  authorityOverride?: AuthorityOverride | null;
  delegationConditions?: DelegationConditions | null;
  description?: string | null;
}

export interface PolicyResponse {
  id: string;
  projectId: string;
  name: string;
  description: string;
  scope: PolicyScope;
  rules: PolicyRule[];
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Paginated result wrapper
// ---------------------------------------------------------------------------

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// Request types (sent TO the backend)
// ---------------------------------------------------------------------------

export interface ActorRequest {
  id: string;
  type: ActorType;
}

export interface TriggerRequest {
  source: TriggerSource;
  description: string;
  hardTrigger?: string | null;
  ruleId?: string | null;
}

export interface DimensionsRequest {
  methodologicalDiscretion: number;
  downstreamInfluence: number;
  uncertainty: number;
  consequence: number;
  reversibility: number;
  accountabilityRequirement: number;
}

export interface MaterialityRequest {
  score: number;
  dimensions: DimensionsRequest;
  detectorConfidence?: number | null;
  hardTrigger?: string | null;
  interventionLevel?: InterventionLevel | null;
}

export interface AuthorityRequest {
  mode: AuthorityMode;
  actorId?: string | null;
  policyId?: string | null;
}

export interface AlternativeRequest {
  id?: string | null;
  label: string;
  description: string;
  tradeoffs?: string | null;
  source?: AlternativeSource | null;
}

export interface CreateCandidateRequest {
  projectId: string;
  category: JudgmentCategory;
  question: string;
  context: string;
  trigger: TriggerRequest;
  materiality: MaterialityRequest;
  alternatives?: AlternativeRequest[];
  affectedArtifactIds?: string[];
  authority: AuthorityRequest;
  validityConditions?: string[];
  reopenConditions?: string[];
  evidenceRefs?: Record<string, unknown>[] | null;
}

export interface ResolutionBody {
  selectedAlternativeId: string;
  rationale: string;
  resolvedAt: string;
  uncertainty?: string[] | null;
  conditions?: string[] | null;
  validationRequirements?: string[] | null;
}

/** Wraps actor + resolution body to match backend `ResolveRequest`. */
export interface ResolveRequest {
  actor: ActorRequest;
  resolution: ResolutionBody;
}

/** Wraps actor to match backend `PromoteRequest`. */
export interface PromoteRequest {
  actor: ActorRequest;
}

/** Wraps actor to match backend `InvestigateRequest`. */
export interface InvestigateRequest {
  actor: ActorRequest;
}

export interface DelegateRequest {
  actor: ActorRequest;
  delegateId: string;
  policyId: string;
}

export interface DismissRequest {
  actor: ActorRequest;
  reason: string;
}

export interface ReopenRequest {
  actor: ActorRequest;
  reason: string;
}

export interface MarkStaleRequest {
  actor: ActorRequest;
  reason: string;
}

export interface AddAlternativeRequest {
  alternative: AlternativeRequest;
}

export interface AddArtifactRequest {
  artifact: Record<string, unknown>;
}

export interface PolicyRequest {
  name: string;
  description: string;
  scope: PolicyScope;
  rules: PolicyRule[];
  priority: number;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Query parameter helpers
// ---------------------------------------------------------------------------

export interface ListParams {
  status?: string[];
  category?: string[];
  offset?: number;
  limit?: number;
}

export interface PaginationParams {
  offset?: number;
  limit?: number;
}
