import { describe, it, expect } from 'vitest';
import {
  getDefaultAuthority,
  canActorResolve,
  validateDelegationConditions,
  canPromote,
  canInvestigate,
  canResolve,
  canDismiss,
  canDelegate,
  canMarkStale,
  canReopen,
} from './authority.js';
import type { JudgmentPoint, Actor, DelegationConditions } from './types.js';

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
      interventionLevel: 'pause',
    },
    status: 'candidate',
    alternatives: [{ id: 'alt-1', label: 'Option A', description: 'First option' }],
    affectedArtifactIds: [],
    authority: { mode: 'human' },
    validityConditions: [],
    reopenConditions: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('authority', () => {
  describe('getDefaultAuthority', () => {
    it('returns collaborative for trace', () => {
      expect(getDefaultAuthority('trace')).toBe('collaborative');
    });

    it('returns collaborative for disclose', () => {
      expect(getDefaultAuthority('disclose')).toBe('collaborative');
    });

    it('returns collaborative for pause', () => {
      expect(getDefaultAuthority('pause')).toBe('collaborative');
    });

    it('returns human for require-investigation', () => {
      expect(getDefaultAuthority('require-investigation')).toBe('human');
    });
  });

  describe('canActorResolve', () => {
    it('allows user to resolve with human authority', () => {
      expect(canActorResolve({ id: 'user-1', type: 'user' }, { mode: 'human' })).toBe(true);
    });

    it('disallows agent to resolve with human authority', () => {
      expect(canActorResolve({ id: 'agent-1', type: 'agent' }, { mode: 'human' })).toBe(false);
    });

    it('allows user to resolve with collaborative authority', () => {
      expect(canActorResolve({ id: 'user-1', type: 'user' }, { mode: 'collaborative' })).toBe(true);
    });

    it('disallows agent to resolve with collaborative authority', () => {
      expect(canActorResolve({ id: 'agent-1', type: 'agent' }, { mode: 'collaborative' })).toBe(
        false,
      );
    });

    it('allows any actor for delegated authority', () => {
      expect(canActorResolve({ id: 'agent-1', type: 'agent' }, { mode: 'delegated' })).toBe(true);
    });

    it('allows any actor for rule authority', () => {
      expect(canActorResolve({ id: 'system-1', type: 'system' }, { mode: 'rule' })).toBe(true);
    });
  });

  describe('validateDelegationConditions', () => {
    it('returns allowed when all conditions pass', () => {
      const conditions: DelegationConditions = {
        allowed: true,
        maxMaterialityScore: 15,
      };
      const result = validateDelegationConditions(makePoint(), conditions);
      expect(result.allowed).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it('rejects when delegation is not allowed', () => {
      const conditions: DelegationConditions = { allowed: false };
      const result = validateDelegationConditions(makePoint(), conditions);
      expect(result.allowed).toBe(false);
    });

    it('rejects when score exceeds maxMaterialityScore', () => {
      const conditions: DelegationConditions = { maxMaterialityScore: 5 };
      const result = validateDelegationConditions(makePoint(), conditions);
      expect(result.allowed).toBe(false);
    });

    it('rejects when confidence is below required', () => {
      const conditions: DelegationConditions = { requiredConfidence: 0.9 };
      const result = validateDelegationConditions(
        makePoint({ materiality: { ...makePoint().materiality, detectorConfidence: 0.5 } }),
        conditions,
      );
      expect(result.allowed).toBe(false);
    });

    it('rejects when category is excluded', () => {
      const conditions: DelegationConditions = { excludedCategories: ['method'] };
      const result = validateDelegationConditions(makePoint(), conditions);
      expect(result.allowed).toBe(false);
    });
  });

  describe('canDelegate', () => {
    it('allows delegation from pending with valid conditions', () => {
      const result = canDelegate(makePoint({ status: 'pending' }), { allowed: true });
      expect(result.allowed).toBe(true);
    });

    it('rejects delegation from non-pending status', () => {
      const result = canDelegate(makePoint({ status: 'investigating' }), { allowed: true });
      expect(result.allowed).toBe(false);
    });

    it('rejects delegation when conditions disallow it', () => {
      const result = canDelegate(makePoint({ status: 'pending' }), { allowed: false });
      expect(result.allowed).toBe(false);
    });
  });

  describe('canPromote', () => {
    it('allows promotion of candidate with sufficient materiality', () => {
      const result = canPromote(makePoint());
      expect(result.allowed).toBe(true);
    });

    it('rejects promotion when status is not candidate', () => {
      const result = canPromote(makePoint({ status: 'pending' }));
      expect(result.allowed).toBe(false);
    });

    it('rejects promotion when intervention is trace and no hard trigger', () => {
      const result = canPromote(
        makePoint({
          materiality: {
            score: 2,
            dimensions: {
              methodologicalDiscretion: 1,
              downstreamInfluence: 1,
              uncertainty: 0,
              consequence: 0,
              reversibility: 0,
              accountabilityRequirement: 0,
            },
            interventionLevel: 'trace',
          },
        }),
      );
      expect(result.allowed).toBe(false);
    });

    it('allows promotion with hard trigger even when score is low', () => {
      const result = canPromote(
        makePoint({
          trigger: {
            source: 'agent',
            description: 'detected',
            hardTrigger: 'data-exclusion',
          },
          materiality: {
            score: 2,
            dimensions: {
              methodologicalDiscretion: 1,
              downstreamInfluence: 1,
              uncertainty: 0,
              consequence: 0,
              reversibility: 0,
              accountabilityRequirement: 0,
            },
            interventionLevel: 'trace',
          },
        }),
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe('canInvestigate', () => {
    it('allows investigation from pending with alternatives', () => {
      const result = canInvestigate(makePoint({ status: 'pending' }));
      expect(result.allowed).toBe(true);
    });

    it('rejects investigation with no alternatives', () => {
      const result = canInvestigate(makePoint({ status: 'pending', alternatives: [] }));
      expect(result.allowed).toBe(false);
    });

    it('rejects investigation from wrong status', () => {
      const result = canInvestigate(makePoint({ status: 'resolved' }));
      expect(result.allowed).toBe(false);
    });
  });

  describe('canResolve', () => {
    const actor: Actor = { id: 'user-1', type: 'user' };

    it('allows resolution from investigating with valid params', () => {
      const result = canResolve(
        makePoint({ status: 'investigating' }),
        actor,
        'alt-1',
        'Good rationale',
      );
      expect(result.allowed).toBe(true);
    });

    it('rejects empty rationale', () => {
      const result = canResolve(makePoint({ status: 'investigating' }), actor, 'alt-1', '');
      expect(result.allowed).toBe(false);
    });

    it('rejects non-existent alternative', () => {
      const result = canResolve(
        makePoint({ status: 'investigating' }),
        actor,
        'nonexistent',
        'Rationale',
      );
      expect(result.allowed).toBe(false);
    });

    it('rejects unauthorized actor', () => {
      const agentActor: Actor = { id: 'agent-1', type: 'agent' };
      const result = canResolve(
        makePoint({ status: 'investigating', authority: { mode: 'human' } }),
        agentActor,
        'alt-1',
        'Rationale',
      );
      expect(result.allowed).toBe(false);
    });
  });

  describe('canDismiss', () => {
    it('allows dismissal from pending with non-investigation level', () => {
      const result = canDismiss(makePoint({ status: 'pending' }), 'pause');
      expect(result.allowed).toBe(true);
    });

    it('allows dismissal from reopened status', () => {
      const result = canDismiss(makePoint({ status: 'reopened' }), 'pause');
      expect(result.allowed).toBe(true);
    });

    it('rejects dismissal with require-investigation level', () => {
      const result = canDismiss(makePoint({ status: 'pending' }), 'require-investigation');
      expect(result.allowed).toBe(false);
    });

    it('rejects dismissal from wrong status', () => {
      const result = canDismiss(makePoint({ status: 'investigating' }), 'pause');
      expect(result.allowed).toBe(false);
    });
  });

  describe('canMarkStale', () => {
    it('allows marking resolved point as stale', () => {
      const result = canMarkStale(makePoint({ status: 'resolved' }), 'Data changed');
      expect(result.allowed).toBe(true);
    });

    it('rejects marking non-resolved point as stale', () => {
      const result = canMarkStale(makePoint({ status: 'pending' }), 'Data changed');
      expect(result.allowed).toBe(false);
    });

    it('rejects empty reason', () => {
      const result = canMarkStale(makePoint({ status: 'resolved' }), '');
      expect(result.allowed).toBe(false);
    });
  });

  describe('canReopen', () => {
    it('allows reopening resolved point', () => {
      const result = canReopen(makePoint({ status: 'resolved' }), 'Need to reconsider');
      expect(result.allowed).toBe(true);
    });

    it('allows reopening dismissed point', () => {
      const result = canReopen(makePoint({ status: 'dismissed' }), 'Circumstances changed');
      expect(result.allowed).toBe(true);
    });

    it('allows reopening stale point', () => {
      const result = canReopen(makePoint({ status: 'stale' }), 'Need review');
      expect(result.allowed).toBe(true);
    });

    it('rejects reopening pending point', () => {
      const result = canReopen(makePoint({ status: 'pending' }), 'Reason');
      expect(result.allowed).toBe(false);
    });

    it('rejects empty reason', () => {
      const result = canReopen(makePoint({ status: 'resolved' }), '');
      expect(result.allowed).toBe(false);
    });
  });
});
