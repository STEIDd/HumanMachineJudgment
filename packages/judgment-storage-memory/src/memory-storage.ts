import type {
  EventFilters,
  JudgmentEvent,
  JudgmentPoint,
  JudgmentPointFilters,
  JudgmentPolicy,
  JudgmentStorage,
  PaginatedResult,
} from '@human-machine-judgment/core';

/**
 * In-memory implementation of JudgmentStorage.
 * All data is lost when the process exits.
 * Suitable for tests and deterministic demonstrations.
 */
export class MemoryStorage implements JudgmentStorage {
  private readonly events = new Map<string, JudgmentEvent[]>();
  private readonly points = new Map<string, JudgmentPoint>();
  private readonly policies = new Map<string, JudgmentPolicy>();

  async appendEvent(event: JudgmentEvent): Promise<void> {
    const list = this.events.get(event.judgmentPointId) ?? [];
    list.push(event);
    this.events.set(event.judgmentPointId, list);
  }

  async getEvents(
    judgmentPointId: string,
    filters?: EventFilters,
  ): Promise<readonly JudgmentEvent[]> {
    let events = this.events.get(judgmentPointId) ?? [];
    events = applyEventFilters(events, filters);
    return events;
  }

  async getEventsByProject(
    projectId: string,
    filters?: EventFilters,
    offset = 0,
    limit = 50,
  ): Promise<PaginatedResult<JudgmentEvent>> {
    let allEvents: JudgmentEvent[] = [];
    for (const list of this.events.values()) {
      for (const event of list) {
        if (event.projectId === projectId) {
          allEvents.push(event);
        }
      }
    }
    allEvents = applyEventFilters(allEvents, filters);
    allEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const total = allEvents.length;
    const items = allEvents.slice(offset, offset + limit);

    return { items, total, offset, limit };
  }

  async saveJudgmentPoint(point: JudgmentPoint): Promise<void> {
    this.points.set(point.id, point);
  }

  async getJudgmentPoint(id: string): Promise<JudgmentPoint | null> {
    return this.points.get(id) ?? null;
  }

  async getJudgmentPoints(
    projectId: string,
    filters?: JudgmentPointFilters,
    offset = 0,
    limit = 50,
  ): Promise<PaginatedResult<JudgmentPoint>> {
    let results: JudgmentPoint[] = [];
    for (const point of this.points.values()) {
      if (point.projectId === projectId) {
        results.push(point);
      }
    }

    results = applyPointFilters(results, filters);
    results.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const total = results.length;
    const items = results.slice(offset, offset + limit);

    return { items, total, offset, limit };
  }

  async savePolicy(policy: JudgmentPolicy): Promise<void> {
    this.policies.set(policy.id, policy);
  }

  async getPolicy(id: string): Promise<JudgmentPolicy | null> {
    return this.policies.get(id) ?? null;
  }

  async getPolicies(projectId: string): Promise<readonly JudgmentPolicy[]> {
    const results: JudgmentPolicy[] = [];
    for (const policy of this.policies.values()) {
      if (policy.projectId === projectId) {
        results.push(policy);
      }
    }
    return results.sort((a, b) => a.priority - b.priority);
  }

  async updatePolicy(policy: JudgmentPolicy): Promise<void> {
    this.policies.set(policy.id, policy);
  }

  async deletePolicy(id: string): Promise<void> {
    this.policies.delete(id);
  }

  /**
   * Clear all data. Useful for tests.
   */
  clear(): void {
    this.events.clear();
    this.points.clear();
    this.policies.clear();
  }
}

// ---------------------------------------------------------------------------
// Filter helpers
// ---------------------------------------------------------------------------

function applyEventFilters(events: JudgmentEvent[], filters?: EventFilters): JudgmentEvent[] {
  if (filters == null) return events;

  return events.filter((event) => {
    if (
      filters.eventType != null &&
      filters.eventType.length > 0 &&
      !filters.eventType.includes(event.eventType)
    ) {
      return false;
    }
    if (filters.actorId != null && event.actorId !== filters.actorId) {
      return false;
    }
    if (filters.after != null && event.timestamp < filters.after) {
      return false;
    }
    if (filters.before != null && event.timestamp > filters.before) {
      return false;
    }
    return true;
  });
}

function applyPointFilters(
  points: JudgmentPoint[],
  filters?: JudgmentPointFilters,
): JudgmentPoint[] {
  if (filters == null) return points;

  return points.filter((point) => {
    if (
      filters.status != null &&
      filters.status.length > 0 &&
      !filters.status.includes(point.status)
    ) {
      return false;
    }
    if (
      filters.category != null &&
      filters.category.length > 0 &&
      !filters.category.includes(point.category)
    ) {
      return false;
    }
    if (
      filters.materialityScoreMin != null &&
      point.materiality.score < filters.materialityScoreMin
    ) {
      return false;
    }
    if (
      filters.materialityScoreMax != null &&
      point.materiality.score > filters.materialityScoreMax
    ) {
      return false;
    }
    if (filters.createdAfter != null && point.createdAt < filters.createdAfter) {
      return false;
    }
    if (filters.createdBefore != null && point.createdAt > filters.createdBefore) {
      return false;
    }
    return true;
  });
}
