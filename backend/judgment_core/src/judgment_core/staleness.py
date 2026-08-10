"""Staleness detection and propagation.

Checks whether a resolved judgment point should be marked stale
because artifacts it depends on have changed, and propagates
staleness through a dependency graph.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from judgment_core.dependency_graph import DependencyGraph
from judgment_core.types import JudgmentPoint


@dataclass(frozen=True)
class StalenessCheckResult:
    is_stale: bool
    reasons: list[str] = field(default_factory=list)


def check_staleness(
    point: JudgmentPoint,
    changed_artifact_ids: list[str],
) -> StalenessCheckResult:
    """Check whether a resolved judgment point should be marked stale."""
    if point.status != "resolved":
        return StalenessCheckResult(is_stale=False, reasons=[])

    reasons: list[str] = []

    for artifact_id in changed_artifact_ids:
        if artifact_id in point.affected_artifact_ids:
            reasons.append(f"Affected artifact '{artifact_id}' has changed")

    for ref in point.evidence_refs or []:
        if ref.id in changed_artifact_ids:
            reasons.append(f"Evidence reference '{ref.id}' ({ref.label}) has changed")

    return StalenessCheckResult(is_stale=len(reasons) > 0, reasons=reasons)


def propagate_staleness(
    graph: DependencyGraph,
    stale_point_id: str,
) -> list[str]:
    """Return IDs of all judgment points transitively affected by a stale point."""
    return graph.get_transitive_dependents(stale_point_id)
