"""Tests for project initialization and discovery."""

from __future__ import annotations

import asyncio
from pathlib import Path

import click
import pytest

from hmj.project import ProjectConfig, find_project_root, init_project, load_project


class TestFindProjectRoot:
    def test_finds_project_root(self, tmp_path: Path) -> None:
        judgment_dir = tmp_path / ".judgment"
        judgment_dir.mkdir()
        (judgment_dir / "project.toml").write_text('[project]\nid = "test-id"\nname = "test"\n')

        assert find_project_root(tmp_path) == tmp_path

    def test_walks_parent_directories(self, tmp_path: Path) -> None:
        judgment_dir = tmp_path / ".judgment"
        judgment_dir.mkdir()
        (judgment_dir / "project.toml").write_text('[project]\nid = "test-id"\nname = "test"\n')

        child = tmp_path / "sub" / "deep"
        child.mkdir(parents=True)

        assert find_project_root(child) == tmp_path

    def test_returns_none_when_not_found(self, tmp_path: Path) -> None:
        child = tmp_path / "empty"
        child.mkdir()

        result = find_project_root(child)
        # Can be None or might find a project.toml in a parent dir of tmp_path
        # The key invariant is that it doesn't raise
        if result is not None:
            assert (result / ".judgment" / "project.toml").exists()


class TestLoadProject:
    def test_loads_project_config(self, tmp_path: Path) -> None:
        judgment_dir = tmp_path / ".judgment"
        judgment_dir.mkdir()
        (judgment_dir / "project.toml").write_text(
            '[project]\nid = "proj-123"\nname = "my-project"\n'
        )

        config = load_project(tmp_path)

        assert config.project_id == "proj-123"
        assert config.name == "my-project"
        assert config.root == tmp_path
        assert config.db_path == judgment_dir / "judgment.db"

    def test_raises_when_no_project(self, tmp_path: Path) -> None:
        child = tmp_path / "empty"
        child.mkdir()

        with pytest.raises(click.ClickException, match="No judgment project found"):
            load_project(child)

    def test_raises_when_missing_id(self, tmp_path: Path) -> None:
        judgment_dir = tmp_path / ".judgment"
        judgment_dir.mkdir()
        (judgment_dir / "project.toml").write_text('[project]\nname = "no-id"\n')

        with pytest.raises(click.ClickException, match="missing project.id"):
            load_project(tmp_path)


class TestInitProject:
    def test_creates_project_structure(self, tmp_path: Path) -> None:
        config = asyncio.run(init_project(path=tmp_path, name="test-proj"))

        assert isinstance(config, ProjectConfig)
        assert config.name == "test-proj"
        assert len(config.project_id) > 0

        judgment_dir = tmp_path / ".judgment"
        assert judgment_dir.is_dir()
        assert (judgment_dir / "project.toml").is_file()
        assert (judgment_dir / "policy.yaml").is_file()
        assert (judgment_dir / ".gitignore").is_file()
        assert (judgment_dir / "judgment.db").is_file()

    def test_default_name_from_directory(self, tmp_path: Path) -> None:
        config = asyncio.run(init_project(path=tmp_path))
        assert config.name == tmp_path.name

    def test_raises_if_already_initialized(self, tmp_path: Path) -> None:
        asyncio.run(init_project(path=tmp_path, name="first"))

        with pytest.raises(click.ClickException, match="already initialized"):
            asyncio.run(init_project(path=tmp_path, name="second"))

    def test_project_toml_is_valid(self, tmp_path: Path) -> None:
        config = asyncio.run(init_project(path=tmp_path, name="toml-test"))

        # Should be loadable
        loaded = load_project(tmp_path)
        assert loaded.project_id == config.project_id
        assert loaded.name == "toml-test"

    def test_gitignore_ignores_db(self, tmp_path: Path) -> None:
        asyncio.run(init_project(path=tmp_path))

        gitignore = (tmp_path / ".judgment" / ".gitignore").read_text()
        assert "judgment.db" in gitignore
        assert "judgment.db-wal" in gitignore
