"""Abstract storage interface for Judgment Point persistence.

Implementations (MemoryStorage, SqliteStorage) must implement this ABC.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Generic, TypeVar

from judgment_core.types import (
    EventType,
    JudgmentCategory,
    JudgmentEvent,
    JudgmentPoint,
    JudgmentPolicy,
    JudgmentStatus,
)

T = TypeVar("T")


@dataclass
class EventFilters:
    event_type: list[EventType] | None = None
    actor_id: str | None = None
    after: str | None = None
    before: str | None = None


@dataclass
class JudgmentPointFilters:
    status: list[JudgmentStatus] | None = None
    category: list[JudgmentCategory] | None = None
    materiality_score_min: int | None = None
    materiality_score_max: int | None = None
    created_after: str | None = None
    created_before: str | None = None


@dataclass(frozen=True)
class PaginatedResult(Generic[T]):
    items: list[T]
    total: int
    offset: int
    limit: int


class JudgmentStorage(ABC):
    """Abstract base class for judgment point storage backends."""

    # Events (append-only)

    @abstractmethod
    async def append_event(self, event: JudgmentEvent) -> None: ...

    @abstractmethod
    async def get_events(
        self,
        judgment_point_id: str,
        filters: EventFilters | None = None,
    ) -> list[JudgmentEvent]: ...

    @abstractmethod
    async def get_events_by_project(
        self,
        project_id: str,
        filters: EventFilters | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> PaginatedResult[JudgmentEvent]: ...

    # Current-state projection

    @abstractmethod
    async def save_judgment_point(self, point: JudgmentPoint) -> None: ...

    @abstractmethod
    async def get_judgment_point(self, point_id: str) -> JudgmentPoint | None: ...

    @abstractmethod
    async def get_judgment_points(
        self,
        project_id: str,
        filters: JudgmentPointFilters | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> PaginatedResult[JudgmentPoint]: ...

    # Policies

    @abstractmethod
    async def save_policy(self, policy: JudgmentPolicy) -> None: ...

    @abstractmethod
    async def get_policy(self, policy_id: str) -> JudgmentPolicy | None: ...

    @abstractmethod
    async def get_policies(self, project_id: str) -> list[JudgmentPolicy]: ...

    @abstractmethod
    async def update_policy(self, policy: JudgmentPolicy) -> None: ...

    @abstractmethod
    async def delete_policy(self, policy_id: str) -> None: ...
