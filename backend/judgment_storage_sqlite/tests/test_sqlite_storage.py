"""Tests for the SqliteStorage implementation.

Every test uses an in-memory SQLite database so that the test suite is
fast and does not leave artifacts on disk.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from judgment_core.storage import EventFilters, JudgmentPointFilters
from judgment_core.types import JudgmentEvent, JudgmentPoint, JudgmentPolicy
from judgment_storage_sqlite import SqliteStorage

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

NOW = datetime.now(UTC)
EARLIER = NOW - timedelta(hours=1)
LATER = NOW + timedelta(hours=1)


def _make_point(
    point_id: str = "jp-1",
    project_id: str = "proj-1",
    category: str = "assumption",
    status: str = "candidate",
    score: int = 5,
    created_at: datetime | None = None,
) -> JudgmentPoint:
    ts = (created_at or NOW).isoformat()
    return JudgmentPoint.model_validate(
        {
            "id": point_id,
            "projectId": project_id,
            "category": category,
            "question": "Test question?",
            "context": "Test context",
            "trigger": {"source": "agent", "description": "test trigger"},
            "materiality": {
                "score": score,
                "dimensions": {
                    "methodologicalDiscretion": 1,
                    "downstreamInfluence": 1,
                    "uncertainty": 1,
                    "consequence": 1,
                    "reversibility": 1,
                    "accountabilityRequirement": 0,
                },
            },
            "status": status,
            "alternatives": [],
            "affectedArtifactIds": [],
            "authority": {"mode": "collaborative"},
            "validityConditions": [],
            "reopenConditions": [],
            "createdAt": ts,
            "updatedAt": ts,
        }
    )


def _make_event(
    event_id: str = "evt-1",
    judgment_point_id: str = "jp-1",
    project_id: str = "proj-1",
    event_type: str = "created",
    actor_id: str = "user-1",
    timestamp: datetime | None = None,
) -> JudgmentEvent:
    return JudgmentEvent.model_validate(
        {
            "id": event_id,
            "judgmentPointId": judgment_point_id,
            "projectId": project_id,
            "eventType": event_type,
            "timestamp": (timestamp or NOW).isoformat(),
            "actorId": actor_id,
            "actorType": "user",
        }
    )


def _make_policy(
    policy_id: str = "pol-1",
    project_id: str = "proj-1",
    priority: int = 10,
) -> JudgmentPolicy:
    ts = NOW.isoformat()
    return JudgmentPolicy.model_validate(
        {
            "id": policy_id,
            "projectId": project_id,
            "name": f"Policy {policy_id}",
            "description": "Test policy",
            "scope": {},
            "rules": [{"id": "r1", "condition": {}, "intervention": "pause"}],
            "priority": priority,
            "enabled": True,
            "createdAt": ts,
            "updatedAt": ts,
        }
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
async def storage():
    s = SqliteStorage("sqlite+aiosqlite:///:memory:")
    await s.initialize()
    yield s
    await s.close()


# ---------------------------------------------------------------------------
# Event tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_append_and_get_events(storage: SqliteStorage) -> None:
    event = _make_event()
    await storage.append_event(event)
    result = await storage.get_events("jp-1")
    assert len(result) == 1
    assert result[0].id == "evt-1"


@pytest.mark.asyncio
async def test_get_events_returns_empty_for_unknown_jp(storage: SqliteStorage) -> None:
    result = await storage.get_events("nonexistent")
    assert result == []


@pytest.mark.asyncio
async def test_get_events_filter_by_event_type(storage: SqliteStorage) -> None:
    await storage.append_event(_make_event(event_id="e1", event_type="created"))
    await storage.append_event(_make_event(event_id="e2", event_type="promoted"))
    await storage.append_event(_make_event(event_id="e3", event_type="dismissed"))

    filters = EventFilters(event_type=["created", "promoted"])
    result = await storage.get_events("jp-1", filters=filters)
    assert len(result) == 2
    ids = {e.id for e in result}
    assert ids == {"e1", "e2"}


@pytest.mark.asyncio
async def test_get_events_filter_by_actor_id(storage: SqliteStorage) -> None:
    await storage.append_event(_make_event(event_id="e1", actor_id="user-1"))
    await storage.append_event(_make_event(event_id="e2", actor_id="user-2"))

    filters = EventFilters(actor_id="user-2")
    result = await storage.get_events("jp-1", filters=filters)
    assert len(result) == 1
    assert result[0].id == "e2"


@pytest.mark.asyncio
async def test_get_events_filter_by_after(storage: SqliteStorage) -> None:
    await storage.append_event(_make_event(event_id="e1", timestamp=EARLIER))
    await storage.append_event(_make_event(event_id="e2", timestamp=LATER))

    filters = EventFilters(after=NOW.isoformat())
    result = await storage.get_events("jp-1", filters=filters)
    assert len(result) == 1
    assert result[0].id == "e2"


@pytest.mark.asyncio
async def test_get_events_filter_by_before(storage: SqliteStorage) -> None:
    await storage.append_event(_make_event(event_id="e1", timestamp=EARLIER))
    await storage.append_event(_make_event(event_id="e2", timestamp=LATER))

    filters = EventFilters(before=NOW.isoformat())
    result = await storage.get_events("jp-1", filters=filters)
    assert len(result) == 1
    assert result[0].id == "e1"


@pytest.mark.asyncio
async def test_get_events_by_project(storage: SqliteStorage) -> None:
    await storage.append_event(
        _make_event(event_id="e1", judgment_point_id="jp-1", project_id="proj-1")
    )
    await storage.append_event(
        _make_event(event_id="e2", judgment_point_id="jp-2", project_id="proj-1")
    )
    await storage.append_event(
        _make_event(event_id="e3", judgment_point_id="jp-3", project_id="proj-2")
    )

    result = await storage.get_events_by_project("proj-1")
    assert result.total == 2
    assert len(result.items) == 2
    ids = {e.id for e in result.items}
    assert ids == {"e1", "e2"}


@pytest.mark.asyncio
async def test_get_events_by_project_with_pagination(storage: SqliteStorage) -> None:
    for i in range(5):
        await storage.append_event(
            _make_event(
                event_id=f"e{i}",
                judgment_point_id=f"jp-{i}",
                project_id="proj-1",
            )
        )

    result = await storage.get_events_by_project("proj-1", offset=1, limit=2)
    assert result.total == 5
    assert len(result.items) == 2
    assert result.offset == 1
    assert result.limit == 2


# ---------------------------------------------------------------------------
# Judgment Point tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_save_and_get_judgment_point(storage: SqliteStorage) -> None:
    point = _make_point()
    await storage.save_judgment_point(point)
    retrieved = await storage.get_judgment_point("jp-1")
    assert retrieved is not None
    assert retrieved.id == "jp-1"
    assert retrieved.project_id == "proj-1"


@pytest.mark.asyncio
async def test_get_judgment_point_returns_none_for_unknown_id(
    storage: SqliteStorage,
) -> None:
    result = await storage.get_judgment_point("nonexistent")
    assert result is None


@pytest.mark.asyncio
async def test_get_judgment_points_by_project(storage: SqliteStorage) -> None:
    await storage.save_judgment_point(_make_point(point_id="jp-1", project_id="proj-1"))
    await storage.save_judgment_point(_make_point(point_id="jp-2", project_id="proj-1"))
    await storage.save_judgment_point(_make_point(point_id="jp-3", project_id="proj-2"))

    result = await storage.get_judgment_points("proj-1")
    assert result.total == 2
    ids = {p.id for p in result.items}
    assert ids == {"jp-1", "jp-2"}


@pytest.mark.asyncio
async def test_get_judgment_points_filter_by_status(storage: SqliteStorage) -> None:
    await storage.save_judgment_point(_make_point(point_id="jp-1", status="candidate"))
    await storage.save_judgment_point(_make_point(point_id="jp-2", status="pending"))
    await storage.save_judgment_point(_make_point(point_id="jp-3", status="resolved"))

    filters = JudgmentPointFilters(status=["candidate", "pending"])
    result = await storage.get_judgment_points("proj-1", filters=filters)
    assert result.total == 2
    ids = {p.id for p in result.items}
    assert ids == {"jp-1", "jp-2"}


@pytest.mark.asyncio
async def test_get_judgment_points_filter_by_category(storage: SqliteStorage) -> None:
    await storage.save_judgment_point(_make_point(point_id="jp-1", category="assumption"))
    await storage.save_judgment_point(_make_point(point_id="jp-2", category="method"))
    await storage.save_judgment_point(_make_point(point_id="jp-3", category="data"))

    filters = JudgmentPointFilters(category=["assumption", "data"])
    result = await storage.get_judgment_points("proj-1", filters=filters)
    assert result.total == 2
    ids = {p.id for p in result.items}
    assert ids == {"jp-1", "jp-3"}


@pytest.mark.asyncio
async def test_get_judgment_points_filter_by_materiality_score_min(
    storage: SqliteStorage,
) -> None:
    await storage.save_judgment_point(_make_point(point_id="jp-1", score=3))
    await storage.save_judgment_point(_make_point(point_id="jp-2", score=7))
    await storage.save_judgment_point(_make_point(point_id="jp-3", score=10))

    filters = JudgmentPointFilters(materiality_score_min=7)
    result = await storage.get_judgment_points("proj-1", filters=filters)
    assert result.total == 2
    ids = {p.id for p in result.items}
    assert ids == {"jp-2", "jp-3"}


@pytest.mark.asyncio
async def test_get_judgment_points_filter_by_materiality_score_max(
    storage: SqliteStorage,
) -> None:
    await storage.save_judgment_point(_make_point(point_id="jp-1", score=3))
    await storage.save_judgment_point(_make_point(point_id="jp-2", score=7))
    await storage.save_judgment_point(_make_point(point_id="jp-3", score=10))

    filters = JudgmentPointFilters(materiality_score_max=7)
    result = await storage.get_judgment_points("proj-1", filters=filters)
    assert result.total == 2
    ids = {p.id for p in result.items}
    assert ids == {"jp-1", "jp-2"}


@pytest.mark.asyncio
async def test_get_judgment_points_filter_by_created_after(
    storage: SqliteStorage,
) -> None:
    await storage.save_judgment_point(_make_point(point_id="jp-1", created_at=EARLIER))
    await storage.save_judgment_point(_make_point(point_id="jp-2", created_at=LATER))

    filters = JudgmentPointFilters(created_after=NOW.isoformat())
    result = await storage.get_judgment_points("proj-1", filters=filters)
    assert result.total == 1
    assert result.items[0].id == "jp-2"


@pytest.mark.asyncio
async def test_get_judgment_points_filter_by_created_before(
    storage: SqliteStorage,
) -> None:
    await storage.save_judgment_point(_make_point(point_id="jp-1", created_at=EARLIER))
    await storage.save_judgment_point(_make_point(point_id="jp-2", created_at=LATER))

    filters = JudgmentPointFilters(created_before=NOW.isoformat())
    result = await storage.get_judgment_points("proj-1", filters=filters)
    assert result.total == 1
    assert result.items[0].id == "jp-1"


@pytest.mark.asyncio
async def test_get_judgment_points_with_pagination(storage: SqliteStorage) -> None:
    for i in range(5):
        await storage.save_judgment_point(_make_point(point_id=f"jp-{i}"))

    result = await storage.get_judgment_points("proj-1", offset=2, limit=2)
    assert result.total == 5
    assert len(result.items) == 2
    assert result.offset == 2
    assert result.limit == 2


# ---------------------------------------------------------------------------
# Policy tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_save_and_get_policy(storage: SqliteStorage) -> None:
    policy = _make_policy()
    await storage.save_policy(policy)
    retrieved = await storage.get_policy("pol-1")
    assert retrieved is not None
    assert retrieved.id == "pol-1"
    assert retrieved.project_id == "proj-1"


@pytest.mark.asyncio
async def test_get_policy_returns_none_for_unknown_id(storage: SqliteStorage) -> None:
    result = await storage.get_policy("nonexistent")
    assert result is None


@pytest.mark.asyncio
async def test_get_policies_returns_sorted_by_priority(storage: SqliteStorage) -> None:
    await storage.save_policy(_make_policy(policy_id="pol-high", priority=100))
    await storage.save_policy(_make_policy(policy_id="pol-low", priority=1))
    await storage.save_policy(_make_policy(policy_id="pol-mid", priority=50))

    result = await storage.get_policies("proj-1")
    assert len(result) == 3
    assert result[0].id == "pol-low"
    assert result[1].id == "pol-mid"
    assert result[2].id == "pol-high"


@pytest.mark.asyncio
async def test_get_policies_filters_by_project(storage: SqliteStorage) -> None:
    await storage.save_policy(_make_policy(policy_id="pol-1", project_id="proj-1"))
    await storage.save_policy(_make_policy(policy_id="pol-2", project_id="proj-2"))

    result = await storage.get_policies("proj-1")
    assert len(result) == 1
    assert result[0].id == "pol-1"


@pytest.mark.asyncio
async def test_update_policy(storage: SqliteStorage) -> None:
    original = _make_policy(priority=10)
    await storage.save_policy(original)

    updated = _make_policy(priority=99)
    await storage.update_policy(updated)

    retrieved = await storage.get_policy("pol-1")
    assert retrieved is not None
    assert retrieved.priority == 99


@pytest.mark.asyncio
async def test_delete_policy(storage: SqliteStorage) -> None:
    await storage.save_policy(_make_policy())
    assert await storage.get_policy("pol-1") is not None

    await storage.delete_policy("pol-1")
    assert await storage.get_policy("pol-1") is None


@pytest.mark.asyncio
async def test_delete_policy_noop_for_unknown_id(storage: SqliteStorage) -> None:
    # Should not raise
    await storage.delete_policy("nonexistent")


# ---------------------------------------------------------------------------
# Persistence / round-trip tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_data_persists_across_operations(storage: SqliteStorage) -> None:
    """Verify that data written in one operation is visible in later reads."""
    await storage.append_event(_make_event(event_id="e1"))
    await storage.save_judgment_point(_make_point(point_id="jp-1"))
    await storage.save_policy(_make_policy(policy_id="pol-1"))

    # All three entity types should be retrievable
    events = await storage.get_events("jp-1")
    assert len(events) == 1
    assert events[0].id == "e1"

    point = await storage.get_judgment_point("jp-1")
    assert point is not None
    assert point.id == "jp-1"

    policy = await storage.get_policy("pol-1")
    assert policy is not None
    assert policy.id == "pol-1"


@pytest.mark.asyncio
async def test_save_judgment_point_upserts(storage: SqliteStorage) -> None:
    """Saving a judgment point with an existing ID should update it."""
    await storage.save_judgment_point(_make_point(point_id="jp-1", status="candidate"))
    await storage.save_judgment_point(_make_point(point_id="jp-1", status="pending"))

    point = await storage.get_judgment_point("jp-1")
    assert point is not None
    assert point.status.value == "pending"

    # Should still be only one point, not two
    result = await storage.get_judgment_points("proj-1")
    assert result.total == 1


@pytest.mark.asyncio
async def test_event_roundtrip_preserves_all_fields(storage: SqliteStorage) -> None:
    """All fields of a JudgmentEvent survive the store-and-retrieve cycle."""
    event = _make_event(
        event_id="e-rt",
        judgment_point_id="jp-rt",
        project_id="proj-rt",
        event_type="promoted",
        actor_id="actor-rt",
        timestamp=NOW,
    )
    await storage.append_event(event)
    result = await storage.get_events("jp-rt")
    assert len(result) == 1
    retrieved = result[0]
    assert retrieved.id == "e-rt"
    assert retrieved.judgment_point_id == "jp-rt"
    assert retrieved.project_id == "proj-rt"
    assert str(retrieved.event_type) == "promoted"
    assert retrieved.actor_id == "actor-rt"
    assert str(retrieved.actor_type) == "user"
