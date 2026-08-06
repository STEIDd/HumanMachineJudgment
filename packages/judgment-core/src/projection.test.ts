import { describe, it, expect } from 'vitest';
import { projectCurrentState, applyEvent } from './projection.js';
import {
  createCreatedEvent,
  createPromotedEvent,
  createInvestigationStartedEvent,
  createResolutionRecordedEvent,
  createDismissedEvent,
  createReopenedEvent,
  createMarkedStaleEvent,
  createAlternativeAddedEvent,
  createArtifactLinkedEvent,
  createArtifactUnlinkedEvent,
} from './events.js';
import type { JudgmentEvent, JudgmentPoint } from './types.js';

const actor = { id: 'user-1', type: 'user' as const };

function makeCreatedEvent(): JudgmentEvent {
  return createCreatedEvent({
    judgmentPointId: 'jp-1',
    projectId: 'proj-1',
    actor,
    candidateData: {
      category: 'method',
      question: 'Which model?',
      context: 'Selecting turbulence model',
      trigger: { source: 'agent', description: 'detected' },
      materiality: {
        score: 10,
        dimensions: {
          methodologicalDiscretion: 2,
          downstreamInfluence: 2,
          uncertainty: 1,
          consequence: 2,
          reversibility: 1,
          accountabilityRequirement: 2,
        },
        interventionLevel: 'pause',
      },
      alternatives: [
        { id: 'alt-1', label: 'k-epsilon', description: 'Standard' },
        { id: 'alt-2', label: 'k-omega', description: 'SST model' },
      ],
      authority: { mode: 'human' },
      validityConditions: ['condition-1'],
      reopenConditions: [],
    },
  });
}

describe('projectCurrentState', () => {
  it('throws on empty event list', () => {
    expect(() => projectCurrentState([])).toThrow('empty event list');
  });

  it('throws when first event is not created', () => {
    const event = createPromotedEvent({
      judgmentPointId: 'jp-1',
      projectId: 'proj-1',
      actor,
      previousStatus: 'candidate',
      newStatus: 'pending',
    });
    expect(() => projectCurrentState([event])).toThrow("must be 'created'");
  });

  it('projects a single created event into a candidate point', () => {
    const event = makeCreatedEvent();
    const point = projectCurrentState([event]);

    expect(point.id).toBe('jp-1');
    expect(point.projectId).toBe('proj-1');
    expect(point.status).toBe('candidate');
    expect(point.category).toBe('method');
    expect(point.question).toBe('Which model?');
    expect(point.alternatives).toHaveLength(2);
    expect(point.revisionHistory).toEqual([]);
  });

  it('projects a multi-event lifecycle', () => {
    const created = makeCreatedEvent();
    const promoted = createPromotedEvent({
      judgmentPointId: 'jp-1',
      projectId: 'proj-1',
      actor,
      previousStatus: 'candidate',
      newStatus: 'pending',
    });
    const investigating = createInvestigationStartedEvent({
      judgmentPointId: 'jp-1',
      projectId: 'proj-1',
      actor,
      previousStatus: 'pending',
      newStatus: 'investigating',
    });
    const resolved = createResolutionRecordedEvent({
      judgmentPointId: 'jp-1',
      projectId: 'proj-1',
      actor,
      previousStatus: 'investigating',
      resolution: {
        selectedAlternativeId: 'alt-1',
        rationale: 'Best fit for this regime',
        resolvedAt: new Date().toISOString(),
      },
    });

    const point = projectCurrentState([created, promoted, investigating, resolved]);
    expect(point.status).toBe('resolved');
    expect(point.resolution?.selectedAlternativeId).toBe('alt-1');
  });
});

