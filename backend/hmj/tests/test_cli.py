"""Tests for the hmj CLI using Click's CliRunner."""

from __future__ import annotations

from pathlib import Path

from click.testing import CliRunner

from hmj.cli import main


class TestCLI:
    def test_help(self) -> None:
        runner = CliRunner()
        result = runner.invoke(main, ["--help"])
        assert result.exit_code == 0
        assert "Human-Machine Judgment runtime" in result.output

    def test_version(self) -> None:
        runner = CliRunner()
        result = runner.invoke(main, ["--version"])
        assert result.exit_code == 0
        assert "0.1.0" in result.output

    def test_init_command(self, tmp_path: Path) -> None:
        runner = CliRunner()
        with runner.isolated_filesystem(temp_dir=tmp_path):
            result = runner.invoke(main, ["init", "--name", "cli-test"])
            assert result.exit_code == 0
            assert "Initialized judgment project" in result.output
            assert Path(".judgment/project.toml").exists()

    def test_init_already_exists(self, tmp_path: Path) -> None:
        runner = CliRunner()
        with runner.isolated_filesystem(temp_dir=tmp_path):
            runner.invoke(main, ["init"])
            result = runner.invoke(main, ["init"])
            assert result.exit_code != 0
            assert "already initialized" in result.output

    def test_status_no_project(self, tmp_path: Path) -> None:
        runner = CliRunner()
        with runner.isolated_filesystem(temp_dir=tmp_path):
            result = runner.invoke(main, ["status"])
            assert result.exit_code != 0
            assert "No judgment project found" in result.output

    def test_status_with_project(self, tmp_path: Path) -> None:
        runner = CliRunner()
        with runner.isolated_filesystem(temp_dir=tmp_path):
            runner.invoke(main, ["init", "--name", "status-test"])
            result = runner.invoke(main, ["status"])
            assert result.exit_code == 0
            assert "status-test" in result.output

    def test_list_no_project(self, tmp_path: Path) -> None:
        runner = CliRunner()
        with runner.isolated_filesystem(temp_dir=tmp_path):
            result = runner.invoke(main, ["list"])
            assert result.exit_code != 0

    def test_list_with_project(self, tmp_path: Path) -> None:
        runner = CliRunner()
        with runner.isolated_filesystem(temp_dir=tmp_path):
            runner.invoke(main, ["init"])
            result = runner.invoke(main, ["list"])
            assert result.exit_code == 0

    def test_policy_show_no_project(self, tmp_path: Path) -> None:
        runner = CliRunner()
        with runner.isolated_filesystem(temp_dir=tmp_path):
            result = runner.invoke(main, ["policy", "show"])
            assert result.exit_code != 0

    def test_connect_and_disconnect(self, tmp_path: Path) -> None:
        runner = CliRunner()
        with runner.isolated_filesystem(temp_dir=tmp_path):
            runner.invoke(main, ["init"])
            result = runner.invoke(main, ["connect", "claude"])
            assert result.exit_code == 0
            assert "Connected" in result.output

            assert Path(".mcp.json").exists()
            assert Path(".claude/settings.json").exists()

            result = runner.invoke(main, ["disconnect", "claude"])
            assert result.exit_code == 0


class TestDoctorExitCodes:
    """Verify hmj doctor returns correct exit codes."""

    def test_doctor_no_project_fails(self, tmp_path: Path) -> None:
        """Doctor without a project directory should exit non-zero."""
        runner = CliRunner()
        with runner.isolated_filesystem(temp_dir=tmp_path):
            result = runner.invoke(main, ["doctor"])
            assert result.exit_code != 0
            assert "[FAIL]" in result.output
            assert "Some checks failed" in result.output

    def test_doctor_with_project_passes(self, tmp_path: Path) -> None:
        """Doctor with a valid project should exit zero."""
        runner = CliRunner()
        with runner.isolated_filesystem(temp_dir=tmp_path):
            runner.invoke(main, ["init", "--name", "doctor-test"])
            result = runner.invoke(main, ["doctor"])
            assert result.exit_code == 0
            assert "All checks passed" in result.output

    def test_doctor_shows_pass_and_warn(self, tmp_path: Path) -> None:
        """Doctor should show PASS for required checks and WARN for optional."""
        runner = CliRunner()
        with runner.isolated_filesystem(temp_dir=tmp_path):
            runner.invoke(main, ["init"])
            result = runner.invoke(main, ["doctor"])
            assert "[PASS]" in result.output
            # Claude binary/MCP/hooks are optional — expect WARN when absent
            assert "[WARN]" in result.output

    def test_doctor_broken_project_toml(self, tmp_path: Path) -> None:
        """Doctor should fail when project.toml is malformed."""
        runner = CliRunner()
        with runner.isolated_filesystem(temp_dir=tmp_path):
            runner.invoke(main, ["init"])
            # Corrupt the project.toml
            toml_path = Path(".judgment/project.toml")
            toml_path.write_text("[project]\n# id is missing\n", encoding="utf-8")
            result = runner.invoke(main, ["doctor"])
            assert result.exit_code != 0
            assert "[FAIL]" in result.output
