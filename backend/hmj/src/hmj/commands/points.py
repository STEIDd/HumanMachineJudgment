"""hmj judgment point operation commands."""

from __future__ import annotations

from datetime import UTC, datetime

import click

from hmj.identity import resolve_cli_identity
from hmj.project import ProjectConfig, load_project
from hmj.storage import get_storage
from judgment_core.storage import JudgmentStorage
from judgment_sdk import JudgmentClient


async def _get_client() -> tuple[JudgmentClient, ProjectConfig, JudgmentStorage]:
    """Get a JudgmentClient and project config."""
    project = load_project()
    storage = get_storage(project)
    client = JudgmentClient(storage)
    return client, project, storage


async def run_list(filter_status: str | None = None, category: str | None = None) -> None:
    """List judgment points."""
    client, project, storage = await _get_client()

    async with storage:
        result = await client.list_judgment_points(project.project_id)

    points = list(result.items)

    if filter_status:
        points = [p for p in points if str(p.status) == filter_status]
    if category:
        points = [p for p in points if str(p.category) == category]

    if not points:
        click.echo("No judgment points found.")
        return

    for p in points:
        status_str = str(p.status.value) if hasattr(p.status, "value") else str(p.status)
        cat_str = str(p.category.value) if hasattr(p.category, "value") else str(p.category)
        question_text = p.question[:60] if p.question else ""
        click.echo(f"  [{status_str:12s}] {p.id}  {cat_str}: {question_text}")


async def run_show(judgment_id: str) -> None:
    """Show details of a judgment point."""
    client, _project, storage = await _get_client()

    async with storage:
        point = await client.get_judgment_point(judgment_id)

    if not point:
        raise click.ClickException(f"Judgment point not found: {judgment_id}")

    click.echo(f"ID:       {point.id}")
    click.echo(f"Status:   {point.status}")
    click.echo(f"Category: {point.category}")
    click.echo(f"Question: {point.question}")
    if point.context:
        click.echo(f"Context:  {point.context}")

    if point.alternatives:
        click.echo("\nAlternatives:")
        for alt in point.alternatives:
            click.echo(f"  [{alt.id}] {alt.label}")
            if alt.description:
                click.echo(f"       {alt.description}")

    if point.resolution:
        click.echo(f"\nResolution: {point.resolution.selected_alternative_id}")
        click.echo(f"Rationale:  {point.resolution.rationale}")


async def run_resolve(judgment_id: str, alternative: str, rationale: str) -> None:
    """Resolve a judgment point."""
    from judgment_core.types import JudgmentResolution

    identity = resolve_cli_identity()
    client, _project, storage = await _get_client()

    resolution = JudgmentResolution(
        selected_alternative_id=alternative,
        rationale=rationale,
        resolved_at=datetime.now(UTC),
        resolved_by=identity.actor.id,
    )

    async with storage:
        await client.resolve(judgment_id, resolution, identity.actor)

    click.echo(f"Resolved {judgment_id} with alternative '{alternative}'.")


async def run_dismiss(judgment_id: str, reason: str) -> None:
    """Dismiss a judgment point."""
    identity = resolve_cli_identity()
    client, _project, storage = await _get_client()

    async with storage:
        await client.dismiss(judgment_id, reason, identity.actor)

    click.echo(f"Dismissed {judgment_id}.")


async def run_reopen(judgment_id: str, reason: str) -> None:
    """Reopen a judgment point."""
    identity = resolve_cli_identity()
    client, _project, storage = await _get_client()

    async with storage:
        await client.reopen(judgment_id, reason, identity.actor)

    click.echo(f"Reopened {judgment_id}.")


async def run_review(judgment_id: str) -> None:
    """Start an interactive review of a judgment point."""
    await run_show(judgment_id)


async def run_investigate(judgment_id: str) -> None:
    """Mark a judgment point for investigation."""
    identity = resolve_cli_identity()
    client, _project, storage = await _get_client()

    async with storage:
        await client.start_investigation(judgment_id, identity.actor)

    click.echo(f"Marked {judgment_id} for investigation.")
