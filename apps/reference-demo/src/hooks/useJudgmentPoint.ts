import { useCallback, useMemo } from 'react';
import { JudgmentApiClient } from '../api/client';
import type { JudgmentEventResponse, JudgmentPointResponse } from '../api/types';
import { useAppContext } from '../state/context';

interface UseJudgmentPointResult {
  point: JudgmentPointResponse | undefined;
  events: JudgmentEventResponse[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching a single judgment point and its events.
 *
 * @param pointId - The id of the judgment point to fetch.  When `null` the
 *   hook is a no-op (returns `undefined` point and empty events).
 */
export function useJudgmentPoint(pointId: string | null): UseJudgmentPointResult {
  const { state, dispatch } = useAppContext();
  const client = useMemo(() => new JudgmentApiClient(), []);

  const point = state.judgmentPoints.find((p) => p.id === pointId);

  const refetch = useCallback(async () => {
    if (pointId === null) return;

    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });
    try {
      const [fetchedPoint, events] = await Promise.all([
        client.getJudgmentPoint(state.currentProjectId, pointId),
        client.getPointEvents(state.currentProjectId, pointId),
      ]);

      dispatch({ type: 'UPDATE_JUDGMENT_POINT', point: fetchedPoint });
      dispatch({ type: 'SET_EVENTS', events });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : String(err) });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [client, state.currentProjectId, pointId, dispatch]);

  return {
    point,
    events: state.events,
    loading: state.loading,
    error: state.error,
    refetch,
  };
}
