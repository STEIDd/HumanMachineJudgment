import { describe, it, expect } from 'vitest';
import { checkStaleness, propagateStaleness } from './staleness.js';
import { DependencyGraph } from './dependency-graph.js';
import type { JudgmentPoint } from './types.js';

function makePoint(overrides: Partial<JudgmentPoint> = {}): JudgmentPoint {
  return {
    id: 'jp-1',
    projectId: 'proj-1',
    category: 'method',
    question: 'Q',
    context: 'C',
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
    status: 'resolved',
    alternatives: [],
    affectedArtifactIds: ['art-1', 'art-2'],
    authority: { mode: 'human' },
    validityConditions: [],
    reopenConditions: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('checkStaleness', () => {
  it('returns not stale for non-resolved points', () => {
    const point = makePoint({ status: 'pending' });
    const result = checkStaleness(point, ['art-1']);
    expect(result.isStale).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  it('detects staleness when affectedArtifactId changes', () => {
    const point = makePoint();
    const result = checkStaleness(point, ['art-1']);
    expect(result.isStale).toBe(true);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]).toContain('art-1');
  });

  it('detects staleness when evidence ref changes', () => {
    const point = makePoint({
      evidenceRefs: [
        { id: 'ref-1', artifactType: 'model', label: 'M', relationship: 'depends-on' },
      ],
    });
    const result = checkStaleness(point, ['ref-1']);
    expect(result.isStale).toBe(true);
    expect(result.reasons.some((r) => r.includes('ref-1'))).toBe(true);
  });

  it('returns not stale when no artifacts changed', () => {
    const point = makePoint();
    const result = checkStaleness(point, ['unrelated-art']);
    expect(result.isStale).toBe(false);
  });

  it('detects multiple staleness reasons', () => {
    const point = makePoint({
      evidenceRefs: [
        { id: 'art-1', artifactType: 'model', label: 'M', relationship: 'depends-on' },
      ],
    });
    const result = checkStaleness(point, ['art-1']);
    // art-1 is in both affectedArtifactIds and evidenceRefs
    expect(result.isStale).toBe(true);
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it('handles empty changedArtifactIds', () => {
    const point = makePoint();
    const result = checkStaleness(point, []);
    expect(result.isStale).toBe(false);
  });

  it('handles empty affectedArtifactIds and evidenceRefs', () => {
    const point = makePoint({ affectedArtifactIds: [], evidenceRefs: [] });
    const result = checkStaleness(point, ['art-1']);
    expect(result.isStale).toBe(false);
  });
});

describe('propagateStaleness', () => {
  it('returns transitive dependents from graph', () => {
    const graph = new DependencyGraph();
    graph.addDependency('jp-1', 'jp-2');
    graph.addDependency('jp-2', 'jp-3');

    const affected = propagateStaleness(graph, 'jp-1');
    expect(affected).toContain('jp-2');
    expect(affected).toContain('jp-3');
  });

  it('returns empty for isolated point', () => {
    const graph = new DependencyGraph();
    const affected = propagateStaleness(graph, 'jp-isolated');
    expect(affected).toHaveLength(0);
  });
});
