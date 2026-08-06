import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from './app.js';
import { MemoryStorage } from '@human-machine-judgment/storage-memory';
import type { FastifyInstance } from 'fastify';

describe('reference-server', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    const storage = new MemoryStorage();
    app = await createApp({ storage });
  });

  describe('GET /health', () => {
    it('returns status ok', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('ok');
      expect(body.version).toBe('0.1.0');
    });
  });

  describe('judgment point lifecycle', () => {
    const candidateBody = {
      actorId: 'user-1',
      actorType: 'user',
      category: 'method',
      question: 'Which model to use?',
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
    };

    it('creates a judgment candidate', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/projects/proj-1/judgment-points',
        payload: candidateBody,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.status).toBe('candidate');
      expect(body.id).toBeTruthy();
    });

    it('walks full lifecycle: create -> promote -> investigate -> resolve', async () => {
      // Create
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects/proj-1/judgment-points',
        payload: candidateBody,
      });
      const id = createRes.json().id;

      // Promote
      const promoteRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/projects/proj-1/judgment-points/${id}/promote`,
        payload: { actorId: 'user-1', actorType: 'user' },
      });
      expect(promoteRes.statusCode).toBe(200);
      expect(promoteRes.json().status).toBe('pending');

      // Investigate
      const investigateRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/projects/proj-1/judgment-points/${id}/investigate`,
        payload: { actorId: 'user-1', actorType: 'user' },
      });
      expect(investigateRes.statusCode).toBe(200);
      expect(investigateRes.json().status).toBe('investigating');

      // Resolve
      const resolveRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/projects/proj-1/judgment-points/${id}/resolve`,
        payload: {
          actorId: 'user-1',
          actorType: 'user',
          resolution: {
            selectedAlternativeId: 'alt-1',
            rationale: 'k-epsilon is validated for this regime',
            resolvedAt: new Date().toISOString(),
          },
        },
      });
      expect(resolveRes.statusCode).toBe(200);
      expect(resolveRes.json().status).toBe('resolved');
    });

    it('lists judgment points', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/projects/proj-1/judgment-points',
        payload: candidateBody,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/projects/proj-1/judgment-points',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.items).toHaveLength(1);
    });

    it('gets events for a judgment point', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects/proj-1/judgment-points',
        payload: candidateBody,
      });
      const id = createRes.json().id;

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/proj-1/judgment-points/${id}/events`,
      });

      expect(response.statusCode).toBe(200);
      const events = response.json();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('created');
    });
  });

  describe('policies', () => {
    const policyBody = {
      id: 'pol-1',
      projectId: 'proj-1',
      name: 'Test Policy',
      description: 'A test policy',
      scope: {},
      rules: [{ id: 'r1', condition: {}, intervention: 'pause' }],
      priority: 10,
      enabled: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    it('creates and lists policies', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects/proj-1/policies',
        payload: policyBody,
      });
      expect(createRes.statusCode).toBe(201);

      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/projects/proj-1/policies',
      });
      expect(listRes.statusCode).toBe(200);
      const policies = listRes.json();
      expect(policies).toHaveLength(1);
      expect(policies[0].id).toBe('pol-1');
    });

    it('gets a single policy', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/projects/proj-1/policies',
        payload: policyBody,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects/proj-1/policies/pol-1',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().id).toBe('pol-1');
    });

    it('returns 404 for unknown policy', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects/proj-1/policies/unknown',
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('cross-project isolation', () => {
    const candidateBody = {
      actorId: 'user-1',
      actorType: 'user',
      category: 'method',
      question: 'Q',
      context: 'C',
      trigger: { source: 'agent', description: 'd' },
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
      alternatives: [{ id: 'a1', label: 'A', description: 'A' }],
      authority: { mode: 'human' },
    };

    it('returns 404 when fetching a point from the wrong project', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects/proj-1/judgment-points',
        payload: candidateBody,
      });
      const id = createRes.json().id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/proj-OTHER/judgment-points/${id}`,
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when fetching events from the wrong project', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects/proj-1/judgment-points',
        payload: candidateBody,
      });
      const id = createRes.json().id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/proj-OTHER/judgment-points/${id}/events`,
      });
      expect(res.statusCode).toBe(404);
    });

    it('does not list points from other projects', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/projects/proj-1/judgment-points',
        payload: candidateBody,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects/proj-OTHER/judgment-points',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().items).toHaveLength(0);
    });

    it('returns 404 when promoting a point via the wrong project', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects/proj-1/judgment-points',
        payload: candidateBody,
      });
      const id = createRes.json().id;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/projects/proj-OTHER/judgment-points/${id}/promote`,
        payload: { actorId: 'user-1', actorType: 'user' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when dismissing a point via the wrong project', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects/proj-1/judgment-points',
        payload: candidateBody,
      });
      const id = createRes.json().id;

      // Promote first so dismiss is a valid transition
      await app.inject({
        method: 'PATCH',
        url: `/api/v1/projects/proj-1/judgment-points/${id}/promote`,
        payload: { actorId: 'user-1', actorType: 'user' },
      });

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/projects/proj-OTHER/judgment-points/${id}/dismiss`,
        payload: { actorId: 'user-1', actorType: 'user', reason: 'Not relevant' },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('error handling', () => {
    it('returns 404 for unknown judgment point', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/projects/proj-1/judgment-points/unknown',
      });
      expect(res.statusCode).toBe(404);
    });

    it('returns 409 for invalid transition', async () => {
      // Create a candidate
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/projects/proj-1/judgment-points',
        payload: {
          actorId: 'user-1',
          actorType: 'user',
          category: 'method',
          question: 'Q',
          context: 'C',
          trigger: { source: 'agent', description: 'd' },
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
          alternatives: [{ id: 'a1', label: 'A', description: 'A' }],
          authority: { mode: 'human' },
        },
      });
      const id = createRes.json().id;

      // Try to investigate without promoting first (invalid transition)
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/projects/proj-1/judgment-points/${id}/investigate`,
        payload: { actorId: 'user-1', actorType: 'user' },
      });
      expect(res.statusCode).toBe(409);
    });
  });
});
