import type {
  EventType,
  JudgmentCategory,
  JudgmentEvent,
  JudgmentPoint,
  JudgmentPolicy,
  JudgmentStatus,
} from './types.js';

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface EventFilters {
  readonly eventType?: readonly EventType[];
  readonly actorId?: string;
  readonly after?: string;
  readonly before?: string;
}

export interface JudgmentPointFilters {
  readonly status?: readonly JudgmentStatus[];
  readonly category?: readonly JudgmentCategory[];
  readonly materialityScoreMin?: number;
  readonly materialityScoreMax?: number;
  readonly createdAfter?: string;
  readonly createdBefore?: string;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

// ---------------------------------------------------------------------------
// Storage interface
// ---------------------------------------------------------------------------

export interface JudgmentStorage {
  // Events (append-only)
  appendEvent(event: JudgmentEvent): Promise<void>;
  getEvents(judgmentPointId: string, filters?: EventFilters): Promise<readonly JudgmentEvent[]>;
  getEventsByProject(
    projectId: string,
    filters?: EventFilters,
    offset?: number,
    limit?: number,
  ): Promise<PaginatedResult<JudgmentEvent>>;

  // Current-state projection
  saveJudgmentPoint(point: JudgmentPoint): Promise<void>;
  getJudgmentPoint(id: string): Promise<JudgmentPoint | null>;
  getJudgmentPoints(
    projectId: string,
    filters?: JudgmentPointFilters,
    offset?: number,
    limit?: number,
  ): Promise<PaginatedResult<JudgmentPoint>>;

  // Policies
  savePolicy(policy: JudgmentPolicy): Promise<void>;
  getPolicy(id: string): Promise<JudgmentPolicy | null>;
  getPolicies(projectId: string): Promise<readonly JudgmentPolicy[]>;
  updatePolicy(policy: JudgmentPolicy): Promise<void>;
  deletePolicy(id: string): Promise<void>;
}
