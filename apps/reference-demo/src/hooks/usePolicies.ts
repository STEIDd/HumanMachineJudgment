import { useCallback, useMemo } from 'react';
import { JudgmentApiClient } from '../api/client';
import type { PolicyRequest, PolicyResponse } from '../api/types';
import { useAppContext } from '../state/context';

interface UsePoliciesResult {
  policies: PolicyResponse[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createPolicy: (data: PolicyRequest) => Promise<PolicyResponse | null>;
  updatePolicy: (policyId: string, data: PolicyRequest) => Promise<PolicyResponse | null>;
}

/**
 * Hook for fetching, creating, and updating policies.
 */
export function usePolicies(): UsePoliciesResult {
  const { state, dispatch } = useAppContext();
  const client = useMemo(() => new JudgmentApiClient(), []);

  const refetch = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });
    try {
      const policies = await client.listPolicies(state.currentProjectId);
      dispatch({ type: 'SET_POLICIES', policies });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : String(err) });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [client, state.currentProjectId, dispatch]);

  const createPolicy = useCallback(
    async (data: PolicyRequest): Promise<PolicyResponse | null> => {
      dispatch({ type: 'SET_LOADING', loading: true });
      dispatch({ type: 'SET_ERROR', error: null });
      try {
        const policy = await client.createPolicy(state.currentProjectId, data);
        // Refresh the full list to keep state consistent
        const policies = await client.listPolicies(state.currentProjectId);
        dispatch({ type: 'SET_POLICIES', policies });
        return policy;
      } catch (err) {
        dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : String(err) });
        return null;
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    },
    [client, state.currentProjectId, dispatch],
  );

  const updatePolicy = useCallback(
    async (policyId: string, data: PolicyRequest): Promise<PolicyResponse | null> => {
      dispatch({ type: 'SET_LOADING', loading: true });
      dispatch({ type: 'SET_ERROR', error: null });
      try {
        const policy = await client.updatePolicy(state.currentProjectId, policyId, data);
        // Refresh the full list to keep state consistent
        const policies = await client.listPolicies(state.currentProjectId);
        dispatch({ type: 'SET_POLICIES', policies });
        return policy;
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
    policies: state.policies,
    loading: state.loading,
    error: state.error,
    refetch,
    createPolicy,
    updatePolicy,
  };
}
