"""Shared storage factory for the HMJ runtime."""

from __future__ import annotations

from pathlib import Path

from hmj.project import ProjectConfig
from judgment_core.storage import JudgmentStorage


def get_storage(project: ProjectConfig) -> JudgmentStorage:
    """Create a SqliteStorage instance for the project database."""
    from judgment_storage_sqlite import SqliteStorage

    db_url = f"sqlite+aiosqlite:///{project.db_path}"
    return SqliteStorage(url=db_url)


async def create_and_initialize_storage(db_path: Path) -> None:
    """Create and initialize a new SQLite database."""
    from judgment_storage_sqlite import SqliteStorage

    db_url = f"sqlite+aiosqlite:///{db_path}"
    storage = SqliteStorage(url=db_url)
    async with storage:
        await storage.initialize()
