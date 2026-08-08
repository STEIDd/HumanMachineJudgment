import { useCallback, useMemo } from 'react';
import { JudgmentApiClient } from '../api/client';
import { useAppContext } from '../state/context';

/**
 * Hook for fetching and accessing the list of judgment points.
 *
 * Reads current filters, pagination, and project from app state, issues the
 * API call, and dispatches the results back into the reducer.
 */
export function useJudgmentPoints() {
  const { state, dispatch } = useAppContext();
  const client = useMemo(() => new JudgmentApiClient(), []);

  const fetchPoints = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });
    try {
      const result = await client.listJudgmentPoints(state.currentProjectId, {
        status: state.filters.status.length > 0 ? state.filters.status : undefined,
        category: state.filters.category.length > 0 ? state.filters.category : undefined,
        offset: state.page * state.pageSize,
        limit: state.pageSize,
      });
      dispatch({ type: 'SET_JUDGMENT_POINTS', points: result.items, total: result.total });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : String(err) });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [client, state.currentProjectId, state.filters, state.page, state.pageSize, dispatch]);

  return {
    points: state.judgmentPoints,
    loading: state.loading,
    error: state.error,
    total: state.totalCount,
    page: state.page,
    pageSize: state.pageSize,
    filters: state.filters,
    refetch: fetchPoints,
  };
}
