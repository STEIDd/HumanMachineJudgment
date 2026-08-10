"""FastAPI application for the HMJ review console.

Serves the judgment point API and the pre-built React SPA.
"""

from __future__ import annotations

import importlib.resources
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Query, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from judgment_core.errors import (
    GuardError,
    InvalidTransitionError,
    JudgmentError,
    NotFoundError,
)
from judgment_core.storage import JudgmentPointFilters, JudgmentStorage
from judgment_core.types import (
    Actor,
    JudgmentEvent,
    JudgmentPoint,
    JudgmentStatus,
)
from judgment_sdk import JudgmentClient

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_console_actor() -> Actor:
    """Get the review console actor using stable local identity."""
    from hmj.identity import resolve_console_identity

    return resolve_console_identity().actor


def _point_json(point: JudgmentPoint) -> dict[str, Any]:
    return point.model_dump(by_alias=True, mode="json")


def _event_json(event: JudgmentEvent) -> dict[str, Any]:
    return event.model_dump(by_alias=True, mode="json")


def _find_static_dir() -> Path | None:
    """Locate the built review console SPA.

    Checks in order:
    1. ``hmj/_static/`` inside the installed package
    2. ``apps/review-console/dist/`` relative to the project root (dev)
    """
    # 1. Packaged static files
    try:
        pkg_dir = importlib.resources.files("hmj") / "_static"
        if hasattr(pkg_dir, "__fspath__"):
            p = Path(str(pkg_dir))
            if p.is_dir() and (p / "index.html").exists():
                return p
    except (TypeError, FileNotFoundError):
        pass

    # 2. Development: walk up from this file to find repo root
    current = Path(__file__).resolve().parent
    for _ in range(10):
        candidate = current / "apps" / "review-console" / "dist"
        if candidate.is_dir() and (candidate / "index.html").exists():
            return candidate
        parent = current.parent
        if parent == current:
            break
        current = parent

    return None


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------


def _register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotFoundError)
    async def _not_found(request: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse(status_code=404, content={"error": str(exc)})

    @app.exception_handler(InvalidTransitionError)
    async def _invalid_transition(request: Request, exc: InvalidTransitionError) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={
                "error": str(exc),
                "fromStatus": exc.from_status,
                "toStatus": exc.to_status,
            },
        )

    @app.exception_handler(GuardError)
    async def _guard(request: Request, exc: GuardError) -> JSONResponse:
        return JSONResponse(
            status_code=409,
            content={"error": str(exc), "reasons": exc.reasons},
        )

    @app.exception_handler(JudgmentError)
    async def _judgment(request: Request, exc: JudgmentError) -> JSONResponse:
        return JSONResponse(status_code=400, content={"error": str(exc)})


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------


