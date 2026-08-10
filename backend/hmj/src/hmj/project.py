"""Project initialization and discovery."""

from __future__ import annotations

import tomllib
import uuid
from dataclasses import dataclass
from pathlib import Path

import click


@dataclass(frozen=True)
class ProjectConfig:
    """Configuration for a judgment project."""

    project_id: str
    name: str
    root: Path
    db_path: Path


def find_project_root(start: Path | None = None) -> Path | None:
    """Walk parent directories looking for .judgment/project.toml.

    Returns the project root directory (parent of .judgment/), or None.
    """
    current = (start or Path.cwd()).resolve()

    while True:
        candidate = current / ".judgment" / "project.toml"
        if candidate.is_file():
            return current

        parent = current.parent
        if parent == current:
            return None
        current = parent


def load_project(start: Path | None = None) -> ProjectConfig:
    """Find and load the project configuration.

    Raises click.ClickException if no project is found.
    """
    root = find_project_root(start)
    if root is None:
        raise click.ClickException("No judgment project found. Run 'hmj init' to create one.")

    project_toml = root / ".judgment" / "project.toml"
    with open(project_toml, "rb") as f:
        data = tomllib.load(f)

    project_section = data.get("project", {})
    project_id = project_section.get("id", "")
    name = project_section.get("name", root.name)

    if not project_id:
        raise click.ClickException(f"Invalid project.toml: missing project.id in {project_toml}")

    return ProjectConfig(
        project_id=project_id,
        name=name,
        root=root,
        db_path=root / ".judgment" / "judgment.db",
    )


async def init_project(
    path: Path | None = None,
    name: str | None = None,
) -> ProjectConfig:
    """Initialize a new judgment project.

    Creates .judgment/ directory with project.toml, policy.yaml,
    and an initialized SQLite database.
    """
    root = (path or Path.cwd()).resolve()
    judgment_dir = root / ".judgment"

    if judgment_dir.exists():
        raise click.ClickException(f"Project already initialized: {judgment_dir}")

    project_id = str(uuid.uuid4())
    project_name = name or root.name

    # Create directory
    judgment_dir.mkdir(parents=True)

    # Write project.toml
    import tomli_w

    project_toml = judgment_dir / "project.toml"
    project_toml.write_text(
        tomli_w.dumps({"project": {"id": project_id, "name": project_name}}),
        encoding="utf-8",
    )

    # Write empty policy.yaml
    policy_yaml = judgment_dir / "policy.yaml"
    policy_yaml.write_text(
        "# Judgment policies for this project.\n"
        "# See docs/materiality-and-policy.md for configuration options.\n",
        encoding="utf-8",
    )

    # Write .gitignore for the .judgment directory
    gitignore = judgment_dir / ".gitignore"
    gitignore.write_text(
        "# Track project config and policy, ignore database files.\n"
        "judgment.db\n"
        "judgment.db-wal\n"
        "judgment.db-shm\n",
        encoding="utf-8",
    )

    # Initialize database
    db_path = judgment_dir / "judgment.db"
    from hmj.storage import create_and_initialize_storage

    await create_and_initialize_storage(db_path)

    config = ProjectConfig(
        project_id=project_id,
        name=project_name,
        root=root,
        db_path=db_path,
    )

    click.echo(f"Initialized judgment project: {project_name}")
    click.echo(f"  Project ID: {project_id}")
    click.echo(f"  Location:   {judgment_dir}")

    return config
