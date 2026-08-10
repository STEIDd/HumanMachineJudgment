"""Tests for the judgment_langgraph adapter.

These tests cover the state type, node factories, interrupt payload
construction, and graph assembly.  Full end-to-end interrupt/resume
testing requires a LangGraph checkpointer and is exercised in the
integration tests that run the compiled graph.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import patch

import pytest

from judgment_core.detection import (
    KeywordDetectionRule,
)
from judgment_core.types import (
    InterventionLevel,
    JudgmentCategory,
    JudgmentPoint,
)
from judgment_langgraph.graph import create_judgment_graph
from judgment_langgraph.interrupt import build_interrupt_payload, judgment_interrupt
from judgment_langgraph.nodes import (
    create_detection_node,
    create_judgment_check_node,
    create_resolution_node,
)
from judgment_langgraph.state import JudgmentState
from judgment_sdk import JudgmentClient
from judgment_storage_memory import MemoryStorage

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def storage() -> MemoryStorage:
    return MemoryStorage()


@pytest.fixture
def client(storage: MemoryStorage) -> JudgmentClient:
    return JudgmentClient(storage)


def _make_judgment_point(
    *,
    point_id: str = "jp-1",
    intervention_level: str = "pause",
    authority_mode: str = "human",
) -> JudgmentPoint:
    """Build a minimal JudgmentPoint for testing."""
    now = datetime.now(UTC).isoformat()
    return JudgmentPoint.model_validate(
        {
            "id": point_id,
            "projectId": "proj-1",
            "category": "method",
            "question": "Which turbulence model should be used?",
            "context": "Selecting a turbulence model for CFD simulation",
            "trigger": {"source": "agent", "description": "Agent detected choice"},
            "materiality": {
                "score": 10,
                "dimensions": {
                    "methodologicalDiscretion": 2,
                    "downstreamInfluence": 2,
                    "uncertainty": 1,
                    "consequence": 2,
                    "reversibility": 1,
                    "accountabilityRequirement": 2,
                },
                "interventionLevel": intervention_level,
            },
            "status": "pending",
            "alternatives": [
                {"id": "alt-1", "label": "k-epsilon", "description": "Standard k-epsilon model"},
                {"id": "alt-2", "label": "k-omega SST", "description": "Menter SST model"},
            ],
            "evidenceRefs": [],
            "affectedArtifactIds": [],
            "authority": {"mode": authority_mode},
            "validityConditions": [],
            "reopenConditions": [],
            "revisionHistory": [],
            "createdAt": now,
            "updatedAt": now,
        }
    )


# ---------------------------------------------------------------------------
# 1. JudgmentState type
# ---------------------------------------------------------------------------


class TestJudgmentState:
    """Verify the JudgmentState TypedDict has expected fields."""

    def test_state_accepts_all_fields(self) -> None:
        state: JudgmentState = {
            "messages": [],
            "judgment_points": [],
            "pending_judgment_ids": [],
            "resolved_judgment_ids": [],
            "last_detection_result": None,
        }
        assert state["pending_judgment_ids"] == []
        assert state["resolved_judgment_ids"] == []
        assert state["last_detection_result"] is None

    def test_state_accepts_partial_fields(self) -> None:
        """total=False means all keys are optional at runtime."""
        state: JudgmentState = {"messages": [{"action": "test"}]}
        assert len(state["messages"]) == 1

    def test_state_accepts_empty_dict(self) -> None:
        state: JudgmentState = {}
        assert isinstance(state, dict)


# ---------------------------------------------------------------------------
# 2. Detection node
# ---------------------------------------------------------------------------


class TestDetectionNode:
    """Tests for the detection node factory and its runtime behaviour."""

    def test_factory_returns_callable(self, client: JudgmentClient) -> None:
        node = create_detection_node(client)
        assert callable(node)

    async def test_empty_messages_returns_none(self, client: JudgmentClient) -> None:
        node = create_detection_node(client)
        result = await node({"messages": []})
        assert result["last_detection_result"] is None

    async def test_missing_messages_returns_none(self, client: JudgmentClient) -> None:
        node = create_detection_node(client)
        result = await node({})
        assert result["last_detection_result"] is None

    async def test_processes_message_without_rules(self, client: JudgmentClient) -> None:
        node = create_detection_node(client)
        state: dict[str, Any] = {
            "messages": [{"action": "test action", "content": "test description"}]
        }
        result = await node(state)
        assert "last_detection_result" in result
        detection = result["last_detection_result"]
        assert detection["has_detections"] is False
        assert detection["results"] == []

    async def test_processes_message_with_matching_rule(self, client: JudgmentClient) -> None:
        rule = KeywordDetectionRule(
            rule_id="kw-delete",
            keywords=["delete"],
            category=JudgmentCategory.data,
            intervention=InterventionLevel.pause,
        )
        node = create_detection_node(client, rules=[rule])
        state: dict[str, Any] = {
            "messages": [{"action": "delete file", "content": "removing data"}]
        }
        result = await node(state)
        detection = result["last_detection_result"]
        assert detection["has_detections"] is True
        assert len(detection["results"]) == 1
        assert detection["results"][0]["rule_id"] == "kw-delete"

    async def test_uses_last_message_only(self, client: JudgmentClient) -> None:
        rule = KeywordDetectionRule(
            rule_id="kw-delete",
            keywords=["delete"],
            category=JudgmentCategory.data,
        )
        node = create_detection_node(client, rules=[rule])
        state: dict[str, Any] = {
            "messages": [
                {"action": "delete file", "content": "removing data"},
                {"action": "read file", "content": "loading data"},
            ]
        }
        result = await node(state)
        detection = result["last_detection_result"]
        # Last message has no "delete" keyword
        assert detection["has_detections"] is False

    async def test_detection_result_structure(self, client: JudgmentClient) -> None:
        rule = KeywordDetectionRule(
            rule_id="kw-test",
            keywords=["safety factor"],
            category=JudgmentCategory.parameter,
            intervention=InterventionLevel.pause,
        )
        node = create_detection_node(client, rules=[rule])
        state: dict[str, Any] = {
            "messages": [{"action": "set", "content": "choosing safety factor value"}]
        }
        result = await node(state)
        detection = result["last_detection_result"]
        assert detection["has_detections"] is True
        r = detection["results"][0]
        assert "rule_id" in r
        assert "reason" in r
        assert "confidence" in r
        assert r["confidence"] == 1.0


# ---------------------------------------------------------------------------
# 3. Judgment check node
# ---------------------------------------------------------------------------


class TestJudgmentCheckNode:
    """Tests for the judgment check node factory."""

    def test_factory_returns_callable(self, client: JudgmentClient) -> None:
        node = create_judgment_check_node(client)
        assert callable(node)

    async def test_empty_pending_ids_returns_empty(self, client: JudgmentClient) -> None:
        node = create_judgment_check_node(client)
        result = await node({"pending_judgment_ids": []})
        assert result == {}

    async def test_missing_pending_ids_returns_empty(self, client: JudgmentClient) -> None:
        node = create_judgment_check_node(client)
        result = await node({})
        assert result == {}

    async def test_nonexistent_point_id_skipped(self, client: JudgmentClient) -> None:
        node = create_judgment_check_node(client)
        result = await node({"pending_judgment_ids": ["nonexistent-id"]})
        assert result == {}


# ---------------------------------------------------------------------------
# 4. Resolution node
# ---------------------------------------------------------------------------


class TestResolutionNode:
    """Tests for the resolution node factory."""

    def test_factory_returns_callable(self, client: JudgmentClient) -> None:
        node = create_resolution_node(client)
        assert callable(node)

    async def test_passes_through_resolved_ids(self, client: JudgmentClient) -> None:
        node = create_resolution_node(client)
        result = await node({"resolved_judgment_ids": ["jp-1", "jp-2"]})
        assert result["resolved_judgment_ids"] == ["jp-1", "jp-2"]

    async def test_empty_resolved_ids(self, client: JudgmentClient) -> None:
        node = create_resolution_node(client)
        result = await node({})
        assert result["resolved_judgment_ids"] == []


# ---------------------------------------------------------------------------
# 5. Interrupt payload builder
# ---------------------------------------------------------------------------


class TestBuildInterruptPayload:
    """Test the pure payload builder (no graph context required)."""

    def test_payload_structure(self) -> None:
        point = _make_judgment_point()
        payload = build_interrupt_payload(point)

        assert payload["type"] == "judgment-point"
        assert payload["judgment_point_id"] == "jp-1"
        assert payload["question"] == "Which turbulence model should be used?"
        assert len(payload["alternatives"]) == 2
        assert payload["authority_mode"] == "human"
        assert payload["intervention_level"] == "pause"

    def test_payload_alternatives_shape(self) -> None:
        point = _make_judgment_point()
        payload = build_interrupt_payload(point)

        alt = payload["alternatives"][0]
        assert "id" in alt
        assert "label" in alt
        assert "description" in alt
        assert alt["id"] == "alt-1"
        assert alt["label"] == "k-epsilon"

    def test_payload_with_collaborative_authority(self) -> None:
        point = _make_judgment_point(authority_mode="collaborative")
        payload = build_interrupt_payload(point)
        assert payload["authority_mode"] == "collaborative"

    def test_payload_with_require_investigation(self) -> None:
        point = _make_judgment_point(intervention_level="require-investigation")
        payload = build_interrupt_payload(point)
        assert payload["intervention_level"] == "require-investigation"

    def test_payload_with_trace_level(self) -> None:
        point = _make_judgment_point(intervention_level="trace")
        payload = build_interrupt_payload(point)
        assert payload["intervention_level"] == "trace"


# ---------------------------------------------------------------------------
# 6. judgment_interrupt wrapper
# ---------------------------------------------------------------------------


class TestJudgmentInterrupt:
    """Test that judgment_interrupt delegates to langgraph.types.interrupt."""

    def test_calls_interrupt_with_correct_payload(self) -> None:
        point = _make_judgment_point()
        expected_payload = build_interrupt_payload(point)

        with patch("langgraph.types.interrupt") as mock_interrupt:
            mock_interrupt.return_value = {"chosen": "alt-1"}
            result = judgment_interrupt(point)

        mock_interrupt.assert_called_once_with(expected_payload)
        assert result == {"chosen": "alt-1"}


# ---------------------------------------------------------------------------
# 7. Graph factory
# ---------------------------------------------------------------------------


class TestCreateJudgmentGraph:
    """Tests for the pre-built graph factory."""

    def test_graph_creation_succeeds(self, client: JudgmentClient) -> None:
        graph = create_judgment_graph(client)
        assert graph is not None

    def test_graph_has_detect_node(self, client: JudgmentClient) -> None:
        graph = create_judgment_graph(client)
        assert "detect" in graph.nodes

    def test_graph_has_check_judgments_node(self, client: JudgmentClient) -> None:
        graph = create_judgment_graph(client)
        assert "check_judgments" in graph.nodes

    def test_graph_has_two_nodes(self, client: JudgmentClient) -> None:
        graph = create_judgment_graph(client)
        assert len(graph.nodes) == 2

    def test_graph_with_custom_rules(self, client: JudgmentClient) -> None:
        rules = [
            KeywordDetectionRule(
                rule_id="custom",
                keywords=["deploy"],
                category=JudgmentCategory.method,
            )
        ]
        graph = create_judgment_graph(client, detection_rules=rules)
        assert graph is not None
        assert "detect" in graph.nodes

    def test_graph_compiles(self, client: JudgmentClient) -> None:
        """Verify the graph can be compiled with InMemorySaver."""
        from langgraph.checkpoint.memory import InMemorySaver

        graph = create_judgment_graph(client)
        compiled = graph.compile(checkpointer=InMemorySaver())
        assert compiled is not None

    def test_graph_edges_exist(self, client: JudgmentClient) -> None:
        graph = create_judgment_graph(client)
        # The builder tracks edges; verify at least detect -> check_judgments
        # is wired up by checking that edges is non-empty.
        assert len(graph.edges) > 0


# ---------------------------------------------------------------------------
# 8. Package-level imports
# ---------------------------------------------------------------------------


class TestPackageExports:
    """Verify the public API is importable from the top-level package."""

    def test_import_judgment_state(self) -> None:
        from judgment_langgraph import JudgmentState

        assert JudgmentState is not None

    def test_import_create_detection_node(self) -> None:
        from judgment_langgraph import create_detection_node

        assert callable(create_detection_node)

    def test_import_create_judgment_check_node(self) -> None:
        from judgment_langgraph import create_judgment_check_node

        assert callable(create_judgment_check_node)

    def test_import_create_resolution_node(self) -> None:
        from judgment_langgraph import create_resolution_node

        assert callable(create_resolution_node)

    def test_import_create_judgment_graph(self) -> None:
        from judgment_langgraph import create_judgment_graph

        assert callable(create_judgment_graph)

    def test_import_build_interrupt_payload(self) -> None:
        from judgment_langgraph import build_interrupt_payload

        assert callable(build_interrupt_payload)

    def test_import_judgment_interrupt(self) -> None:
        from judgment_langgraph import judgment_interrupt

        assert callable(judgment_interrupt)
