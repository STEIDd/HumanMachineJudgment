import React, { useState } from 'react';
import {
  StatusBadge,
  CategoryBadge,
  InterventionLevelBadge,
  MaterialityGauge,
  StaleIndicator,
  AlternativeCard,
  ComparisonView,
  JudgmentCard,
  JudgmentTimeline,
  ActivityFeed,
  DependencyGraph,
  ResolutionForm,
  DelegationDialog,
  ReopenDialog,
  PolicyRuleEditor,
} from '@human-machine-judgment/ui';
import type {
  JudgmentStatus,
  ComparisonAlternative,
  TimelineEvent,
  ActivityItem,
  GraphNode,
  GraphEdge,
  JudgmentCardData,
  PolicyRuleEditorProps,
} from '@human-machine-judgment/ui';

type PolicyRuleData = PolicyRuleEditorProps['rule'];
import styles from './ComponentGallery.module.css';

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const ALL_STATUSES: JudgmentStatus[] = [
  'candidate',
  'pending',
  'investigating',
  'resolved',
  'delegated',
  'stale',
  'reopened',
  'dismissed',
];

const ALL_CATEGORIES = [
  'assumption',
  'method',
  'framing',
  'parameter',
  'boundary',
  'validation',
  'interpretation',
  'scope',
];

const ALL_INTERVENTION_LEVELS = ['trace', 'disclose', 'pause', 'require-investigation'];

const sampleDimensions = {
  methodologicalDiscretion: 2,
  downstreamInfluence: 1,
  uncertainty: 1,
  consequence: 2,
  reversibility: 1,
  accountabilityRequirement: 1,
};

const sampleAlternatives: ComparisonAlternative[] = [
  {
    id: 'alt-1',
    label: 'Constant Properties',
    description: 'Use fixed material properties at room temperature (25C).',
    tradeoffs: 'Simpler model but less accurate at higher temperatures.',
  },
  {
    id: 'alt-2',
    label: 'Temperature-Dependent',
    description: 'Interpolate k(T), Cp(T), and alpha(T) from handbook data.',
    tradeoffs: 'More accurate but requires iterative solver.',
  },
  {
    id: 'alt-3',
    label: 'Piecewise Linear',
    description: 'Use two-segment linear approximation for each property.',
    tradeoffs: 'Balance of accuracy and solver simplicity.',
  },
];

const sampleComparisonData: Record<string, Record<string, string>> = {
  Accuracy: {
    'alt-1': 'Low (5-10% error at 95C)',
    'alt-2': 'High (<1% error)',
    'alt-3': 'Medium (2-3% error)',
  },
  'Solver Complexity': {
    'alt-1': 'Direct solve',
    'alt-2': 'Iterative (Newton-Raphson)',
    'alt-3': 'Iterative (simple)',
  },
  'Data Requirements': {
    'alt-1': 'Single data point',
    'alt-2': 'Full property curves',
    'alt-3': 'Two data points per property',
  },
};

const sampleTimelineEvents: TimelineEvent[] = [
  {
    id: 'ev-1',
    type: 'created',
    timestamp: '2026-08-01T09:00:00Z',
    actor: { id: 'agent-thermal', type: 'agent' },
  },
  {
    id: 'ev-2',
    type: 'identified',
    timestamp: '2026-08-01T09:01:00Z',
    actor: { id: 'agent-thermal', type: 'agent' },
    previousStatus: 'candidate',
    newStatus: 'pending',
  },
  {
    id: 'ev-3',
    type: 'investigation-started',
    timestamp: '2026-08-02T14:00:00Z',
    actor: { id: 'user-1', type: 'user' },
    previousStatus: 'pending',
    newStatus: 'investigating',
  },
  {
    id: 'ev-4',
    type: 'resolved',
    timestamp: '2026-08-03T10:30:00Z',
    actor: { id: 'user-1', type: 'user' },
    previousStatus: 'investigating',
    newStatus: 'resolved',
  },
];

