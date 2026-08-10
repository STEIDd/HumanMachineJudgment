"""hmj doctor command — comprehensive health checks."""

from __future__ import annotations

import importlib.resources
import json
import shutil
import sys
from pathlib import Path

import click

from hmj.project import find_project_root


def _pass(label: str, msg: str) -> None:
    """Print a passing check."""
    click.echo(f"  [PASS] {label}: {msg}")


def _warn(label: str, msg: str) -> None:
    """Print a warning (non-fatal, does not affect exit code)."""
    click.echo(f"  [WARN] {label}: {msg}")


def _fail(label: str, msg: str) -> None:
    """Print a failed check."""
    click.echo(f"  [FAIL] {label}: {msg}")


def run_doctor() -> None:
    """Check HMJ installation and project health.

    Returns non-zero exit code if any required check fails.
    """
    failures = 0

    # 1. HMJ executable
    hmj_path = shutil.which("hmj")
    if hmj_path:
        _pass("hmj binary", hmj_path)
    else:
        _warn("hmj binary", "not on PATH (running from development install)")

    # 2. HMJ version
    try:
        from importlib.metadata import version

        hmj_version = version("hmj")
        _pass("hmj version", hmj_version)
    except Exception:  # noqa: BLE001
        _warn("hmj version", "could not determine")

    # 3. Project root
    root = find_project_root()
    if not root:
        _fail("project", "not found (run 'hmj init' to create one)")
        failures += 1
        click.echo()
        click.echo("Some checks failed. See above for details.")
        sys.exit(1)

    _pass("project root", str(root))

    # 4. Schema / project.toml validity
    project_toml = root / ".judgment" / "project.toml"
    if project_toml.exists():
        try:
            import tomllib

            with open(project_toml, "rb") as f:
                data = tomllib.load(f)
            pid = data.get("project", {}).get("id", "")
            if pid:
                _pass("project.toml", f"project_id={pid}")
            else:
                _fail("project.toml", "missing project.id")
                failures += 1
        except Exception as e:  # noqa: BLE001
            _fail("project.toml", f"parse error: {e}")
            failures += 1
    else:
        _fail("project.toml", "not found")
        failures += 1

    # 5. SQLite database
    db_path = root / ".judgment" / "judgment.db"
    if db_path.exists():
        size_kb = db_path.stat().st_size / 1024
        try:
            import sqlite3

            conn = sqlite3.connect(str(db_path))
            cursor = conn.execute("PRAGMA journal_mode")
            mode = cursor.fetchone()[0]
            conn.close()
            _pass("database", f"{size_kb:.1f} KB, journal_mode={mode}")
        except Exception as e:  # noqa: BLE001
            _fail("database", f"exists but cannot connect: {e}")
            failures += 1
    else:
        _fail("database", "not found")
        failures += 1

    # 6. Policy file
    policy_path = root / ".judgment" / "policy.yaml"
    if policy_path.exists():
        _pass("policy", str(policy_path))
    else:
        _fail("policy", "not found")
        failures += 1

    # 7. Claude Code executable (optional — user may not have Claude Code installed)
    claude_path = shutil.which("claude")
    if claude_path:
        _pass("claude binary", claude_path)
    else:
        _warn("claude binary", "not on PATH")

    # 8. MCP server configuration (optional — requires 'hmj connect claude')
    mcp_json = root / ".mcp.json"
    if mcp_json.exists():
        try:
            data = json.loads(mcp_json.read_text(encoding="utf-8"))
            servers = data.get("mcpServers", {})
            if "judgment" in servers:
                _pass("MCP server", "judgment entry in .mcp.json")
            else:
                _warn("MCP server", ".mcp.json exists but no 'judgment' entry")
        except Exception as e:  # noqa: BLE001
            _warn("MCP server", f"cannot parse .mcp.json: {e}")
    else:
        _warn("MCP server", "not configured (run 'hmj connect claude')")

    # 9. Hook configuration (optional — requires 'hmj connect claude')
    settings_json = root / ".claude" / "settings.json"
    if settings_json.exists():
        try:
            data = json.loads(settings_json.read_text(encoding="utf-8"))
            hooks = data.get("hooks", {})
            hook_types = [k for k in hooks if hooks[k]]
            if hook_types:
                _pass("Claude hooks", f"configured: {', '.join(hook_types)}")
            else:
                _warn("Claude hooks", "settings.json exists but no hooks configured")
        except Exception as e:  # noqa: BLE001
            _warn("Claude hooks", f"cannot parse settings.json: {e}")
    else:
        _warn("Claude hooks", "not configured (run 'hmj connect claude')")

    # 10. Review console assets (required — part of the installed distribution)
    static_found = False
    try:
        pkg_dir = importlib.resources.files("hmj") / "_static"
        if hasattr(pkg_dir, "__fspath__"):
            p = Path(str(pkg_dir))
            if p.is_dir() and (p / "index.html").exists():
                _pass("review console", f"packaged at {p}")
                static_found = True
    except (TypeError, FileNotFoundError):
        pass

    if not static_found:
        # Try development path
        current = Path(__file__).resolve().parent
        for _ in range(10):
            candidate = current / "apps" / "review-console" / "dist"
            if candidate.is_dir() and (candidate / "index.html").exists():
                _pass("review console", f"dev build at {candidate}")
                static_found = True
                break
            parent = current.parent
            if parent == current:
                break
            current = parent

    if not static_found:
        _fail("review console", "not found — installation may be incomplete")
        failures += 1

    click.echo()
    if failures:
        click.echo(f"Some checks failed ({failures} issue{'s' if failures != 1 else ''}).")
        sys.exit(1)
    else:
        click.echo("All checks passed.")
