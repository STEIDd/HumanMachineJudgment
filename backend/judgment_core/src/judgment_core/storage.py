"""Abstract storage interface for Judgment Point persistence.

Implementations (MemoryStorage, SqliteStorage) must implement this ABC.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Generic, TypeVar

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

    # Lifecycle — async context manager protocol.
    # Default implementations are no-ops so that lightweight backends
    # (e.g., MemoryStorage) work without overriding.

    async def __aenter__(self) -> JudgmentStorage:
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

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

    # Decision deduplication

    async def get_by_decision_key(self, project_id: str, decision_key: str) -> JudgmentPoint | None:
        """Find a judgment point by decision key within a project.

        Returns None if no matching point is found. The default
        implementation returns None; storage backends that support
        decision keys should override this method.
        """
        return None

    # Runtime metadata (decision key, session, resolution scope)
    # Default implementations are no-ops so that lightweight backends
    # work without overriding.

    async def set_decision_key(self, point_id: str, decision_key: str) -> None:
        """Set the decision key on an existing judgment point."""
        return

    async def set_session_id(self, point_id: str, session_id: str) -> None:
        """Set the session ID on an existing judgment point."""
        return

    async def set_resolution_scope(self, point_id: str, scope: dict[str, Any]) -> None:
        """Set the resolution scope metadata on a judgment point."""
        return

    async def get_resolution_scope(self, point_id: str) -> dict[str, Any] | None:
        """Get the resolution scope metadata for a judgment point."""
        return None

    async def get_session_id(self, point_id: str) -> str | None:
        """Get the session ID for a judgment point."""
        return None

    async def get_points_by_session(self, project_id: str, session_id: str) -> list[JudgmentPoint]:
        """Get all judgment points for a specific session."""
        return []
