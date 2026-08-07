"""SQLite-backed implementation of :class:`JudgmentStorage`.

Uses SQLAlchemy async with the ``aiosqlite`` driver so that every public
method is a native coroutine.  Full Pydantic models are stored as JSON
blobs in a ``data`` column; frequently-filtered scalar fields are
denormalized into their own columns for efficient ``WHERE`` clauses.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    create_async_engine,
)

from judgment_core.storage import (
    EventFilters,
    JudgmentPointFilters,
    JudgmentStorage,
    PaginatedResult,
)
from judgment_core.types import JudgmentEvent, JudgmentPoint, JudgmentPolicy
from judgment_storage_sqlite.models import (
    Base,
    EventRow,
    JudgmentPointRow,
    PolicyRow,
)


class SqliteStorage(JudgmentStorage):
    """Persistent storage backend backed by SQLite via *aiosqlite*."""

    def __init__(self, url: str = "sqlite+aiosqlite:///judgment.db") -> None:
        self._engine = create_async_engine(url, echo=False)
        self._session_factory = async_sessionmaker(self._engine, expire_on_commit=False)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def initialize(self) -> None:
        """Create all tables if they do not yet exist."""
        async with self._engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def close(self) -> None:
        """Dispose of the underlying engine and release connections."""
        await self._engine.dispose()

    # ------------------------------------------------------------------
    # Events
    # ------------------------------------------------------------------

    async def append_event(self, event: JudgmentEvent) -> None:
        data = event.model_dump(by_alias=True, mode="json")
        row = EventRow(
            id=event.id,
            judgment_point_id=event.judgment_point_id,
            project_id=event.project_id,
            event_type=str(event.event_type),
            timestamp=event.timestamp,
            actor_id=event.actor_id,
            actor_type=str(event.actor_type),
            data=data,
        )
        async with self._session_factory() as session:
            session.add(row)
            await session.commit()

    async def get_events(
        self,
        judgment_point_id: str,
        filters: EventFilters | None = None,
    ) -> list[JudgmentEvent]:
        stmt = select(EventRow).where(EventRow.judgment_point_id == judgment_point_id)
        stmt = self._apply_event_filter_clauses(stmt, filters)
        async with self._session_factory() as session:
            result = await session.execute(stmt)
            rows = result.scalars().all()
        return [JudgmentEvent.model_validate(r.data) for r in rows]

    async def get_events_by_project(
        self,
        project_id: str,
        filters: EventFilters | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> PaginatedResult[JudgmentEvent]:
        base = select(EventRow).where(EventRow.project_id == project_id)
        base = self._apply_event_filter_clauses(base, filters)

        # Total count
        count_stmt = select(func.count()).select_from(base.subquery())
        async with self._session_factory() as session:
            total = (await session.execute(count_stmt)).scalar_one()

            paginated = base.offset(offset).limit(limit)
            result = await session.execute(paginated)
            rows = result.scalars().all()

        items = [JudgmentEvent.model_validate(r.data) for r in rows]
        return PaginatedResult(items=items, total=total, offset=offset, limit=limit)

    # ------------------------------------------------------------------
    # Judgment Points
    # ------------------------------------------------------------------

    async def save_judgment_point(self, point: JudgmentPoint) -> None:
        data = point.model_dump(by_alias=True, mode="json")
        async with self._session_factory() as session:
            existing = await session.get(JudgmentPointRow, point.id)
            if existing is not None:
                existing.project_id = point.project_id  # type: ignore[assignment]
                existing.status = str(point.status)  # type: ignore[assignment]
                existing.category = str(point.category)  # type: ignore[assignment]
                existing.materiality_score = point.materiality.score  # type: ignore[assignment]
                existing.created_at = point.created_at  # type: ignore[assignment]
                existing.updated_at = point.updated_at  # type: ignore[assignment]
                existing.data = data  # type: ignore[assignment]
            else:
                row = JudgmentPointRow(
                    id=point.id,
                    project_id=point.project_id,
                    status=str(point.status),
                    category=str(point.category),
                    materiality_score=point.materiality.score,
                    created_at=point.created_at,
                    updated_at=point.updated_at,
                    data=data,
                )
                session.add(row)
            await session.commit()

    async def get_judgment_point(self, point_id: str) -> JudgmentPoint | None:
        async with self._session_factory() as session:
            row = await session.get(JudgmentPointRow, point_id)
        if row is None:
            return None
        return JudgmentPoint.model_validate(row.data)

    async def get_judgment_points(
        self,
        project_id: str,
        filters: JudgmentPointFilters | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> PaginatedResult[JudgmentPoint]:
        base = select(JudgmentPointRow).where(JudgmentPointRow.project_id == project_id)
        base = self._apply_point_filter_clauses(base, filters)

        count_stmt = select(func.count()).select_from(base.subquery())
        async with self._session_factory() as session:
            total = (await session.execute(count_stmt)).scalar_one()

            paginated = base.offset(offset).limit(limit)
            result = await session.execute(paginated)
            rows = result.scalars().all()

        items = [JudgmentPoint.model_validate(r.data) for r in rows]
        return PaginatedResult(items=items, total=total, offset=offset, limit=limit)

    # ------------------------------------------------------------------
    # Policies
    # ------------------------------------------------------------------

    async def save_policy(self, policy: JudgmentPolicy) -> None:
        data = policy.model_dump(by_alias=True, mode="json")
        row = PolicyRow(
            id=policy.id,
            project_id=policy.project_id,
            priority=policy.priority,
            enabled=1 if policy.enabled else 0,
            data=data,
        )
        async with self._session_factory() as session:
            await session.merge(row)
            await session.commit()

    async def get_policy(self, policy_id: str) -> JudgmentPolicy | None:
        async with self._session_factory() as session:
            row = await session.get(PolicyRow, policy_id)
        if row is None:
            return None
        return JudgmentPolicy.model_validate(row.data)

    async def get_policies(self, project_id: str) -> list[JudgmentPolicy]:
        stmt = (
            select(PolicyRow).where(PolicyRow.project_id == project_id).order_by(PolicyRow.priority)
        )
        async with self._session_factory() as session:
            result = await session.execute(stmt)
            rows = result.scalars().all()
        return [JudgmentPolicy.model_validate(r.data) for r in rows]

    async def update_policy(self, policy: JudgmentPolicy) -> None:
        data = policy.model_dump(by_alias=True, mode="json")
        async with self._session_factory() as session:
            existing = await session.get(PolicyRow, policy.id)
            if existing is not None:
                existing.project_id = policy.project_id  # type: ignore[assignment]
                existing.priority = policy.priority  # type: ignore[assignment]
                existing.enabled = 1 if policy.enabled else 0  # type: ignore[assignment]
                existing.data = data  # type: ignore[assignment]
                await session.commit()

    async def delete_policy(self, policy_id: str) -> None:
        async with self._session_factory() as session:
            row = await session.get(PolicyRow, policy_id)
            if row is not None:
                await session.delete(row)
                await session.commit()

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _apply_event_filter_clauses(stmt: Any, filters: EventFilters | None) -> Any:
        """Append ``WHERE`` clauses corresponding to *filters*."""
        if filters is None:
            return stmt

        if filters.event_type is not None:
            values = [str(et) for et in filters.event_type]
            stmt = stmt.where(EventRow.event_type.in_(values))

        if filters.actor_id is not None:
            stmt = stmt.where(EventRow.actor_id == filters.actor_id)

        if filters.after is not None:
            after_dt = datetime.fromisoformat(filters.after)
            stmt = stmt.where(EventRow.timestamp > after_dt)

        if filters.before is not None:
            before_dt = datetime.fromisoformat(filters.before)
            stmt = stmt.where(EventRow.timestamp < before_dt)

        return stmt

    @staticmethod
    def _apply_point_filter_clauses(stmt: Any, filters: JudgmentPointFilters | None) -> Any:
        """Append ``WHERE`` clauses corresponding to *filters*."""
        if filters is None:
            return stmt

        if filters.status is not None:
            values = [str(s) for s in filters.status]
            stmt = stmt.where(JudgmentPointRow.status.in_(values))

        if filters.category is not None:
            values = [str(c) for c in filters.category]
            stmt = stmt.where(JudgmentPointRow.category.in_(values))

        if filters.materiality_score_min is not None:
            stmt = stmt.where(JudgmentPointRow.materiality_score >= filters.materiality_score_min)

        if filters.materiality_score_max is not None:
            stmt = stmt.where(JudgmentPointRow.materiality_score <= filters.materiality_score_max)

        if filters.created_after is not None:
            after_dt = datetime.fromisoformat(filters.created_after)
            stmt = stmt.where(JudgmentPointRow.created_at > after_dt)

        if filters.created_before is not None:
            before_dt = datetime.fromisoformat(filters.created_before)
            stmt = stmt.where(JudgmentPointRow.created_at < before_dt)

        return stmt
