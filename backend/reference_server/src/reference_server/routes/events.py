"""Routes for querying Judgment Events."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query, Request

from judgment_core.errors import NotFoundError
from judgment_core.storage import JudgmentStorage
from judgment_core.types import JudgmentEvent

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_storage(request: Request) -> JudgmentStorage:
    storage: JudgmentStorage = request.app.state.storage
    return storage


def _event_json(event: JudgmentEvent) -> dict[str, Any]:
    return event.model_dump(by_alias=True, mode="json")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/projects/{project_id}/judgment-points/{point_id}/events")
async def get_point_events(
    project_id: str,
    point_id: str,
    request: Request,
) -> list[dict[str, Any]]:
    """Get all events for a specific judgment point."""
    storage = _get_storage(request)

    # Verify the point belongs to this project
    point = await storage.get_judgment_point(point_id)
    if point is None:
        raise NotFoundError(f"Judgment point '{point_id}' not found")
    if point.project_id != project_id:
        raise NotFoundError(f"Judgment point '{point_id}' not found in project '{project_id}'")

    events = await storage.get_events(point_id)
    return [_event_json(e) for e in events]


@router.get("/projects/{project_id}/events")
async def get_project_events(
    project_id: str,
    request: Request,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> dict[str, Any]:
    """Get all events for a project."""
    storage = _get_storage(request)
    result = await storage.get_events_by_project(project_id, offset=offset, limit=limit)
    return {
        "items": [_event_json(e) for e in result.items],
        "total": result.total,
        "offset": result.offset,
        "limit": result.limit,
    }
