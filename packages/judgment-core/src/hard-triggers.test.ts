import { describe, it, expect } from 'vitest';
import {
  ALL_HARD_TRIGGERS,
  getHardTrigger,
  getHardTriggerIntervention,
  isHardTrigger,
} from './hard-triggers.js';

describe('hard-triggers', () => {
  it('defines exactly 10 hard triggers', () => {
    expect(ALL_HARD_TRIGGERS).toHaveLength(10);
  });

  it('each trigger has name, description, and defaultIntervention', () => {
    for (const trigger of ALL_HARD_TRIGGERS) {
      expect(trigger.name).toBeTruthy();
      expect(trigger.description).toBeTruthy();
      expect(['trace', 'disclose', 'pause', 'require-investigation']).toContain(
        trigger.defaultIntervention,
      );
    }
  });

  describe('getHardTrigger', () => {
    it('returns trigger for known name', () => {
      const trigger = getHardTrigger('objective-redefinition');
      expect(trigger).toBeDefined();
      expect(trigger?.defaultIntervention).toBe('require-investigation');
    });

    it('returns undefined for unknown name', () => {
      expect(getHardTrigger('nonexistent')).toBeUndefined();
    });
  });

  describe('getHardTriggerIntervention', () => {
    it('returns correct intervention for known triggers', () => {
      expect(getHardTriggerIntervention('objective-redefinition')).toBe('require-investigation');
      expect(getHardTriggerIntervention('safety-factor-selection')).toBe('pause');
      expect(getHardTriggerIntervention('worst-case-best-case-assumption')).toBe('disclose');
    });

    it('returns pause for unknown triggers', () => {
      expect(getHardTriggerIntervention('unknown')).toBe('pause');
    });
  });

  describe('isHardTrigger', () => {
    it('returns true for known triggers', () => {
      expect(isHardTrigger('data-exclusion')).toBe(true);
      expect(isHardTrigger('contradictory-evidence')).toBe(true);
    });

    it('returns false for unknown names', () => {
      expect(isHardTrigger('nonexistent')).toBe(false);
    });
  });
});
