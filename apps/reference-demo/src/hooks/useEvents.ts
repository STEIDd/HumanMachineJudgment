import { useCallback, useMemo } from 'react';
import { JudgmentApiClient } from '../api/client';
import type { JudgmentEventResponse, PaginatedResult } from '../api/types';
import { useAppContext } from '../state/context';

interface UseEventsResult {
  events: JudgmentEventResponse[];
  loading: boolean;
  error: string | null;
  refetch: (params?: {
    offset?: number;
    limit?: number;
  }) => Promise<PaginatedResult<JudgmentEventResponse> | null>;
}

/**
 * Hook for fetching project-level events.
 *
 * Dispatches the fetched events into app state via `SET_EVENTS` and also
 * returns the paginated result to allow callers to access total counts.
 */
export function useEvents(): UseEventsResult {
  const { state, dispatch } = useAppContext();
  const client = useMemo(() => new JudgmentApiClient(), []);

  const refetch = useCallback(
    async (params?: {
      offset?: number;
      limit?: number;
    }): Promise<PaginatedResult<JudgmentEventResponse> | null> => {
      dispatch({ type: 'SET_LOADING', loading: true });
      dispatch({ type: 'SET_ERROR', error: null });
      try {
        const result = await client.getProjectEvents(state.currentProjectId, params);
        dispatch({ type: 'SET_EVENTS', events: result.items });
        return result;
      } catch (err) {
        dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : String(err) });
        return null;
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    },
    [client, state.currentProjectId, dispatch],
  );

  return {
    events: state.events,
    loading: state.loading,
    error: state.error,
    refetch,
  };
}
