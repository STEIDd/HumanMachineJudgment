"""Tests for hook processing — Claude Code PreToolUse and Stop events."""

from __future__ import annotations

import json
from typing import Any

import pytest

from hmj.hooks import process_hook_event


class TestPreToolUseHook:
    """Tests for PreToolUse hook processing."""

    @pytest.fixture
    def routine_input(self) -> dict[str, Any]:
        """A routine tool call that should NOT trigger blocking."""
        return {
            "tool_name": "Read",
            "tool_input": {"file_path": "/some/file.py"},
        }

    @pytest.fixture
    def dangerous_input(self) -> dict[str, Any]:
        """A dangerous tool call that SHOULD trigger blocking."""
        return {
            "tool_name": "Bash",
            "tool_input": {"command": "rm -rf /important/data"},
        }

    async def test_routine_operation_not_blocked(self, routine_input: dict[str, Any]) -> None:
        """A routine Read tool call should return empty dict (allow)."""
        result = await process_hook_event("pre-tool-use", routine_input)
        assert result == {}

    async def test_empty_tool_name_not_blocked(self) -> None:
        """An empty tool name should return empty dict."""
        result = await process_hook_event("pre-tool-use", {"tool_name": "", "tool_input": {}})
        assert result == {}

    async def test_missing_tool_name_denied_fail_closed(self) -> None:
        """Missing tool_name triggers fail-closed deny (payload validation)."""
        result = await process_hook_event("pre-tool-use", {})
        assert "hookSpecificOutput" in result
        output = result["hookSpecificOutput"]
        assert output["permissionDecision"] == "deny"
        assert "validate" in output["permissionDecisionReason"].lower()

    async def test_dangerous_command_returns_deny(self, dangerous_input: dict[str, Any]) -> None:
        """A dangerous bash command should return hookSpecificOutput with deny."""
        result = await process_hook_event("pre-tool-use", dangerous_input)

        assert "hookSpecificOutput" in result
        output = result["hookSpecificOutput"]
        assert output["hookEventName"] == "PreToolUse"
        assert output["permissionDecision"] == "deny"
        assert "permissionDecisionReason" in output
        reason = output["permissionDecisionReason"]
        assert "Judgment" in reason or "already tracks" in reason

    async def test_deny_response_is_json_serializable(
        self, dangerous_input: dict[str, Any]
    ) -> None:
        """The deny response must be JSON-serializable for stdout."""
        result = await process_hook_event("pre-tool-use", dangerous_input)
        serialized = json.dumps(result)
        deserialized = json.loads(serialized)
        assert deserialized["hookSpecificOutput"]["permissionDecision"] == "deny"

    async def test_force_push_blocked(self) -> None:
        """git push --force should be blocked."""
        hook_input = {
            "tool_name": "Bash",
            "tool_input": {"command": "git push --force origin main"},
        }
        result = await process_hook_event("pre-tool-use", hook_input)
        assert "hookSpecificOutput" in result
        assert result["hookSpecificOutput"]["permissionDecision"] == "deny"

    async def test_drop_table_blocked(self) -> None:
        """DROP TABLE should be blocked."""
        hook_input = {
            "tool_name": "Bash",
            "tool_input": {"command": "sqlite3 db.sqlite 'DROP TABLE users'"},
        }
        result = await process_hook_event("pre-tool-use", hook_input)
        assert "hookSpecificOutput" in result
        assert result["hookSpecificOutput"]["permissionDecision"] == "deny"


class TestStopHook:
    """Tests for Stop hook processing."""

    async def test_stop_returns_empty(self) -> None:
        """Stop hook should currently return empty dict (no-op)."""
        result = await process_hook_event("stop", {})
        assert result == {}

    async def test_stop_with_payload_returns_empty(self) -> None:
        """Stop hook with session data should still return empty."""
        result = await process_hook_event(
            "stop",
            {
                "session_id": "abc123",
                "hook_event_name": "Stop",
                "last_assistant_message": "I finished the task.",
            },
        )
        assert result == {}


class TestUnknownEvent:
    """Tests for unrecognized hook event types."""

    async def test_unknown_event_returns_empty(self) -> None:
        """Unknown event types should return empty dict."""
        result = await process_hook_event("unknown-event", {"some": "data"})
        assert result == {}
