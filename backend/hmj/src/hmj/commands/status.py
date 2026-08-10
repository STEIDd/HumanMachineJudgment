"""hmj status command."""

from __future__ import annotations

import click

from hmj.project import load_project
from hmj.storage import get_storage


async def run_status() -> None:
    """Show judgment point status for the current project."""
    from judgment_sdk import JudgmentClient

    project = load_project()
    storage = get_storage(project)

    async with storage:
        client = JudgmentClient(storage)
        result = await client.list_judgment_points(project.project_id)

    items = result.items

    click.echo(f"Project: {project.name} ({project.project_id})")

    if not items:
        click.echo("No judgment points.")
        return

    click.echo()

    by_status: dict[str, int] = {}
    for p in items:
        status_str = str(p.status.value) if hasattr(p.status, "value") else str(p.status)
        by_status[status_str] = by_status.get(status_str, 0) + 1

    for s, count in sorted(by_status.items()):
        click.echo(f"  {s}: {count}")

    click.echo(f"\n  Total: {len(items)}")
