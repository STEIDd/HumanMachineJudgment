import { moreRestrictive } from './materiality.js';
import type {
  AuthorityMode,
  DelegationConditions,
  InterventionLevel,
  JudgmentPoint,
  JudgmentPolicy,
  PolicyRule,
  PolicyScope,
  RuleCondition,
} from './types.js';

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface PolicyRuleMatch {
  readonly policy: JudgmentPolicy;
  readonly rule: PolicyRule;
}

export interface PolicyEvalResult {
  readonly intervention: InterventionLevel;
  readonly authority?: AuthorityMode;
  readonly delegationConditions?: DelegationConditions;
  readonly matchedRules: readonly PolicyRuleMatch[];
}

// ---------------------------------------------------------------------------
// Scope matching
// ---------------------------------------------------------------------------

/**
 * Check whether a judgment point falls within a policy's scope.
 * All specified scope conditions must match (AND logic).
 * Omitted conditions match everything.
 */
export function matchesScope(point: JudgmentPoint, scope: PolicyScope): boolean {
  if (
    scope.categories != null &&
    scope.categories.length > 0 &&
    !scope.categories.includes(point.category)
  ) {
    return false;
  }

  if (
    scope.triggerSources != null &&
    scope.triggerSources.length > 0 &&
    !scope.triggerSources.includes(point.trigger.source)
  ) {
    return false;
  }

  if (scope.artifactTypes != null && scope.artifactTypes.length > 0) {
    // Check if any of the point's evidence refs or affected artifacts match.
    // Since the point schema tracks artifact IDs, not types, we check evidenceRefs.
    const pointArtifactTypes = new Set((point.evidenceRefs ?? []).map((ref) => ref.artifactType));
    const hasMatch = scope.artifactTypes.some((t) => pointArtifactTypes.has(t));
    if (!hasMatch) {
      return false;
    }
  }

  if (scope.materialityScoreMin != null && point.materiality.score < scope.materialityScoreMin) {
    return false;
  }

  if (scope.materialityScoreMax != null && point.materiality.score > scope.materialityScoreMax) {
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Rule condition matching
// ---------------------------------------------------------------------------

/**
 * Evaluate a rule condition against a judgment point.
 * All specified fields must match (AND logic).
 * Omitted fields match everything.
 */
export function evaluateRuleCondition(point: JudgmentPoint, condition: RuleCondition): boolean {
  if (
    condition.materialityScoreMin != null &&
    point.materiality.score < condition.materialityScoreMin
  ) {
    return false;
  }

  if (
    condition.materialityScoreMax != null &&
    point.materiality.score > condition.materialityScoreMax
  ) {
    return false;
  }

  if (condition.dimensionThresholds != null) {
    const dims = point.materiality.dimensions;
    const thresholds = condition.dimensionThresholds;
    // "If any specified dimension meets or exceeds its threshold, the condition matches."
    let anyMeetsThreshold = false;
    for (const [key, threshold] of Object.entries(thresholds)) {
      if (threshold != null) {
        const dimKey = key as keyof typeof dims;
        if (dims[dimKey] >= threshold) {
          anyMeetsThreshold = true;
          break;
        }
      }
    }
    // If thresholds were specified but none met, condition fails.
    const hasThresholds = Object.values(thresholds).some((v) => v != null);
    if (hasThresholds && !anyMeetsThreshold) {
      return false;
    }
  }

  if (condition.hardTrigger != null) {
    if (
      point.trigger.hardTrigger !== condition.hardTrigger &&
      point.materiality.hardTrigger !== condition.hardTrigger
    ) {
      return false;
    }
  }

  if (
    condition.categories != null &&
    condition.categories.length > 0 &&
    !condition.categories.includes(point.category)
  ) {
    return false;
  }

  // expression is not evaluated in this implementation (spec says implementations may define their own DSL)

  return true;
}

// ---------------------------------------------------------------------------
// Single policy evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a single policy against a judgment point.
 * Returns the first matching rule, or null if no rule matches.
 */
export function evaluatePolicy(point: JudgmentPoint, policy: JudgmentPolicy): PolicyRule | null {
  if (!policy.enabled) {
    return null;
  }

  if (!matchesScope(point, policy.scope)) {
    return null;
  }

  for (const rule of policy.rules) {
    if (evaluateRuleCondition(point, rule.condition)) {
      return rule;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Multi-policy evaluation
// ---------------------------------------------------------------------------

const AUTHORITY_RANK: Record<AuthorityMode, number> = {
  rule: 0,
  delegated: 1,
  collaborative: 2,
  human: 3,
};

function moreRestrictiveAuthority(a: AuthorityMode, b: AuthorityMode): AuthorityMode {
  return AUTHORITY_RANK[a] >= AUTHORITY_RANK[b] ? a : b;
}

/**
 * Evaluate all applicable policies for a judgment point and resolve conflicts.
 *
 * Policies are sorted by priority (lower = higher precedence).
 * At each precedence level, the most restrictive intervention and authority win.
 * Delegation is disallowed if any matching policy disallows it.
 */
export function evaluatePolicies(
  point: JudgmentPoint,
  policies: readonly JudgmentPolicy[],
): PolicyEvalResult {
  // Gather all matching rules.
  const matches: PolicyRuleMatch[] = [];

  for (const policy of policies) {
    const rule = evaluatePolicy(point, policy);
    if (rule != null) {
      matches.push({ policy, rule });
    }
  }

  if (matches.length === 0) {
    // Fall back to score-based defaults (caller is responsible for applying default thresholds).
    return {
      intervention: point.materiality.interventionLevel ?? 'trace',
      matchedRules: [],
    };
  }

  return resolveConflicts(matches);
}

/**
 * Resolve conflicts among matching policy rules.
 *
 * - Sorted by policy priority (lower = higher precedence).
 * - At equal precedence, most restrictive intervention and authority win.
 * - Any delegation disallow overrides all.
 */
export function resolveConflicts(matches: readonly PolicyRuleMatch[]): PolicyEvalResult {
  // Sort by priority (ascending = higher precedence first).
  const sorted = [...matches].sort((a, b) => a.policy.priority - b.policy.priority);

  const first = sorted[0];
  if (first == null) {
    return { intervention: 'trace', matchedRules: [] };
  }

  let intervention: InterventionLevel = first.rule.intervention;
  let authority: AuthorityMode | undefined = first.rule.authorityOverride?.mode;
  let delegationConditions: DelegationConditions | undefined = first.rule.delegationConditions;
  let delegationAllowed = delegationConditions?.allowed ?? true;

  for (let i = 1; i < sorted.length; i++) {
    const match = sorted[i];
    if (match == null) continue;
    const rule = match.rule;

    // Same or lower priority: apply most-restrictive-wins.
    intervention = moreRestrictive(intervention, rule.intervention);

    if (rule.authorityOverride?.mode != null) {
      authority =
        authority != null
          ? moreRestrictiveAuthority(authority, rule.authorityOverride.mode)
          : rule.authorityOverride.mode;
    }

    if (rule.delegationConditions != null) {
      if (rule.delegationConditions.allowed === false) {
        delegationAllowed = false;
      }
      // Merge: most restrictive maxMaterialityScore, highest requiredConfidence, union of excludedCategories.
      delegationConditions = mergeDelegationConditions(
        delegationConditions,
        rule.delegationConditions,
      );
    }
  }

  if (delegationConditions != null && !delegationAllowed) {
    delegationConditions = { ...delegationConditions, allowed: false };
  }

  return {
    intervention,
    authority,
    delegationConditions,
    matchedRules: sorted,
  };
}

function mergeDelegationConditions(
  a: DelegationConditions | undefined,
  b: DelegationConditions,
): DelegationConditions {
  if (a == null) return b;

  const maxScore =
    a.maxMaterialityScore != null && b.maxMaterialityScore != null
      ? Math.min(a.maxMaterialityScore, b.maxMaterialityScore)
      : (a.maxMaterialityScore ?? b.maxMaterialityScore);

  const reqConf =
    a.requiredConfidence != null && b.requiredConfidence != null
      ? Math.max(a.requiredConfidence, b.requiredConfidence)
      : (a.requiredConfidence ?? b.requiredConfidence);

  const excludedSet = new Set([...(a.excludedCategories ?? []), ...(b.excludedCategories ?? [])]);

  return {
    allowed: (a.allowed ?? true) && (b.allowed ?? true),
    maxMaterialityScore: maxScore,
    requiredConfidence: reqConf,
    excludedCategories: excludedSet.size > 0 ? Array.from(excludedSet) : undefined,
    requiresPriorHumanResolution:
      (a.requiresPriorHumanResolution ?? false) || (b.requiresPriorHumanResolution ?? false),
    auditRequired: (a.auditRequired ?? true) || (b.auditRequired ?? true),
  };
}