def create_console_app(
    storage: JudgmentStorage,
    project_id: str = "",
    static_dir: Path | None = None,
) -> FastAPI:
    """Create the review console FastAPI application."""

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:  # noqa: ARG001
        async with storage:
            yield

    app = FastAPI(title="HMJ Review Console", lifespan=lifespan)
    app.state.storage = storage
    app.state.project_id = project_id

    _register_error_handlers(app)

    client = JudgmentClient(storage)

    # -----------------------------------------------------------------------
    # Health
    # -----------------------------------------------------------------------

    @app.get("/api/v1/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "project_id": project_id}

    # -----------------------------------------------------------------------
    # Judgment points (read)
    # -----------------------------------------------------------------------

    @app.get("/api/v1/projects/{pid}/judgment-points")
    async def list_points(
        pid: str,
        status: list[str] | None = Query(default=None),
        category: list[str] | None = Query(default=None),
        offset: int = Query(default=0, ge=0),
        limit: int = Query(default=50, ge=1, le=200),
    ) -> dict[str, Any]:
        filters = JudgmentPointFilters(
            status=[JudgmentStatus(s) for s in status] if status else None,
            category=category,  # type: ignore[arg-type]
        )
        result = await storage.get_judgment_points(pid, filters=filters, offset=offset, limit=limit)
        return {
            "items": [_point_json(p) for p in result.items],
            "total": result.total,
            "offset": result.offset,
            "limit": result.limit,
        }

    @app.get("/api/v1/projects/{pid}/judgment-points/{point_id}")
    async def get_point(pid: str, point_id: str) -> JSONResponse:
        point = await storage.get_judgment_point(point_id)
        if point is None or point.project_id != pid:
            raise NotFoundError(f"Judgment point '{point_id}' not found")
        return JSONResponse(content=_point_json(point))

    # -----------------------------------------------------------------------
    # Events
    # -----------------------------------------------------------------------

    @app.get("/api/v1/projects/{pid}/judgment-points/{point_id}/events")
    async def get_events(pid: str, point_id: str) -> list[dict[str, Any]]:
        point = await storage.get_judgment_point(point_id)
        if point is None or point.project_id != pid:
            raise NotFoundError(f"Judgment point '{point_id}' not found")
        events = await storage.get_events(point_id)
        return [_event_json(e) for e in events]

    # -----------------------------------------------------------------------
    # Actions (mutations from the review console)
    # -----------------------------------------------------------------------

    async def _validate_project_ownership(pid: str, point_id: str) -> None:
        """Verify the judgment point belongs to the specified project."""
        point = await storage.get_judgment_point(point_id)
        if point is None or point.project_id != pid:
            raise NotFoundError(f"Judgment point '{point_id}' not found in project '{pid}'")

    @app.patch("/api/v1/projects/{pid}/judgment-points/{point_id}/promote")
    async def promote(pid: str, point_id: str) -> JSONResponse:
        await _validate_project_ownership(pid, point_id)
        point = await client.promote(point_id, _get_console_actor())
        return JSONResponse(content=_point_json(point))

    @app.patch("/api/v1/projects/{pid}/judgment-points/{point_id}/investigate")
    async def investigate(pid: str, point_id: str) -> JSONResponse:
        await _validate_project_ownership(pid, point_id)
        point = await client.start_investigation(point_id, _get_console_actor())
        return JSONResponse(content=_point_json(point))

    @app.patch("/api/v1/projects/{pid}/judgment-points/{point_id}/resolve")
    async def resolve(pid: str, point_id: str, request: Request) -> JSONResponse:
        await _validate_project_ownership(pid, point_id)
        body = await request.json()
        from judgment_core.types import JudgmentResolution

        resolution = JudgmentResolution(
            selected_alternative_id=body["selectedAlternativeId"],
            rationale=body["rationale"],
            resolved_at=datetime.now(UTC),
            resolved_by=_get_console_actor().id,
        )
        point = await client.resolve(point_id, resolution, _get_console_actor())
        return JSONResponse(content=_point_json(point))

    @app.patch("/api/v1/projects/{pid}/judgment-points/{point_id}/dismiss")
    async def dismiss(pid: str, point_id: str, request: Request) -> JSONResponse:
        await _validate_project_ownership(pid, point_id)
        body = await request.json()
        point = await client.dismiss(point_id, body.get("reason", ""), _get_console_actor())
        return JSONResponse(content=_point_json(point))

    @app.patch("/api/v1/projects/{pid}/judgment-points/{point_id}/reopen")
    async def reopen(pid: str, point_id: str, request: Request) -> JSONResponse:
        await _validate_project_ownership(pid, point_id)
        body = await request.json()
        point = await client.reopen(point_id, body.get("reason", ""), _get_console_actor())
        return JSONResponse(content=_point_json(point))

    @app.patch("/api/v1/projects/{pid}/judgment-points/{point_id}/delegate")
    async def delegate(pid: str, point_id: str, request: Request) -> JSONResponse:
        await _validate_project_ownership(pid, point_id)
        body = await request.json()
        point = await client.delegate(
            point_id,
            body["delegateId"],
            body.get("policyId", ""),
            _get_console_actor(),
        )
        return JSONResponse(content=_point_json(point))

    # -----------------------------------------------------------------------
    # SPA static files
    # -----------------------------------------------------------------------

    resolved_static = static_dir or _find_static_dir()
    if resolved_static and resolved_static.is_dir():
        index_html = resolved_static / "index.html"

        # Mount static assets if the assets/ subdirectory exists
        assets_dir = resolved_static / "assets"
        if assets_dir.is_dir():
            app.mount(
                "/assets",
                StaticFiles(directory=str(assets_dir)),
                name="assets",
            )

        # SPA fallback: serve index.html for all non-API routes
        @app.get("/{full_path:path}")
        async def spa_fallback(full_path: str) -> FileResponse:
            if full_path:
                file_path = (resolved_static / full_path).resolve()
                static_root = resolved_static.resolve()
                # Prevent path traversal: ensure the resolved path is
                # within the static directory using relative_to() which
                # raises ValueError if file_path is not under static_root.
                try:
                    file_path.relative_to(static_root)
                except ValueError:
                    return FileResponse(str(index_html))
                if file_path.is_file():
                    return FileResponse(str(file_path))
            return FileResponse(str(index_html))

    return app
