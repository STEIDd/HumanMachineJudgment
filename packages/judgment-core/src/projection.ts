import type {
  ArtifactReference,
  JudgmentAlternative,
  JudgmentEvent,
  JudgmentPoint,
  JudgmentResolution,
  JudgmentRevision,
  JudgmentStatus,
} from './types.js';

/**
 * Project the current state of a judgment point from its event log.
 * Events must be ordered by timestamp (oldest first).
 *
 * Throws if the events array is empty or if the first event is not 'created'.
 */
export function projectCurrentState(events: readonly JudgmentEvent[]): JudgmentPoint {
  if (events.length === 0) {
    throw new Error('Cannot project state from an empty event list');
  }

  const first = events[0];
  if (first == null) {
    throw new Error('Cannot project state from an empty event list');
  }
  if (first.eventType !== 'created') {
    throw new Error(`First event must be 'created', got '${first.eventType}'`);
  }

  // Initialize from the created event's payload.
  const payload = first.payload ?? {};
  let point: JudgmentPoint = {
    id: first.judgmentPointId,
    projectId: first.projectId,
    category: payload['category'] as JudgmentPoint['category'],
    question: (payload['question'] as string) ?? '',
    context: (payload['context'] as string) ?? '',
    trigger: payload['trigger'] as JudgmentPoint['trigger'],
    materiality: payload['materiality'] as JudgmentPoint['materiality'],
    status: 'candidate',
    alternatives: (payload['alternatives'] as JudgmentPoint['alternatives']) ?? [],
    evidenceRefs: (payload['evidenceRefs'] as JudgmentPoint['evidenceRefs']) ?? [],
    affectedArtifactIds:
      (payload['affectedArtifactIds'] as JudgmentPoint['affectedArtifactIds']) ?? [],
    authority: payload['authority'] as JudgmentPoint['authority'],
    validityConditions:
      (payload['validityConditions'] as JudgmentPoint['validityConditions']) ?? [],
    reopenConditions: (payload['reopenConditions'] as JudgmentPoint['reopenConditions']) ?? [],
    revisionHistory: [],
    createdAt: first.timestamp,
    updatedAt: first.timestamp,
  };

  // Apply remaining events sequentially.
  for (let i = 1; i < events.length; i++) {
    const evt = events[i];
    if (evt != null) {
      point = applyEvent(point, evt);
    }
  }

  return point;
}

/**
 * Apply a single event to a judgment point, returning the updated state.
 */
export function applyEvent(point: JudgmentPoint, event: JudgmentEvent): JudgmentPoint {
  const base = { ...point, updatedAt: event.timestamp };

  switch (event.eventType) {
    case 'promoted':
      return { ...base, status: 'pending' };

    case 'investigation-started':
      return { ...base, status: 'investigating' };

    case 'resolution-recorded': {
      const resolution = event.payload as unknown as JudgmentResolution;
      return {
        ...base,
        status: 'resolved',
        resolution,
      };
    }

    case 'delegated': {
      const payload = event.payload ?? {};
      return {
        ...base,
        status: 'delegated',
        authority: {
          mode: 'delegated',
          actorId: payload['delegateId'] as string | undefined,
          policyId: payload['policyId'] as string | undefined,
        },
      };
    }

    case 'dismissed':
      return { ...base, status: 'dismissed' };

    case 'reopened': {
      // Preserve current resolution in revision history.
      const revision: JudgmentRevision = {
        timestamp: event.timestamp,
        previousStatus: point.status,
        newStatus: 'reopened',
        reason: (event.payload?.['reason'] as string) ?? '',
        previousResolution: point.resolution,
        actorId: event.actorId,
      };
      return {
        ...base,
        status: 'reopened',
        resolution: undefined,
        revisionHistory: [...(point.revisionHistory ?? []), revision],
      };
    }

    case 'marked-stale':
      return { ...base, status: 'stale' as JudgmentStatus };

    case 'artifact-linked': {
      const artifact = event.payload as unknown as ArtifactReference;
      return {
        ...base,
        evidenceRefs: [...(point.evidenceRefs ?? []), artifact],
      };
    }

    case 'artifact-unlinked': {
      const artifactId = event.payload?.['artifactId'] as string;
      return {
        ...base,
        evidenceRefs: (point.evidenceRefs ?? []).filter((r) => r.id !== artifactId),
      };
    }

    case 'alternative-added': {
      const alternative = event.payload as unknown as JudgmentAlternative;
      return {
        ...base,
        alternatives: [...point.alternatives, alternative],
      };
    }

    case 'comparison-requested':
      // No state change; comparison is informational.
      return base;

    case 'comparison-completed':
      // No state change; comparison is informational.
      return base;

    case 'dependency-changed':
      // No state change; dependency changes may lead to staleness separately.
      return base;

    case 'validity-condition-changed': {
      const payload = event.payload ?? {};
      const prev = payload['previousCondition'] as string | undefined;
      const next = payload['newCondition'] as string | undefined;
      let conditions = [...point.validityConditions];

      if (prev != null) {
        conditions = conditions.filter((c) => c !== prev);
      }
      if (next != null) {
        conditions.push(next);
      }

      return { ...base, validityConditions: conditions };
    }

    case 'created':
      // Should not appear after the first event.
      return base;

    default:
      return base;
  }
}
