import type {
  Actor,
  AuthorityMode,
  DelegationConditions,
  InterventionLevel,
  JudgmentAuthority,
  JudgmentPoint,
} from './types.js';

export interface GuardResult {
  readonly allowed: boolean;
  readonly reasons: readonly string[];
}

/**
 * Get the default authority mode for a given intervention level.
 *
 * - trace / disclose → collaborative (or delegated if delegation policy exists)
 * - pause → collaborative
 * - require-investigation → human
 */
export function getDefaultAuthority(interventionLevel: InterventionLevel): AuthorityMode {
  switch (interventionLevel) {
    case 'trace':
    case 'disclose':
      return 'collaborative';
    case 'pause':
      return 'collaborative';
    case 'require-investigation':
      return 'human';
  }
}

/**
 * Check whether an actor is authorized to resolve a judgment point
 * given its authority configuration.
 */
export function canActorResolve(actor: Actor, authority: JudgmentAuthority): boolean {
  switch (authority.mode) {
    case 'human':
      return actor.type === 'user';
    case 'collaborative':
      return actor.type === 'user';
    case 'delegated':
      // Delegated allows agents.
      return true;
    case 'rule':
      // Rule-based: system or policy actors can resolve.
      return true;
  }
}

/**
 * Validate delegation conditions against a judgment point.
 */
export function validateDelegationConditions(
  point: JudgmentPoint,
  conditions: DelegationConditions,
): GuardResult {
  const reasons: string[] = [];

  if (conditions.allowed === false) {
    reasons.push('Delegation is not allowed by the policy');
  }

  if (
    conditions.maxMaterialityScore != null &&
    point.materiality.score > conditions.maxMaterialityScore
  ) {
    reasons.push(
      `Materiality score ${point.materiality.score} exceeds maximum ${conditions.maxMaterialityScore} for delegation`,
    );
  }

  if (
    conditions.requiredConfidence != null &&
    (point.materiality.detectorConfidence == null ||
      point.materiality.detectorConfidence < conditions.requiredConfidence)
  ) {
    reasons.push(
      `Detector confidence ${point.materiality.detectorConfidence ?? 'unset'} is below required ${conditions.requiredConfidence}`,
    );
  }

  if (conditions.excludedCategories != null) {
    if (conditions.excludedCategories.includes(point.category)) {
      reasons.push(`Category '${point.category}' is excluded from delegation`);
    }
  }

  // requiresPriorHumanResolution is a runtime check that requires
  // querying historical data — the caller is responsible for verifying this.

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// Transition guard functions
// ---------------------------------------------------------------------------

/**
 * Check whether a candidate can be promoted to pending.
 */
export function canPromote(point: JudgmentPoint): GuardResult {
  const reasons: string[] = [];

  if (point.status !== 'candidate') {
    reasons.push(`Point status is '${point.status}', expected 'candidate'`);
  }

  if (point.materiality.dimensions == null) {
    reasons.push('Materiality assessment dimensions are missing');
  }

  // Must meet promotion threshold or have hard trigger.
  const hasHardTrigger = point.trigger.hardTrigger != null || point.materiality.hardTrigger != null;
  const level = point.materiality.interventionLevel;

  if (!hasHardTrigger && (level === 'trace' || level == null)) {
    // trace-level candidates may still be promoted by explicit action,
    // but the default threshold requires at least disclose.
    // Per spec, candidates with trace stay as trace records; promotion
    // requires meeting the threshold or a hard trigger.
    reasons.push(
      'Materiality score does not meet promotion threshold and no hard trigger is present',
    );
  }

  return { allowed: reasons.length === 0, reasons };
}

/**
 * Check whether a judgment point can begin investigation.
 */
export function canInvestigate(point: JudgmentPoint): GuardResult {
  const reasons: string[] = [];

  if (point.status !== 'pending' && point.status !== 'reopened') {
    reasons.push(`Point status is '${point.status}', expected 'pending' or 'reopened'`);
  }

  if (point.alternatives.length === 0) {
    reasons.push('At least one alternative must be defined before investigation');
  }

  return { allowed: reasons.length === 0, reasons };
}

/**
 * Check whether a judgment point can be resolved.
 */
export function canResolve(
  point: JudgmentPoint,
  actor: Actor,
  selectedAlternativeId: string,
  rationale: string,
): GuardResult {
  const reasons: string[] = [];

  if (point.status !== 'investigating' && point.status !== 'delegated') {
    reasons.push(`Point status is '${point.status}', expected 'investigating' or 'delegated'`);
  }

  if (!canActorResolve(actor, point.authority)) {
    reasons.push(
      `Actor '${actor.id}' (type '${actor.type}') is not authorized to resolve with authority mode '${point.authority.mode}'`,
    );
  }

  if (!point.alternatives.some((a) => a.id === selectedAlternativeId)) {
    reasons.push(
      `Selected alternative '${selectedAlternativeId}' does not exist in the point's alternatives`,
    );
  }

  if (rationale.trim().length === 0) {
    reasons.push('Rationale must not be empty');
  }

  return { allowed: reasons.length === 0, reasons };
}

/**
 * Check whether a judgment point can be dismissed.
 */
export function canDismiss(
  point: JudgmentPoint,
  interventionLevel: InterventionLevel,
): GuardResult {
  const reasons: string[] = [];

  if (point.status !== 'pending' && point.status !== 'reopened') {
    reasons.push(`Point status is '${point.status}', expected 'pending' or 'reopened'`);
  }

  if (interventionLevel === 'require-investigation') {
    reasons.push(
      'Judgment Points with require-investigation intervention level cannot be dismissed without first completing investigation',
    );
  }

  return { allowed: reasons.length === 0, reasons };
}

/**
 * Check whether a judgment point can be delegated.
 */
export function canDelegate(
  point: JudgmentPoint,
  delegationConditions: DelegationConditions,
): GuardResult {
  const reasons: string[] = [];

  if (point.status !== 'pending') {
    reasons.push(`Point status is '${point.status}', expected 'pending'`);
  }

  const conditionResult = validateDelegationConditions(point, delegationConditions);
  reasons.push(...conditionResult.reasons);

  return { allowed: reasons.length === 0, reasons };
}

/**
 * Check whether a judgment point can be marked stale.
 */
export function canMarkStale(point: JudgmentPoint, reason: string): GuardResult {
  const reasons: string[] = [];

  if (point.status !== 'resolved') {
    reasons.push(`Point status is '${point.status}', expected 'resolved'`);
  }

  if (reason.trim().length === 0) {
    reasons.push('Staleness reason must not be empty');
  }

  return { allowed: reasons.length === 0, reasons };
}

/**
 * Check whether a judgment point can be reopened.
 */
export function canReopen(point: JudgmentPoint, reason: string): GuardResult {
  const reasons: string[] = [];

  if (point.status !== 'resolved' && point.status !== 'stale' && point.status !== 'dismissed') {
    reasons.push(`Point status is '${point.status}', expected 'resolved', 'stale', or 'dismissed'`);
  }

  if (reason.trim().length === 0) {
    reasons.push('Reopen reason must not be empty');
  }

  return { allowed: reasons.length === 0, reasons };
}
