import { InvalidTransitionError } from './errors.js';
import type { EventType, JudgmentStatus } from './types.js';

/**
 * Data-driven state transition table.
 *
 * Each entry maps (fromStatus, toStatus) -> eventType that triggers the transition.
 * Only transitions listed here are valid.
 */
const TRANSITIONS: ReadonlyMap<JudgmentStatus, ReadonlyMap<JudgmentStatus, EventType>> = new Map<
  JudgmentStatus,
  Map<JudgmentStatus, EventType>
>([
  ['candidate', new Map([['pending', 'promoted']])],
  [
    'pending',
    new Map<JudgmentStatus, EventType>([
      ['investigating', 'investigation-started'],
      ['dismissed', 'dismissed'],
      ['delegated', 'delegated'],
    ]),
  ],
  ['investigating', new Map([['resolved', 'resolution-recorded']])],
  ['delegated', new Map([['resolved', 'resolution-recorded']])],
  [
    'resolved',
    new Map<JudgmentStatus, EventType>([
      ['stale', 'marked-stale'],
      ['reopened', 'reopened'],
    ]),
  ],
  ['stale', new Map([['reopened', 'reopened']])],
  ['dismissed', new Map([['reopened', 'reopened']])],
  [
    'reopened',
    new Map<JudgmentStatus, EventType>([
      ['investigating', 'investigation-started'],
      ['dismissed', 'dismissed'],
    ]),
  ],
]);

/**
 * Check whether a transition from one status to another is valid.
 */
export function isValidTransition(from: JudgmentStatus, to: JudgmentStatus): boolean {
  return TRANSITIONS.get(from)?.has(to) ?? false;
}

/**
 * Get the event type that triggers a given transition, or undefined if invalid.
 */
export function getTransitionEvent(
  from: JudgmentStatus,
  to: JudgmentStatus,
): EventType | undefined {
  return TRANSITIONS.get(from)?.get(to);
}

/**
 * Assert that a transition is valid. Throws InvalidTransitionError if not.
 */
export function assertTransition(from: JudgmentStatus, to: JudgmentStatus): void {
  if (!isValidTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

/**
 * Get all valid target states from a given status.
 */
export function getValidTargetStates(from: JudgmentStatus): readonly JudgmentStatus[] {
  const targets = TRANSITIONS.get(from);
  return targets ? Array.from(targets.keys()) : [];
}
