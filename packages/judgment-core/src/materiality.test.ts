import { describe, it, expect } from 'vitest';
import {
  computeAggregateScore,
  scoreToInterventionLevel,
  computeInterventionLevel,
  moreRestrictive,
  compareInterventionLevels,
} from './materiality.js';
import type { MaterialityAssessment, MaterialityDimensions } from './types.js';

const zeroDimensions: MaterialityDimensions = {
  methodologicalDiscretion: 0,
  downstreamInfluence: 0,
  uncertainty: 0,
  consequence: 0,
  reversibility: 0,
  accountabilityRequirement: 0,
};

const maxDimensions: MaterialityDimensions = {
  methodologicalDiscretion: 3,
  downstreamInfluence: 3,
  uncertainty: 3,
  consequence: 3,
  reversibility: 3,
  accountabilityRequirement: 3,
};

describe('materiality', () => {
  describe('computeAggregateScore', () => {
    it('returns 0 for all-zero dimensions', () => {
      expect(computeAggregateScore(zeroDimensions)).toBe(0);
    });

    it('returns 18 for all-max dimensions', () => {
      expect(computeAggregateScore(maxDimensions)).toBe(18);
    });

    it('sums individual dimensions', () => {
      const dims: MaterialityDimensions = {
        methodologicalDiscretion: 1,
        downstreamInfluence: 2,
        uncertainty: 1,
        consequence: 3,
        reversibility: 0,
        accountabilityRequirement: 2,
      };
      expect(computeAggregateScore(dims)).toBe(9);
    });
  });

  describe('scoreToInterventionLevel', () => {
    it.each([
      [0, 'trace'],
      [4, 'trace'],
      [5, 'disclose'],
      [8, 'disclose'],
      [9, 'pause'],
      [13, 'pause'],
      [14, 'require-investigation'],
      [18, 'require-investigation'],
    ] as const)('maps score %d to %s', (score, level) => {
      expect(scoreToInterventionLevel(score)).toBe(level);
    });
  });

  describe('computeInterventionLevel', () => {
    it('uses score-based level when no hard trigger', () => {
      const assessment: MaterialityAssessment = {
        score: 10,
        dimensions: {
          ...zeroDimensions,
          consequence: 3,
          reversibility: 3,
          uncertainty: 2,
          downstreamInfluence: 2,
        },
      };
      expect(computeInterventionLevel(assessment)).toBe('pause');
    });

    it('uses hard trigger override when more restrictive', () => {
      const assessment: MaterialityAssessment = {
        score: 2,
        dimensions: zeroDimensions,
        hardTrigger: 'objective-redefinition',
        interventionLevel: 'require-investigation',
      };
      expect(computeInterventionLevel(assessment)).toBe('require-investigation');
    });

    it('uses score-based when more restrictive than hard trigger', () => {
      const assessment: MaterialityAssessment = {
        score: 15,
        dimensions: maxDimensions,
        hardTrigger: 'worst-case-best-case-assumption',
        interventionLevel: 'disclose',
      };
      // Score 15 → require-investigation, hard trigger says disclose
      // More restrictive wins.
      expect(computeInterventionLevel(assessment)).toBe('require-investigation');
    });
  });

  describe('moreRestrictive', () => {
    it('returns require-investigation when compared with any other', () => {
      expect(moreRestrictive('trace', 'require-investigation')).toBe('require-investigation');
      expect(moreRestrictive('require-investigation', 'trace')).toBe('require-investigation');
    });

    it('returns pause over disclose', () => {
      expect(moreRestrictive('pause', 'disclose')).toBe('pause');
    });

    it('returns equal level when both are the same', () => {
      expect(moreRestrictive('pause', 'pause')).toBe('pause');
    });
  });

  describe('compareInterventionLevels', () => {
    it('returns positive when a is more restrictive', () => {
      expect(compareInterventionLevels('pause', 'trace')).toBeGreaterThan(0);
    });

    it('returns negative when a is less restrictive', () => {
      expect(compareInterventionLevels('trace', 'pause')).toBeLessThan(0);
    });

    it('returns 0 when equal', () => {
      expect(compareInterventionLevels('disclose', 'disclose')).toBe(0);
    });
  });
});
