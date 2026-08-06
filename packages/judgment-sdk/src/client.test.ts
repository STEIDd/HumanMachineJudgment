import { describe, it, expect, beforeEach } from 'vitest';
import { JudgmentClient } from './client.js';
import { MemoryStorage } from '@human-machine-judgment/storage-memory';
import type { Actor } from '@human-machine-judgment/core';
import { InvalidTransitionError, NotFoundError } from '@human-machine-judgment/core';

const userActor: Actor = { id: 'user-1', type: 'user' };

function candidateParams() {
  return {
    projectId: 'proj-1',
    category: 'method' as const,
    question: 'Which model to use?',
    context: 'Selecting a turbulence model',
    trigger: { source: 'agent' as const, description: 'Agent detected choice' },
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
      interventionLevel: 'pause' as const,
    },
    alternatives: [
      { id: 'alt-1', label: 'k-epsilon', description: 'Standard k-epsilon model' },
      { id: 'alt-2', label: 'k-omega SST', description: 'Menter SST model' },
    ],
    authority: { mode: 'human' as const },
  };
}

describe('JudgmentClient', () => {
  let storage: MemoryStorage;
  let client: JudgmentClient;

  beforeEach(() => {
    storage = new MemoryStorage();
    client = new JudgmentClient(storage);
  });

  describe('createCandidate', () => {
    it('creates a candidate and stores it', async () => {
      const point = await client.createCandidate(candidateParams(), userActor);

      expect(point.status).toBe('candidate');
      expect(point.id).toBeTruthy();
      expect(point.category).toBe('method');

      const stored = await client.getJudgmentPoint(point.id);
      expect(stored).not.toBeNull();
      expect(stored?.id).toBe(point.id);
    });

    it('creates a created event', async () => {
      const point = await client.createCandidate(candidateParams(), userActor);
      const events = await client.getEvents(point.id);
      expect(events).toHaveLength(1);
      expect(events[0]?.eventType).toBe('created');
    });
  });

  describe('full lifecycle flow', () => {
    it('candidate -> pending -> investigating -> resolved', async () => {
      const candidate = await client.createCandidate(candidateParams(), userActor);
      expect(candidate.status).toBe('candidate');

      const pending = await client.promote(candidate.id, userActor);
      expect(pending.status).toBe('pending');

      const investigating = await client.startInvestigation(pending.id, userActor);
      expect(investigating.status).toBe('investigating');

      const resolved = await client.resolve(
        investigating.id,
        {
          selectedAlternativeId: 'alt-1',
          rationale: 'k-epsilon is more validated for this flow regime',
          resolvedAt: new Date().toISOString(),
          resolvedBy: 'user-1',
        },
        userActor,
      );
      expect(resolved.status).toBe('resolved');
      expect(resolved.resolution?.selectedAlternativeId).toBe('alt-1');

      const events = await client.getEvents(resolved.id);
      expect(events).toHaveLength(4);
    });
  });

  describe('promote', () => {
    it('throws NotFoundError for unknown ID', async () => {
      await expect(client.promote('unknown', userActor)).rejects.toThrow(NotFoundError);
    });

    it('throws InvalidTransitionError from wrong status', async () => {
      const point = await client.createCandidate(candidateParams(), userActor);
      await client.promote(point.id, userActor);

      await expect(client.promote(point.id, userActor)).rejects.toThrow(InvalidTransitionError);
    });
  });

  describe('dismiss', () => {
    it('allows dismissal from pending', async () => {
      const point = await client.createCandidate(candidateParams(), userActor);
      await client.promote(point.id, userActor);

      const dismissed = await client.dismiss(point.id, 'Not relevant', userActor);
      expect(dismissed.status).toBe('dismissed');
    });
  });

  describe('reopen', () => {
    it('allows reopening a dismissed point', async () => {
      const point = await client.createCandidate(candidateParams(), userActor);
      await client.promote(point.id, userActor);
      await client.dismiss(point.id, 'Not relevant', userActor);

      const reopened = await client.reopen(point.id, 'New information available', userActor);
      expect(reopened.status).toBe('reopened');
    });
  });

  describe('markStale', () => {
    it('marks a resolved point as stale', async () => {
      const point = await client.createCandidate(candidateParams(), userActor);
      await client.promote(point.id, userActor);
      await client.startInvestigation(point.id, userActor);
      await client.resolve(
        point.id,
        {
          selectedAlternativeId: 'alt-1',
          rationale: 'Chosen approach',
          resolvedAt: new Date().toISOString(),
        },
        userActor,
      );

      const stale = await client.markStale(point.id, 'Upstream dependency changed', userActor);
      expect(stale.status).toBe('stale');
    });
  });

  describe('addAlternative', () => {
    it('adds an alternative to a judgment point', async () => {
      const point = await client.createCandidate(candidateParams(), userActor);

      const updated = await client.addAlternative(
        point.id,
        { id: 'alt-3', label: 'SA model', description: 'Spalart-Allmaras' },
        userActor,
      );
      expect(updated.alternatives).toHaveLength(3);
    });
  });

  describe('delegate', () => {
    it('delegates from pending', async () => {
      const point = await client.createCandidate(candidateParams(), userActor);
      await client.promote(point.id, userActor);

      const delegated = await client.delegate(
        point.id,
        'agent-1',
        'delegation-policy-1',
        userActor,
      );
      expect(delegated.status).toBe('delegated');
    });
  });

  describe('assessMateriality', () => {
    it('computes score and intervention level', () => {
      const assessment = client.assessMateriality({
        methodologicalDiscretion: 3,
        downstreamInfluence: 3,
        uncertainty: 3,
        consequence: 3,
        reversibility: 3,
        accountabilityRequirement: 3,
      });
      expect(assessment.score).toBe(18);
      expect(assessment.interventionLevel).toBe('require-investigation');
    });
  });

  describe('listJudgmentPoints', () => {
    it('lists points for a project', async () => {
      await client.createCandidate(candidateParams(), userActor);
      await client.createCandidate(candidateParams(), userActor);

      const result = await client.listJudgmentPoints('proj-1');
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });
});
