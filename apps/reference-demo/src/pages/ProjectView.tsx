import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  JudgmentPanel,
  ProjectJudgmentsView,
  ResolutionForm,
  ReopenDialog,
  DelegationDialog,
} from '@human-machine-judgment/ui';
import { JudgmentApiClient } from '../api/client';
import type { CreateCandidateRequest, JudgmentPointResponse } from '../api/types';
import { useAppContext } from '../state/context';
import { useJudgmentPoints } from '../hooks/useJudgmentPoints';
import { useJudgmentPoint } from '../hooks/useJudgmentPoint';
import styles from './ProjectView.module.css';

export interface ProjectViewProps {
  projectId: string;
  onNavigate: (hash: string) => void;
}

type DialogMode = 'none' | 'resolve' | 'reopen' | 'delegate';

export const ProjectView: React.FC<ProjectViewProps> = ({ projectId, onNavigate }) => {
  const { state, dispatch } = useAppContext();
  const { points, loading, error, total, page, pageSize, filters, refetch } = useJudgmentPoints();
  const client = useMemo(() => new JudgmentApiClient(), []);

  const selectedPointId = state.selectedPointId;
  const {
    point: selectedPoint,
    events: pointEvents,
    refetch: refetchPoint,
  } = useJudgmentPoint(selectedPointId);

  const [dialogMode, setDialogMode] = useState<DialogMode>('none');
  const [creating, setCreating] = useState(false);

  // Sync project ID into state if needed
  useEffect(() => {
    if (state.currentProjectId !== projectId) {
      dispatch({ type: 'SET_PROJECT', projectId });
    }
  }, [projectId, state.currentProjectId, dispatch]);

  // Fetch points whenever project/filters/page change
  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Fetch point detail when selected
  useEffect(() => {
    if (selectedPointId) {
      void refetchPoint();
    }
  }, [selectedPointId, refetchPoint]);

  // -------------------------------------------------------------------------
  // Create demo candidate
  // -------------------------------------------------------------------------

  const handleCreateDemo = useCallback(async () => {
    setCreating(true);
    try {
      const demoCandidate: CreateCandidateRequest = {
        projectId,
        category: 'assumption',
        question: 'Should we use constant or temperature-dependent material properties?',
        context:
          'Analyzing thermal behavior of an aluminum heat sink. Operating range 25\u00B0C to 95\u00B0C.',
        trigger: {
          source: 'agent',
          description: 'Agent making simplifying assumption about material properties',
        },
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
        authority: { mode: 'collaborative' },
        alternatives: [
          {
            label: 'Use constant properties',
            description:
              'Use material properties at 25\u00B0C (room temperature) throughout the analysis.',
            tradeoffs:
              'Simpler model; may underestimate thermal expansion effects at higher temperatures.',
            source: 'agent',
          },
          {
            label: 'Use temperature-dependent properties',
            description: 'Interpolate k(T), Cp(T), and alpha(T) from handbook data.',
            tradeoffs: 'More accurate but requires iterative solver and additional data sources.',
            source: 'agent',
          },
        ],
        validityConditions: ['Operating temperature stays within 25-95\u00B0C range'],
        reopenConditions: ['If operating range changes significantly'],
      };

      const newPoint = await client.createCandidate(projectId, demoCandidate);
      dispatch({ type: 'ADD_JUDGMENT_POINT', point: newPoint });
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setCreating(false);
    }
  }, [client, projectId, dispatch]);

  // -------------------------------------------------------------------------
  // Point selection
  // -------------------------------------------------------------------------

  const handleSelectPoint = useCallback(
    (id: string) => {
      dispatch({ type: 'SELECT_POINT', id });
      setDialogMode('none');
    },
    [dispatch],
  );

  const handleClosePanel = useCallback(() => {
    dispatch({ type: 'SELECT_POINT', id: null });
    setDialogMode('none');
  }, [dispatch]);

  // -------------------------------------------------------------------------
  // Card-level actions (from ProjectJudgmentsView)
  // -------------------------------------------------------------------------

  const handleCardAction = useCallback(
    async (id: string, action: string) => {
      const actor = { id: 'demo-user', type: 'user' as const };
      try {
        let updated: JudgmentPointResponse;
        switch (action) {
          case 'Begin Investigation':
            updated = await client.investigate(projectId, id, { actor });
            dispatch({ type: 'UPDATE_JUDGMENT_POINT', point: updated });
            break;
          case 'Dismiss':
            updated = await client.dismiss(projectId, id, {
              actor,
              reason: 'Dismissed via demo UI',
            });
            dispatch({ type: 'UPDATE_JUDGMENT_POINT', point: updated });
            break;
          case 'Delegate':
            dispatch({ type: 'SELECT_POINT', id });
            setDialogMode('delegate');
            break;
          case 'Add Alternative':
            dispatch({ type: 'SELECT_POINT', id });
            break;
          case 'Resolve':
            dispatch({ type: 'SELECT_POINT', id });
            setDialogMode('resolve');
            break;
          case 'Reopen':
            dispatch({ type: 'SELECT_POINT', id });
            setDialogMode('reopen');
            break;
          case 'Confirm Valid':
            // Re-validate a stale point by reopening with a reason
            updated = await client.reopen(projectId, id, {
              actor,
              reason: 'Confirmed still valid',
            });
            dispatch({ type: 'UPDATE_JUDGMENT_POINT', point: updated });
            break;
          default:
            break;
        }
      } catch (err) {
        dispatch({
          type: 'SET_ERROR',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [client, projectId, dispatch],
  );

  // -------------------------------------------------------------------------
  // Panel-level actions (from JudgmentPanel)
  // -------------------------------------------------------------------------

  const handlePanelAction = useCallback(
    async (action: string) => {
      if (!selectedPointId) return;
      const actor = { id: 'demo-user', type: 'user' as const };

      try {
        let updated: JudgmentPointResponse;
        switch (action) {
          case 'accept':
            updated = await client.promote(projectId, selectedPointId, { actor });
            dispatch({ type: 'UPDATE_JUDGMENT_POINT', point: updated });
            break;
          case 'dismiss':
            updated = await client.dismiss(projectId, selectedPointId, {
              actor,
              reason: 'Dismissed via panel',
            });
            dispatch({ type: 'UPDATE_JUDGMENT_POINT', point: updated });
            break;
          case 'investigate':
            updated = await client.investigate(projectId, selectedPointId, { actor });
            dispatch({ type: 'UPDATE_JUDGMENT_POINT', point: updated });
            break;
          case 'resolve':
            setDialogMode('resolve');
            break;
          case 'delegate':
            setDialogMode('delegate');
            break;
          case 'reopen':
            setDialogMode('reopen');
            break;
          case 'reclaim':
            // Reclaim = reopen a delegated point
            updated = await client.reopen(projectId, selectedPointId, {
              actor,
              reason: 'Reclaimed by user',
            });
            dispatch({ type: 'UPDATE_JUDGMENT_POINT', point: updated });
            break;
          case 're-evaluate':
            updated = await client.reopen(projectId, selectedPointId, {
              actor,
              reason: 'Re-evaluating stale point',
            });
            dispatch({ type: 'UPDATE_JUDGMENT_POINT', point: updated });
            break;
          default:
            break;
        }
      } catch (err) {
        dispatch({
          type: 'SET_ERROR',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [client, projectId, selectedPointId, dispatch],
  );

  // -------------------------------------------------------------------------
  // Resolution submission
  // -------------------------------------------------------------------------

  const handleResolutionSubmit = useCallback(
    async (data: {
      selectedAlternativeId: string;
      rationale: string;
      conditions?: string[];
      validationRequirements?: string[];
    }) => {
      if (!selectedPointId) return;
      const actor = { id: 'demo-user', type: 'user' as const };
      try {
        const updated = await client.resolve(projectId, selectedPointId, {
          actor,
          resolution: {
            selectedAlternativeId: data.selectedAlternativeId,
            rationale: data.rationale,
            resolvedAt: new Date().toISOString(),
            conditions: data.conditions ?? null,
            validationRequirements: data.validationRequirements ?? null,
          },
        });
        dispatch({ type: 'UPDATE_JUDGMENT_POINT', point: updated });
        setDialogMode('none');
      } catch (err) {
        dispatch({
          type: 'SET_ERROR',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [client, projectId, selectedPointId, dispatch],
  );

  // -------------------------------------------------------------------------
  // Reopen submission
  // -------------------------------------------------------------------------

  const handleReopenSubmit = useCallback(
    async (data: { reason: string }) => {
      if (!selectedPointId) return;
      const actor = { id: 'demo-user', type: 'user' as const };
      try {
        const updated = await client.reopen(projectId, selectedPointId, {
          actor,
          reason: data.reason,
        });
        dispatch({ type: 'UPDATE_JUDGMENT_POINT', point: updated });
        setDialogMode('none');
      } catch (err) {
        dispatch({
          type: 'SET_ERROR',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [client, projectId, selectedPointId, dispatch],
  );

  // -------------------------------------------------------------------------
  // Delegate submission
  // -------------------------------------------------------------------------

  const handleDelegateSubmit = useCallback(
    async (_data: { reason: string }) => {
      if (!selectedPointId) return;
      const actor = { id: 'demo-user', type: 'user' as const };
      try {
        const updated = await client.delegate(projectId, selectedPointId, {
          actor,
          delegateId: 'agent-001',
          policyId: 'default',
        });
        dispatch({ type: 'UPDATE_JUDGMENT_POINT', point: updated });
        setDialogMode('none');
      } catch (err) {
        dispatch({
          type: 'SET_ERROR',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [client, projectId, selectedPointId, dispatch],
  );

  // -------------------------------------------------------------------------
  // Filters & sorting
  // -------------------------------------------------------------------------

  const handleFiltersChange = useCallback(
    (
      newFilters:
        | {
            status?: string[];
            category?: string[];
            interventionLevel?: string[];
            materialityRange?: [number, number];
          }
        | undefined,
    ) => {
      dispatch({
        type: 'SET_FILTERS',
        filters: {
          status: newFilters?.status ?? [],
          category: newFilters?.category ?? [],
          interventionLevel: newFilters?.interventionLevel ?? [],
        },
      });
    },
    [dispatch],
  );

  const handleSortChange = useCallback(
    (sortBy: string, sortOrder: 'asc' | 'desc') => {
      dispatch({
        type: 'SET_SORT',
        sortBy: sortBy as AppState['sortBy'],
        sortOrder,
      });
    },
    [dispatch],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      dispatch({ type: 'SET_PAGE', page: newPage - 1 }); // UI is 1-based, state is 0-based
    },
    [dispatch],
  );

  // -------------------------------------------------------------------------
  // Build panel-compatible data shape
  // -------------------------------------------------------------------------

  const panelData = selectedPoint
    ? {
        id: selectedPoint.id,
        status: selectedPoint.status,
        category: selectedPoint.category,
        question: selectedPoint.question,
        context: selectedPoint.context,
        trigger: {
          source: selectedPoint.trigger.source,
          description: selectedPoint.trigger.description,
          hardTrigger: selectedPoint.trigger.hardTrigger ?? undefined,
        },
        materiality: {
          score: selectedPoint.materiality.score,
          interventionLevel: selectedPoint.materiality.interventionLevel ?? undefined,
          dimensions: selectedPoint.materiality.dimensions,
          hardTrigger: selectedPoint.materiality.hardTrigger ?? undefined,
          detectorConfidence: selectedPoint.materiality.detectorConfidence ?? undefined,
        },
        alternatives: selectedPoint.alternatives.map((a) => ({
          id: a.id,
          label: a.label,
          description: a.description,
          tradeoffs: a.tradeoffs ?? undefined,
          source: a.source ?? undefined,
        })),
        authority: {
          mode: selectedPoint.authority.mode,
          assignedTo: selectedPoint.authority.actorId ?? undefined,
        },
        resolution: selectedPoint.resolution
          ? {
              selectedAlternativeId: selectedPoint.resolution.selectedAlternativeId,
              rationale: selectedPoint.resolution.rationale,
              resolvedAt: selectedPoint.resolution.resolvedAt,
              resolvedBy: selectedPoint.resolution.resolvedBy ?? 'unknown',
              conditions: selectedPoint.resolution.conditions ?? undefined,
              validationRequirements: selectedPoint.resolution.validationRequirements ?? undefined,
            }
          : undefined,
        unknowns: selectedPoint.resolution?.uncertainty ?? undefined,
        validityConditions:
          selectedPoint.validityConditions.length > 0
            ? selectedPoint.validityConditions
            : undefined,
        createdAt: selectedPoint.createdAt,
        updatedAt: selectedPoint.updatedAt,
      }
    : null;

  const panelEvents = pointEvents.map((e) => ({
    id: e.id,
    type: e.eventType,
    timestamp: e.timestamp,
    actor: { id: e.actorId, type: e.actorType },
    previousStatus: e.metadata?.['previousStatus'] as string | undefined,
    newStatus: e.metadata?.['newStatus'] as string | undefined,
  }));

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className={styles['container']}>
      <div className={styles['header']}>
        <h2 className={styles['title']}>Project: {projectId}</h2>
        <div className={styles['headerActions']}>
          <button
            type="button"
            className={styles['createButton']}
            onClick={handleCreateDemo}
            disabled={creating || loading}
          >
            {creating ? 'Creating...' : 'Create Demo Judgment Point'}
          </button>
          <a
            className={styles['policiesLink']}
            href={`#/policies/${encodeURIComponent(projectId)}`}
            onClick={(e) => {
              e.preventDefault();
              onNavigate(`#/policies/${encodeURIComponent(projectId)}`);
            }}
          >
            Manage Policies
          </a>
        </div>
      </div>

      {error && (
        <div className={styles['errorMessage']}>
          {error}
          <br />
          <button type="button" className={styles['retryButton']} onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      )}

      {loading && points.length === 0 && (
        <div className={styles['loadingMessage']}>Loading judgment points...</div>
      )}

      <ProjectJudgmentsView
        judgmentPoints={points.map((p) => ({
          id: p.id,
          status: p.status,
          category: p.category,
          question: p.question,
          materiality: {
            score: p.materiality.score,
            interventionLevel: p.materiality.interventionLevel ?? undefined,
          },
          authority: { mode: p.authority.mode },
          resolution: p.resolution
            ? {
                selectedAlternativeId: p.resolution.selectedAlternativeId,
                rationale: p.resolution.rationale,
              }
            : undefined,
          updatedAt: p.updatedAt,
        }))}
        filters={{
          status: filters.status.length > 0 ? filters.status : undefined,
          category: filters.category.length > 0 ? filters.category : undefined,
          interventionLevel:
            filters.interventionLevel.length > 0 ? filters.interventionLevel : undefined,
        }}
        onFiltersChange={handleFiltersChange}
        sortBy={state.sortBy === 'score' ? 'materiality' : state.sortBy}
        sortOrder={state.sortOrder}
        onSortChange={handleSortChange}
        totalCount={total}
        page={page + 1}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onSelect={handleSelectPoint}
        onAction={handleCardAction}
      />

      {/* Slide-out panel */}
      {panelData && (
        <div className={styles['panelOverlay']}>
          <JudgmentPanel
            judgmentPoint={panelData}
            events={panelEvents}
            onClose={handleClosePanel}
            onAction={handlePanelAction}
          />
        </div>
      )}

      {/* Resolution form overlay */}
      {dialogMode === 'resolve' && selectedPoint && (
        <div className={styles['inlineForm']}>
          <ResolutionForm
            alternatives={selectedPoint.alternatives.map((a) => ({
              id: a.id,
              label: a.label,
              description: a.description,
            }))}
            onSubmit={handleResolutionSubmit}
            onCancel={() => setDialogMode('none')}
          />
        </div>
      )}

      {/* Reopen dialog */}
      {dialogMode === 'reopen' && selectedPoint && (
        <ReopenDialog
          pointId={selectedPoint.id}
          question={selectedPoint.question}
          onConfirm={handleReopenSubmit}
          onCancel={() => setDialogMode('none')}
        />
      )}

      {/* Delegation dialog */}
      {dialogMode === 'delegate' && selectedPoint && (
        <DelegationDialog
          pointId={selectedPoint.id}
          question={selectedPoint.question}
          onConfirm={handleDelegateSubmit}
          onCancel={() => setDialogMode('none')}
        />
      )}
    </div>
  );
};

// Re-export AppState type for internal use
type AppState = import('../state/reducer').AppState;
