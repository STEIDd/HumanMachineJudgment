import type { InterventionLevel, MaterialityAssessment, MaterialityDimensions } from './types.js';

/**
 * Default intervention level thresholds.
 * Score ranges: 0-4 trace, 5-8 disclose, 9-13 pause, 14-18 require-investigation.
 */
const DEFAULT_THRESHOLDS: readonly {
  readonly max: number;
  readonly level: InterventionLevel;
}[] = [
  { max: 4, level: 'trace' },
  { max: 8, level: 'disclose' },
  { max: 13, level: 'pause' },
  { max: 18, level: 'require-investigation' },
];

/**
 * Compute the aggregate materiality score from the six dimensions.
 * Each dimension is 0-3; the aggregate ranges from 0 to 18.
 */
export function computeAggregateScore(dimensions: MaterialityDimensions): number {
  return (
    dimensions.methodologicalDiscretion +
    dimensions.downstreamInfluence +
    dimensions.uncertainty +
    dimensions.consequence +
    dimensions.reversibility +
    dimensions.accountabilityRequirement
  );
}

/**
 * Map an aggregate score to an intervention level using the default thresholds.
 */
export function scoreToInterventionLevel(score: number): InterventionLevel {
  for (const threshold of DEFAULT_THRESHOLDS) {
    if (score <= threshold.max) {
      return threshold.level;
    }
  }
  return 'require-investigation';
}

/**
 * Compute the effective intervention level for a materiality assessment.
 * If a hard trigger is present, its intervention overrides the score-based level
 * only if it is more restrictive.
 */
export function computeInterventionLevel(assessment: MaterialityAssessment): InterventionLevel {
  const scoreBased = scoreToInterventionLevel(assessment.score);

  if (assessment.hardTrigger != null && assessment.interventionLevel != null) {
    // Hard trigger present with an explicit intervention level: use the more
    // restrictive of the score-based level and the hard-trigger override.
    return moreRestrictive(scoreBased, assessment.interventionLevel);
  }

  // Without a hard trigger, always use the score-based level.
  return scoreBased;
}

const INTERVENTION_RANK: Record<InterventionLevel, number> = {
  trace: 0,
  disclose: 1,
  pause: 2,
  'require-investigation': 3,
};

/**
 * Return the more restrictive of two intervention levels.
 */
export function moreRestrictive(a: InterventionLevel, b: InterventionLevel): InterventionLevel {
  return INTERVENTION_RANK[a] >= INTERVENTION_RANK[b] ? a : b;
}

/**
 * Compare two intervention levels.
 * Returns a positive number if `a` is more restrictive, negative if less, 0 if equal.
 */
export function compareInterventionLevels(a: InterventionLevel, b: InterventionLevel): number {
  return INTERVENTION_RANK[a] - INTERVENTION_RANK[b];
}
