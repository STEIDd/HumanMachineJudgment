"""Tests for file fingerprinting, scope validity checking, and symlink boundary."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

from hmj.fingerprint import (
    ProjectBoundaryError,
    check_scope_validity,
    compute_file_fingerprint,
    compute_scope_fingerprint,
    validate_artifact_path,
)

_SUPPORTS_SYMLINKS = hasattr(os, "symlink") and sys.platform != "win32"


class TestComputeFileFingerprint:
    def test_returns_sha256_prefix(self, tmp_path: Path) -> None:
        f = tmp_path / "test.txt"
        f.write_text("hello")
        fp = compute_file_fingerprint(f)
        assert fp.startswith("sha256:")
        assert len(fp) > 10

    def test_deterministic(self, tmp_path: Path) -> None:
        f = tmp_path / "test.txt"
        f.write_text("deterministic content")
        fp1 = compute_file_fingerprint(f)
        fp2 = compute_file_fingerprint(f)
        assert fp1 == fp2

    def test_different_content_different_fingerprint(self, tmp_path: Path) -> None:
        f1 = tmp_path / "a.txt"
        f1.write_text("content a")
        f2 = tmp_path / "b.txt"
        f2.write_text("content b")

        assert compute_file_fingerprint(f1) != compute_file_fingerprint(f2)

    def test_missing_file_returns_error(self, tmp_path: Path) -> None:
        f = tmp_path / "nonexistent.txt"
        fp = compute_file_fingerprint(f)
        assert fp == "sha256:error"

    def test_binary_content(self, tmp_path: Path) -> None:
        f = tmp_path / "binary.bin"
        f.write_bytes(b"\x00\x01\x02\x03\xff")
        fp = compute_file_fingerprint(f)
        assert fp.startswith("sha256:")


class TestComputeScopeFingerprint:
    def test_returns_path_to_fingerprint_map(self, tmp_path: Path) -> None:
        f1 = tmp_path / "a.txt"
        f1.write_text("a")
        f2 = tmp_path / "b.txt"
        f2.write_text("b")

        result = compute_scope_fingerprint([f1, f2])

        assert len(result) == 2
        assert str(f1) in result
        assert str(f2) in result
        assert all(v.startswith("sha256:") for v in result.values())

    def test_empty_list(self) -> None:
        result = compute_scope_fingerprint([])
        assert result == {}


class TestCheckScopeValidity:
    def test_valid_scope(self, tmp_path: Path) -> None:
        f = tmp_path / "file.txt"
        f.write_text("original")

        fingerprints = compute_scope_fingerprint([f])
        result = check_scope_validity(fingerprints)

        assert not result.is_stale
        assert result.changed_files == []
        assert result.missing_files == []

    def test_detects_changed_file(self, tmp_path: Path) -> None:
        f = tmp_path / "file.txt"
        f.write_text("original")

        fingerprints = compute_scope_fingerprint([f])

        # Modify the file
        f.write_text("modified")

        result = check_scope_validity(fingerprints)
        assert result.is_stale
        assert str(f) in result.changed_files

    def test_detects_missing_file(self, tmp_path: Path) -> None:
        f = tmp_path / "file.txt"
        f.write_text("temporary")

        fingerprints = compute_scope_fingerprint([f])

        # Delete the file
        f.unlink()

        result = check_scope_validity(fingerprints)
        assert result.is_stale
        assert str(f) in result.missing_files

    def test_reason_includes_details(self, tmp_path: Path) -> None:
        f = tmp_path / "file.txt"
        f.write_text("original")
        fingerprints = compute_scope_fingerprint([f])

        f.write_text("changed")
        result = check_scope_validity(fingerprints)

        assert result.reason
        assert "Changed files" in result.reason

    def test_base_path_for_relative_paths(self, tmp_path: Path) -> None:
        f = tmp_path / "sub" / "file.txt"
        f.parent.mkdir()
        f.write_text("content")

        # Record with relative path
        fingerprints = {"sub/file.txt": compute_file_fingerprint(f)}

        result = check_scope_validity(fingerprints, base_path=tmp_path)
        assert not result.is_stale


# ---------------------------------------------------------------------------
# Project boundary validation tests
# ---------------------------------------------------------------------------


class TestValidateArtifactPath:
    """Test project-root boundary enforcement."""

    def test_ordinary_project_file(self, tmp_path: Path) -> None:
        """Files inside the project root pass validation."""
        f = tmp_path / "src" / "main.py"
        f.parent.mkdir(parents=True)
        f.write_text("pass")
        result = validate_artifact_path(f, tmp_path)
        assert result == f.resolve()

    def test_nested_project_file(self, tmp_path: Path) -> None:
        """Deeply nested files inside the project pass."""
        f = tmp_path / "a" / "b" / "c" / "d.txt"
        f.parent.mkdir(parents=True)
        f.write_text("deep")
        result = validate_artifact_path(f, tmp_path)
        assert result == f.resolve()

    def test_relative_traversal_blocked(self, tmp_path: Path) -> None:
        """Relative ../.. paths that escape the project are rejected."""
        f = tmp_path / "src" / ".." / ".." / "outside.txt"
        with pytest.raises(ProjectBoundaryError, match="outside project root"):
            validate_artifact_path(f, tmp_path)

    def test_absolute_outside_path_blocked(self, tmp_path: Path) -> None:
        """Absolute paths outside the project are rejected."""
        if sys.platform != "win32":
            outside = Path("/etc/passwd")
        else:
            outside = Path("C:/Windows/System32/cmd.exe")
        with pytest.raises(ProjectBoundaryError, match="outside project root"):
            validate_artifact_path(outside, tmp_path)

    @pytest.mark.skipif(not _SUPPORTS_SYMLINKS, reason="OS does not support symlinks")
    def test_symlink_inside_project_allowed(self, tmp_path: Path) -> None:
        """Symlinks pointing to files within the project are allowed."""
        target = tmp_path / "real.txt"
        target.write_text("real content")
        link = tmp_path / "link.txt"
        link.symlink_to(target)
        result = validate_artifact_path(link, tmp_path)
        assert result == target.resolve()

    @pytest.mark.skipif(not _SUPPORTS_SYMLINKS, reason="OS does not support symlinks")
    def test_symlink_outside_project_blocked(self, tmp_path: Path) -> None:
        """Symlinks pointing outside the project are rejected."""
        project = tmp_path / "project"
        project.mkdir()
        outside_file = tmp_path / "outside.txt"
        outside_file.write_text("outside content")
        link = project / "sneaky.txt"
        link.symlink_to(outside_file)
        with pytest.raises(ProjectBoundaryError, match="outside project root"):
            validate_artifact_path(link, project)

    @pytest.mark.skipif(not _SUPPORTS_SYMLINKS, reason="OS does not support symlinks")
    def test_broken_symlink(self, tmp_path: Path) -> None:
        """Broken symlinks (target deleted) raise FileNotFoundError."""
        target = tmp_path / "target.txt"
        target.write_text("temporary")
        link = tmp_path / "link.txt"
        link.symlink_to(target)
        target.unlink()  # Break the symlink
        with pytest.raises(FileNotFoundError, match="Broken symlink|does not exist"):
            validate_artifact_path(link, tmp_path)

    @pytest.mark.skipif(not _SUPPORTS_SYMLINKS, reason="OS does not support symlinks")
    def test_symlink_chain(self, tmp_path: Path) -> None:
        """Multi-hop symlink chains inside the project are allowed."""
        real = tmp_path / "real.txt"
        real.write_text("real")
        link1 = tmp_path / "link1.txt"
        link1.symlink_to(real)
        link2 = tmp_path / "link2.txt"
        link2.symlink_to(link1)
        result = validate_artifact_path(link2, tmp_path)
        assert result == real.resolve()

    def test_deleted_file(self, tmp_path: Path) -> None:
        """Deleted files raise FileNotFoundError via strict resolution."""
        f = tmp_path / "deleted.txt"
        with pytest.raises(FileNotFoundError):
            validate_artifact_path(f, tmp_path)


class TestBoundaryEnforcedFingerprinting:
    """Test that fingerprinting respects project boundaries."""

    def test_fingerprint_with_project_root(self, tmp_path: Path) -> None:
        """Fingerprinting within project root works normally."""
        f = tmp_path / "file.txt"
        f.write_text("content")
        fp = compute_file_fingerprint(f, project_root=tmp_path)
        assert fp.startswith("sha256:")
        assert fp != "sha256:error"

    def test_fingerprint_outside_project_returns_error(self, tmp_path: Path) -> None:
        """Fingerprinting a path outside the project returns error."""
        project = tmp_path / "project"
        project.mkdir()
        outside = tmp_path / "outside.txt"
        outside.write_text("outside")
        fp = compute_file_fingerprint(outside, project_root=project)
        assert fp == "sha256:error"

    def test_scope_validity_rejects_outside_paths(self, tmp_path: Path) -> None:
        """Scope validity check rejects paths outside the project."""
        project = tmp_path / "project"
        project.mkdir()
        outside = tmp_path / "outside.txt"
        outside.write_text("outside")
        fp = compute_file_fingerprint(outside)

        result = check_scope_validity(
            {str(outside): fp},
            project_root=project,
        )
        assert result.is_stale
        assert str(outside) in result.rejected_files
        assert "outside project" in result.reason

    @pytest.mark.skipif(not _SUPPORTS_SYMLINKS, reason="OS does not support symlinks")
    def test_scope_validity_rejects_symlink_escape(self, tmp_path: Path) -> None:
        """Scope validity check rejects symlinks escaping the project."""
        project = tmp_path / "project"
        project.mkdir()
        outside = tmp_path / "secret.txt"
        outside.write_text("secret")
        link = project / "escape.txt"
        link.symlink_to(outside)
        fp = compute_file_fingerprint(outside)

        result = check_scope_validity(
            {str(link): fp},
            project_root=project,
        )
        assert result.is_stale
        assert str(link) in result.rejected_files
