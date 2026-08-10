"""Tests for judgment_core.staleness — staleness detection and propagation."""

from __future__ import annotations

from datetime import UTC, datetime

from judgment_core.dependency_graph import DependencyGraph
from judgment_core.staleness import check_staleness, propagate_staleness
from judgment_core.types import JudgmentPoint

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_NOW = datetime.now(UTC).isoformat()

_BASE_POINT_DATA = {
    "id": "jp-001",
    "projectId": "proj-001",
    "category": "assumption",
    "question": "Which model to use?",
    "context": "We need a regression model.",
    "trigger": {"source": "agent", "description": "Detected assumption"},
    "materiality": {
        "score": 6,
        "dimensions": {
            "methodologicalDiscretion": 1,
            "downstreamInfluence": 1,
            "uncertainty": 1,
            "consequence": 1,
            "reversibility": 1,
            "accountabilityRequirement": 1,
        },
    },
    "alternatives": [],
    "evidenceRefs": [],
    "affectedArtifactIds": [],
    "authority": {"mode": "collaborative"},
    "validityConditions": [],
    "reopenConditions": [],
    "revisionHistory": [],
    "createdAt": _NOW,
    "updatedAt": _NOW,
}


def _make_point(
    *,
    status: str = "resolved",
    affected_artifact_ids: list[str] | None = None,
    evidence_refs: list[dict] | None = None,
) -> JudgmentPoint:
    data = {**_BASE_POINT_DATA, "status": status}
    if affected_artifact_ids is not None:
        data["affectedArtifactIds"] = affected_artifact_ids
    if evidence_refs is not None:
        data["evidenceRefs"] = evidence_refs
    return JudgmentPoint.model_validate(data)


# ---------------------------------------------------------------------------
# Tests — check_staleness
# ---------------------------------------------------------------------------


class TestCheckStalenessAffectedArtifact:
    def test_resolved_with_changed_affected_artifact_is_stale(self) -> None:
        point = _make_point(
            status="resolved",
            affected_artifact_ids=["cell-1", "cell-2"],
        )
        result = check_staleness(point, ["cell-1"])

        assert result.is_stale is True
        assert len(result.reasons) == 1
        assert "cell-1" in result.reasons[0]

    def test_resolved_with_no_matching_artifact_is_not_stale(self) -> None:
        point = _make_point(
            status="resolved",
            affected_artifact_ids=["cell-1"],
        )
        result = check_staleness(point, ["cell-99"])

        assert result.is_stale is False
        assert result.reasons == []


class TestCheckStalenessEvidenceRef:
    def test_resolved_with_changed_evidence_ref_is_stale(self) -> None:
        point = _make_point(
            status="resolved",
            evidence_refs=[
                {
                    "id": "ref-1",
                    "label": "Dataset A",
                    "artifactType": "dataset",
                    "relationship": "informs",
                },
            ],
        )
        result = check_staleness(point, ["ref-1"])

        assert result.is_stale is True
        assert any("ref-1" in r for r in result.reasons)


class TestCheckStalenessNonResolved:
    def test_candidate_point_is_never_stale(self) -> None:
        point = _make_point(
            status="candidate",
            affected_artifact_ids=["cell-1"],
        )
        result = check_staleness(point, ["cell-1"])

        assert result.is_stale is False

    def test_pending_point_is_never_stale(self) -> None:
        point = _make_point(
            status="pending",
            affected_artifact_ids=["cell-1"],
        )
        result = check_staleness(point, ["cell-1"])

        assert result.is_stale is False

    def test_investigating_point_is_never_stale(self) -> None:
        point = _make_point(
            status="investigating",
            affected_artifact_ids=["cell-1"],
        )
        result = check_staleness(point, ["cell-1"])

        assert result.is_stale is False


class TestCheckStalenessBothSources:
    def test_both_affected_and_evidence_changes_produce_multiple_reasons(self) -> None:
        point = _make_point(
            status="resolved",
            affected_artifact_ids=["shared-1"],
            evidence_refs=[
                {
                    "id": "shared-1",
                    "label": "Shared ref",
                    "artifactType": "cell",
                    "relationship": "informs",
                },
            ],
        )
        result = check_staleness(point, ["shared-1"])

        assert result.is_stale is True
        assert len(result.reasons) == 2


# ---------------------------------------------------------------------------
# Tests — propagate_staleness
# ---------------------------------------------------------------------------


class TestPropagateStaleness:
    def test_propagation_through_graph(self) -> None:
        graph = DependencyGraph()
        graph.add_dependency("jp-A", "jp-B")
        graph.add_dependency("jp-B", "jp-C")

        affected = propagate_staleness(graph, "jp-A")

        assert set(affected) == {"jp-B", "jp-C"}

    def test_propagation_no_dependents(self) -> None:
        graph = DependencyGraph()
        graph.add_dependency("jp-A", "jp-B")

        affected = propagate_staleness(graph, "jp-B")

        assert affected == []
