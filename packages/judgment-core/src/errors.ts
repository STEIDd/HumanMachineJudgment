import type { JudgmentStatus } from './types.js';

/**
 * Base error class for the Judgment system.
 */
export class JudgmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JudgmentError';
  }
}

/**
 * Thrown when an invalid state machine transition is attempted.
 */
export class InvalidTransitionError extends JudgmentError {
  readonly from: JudgmentStatus;
  readonly to: JudgmentStatus;

  constructor(from: JudgmentStatus, to: JudgmentStatus) {
    super(`Invalid transition from '${from}' to '${to}'`);
    this.name = 'InvalidTransitionError';
    this.from = from;
    this.to = to;
  }
}

/**
 * Thrown when an actor is not authorized to perform a resolution.
 */
export class UnauthorizedResolutionError extends JudgmentError {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedResolutionError';
  }
}

/**
 * Thrown when field validation fails.
 */
export class ValidationError extends JudgmentError {
  readonly fields: readonly string[];

  constructor(message: string, fields: readonly string[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

/**
 * Thrown when a policy constraint is violated.
 */
export class PolicyViolationError extends JudgmentError {
  constructor(message: string) {
    super(message);
    this.name = 'PolicyViolationError';
  }
}

/**
 * Thrown when a duplicate ID is encountered.
 */
export class DuplicateError extends JudgmentError {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateError';
  }
}

/**
 * Thrown when a requested resource is not found.
 */
export class NotFoundError extends JudgmentError {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when a guard precondition is not met.
 */
export class GuardError extends JudgmentError {
  readonly reasons: readonly string[];

  constructor(message: string, reasons: readonly string[] = []) {
    super(message);
    this.name = 'GuardError';
    this.reasons = reasons;
  }
}
