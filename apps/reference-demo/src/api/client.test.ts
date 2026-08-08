import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, JudgmentApiClient } from './client';
import type {
  CreateCandidateRequest,
  JudgmentPointResponse,
  PaginatedResult,
  PolicyResponse,
} from './types';

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

let mockFetch: ReturnType<typeof vi.fn<(...args: Parameters<typeof fetch>) => Promise<Response>>>;

beforeEach(() => {
  mockFetch = vi.fn<(...args: Parameters<typeof fetch>) => Promise<Response>>();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE = 'http://test-api:9000';
const API = `${BASE}/api/v1`;
const PROJECT = 'proj-1';
const POINT_ID = 'jp-1';

function makePointResponse(overrides: Partial<JudgmentPointResponse> = {}): JudgmentPointResponse {
  return {
    id: POINT_ID,
    projectId: PROJECT,
    category: 'method',
    question: 'Which method?',
    context: 'ctx',
    trigger: { source: 'agent', description: 'detected' },
    materiality: {
      score: 6,
      dimensions: {
        methodologicalDiscretion: 1,
        downstreamInfluence: 1,
        uncertainty: 1,
        consequence: 1,
        reversibility: 1,
        accountabilityRequirement: 1,
      },
    },
    status: 'candidate',
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('JudgmentApiClient', () => {
  let client: JudgmentApiClient;

  beforeEach(() => {
    client = new JudgmentApiClient(BASE);
  });

  // -- URL construction -----------------------------------------------------

  describe('URL construction', () => {
    it('health()', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));
      await client.health();
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE}/health`,
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });

    it('listJudgmentPoints() without params', async () => {
      const paginated: PaginatedResult<JudgmentPointResponse> = {
        items: [],
        total: 0,
        offset: 0,
        limit: 50,
      };
      mockFetch.mockResolvedValueOnce(jsonResponse(paginated));
      await client.listJudgmentPoints(PROJECT);
      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toBe(`${API}/projects/${PROJECT}/judgment-points`);
    });

    it('listJudgmentPoints() with filters', async () => {
      const paginated: PaginatedResult<JudgmentPointResponse> = {
        items: [],
        total: 0,
        offset: 0,
        limit: 20,
      };
      mockFetch.mockResolvedValueOnce(jsonResponse(paginated));
      await client.listJudgmentPoints(PROJECT, {
        status: ['candidate', 'pending'],
        category: ['method'],
        offset: 10,
        limit: 20,
      });
      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toContain('status=candidate');
      expect(url).toContain('status=pending');
      expect(url).toContain('category=method');
      expect(url).toContain('offset=10');
      expect(url).toContain('limit=20');
    });

    it('getJudgmentPoint()', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(makePointResponse()));
      await client.getJudgmentPoint(PROJECT, POINT_ID);
      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toBe(`${API}/projects/${PROJECT}/judgment-points/${POINT_ID}`);
    });

    it('promote()', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(makePointResponse({ status: 'pending' })));
      await client.promote(PROJECT, POINT_ID, { actor: { id: 'u1', type: 'user' } });
      const url = mockFetch.mock.calls[0]?.[0] as string;
      const opts = mockFetch.mock.calls[0]?.[1] as RequestInit;
      expect(url).toBe(`${API}/projects/${PROJECT}/judgment-points/${POINT_ID}/promote`);
      expect(opts.method).toBe('PATCH');
    });

    it('investigate()', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(makePointResponse({ status: 'investigating' })));
      await client.investigate(PROJECT, POINT_ID, { actor: { id: 'u1', type: 'user' } });
      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toContain('/investigate');
    });

    it('resolve()', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(makePointResponse({ status: 'resolved' })));
      await client.resolve(PROJECT, POINT_ID, {
        actor: { id: 'u1', type: 'user' },
        resolution: {
          selectedAlternativeId: 'alt-1',
          rationale: 'best fit',
          resolvedAt: '2026-01-02T00:00:00Z',
        },
      });
      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toContain('/resolve');
    });

    it('delegate()', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(makePointResponse({ status: 'delegated' })));
      await client.delegate(PROJECT, POINT_ID, {
        actor: { id: 'u1', type: 'user' },
        delegateId: 'agent-1',
        policyId: 'pol-1',
      });
      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toContain('/delegate');
    });

    it('dismiss()', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(makePointResponse({ status: 'dismissed' })));
      await client.dismiss(PROJECT, POINT_ID, {
        actor: { id: 'u1', type: 'user' },
        reason: 'not relevant',
      });
      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toContain('/dismiss');
    });

    it('reopen()', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(makePointResponse({ status: 'reopened' })));
      await client.reopen(PROJECT, POINT_ID, {
        actor: { id: 'u1', type: 'user' },
        reason: 'new data',
      });
      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toContain('/reopen');
    });

    it('markStale()', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(makePointResponse({ status: 'stale' })));
      await client.markStale(PROJECT, POINT_ID, {
        actor: { id: 'u1', type: 'system' },
        reason: 'data changed',
      });
      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toContain('/mark-stale');
    });

    it('addAlternative()', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(makePointResponse()));
      await client.addAlternative(PROJECT, POINT_ID, {
        alternative: { label: 'Alt A', description: 'desc' },
      });
      const url = mockFetch.mock.calls[0]?.[0] as string;
      const opts = mockFetch.mock.calls[0]?.[1] as RequestInit;
      expect(url).toContain('/alternatives');
      expect(opts.method).toBe('POST');
    });

    it('addArtifact()', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(makePointResponse()));
      await client.addArtifact(PROJECT, POINT_ID, {
        artifact: { artifactType: 'cell', label: 'Cell A', relationship: 'depends-on' },
      });
      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toContain('/artifacts');
    });

    it('removeArtifact()', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(makePointResponse()));
      await client.removeArtifact(PROJECT, POINT_ID, 'art-1');
      const url = mockFetch.mock.calls[0]?.[0] as string;
      const opts = mockFetch.mock.calls[0]?.[1] as RequestInit;
      expect(url).toBe(`${API}/projects/${PROJECT}/judgment-points/${POINT_ID}/artifacts/art-1`);
      expect(opts.method).toBe('DELETE');
    });

    it('getPointEvents()', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));
      await client.getPointEvents(PROJECT, POINT_ID);
      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toBe(`${API}/projects/${PROJECT}/judgment-points/${POINT_ID}/events`);
    });

    it('getProjectEvents()', async () => {
      const paginated = { items: [], total: 0, offset: 0, limit: 50 };
      mockFetch.mockResolvedValueOnce(jsonResponse(paginated));
      await client.getProjectEvents(PROJECT, { offset: 5, limit: 10 });
      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toContain('offset=5');
      expect(url).toContain('limit=10');
    });

    it('createCandidate()', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(makePointResponse(), 201));
      const data: CreateCandidateRequest = {
        projectId: PROJECT,
        category: 'method',
        question: 'Which method?',
        context: 'ctx',
        trigger: { source: 'agent', description: 'detected' },
        materiality: {
          score: 6,
          dimensions: {
            methodologicalDiscretion: 1,
            downstreamInfluence: 1,
            uncertainty: 1,
            consequence: 1,
            reversibility: 1,
            accountabilityRequirement: 1,
          },
        },
        authority: { mode: 'human' },
      };
      await client.createCandidate(PROJECT, data);
      const url = mockFetch.mock.calls[0]?.[0] as string;
      const opts = mockFetch.mock.calls[0]?.[1] as RequestInit;
      expect(url).toBe(`${API}/projects/${PROJECT}/judgment-points`);
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body as string)).toMatchObject({ projectId: PROJECT });
    });

    it('createPolicy()', async () => {
      const pol: PolicyResponse = {
        id: 'pol-1',
        projectId: PROJECT,
        name: 'Test',
        description: 'Test policy',
        scope: {},
        rules: [{ id: 'r1', condition: {}, intervention: 'disclose' }],
        priority: 0,
        enabled: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      mockFetch.mockResolvedValueOnce(jsonResponse(pol, 201));
      await client.createPolicy(PROJECT, {
        name: 'Test',
        description: 'Test policy',
        scope: {},
        rules: [{ id: 'r1', condition: {}, intervention: 'disclose' }],
        priority: 0,
        enabled: true,
      });
      const url = mockFetch.mock.calls[0]?.[0] as string;
      const opts = mockFetch.mock.calls[0]?.[1] as RequestInit;
      expect(url).toBe(`${API}/projects/${PROJECT}/policies`);
      expect(opts.method).toBe('POST');
    });

    it('listPolicies()', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse([]));
      await client.listPolicies(PROJECT);
      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toBe(`${API}/projects/${PROJECT}/policies`);
    });

    it('getPolicy()', async () => {
      const pol: PolicyResponse = {
        id: 'pol-1',
        projectId: PROJECT,
        name: 'Test',
        description: 'desc',
        scope: {},
        rules: [{ id: 'r1', condition: {}, intervention: 'disclose' }],
        priority: 0,
        enabled: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      mockFetch.mockResolvedValueOnce(jsonResponse(pol));
      await client.getPolicy(PROJECT, 'pol-1');
      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toBe(`${API}/projects/${PROJECT}/policies/pol-1`);
    });

    it('updatePolicy()', async () => {
      const pol: PolicyResponse = {
        id: 'pol-1',
        projectId: PROJECT,
        name: 'Updated',
        description: 'desc',
        scope: {},
        rules: [{ id: 'r1', condition: {}, intervention: 'pause' }],
        priority: 1,
        enabled: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z',
      };
      mockFetch.mockResolvedValueOnce(jsonResponse(pol));
      await client.updatePolicy(PROJECT, 'pol-1', {
        name: 'Updated',
        description: 'desc',
        scope: {},
        rules: [{ id: 'r1', condition: {}, intervention: 'pause' }],
        priority: 1,
        enabled: false,
      });
      const url = mockFetch.mock.calls[0]?.[0] as string;
      const opts = mockFetch.mock.calls[0]?.[1] as RequestInit;
      expect(url).toBe(`${API}/projects/${PROJECT}/policies/pol-1`);
      expect(opts.method).toBe('PUT');
    });

    it('encodes special characters in path segments', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(makePointResponse()));
      await client.getJudgmentPoint('proj/special', 'id with spaces');
      const url = mockFetch.mock.calls[0]?.[0] as string;
      expect(url).toContain('proj%2Fspecial');
      expect(url).toContain('id%20with%20spaces');
    });
  });

  // -- Error handling -------------------------------------------------------

  describe('error handling', () => {
    it('throws ApiError on 404', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ detail: 'Not found' }, 404));
      await expect(client.getJudgmentPoint(PROJECT, 'nope')).rejects.toThrow(ApiError);
    });

    it('ApiError has status and body', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ detail: 'Bad request' }, 400));
      try {
        await client.health();
        expect.fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(400);
        expect(apiErr.body).toContain('Bad request');
      }
    });

    it('throws ApiError on 500', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse('Internal Server Error', 500));
      await expect(client.health()).rejects.toThrow(ApiError);
    });

    it('propagates network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      await expect(client.health()).rejects.toThrow(TypeError);
    });
  });

  // -- Request body ---------------------------------------------------------

  describe('request body', () => {
    it('sends JSON body for POST', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(makePointResponse(), 201));
      const data: CreateCandidateRequest = {
        projectId: PROJECT,
        category: 'data',
        question: 'q',
        context: 'c',
        trigger: { source: 'user', description: 'd' },
        materiality: {
          score: 3,
          dimensions: {
            methodologicalDiscretion: 0,
            downstreamInfluence: 1,
            uncertainty: 0,
            consequence: 1,
            reversibility: 0,
            accountabilityRequirement: 1,
          },
        },
        authority: { mode: 'collaborative' },
      };
      await client.createCandidate(PROJECT, data);
      const opts = mockFetch.mock.calls[0]?.[1] as RequestInit;
      const parsed = JSON.parse(opts.body as string) as CreateCandidateRequest;
      expect(parsed.category).toBe('data');
      expect(parsed.materiality.score).toBe(3);
    });

    it('sends JSON body for PATCH', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse(makePointResponse({ status: 'dismissed' })));
      await client.dismiss(PROJECT, POINT_ID, {
        actor: { id: 'user-1', type: 'user' },
        reason: 'not needed',
      });
      const opts = mockFetch.mock.calls[0]?.[1] as RequestInit;
      const parsed = JSON.parse(opts.body as string) as { reason: string };
      expect(parsed.reason).toBe('not needed');
    });

    it('sets Content-Type header', async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ status: 'ok' }));
      await client.health();
      const opts = mockFetch.mock.calls[0]?.[1] as RequestInit;
      const headers = opts.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
    });
  });
});
