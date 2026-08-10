"""Tests for identity resolution per access path."""

from __future__ import annotations

from pathlib import Path

from hmj.identity import (
    get_local_human_identity,
    resolve_cli_identity,
    resolve_console_identity,
    resolve_hook_identity,
    resolve_mcp_identity,
)


class TestResolveHookIdentity:
    def test_returns_system_actor(self) -> None:
        identity = resolve_hook_identity()
        assert identity.actor.id == "system:hook"
        assert identity.actor.type == "system"
        assert identity.source == "hook"


class TestResolveMcpIdentity:
    def test_returns_agent_actor(self) -> None:
        identity = resolve_mcp_identity()
        assert identity.actor.id == "agent:claude-code"
        assert identity.actor.type == "agent"
        assert identity.source == "mcp"

    def test_includes_session_id_when_provided(self) -> None:
        identity = resolve_mcp_identity(session_id="session-abc-123-456")
        assert "session-abc-12345" in identity.actor.id or "session-abc" in identity.actor.id
        assert identity.actor.type == "agent"

    def test_different_sessions_produce_different_ids(self) -> None:
        id1 = resolve_mcp_identity(session_id="session-aaa").actor.id
        id2 = resolve_mcp_identity(session_id="session-bbb").actor.id
        assert id1 != id2


class TestResolveCliIdentity:
    def test_returns_user_actor(self, monkeypatch, tmp_path: Path) -> None:
        monkeypatch.setattr("hmj.identity._get_identity_path", lambda: tmp_path / "id.txt")
        identity = resolve_cli_identity()
        assert identity.actor.type == "user"
        assert identity.source == "cli"
        assert identity.actor.id.startswith("user:")

    def test_stable_across_calls(self, monkeypatch, tmp_path: Path) -> None:
        """Same identity file produces the same ID across calls."""
        monkeypatch.setattr("hmj.identity._get_identity_path", lambda: tmp_path / "id.txt")
        id1 = resolve_cli_identity().actor.id
        id2 = resolve_cli_identity().actor.id
        assert id1 == id2

    def test_identity_persisted_to_file(self, monkeypatch, tmp_path: Path) -> None:
        """Identity file should be created on first call."""
        id_path = tmp_path / "id.txt"
        monkeypatch.setattr("hmj.identity._get_identity_path", lambda: id_path)
        resolve_cli_identity()
        assert id_path.exists()
        content = id_path.read_text()
        assert content.startswith("user:")

    def test_console_uses_same_identity(self, monkeypatch, tmp_path: Path) -> None:
        """CLI and console should use the same human identity."""
        monkeypatch.setattr("hmj.identity._get_identity_path", lambda: tmp_path / "id.txt")
        cli_id = resolve_cli_identity().actor.id
        console_id = resolve_console_identity().actor.id
        assert cli_id == console_id


class TestLocalHumanIdentity:
    def test_creates_opaque_id(self, monkeypatch, tmp_path: Path) -> None:
        """The generated ID should be opaque (not the raw username)."""
        monkeypatch.setattr("hmj.identity._get_identity_path", lambda: tmp_path / "id.txt")
        monkeypatch.setenv("USER", "testuser")
        actor = get_local_human_identity()
        # The ID should NOT be exactly "user:testuser" — it's a hash
        assert actor.id.startswith("user:")
        assert actor.id != "user:testuser"

    def test_survives_missing_directory(self, monkeypatch, tmp_path: Path) -> None:
        """Should work even if the parent directory doesn't exist yet."""
        id_path = tmp_path / "nested" / "deep" / "id.txt"
        monkeypatch.setattr("hmj.identity._get_identity_path", lambda: id_path)
        actor = get_local_human_identity()
        assert actor.id.startswith("user:")


class TestIdentityIsolation:
    def test_identities_are_distinct(self, monkeypatch, tmp_path: Path) -> None:
        monkeypatch.setattr("hmj.identity._get_identity_path", lambda: tmp_path / "id.txt")
        hook = resolve_hook_identity()
        mcp = resolve_mcp_identity()
        cli = resolve_cli_identity()

        actor_ids = {hook.actor.id, mcp.actor.id, cli.actor.id}
        assert len(actor_ids) == 3, "Each access path must have a unique identity"

    def test_sources_are_distinct(self, monkeypatch, tmp_path: Path) -> None:
        monkeypatch.setattr("hmj.identity._get_identity_path", lambda: tmp_path / "id.txt")
        sources = {
            resolve_hook_identity().source,
            resolve_mcp_identity().source,
            resolve_cli_identity().source,
        }
        assert sources == {"hook", "mcp", "cli"}

    def test_actor_types_distinct(self, monkeypatch, tmp_path: Path) -> None:
        """Hook=system, MCP=agent, CLI=user."""
        monkeypatch.setattr("hmj.identity._get_identity_path", lambda: tmp_path / "id.txt")
        assert resolve_hook_identity().actor.type == "system"
        assert resolve_mcp_identity().actor.type == "agent"
        assert resolve_cli_identity().actor.type == "user"
