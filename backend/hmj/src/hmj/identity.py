"""Identity resolution for different access paths.

Each access path (hook, MCP, CLI, review console) resolves to a
typed identity that records:

- **Actor**: who is performing the action (user, agent, system).
- **Source**: how they're accessing the system (hook, mcp, cli).

**Human identity**: On first use, HMJ creates a stable local human
identity stored in the HMJ application-data directory (not in the
project repository). This identity has an opaque stable ID and an
optional display name derived from the OS username. The same identity
is used for both CLI and review-console actions.

**Agent identity**: MCP tool calls are attributed to the agent host.
When a session ID is available from the Claude Code hook context, it
is associated with actions for session-level audit trail distinction.

**System identity**: Hook-based detection actions are attributed to
the HMJ system.

The audit trail can distinguish:
- human user (local stable identity)
- Claude host (agent:claude-code)
- individual Claude session (via session_id metadata)
- generic portable MCP agent session (agent:mcp-client)
- delegated agent (recorded when delegation occurs)
- system/rule (system:hook, system:rule)

Callers cannot provide their own authority class — the identity is
determined solely by the execution context.
"""

from __future__ import annotations

import hashlib
import os
import platform
import uuid
from dataclasses import dataclass
from pathlib import Path

from judgment_core.types import Actor, ActorType


@dataclass(frozen=True)
class ResolvedIdentity:
    """An identity resolved from the execution context."""

    actor: Actor
    source: str  # "hook", "mcp", "cli"


# ---------------------------------------------------------------------------
# Application data directory
# ---------------------------------------------------------------------------


def _get_app_data_dir() -> Path:
    """Get the HMJ application-data directory.

    On Windows: %LOCALAPPDATA%/hmj
    On macOS:   ~/Library/Application Support/hmj
    On Linux:   ~/.local/share/hmj  (XDG_DATA_HOME)
    """
    if platform.system() == "Windows":
        base = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
    elif platform.system() == "Darwin":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    return base / "hmj"


# ---------------------------------------------------------------------------
# Stable local human identity
# ---------------------------------------------------------------------------


def _get_identity_path() -> Path:
    """Get the path to the local identity file."""
    return _get_app_data_dir() / "identity.txt"


def _create_stable_id(username: str) -> str:
    """Create an opaque stable ID from the username and a random seed.

    The ID is deterministic per-file — it's written once and reused.
    """
    seed = uuid.uuid4().hex
    raw = f"{username}:{seed}:{platform.node()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:12]


def _get_local_username() -> str:
    """Get the local OS username, safely."""
    return os.environ.get("USER", os.environ.get("USERNAME", "unknown"))


def get_local_human_identity() -> Actor:
    """Get or create the stable local human identity.

    On first call, creates the identity file in the app-data directory.
    Subsequent calls return the same identity.
    """
    identity_path = _get_identity_path()

    if identity_path.exists():
        try:
            content = identity_path.read_text(encoding="utf-8").strip()
            parts = content.split("\n")
            if parts:
                actor_id = parts[0].strip()
                if actor_id:
                    return Actor(id=actor_id, type=ActorType.user)
        except (OSError, ValueError):
            pass

    # Create new identity
    username = _get_local_username()
    stable_id = _create_stable_id(username)
    actor_id = f"user:{stable_id}"

    try:
        identity_path.parent.mkdir(parents=True, exist_ok=True)
        identity_path.write_text(
            f"{actor_id}\n{username}\n",
            encoding="utf-8",
        )
    except OSError:
        # If we can't persist, still return a valid identity for this session
        pass

    return Actor(id=actor_id, type=ActorType.user)


# ---------------------------------------------------------------------------
# Access-path identity resolvers
# ---------------------------------------------------------------------------


def resolve_hook_identity() -> ResolvedIdentity:
    """Hook calls come from the HMJ system on behalf of detection."""
    return ResolvedIdentity(
        actor=Actor(id="system:hook", type=ActorType.system),
        source="hook",
    )


def resolve_mcp_identity(*, session_id: str = "") -> ResolvedIdentity:
    """MCP tool calls come from the agent host.

    When a session_id is available, it's included for audit distinction.
    """
    actor_id = "agent:claude-code"
    if session_id:
        # Include session for audit trail but keep actor type as agent
        actor_id = f"agent:claude-code:{session_id[:16]}"
    return ResolvedIdentity(
        actor=Actor(id=actor_id, type=ActorType.agent),
        source="mcp",
    )


def resolve_cli_identity() -> ResolvedIdentity:
    """CLI calls come from the human user (stable local identity)."""
    return ResolvedIdentity(
        actor=get_local_human_identity(),
        source="cli",
    )


def resolve_console_identity() -> ResolvedIdentity:
    """Review console calls come from the human user (same identity as CLI)."""
    return ResolvedIdentity(
        actor=get_local_human_identity(),
        source="cli",
    )
