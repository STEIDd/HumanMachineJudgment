"""MCP server factory for Judgment Points.

Creates an ``MCPServer`` instance (mcp SDK 2.0) with tools and resources
that expose Judgment Point lifecycle operations through the Model Context
Protocol.

Actor identity is determined by the execution context: all MCP tool calls
are attributed to the agent.  The agent cannot claim to be a human user.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Any

from mcp.server.mcpserver import MCPServer

from judgment_core.errors import JudgmentError
from judgment_core.storage import JudgmentStorage
from judgment_core.types import (
    Actor,
    ActorType,
    ArtifactReference,
    AuthorityMode,
    JudgmentAlternative,
    JudgmentResolution,
    MaterialityDimensions,
)
from judgment_sdk import CreateCandidateParams, JudgmentClient

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_AGENT_ACTOR = Actor(id="agent:claude-code", type=ActorType.agent)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _point_to_json(point: Any) -> str:
    """Serialize a JudgmentPoint (or similar Pydantic model) to a JSON string."""
    result: str = point.model_dump_json(by_alias=True, indent=2)
    return result


def _error_json(error: Exception) -> str:
    """Serialize an exception into a JSON error response for MCP tools."""
    error_type = type(error).__name__
    return json.dumps({"error": error_type, "message": str(error)}, indent=2)


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------


def create_judgment_mcp_server(
    storage: JudgmentStorage,
    project_id: str = "",
    name: str = "judgment",
) -> MCPServer:
    """Create and return an MCPServer with Judgment tools and resources.

    Parameters
    ----------
    storage:
        The storage backend to use for persisting judgment data.
    project_id:
        The project identifier. When provided, tools use this project
        by default so callers do not need to specify it.
    name:
        The server name advertised via the MCP protocol.
    """

    @asynccontextmanager
    async def _storage_lifespan(server: MCPServer) -> AsyncIterator[None]:  # noqa: ARG001
        async with storage:
            yield None

    mcp = MCPServer(name, lifespan=_storage_lifespan)
    client = JudgmentClient(storage)

    # -----------------------------------------------------------------------
    # Tools
    # -----------------------------------------------------------------------

    @mcp.tool()
    async def judgment_propose(
        category: str,
        question: str,
        context: str,
        trigger_source: str,
        trigger_description: str,
    ) -> str:
        """Create a candidate judgment point.

        Creates a minimal materiality assessment and registers the candidate
        in the judgment store.
        """
        try:
            # Build a minimal materiality assessment (all dimensions zero).
            materiality = {
                "score": 0,
                "dimensions": {
                    "methodologicalDiscretion": 0,
                    "downstreamInfluence": 0,
                    "uncertainty": 0,
                    "consequence": 0,
                    "reversibility": 0,
                    "accountabilityRequirement": 0,
                },
            }

            params = CreateCandidateParams(
                project_id=project_id,
                category=category,
                question=question,
                context=context,
                trigger={
                    "source": trigger_source,
                    "description": trigger_description,
                },
                materiality=materiality,
            )

            point = await client.create_candidate(params, _AGENT_ACTOR)
            return _point_to_json(point)
        except JudgmentError as e:
            return _error_json(e)

    @mcp.tool()
    async def judgment_assess_materiality(
        point_id: str,
        methodological_discretion: int,
        downstream_influence: int,
        uncertainty: int,
        consequence: int,
        reversibility: int,
        accountability_requirement: int,
        hard_trigger: str | None = None,
    ) -> str:
        """Assess the materiality of a judgment point.

        Computes the aggregate score and intervention level from the six
        materiality dimensions (each scored 0-3).
        """
        dims = MaterialityDimensions.model_validate(
            {
                "methodologicalDiscretion": methodological_discretion,
                "downstreamInfluence": downstream_influence,
                "uncertainty": uncertainty,
                "consequence": consequence,
                "reversibility": reversibility,
                "accountabilityRequirement": accountability_requirement,
            }
        )

        assessment = client.assess_materiality(dims, hard_trigger=hard_trigger)
        return assessment.model_dump_json(by_alias=True, indent=2)

    @mcp.tool()
    async def judgment_add_alternative(
        point_id: str,
        alternative_id: str,
        label: str,
        description: str,
    ) -> str:
        """Add an alternative to a judgment point."""
        try:
            alternative = JudgmentAlternative.model_validate(
                {
                    "id": alternative_id,
                    "label": label,
                    "description": description,
                }
            )

            updated = await client.add_alternative(point_id, alternative, _AGENT_ACTOR)
            return _point_to_json(updated)
        except JudgmentError as e:
            return _error_json(e)

    @mcp.tool()
    async def judgment_resolve(
        point_id: str,
        selected_alternative_id: str,
        rationale: str,
    ) -> str:
        """Resolve a judgment point by selecting an alternative.

        Authority enforcement: since MCP tool calls come from the agent,
        resolution of human-authority or collaborative-authority points is
        rejected.  Only points with delegated or rule-based authority can
        be resolved through this tool.  Human-authority points must be
        resolved through the CLI or review console.
        """
        # Authority enforcement: agent cannot resolve human/collaborative points.
        point = await client.get_judgment_point(point_id)
        if point is not None and point.authority.mode in (
            AuthorityMode.human,
            AuthorityMode.collaborative,
        ):
            return json.dumps(
                {
                    "error": "authority_denied",
                    "message": (
                        f"This judgment point requires human authority to resolve. "
                        f"Authority mode is '{point.authority.mode}'. "
                        f"Use the CLI ('hmj resolve {point_id}') or the review "
                        f"console to resolve this point."
                    ),
                    "point_id": point_id,
                    "authority_mode": str(point.authority.mode),
                },
                indent=2,
            )

        try:
            resolution = JudgmentResolution.model_validate(
                {
                    "selectedAlternativeId": selected_alternative_id,
                    "rationale": rationale,
                    "resolvedAt": datetime.now(UTC).isoformat(),
                    "resolvedBy": _AGENT_ACTOR.id,
                }
            )

            updated = await client.resolve(point_id, resolution, _AGENT_ACTOR)
            return _point_to_json(updated)
        except JudgmentError as e:
            return _error_json(e)

    @mcp.tool()
    async def judgment_dismiss(
        point_id: str,
        reason: str,
    ) -> str:
        """Dismiss a judgment point with a reason."""
        try:
            updated = await client.dismiss(point_id, reason, _AGENT_ACTOR)
            return _point_to_json(updated)
        except JudgmentError as e:
            return _error_json(e)

    @mcp.tool()
    async def judgment_reopen(
        point_id: str,
        reason: str,
    ) -> str:
        """Reopen a previously resolved or dismissed judgment point."""
        try:
            updated = await client.reopen(point_id, reason, _AGENT_ACTOR)
            return _point_to_json(updated)
        except JudgmentError as e:
            return _error_json(e)

    @mcp.tool()
    async def judgment_link_artifact(
        point_id: str,
        artifact_id: str,
        label: str,
        artifact_type: str,
        relationship: str,
    ) -> str:
        """Link an artifact reference to a judgment point."""
        try:
            artifact = ArtifactReference.model_validate(
                {
                    "id": artifact_id,
                    "artifactType": artifact_type,
                    "label": label,
                    "relationship": relationship,
                }
            )

            updated = await client.link_artifact(point_id, artifact, _AGENT_ACTOR)
            return _point_to_json(updated)
        except JudgmentError as e:
            return _error_json(e)

    @mcp.tool()
    async def judgment_request_comparison(
        point_id: str,
        alternative_ids: str,
        criteria: str | None = None,
    ) -> str:
        """Request a structured comparison of alternatives.

        The ``alternative_ids`` parameter should be a comma-separated string
        of alternative identifiers.
        """
        try:
            ids = [aid.strip() for aid in alternative_ids.split(",") if aid.strip()]

            updated = await client.request_comparison(
                point_id, ids, _AGENT_ACTOR, criteria=criteria
            )
            return _point_to_json(updated)
        except JudgmentError as e:
            return _error_json(e)

    # -----------------------------------------------------------------------
    # Resources
    # -----------------------------------------------------------------------

    effective_project_id = project_id

    @mcp.resource("judgment://projects/{project_id}/policies")
    async def list_policies(project_id: str) -> str:
        """List judgment policies for a project."""
        pid = project_id or effective_project_id
        policies = await client.get_policies(pid)
        items = [p.model_dump(by_alias=True) for p in policies]
        return json.dumps(items, default=str, indent=2)

    @mcp.resource("judgment://projects/{project_id}/judgments")
    async def list_judgments(project_id: str) -> str:
        """List judgment points for a project."""
        pid = project_id or effective_project_id
        result = await client.list_judgment_points(pid)
        items = [p.model_dump(by_alias=True) for p in result.items]
        return json.dumps(
            {"items": items, "total": result.total},
            default=str,
            indent=2,
        )

    @mcp.resource("judgment://projects/{project_id}/judgments/{judgment_id}")
    async def get_judgment(project_id: str, judgment_id: str) -> str:
        """Get a single judgment point by ID."""
        pid = project_id or effective_project_id
        point = await client.get_judgment_point(judgment_id)
        if point is None or point.project_id != pid:
            return json.dumps({"error": "not_found", "judgment_id": judgment_id})
        return point.model_dump_json(by_alias=True, indent=2)

    @mcp.resource("judgment://projects/{project_id}/judgments/{judgment_id}/events")
    async def get_judgment_events(project_id: str, judgment_id: str) -> str:
        """Get the event history for a judgment point."""
        pid = project_id or effective_project_id
        point = await client.get_judgment_point(judgment_id)
        if point is None or point.project_id != pid:
            return json.dumps({"error": "not_found", "judgment_id": judgment_id})
        events = await client.get_events(judgment_id)
        items = [e.model_dump(by_alias=True) for e in events]
        return json.dumps(items, default=str, indent=2)

    return mcp