const sampleActivityItems: ActivityItem[] = [
  {
    id: 'act-1',
    eventType: 'created',
    timestamp: '2026-08-07T09:00:00Z',
    pointQuestion: 'Should we use constant or temperature-dependent material properties?',
    actor: { id: 'agent-thermal', type: 'agent' },
  },
  {
    id: 'act-2',
    eventType: 'investigation-started',
    timestamp: '2026-08-07T10:15:00Z',
    pointQuestion: 'Is natural convection sufficient for cooling?',
    actor: { id: 'user-1', type: 'user' },
  },
  {
    id: 'act-3',
    eventType: 'resolved',
    timestamp: '2026-08-07T11:30:00Z',
    pointQuestion: 'Which turbulence model to use for external flow?',
    actor: { id: 'user-1', type: 'user' },
  },
  {
    id: 'act-4',
    eventType: 'marked-stale',
    timestamp: '2026-08-07T12:00:00Z',
    pointQuestion: 'Should fin spacing be optimised for natural or forced convection?',
    actor: { id: 'system', type: 'system' },
  },
];

const sampleGraphNodes: GraphNode[] = [
  { id: 'n1', label: 'Material Props', status: 'resolved' },
  { id: 'n2', label: 'Mesh Density', status: 'investigating' },
  { id: 'n3', label: 'BC Selection', status: 'pending' },
  { id: 'n4', label: 'Convergence', status: 'candidate', isStale: true },
];

const sampleGraphEdges: GraphEdge[] = [
  { from: 'n1', to: 'n2' },
  { from: 'n2', to: 'n4' },
  { from: 'n3', to: 'n4' },
];

