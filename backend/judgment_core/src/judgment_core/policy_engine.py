"""Policy engine for evaluating judgment policies against judgment points.

Policies are sorted by priority (lower = higher precedence).
At each precedence level, the most restrictive intervention and authority win.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from judgment_core.materiality import more_restrictive
from judgment_core.types import (
    AuthorityMode,
    DelegationConditions,
    InterventionLevel,
    JudgmentPoint,
    JudgmentPolicy,
    PolicyRule,
    PolicyScope,
    RuleCondition,
)

# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PolicyRuleMatch:
    policy: JudgmentPolicy
    rule: PolicyRule


@dataclass(frozen=True)
class PolicyEvalResult:
    intervention: InterventionLevel
    matched_rules: list[PolicyRuleMatch] = field(default_factory=list)
    authority: AuthorityMode | None = None
    delegation_conditions: DelegationConditions | None = None


# ---------------------------------------------------------------------------
# Scope matching
# ---------------------------------------------------------------------------


def matches_scope(point: JudgmentPoint, scope: PolicyScope) -> bool:
    """Check whether a judgment point falls within a policy's scope.

    All specified scope conditions must match (AND logic).
    Omitted conditions match everything.
    """
    if scope.categories and point.category.value not in [c.value for c in scope.categories]:
        return False

    if scope.trigger_sources and point.trigger.source.value not in [
        s.value for s in scope.trigger_sources
    ]:
        return False

    if scope.artifact_types:
        point_artifact_types = {ref.artifact_type.value for ref in (point.evidence_refs or [])}
        if not any(t.value in point_artifact_types for t in scope.artifact_types):
            return False

    if (
        scope.materiality_score_min is not None
        and point.materiality.score < scope.materiality_score_min
    ):
        return False

    return not (
        scope.materiality_score_max is not None
        and point.materiality.score > scope.materiality_score_max
    )


# ---------------------------------------------------------------------------
# Rule condition matching
# ---------------------------------------------------------------------------


def evaluate_rule_condition(point: JudgmentPoint, condition: RuleCondition) -> bool:
    """Evaluate a rule condition against a judgment point.

    All specified fields must match (AND logic).
    Omitted fields match everything.
    """
    if (
        condition.materiality_score_min is not None
        and point.materiality.score < condition.materiality_score_min
    ):
        return False

    if (
        condition.materiality_score_max is not None
        and point.materiality.score > condition.materiality_score_max
    ):
        return False

    if condition.dimension_thresholds is not None:
        dims = point.materiality.dimensions
        thresholds = condition.dimension_thresholds
        threshold_map = {
            "methodological_discretion": thresholds.methodological_discretion,
            "downstream_influence": thresholds.downstream_influence,
            "uncertainty": thresholds.uncertainty,
            "consequence": thresholds.consequence,
            "reversibility": thresholds.reversibility,
            "accountability_requirement": thresholds.accountability_requirement,
        }
        any_meets = False
        has_thresholds = False
        for key, threshold in threshold_map.items():
            if threshold is not None:
                has_thresholds = True
                if getattr(dims, key) >= threshold:
                    any_meets = True
                    break
        if has_thresholds and not any_meets:
            return False

    if condition.hard_trigger is not None and (
        point.trigger.hard_trigger != condition.hard_trigger
        and point.materiality.hard_trigger != condition.hard_trigger
    ):
        return False

    return not (
        condition.categories and point.category.value not in [c.value for c in condition.categories]
    )


# ---------------------------------------------------------------------------
# Single policy evaluation
# ---------------------------------------------------------------------------


def evaluate_policy(point: JudgmentPoint, policy: JudgmentPolicy) -> PolicyRule | None:
    """Evaluate a single policy against a judgment point.

    Returns the first matching rule, or None if no rule matches.
    """
    if not policy.enabled:
        return None

    if not matches_scope(point, policy.scope):
        return None

    for rule in policy.rules:
        if evaluate_rule_condition(point, rule.condition):
            return rule

    return None


# ---------------------------------------------------------------------------
# Multi-policy evaluation
# ---------------------------------------------------------------------------

_AUTHORITY_RANK: dict[AuthorityMode, int] = {
    AuthorityMode.rule: 0,
    AuthorityMode.delegated: 1,
    AuthorityMode.collaborative: 2,
    AuthorityMode.human: 3,
}


def _more_restrictive_authority(a: AuthorityMode, b: AuthorityMode) -> AuthorityMode:
    return a if _AUTHORITY_RANK[a] >= _AUTHORITY_RANK[b] else b


def evaluate_policies(
    point: JudgmentPoint,
    policies: list[JudgmentPolicy],
) -> PolicyEvalResult:
    """Evaluate all applicable policies for a judgment point and resolve conflicts.

    Policies are sorted by priority (lower = higher precedence).
    At each precedence level, the most restrictive intervention and authority win.
    Delegation is disallowed if any matching policy disallows it.
    """
    matches: list[PolicyRuleMatch] = []

    for policy in policies:
        rule = evaluate_policy(point, policy)
        if rule is not None:
            matches.append(PolicyRuleMatch(policy=policy, rule=rule))

    if not matches:
        return PolicyEvalResult(
            intervention=point.materiality.intervention_level or InterventionLevel.trace,
            matched_rules=[],
        )

    return resolve_conflicts(matches)


def resolve_conflicts(matches: list[PolicyRuleMatch]) -> PolicyEvalResult:
    """Resolve conflicts among matching policy rules.

    - Sorted by policy priority (ascending = higher precedence first).
    - At equal precedence, most restrictive intervention and authority win.
    - Any delegation disallow overrides all.
    """
    sorted_matches = sorted(matches, key=lambda m: m.policy.priority)

    if not sorted_matches:
        return PolicyEvalResult(intervention=InterventionLevel.trace, matched_rules=[])

    first = sorted_matches[0]
    intervention = InterventionLevel(first.rule.intervention.value)
    authority: AuthorityMode | None = (
        AuthorityMode(first.rule.authority_override.mode.value)
        if first.rule.authority_override
        else None
    )
    delegation_conditions = first.rule.delegation_conditions
    delegation_allowed = delegation_conditions.allowed if delegation_conditions else True

    for match in sorted_matches[1:]:
        rule = match.rule
        rule_intervention = InterventionLevel(rule.intervention.value)
        intervention = more_restrictive(intervention, rule_intervention)

        if rule.authority_override and rule.authority_override.mode:
            rule_authority = AuthorityMode(rule.authority_override.mode.value)
            authority = (
                _more_restrictive_authority(authority, rule_authority)
                if authority is not None
                else rule_authority
            )

        if rule.delegation_conditions is not None:
            if rule.delegation_conditions.allowed is False:
                delegation_allowed = False
            delegation_conditions = _merge_delegation_conditions(
                delegation_conditions, rule.delegation_conditions
            )

    if delegation_conditions is not None and not delegation_allowed:
        delegation_conditions = delegation_conditions.model_copy(update={"allowed": False})

    return PolicyEvalResult(
        intervention=intervention,
        authority=authority,
        delegation_conditions=delegation_conditions,
        matched_rules=sorted_matches,
    )


def _merge_delegation_conditions(
    a: DelegationConditions | None,
    b: DelegationConditions,
) -> DelegationConditions:
    if a is None:
        return b

    max_score: float | None
    if a.max_materiality_score is not None and b.max_materiality_score is not None:
        max_score = min(a.max_materiality_score, b.max_materiality_score)
    else:
        max_score = (
            a.max_materiality_score
            if a.max_materiality_score is not None
            else b.max_materiality_score
        )

    req_conf: float | None
    if a.required_confidence is not None and b.required_confidence is not None:
        req_conf = max(a.required_confidence, b.required_confidence)
    else:
        req_conf = (
            a.required_confidence if a.required_confidence is not None else b.required_confidence
        )

    excluded = set((a.excluded_categories or []) + (b.excluded_categories or []))

    return DelegationConditions(
        allowed=(a.allowed if a.allowed is not None else True)
        and (b.allowed if b.allowed is not None else True),
        max_materiality_score=max_score,
        required_confidence=req_conf,
        excluded_categories=list(excluded) if excluded else None,
        requires_prior_human_resolution=(a.requires_prior_human_resolution or False)
        or (b.requires_prior_human_resolution or False),
        audit_required=(a.audit_required if a.audit_required is not None else True)
        or (b.audit_required if b.audit_required is not None else True),
    )
