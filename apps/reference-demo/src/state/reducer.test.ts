import { describe, expect, it } from 'vitest';
import type { JudgmentEventResponse, JudgmentPointResponse, PolicyResponse } from '../api/types';
import type { Action } from './reducer';
import { appReducer, initialState } from './reducer';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePoint(overrides: Partial<JudgmentPointResponse> = {}): JudgmentPointResponse {
  return {
    id: 'jp-1',
    projectId: 'proj-1',
    category: 'method',
    question: 'Which method?',
    context: 'Some context',
    trigger: { source: 'agent', description: 'detected' },
    materiality: {
      score: 8,
      dimensions: {
        methodologicalDiscretion: 2,
        downstreamInfluence: 1,
        uncertainty: 1,
        consequence: 2,
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

function makeEvent(overrides: Partial<JudgmentEventResponse> = {}): JudgmentEventResponse {
  return {
    id: 'ev-1',
    judgmentPointId: 'jp-1',
    projectId: 'proj-1',
    eventType: 'created',
    timestamp: '2026-01-01T00:00:00Z',
    actorId: 'system',
    actorType: 'system',
    ...overrides,
  };
}

function makePolicy(overrides: Partial<PolicyResponse> = {}): PolicyResponse {
  return {
    id: 'pol-1',
    projectId: 'proj-1',
    name: 'Default',
    description: 'Default policy',
    scope: {},
    rules: [
      {
        id: 'r-1',
        condition: {},
        intervention: 'disclose',
      },
    ],
    priority: 0,
    enabled: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('appReducer', () => {
  describe('initial state', () => {
    it('has the expected defaults', () => {
      expect(initialState.currentProjectId).toBe('default');
      expect(initialState.judgmentPoints).toEqual([]);
      expect(initialState.selectedPointId).toBeNull();
      expect(initialState.events).toEqual([]);
      expect(initialState.policies).toEqual([]);
      expect(initialState.loading).toBe(false);
      expect(initialState.error).toBeNull();
      expect(initialState.filters).toEqual({ status: [], category: [], interventionLevel: [] });
      expect(initialState.sortBy).toBe('updatedAt');
      expect(initialState.sortOrder).toBe('desc');
      expect(initialState.totalCount).toBe(0);
      expect(initialState.page).toBe(0);
      expect(initialState.pageSize).toBe(50);
    });
  });

  describe('SET_PROJECT', () => {
    it('sets the project and resets view state', () => {
      const state = {
        ...initialState,
        judgmentPoints: [makePoint()],
        selectedPointId: 'jp-1',
        events: [makeEvent()],
        policies: [makePolicy()],
        totalCount: 5,
        page: 3,
        error: 'old error',
      };
      const next = appReducer(state, { type: 'SET_PROJECT', projectId: 'new-project' });

      expect(next.currentProjectId).toBe('new-project');
      expect(next.judgmentPoints).toEqual([]);
      expect(next.selectedPointId).toBeNull();
      expect(next.events).toEqual([]);
      expect(next.policies).toEqual([]);
      expect(next.totalCount).toBe(0);
      expect(next.page).toBe(0);
      expect(next.error).toBeNull();
      // Filters, sort, pageSize should be preserved
      expect(next.filters).toEqual(state.filters);
      expect(next.sortBy).toBe(state.sortBy);
      expect(next.pageSize).toBe(state.pageSize);
    });
  });

  describe('SET_JUDGMENT_POINTS', () => {
    it('replaces the list and sets total count', () => {
      const points = [makePoint({ id: 'a' }), makePoint({ id: 'b' })];
      const next = appReducer(initialState, {
        type: 'SET_JUDGMENT_POINTS',
        points,
        total: 42,
      });

      expect(next.judgmentPoints).toBe(points);
      expect(next.totalCount).toBe(42);
    });
  });

  describe('UPDATE_JUDGMENT_POINT', () => {
    it('replaces the matching point in the list', () => {
      const p1 = makePoint({ id: 'p1', status: 'candidate' });
      const p2 = makePoint({ id: 'p2', status: 'candidate' });
      const state = { ...initialState, judgmentPoints: [p1, p2] };
      const updated = makePoint({ id: 'p1', status: 'pending' });

      const next = appReducer(state, { type: 'UPDATE_JUDGMENT_POINT', point: updated });

      expect(next.judgmentPoints).toHaveLength(2);
      expect(next.judgmentPoints[0]?.status).toBe('pending');
      expect(next.judgmentPoints[1]?.id).toBe('p2');
    });

    it('does not add a point that is not already in the list', () => {
      const state = { ...initialState, judgmentPoints: [makePoint({ id: 'p1' })] };
      const next = appReducer(state, {
        type: 'UPDATE_JUDGMENT_POINT',
        point: makePoint({ id: 'p99' }),
      });

      expect(next.judgmentPoints).toHaveLength(1);
      expect(next.judgmentPoints[0]?.id).toBe('p1');
    });
  });

  describe('ADD_JUDGMENT_POINT', () => {
    it('prepends the point and increments total', () => {
      const existing = makePoint({ id: 'p1' });
      const state = { ...initialState, judgmentPoints: [existing], totalCount: 1 };
      const newPoint = makePoint({ id: 'p2' });

      const next = appReducer(state, { type: 'ADD_JUDGMENT_POINT', point: newPoint });

      expect(next.judgmentPoints).toHaveLength(2);
      expect(next.judgmentPoints[0]?.id).toBe('p2');
      expect(next.judgmentPoints[1]?.id).toBe('p1');
      expect(next.totalCount).toBe(2);
    });
  });

  describe('SELECT_POINT', () => {
    it('sets the selected point id', () => {
      const next = appReducer(initialState, { type: 'SELECT_POINT', id: 'jp-1' });
      expect(next.selectedPointId).toBe('jp-1');
    });

    it('clears events when deselecting', () => {
      const state = {
        ...initialState,
        selectedPointId: 'jp-1',
        events: [makeEvent()],
      };
      const next = appReducer(state, { type: 'SELECT_POINT', id: null });

      expect(next.selectedPointId).toBeNull();
      expect(next.events).toEqual([]);
    });

    it('preserves events when selecting a different point', () => {
      const evts = [makeEvent()];
      const state = { ...initialState, selectedPointId: 'jp-1', events: evts };
      const next = appReducer(state, { type: 'SELECT_POINT', id: 'jp-2' });

      expect(next.selectedPointId).toBe('jp-2');
      expect(next.events).toBe(evts);
    });
  });

  describe('SET_EVENTS', () => {
    it('replaces events', () => {
      const events = [makeEvent({ id: 'e1' }), makeEvent({ id: 'e2' })];
      const next = appReducer(initialState, { type: 'SET_EVENTS', events });
      expect(next.events).toBe(events);
    });
  });

  describe('SET_POLICIES', () => {
    it('replaces policies', () => {
      const policies = [makePolicy({ id: 'pol-a' })];
      const next = appReducer(initialState, { type: 'SET_POLICIES', policies });
      expect(next.policies).toBe(policies);
    });
  });

  describe('SET_LOADING', () => {
    it('sets loading flag', () => {
      const next = appReducer(initialState, { type: 'SET_LOADING', loading: true });
      expect(next.loading).toBe(true);
    });
  });

  describe('SET_ERROR', () => {
    it('sets error string', () => {
      const next = appReducer(initialState, { type: 'SET_ERROR', error: 'something broke' });
      expect(next.error).toBe('something broke');
    });

    it('clears error', () => {
      const state = { ...initialState, error: 'old' };
      const next = appReducer(state, { type: 'SET_ERROR', error: null });
      expect(next.error).toBeNull();
    });
  });

  describe('SET_FILTERS', () => {
    it('merges partial filter updates and resets page', () => {
      const state = {
        ...initialState,
        page: 5,
        filters: { status: ['candidate'], category: [], interventionLevel: [] },
      };
      const next = appReducer(state, {
        type: 'SET_FILTERS',
        filters: { category: ['method'] },
      });

      expect(next.filters.status).toEqual(['candidate']);
      expect(next.filters.category).toEqual(['method']);
      expect(next.filters.interventionLevel).toEqual([]);
      expect(next.page).toBe(0);
    });
  });

  describe('SET_SORT', () => {
    it('sets sort and resets page', () => {
      const state = { ...initialState, page: 3 };
      const next = appReducer(state, {
        type: 'SET_SORT',
        sortBy: 'score',
        sortOrder: 'asc',
      });

      expect(next.sortBy).toBe('score');
      expect(next.sortOrder).toBe('asc');
      expect(next.page).toBe(0);
    });
  });

  describe('SET_PAGE', () => {
    it('sets the page number', () => {
      const next = appReducer(initialState, { type: 'SET_PAGE', page: 7 });
      expect(next.page).toBe(7);
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      const next = appReducer(initialState, { type: 'UNKNOWN' } as unknown as Action);
      expect(next).toBe(initialState);
    });
  });
});
