"""Tests for Claude Code hook payload validation schemas."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from hmj.hook_schemas import (
    parse_post_tool_use,
    parse_pre_tool_use,
    parse_stop,
)

# ---------------------------------------------------------------------------
# PreToolUse
# ---------------------------------------------------------------------------


class TestPreToolUseInput:
    def test_valid_real_fixture(self) -> None:
        """A realistic PreToolUse payload from Claude Code."""
        raw = {
            "tool_name": "Bash",
            "tool_input": {"command": "rm -rf /important/data"},
            "session_id": "session-abc-123",
            "tool_use_id": "tu_01234",
        }
        parsed = parse_pre_tool_use(raw)
        assert parsed.tool_name == "Bash"
        assert parsed.tool_input == {"command": "rm -rf /important/data"}
        assert parsed.session_id == "session-abc-123"
        assert parsed.tool_use_id == "tu_01234"

    def test_missing_required_field_tool_name(self) -> None:
        """Missing tool_name should raise ValidationError."""
        raw = {"tool_input": {"command": "ls"}}
        with pytest.raises(ValidationError, match="tool_name"):
            parse_pre_tool_use(raw)

    def test_missing_required_field_tool_input(self) -> None:
        """Missing tool_input should raise ValidationError."""
        raw = {"tool_name": "Bash"}
        with pytest.raises(ValidationError, match="tool_input"):
            parse_pre_tool_use(raw)

    def test_wrong_field_type_tool_name(self) -> None:
        """tool_name should be a string."""
        raw = {"tool_name": 42, "tool_input": {}}
        with pytest.raises(ValidationError):
            parse_pre_tool_use(raw)

    def test_wrong_field_type_tool_input(self) -> None:
        """tool_input should be a dict."""
        raw = {"tool_name": "Bash", "tool_input": "not a dict"}
        with pytest.raises(ValidationError):
            parse_pre_tool_use(raw)

    def test_unknown_extra_field(self) -> None:
        """Unknown fields should be accepted (forward compatibility)."""
        raw = {
            "tool_name": "Bash",
            "tool_input": {"command": "ls"},
            "future_field": "some_value",
            "another_field": 42,
        }
        parsed = parse_pre_tool_use(raw)
        assert parsed.tool_name == "Bash"

    def test_empty_payload(self) -> None:
        """Empty payload should raise ValidationError."""
        with pytest.raises(ValidationError):
            parse_pre_tool_use({})

    def test_malformed_tool_input(self) -> None:
        """tool_input must be a dict, not a list or None."""
        with pytest.raises(ValidationError):
            parse_pre_tool_use({"tool_name": "Bash", "tool_input": None})

    def test_optional_fields_default(self) -> None:
        """Optional fields should have sensible defaults."""
        raw = {"tool_name": "Bash", "tool_input": {"command": "ls"}}
        parsed = parse_pre_tool_use(raw)
        assert parsed.session_id == ""
        assert parsed.tool_use_id == ""

    def test_future_compatible_extra_data(self) -> None:
        """Future Claude Code fields should not break parsing."""
        raw = {
            "tool_name": "Bash",
            "tool_input": {"command": "ls"},
            "hook_event_name": "PreToolUse",
            "conversation_id": "conv-xyz",
            "project_uuid": "proj-123",
            "metadata": {"nested": True},
        }
        parsed = parse_pre_tool_use(raw)
        assert parsed.tool_name == "Bash"


# ---------------------------------------------------------------------------
# PostToolUse
# ---------------------------------------------------------------------------


class TestPostToolUseInput:
    def test_valid_real_fixture(self) -> None:
        """A realistic PostToolUse payload."""
        raw = {
            "tool_name": "Edit",
            "tool_input": {"file_path": "/src/app.py", "old_string": "x", "new_string": "y"},
            "session_id": "session-abc",
            "tool_use_id": "tu_01",
        }
        parsed = parse_post_tool_use(raw)
        assert parsed.tool_name == "Edit"
        assert parsed.tool_input["file_path"] == "/src/app.py"

    def test_missing_required_field(self) -> None:
        """Missing required fields should raise."""
        with pytest.raises(ValidationError):
            parse_post_tool_use({"tool_name": "Edit"})

    def test_empty_payload(self) -> None:
        """Empty payload should raise."""
        with pytest.raises(ValidationError):
            parse_post_tool_use({})

    def test_unknown_extra_field(self) -> None:
        """Unknown fields accepted for forward compatibility."""
        raw = {
            "tool_name": "Edit",
            "tool_input": {"file_path": "/src/app.py"},
            "new_claude_field": True,
        }
        parsed = parse_post_tool_use(raw)
        assert parsed.tool_name == "Edit"


# ---------------------------------------------------------------------------
# Stop
# ---------------------------------------------------------------------------


class TestStopInput:
    def test_valid_real_fixture(self) -> None:
        """A realistic Stop payload."""
        raw = {"session_id": "session-abc", "stop_hook_active": False}
        parsed = parse_stop(raw)
        assert parsed.session_id == "session-abc"
        assert parsed.stop_hook_active is False

    def test_stop_hook_active_true(self) -> None:
        """stop_hook_active=True for loop prevention."""
        raw = {"session_id": "s1", "stop_hook_active": True}
        parsed = parse_stop(raw)
        assert parsed.stop_hook_active is True

    def test_empty_payload(self) -> None:
        """Empty payload should parse with defaults (all fields optional)."""
        parsed = parse_stop({})
        assert parsed.session_id == ""
        assert parsed.stop_hook_active is False

    def test_wrong_type_stop_hook_active(self) -> None:
        """stop_hook_active must be bool-like."""
        # Pydantic will coerce "true" string, but an object should fail
        raw = {"stop_hook_active": {"nested": True}}
        with pytest.raises(ValidationError):
            parse_stop(raw)

    def test_unknown_extra_field(self) -> None:
        """Unknown fields accepted."""
        raw = {"session_id": "s1", "future_field": 42}
        parsed = parse_stop(raw)
        assert parsed.session_id == "s1"

    def test_future_compatible_extra_data(self) -> None:
        """Future fields should not break parsing."""
        raw = {
            "session_id": "s1",
            "stop_hook_active": False,
            "reason": "user requested",
            "metadata": {"something": "new"},
        }
        parsed = parse_stop(raw)
        assert parsed.session_id == "s1"


# ---------------------------------------------------------------------------
# Unsupported hook event
# ---------------------------------------------------------------------------


class TestUnsupportedHookEvent:
    @pytest.mark.asyncio
    async def test_unsupported_event_type_returns_empty(self) -> None:
        """An unknown event type should return empty from process_hook_event."""
        from hmj.hooks import process_hook_event

        result = await process_hook_event("unknown-event", {"tool_name": "Bash", "tool_input": {}})
        assert result == {}
