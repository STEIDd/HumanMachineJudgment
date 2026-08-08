import { useCallback, useMemo } from 'react';
import { JudgmentApiClient } from '../api/client';
import type {
  AddAlternativeRequest,
  AddArtifactRequest,
  CreateCandidateRequest,
  DelegateRequest,
  DismissRequest,
  InvestigateRequest,
  JudgmentPointResponse,
  MarkStaleRequest,
  PromoteRequest,
  ReopenRequest,
  ResolveRequest,
} from '../api/types';
import { useAppContext } from '../state/context';

interface UseJudgmentActionsResult {
  createCandidate: (data: CreateCandidateRequest) => Promise<JudgmentPointResponse | null>;
  promote: (pointId: string, data: PromoteRequest) => Promise<JudgmentPointResponse | null>;
  investigate: (pointId: string, data: InvestigateRequest) => Promise<JudgmentPointResponse | null>;
  resolve: (pointId: string, data: ResolveRequest) => Promise<JudgmentPointResponse | null>;
  dismiss: (pointId: string, data: DismissRequest) => Promise<JudgmentPointResponse | null>;
  reopen: (pointId: string, data: ReopenRequest) => Promise<JudgmentPointResponse | null>;
  markStale: (pointId: string, data: MarkStaleRequest) => Promise<JudgmentPointResponse | null>;
  delegate: (pointId: string, data: DelegateRequest) => Promise<JudgmentPointResponse | null>;
  addAlternative: (
    pointId: string,
    data: AddAlternativeRequest,
  ) => Promise<JudgmentPointResponse | null>;
  addArtifact: (pointId: string, data: AddArtifactRequest) => Promise<JudgmentPointResponse | null>;
  removeArtifact: (pointId: string, artifactId: string) => Promise<JudgmentPointResponse | null>;
}

/**
 * Hook that provides action functions for all judgment-point mutations.
 *
 * Each action dispatches the returned (updated) point into app state via
 * `UPDATE_JUDGMENT_POINT` or `ADD_JUDGMENT_POINT`, and sets error state on
 * failure.  The raw response is returned so callers can react to it.
 */
export function useJudgmentActions(): UseJudgmentActionsResult {
  const { state, dispatch } = useAppContext();
  const client = useMemo(() => new JudgmentApiClient(), []);
  const projectId = state.currentProjectId;

  // -- helpers ----------------------------------------------------------------

  /** Wraps a mutating API call: sets loading/error and dispatches the updated point. */
  const mutate = useCallback(
    async (
      fn: () => Promise<JudgmentPointResponse>,
      dispatchType: 'UPDATE_JUDGMENT_POINT' | 'ADD_JUDGMENT_POINT' = 'UPDATE_JUDGMENT_POINT',
    ): Promise<JudgmentPointResponse | null> => {
      dispatch({ type: 'SET_LOADING', loading: true });
      dispatch({ type: 'SET_ERROR', error: null });
      try {
        const point = await fn();
        if (dispatchType === 'ADD_JUDGMENT_POINT') {
          dispatch({ type: 'ADD_JUDGMENT_POINT', point });
        } else {
          dispatch({ type: 'UPDATE_JUDGMENT_POINT', point });
        }
        return point;
      } catch (err) {
        dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : String(err) });
        return null;
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    },
    [dispatch],
  );

  // -- actions ----------------------------------------------------------------

  const createCandidate = useCallback(
    (data: CreateCandidateRequest) =>
      mutate(() => client.createCandidate(projectId, data), 'ADD_JUDGMENT_POINT'),
    [client, projectId, mutate],
  );

  const promote = useCallback(
    (pointId: string, data: PromoteRequest) =>
      mutate(() => client.promote(projectId, pointId, data)),
    [client, projectId, mutate],
  );

  const investigate = useCallback(
    (pointId: string, data: InvestigateRequest) =>
      mutate(() => client.investigate(projectId, pointId, data)),
    [client, projectId, mutate],
  );

  const resolve = useCallback(
    (pointId: string, data: ResolveRequest) =>
      mutate(() => client.resolve(projectId, pointId, data)),
    [client, projectId, mutate],
  );

  const dismiss = useCallback(
    (pointId: string, data: DismissRequest) =>
      mutate(() => client.dismiss(projectId, pointId, data)),
    [client, projectId, mutate],
  );

  const reopen = useCallback(
    (pointId: string, data: ReopenRequest) => mutate(() => client.reopen(projectId, pointId, data)),
    [client, projectId, mutate],
  );

  const markStale = useCallback(
    (pointId: string, data: MarkStaleRequest) =>
      mutate(() => client.markStale(projectId, pointId, data)),
    [client, projectId, mutate],
  );

  const delegate = useCallback(
    (pointId: string, data: DelegateRequest) =>
      mutate(() => client.delegate(projectId, pointId, data)),
    [client, projectId, mutate],
  );

  const addAlternative = useCallback(
    (pointId: string, data: AddAlternativeRequest) =>
      mutate(() => client.addAlternative(projectId, pointId, data)),
    [client, projectId, mutate],
  );

  const addArtifact = useCallback(
    (pointId: string, data: AddArtifactRequest) =>
      mutate(() => client.addArtifact(projectId, pointId, data)),
    [client, projectId, mutate],
  );

  const removeArtifact = useCallback(
    (pointId: string, artifactId: string) =>
      mutate(() => client.removeArtifact(projectId, pointId, artifactId)),
    [client, projectId, mutate],
  );

  return {
    createCandidate,
    promote,
    investigate,
    resolve,
    dismiss,
    reopen,
    markStale,
    delegate,
    addAlternative,
    addArtifact,
    removeArtifact,
  };
}
