"""Routes for managing Judgment Policies."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from judgment_core.errors import NotFoundError
from judgment_core.id_gen import generate_id
from judgment_core.storage import JudgmentStorage
from judgment_core.types import JudgmentPolicy

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_storage(request: Request) -> JudgmentStorage:
    storage: JudgmentStorage = request.app.state.storage
    return storage


def _policy_json(policy: JudgmentPolicy) -> dict[str, Any]:
    return policy.model_dump(by_alias=True, mode="json")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/projects/{project_id}/policies", status_code=201)
async def create_policy(
    project_id: str,
    request: Request,
) -> JSONResponse:
    """Create a new judgment policy."""
    storage = _get_storage(request)
    body = await request.json()

    now = datetime.now(UTC)

    policy_data: dict[str, Any] = {
        **body,
        "projectId": project_id,
        "createdAt": now.isoformat(),
        "updatedAt": now.isoformat(),
    }

    if "id" not in policy_data or policy_data["id"] is None:
        policy_data["id"] = generate_id()

    policy = JudgmentPolicy.model_validate(policy_data)
    await storage.save_policy(policy)

    return JSONResponse(status_code=201, content=_policy_json(policy))


@router.get("/projects/{project_id}/policies")
async def list_policies(
    project_id: str,
    request: Request,
) -> list[dict[str, Any]]:
    """List all policies for a project."""
    storage = _get_storage(request)
    policies = await storage.get_policies(project_id)
    return [_policy_json(p) for p in policies]


@router.get("/projects/{project_id}/policies/{policy_id}")
async def get_policy(
    project_id: str,
    policy_id: str,
    request: Request,
) -> JSONResponse:
    """Get a single policy."""
    storage = _get_storage(request)
    policy = await storage.get_policy(policy_id)

    if policy is None or policy.project_id != project_id:
        raise NotFoundError(f"Policy '{policy_id}' not found in project '{project_id}'")

    return JSONResponse(content=_policy_json(policy))


@router.put("/projects/{project_id}/policies/{policy_id}")
async def update_policy(
    project_id: str,
    policy_id: str,
    request: Request,
) -> JSONResponse:
    """Update an existing policy."""
    storage = _get_storage(request)

    existing = await storage.get_policy(policy_id)
    if existing is None or existing.project_id != project_id:
        raise NotFoundError(f"Policy '{policy_id}' not found in project '{project_id}'")

    body = await request.json()
    now = datetime.now(UTC)

    policy_data: dict[str, Any] = {
        **body,
        "id": policy_id,
        "projectId": project_id,
        "createdAt": existing.created_at.isoformat(),
        "updatedAt": now.isoformat(),
    }

    policy = JudgmentPolicy.model_validate(policy_data)
    await storage.update_policy(policy)

    return JSONResponse(content=_policy_json(policy))
