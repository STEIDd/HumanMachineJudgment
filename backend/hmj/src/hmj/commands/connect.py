"""hmj connect / disconnect commands."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import click

from hmj.project import load_project

_HMJ_HOOK_MARKER = "hmj hook"


def _read_json(path: Path) -> dict[str, Any]:
    """Read a JSON file, returning empty dict if missing."""
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))  # type: ignore[no-any-return]
    return {}


def _write_json(path: Path, data: dict[str, Any]) -> None:
    """Write a JSON file with 2-space indent."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def _is_hmj_hook_entry(handler: dict[str, Any]) -> bool:
    """Check if a handler dict is an HMJ hook (nested or flat format)."""
    return _HMJ_HOOK_MARKER in handler.get("command", "")


def _is_hmj_matcher_group(matcher_group: dict[str, Any]) -> bool:
    """Check if an entire matcher group belongs to HMJ."""
    # Nested format: check all inner hooks
    inner_hooks = matcher_group.get("hooks", [])
    if inner_hooks:
        return all(_is_hmj_hook_entry(h) for h in inner_hooks)
    # Flat/legacy format
    if "command" in matcher_group:
        return _is_hmj_hook_entry(matcher_group)
    return False


def _strip_hmj_from_event(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Remove HMJ entries from a list of matcher groups, preserving others.

    For each matcher group:
    - If ALL inner hooks are HMJ: drop the entire group.
    - If SOME inner hooks are HMJ: remove only those, keep the rest.
    - If no inner hooks are HMJ: keep as-is.
    """
    result: list[dict[str, Any]] = []
    for matcher_group in entries:
        inner_hooks = matcher_group.get("hooks", [])
        if inner_hooks:
            remaining = [h for h in inner_hooks if not _is_hmj_hook_entry(h)]
            if remaining:
                matcher_group["hooks"] = remaining
                result.append(matcher_group)
            # else: all hooks were HMJ, drop entire group
        elif "command" in matcher_group:
            # Legacy flat format
            if not _is_hmj_hook_entry(matcher_group):
                result.append(matcher_group)
        else:
            # Matcher group with no hooks and no command — preserve it
            result.append(matcher_group)
    return result


_HMJ_PRE_TOOL_USE = {
    "matcher": ".*",
    "hooks": [
        {
            "type": "command",
            "command": "hmj hook pre-tool-use",
        }
    ],
}

_HMJ_POST_TOOL_USE = {
    "matcher": "Edit|Write|NotebookEdit",
    "hooks": [
        {
            "type": "command",
            "command": "hmj hook post-tool-use",
        }
    ],
}

_HMJ_STOP = {
    "matcher": "",
    "hooks": [
        {
            "type": "command",
            "command": "hmj hook stop",
        }
    ],
}


def run_connect_claude() -> None:
    """Register HMJ hooks and MCP server with Claude Code."""
    project = load_project()

    # Write .mcp.json
    mcp_path = project.root / ".mcp.json"
    mcp_data = _read_json(mcp_path)
    mcp_data.setdefault("mcpServers", {})
    mcp_data["mcpServers"]["judgment"] = {
        "command": "hmj",
        "args": ["mcp"],
    }
    _write_json(mcp_path, mcp_data)

    # Write .claude/settings.json — preserve existing hooks
    settings_path = project.root / ".claude" / "settings.json"
    settings_data = _read_json(settings_path)
    settings_data.setdefault("hooks", {})

    # Remove any existing HMJ entries first, then append ours
    for event_type, hmj_entry in [
        ("PreToolUse", _HMJ_PRE_TOOL_USE),
        ("PostToolUse", _HMJ_POST_TOOL_USE),
        ("Stop", _HMJ_STOP),
    ]:
        existing = settings_data["hooks"].get(event_type, [])
        cleaned = _strip_hmj_from_event(existing)
        cleaned.append(hmj_entry)
        settings_data["hooks"][event_type] = cleaned

    _write_json(settings_path, settings_data)

    click.echo("Connected HMJ to Claude Code.")
    click.echo(f"  MCP server: {mcp_path}")
    click.echo(f"  Hooks: {settings_path}")


def run_disconnect_claude() -> None:
    """Remove HMJ hooks and MCP server from Claude Code."""
    project = load_project()

    # Update .mcp.json
    mcp_path = project.root / ".mcp.json"
    mcp_data = _read_json(mcp_path)
    servers = mcp_data.get("mcpServers", {})
    if "judgment" in servers:
        del servers["judgment"]
        if servers:
            _write_json(mcp_path, mcp_data)
        else:
            mcp_path.unlink(missing_ok=True)
        click.echo("Removed MCP server entry from .mcp.json")
    else:
        click.echo("No MCP server entry found in .mcp.json")

    # Update .claude/settings.json — remove only HMJ hooks
    settings_path = project.root / ".claude" / "settings.json"
    settings_data = _read_json(settings_path)
    hooks = settings_data.get("hooks", {})
    changed = False

    for event_type in ("PreToolUse", "PostToolUse", "Stop"):
        if event_type in hooks:
            cleaned = _strip_hmj_from_event(hooks[event_type])
            if cleaned:
                hooks[event_type] = cleaned
            else:
                del hooks[event_type]
            changed = True

    if changed:
        if hooks:
            settings_data["hooks"] = hooks
        else:
            del settings_data["hooks"]
        if settings_data:
            _write_json(settings_path, settings_data)
        else:
            settings_path.unlink(missing_ok=True)
        click.echo("Removed HMJ hooks from .claude/settings.json")
    else:
        click.echo("No HMJ hooks found in .claude/settings.json")