describe('applyEvent', () => {
  function makeBasePoint(): JudgmentPoint {
    return {
      id: 'jp-1',
      projectId: 'proj-1',
      category: 'method',
      question: 'Which model?',
      context: 'ctx',
      trigger: { source: 'agent', description: 'detected' },
      materiality: {
        score: 10,
        dimensions: {
          methodologicalDiscretion: 2,
          downstreamInfluence: 2,
          uncertainty: 1,
          consequence: 2,
          reversibility: 1,
          accountabilityRequirement: 2,
        },
      },
      status: 'candidate',
      alternatives: [{ id: 'alt-1', label: 'A', description: 'A' }],
      evidenceRefs: [],
      affectedArtifactIds: [],
      authority: { mode: 'human' },
      validityConditions: [],
      reopenConditions: [],
      revisionHistory: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
  }

  it('applies promoted event', () => {
    const point = makeBasePoint();
    const event = createPromotedEvent({
      judgmentPointId: 'jp-1',
      projectId: 'proj-1',
      actor,
      previousStatus: 'candidate',
      newStatus: 'pending',
    });
    const updated = applyEvent(point, event);
    expect(updated.status).toBe('pending');
  });

  it('applies dismissed event', () => {
    const point = { ...makeBasePoint(), status: 'pending' as const };
    const event = createDismissedEvent({
      judgmentPointId: 'jp-1',
      projectId: 'proj-1',
      actor,
      previousStatus: 'pending',
      reason: 'Not relevant',
    });
    const updated = applyEvent(point, event);
    expect(updated.status).toBe('dismissed');
  });

  it('applies reopened event and stores revision history', () => {
    const point = {
      ...makeBasePoint(),
      status: 'resolved' as const,
      resolution: {
        selectedAlternativeId: 'alt-1',
        rationale: 'reason',
        resolvedAt: '2026-01-01T00:00:00Z',
      },
      revisionHistory: [],
    };
    const event = createReopenedEvent({
      judgmentPointId: 'jp-1',
      projectId: 'proj-1',
      actor,
      previousStatus: 'resolved',
      reason: 'New evidence',
    });
    const updated = applyEvent(point, event);
    expect(updated.status).toBe('reopened');
    expect(updated.resolution).toBeUndefined();
    expect(updated.revisionHistory).toHaveLength(1);
    expect(updated.revisionHistory?.[0]?.previousStatus).toBe('resolved');
    expect(updated.revisionHistory?.[0]?.previousResolution?.selectedAlternativeId).toBe('alt-1');
  });

  it('applies marked-stale event', () => {
    const point = { ...makeBasePoint(), status: 'resolved' as const };
    const event = createMarkedStaleEvent({
      judgmentPointId: 'jp-1',
      projectId: 'proj-1',
      actor,
      reason: 'Upstream changed',
    });
    const updated = applyEvent(point, event);
    expect(updated.status).toBe('stale');
  });

  it('applies alternative-added event', () => {
    const point = makeBasePoint();
    const event = createAlternativeAddedEvent({
      judgmentPointId: 'jp-1',
      projectId: 'proj-1',
      actor,
      alternative: { id: 'alt-new', label: 'New', description: 'New option' },
    });
    const updated = applyEvent(point, event);
    expect(updated.alternatives).toHaveLength(2);
  });

  it('applies artifact-linked event', () => {
    const point = makeBasePoint();
    const event = createArtifactLinkedEvent({
      judgmentPointId: 'jp-1',
      projectId: 'proj-1',
      actor,
      artifact: {
        id: 'art-1',
        artifactType: 'model',
        label: 'Test model',
        relationship: 'depends-on',
      },
    });
    const updated = applyEvent(point, event);
    expect(updated.evidenceRefs).toHaveLength(1);
  });

  it('applies artifact-unlinked event', () => {
    const point = {
      ...makeBasePoint(),
      evidenceRefs: [
        {
          id: 'art-1',
          artifactType: 'model' as const,
          label: 'M',
          relationship: 'depends-on' as const,
        },
      ],
    };
    const event = createArtifactUnlinkedEvent({
      judgmentPointId: 'jp-1',
      projectId: 'proj-1',
      actor,
      artifactId: 'art-1',
      reason: 'No longer relevant',
    });
    const updated = applyEvent(point, event);
    expect(updated.evidenceRefs).toHaveLength(0);
  });
});
