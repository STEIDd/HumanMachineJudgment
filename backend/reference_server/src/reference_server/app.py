"""FastAPI application factory for the Judgment Reference Server.

NOTE: This is a **reference/testing** server, not the production runtime.
For production use, install the ``hmj`` package and use ``hmj serve``
which provides project-scoped storage, proper identity resolution, and
the review console UI.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from judgment_core.storage import JudgmentStorage
from reference_server.error_handler import register_error_handlers
from reference_server.routes import events, health, judgment_points, policies


def create_app(storage: JudgmentStorage | None = None) -> FastAPI:
    """Create and configure a FastAPI application instance.

    Parameters
    ----------
    storage:
        A ``JudgmentStorage`` implementation to use.  When *None* (the
        default), an in-memory store is created automatically, which is
        convenient for tests and local development.
    """
    if storage is None:
        from judgment_storage_memory import MemoryStorage

        storage = MemoryStorage()

    app = FastAPI(title="Judgment Reference Server", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.state.storage = storage

    register_error_handlers(app)

    app.include_router(health.router)
    app.include_router(judgment_points.router, prefix="/api/v1")
    app.include_router(policies.router, prefix="/api/v1")
    app.include_router(events.router, prefix="/api/v1")

    return app
