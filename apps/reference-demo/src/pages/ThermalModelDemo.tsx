import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import styles from './ThermalModelDemo.module.css';

import {
  JudgmentCard,
  MaterialityGauge,
  StaleIndicator,
  DependencyGraph,
  ComparisonView,
  ResolutionForm,
} from '@human-machine-judgment/ui';
import type { GraphNode, GraphEdge } from '@human-machine-judgment/ui';

import { JudgmentApiClient } from '../api/client';
import type { JudgmentPointResponse } from '../api/types';

import {
  ALUMINUM_6061_T6,
  DEFAULT_HEAT_SINK,
  DEFAULT_CONDITIONS,
  solveScreeningLevel,
  solveDetailedROTM,
  compareConfigurations,
  createThermalModelJudgmentPoints,
  THERMAL_MODEL_DEPENDENCIES,
  JP_FIDELITY_ID,
  JP_MATERIAL_PROPS_ID,
  JP_MODELING_METHOD_ID,
  JP_VALIDATION_ID,
  JP_LABELS,
} from '../thermal-model';
import type { ThermalResult, ComparisonResult } from '../thermal-model';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  { id: 'intro', label: 'Introduction' },
  { id: 'jp1', label: 'JP1: Fidelity' },
  { id: 'jp2', label: 'JP2: Materials' },
  { id: 'jp3', label: 'JP3: Method' },
  { id: 'jp4', label: 'JP4: Validation' },
  { id: 'results', label: 'Final Results' },
  { id: 'graph', label: 'Dependency Graph' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

const _JP_INDEX_MAP: Record<string, number> = {
  [JP_FIDELITY_ID]: 0,
  [JP_MATERIAL_PROPS_ID]: 1,
  [JP_MODELING_METHOD_ID]: 2,
  [JP_VALIDATION_ID]: 3,
};

const JP_IDS = [JP_FIDELITY_ID, JP_MATERIAL_PROPS_ID, JP_MODELING_METHOD_ID, JP_VALIDATION_ID];

const ACTOR = { id: 'demo-engineer', type: 'user' as const };

// ---------------------------------------------------------------------------
// Demo state
// ---------------------------------------------------------------------------

interface DemoState {
  projectId: string;
  currentStep: StepId;
  completedSteps: Set<StepId>;
  jpResponses: Record<string, JudgmentPointResponse>;
  jpStatuses: Record<string, string>;
  screeningResult: ThermalResult | null;
  detailedResult: ThermalResult | null;
  comparisonResult: ComparisonResult | null;
  error: string | null;
  loading: boolean;
  staleJPs: Set<string>;
}

function createInitialState(): DemoState {
  return {
    projectId: `thermal-demo-${Date.now()}`,
    currentStep: 'intro',
    completedSteps: new Set<StepId>(),
    jpResponses: {},
    jpStatuses: {},
    screeningResult: null,
    detailedResult: null,
    comparisonResult: null,
    error: null,
    loading: false,
    staleJPs: new Set<string>(),
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ThermalModelDemo: React.FC = () => {
  const [state, setState] = useState<DemoState>(createInitialState);
  const clientRef = useRef(new JudgmentApiClient());
  const client = clientRef.current;

  // Pre-compute judgment point requests
  const jpRequests = useMemo(
    () => createThermalModelJudgmentPoints(state.projectId),
    [state.projectId],
  );

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const goToStep = useCallback((step: StepId) => {
    setState((prev) => ({ ...prev, currentStep: step, error: null }));
  }, []);

  const markStepCompleted = useCallback((step: StepId) => {
    setState((prev) => {
      const newCompleted = new Set(prev.completedSteps);
      newCompleted.add(step);
      return { ...prev, completedSteps: newCompleted };
    });
  }, []);

  const handleReset = useCallback(() => {
    setState(createInitialState());
  }, []);

  // -------------------------------------------------------------------------
  // API interactions
  // -------------------------------------------------------------------------

  const createJP = useCallback(
    async (jpIndex: number): Promise<JudgmentPointResponse | null> => {
      const request = jpRequests[jpIndex];
      if (!request) return null;
      setLoading(true);
      setError(null);
      try {
        const response = await client.createCandidate(state.projectId, request);
        const jpId = JP_IDS[jpIndex];
        if (jpId) {
          setState((prev) => ({
            ...prev,
            jpResponses: { ...prev.jpResponses, [jpId]: response },
            jpStatuses: { ...prev.jpStatuses, [jpId]: response.status },
          }));
        }
        return response;
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [client, jpRequests, state.projectId, setError, setLoading],
  );

  const promoteJP = useCallback(
    async (jpId: string) => {
      const jp = state.jpResponses[jpId];
      if (!jp) return;
      setLoading(true);
      setError(null);
      try {
        const response = await client.promote(state.projectId, jp.id, {
          actor: ACTOR,
        });
        setState((prev) => ({
          ...prev,
          jpResponses: { ...prev.jpResponses, [jpId]: response },
          jpStatuses: { ...prev.jpStatuses, [jpId]: response.status },
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [client, state.projectId, state.jpResponses, setError, setLoading],
  );

  const investigateJP = useCallback(
    async (jpId: string) => {
      const jp = state.jpResponses[jpId];
      if (!jp) return;
      setLoading(true);
      setError(null);
      try {
        const response = await client.investigate(state.projectId, jp.id, {
          actor: ACTOR,
        });
        setState((prev) => ({
          ...prev,
          jpResponses: { ...prev.jpResponses, [jpId]: response },
          jpStatuses: { ...prev.jpStatuses, [jpId]: response.status },
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [client, state.projectId, state.jpResponses, setError, setLoading],
  );

  const resolveJP = useCallback(
    async (
      jpId: string,
      selectedAlternativeId: string,
      rationale: string,
      conditions?: string[],
      validationRequirements?: string[],
    ) => {
      const jp = state.jpResponses[jpId];
      if (!jp) return;
      setLoading(true);
      setError(null);
      try {
        const response = await client.resolve(state.projectId, jp.id, {
          actor: ACTOR,
          resolution: {
            selectedAlternativeId,
            rationale,
            resolvedAt: new Date().toISOString(),
            conditions,
            validationRequirements,
          },
        });
        setState((prev) => ({
          ...prev,
          jpResponses: { ...prev.jpResponses, [jpId]: response },
          jpStatuses: { ...prev.jpStatuses, [jpId]: response.status },
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [client, state.projectId, state.jpResponses, setError, setLoading],
  );

  const markStaleJPs = useCallback(async () => {
    const reason = 'Power increased from 50W to 65W';
    setLoading(true);
    setError(null);
    try {
      for (const jpId of [JP_MODELING_METHOD_ID, JP_VALIDATION_ID]) {
        const jp = state.jpResponses[jpId];
        if (jp) {
          const response = await client.markStale(state.projectId, jp.id, {
            actor: ACTOR,
            reason,
          });
          setState((prev) => {
            const newStale = new Set(prev.staleJPs);
            newStale.add(jpId);
            return {
              ...prev,
              jpResponses: { ...prev.jpResponses, [jpId]: response },
              jpStatuses: { ...prev.jpStatuses, [jpId]: response.status },
              staleJPs: newStale,
            };
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [client, state.projectId, state.jpResponses, setError, setLoading]);

  // -------------------------------------------------------------------------
  // Run thermal calculations
  // -------------------------------------------------------------------------

  const runScreeningAnalysis = useCallback(() => {
    const result = solveScreeningLevel();
    setState((prev) => ({ ...prev, screeningResult: result }));
  }, []);

  const runDetailedAnalysis = useCallback((useTempDep: boolean) => {
    const result = solveDetailedROTM(DEFAULT_CONDITIONS, useTempDep);
    setState((prev) => ({ ...prev, detailedResult: result }));
  }, []);

  const runComparison = useCallback(() => {
    const result = compareConfigurations();
    setState((prev) => ({ ...prev, comparisonResult: result }));
  }, []);

  // -------------------------------------------------------------------------
  // Auto-create JP when step becomes active
  // -------------------------------------------------------------------------

  useEffect(() => {
    const stepToJpIndex: Partial<Record<StepId, number>> = {
      jp1: 0,
      jp2: 1,
      jp3: 2,
      jp4: 3,
    };
    const jpIndex = stepToJpIndex[state.currentStep];
    if (jpIndex === undefined) return;

    const jpId = JP_IDS[jpIndex];
    if (!jpId) return;

    // Only create if not already created
    if (!state.jpResponses[jpId]) {
      void createJP(jpIndex);
    }
  }, [state.currentStep, state.jpResponses, createJP]);

  // -------------------------------------------------------------------------
  // Dependency graph data
  // -------------------------------------------------------------------------

  const graphNodes: GraphNode[] = useMemo(() => {
    return JP_IDS.map((jpId) => ({
      id: jpId,
      label: JP_LABELS[jpId] ?? jpId,
      status: state.jpStatuses[jpId] ?? 'candidate',
      isStale: state.staleJPs.has(jpId),
    }));
  }, [state.jpStatuses, state.staleJPs]);

  const graphEdges: GraphEdge[] = THERMAL_MODEL_DEPENDENCIES;

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function renderResultCard(title: string, result: ThermalResult | null, limitC?: number) {
    if (!result) return null;
    const limit = limitC ?? DEFAULT_CONDITIONS.junctionLimitC;
    const margin = limit - result.junctionTemperature;
    const isGood = margin > 0;

    return (
      <div className={styles['resultsCard']}>
        <h4>{title}</h4>
        <div className={styles['resultRow']}>
          <span className={styles['resultLabel']}>Junction Temperature</span>
          <span className={isGood ? styles['resultValueGood'] : styles['resultValueBad']}>
            {result.junctionTemperature.toFixed(1)} deg C
          </span>
        </div>
        <div className={styles['resultRow']}>
          <span className={styles['resultLabel']}>Overall Resistance</span>
          <span className={styles['resultValue']}>{result.overallResistance.toFixed(3)} K/W</span>
        </div>
        <div className={styles['resultRow']}>
          <span className={styles['resultLabel']}>Fin Efficiency</span>
          <span className={styles['resultValue']}>{(result.finEfficiency * 100).toFixed(1)}%</span>
        </div>
        <div className={styles['resultRow']}>
          <span className={styles['resultLabel']}>Margin to Limit ({limit} deg C)</span>
          <span className={isGood ? styles['resultValueGood'] : styles['resultValueBad']}>
            {margin.toFixed(1)} deg C
          </span>
        </div>
        <div className={styles['resultRow']}>
          <span className={styles['resultLabel']}>Adequate?</span>
          <span className={isGood ? styles['resultValueGood'] : styles['resultValueBad']}>
            {isGood ? 'Yes' : 'No'}
          </span>
        </div>
        <div style={{ marginTop: 8 }}>
          <strong style={{ fontSize: '0.85rem', color: '#495057' }}>Node Temperatures:</strong>
          <table className={styles['dataTable']} style={{ marginTop: 4 }}>
            <thead>
              <tr>
                <th>Node</th>
                <th>Description</th>
                <th>Temperature</th>
              </tr>
            </thead>
            <tbody>
              {['Junction (processor)', 'Base center', 'Fin root', 'Fin mid-height', 'Fin tip'].map(
                (desc, i) => {
                  const temp = result.nodeTemperatures[i];
                  return (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{desc}</td>
                      <td>{temp !== undefined ? temp.toFixed(1) : '--'} deg C</td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderJPStatus(jpId: string) {
    const status = state.jpStatuses[jpId] ?? 'not created';
    const statusClass =
      status === 'resolved'
        ? styles['statusResolved']
        : status === 'investigating'
          ? styles['statusInvestigating']
          : status === 'pending'
            ? styles['statusPending']
            : status === 'stale'
              ? styles['statusStale']
              : styles['statusCandidate'];
    return (
      <div className={`${styles['statusBar']} ${statusClass ?? ''}`}>
        Status: <strong>{status}</strong>
      </div>
    );
  }

  function renderLifecycleButtons(jpId: string) {
    const status = state.jpStatuses[jpId];
    return (
      <div className={styles['lifecycleActions']}>
        {status === 'candidate' && (
          <button
            type="button"
            className={styles['btnPrimary']}
            onClick={() => void promoteJP(jpId)}
            disabled={state.loading}
          >
            Promote to Pending
          </button>
        )}
        {status === 'pending' && (
          <button
            type="button"
            className={styles['btnPrimary']}
            onClick={() => void investigateJP(jpId)}
            disabled={state.loading}
          >
            Begin Investigation
          </button>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Step renderers
  // -------------------------------------------------------------------------

  function renderIntroStep() {
    return (
      <div className={styles['stepContent']}>
        <h3 className={styles['stepTitle']}>Scenario: Thermal Analysis of an Aluminum Heat Sink</h3>
        <p className={styles['stepDescription']}>
          An engineer is analyzing the thermal performance of an aluminum heat sink used in an
          electronic enclosure. The heat sink dissipates 50 W of thermal power from a processor
          module. The analysis must determine whether the heat sink maintains the processor junction
          temperature below the manufacturer&#39;s rated maximum of 105 deg C under steady-state
          operating conditions.
        </p>
        <p className={styles['stepDescription']}>
          During this analysis, four consequential choices arise -- each represented as a{' '}
          <strong>Judgment Point</strong>. This demo walks through detection, materiality
          assessment, structured alternatives, resolution, and dependency propagation.
        </p>

        <div className={styles['propertyGrid']}>
          <div className={styles['propertyCard']}>
            <h5>Heat Sink Geometry</h5>
            <table className={styles['dataTable']}>
              <tbody>
                <tr>
                  <td>Base dimensions</td>
                  <td>
                    {DEFAULT_HEAT_SINK.baseWidth * 1000} x {DEFAULT_HEAT_SINK.baseLength * 1000} mm
                  </td>
                </tr>
                <tr>
                  <td>Base thickness</td>
                  <td>{DEFAULT_HEAT_SINK.baseThickness * 1000} mm</td>
                </tr>
                <tr>
                  <td>Fin height</td>
                  <td>{DEFAULT_HEAT_SINK.finHeight * 1000} mm</td>
                </tr>
                <tr>
                  <td>Fin thickness</td>
                  <td>{DEFAULT_HEAT_SINK.finThickness * 1000} mm</td>
                </tr>
                <tr>
                  <td>Fin count</td>
                  <td>{DEFAULT_HEAT_SINK.finCount}</td>
                </tr>
                <tr>
                  <td>Fin spacing</td>
                  <td>{(DEFAULT_HEAT_SINK.finSpacing * 1000).toFixed(2)} mm</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles['propertyCard']}>
            <h5>Operating Conditions</h5>
            <table className={styles['dataTable']}>
              <tbody>
                <tr>
                  <td>Ambient temperature</td>
                  <td>{DEFAULT_CONDITIONS.ambientTempC} deg C</td>
                </tr>
                <tr>
                  <td>Processor power</td>
                  <td>{DEFAULT_CONDITIONS.powerW} W</td>
                </tr>
                <tr>
                  <td>Junction limit</td>
                  <td>{DEFAULT_CONDITIONS.junctionLimitC} deg C</td>
                </tr>
                <tr>
                  <td>Material</td>
                  <td>{ALUMINUM_6061_T6.name}</td>
                </tr>
                <tr>
                  <td>k at 25 deg C</td>
                  <td>{ALUMINUM_6061_T6.thermalConductivity.constant25C} W/m-K</td>
                </tr>
                <tr>
                  <td>k at mean temp</td>
                  <td>{ALUMINUM_6061_T6.thermalConductivity.constantMean} W/m-K</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles['lifecycleActions']}>
          <button
            type="button"
            className={styles['btnPrimary']}
            onClick={() => {
              markStepCompleted('intro');
              goToStep('jp1');
            }}
          >
            Begin Analysis -- Proceed to JP1
          </button>
        </div>
      </div>
    );
  }

  function renderJP1Step() {
    const jpId = JP_FIDELITY_ID;
    const jp = state.jpResponses[jpId];
    const request = jpRequests[0];
    const isResolved = state.jpStatuses[jpId] === 'resolved';

    return (
      <div className={styles['stepContent']}>
        <h3 className={styles['stepTitle']}>Judgment Point 1: Intended Use and Fidelity Level</h3>

        <div className={styles['jpSection']}>
          <div className={styles['jpSectionHeader']}>
            <span className={`${styles['jpBadge']} ${styles['jpBadgeFraming']}`}>framing</span>
            <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>
              Hard trigger: objective-redefinition
            </span>
          </div>

          <p className={styles['jpQuestion']}>{request?.question ?? 'Loading...'}</p>
          <p className={styles['jpContext']}>{request?.context ?? ''}</p>

          {request?.materiality && (
            <MaterialityGauge
              score={request.materiality.score}
              dimensions={request.materiality.dimensions}
              interventionLevel={request.materiality.interventionLevel ?? undefined}
              hardTrigger={request.materiality.hardTrigger ?? undefined}
            />
          )}

          {jp && (
            <>
              {renderJPStatus(jpId)}
              {renderLifecycleButtons(jpId)}

              {jp.status === 'investigating' && jp.alternatives.length > 0 && (
                <ResolutionForm
                  alternatives={jp.alternatives}
                  onSubmit={(data) => {
                    void resolveJP(
                      jpId,
                      data.selectedAlternativeId,
                      data.rationale,
                      data.conditions,
                      data.validationRequirements,
                    );
                  }}
                  onCancel={() => {
                    /* no-op for demo */
                  }}
                />
              )}

              {jp.status === 'investigating' && (
                <ComparisonView
                  alternatives={jp.alternatives.map((a) => ({
                    id: a.id,
                    label: a.label,
                    description: a.description,
                    tradeoffs: a.tradeoffs ?? undefined,
                  }))}
                />
              )}
            </>
          )}

          {jp && (
            <JudgmentCard
              judgmentPoint={{
                id: jp.id,
                status: jp.status,
                category: jp.category,
                question: jp.question,
                materiality: {
                  score: jp.materiality.score,
                  interventionLevel: jp.materiality.interventionLevel ?? undefined,
                },
                authority: { mode: jp.authority.mode },
                resolution: jp.resolution
                  ? {
                      selectedAlternativeId: jp.resolution.selectedAlternativeId,
                      rationale: jp.resolution.rationale,
                    }
                  : undefined,
                updatedAt: jp.updatedAt,
              }}
            />
          )}
        </div>

        {isResolved && (
          <div className={styles['lifecycleActions']}>
            <button
              type="button"
              className={styles['btnPrimary']}
              onClick={() => {
                markStepCompleted('jp1');
                goToStep('jp2');
              }}
            >
              Continue to JP2: Material Properties
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderJP2Step() {
    const jpId = JP_MATERIAL_PROPS_ID;
    const jp = state.jpResponses[jpId];
    const request = jpRequests[1];
    const isResolved = state.jpStatuses[jpId] === 'resolved';

    return (
      <div className={styles['stepContent']}>
        <h3 className={styles['stepTitle']}>
          Judgment Point 2: Constant vs. Temperature-Dependent Material Properties
        </h3>

        <div className={styles['propertyCard']} style={{ marginBottom: 16 }}>
          <h5>Thermal Conductivity Data (6061-T6 Aluminum)</h5>
          <table className={styles['dataTable']}>
            <thead>
              <tr>
                <th>Temperature (deg C)</th>
                <th>k (W/m-K)</th>
              </tr>
            </thead>
            <tbody>
              {ALUMINUM_6061_T6.thermalConductivity.temperatureDependent.map((pt) => (
                <tr key={pt.tempC}>
                  <td>{pt.tempC}</td>
                  <td>{pt.kWmK}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: '0.85rem', color: '#6c757d', margin: '8px 0 0' }}>
            Variation over 25-100 deg C range: ~{(((175 - 167) / 167) * 100).toFixed(1)}%
          </p>
        </div>

        <div className={styles['jpSection']}>
          <div className={styles['jpSectionHeader']}>
            <span className={`${styles['jpBadge']} ${styles['jpBadgeAssumption']}`}>
              assumption
            </span>
            <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>
              Materiality score: {request?.materiality.score ?? '--'}
            </span>
          </div>

          <p className={styles['jpQuestion']}>{request?.question ?? 'Loading...'}</p>
          <p className={styles['jpContext']}>{request?.context ?? ''}</p>

          {request?.materiality && (
            <MaterialityGauge
              score={request.materiality.score}
              dimensions={request.materiality.dimensions}
              interventionLevel={request.materiality.interventionLevel ?? undefined}
            />
          )}

          {jp && (
            <>
              {renderJPStatus(jpId)}
              {renderLifecycleButtons(jpId)}

              {jp.status === 'investigating' && jp.alternatives.length > 0 && (
                <>
                  <div style={{ margin: '12px 0' }}>
                    <button
                      type="button"
                      className={styles['btnSecondary']}
                      onClick={runComparison}
                      disabled={state.loading}
                    >
                      Run Property Comparison
                    </button>
                  </div>

                  {state.comparisonResult && (
                    <div className={styles['comparisonGrid']}>
                      <div className={styles['comparisonCard']}>
                        <h5>A: Constant at 25 deg C</h5>
                        <div className={styles['resultRow']}>
                          <span className={styles['resultLabel']}>k</span>
                          <span className={styles['resultValue']}>
                            {ALUMINUM_6061_T6.thermalConductivity.constant25C} W/m-K
                          </span>
                        </div>
                        <div className={styles['resultRow']}>
                          <span className={styles['resultLabel']}>T_junction</span>
                          <span className={styles['resultValue']}>
                            {state.comparisonResult.constant25C.junctionTemperature.toFixed(1)} deg
                            C
                          </span>
                        </div>
                      </div>
                      <div className={styles['comparisonCard']}>
                        <h5>B: Constant at Mean Temp</h5>
                        <div className={styles['resultRow']}>
                          <span className={styles['resultLabel']}>k</span>
                          <span className={styles['resultValue']}>
                            {ALUMINUM_6061_T6.thermalConductivity.constantMean} W/m-K
                          </span>
                        </div>
                        <div className={styles['resultRow']}>
                          <span className={styles['resultLabel']}>T_junction</span>
                          <span className={styles['resultValue']}>
                            {state.comparisonResult.constantMean.junctionTemperature.toFixed(1)} deg
                            C
                          </span>
                        </div>
                      </div>
                      <div className={styles['comparisonCard']}>
                        <h5>C: Temperature-Dependent</h5>
                        <div className={styles['resultRow']}>
                          <span className={styles['resultLabel']}>k</span>
                          <span className={styles['resultValue']}>f(T)</span>
                        </div>
                        <div className={styles['resultRow']}>
                          <span className={styles['resultLabel']}>T_junction</span>
                          <span className={styles['resultValue']}>
                            {state.comparisonResult.temperatureDependent.junctionTemperature.toFixed(
                              1,
                            )}{' '}
                            deg C
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {state.comparisonResult && (
                    <div className={styles['resultsCard']}>
                      <h4>Comparison Summary</h4>
                      <div className={styles['resultRow']}>
                        <span className={styles['resultLabel']}>Delta T (25 deg C vs Mean)</span>
                        <span className={styles['resultValue']}>
                          {state.comparisonResult.junctionTempDifference25CvsMean.toFixed(2)} deg C
                        </span>
                      </div>
                      <div className={styles['resultRow']}>
                        <span className={styles['resultLabel']}>
                          Delta T (25 deg C vs Temp-Dep)
                        </span>
                        <span className={styles['resultValue']}>
                          {state.comparisonResult.junctionTempDifference25CvsDependent.toFixed(2)}{' '}
                          deg C
                        </span>
                      </div>
                    </div>
                  )}

                  <ResolutionForm
                    alternatives={jp.alternatives.map((a) => ({
                      id: a.id,
                      label: a.label,
                      description: a.description,
                    }))}
                    onSubmit={(data) => {
                      void resolveJP(
                        jpId,
                        data.selectedAlternativeId,
                        data.rationale,
                        data.conditions,
                        data.validationRequirements,
                      );
                    }}
                    onCancel={() => {
                      /* no-op for demo */
                    }}
                  />
                </>
              )}
            </>
          )}
        </div>

        {isResolved && (
          <div className={styles['lifecycleActions']}>
            <button
              type="button"
              className={styles['btnPrimary']}
              onClick={() => {
                markStepCompleted('jp2');
                goToStep('jp3');
              }}
            >
              Continue to JP3: Modeling Method
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderJP3Step() {
    const jpId = JP_MODELING_METHOD_ID;
    const jp = state.jpResponses[jpId];
    const request = jpRequests[2];
    const isResolved = state.jpStatuses[jpId] === 'resolved';
    const isStale = state.staleJPs.has(jpId);

    return (
      <div className={styles['stepContent']}>
        <h3 className={styles['stepTitle']}>
          Judgment Point 3: 5-Node ROTM vs. Higher-Fidelity Method
        </h3>

        {isStale && <StaleIndicator reason="Power increased from 50W to 65W" />}

        <div className={styles['jpSection']}>
          <div className={styles['jpSectionHeader']}>
            <span className={`${styles['jpBadge']} ${styles['jpBadgeMethod']}`}>method</span>
            <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>
              Hard trigger: model-substitution | Score: {request?.materiality.score ?? '--'}
            </span>
          </div>

          <p className={styles['jpQuestion']}>{request?.question ?? 'Loading...'}</p>
          <p className={styles['jpContext']}>{request?.context ?? ''}</p>

          {request?.materiality && (
            <MaterialityGauge
              score={request.materiality.score}
              dimensions={request.materiality.dimensions}
              interventionLevel={request.materiality.interventionLevel ?? undefined}
              hardTrigger={request.materiality.hardTrigger ?? undefined}
            />
          )}

          {jp && (
            <>
              {renderJPStatus(jpId)}
              {renderLifecycleButtons(jpId)}

              {jp.status === 'investigating' && (
                <>
                  <div style={{ margin: '12px 0', display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className={styles['btnSecondary']}
                      onClick={runScreeningAnalysis}
                      disabled={state.loading}
                    >
                      Run 5-Node ROTM
                    </button>
                    <button
                      type="button"
                      className={styles['btnSecondary']}
                      onClick={() => runDetailedAnalysis(false)}
                      disabled={state.loading}
                    >
                      Run Detailed ROTM
                    </button>
                  </div>

                  {state.screeningResult &&
                    renderResultCard('5-Node ROTM Results', state.screeningResult)}
                  {state.detailedResult &&
                    renderResultCard('Detailed ROTM Results', state.detailedResult)}

                  <ComparisonView
                    alternatives={jp.alternatives.map((a) => ({
                      id: a.id,
                      label: a.label,
                      description: a.description,
                      tradeoffs: a.tradeoffs ?? undefined,
                    }))}
                    comparisonData={{
                      'Estimated R_total (K/W)': {
                        'jp3-alt-a': '~1.2',
                        'jp3-alt-b': '~1.25',
                        'jp3-alt-c': '~1.23',
                      },
                      'Estimated Delta T (K)': {
                        'jp3-alt-a': '~60',
                        'jp3-alt-b': '~62.5',
                        'jp3-alt-c': '~61.5',
                      },
                      'Computation Time': {
                        'jp3-alt-a': '< 1 second',
                        'jp3-alt-b': '< 5 seconds',
                        'jp3-alt-c': '~10 minutes',
                      },
                    }}
                  />

                  <ResolutionForm
                    alternatives={jp.alternatives.map((a) => ({
                      id: a.id,
                      label: a.label,
                      description: a.description,
                    }))}
                    onSubmit={(data) => {
                      void resolveJP(
                        jpId,
                        data.selectedAlternativeId,
                        data.rationale,
                        data.conditions,
                        data.validationRequirements,
                      );
                    }}
                    onCancel={() => {
                      /* no-op for demo */
                    }}
                  />
                </>
              )}
            </>
          )}
        </div>

        {isResolved && (
          <div className={styles['lifecycleActions']}>
            <button
              type="button"
              className={styles['btnPrimary']}
              onClick={() => {
                markStepCompleted('jp3');
                goToStep('jp4');
              }}
            >
              Continue to JP4: Validation Criterion
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderJP4Step() {
    const jpId = JP_VALIDATION_ID;
    const jp = state.jpResponses[jpId];
    const request = jpRequests[3];
    const isResolved = state.jpStatuses[jpId] === 'resolved';
    const isStale = state.staleJPs.has(jpId);

    return (
      <div className={styles['stepContent']}>
        <h3 className={styles['stepTitle']}>
          Judgment Point 4: Validation and Acceptance Criterion
        </h3>

        {isStale && <StaleIndicator reason="Power increased from 50W to 65W" />}

        <div className={styles['jpSection']}>
          <div className={styles['jpSectionHeader']}>
            <span className={`${styles['jpBadge']} ${styles['jpBadgeValidation']}`}>
              validation
            </span>
            <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>
              Hard trigger: validation-criterion-selection | Score:{' '}
              {request?.materiality.score ?? '--'}
            </span>
          </div>

          <p className={styles['jpQuestion']}>{request?.question ?? 'Loading...'}</p>
          <p className={styles['jpContext']}>{request?.context ?? ''}</p>

          {request?.materiality && (
            <MaterialityGauge
              score={request.materiality.score}
              dimensions={request.materiality.dimensions}
              interventionLevel={request.materiality.interventionLevel ?? undefined}
              hardTrigger={request.materiality.hardTrigger ?? undefined}
            />
          )}

          {jp && (
            <>
              {renderJPStatus(jpId)}
              {renderLifecycleButtons(jpId)}

              {jp.status === 'investigating' && (
                <>
                  <ComparisonView
                    alternatives={jp.alternatives.map((a) => ({
                      id: a.id,
                      label: a.label,
                      description: a.description,
                      tradeoffs: a.tradeoffs ?? undefined,
                    }))}
                    comparisonData={{
                      'Temperature Limit': {
                        'jp4-alt-a': '105 deg C',
                        'jp4-alt-b': '95 deg C',
                        'jp4-alt-c': '100 deg C',
                      },
                      'Safety Margin': {
                        'jp4-alt-a': '0 deg C',
                        'jp4-alt-b': '10 deg C',
                        'jp4-alt-c': '5 deg C + sensitivity',
                      },
                      'Additional Work': {
                        'jp4-alt-a': 'None',
                        'jp4-alt-b': 'None',
                        'jp4-alt-c': 'Sensitivity analysis',
                      },
                    }}
                  />

                  <ResolutionForm
                    alternatives={jp.alternatives.map((a) => ({
                      id: a.id,
                      label: a.label,
                      description: a.description,
                    }))}
                    onSubmit={(data) => {
                      void resolveJP(
                        jpId,
                        data.selectedAlternativeId,
                        data.rationale,
                        data.conditions,
                        data.validationRequirements,
                      );
                    }}
                    onCancel={() => {
                      /* no-op for demo */
                    }}
                  />
                </>
              )}
            </>
          )}
        </div>

        {isResolved && (
          <div className={styles['lifecycleActions']}>
            <button
              type="button"
              className={styles['btnPrimary']}
              onClick={() => {
                markStepCompleted('jp4');
                runComparison();
                runScreeningAnalysis();
                runDetailedAnalysis(true);
                goToStep('results');
              }}
            >
              View Final Results
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderResultsStep() {
    return (
      <div className={styles['stepContent']}>
        <h3 className={styles['stepTitle']}>Final Thermal Analysis Results</h3>
        <p className={styles['stepDescription']}>
          All four judgment points have been resolved. Below are the complete thermal analysis
          results using the selected parameters.
        </p>

        {state.screeningResult &&
          renderResultCard(
            'Screening-Level Result (Constant k at 25 deg C)',
            state.screeningResult,
          )}

        {state.detailedResult &&
          renderResultCard('Detailed ROTM Result (Temperature-Dependent k)', state.detailedResult)}

        {state.comparisonResult && (
          <>
            <h4 style={{ margin: '24px 0 12px' }}>Property Treatment Comparison</h4>
            <div className={styles['comparisonGrid']}>
              <div className={styles['comparisonCard']}>
                <h5>Constant at 25 deg C</h5>
                <div className={styles['resultRow']}>
                  <span className={styles['resultLabel']}>T_junction</span>
                  <span className={styles['resultValue']}>
                    {state.comparisonResult.constant25C.junctionTemperature.toFixed(1)} deg C
                  </span>
                </div>
                <div className={styles['resultRow']}>
                  <span className={styles['resultLabel']}>R_total</span>
                  <span className={styles['resultValue']}>
                    {state.comparisonResult.constant25C.overallResistance.toFixed(3)} K/W
                  </span>
                </div>
              </div>
              <div className={`${styles['comparisonCard']} ${styles['comparisonCardSelected']}`}>
                <h5>Constant at Mean Temp (selected)</h5>
                <div className={styles['resultRow']}>
                  <span className={styles['resultLabel']}>T_junction</span>
                  <span className={styles['resultValue']}>
                    {state.comparisonResult.constantMean.junctionTemperature.toFixed(1)} deg C
                  </span>
                </div>
                <div className={styles['resultRow']}>
                  <span className={styles['resultLabel']}>R_total</span>
                  <span className={styles['resultValue']}>
                    {state.comparisonResult.constantMean.overallResistance.toFixed(3)} K/W
                  </span>
                </div>
              </div>
              <div className={styles['comparisonCard']}>
                <h5>Temperature-Dependent</h5>
                <div className={styles['resultRow']}>
                  <span className={styles['resultLabel']}>T_junction</span>
                  <span className={styles['resultValue']}>
                    {state.comparisonResult.temperatureDependent.junctionTemperature.toFixed(1)} deg
                    C
                  </span>
                </div>
                <div className={styles['resultRow']}>
                  <span className={styles['resultLabel']}>R_total</span>
                  <span className={styles['resultValue']}>
                    {state.comparisonResult.temperatureDependent.overallResistance.toFixed(3)} K/W
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        <h4 style={{ margin: '24px 0 12px' }}>Resolved Judgment Points Summary</h4>
        <table className={styles['dataTable']}>
          <thead>
            <tr>
              <th>JP</th>
              <th>Category</th>
              <th>Score</th>
              <th>Status</th>
              <th>Selected Alternative</th>
            </tr>
          </thead>
          <tbody>
            {JP_IDS.map((jpId, index) => {
              const jp = state.jpResponses[jpId];
              const selectedAlt = jp?.alternatives.find(
                (a) => a.id === jp?.resolution?.selectedAlternativeId,
              );
              return (
                <tr key={jpId}>
                  <td>{index + 1}</td>
                  <td>{jp?.category ?? '--'}</td>
                  <td>{jp?.materiality.score ?? '--'}</td>
                  <td>{state.jpStatuses[jpId] ?? '--'}</td>
                  <td>{selectedAlt?.label ?? '--'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className={styles['lifecycleActions']}>
          <button
            type="button"
            className={styles['btnPrimary']}
            onClick={() => {
              markStepCompleted('results');
              goToStep('graph');
            }}
          >
            View Dependency Graph
          </button>
          <button
            type="button"
            className={styles['btnDanger']}
            onClick={() => void markStaleJPs()}
            disabled={state.loading || state.staleJPs.size > 0}
          >
            Simulate Staleness (Power: 50W -&gt; 65W)
          </button>
        </div>
      </div>
    );
  }

  function renderGraphStep() {
    return (
      <div className={styles['stepContent']}>
        <h3 className={styles['stepTitle']}>Dependency Graph</h3>
        <p className={styles['stepDescription']}>
          The four judgment points form a linear dependency chain. JP1 (Fidelity Level) is the root.
          Each downstream judgment point depends on the resolution of the one before it.
        </p>

        <div className={styles['graphSection']}>
          <DependencyGraph
            nodes={graphNodes}
            edges={graphEdges}
            onNodeClick={(id) => {
              const stepMap: Record<string, StepId> = {
                [JP_FIDELITY_ID]: 'jp1',
                [JP_MATERIAL_PROPS_ID]: 'jp2',
                [JP_MODELING_METHOD_ID]: 'jp3',
                [JP_VALIDATION_ID]: 'jp4',
              };
              const step = stepMap[id];
              if (step) goToStep(step);
            }}
          />
        </div>

        {state.staleJPs.size > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4>Stale Judgment Points</h4>
            {Array.from(state.staleJPs).map((jpId) => (
              <StaleIndicator
                key={jpId}
                reason={`${JP_LABELS[jpId] ?? jpId}: Power increased from 50W to 65W`}
              />
            ))}
          </div>
        )}

        <div className={styles['lifecycleActions']} style={{ marginTop: 24 }}>
          <button
            type="button"
            className={styles['btnDanger']}
            onClick={() => void markStaleJPs()}
            disabled={state.loading || state.staleJPs.size > 0}
          >
            Simulate Staleness (Power: 50W -&gt; 65W)
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  const stepRenderers: Record<StepId, () => React.ReactNode> = {
    intro: renderIntroStep,
    jp1: renderJP1Step,
    jp2: renderJP2Step,
    jp3: renderJP3Step,
    jp4: renderJP4Step,
    results: renderResultsStep,
    graph: renderGraphStep,
  };

  const currentRenderer = stepRenderers[state.currentStep];

  return (
    <div className={styles['container']}>
      <div className={styles['header']}>
        <h2 className={styles['title']}>Thermal Model Analysis Demo</h2>
        <p className={styles['subtitle']}>
          Interactive walkthrough of a reduced-order thermal model analysis for an aluminum heat
          sink, demonstrating detection, materiality assessment, structured alternatives,
          resolution, and dependency propagation using Judgment Points.
        </p>
        <div className={styles['headerActions']}>
          <button type="button" className={styles['btnDanger']} onClick={handleReset}>
            Reset Demo
          </button>
        </div>
      </div>

      {/* Step navigation */}
      <nav className={styles['stepNav']} aria-label="Demo steps">
        {STEPS.map((step) => {
          const isActive = state.currentStep === step.id;
          const isCompleted = state.completedSteps.has(step.id);
          const buttonClasses = [
            styles['stepButton'],
            isActive ? styles['stepButtonActive'] : '',
            !isActive && isCompleted ? styles['stepButtonCompleted'] : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={step.id}
              type="button"
              className={buttonClasses}
              onClick={() => goToStep(step.id)}
              aria-current={isActive ? 'step' : undefined}
            >
              {step.label}
            </button>
          );
        })}
      </nav>

      {/* Error display */}
      {state.error && (
        <div className={styles['error']} role="alert">
          <strong>Error:</strong> {state.error}
        </div>
      )}

      {/* Loading indicator */}
      {state.loading && <div className={styles['loading']}>Processing...</div>}

      {/* Step content */}
      {currentRenderer ? currentRenderer() : null}
    </div>
  );
};
