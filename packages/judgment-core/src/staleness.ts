import type { DependencyGraph } from './dependency-graph.js';
import type { JudgmentPoint } from './types.js';

export interface StalenessCheckResult {
  readonly isStale: boolean;
  readonly reasons: readonly string[];
}

/**
 * Check whether a resolved judgment point should be marked stale
 * because artifacts it depends on have changed.
 */
export function checkStaleness(
  point: JudgmentPoint,
  changedArtifactIds: readonly string[],
): StalenessCheckResult {
  if (point.status !== 'resolved') {
    return { isStale: false, reasons: [] };
  }

  const reasons: string[] = [];

  // Check affectedArtifactIds.
  for (const artifactId of changedArtifactIds) {
    if (point.affectedArtifactIds.includes(artifactId)) {
      reasons.push(`Affected artifact '${artifactId}' has changed`);
    }
  }

  // Check evidenceRefs.
  for (const ref of point.evidenceRefs ?? []) {
    if (changedArtifactIds.includes(ref.id)) {
      reasons.push(`Evidence reference '${ref.id}' (${ref.label}) has changed`);
    }
  }

  return {
    isStale: reasons.length > 0,
    reasons,
  };
}

/**
 * Propagate staleness through a dependency graph.
 * Returns the IDs of all judgment points that are transitively affected
 * by a stale point becoming stale.
 */
export function propagateStaleness(
  graph: DependencyGraph,
  stalePointId: string,
): readonly string[] {
  return graph.getTransitiveDependents(stalePointId);
}