function makeSampleCard(status: JudgmentStatus, index: number): JudgmentCardData {
  const questions: Record<string, string> = {
    candidate: 'Should we include radiation heat transfer in the fin analysis?',
    pending: 'Is the ambient temperature assumption of 25C valid for outdoor deployment?',
    investigating: 'Should we use constant or temperature-dependent material properties?',
    resolved: 'Which turbulence model is appropriate for external flow over the heat sink?',
    delegated: 'What safety factor should be applied to the maximum junction temperature?',
    stale: 'Should fin spacing be optimised for natural or forced convection?',
    reopened: 'Is the thermal interface material conductivity correctly characterised?',
    dismissed: 'Should we model the PCB as a lumped thermal mass?',
  };

  return {
    id: `card-${status}-${index}`,
    status,
    category: ALL_CATEGORIES[index % ALL_CATEGORIES.length] ?? 'assumption',
    question: questions[status] ?? `Sample question for ${status}`,
    materiality: {
      score: 4 + index * 1.5,
      interventionLevel: index % 2 === 0 ? 'pause' : undefined,
    },
    authority: { mode: 'collaborative' },
    resolution:
      status === 'resolved'
        ? { selectedAlternativeId: 'alt-2', rationale: 'Provides best accuracy-cost tradeoff.' }
        : undefined,
    updatedAt: '2026-08-07T10:00:00Z',
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ComponentGallery: React.FC = () => {
  const [samplePolicyRule, setSamplePolicyRule] = useState<PolicyRuleData>({
    condition: {
      categories: ['assumption', 'method'],
      materialityRange: { min: 6, max: 18 },
      hardTriggers: ['safety-critical'],
    },
    interventionLevel: 'pause',
    authorityOverride: 'human-in-the-loop',
  });

  return (
    <div className={styles['container']}>
      <h2 className={styles['pageTitle']}>Component Gallery</h2>
      <p className={styles['pageDescription']}>
        Every component from @human-machine-judgment/ui rendered with realistic sample data from a
        thermal engineering analysis workflow.
      </p>

      {/* 1. Badges */}
      <section className={styles['section']}>
        <h2 className={styles['sectionTitle']}>Badges</h2>
        <p className={styles['sectionDescription']}>
          StatusBadge, CategoryBadge, and InterventionLevelBadge provide compact, colour-coded
          labels for the core classification dimensions.
        </p>

        <h3>StatusBadge (all 8 statuses)</h3>
        <div className={styles['badgeRow']}>
          {ALL_STATUSES.map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>

        <h3>CategoryBadge (all 8 categories)</h3>
        <div className={styles['badgeRow']}>
          {ALL_CATEGORIES.map((c) => (
            <CategoryBadge key={c} category={c} />
          ))}
        </div>

        <h3>InterventionLevelBadge (all 4 levels)</h3>
        <div className={styles['badgeRow']}>
          {ALL_INTERVENTION_LEVELS.map((l) => (
            <InterventionLevelBadge key={l} level={l} />
          ))}
        </div>
      </section>

      {/* 2. MaterialityGauge */}
      <section className={styles['section']}>
        <h2 className={styles['sectionTitle']}>MaterialityGauge</h2>
        <p className={styles['sectionDescription']}>
          Visualises the 6-dimension materiality assessment as a bar chart with an overall score
          gauge. Optionally shows intervention level, hard trigger, and detector confidence.
        </p>
        <div className={styles['inlineWrapper']}>
          <MaterialityGauge
            score={8}
            dimensions={sampleDimensions}
            interventionLevel="pause"
            hardTrigger="safety-critical"
            detectorConfidence={0.87}
          />
        </div>
      </section>

      {/* 3. StaleIndicator */}
      <section className={styles['section']}>
        <h2 className={styles['sectionTitle']}>StaleIndicator</h2>
        <p className={styles['sectionDescription']}>
          Alert component shown when a judgment point has been marked stale due to upstream changes,
          elapsed time, or other invalidation.
        </p>
        <div className={styles['inlineWrapper']}>
          <StaleIndicator
            reason="Upstream material property data was updated on 2026-08-06. The resolution may no longer be valid."
            markedAt="2026-08-06T16:00:00Z"
          />
        </div>
      </section>

      {/* 4. AlternativeCard */}
      <section className={styles['section']}>
        <h2 className={styles['sectionTitle']}>AlternativeCard</h2>
        <p className={styles['sectionDescription']}>
          Displays a single decision alternative with description, tradeoffs, and optional
          source/selection state.
        </p>
        <div className={styles['cardRow']}>
          <div className={styles['card']}>
            <AlternativeCard
              id="alt-demo-1"
              label="Constant Properties"
              description="Use fixed material properties at room temperature (25C). Simple to implement."
              tradeoffs="May underestimate thermal expansion effects at higher temperatures."
              source="agent"
            />
          </div>
          <div className={styles['card']}>
            <AlternativeCard
              id="alt-demo-2"
              label="Temperature-Dependent"
              description="Interpolate k(T), Cp(T), and alpha(T) from handbook data tables."
              source="user"
              isSelected
            />
          </div>
        </div>
      </section>

      {/* 5. ComparisonView */}
      <section className={styles['section']}>
        <h2 className={styles['sectionTitle']}>ComparisonView</h2>
        <p className={styles['sectionDescription']}>
          Grid-based comparison of multiple alternatives across named dimensions. Supports keyboard
          navigation for accessibility.
        </p>
        <div className={styles['inlineWrapper']}>
          <ComparisonView alternatives={sampleAlternatives} comparisonData={sampleComparisonData} />
        </div>
      </section>

      {/* 6. JudgmentCard */}
      <section className={styles['section']}>
        <h2 className={styles['sectionTitle']}>JudgmentCard</h2>
        <p className={styles['sectionDescription']}>
          Compact card for each judgment point showing status, category, materiality score, and
          context-appropriate action buttons.
        </p>
        <div className={styles['cardRow']}>
          {ALL_STATUSES.map((status, i) => (
            <div key={status} className={styles['card']}>
              <JudgmentCard
                judgmentPoint={makeSampleCard(status, i)}
                onSelect={(id: string) => window.alert(`Selected: ${id}`)}
                onAction={(id: string, action: string) =>
                  window.alert(`Action: ${action} on ${id}`)
                }
              />
            </div>
          ))}
        </div>
      </section>

      {/* 7. JudgmentTimeline */}
      <section className={styles['section']}>
        <h2 className={styles['sectionTitle']}>JudgmentTimeline</h2>
        <p className={styles['sectionDescription']}>
          Chronological event history for a single judgment point, with colour-coded dots and status
          transitions.
        </p>
        <div className={styles['inlineWrapper']}>
          <JudgmentTimeline events={sampleTimelineEvents} />
        </div>
      </section>

      {/* 8. ActivityFeed */}
      <section className={styles['section']}>
        <h2 className={styles['sectionTitle']}>ActivityFeed</h2>
        <p className={styles['sectionDescription']}>
          Project-level feed of recent judgment point events with timestamps, actor information, and
          truncated question text.
        </p>
        <div className={styles['inlineWrapper']}>
          <ActivityFeed items={sampleActivityItems} maxItems={10} />
        </div>
      </section>

      {/* 9. DependencyGraph */}
      <section className={styles['section']}>
        <h2 className={styles['sectionTitle']}>DependencyGraph</h2>
        <p className={styles['sectionDescription']}>
          SVG-based directed acyclic graph showing relationships between judgment points. Nodes are
          coloured by status and stale nodes use dashed borders.
        </p>
        <div className={styles['inlineWrapper']}>
          <DependencyGraph
            nodes={sampleGraphNodes}
            edges={sampleGraphEdges}
            onNodeClick={(id: string) => window.alert(`Clicked node: ${id}`)}
          />
        </div>
      </section>

      {/* 10. ResolutionForm */}
      <section className={styles['section']}>
        <h2 className={styles['sectionTitle']}>ResolutionForm</h2>
        <p className={styles['sectionDescription']}>
          Multi-step form for resolving a judgment point: select an alternative, provide rationale,
          optionally add conditions and validation requirements, then confirm.
        </p>
        <div className={styles['inlineWrapper']}>
          <ResolutionForm
            alternatives={sampleAlternatives.map((a) => ({
              id: a.id,
              label: a.label,
              description: a.description,
            }))}
            onSubmit={(data: { selectedAlternativeId: string; rationale: string }) =>
              window.alert(`Resolved: ${JSON.stringify(data, null, 2)}`)
            }
            onCancel={() => window.alert('Resolution cancelled')}
          />
        </div>
      </section>

      {/* 11. DelegationDialog */}
      <section className={styles['section']}>
        <h2 className={styles['sectionTitle']}>DelegationDialog</h2>
        <p className={styles['sectionDescription']}>
          Modal dialog for delegating a judgment point to another actor. Shows the question,
          optional delegation conditions, and requires a reason. Rendered inline below for
          demonstration.
        </p>
        <div className={styles['inlineWrapper']} style={{ position: 'relative', minHeight: 300 }}>
          <DelegationDialog
            pointId="jp-demo-delegate"
            question="What safety factor should be applied to the maximum junction temperature?"
            delegationConditions={[
              'Maximum materiality score of 10',
              'Must not involve safety-critical hard triggers',
            ]}
            onConfirm={(data: { reason: string }) =>
              window.alert(`Delegated: ${JSON.stringify(data)}`)
            }
            onCancel={() => window.alert('Delegation cancelled')}
          />
        </div>
      </section>

      {/* 12. ReopenDialog */}
      <section className={styles['section']}>
        <h2 className={styles['sectionTitle']}>ReopenDialog</h2>
        <p className={styles['sectionDescription']}>
          Modal dialog for reopening a previously resolved or dismissed judgment point. Requires the
          user to provide a reason.
        </p>
        <div className={styles['inlineWrapper']} style={{ position: 'relative', minHeight: 280 }}>
          <ReopenDialog
            pointId="jp-demo-reopen"
            question="Which turbulence model is appropriate for external flow over the heat sink?"
            onConfirm={(data: { reason: string }) =>
              window.alert(`Reopened: ${JSON.stringify(data)}`)
            }
            onCancel={() => window.alert('Reopen cancelled')}
          />
        </div>
      </section>

      {/* 13. PolicyRuleEditor */}
      <section className={styles['section']}>
        <h2 className={styles['sectionTitle']}>PolicyRuleEditor</h2>
        <p className={styles['sectionDescription']}>
          Form for editing a single policy rule: category filters, materiality range, hard trigger
          conditions, intervention level, and authority override.
        </p>
        <div className={styles['inlineWrapper']}>
          <PolicyRuleEditor rule={samplePolicyRule} onChange={setSamplePolicyRule} />
        </div>
      </section>
    </div>
  );
};
