import type { JudgmentEventResponse, JudgmentPointResponse, PolicyResponse } from '../api/types';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface AppState {
  currentProjectId: string;
  judgmentPoints: JudgmentPointResponse[];
  selectedPointId: string | null;
  events: JudgmentEventResponse[];
  policies: PolicyResponse[];
  loading: boolean;
  error: string | null;
  filters: {
    status: string[];
    category: string[];
    interventionLevel: string[];
  };
  sortBy: 'updatedAt' | 'createdAt' | 'score' | 'status';
  sortOrder: 'asc' | 'desc';
  totalCount: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type Action =
  | { type: 'SET_PROJECT'; projectId: string }
  | { type: 'SET_JUDGMENT_POINTS'; points: JudgmentPointResponse[]; total: number }
  | { type: 'UPDATE_JUDGMENT_POINT'; point: JudgmentPointResponse }
  | { type: 'ADD_JUDGMENT_POINT'; point: JudgmentPointResponse }
  | { type: 'SELECT_POINT'; id: string | null }
  | { type: 'SET_EVENTS'; events: JudgmentEventResponse[] }
  | { type: 'SET_POLICIES'; policies: PolicyResponse[] }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_FILTERS'; filters: Partial<AppState['filters']> }
  | { type: 'SET_SORT'; sortBy: AppState['sortBy']; sortOrder: AppState['sortOrder'] }
  | { type: 'SET_PAGE'; page: number };

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const initialState: AppState = {
  currentProjectId: 'default',
  judgmentPoints: [],
  selectedPointId: null,
  events: [],
  policies: [],
  loading: false,
  error: null,
  filters: {
    status: [],
    category: [],
    interventionLevel: [],
  },
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  totalCount: 0,
  page: 0,
  pageSize: 50,
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PROJECT':
      return {
        ...state,
        currentProjectId: action.projectId,
        // Reset view-state when switching projects
        judgmentPoints: [],
        selectedPointId: null,
        events: [],
        policies: [],
        totalCount: 0,
        page: 0,
        error: null,
      };

    case 'SET_JUDGMENT_POINTS':
      return {
        ...state,
        judgmentPoints: action.points,
        totalCount: action.total,
      };

    case 'UPDATE_JUDGMENT_POINT':
      return {
        ...state,
        judgmentPoints: state.judgmentPoints.map((p) =>
          p.id === action.point.id ? action.point : p,
        ),
      };

    case 'ADD_JUDGMENT_POINT':
      return {
        ...state,
        judgmentPoints: [action.point, ...state.judgmentPoints],
        totalCount: state.totalCount + 1,
      };

    case 'SELECT_POINT':
      return {
        ...state,
        selectedPointId: action.id,
        // Clear point-level events when deselecting
        events: action.id === null ? [] : state.events,
      };

    case 'SET_EVENTS':
      return { ...state, events: action.events };

    case 'SET_POLICIES':
      return { ...state, policies: action.policies };

    case 'SET_LOADING':
      return { ...state, loading: action.loading };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.filters },
        // Reset to first page when filters change
        page: 0,
      };

    case 'SET_SORT':
      return {
        ...state,
        sortBy: action.sortBy,
        sortOrder: action.sortOrder,
        // Reset to first page when sort changes
        page: 0,
      };

    case 'SET_PAGE':
      return { ...state, page: action.page };

    default:
      return state;
  }
}
