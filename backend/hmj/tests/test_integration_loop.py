"""Full PreToolUse → resolution → continuation integration test.

Tests the complete lifecycle using production components with an in-memory
storage backend and monkeypatched project/storage loading.
"""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pytest

from hmj.hooks import process_hook_event
from hmj.project import ProjectConfig
from judgment_core.types import (
    Actor,
    ActorType,
    JudgmentAlternative,
    JudgmentResolution,
    JudgmentStatus,
)
from judgment_sdk import JudgmentClient
from judgment_storage_memory.memory_storage import MemoryStorage

_PROJECT_ID = "test-project"
_SESSION_ID = "session-001"
_TEST_ACTOR = Actor(id="user:test", type=ActorType.user)
_TEST_PROJECT = ProjectConfig(
    project_id=_PROJECT_ID,
    name="Test Project",
    root=Path("/tmp/test-project"),
    db_path=Path("/tmp/test-project/.judgment/judgment.db"),
)

# Dangerous command that triggers pause
_DANGEROUS_INPUT: dict[str, Any] = {
    "tool_name": "Bash",
    "tool_input": {"command": "rm -rf /important/data"},
    "session_id": _SESSION_ID,
}


@pytest.fixture
def storage() -> MemoryStorage:
    return MemoryStorage()


@pytest.fixture
def _patch_project_and_storage(monkeypatch: pytest.MonkeyPatch, storage: MemoryStorage) -> None:
    """Monkeypatch load_project and get_storage to use test fixtures."""
    monkeypatch.setattr("hmj.project.load_project", lambda: _TEST_PROJECT)
    monkeypatch.setattr("hmj.storage.get_storage", lambda _project: storage)


async def _promote_and_resolve(
    client: JudgmentClient,
    point_id: str,
    actor: Actor,
) -> None:
    """Helper: promote → add alternative → investigate → resolve."""
    # Promote candidate → pending
    await client.promote(point_id, actor)

    # Add alternative (must be before investigation)
    alt = JudgmentAlternative.model_validate(
        {"id": "allow", "label": "Allow", "description": "Proceed with the operation"}
    )
    await client.add_alternative(point_id, alt, actor)

    # Start investigation → investigating
    await client.start_investigation(point_id, actor)

    # Resolve
    resolution = JudgmentResolution.model_validate(
        {
            "selectedAlternativeId": "allow",
            "rationale": "Reviewed and approved",
            "resolvedAt": datetime.now(UTC).isoformat(),
            "resolvedBy": actor.id,
        }
    )
    await client.resolve(point_id, resolution, actor)


@pytest.mark.usefixtures("_patch_project_and_storage")
class TestPreToolUseResolutionContinuation:
    """End-to-end test: detect → deny → resolve → allow on reuse."""

    async def test_dangerous_command_creates_candidate(self, storage: MemoryStorage) -> None:
        """A dangerous command should be denied and create a candidate."""
        result = await process_hook_event("pre-tool-use", _DANGEROUS_INPUT)

        # Should deny
        assert "hookSpecificOutput" in result
        assert result["hookSpecificOutput"]["permissionDecision"] == "deny"

        # Should have created a candidate in storage
        points = await storage.get_judgment_points(_PROJECT_ID)
        assert points.total == 1
        point = points.items[0]
        assert point.status == JudgmentStatus.candidate

    async def test_candidate_has_proper_materiality(self, storage: MemoryStorage) -> None:
        """Created candidate should have materiality matching detection level."""
        await process_hook_event("pre-tool-use", _DANGEROUS_INPUT)

        points = await storage.get_judgment_points(_PROJECT_ID)
        point = points.items[0]

        # Detection produces "pause" for rm -rf, so materiality should reflect that
        assert point.materiality.score >= 9  # pause threshold
        assert point.materiality.intervention_level is not None

    async def test_duplicate_command_does_not_create_second_candidate(
        self, storage: MemoryStorage
    ) -> None:
        """Same dangerous command twice should reference existing point, not create duplicate."""
        # First call — creates candidate
        await process_hook_event("pre-tool-use", _DANGEROUS_INPUT)

        # Second call — should reference existing, not create new
        result = await process_hook_event("pre-tool-use", _DANGEROUS_INPUT)

        assert "hookSpecificOutput" in result
        assert result["hookSpecificOutput"]["permissionDecision"] == "deny"
        assert "already tracks" in result["hookSpecificOutput"]["permissionDecisionReason"]

        # Still only one point in storage
        points = await storage.get_judgment_points(_PROJECT_ID)
        assert points.total == 1

    async def test_resolved_point_allows_same_command(self, storage: MemoryStorage) -> None:
        """After resolution, the same command should be allowed."""
        # 1. First call — deny, creates candidate
        await process_hook_event("pre-tool-use", _DANGEROUS_INPUT)

        # 2. Get the candidate, promote, add alternative, investigate, resolve
        client = JudgmentClient(storage)
        points = await storage.get_judgment_points(_PROJECT_ID)
        point = points.items[0]

        await _promote_and_resolve(client, point.id, _TEST_ACTOR)

        # Verify resolution
        resolved = await client.get_judgment_point(point.id)
        assert resolved is not None
        assert resolved.status == JudgmentStatus.resolved

        # 3. Same command again — should be allowed (resolution reused)
        result = await process_hook_event("pre-tool-use", _DANGEROUS_INPUT)
        assert result == {}, f"Expected allow (empty dict), got {result}"

    async def test_dismissed_point_allows_same_command(self, storage: MemoryStorage) -> None:
        """After dismissal, the same command should be allowed."""
        # Create candidate
        await process_hook_event("pre-tool-use", _DANGEROUS_INPUT)

        client = JudgmentClient(storage)
        points = await storage.get_judgment_points(_PROJECT_ID)
        point = points.items[0]

        # Promote → pending, then dismiss
        await client.promote(point.id, _TEST_ACTOR)
        await client.dismiss(point.id, "Not relevant", _TEST_ACTOR)

        # Same command again — should be allowed
        result = await process_hook_event("pre-tool-use", _DANGEROUS_INPUT)
        assert result == {}

    async def test_session_id_stored_on_candidate(self, storage: MemoryStorage) -> None:
        """Session ID from hook input should be stored on the created candidate."""
        await process_hook_event("pre-tool-use", _DANGEROUS_INPUT)

        points = await storage.get_judgment_points(_PROJECT_ID)
        point = points.items[0]

        # Check session_id was stored
        sid = await storage.get_session_id(point.id)
        assert sid == _SESSION_ID

    async def test_decision_key_stored_on_candidate(self, storage: MemoryStorage) -> None:
        """Decision key should be stored on the created candidate."""
        await process_hook_event("pre-tool-use", _DANGEROUS_INPUT)

        points = await storage.get_judgment_points(_PROJECT_ID)
        point = points.items[0]

        # The category used by the hook is from detection results[0].suggested_category
        # For Bash tool, ToolNameDetectionRule fires first with category "method"
        from hmj.deduplication import compute_decision_key, extract_key_args
        from hmj.detection import build_detection_context, create_hook_detector

        context = build_detection_context("Bash", {"command": "rm -rf /important/data"})
        detector = create_hook_detector()
        summary = detector.detect(context)
        top = summary.results[0]
        category = str(top.suggested_category.value if top.suggested_category else "method")

        key_args = extract_key_args("Bash", {"command": "rm -rf /important/data"})
        decision_key = compute_decision_key(category, "Bash", key_args, project_id=_PROJECT_ID)

        found = await storage.get_by_decision_key(_PROJECT_ID, decision_key)
        assert found is not None
        assert found.id == point.id


