import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  getTransitionEvent,
  assertTransition,
  getValidTargetStates,
} from './state-machine.js';
import { InvalidTransitionError } from './errors.js';
import type { JudgmentStatus } from './types.js';
import { JUDGMENT_STATUSES } from './types.js';

describe('state-machine', () => {
  const VALID_TRANSITIONS: [JudgmentStatus, JudgmentStatus, string][] = [
    ['candidate', 'pending', 'promoted'],
    ['pending', 'investigating', 'investigation-started'],
    ['pending', 'dismissed', 'dismissed'],
    ['pending', 'delegated', 'delegated'],
    ['investigating', 'resolved', 'resolution-recorded'],
    ['delegated', 'resolved', 'resolution-recorded'],
    ['resolved', 'stale', 'marked-stale'],
    ['resolved', 'reopened', 'reopened'],
    ['stale', 'reopened', 'reopened'],
    ['dismissed', 'reopened', 'reopened'],
    ['reopened', 'investigating', 'investigation-started'],
    ['reopened', 'dismissed', 'dismissed'],
  ];

  describe('isValidTransition', () => {
    it.each(VALID_TRANSITIONS)('allows %s -> %s', (from, to) => {
      expect(isValidTransition(from, to)).toBe(true);
    });

    it('rejects candidate -> resolved (must go through pending/investigating)', () => {
      expect(isValidTransition('candidate', 'resolved')).toBe(false);
    });

    it('rejects investigating -> pending (no backward transition)', () => {
      expect(isValidTransition('investigating', 'pending')).toBe(false);
    });

    it('rejects self-transitions', () => {
      for (const status of JUDGMENT_STATUSES) {
        expect(isValidTransition(status, status)).toBe(false);
      }
    });
  });

  describe('getTransitionEvent', () => {
    it.each(VALID_TRANSITIONS)('returns %s for %s -> %s', (from, to, expectedEvent) => {
      expect(getTransitionEvent(from, to)).toBe(expectedEvent);
    });

    it('returns undefined for invalid transitions', () => {
      expect(getTransitionEvent('candidate', 'resolved')).toBeUndefined();
    });
  });

  describe('assertTransition', () => {
    it('does not throw for valid transitions', () => {
      expect(() => assertTransition('candidate', 'pending')).not.toThrow();
    });

    it('throws InvalidTransitionError for invalid transitions', () => {
      expect(() => assertTransition('candidate', 'resolved')).toThrow(InvalidTransitionError);
    });

    it('includes from and to in error', () => {
      expect.assertions(3);
      try {
        assertTransition('candidate', 'resolved');
      } catch (err) {
        expect(err).toBeInstanceOf(InvalidTransitionError);
        const error = err as InvalidTransitionError;
        expect(error.from).toBe('candidate');
        expect(error.to).toBe('resolved');
      }
    });
  });

  describe('getValidTargetStates', () => {
    it('returns [pending] for candidate', () => {
      expect(getValidTargetStates('candidate')).toEqual(['pending']);
    });

    it('returns [investigating, dismissed, delegated] for pending', () => {
      const targets = getValidTargetStates('pending');
      expect(targets).toHaveLength(3);
      expect(targets).toContain('investigating');
      expect(targets).toContain('dismissed');
      expect(targets).toContain('delegated');
    });

    it('returns [resolved] for investigating', () => {
      expect(getValidTargetStates('investigating')).toEqual(['resolved']);
    });

    it('returns [resolved] for delegated', () => {
      expect(getValidTargetStates('delegated')).toEqual(['resolved']);
    });

    it('returns [stale, reopened] for resolved', () => {
      const targets = getValidTargetStates('resolved');
      expect(targets).toHaveLength(2);
      expect(targets).toContain('stale');
      expect(targets).toContain('reopened');
    });

    it('returns [reopened] for stale', () => {
      expect(getValidTargetStates('stale')).toEqual(['reopened']);
    });

    it('returns [reopened] for dismissed', () => {
      expect(getValidTargetStates('dismissed')).toEqual(['reopened']);
    });

    it('returns [investigating, dismissed] for reopened', () => {
      const targets = getValidTargetStates('reopened');
      expect(targets).toHaveLength(2);
      expect(targets).toContain('investigating');
      expect(targets).toContain('dismissed');
    });
  });
});
