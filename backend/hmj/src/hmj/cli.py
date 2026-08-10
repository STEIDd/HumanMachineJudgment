"""HMJ command-line interface."""

from __future__ import annotations

import click

from hmj import __version__


@click.group()
@click.version_option(version=__version__, prog_name="hmj")
def main() -> None:
    """Human-Machine Judgment runtime."""


# -- Project commands ----------------------------------------------------------


@main.command()
@click.option("--name", "-n", default=None, help="Project name (defaults to directory name).")
def init(name: str | None) -> None:
    """Initialize a judgment project in the current directory."""
    import asyncio

    from hmj.project import init_project

    asyncio.run(init_project(name=name))


@main.command()
def status() -> None:
    """Show judgment point status for the current project."""
    import asyncio

    from hmj.commands.status import run_status

    asyncio.run(run_status())


@main.command()
def doctor() -> None:
    """Check HMJ installation and project health."""
    from hmj.commands.doctor import run_doctor

    run_doctor()


# -- Claude Code integration ---------------------------------------------------


@main.group()
def connect() -> None:
    """Connect HMJ to an agent host."""


@connect.command("claude")
def connect_claude() -> None:
    """Register HMJ hooks and MCP server with Claude Code."""
    from hmj.commands.connect import run_connect_claude

    run_connect_claude()


@main.group()
def disconnect() -> None:
    """Disconnect HMJ from an agent host."""


@disconnect.command("claude")
def disconnect_claude() -> None:
    """Remove HMJ hooks and MCP server from Claude Code."""
    from hmj.commands.connect import run_disconnect_claude

    run_disconnect_claude()


# -- Hook processing -----------------------------------------------------------


@main.command()
@click.argument("event_type")
def hook(event_type: str) -> None:
    """Process a Claude Code hook event (reads JSON stdin, writes JSON stdout)."""
    import asyncio

    from hmj.commands.hook import run_hook

    asyncio.run(run_hook(event_type))


# -- MCP server ----------------------------------------------------------------


@main.command()
def mcp() -> None:
    """Run the MCP server (stdio transport)."""
    from hmj.commands.mcp_cmd import run_mcp

    run_mcp()


# -- Review console ------------------------------------------------------------


@main.command()
@click.option("--port", default=8457, help="Port for the review console.")
def serve(port: int) -> None:
    """Launch the judgment review console."""
    from hmj.commands.serve import run_serve

    run_serve(port=port)


@main.command(name="open")
@click.option("--port", default=8457, help="Port for the review console.")
def open_console(port: int) -> None:
    """Open the review console in a browser."""
    from hmj.commands.serve import run_open

    run_open(port=port)


# -- Judgment point operations -------------------------------------------------


@main.command(name="list")
@click.option("--status", "filter_status", default=None, help="Filter by status.")
@click.option("--category", default=None, help="Filter by category.")
def list_points(filter_status: str | None, category: str | None) -> None:
    """List judgment points in the current project."""
    import asyncio

    from hmj.commands.points import run_list

    asyncio.run(run_list(filter_status=filter_status, category=category))


@main.command()
@click.argument("judgment_id")
def show(judgment_id: str) -> None:
    """Show details of a judgment point."""
    import asyncio

    from hmj.commands.points import run_show

    asyncio.run(run_show(judgment_id))


@main.command()
@click.argument("judgment_id")
@click.option("--alternative", "-a", required=True, help="Selected alternative ID.")
@click.option("--rationale", "-r", required=True, help="Rationale for the resolution.")
def resolve(judgment_id: str, alternative: str, rationale: str) -> None:
    """Resolve a judgment point."""
    import asyncio

    from hmj.commands.points import run_resolve

    asyncio.run(run_resolve(judgment_id, alternative, rationale))


@main.command()
@click.argument("judgment_id")
@click.option("--reason", "-r", required=True, help="Reason for dismissal.")
def dismiss(judgment_id: str, reason: str) -> None:
    """Dismiss a judgment point."""
    import asyncio

    from hmj.commands.points import run_dismiss

    asyncio.run(run_dismiss(judgment_id, reason))


@main.command()
@click.argument("judgment_id")
@click.option("--reason", "-r", required=True, help="Reason for reopening.")
def reopen(judgment_id: str, reason: str) -> None:
    """Reopen a resolved or dismissed judgment point."""
    import asyncio

    from hmj.commands.points import run_reopen

    asyncio.run(run_reopen(judgment_id, reason))


@main.command()
@click.argument("judgment_id")
def review(judgment_id: str) -> None:
    """Start an interactive review of a judgment point."""
    import asyncio

    from hmj.commands.points import run_review

    asyncio.run(run_review(judgment_id))


@main.command()
@click.argument("judgment_id")
def investigate(judgment_id: str) -> None:
    """Mark a judgment point for investigation."""
    import asyncio

    from hmj.commands.points import run_investigate

    asyncio.run(run_investigate(judgment_id))


# -- Policy commands -----------------------------------------------------------


@main.group()
def policy() -> None:
    """Manage judgment policies."""


@policy.command("show")
def policy_show() -> None:
    """Show the current project policy."""
    from hmj.commands.policy import run_policy_show

    run_policy_show()
