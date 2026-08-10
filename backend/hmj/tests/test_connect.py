"""Tests for connect/disconnect file generation."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from unittest.mock import patch

from hmj.commands.connect import run_connect_claude, run_disconnect_claude
from hmj.project import ProjectConfig, init_project


def _init_project(tmp_path: Path) -> ProjectConfig:
    """Helper to initialize a project for testing."""
    return asyncio.run(init_project(path=tmp_path, name="test-connect"))


class TestConnectClaude:
    def test_creates_mcp_json(self, tmp_path: Path) -> None:
        config = _init_project(tmp_path)

        with patch("hmj.commands.connect.load_project", return_value=config):
            run_connect_claude()

        mcp_path = tmp_path / ".mcp.json"
        assert mcp_path.exists()

        data = json.loads(mcp_path.read_text())
        assert "mcpServers" in data
        assert "judgment" in data["mcpServers"]
        assert data["mcpServers"]["judgment"]["command"] == "hmj"
        assert data["mcpServers"]["judgment"]["args"] == ["mcp"]

    def test_creates_settings_json(self, tmp_path: Path) -> None:
        config = _init_project(tmp_path)

        with patch("hmj.commands.connect.load_project", return_value=config):
            run_connect_claude()

        settings_path = tmp_path / ".claude" / "settings.json"
        assert settings_path.exists()

        data = json.loads(settings_path.read_text())
        assert "hooks" in data
        assert "PreToolUse" in data["hooks"]
        assert "Stop" in data["hooks"]

        pre_hook = data["hooks"]["PreToolUse"][0]
        assert "matcher" in pre_hook
        assert "hooks" in pre_hook
        inner_hooks = pre_hook["hooks"]
        assert len(inner_hooks) == 1
        assert inner_hooks[0]["type"] == "command"
        assert "hmj hook pre-tool-use" in inner_hooks[0]["command"]

    def test_preserves_existing_mcp_entries(self, tmp_path: Path) -> None:
        config = _init_project(tmp_path)

        # Pre-existing MCP entry
        mcp_path = tmp_path / ".mcp.json"
        mcp_path.write_text(json.dumps({"mcpServers": {"other-server": {"command": "other"}}}))

        with patch("hmj.commands.connect.load_project", return_value=config):
            run_connect_claude()

        data = json.loads(mcp_path.read_text())
        assert "other-server" in data["mcpServers"]
        assert "judgment" in data["mcpServers"]


class TestDisconnectClaude:
    def test_removes_mcp_entry(self, tmp_path: Path) -> None:
        config = _init_project(tmp_path)

        # First connect, then disconnect
        with patch("hmj.commands.connect.load_project", return_value=config):
            run_connect_claude()
            run_disconnect_claude()

        mcp_path = tmp_path / ".mcp.json"
        # File should be removed since judgment was the only entry
        assert not mcp_path.exists()

    def test_preserves_other_mcp_entries(self, tmp_path: Path) -> None:
        config = _init_project(tmp_path)

        # Create MCP with another entry too
        mcp_path = tmp_path / ".mcp.json"
        mcp_path.write_text(
            json.dumps(
                {
                    "mcpServers": {
                        "judgment": {"command": "hmj", "args": ["mcp"]},
                        "other": {"command": "other"},
                    }
                }
            )
        )

        with patch("hmj.commands.connect.load_project", return_value=config):
            run_disconnect_claude()

        data = json.loads(mcp_path.read_text())
        assert "judgment" not in data["mcpServers"]
        assert "other" in data["mcpServers"]

    def test_removes_hooks(self, tmp_path: Path) -> None:
        config = _init_project(tmp_path)

        with patch("hmj.commands.connect.load_project", return_value=config):
            run_connect_claude()
            run_disconnect_claude()

        settings_path = tmp_path / ".claude" / "settings.json"
        # File should be removed since hooks was the only content
        assert not settings_path.exists()
