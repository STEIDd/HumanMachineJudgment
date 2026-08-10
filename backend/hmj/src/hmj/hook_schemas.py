"""Typed input models for Claude Code hook payloads.

Follows the official Claude Code hook contract. Each model defines
the fields HMJ relies upon. Unknown additional fields are permitted
(``model_config = ConfigDict(extra="allow")``) for forward
compatibility with future Claude Code releases.

**Fail-safe policy for PreToolUse**: If a PreToolUse payload cannot
be parsed into a valid ``PreToolUseInput``, HMJ denies the tool call
(fail-closed). This prevents a malformed payload from bypassing
detection. The denial reason will indicate that the payload could
not be validated.

**Fail-safe policy for PostToolUse and Stop**: If a PostToolUse or
Stop payload cannot be parsed, HMJ returns an empty response (no-op).
Since PostToolUse cannot block and Stop is advisory, a parsing failure
should not prevent the agent from operating.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, ValidationError


class PreToolUseInput(BaseModel):
    """Input for a Claude Code PreToolUse hook event.

    Required fields:
        tool_name: The name of the tool being invoked (e.g. "Bash", "Edit").
        tool_input: The arguments passed to the tool.

    Optional fields:
        session_id: The Claude Code session identifier (if available).
        tool_use_id: The unique ID of this tool invocation.
    """

    model_config = ConfigDict(extra="allow")

    tool_name: str
    tool_input: dict[str, Any]
    session_id: str = ""
    tool_use_id: str = ""


class PostToolUseInput(BaseModel):
    """Input for a Claude Code PostToolUse hook event.

    Required fields:
        tool_name: The name of the tool that was invoked.
        tool_input: The arguments that were passed to the tool.

    Optional fields:
        session_id: The Claude Code session identifier.
        tool_use_id: The unique ID of this tool invocation.
        tool_result: The result of the tool invocation (if provided).
    """

    model_config = ConfigDict(extra="allow")

    tool_name: str
    tool_input: dict[str, Any]
    session_id: str = ""
    tool_use_id: str = ""
    tool_result: Any = None


class StopInput(BaseModel):
    """Input for a Claude Code Stop hook event.

    Optional fields:
        session_id: The Claude Code session identifier.
        stop_hook_active: Whether this is a re-invocation after a
            previous stop hook blocked. Used for loop prevention.
    """

    model_config = ConfigDict(extra="allow")

    session_id: str = ""
    stop_hook_active: bool = False


def parse_pre_tool_use(raw: dict[str, Any]) -> PreToolUseInput:
    """Parse and validate a PreToolUse hook payload.

    Raises ``pydantic.ValidationError`` if required fields are missing
    or have wrong types.
    """
    return PreToolUseInput.model_validate(raw)


def parse_post_tool_use(raw: dict[str, Any]) -> PostToolUseInput:
    """Parse and validate a PostToolUse hook payload.

    Raises ``pydantic.ValidationError`` if required fields are missing
    or have wrong types.
    """
    return PostToolUseInput.model_validate(raw)


def parse_stop(raw: dict[str, Any]) -> StopInput:
    """Parse and validate a Stop hook payload.

    Raises ``pydantic.ValidationError`` if required fields are missing
    or have wrong types.
    """
    return StopInput.model_validate(raw)


__all__ = [
    "PostToolUseInput",
    "PreToolUseInput",
    "StopInput",
    "ValidationError",
    "parse_post_tool_use",
    "parse_pre_tool_use",
    "parse_stop",
]
