"""hmj policy commands."""

from __future__ import annotations

import click

from hmj.project import load_project


def run_policy_show() -> None:
    """Show the current project policy."""
    project = load_project()
    policy_path = project.root / ".judgment" / "policy.yaml"

    if not policy_path.exists():
        click.echo("No policy file found.")
        return

    content = policy_path.read_text(encoding="utf-8")
    if not content.strip():
        click.echo("Policy file is empty. Edit .judgment/policy.yaml to configure policies.")
        return

    click.echo(content)
