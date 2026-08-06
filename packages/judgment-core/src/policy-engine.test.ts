import { describe, it, expect } from 'vitest';
import {
  matchesScope,
  evaluateRuleCondition,
  evaluatePolicy,
  evaluatePolicies,
} from './policy-engine.js';
import type { JudgmentPoint, JudgmentPolicy } from './types.js';

function makePoint(overrides: Partial<JudgmentPoint> = {}): JudgmentPoint {
  return {
    id: 'jp-1',
    projectId: 'proj-1',
    category: 'method',
    question: 'Which model?',
    context: 'Analysis context',
    trigger: { source: 'agent', description: 'detected' },
    materiality: {
      score: 10,
      dimensions: {
        methodologicalDiscretion: 2,
        downstreamInfluence: 2,
        uncertainty: 1,
        consequence: 2,
        reversibility: 1,
        accountabilityRequirement: 2,
      },
    },
    status: 'pending',
    alternatives: [],
    affectedArtifactIds: [],
    authority: { mode: 'human' },
    validityConditions: [],
    reopenConditions: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makePolicy(overrides: Partial<JudgmentPolicy> = {}): JudgmentPolicy {
  return {
    id: 'pol-1',
    projectId: 'proj-1',
    name: 'Test policy',
    description: 'Test',
    scope: {},
    rules: [
      {
        id: 'rule-1',
        condition: {},
        intervention: 'pause',
      },
    ],
    priority: 10,
    enabled: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('policy-engine', () => {
  describe('matchesScope', () => {
    it('matches empty scope (matches all)', () => {
      expect(matchesScope(makePoint(), {})).toBe(true);
    });

    it('matches when category is in scope', () => {
      expect(
        matchesScope(makePoint({ category: 'method' }), {
          categories: ['method', 'data'],
        }),
      ).toBe(true);
    });

    it('does not match when category is not in scope', () => {
      expect(
        matchesScope(makePoint({ category: 'method' }), {
          categories: ['data'],
        }),
      ).toBe(false);
    });

    it('matches score range', () => {
      expect(
        matchesScope(makePoint(), {
          materialityScoreMin: 5,
          materialityScoreMax: 15,
        }),
      ).toBe(true);
    });

    it('does not match score below minimum', () => {
      expect(matchesScope(makePoint(), { materialityScoreMin: 15 })).toBe(false);
    });

    it('matches trigger source', () => {
      expect(matchesScope(makePoint(), { triggerSources: ['agent'] })).toBe(true);
    });

    it('does not match wrong trigger source', () => {
      expect(matchesScope(makePoint(), { triggerSources: ['user'] })).toBe(false);
    });
  });

  describe('evaluateRuleCondition', () => {
    it('matches empty condition (matches all)', () => {
      expect(evaluateRuleCondition(makePoint(), {})).toBe(true);
    });

    it('matches score range', () => {
      expect(
        evaluateRuleCondition(makePoint(), {
          materialityScoreMin: 9,
          materialityScoreMax: 13,
        }),
      ).toBe(true);
    });

    it('does not match score outside range', () => {
      expect(
        evaluateRuleCondition(makePoint(), {
          materialityScoreMin: 14,
        }),
      ).toBe(false);
    });

    it('matches dimension threshold (any dimension meets threshold)', () => {
      expect(
        evaluateRuleCondition(makePoint(), {
          dimensionThresholds: { consequence: 2 },
        }),
      ).toBe(true);
    });

    it('does not match dimension threshold when below', () => {
      expect(
        evaluateRuleCondition(makePoint(), {
          dimensionThresholds: { consequence: 3 },
        }),
      ).toBe(false);
    });

    it('matches hard trigger', () => {
      const point = makePoint({
        trigger: {
          source: 'agent',
          description: 'detected',
          hardTrigger: 'data-exclusion',
        },
      });
      expect(evaluateRuleCondition(point, { hardTrigger: 'data-exclusion' })).toBe(true);
    });

    it('matches category list', () => {
      expect(evaluateRuleCondition(makePoint(), { categories: ['method'] })).toBe(true);
    });
  });

  describe('evaluatePolicy', () => {
    it('returns first matching rule', () => {
      const policy = makePolicy({
        rules: [
          {
            id: 'r1',
            condition: { materialityScoreMin: 14 },
            intervention: 'require-investigation',
          },
          { id: 'r2', condition: {}, intervention: 'pause' },
        ],
      });
      const rule = evaluatePolicy(makePoint(), policy);
      expect(rule?.id).toBe('r2');
    });

    it('returns null for disabled policy', () => {
      const policy = makePolicy({ enabled: false });
      expect(evaluatePolicy(makePoint(), policy)).toBeNull();
    });

    it('returns null when scope does not match', () => {
      const policy = makePolicy({ scope: { categories: ['data'] } });
      expect(evaluatePolicy(makePoint(), policy)).toBeNull();
    });
  });

  describe('evaluatePolicies', () => {
    it('applies most restrictive intervention from matching policies', () => {
      const policies = [
        makePolicy({
          id: 'p1',
          priority: 10,
          rules: [{ id: 'r1', condition: {}, intervention: 'disclose' }],
        }),
        makePolicy({
          id: 'p2',
          priority: 5,
          rules: [{ id: 'r2', condition: {}, intervention: 'pause' }],
        }),
      ];

      const result = evaluatePolicies(makePoint(), policies);
      expect(result.intervention).toBe('pause');
    });

    it('falls back to trace when no policies match and no interventionLevel set', () => {
      const result = evaluatePolicies(makePoint(), []);
      expect(result.matchedRules).toHaveLength(0);
      expect(result.intervention).toBe('trace');
    });

    it('falls back to point intervention level when no policies match', () => {
      const point = makePoint({
        materiality: {
          score: 10,
          dimensions: {
            methodologicalDiscretion: 2,
            downstreamInfluence: 2,
            uncertainty: 1,
            consequence: 2,
            reversibility: 1,
            accountabilityRequirement: 2,
          },
          interventionLevel: 'pause',
        },
      });
      const result = evaluatePolicies(point, []);
      expect(result.matchedRules).toHaveLength(0);
      expect(result.intervention).toBe('pause');
    });
  });
});
