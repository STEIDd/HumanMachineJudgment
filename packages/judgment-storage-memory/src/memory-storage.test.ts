import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from './memory-storage.js';
import type { JudgmentEvent, JudgmentPoint, JudgmentPolicy } from '@human-machine-judgment/core';

function makeEvent(overrides: Partial<JudgmentEvent> = {}): JudgmentEvent {
  return {
    id: 'evt-1',
    judgmentPointId: 'jp-1',
    projectId: 'proj-1',
    eventType: 'created',
    timestamp: '2026-01-01T00:00:00Z',
    actorId: 'user-1',
    actorType: 'user',
    ...overrides,
  };
}

function makePoint(overrides: Partial<JudgmentPoint> = {}): JudgmentPoint {
  return {
    id: 'jp-1',
    projectId: 'proj-1',
    category: 'method',
    question: 'Which model?',
    context: 'Analysis context',
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
    status: 'pending',
    alternatives: [],
    affectedArtifactIds: [],
    authority: { mode: 'human' },
    validityConditions: [],
    reopenConditions: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makePolicy(overrides: Partial<JudgmentPolicy> = {}): JudgmentPolicy {
  return {
    id: 'pol-1',
    projectId: 'proj-1',
    name: 'Test policy',
    description: 'Test',
    scope: {},
    rules: [{ id: 'r1', condition: {}, intervention: 'pause' }],
    priority: 10,
    enabled: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('MemoryStorage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  describe('events', () => {
    it('appends and retrieves events', async () => {
      await storage.appendEvent(makeEvent());
      const events = await storage.getEvents('jp-1');
      expect(events).toHaveLength(1);
      expect(events[0]?.id).toBe('evt-1');
    });

    it('returns empty for unknown judgment point', async () => {
      const events = await storage.getEvents('unknown');
      expect(events).toHaveLength(0);
    });

    it('filters events by type', async () => {
      await storage.appendEvent(makeEvent({ id: 'e1', eventType: 'created' }));
      await storage.appendEvent(makeEvent({ id: 'e2', eventType: 'promoted' }));

      const events = await storage.getEvents('jp-1', {
        eventType: ['promoted'],
      });
      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('promoted');
    });

    it('filters events by actor', async () => {
      await storage.appendEvent(makeEvent({ id: 'e1', actorId: 'user-1' }));
      await storage.appendEvent(makeEvent({ id: 'e2', actorId: 'agent-1' }));

      const events = await storage.getEvents('jp-1', { actorId: 'agent-1' });
      expect(events).toHaveLength(1);
    });

    it('paginates project events', async () => {
      for (let i = 0; i < 5; i++) {
        await storage.appendEvent(
          makeEvent({
            id: `evt-${i}`,
            timestamp: `2026-01-0${i + 1}T00:00:00Z`,
          }),
        );
      }

      const page = await storage.getEventsByProject('proj-1', undefined, 1, 2);
      expect(page.items).toHaveLength(2);
      expect(page.total).toBe(5);
      expect(page.offset).toBe(1);
      expect(page.limit).toBe(2);
    });
  });

  describe('judgment points', () => {
    it('saves and retrieves a judgment point', async () => {
      await storage.saveJudgmentPoint(makePoint());
      const point = await storage.getJudgmentPoint('jp-1');
      expect(point).not.toBeNull();
      expect(point?.id).toBe('jp-1');
    });

    it('returns null for unknown ID', async () => {
      const point = await storage.getJudgmentPoint('unknown');
      expect(point).toBeNull();
    });

    it('lists points with pagination', async () => {
      await storage.saveJudgmentPoint(makePoint({ id: 'jp-1' }));
      await storage.saveJudgmentPoint(makePoint({ id: 'jp-2' }));
      await storage.saveJudgmentPoint(makePoint({ id: 'jp-3' }));

      const page = await storage.getJudgmentPoints('proj-1', undefined, 0, 2);
      expect(page.items).toHaveLength(2);
      expect(page.total).toBe(3);
    });

    it('filters by status', async () => {
      await storage.saveJudgmentPoint(makePoint({ id: 'jp-1', status: 'pending' }));
      await storage.saveJudgmentPoint(makePoint({ id: 'jp-2', status: 'resolved' }));

      const page = await storage.getJudgmentPoints('proj-1', {
        status: ['pending'],
      });
      expect(page.items).toHaveLength(1);
      expect(page.items[0]?.id).toBe('jp-1');
    });

    it('filters by category', async () => {
      await storage.saveJudgmentPoint(makePoint({ id: 'jp-1', category: 'method' }));
      await storage.saveJudgmentPoint(makePoint({ id: 'jp-2', category: 'data' }));

      const page = await storage.getJudgmentPoints('proj-1', {
        category: ['data'],
      });
      expect(page.items).toHaveLength(1);
      expect(page.items[0]?.id).toBe('jp-2');
    });

    it('filters by materiality score range', async () => {
      await storage.saveJudgmentPoint(
        makePoint({ id: 'jp-1', materiality: { ...makePoint().materiality, score: 5 } }),
      );
      await storage.saveJudgmentPoint(
        makePoint({ id: 'jp-2', materiality: { ...makePoint().materiality, score: 15 } }),
      );

      const page = await storage.getJudgmentPoints('proj-1', {
        materialityScoreMin: 10,
      });
      expect(page.items).toHaveLength(1);
      expect(page.items[0]?.id).toBe('jp-2');
    });
  });

  describe('policies', () => {
    it('saves and retrieves a policy', async () => {
      await storage.savePolicy(makePolicy());
      const policy = await storage.getPolicy('pol-1');
      expect(policy).not.toBeNull();
      expect(policy?.id).toBe('pol-1');
    });

    it('returns null for unknown policy', async () => {
      const policy = await storage.getPolicy('unknown');
      expect(policy).toBeNull();
    });

    it('lists policies sorted by priority', async () => {
      await storage.savePolicy(makePolicy({ id: 'p1', priority: 20 }));
      await storage.savePolicy(makePolicy({ id: 'p2', priority: 5 }));

      const policies = await storage.getPolicies('proj-1');
      expect(policies).toHaveLength(2);
      expect(policies[0]?.id).toBe('p2');
      expect(policies[1]?.id).toBe('p1');
    });

    it('updates a policy', async () => {
      await storage.savePolicy(makePolicy());
      await storage.updatePolicy(makePolicy({ name: 'Updated' }));

      const policy = await storage.getPolicy('pol-1');
      expect(policy?.name).toBe('Updated');
    });

    it('deletes a policy', async () => {
      await storage.savePolicy(makePolicy());
      await storage.deletePolicy('pol-1');

      const policy = await storage.getPolicy('pol-1');
      expect(policy).toBeNull();
    });
  });

  describe('clear', () => {
    it('removes all data', async () => {
      await storage.appendEvent(makeEvent());
      await storage.saveJudgmentPoint(makePoint());
      await storage.savePolicy(makePolicy());

      storage.clear();

      expect(await storage.getEvents('jp-1')).toHaveLength(0);
      expect(await storage.getJudgmentPoint('jp-1')).toBeNull();
      expect(await storage.getPolicy('pol-1')).toBeNull();
    });
  });
});