@pytest.mark.usefixtures("_patch_project_and_storage")
class TestPostToolUseStaleness:
    """Test PostToolUse artifact tracking and staleness detection."""

    async def test_irrelevant_tool_returns_empty(self) -> None:
        """Non-file-modifying tools should return empty."""
        result = await process_hook_event(
            "post-tool-use",
            {"tool_name": "Read", "tool_input": {"file_path": "/src/app.py"}},
        )
        assert result == {}

    async def test_file_edit_no_linked_judgment_returns_empty(self, storage: MemoryStorage) -> None:
        """File edit with no related judgment points returns empty."""
        result = await process_hook_event(
            "post-tool-use",
            {"tool_name": "Edit", "tool_input": {"file_path": "/src/app.py"}},
        )
        assert result == {}

    async def test_unknown_tool_returns_empty(self) -> None:
        """Unknown tool names return empty."""
        result = await process_hook_event(
            "post-tool-use",
            {"tool_name": "CustomTool", "tool_input": {"foo": "bar"}},
        )
        assert result == {}

    async def test_malformed_payload_returns_empty(self) -> None:
        """Malformed payloads should not crash, just return empty."""
        result = await process_hook_event("post-tool-use", {})
        assert result == {}


@pytest.mark.usefixtures("_patch_project_and_storage")
class TestStopHookIntegration:
    """Test Stop hook session-scoped enforcement."""

    async def test_no_pending_points_allows_stop(self) -> None:
        """With no pending points, stop should be allowed."""
        result = await process_hook_event("stop", {"session_id": _SESSION_ID})
        assert result == {}

    async def test_stop_hook_active_allows_stop(self) -> None:
        """When stop_hook_active is True, always allow (loop prevention)."""
        result = await process_hook_event(
            "stop",
            {"session_id": _SESSION_ID, "stop_hook_active": True},
        )
        assert result == {}

    async def test_no_session_id_allows_stop(self) -> None:
        """Without session_id, stop should be allowed."""
        result = await process_hook_event("stop", {})
        assert result == {}

    async def test_resolved_point_allows_stop(self, storage: MemoryStorage) -> None:
        """If all points are resolved, stop should be allowed."""
        # Create a candidate, promote, add alt, investigate, resolve
        await process_hook_event("pre-tool-use", _DANGEROUS_INPUT)

        client = JudgmentClient(storage)
        points = await storage.get_judgment_points(_PROJECT_ID)
        point = points.items[0]

        await _promote_and_resolve(client, point.id, _TEST_ACTOR)

        result = await process_hook_event("stop", {"session_id": _SESSION_ID})
        assert result == {}

    async def test_unresolved_candidate_allows_stop(self, storage: MemoryStorage) -> None:
        """Candidates (not yet promoted) should not block stop.

        Only promoted points at pause/require-investigation level block stop.
        Candidates are pre-assessment and don't have intervention level set
        through the promote guard.
        """
        await process_hook_event("pre-tool-use", _DANGEROUS_INPUT)

        # The candidate exists but is not promoted — stop should still be allowed
        # because get_points_by_session only returns points with that session,
        # and candidate status is not in (pending, investigating, reopened).
        result = await process_hook_event("stop", {"session_id": _SESSION_ID})
        # Candidates have status "candidate" which is not in the stop hook's
        # unresolved set, so stop is allowed.
        assert result == {}
