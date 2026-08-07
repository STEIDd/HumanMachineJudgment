"""In-memory implementation of JudgmentStorage.

All data is stored in plain Python dicts and lists.  This is useful for
tests, prototyping, and single-process deployments that do not require
persistence across restarts.
"""

from __future__ import annotations

from datetime import datetime
from typing import TypeVar

from judgment_core.storage import (
    EventFilters,
    JudgmentPointFilters,
    JudgmentStorage,
    PaginatedResult,
)
from judgment_core.types import JudgmentEvent, JudgmentPoint, JudgmentPolicy

T = TypeVar("T")


class MemoryStorage(JudgmentStorage):
    """Fully in-memory storage backend for Judgment data."""

    def __init__(self) -> None:
        # Events keyed by judgment_point_id -> list of events
        self._events: dict[str, list[JudgmentEvent]] = {}
        # Judgment points keyed by id
        self._points: dict[str, JudgmentPoint] = {}
        # Policies keyed by id
        self._policies: dict[str, JudgmentPolicy] = {}

    # ------------------------------------------------------------------
    # Convenience
    # ------------------------------------------------------------------

    def clear(self) -> None:
        """Remove all stored data.  Useful in test teardown."""
        self._events.clear()
        self._points.clear()
        self._policies.clear()

    # ------------------------------------------------------------------
    # Events
    # ------------------------------------------------------------------

    async def append_event(self, event: JudgmentEvent) -> None:
        jp_id = event.judgment_point_id
        if jp_id not in self._events:
            self._events[jp_id] = []
        self._events[jp_id].append(event)

    async def get_events(
        self,
        judgment_point_id: str,
        filters: EventFilters | None = None,
    ) -> list[JudgmentEvent]:
        events = list(self._events.get(judgment_point_id, []))
        if filters is not None:
            events = self._apply_event_filters(events, filters)
        return events

    async def get_events_by_project(
        self,
        project_id: str,
        filters: EventFilters | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> PaginatedResult[JudgmentEvent]:
        all_events: list[JudgmentEvent] = []
        for event_list in self._events.values():
            for event in event_list:
                if event.project_id == project_id:
                    all_events.append(event)
        if filters is not None:
            all_events = self._apply_event_filters(all_events, filters)
        total = len(all_events)
        items = all_events[offset : offset + limit]
        return PaginatedResult(items=items, total=total, offset=offset, limit=limit)

    # ------------------------------------------------------------------
    # Judgment Points
    # ------------------------------------------------------------------

    async def save_judgment_point(self, point: JudgmentPoint) -> None:
        self._points[point.id] = point

    async def get_judgment_point(self, point_id: str) -> JudgmentPoint | None:
        return self._points.get(point_id)

    async def get_judgment_points(
        self,
        project_id: str,
        filters: JudgmentPointFilters | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> PaginatedResult[JudgmentPoint]:
        points = [p for p in self._points.values() if p.project_id == project_id]
        if filters is not None:
            points = self._apply_point_filters(points, filters)
        total = len(points)
        items = points[offset : offset + limit]
        return PaginatedResult(items=items, total=total, offset=offset, limit=limit)

    # ------------------------------------------------------------------
    # Policies
    # ------------------------------------------------------------------

    async def save_policy(self, policy: JudgmentPolicy) -> None:
        self._policies[policy.id] = policy

    async def get_policy(self, policy_id: str) -> JudgmentPolicy | None:
        return self._policies.get(policy_id)

    async def get_policies(self, project_id: str) -> list[JudgmentPolicy]:
        policies = [p for p in self._policies.values() if p.project_id == project_id]
        policies.sort(key=lambda p: p.priority)
        return policies

    async def update_policy(self, policy: JudgmentPolicy) -> None:
        self._policies[policy.id] = policy

    async def delete_policy(self, policy_id: str) -> None:
        self._policies.pop(policy_id, None)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _apply_event_filters(
        events: list[JudgmentEvent],
        filters: EventFilters,
    ) -> list[JudgmentEvent]:
        result = events

        if filters.event_type is not None:
            result = [e for e in result if e.event_type in filters.event_type]

        if filters.actor_id is not None:
            result = [e for e in result if e.actor_id == filters.actor_id]

        if filters.after is not None:
            after_dt = datetime.fromisoformat(filters.after)
            result = [e for e in result if e.timestamp > after_dt]

        if filters.before is not None:
            before_dt = datetime.fromisoformat(filters.before)
            result = [e for e in result if e.timestamp < before_dt]

        return result

    @staticmethod
    def _apply_point_filters(
        points: list[JudgmentPoint],
        filters: JudgmentPointFilters,
    ) -> list[JudgmentPoint]:
        result = points

        if filters.status is not None:
            result = [p for p in result if p.status in filters.status]

        if filters.category is not None:
            result = [p for p in result if p.category in filters.category]

        if filters.materiality_score_min is not None:
            result = [p for p in result if p.materiality.score >= filters.materiality_score_min]

        if filters.materiality_score_max is not None:
            result = [p for p in result if p.materiality.score <= filters.materiality_score_max]

        if filters.created_after is not None:
            after_dt = datetime.fromisoformat(filters.created_after)
            result = [p for p in result if p.created_at > after_dt]

        if filters.created_before is not None:
            before_dt = datetime.fromisoformat(filters.created_before)
            result = [p for p in result if p.created_at < before_dt]

        return result
