/**
 * @human-machine-judgment/ui
 *
 * Accessible React components for Judgment Point display, investigation,
 * comparison, and resolution. Provides ready-to-use UI primitives for
 * rendering Judgment Point workflows in React applications with full
 * accessibility support.
 */

import './tokens.css';
import './reset.css';

export const VERSION = '0.1.0';

// Atomic badge / indicator components
export { StatusBadge } from './StatusBadge';
export type { StatusBadgeProps, JudgmentStatus } from './StatusBadge';

export { CategoryBadge } from './CategoryBadge';
export type { CategoryBadgeProps } from './CategoryBadge';

export { InterventionLevelBadge } from './InterventionLevelBadge';
export type { InterventionLevelBadgeProps, InterventionLevel } from './InterventionLevelBadge';

export { StaleIndicator } from './StaleIndicator';
export type { StaleIndicatorProps } from './StaleIndicator';

export { MaterialityGauge } from './MaterialityGauge';
export type { MaterialityGaugeProps, MaterialityDimensions } from './MaterialityGauge';

// Composite components
export { AlternativeCard } from './AlternativeCard';
export type { AlternativeCardProps } from './AlternativeCard';

export { ComparisonView } from './ComparisonView';
export type { ComparisonViewProps, ComparisonAlternative } from './ComparisonView';

export { JudgmentTimeline } from './JudgmentTimeline';
export type { JudgmentTimelineProps, TimelineEvent } from './JudgmentTimeline';

export { ActivityFeed } from './ActivityFeed';
export type { ActivityFeedProps, ActivityItem } from './ActivityFeed';

export { JudgmentCard } from './JudgmentCard';
export type { JudgmentCardProps, JudgmentCardData } from './JudgmentCard';

// Complex components
export { JudgmentPanel } from './JudgmentPanel';
export type { JudgmentPanelProps } from './JudgmentPanel';

export { JudgmentMarker } from './JudgmentMarker';
export type { JudgmentMarkerProps } from './JudgmentMarker';

export { DependencyGraph } from './DependencyGraph';
export type { DependencyGraphProps, GraphNode, GraphEdge } from './DependencyGraph';

export { ResolutionForm } from './ResolutionForm';
export type { ResolutionFormProps } from './ResolutionForm';

export { DelegationDialog } from './DelegationDialog';
export type { DelegationDialogProps } from './DelegationDialog';

export { ReopenDialog } from './ReopenDialog';
export type { ReopenDialogProps } from './ReopenDialog';

export { PolicyRuleEditor } from './PolicyRuleEditor';
export type { PolicyRuleEditorProps } from './PolicyRuleEditor';

export { ProjectJudgmentsView } from './ProjectJudgmentsView';
export type { ProjectJudgmentsViewProps } from './ProjectJudgmentsView';
