"""Tests for the Judgment MCP server.

Covers server creation, tool registration, resource registration,
tool invocation via ``MCPServer.call_tool()``, resource reads via
``MCPServer.read_resource()``, and MRTR enforcement.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime

import pytest

from judgment_core.types import (
    Actor,
)
from judgment_mcp.server import create_judgment_mcp_server
from judgment_sdk import CreateCandidateParams, JudgmentClient
from judgment_storage_memory import MemoryStorage

# ---------------------------------------------------------------------------
# Shared constants
# ---------------------------------------------------------------------------

USER_ACTOR = Actor(id="user-1", type="user")
AGENT_ACTOR = Actor(id="agent-1", type="agent")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _candidate_params(
    *,
    project_id: str = "proj-1",
    intervention_level: str = "pause",
    alternatives: list[dict] | None = None,
    authority: dict | None = None,
) -> CreateCandidateParams:
    return CreateCandidateParams(
        project_id=project_id,
        category="method",
        question="Which model to use?",
        context="Selecting a turbulence model",
        trigger={"source": "agent", "description": "Agent detected choice"},
        materiality={
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
        alternatives=alternatives
        if alternatives is not None
        else [
            {"id": "alt-1", "label": "k-epsilon", "description": "Standard k-epsilon model"},
            {"id": "alt-2", "label": "k-omega SST", "description": "Menter SST model"},
        ],
        authority=authority if authority is not None else {"mode": "human"},
    )


async def _create_candidate_via_client(
    client: JudgmentClient,
    **kwargs,
):
    """Create a candidate directly via the JudgmentClient (bypasses MCP layer)."""
    params = _candidate_params(**kwargs)
    return await client.create_candidate(params, USER_ACTOR)


def _extract_tool_text(result) -> str:
    """Extract the text content from a CallToolResult."""
    return result.content[0].text


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def storage():
    return MemoryStorage()


@pytest.fixture
def mcp_server(storage):
    return create_judgment_mcp_server(storage)


@pytest.fixture
def client(storage):
    return JudgmentClient(storage)


# ===========================================================================
# Server creation tests
# ===========================================================================


class TestServerCreation:
    def test_server_is_created(self, mcp_server):
        assert mcp_server is not None

    def test_server_has_correct_name(self, mcp_server):
        assert mcp_server.name == "judgment"

    def test_custom_name(self, storage):
        mcp = create_judgment_mcp_server(storage, name="custom-judgment")
        assert mcp.name == "custom-judgment"


# ===========================================================================
# Tool registration tests
# ===========================================================================


class TestToolRegistration:
    async def test_all_tools_registered(self, mcp_server):
        tools = await mcp_server.list_tools()
        tool_names = {t.name for t in tools}
        expected = {
            "judgment_propose",
            "judgment_assess_materiality",
            "judgment_add_alternative",
            "judgment_resolve",
            "judgment_dismiss",
            "judgment_reopen",
            "judgment_link_artifact",
            "judgment_request_comparison",
        }
        assert expected == tool_names

    async def test_tool_count(self, mcp_server):
        tools = await mcp_server.list_tools()
        assert len(tools) == 8

    async def test_tools_have_descriptions(self, mcp_server):
        tools = await mcp_server.list_tools()
        for tool in tools:
            assert tool.description is not None
            assert len(tool.description) > 0


# ===========================================================================
# Resource registration tests
# ===========================================================================


class TestResourceRegistration:
    async def test_resource_templates_registered(self, mcp_server):
        templates = await mcp_server.list_resource_templates()
        template_uris = {t.uri_template for t in templates}
        expected = {
            "judgment://projects/{project_id}/policies",
            "judgment://projects/{project_id}/judgments",
            "judgment://projects/{project_id}/judgments/{judgment_id}",
            "judgment://projects/{project_id}/judgments/{judgment_id}/events",
        }
        assert expected == template_uris

    async def test_resource_template_count(self, mcp_server):
        templates = await mcp_server.list_resource_templates()
        assert len(templates) == 4


# ===========================================================================
# Tool invocation tests: judgment_propose
# ===========================================================================


class TestJudgmentPropose:
    async def test_propose_creates_candidate(self, mcp_server):
        result = await mcp_server.call_tool(
            "judgment_propose",
            {
                "project_id": "proj-1",
                "category": "method",
                "question": "Which model to use?",
                "context": "Selecting a turbulence model",
                "trigger_source": "agent",
                "trigger_description": "Agent detected choice",
                "actor_id": "user-1",
                "actor_type": "user",
            },
        )
        text = _extract_tool_text(result)
        data = json.loads(text)
        assert data["status"] == "candidate"
        assert data["category"] == "method"
        assert data["question"] == "Which model to use?"

    async def test_propose_assigns_id(self, mcp_server):
        result = await mcp_server.call_tool(
            "judgment_propose",
            {
                "project_id": "proj-1",
                "category": "data",
                "question": "Which dataset?",
                "context": "Data selection",
                "trigger_source": "user",
                "trigger_description": "User requested",
                "actor_id": "user-1",
                "actor_type": "user",
            },
        )
        data = json.loads(_extract_tool_text(result))
        assert "id" in data
        assert len(data["id"]) > 0


# ===========================================================================
# Tool invocation tests: judgment_assess_materiality
# ===========================================================================


class TestJudgmentAssessMateriality:
    async def test_assess_materiality_returns_score(self, mcp_server, client):
        candidate = await _create_candidate_via_client(client)
        result = await mcp_server.call_tool(
            "judgment_assess_materiality",
            {
                "point_id": candidate.id,
                "methodological_discretion": 2,
                "downstream_influence": 2,
                "uncertainty": 1,
                "consequence": 2,
                "reversibility": 1,
                "accountability_requirement": 2,
                "actor_id": "user-1",
                "actor_type": "user",
            },
        )
        data = json.loads(_extract_tool_text(result))
        assert data["score"] == 10
        assert "interventionLevel" in data

    async def test_assess_materiality_trace_level(self, mcp_server, client):
        candidate = await _create_candidate_via_client(client)
        result = await mcp_server.call_tool(
            "judgment_assess_materiality",
            {
                "point_id": candidate.id,
                "methodological_discretion": 0,
                "downstream_influence": 0,
                "uncertainty": 0,
                "consequence": 0,
                "reversibility": 0,
                "accountability_requirement": 0,
                "actor_id": "user-1",
                "actor_type": "user",
            },
        )
        data = json.loads(_extract_tool_text(result))
        assert data["score"] == 0
        assert data["interventionLevel"] == "trace"

    async def test_assess_materiality_with_hard_trigger(self, mcp_server, client):
        candidate = await _create_candidate_via_client(client)
        result = await mcp_server.call_tool(
            "judgment_assess_materiality",
            {
                "point_id": candidate.id,
                "methodological_discretion": 1,
                "downstream_influence": 0,
                "uncertainty": 0,
                "consequence": 0,
                "reversibility": 0,
                "accountability_requirement": 0,
                "hard_trigger": "safety-critical",
                "actor_id": "user-1",
                "actor_type": "user",
            },
        )
        data = json.loads(_extract_tool_text(result))
        assert data["hardTrigger"] == "safety-critical"


# ===========================================================================
# Tool invocation tests: judgment_add_alternative
# ===========================================================================


class TestJudgmentAddAlternative:
    async def test_add_alternative(self, mcp_server, client):
        candidate = await _create_candidate_via_client(client)
        result = await mcp_server.call_tool(
            "judgment_add_alternative",
            {
                "point_id": candidate.id,
                "alternative_id": "alt-3",
                "label": "SA model",
                "description": "Spalart-Allmaras model",
                "actor_id": "user-1",
                "actor_type": "user",
            },
        )
        data = json.loads(_extract_tool_text(result))
        alt_ids = [a["id"] for a in data["alternatives"]]
        assert "alt-3" in alt_ids
        assert len(data["alternatives"]) == 3


# ===========================================================================
# Tool invocation tests: judgment_resolve (including MRTR)
# ===========================================================================


class TestJudgmentResolve:
    async def test_resolve_by_user(self, mcp_server, client):
        """A user can resolve a point with human authority."""
        candidate = await _create_candidate_via_client(client, authority={"mode": "human"})
        await client.promote(candidate.id, USER_ACTOR)
        await client.start_investigation(candidate.id, USER_ACTOR)

        result = await mcp_server.call_tool(
            "judgment_resolve",
            {
                "point_id": candidate.id,
                "selected_alternative_id": "alt-1",
                "rationale": "k-epsilon is validated for this flow",
                "actor_id": "user-1",
                "actor_type": "user",
            },
        )
        data = json.loads(_extract_tool_text(result))
        assert data["status"] == "resolved"
        assert data["resolution"]["selectedAlternativeId"] == "alt-1"

    async def test_mrtr_agent_blocked_human_authority(self, mcp_server, client):
        """An agent cannot resolve a point with 'human' authority (MRTR pattern)."""
        candidate = await _create_candidate_via_client(client, authority={"mode": "human"})
        await client.promote(candidate.id, USER_ACTOR)
        await client.start_investigation(candidate.id, USER_ACTOR)

        result = await mcp_server.call_tool(
            "judgment_resolve",
            {
                "point_id": candidate.id,
                "selected_alternative_id": "alt-1",
                "rationale": "Agent trying to resolve",
                "actor_id": "agent-1",
                "actor_type": "agent",
            },
        )
        data = json.loads(_extract_tool_text(result))
        assert data["error"] == "MRTR_HUMAN_REQUIRED"
        assert "human input" in data["message"].lower()
        assert data["authority_mode"] == "human"

    async def test_mrtr_agent_blocked_collaborative_authority(self, mcp_server, client):
        """An agent cannot resolve a point with 'collaborative' authority (MRTR)."""
        candidate = await _create_candidate_via_client(client, authority={"mode": "collaborative"})
        await client.promote(candidate.id, USER_ACTOR)
        await client.start_investigation(candidate.id, USER_ACTOR)

        result = await mcp_server.call_tool(
            "judgment_resolve",
            {
                "point_id": candidate.id,
                "selected_alternative_id": "alt-1",
                "rationale": "Agent trying to resolve",
                "actor_id": "agent-1",
                "actor_type": "agent",
            },
        )
        data = json.loads(_extract_tool_text(result))
        assert data["error"] == "MRTR_HUMAN_REQUIRED"
        assert data["authority_mode"] == "collaborative"

    async def test_agent_can_resolve_delegated_authority(self, mcp_server, client):
        """An agent CAN resolve a point with 'delegated' authority."""
        candidate = await _create_candidate_via_client(client, authority={"mode": "human"})
        await client.promote(candidate.id, USER_ACTOR)
        # Delegate to the agent
        await client.delegate(candidate.id, "agent-1", "policy-1", USER_ACTOR)

        result = await mcp_server.call_tool(
            "judgment_resolve",
            {
                "point_id": candidate.id,
                "selected_alternative_id": "alt-1",
                "rationale": "Agent resolving delegated point",
                "actor_id": "agent-1",
                "actor_type": "agent",
            },
        )
        data = json.loads(_extract_tool_text(result))
        assert data["status"] == "resolved"


# ===========================================================================
# Tool invocation tests: judgment_dismiss
# ===========================================================================


class TestJudgmentDismiss:
    async def test_dismiss_pending_point(self, mcp_server, client):
        candidate = await _create_candidate_via_client(client)
        await client.promote(candidate.id, USER_ACTOR)

        result = await mcp_server.call_tool(
            "judgment_dismiss",
            {
                "point_id": candidate.id,
                "reason": "Not relevant to this analysis",
                "actor_id": "user-1",
                "actor_type": "user",
            },
        )
        data = json.loads(_extract_tool_text(result))
        assert data["status"] == "dismissed"


# ===========================================================================
# Tool invocation tests: judgment_reopen
# ===========================================================================


class TestJudgmentReopen:
    async def test_reopen_dismissed_point(self, mcp_server, client):
        candidate = await _create_candidate_via_client(client)
        await client.promote(candidate.id, USER_ACTOR)
        await client.dismiss(candidate.id, "Not relevant", USER_ACTOR)

        result = await mcp_server.call_tool(
            "judgment_reopen",
            {
                "point_id": candidate.id,
                "reason": "New information available",
                "actor_id": "user-1",
                "actor_type": "user",
            },
        )
        data = json.loads(_extract_tool_text(result))
        assert data["status"] == "reopened"


# ===========================================================================
# Tool invocation tests: judgment_link_artifact
# ===========================================================================


class TestJudgmentLinkArtifact:
    async def test_link_artifact(self, mcp_server, client):
        candidate = await _create_candidate_via_client(client)

        result = await mcp_server.call_tool(
            "judgment_link_artifact",
            {
                "point_id": candidate.id,
                "artifact_id": "art-1",
                "label": "Turbulence guide",
                "artifact_type": "document",
                "relationship": "informs",
                "actor_id": "user-1",
                "actor_type": "user",
            },
        )
        data = json.loads(_extract_tool_text(result))
        assert len(data["evidenceRefs"]) == 1
        assert data["evidenceRefs"][0]["id"] == "art-1"


# ===========================================================================
# Tool invocation tests: judgment_request_comparison
# ===========================================================================


class TestJudgmentRequestComparison:
    async def test_request_comparison(self, mcp_server, client):
        candidate = await _create_candidate_via_client(client)

        result = await mcp_server.call_tool(
            "judgment_request_comparison",
            {
                "point_id": candidate.id,
                "alternative_ids": "alt-1,alt-2",
                "actor_id": "user-1",
                "actor_type": "user",
                "criteria": "accuracy vs speed",
            },
        )
        data = json.loads(_extract_tool_text(result))
        assert data["id"] == candidate.id

    async def test_request_comparison_no_criteria(self, mcp_server, client):
        candidate = await _create_candidate_via_client(client)

        result = await mcp_server.call_tool(
            "judgment_request_comparison",
            {
                "point_id": candidate.id,
                "alternative_ids": "alt-1,alt-2",
                "actor_id": "user-1",
                "actor_type": "user",
            },
        )
        data = json.loads(_extract_tool_text(result))
        assert data["id"] == candidate.id


# ===========================================================================
# Resource read tests
# ===========================================================================


class TestResources:
    async def test_list_judgments_empty(self, mcp_server):
        contents = await mcp_server.read_resource("judgment://projects/proj-1/judgments")
        # read_resource returns iterable of ReadResourceContents
        items = list(contents)
        data = json.loads(items[0].content)
        assert data["items"] == []
        assert data["total"] == 0

    async def test_list_judgments_with_data(self, mcp_server, client):
        await _create_candidate_via_client(client)
        await _create_candidate_via_client(client)

        contents = await mcp_server.read_resource("judgment://projects/proj-1/judgments")
        items = list(contents)
        data = json.loads(items[0].content)
        assert data["total"] == 2
        assert len(data["items"]) == 2

    async def test_get_single_judgment(self, mcp_server, client):
        candidate = await _create_candidate_via_client(client)

        contents = await mcp_server.read_resource(
            f"judgment://projects/proj-1/judgments/{candidate.id}"
        )
        items = list(contents)
        data = json.loads(items[0].content)
        assert data["id"] == candidate.id
        assert data["status"] == "candidate"

    async def test_get_judgment_not_found(self, mcp_server):
        contents = await mcp_server.read_resource(
            "judgment://projects/proj-1/judgments/nonexistent"
        )
        items = list(contents)
        data = json.loads(items[0].content)
        assert data["error"] == "not_found"

    async def test_get_judgment_events(self, mcp_server, client):
        candidate = await _create_candidate_via_client(client)
        await client.promote(candidate.id, USER_ACTOR)

        contents = await mcp_server.read_resource(
            f"judgment://projects/proj-1/judgments/{candidate.id}/events"
        )
        items = list(contents)
        data = json.loads(items[0].content)
        assert len(data) == 2
        assert data[0]["eventType"] == "created"
        assert data[1]["eventType"] == "promoted"

    async def test_list_policies_empty(self, mcp_server):
        contents = await mcp_server.read_resource("judgment://projects/proj-1/policies")
        items = list(contents)
        data = json.loads(items[0].content)
        assert data == []

    async def test_list_policies_with_data(self, mcp_server, client):
        from judgment_core.types import JudgmentPolicy

        now = datetime.now(UTC)
        policy = JudgmentPolicy.model_validate(
            {
                "id": "policy-1",
                "projectId": "proj-1",
                "name": "Test Policy",
                "description": "A policy for testing",
                "scope": {},
                "rules": [{"id": "rule-1", "condition": {}, "intervention": "pause"}],
                "priority": 1,
                "enabled": True,
                "createdAt": now.isoformat(),
                "updatedAt": now.isoformat(),
            }
        )
        await client.add_policy(policy)

        contents = await mcp_server.read_resource("judgment://projects/proj-1/policies")
        items = list(contents)
        data = json.loads(items[0].content)
        assert len(data) == 1
        assert data[0]["id"] == "policy-1"
