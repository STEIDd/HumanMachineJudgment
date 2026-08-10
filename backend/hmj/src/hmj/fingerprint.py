"""Artifact fingerprinting for resolution scope validation.

When a judgment point is resolved, the system can record fingerprints
of affected artifacts (files). On subsequent invocations, the system
checks whether any affected artifact has changed since the resolution.

**Project-boundary policy**: All artifact paths are resolved to their
real filesystem target (following symlinks) and validated to lie within
the project root. Paths that escape the project root via symlinks,
``..`` traversal, or absolute references outside the project are
rejected. Broken symlinks and symlink loops are handled explicitly
and treated as missing artifacts. If HMJ needs to support external
artifacts in the future, that must require a separately authorized
mechanism.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class StalenessCheckResult:
    """Result of checking whether a resolution's scope is still valid."""

    is_stale: bool
    changed_files: list[str] = field(default_factory=list)
    missing_files: list[str] = field(default_factory=list)
    rejected_files: list[str] = field(default_factory=list)
    reason: str = ""


class ProjectBoundaryError(Exception):
    """Raised when a path escapes the project root."""


def validate_artifact_path(
    path: Path,
    project_root: Path,
) -> Path:
    """Resolve and validate that an artifact path is within the project root.

    1. Normalizes the supplied path.
    2. Resolves the effective filesystem target (following symlinks).
    3. Verifies the effective target remains inside the project root.
    4. Rejects traversal outside the project.
    5. Handles broken symlinks and symlink loops safely.

    Args:
        path: The path to validate (may be relative or absolute).
        project_root: The project root directory (must be absolute).

    Returns:
        The resolved, validated absolute path.

    Raises:
        ProjectBoundaryError: If the path escapes the project root.
        FileNotFoundError: If the path is a broken symlink or does not exist.
    """
    # Normalize the project root
    resolved_root = project_root.resolve(strict=False)

    # Resolve the path (follows symlinks). Use strict=False first to
    # handle broken symlinks, then strict=True to verify existence.
    try:
        resolved = path.resolve(strict=False)
    except (OSError, RuntimeError) as e:
        # RuntimeError can occur with symlink loops on some platforms
        raise ProjectBoundaryError(f"Cannot resolve path '{path}': {e}") from e

    # Check if the resolved path is within the project root
    try:
        resolved.relative_to(resolved_root)
    except ValueError as exc:
        raise ProjectBoundaryError(
            f"Path '{path}' resolves to '{resolved}' which is "
            f"outside project root '{resolved_root}'"
        ) from exc

    # Check for broken symlinks: if the path is a symlink but doesn't
    # exist on disk, it's broken
    if path.is_symlink() and not path.exists():
        raise FileNotFoundError(f"Broken symlink: '{path}' -> target does not exist")

    # Also check via strict resolution for symlink loops
    try:
        path.resolve(strict=True)
    except OSError as e:
        # This catches symlink loops and other resolution errors
        if path.is_symlink():
            raise FileNotFoundError(f"Cannot resolve symlink '{path}': {e}") from e
        if not path.exists():
            raise FileNotFoundError(f"Path does not exist: '{path}'") from e
        raise

    return resolved


def compute_file_fingerprint(
    path: Path,
    *,
    project_root: Path | None = None,
) -> str:
    """Compute a SHA-256 fingerprint of a file's content.

    When ``project_root`` is provided, validates that the path remains
    within the project boundary before reading.
    """
    if project_root is not None:
        try:
            validate_artifact_path(path, project_root)
        except (ProjectBoundaryError, FileNotFoundError):
            return "sha256:error"

    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return f"sha256:{h.hexdigest()}"
    except (OSError, PermissionError):
        return "sha256:error"


def compute_scope_fingerprint(
    paths: list[Path],
    *,
    project_root: Path | None = None,
) -> dict[str, str]:
    """Compute fingerprints for a list of file paths.

    Returns a dict mapping string paths to their fingerprints.
    When ``project_root`` is provided, paths outside the project
    root are rejected with a ``sha256:error`` fingerprint.
    """
    result: dict[str, str] = {}
    for path in paths:
        result[str(path)] = compute_file_fingerprint(path, project_root=project_root)
    return result


def check_scope_validity(
    recorded_fingerprints: dict[str, str],
    base_path: Path | None = None,
    *,
    project_root: Path | None = None,
) -> StalenessCheckResult:
    """Check whether any artifact has changed since the fingerprints were recorded.

    Args:
        recorded_fingerprints: Map of file path -> fingerprint from resolution.
        base_path: Optional base directory to resolve relative paths.
        project_root: Optional project root for boundary validation.
            When provided, paths outside the project are treated as
            rejected (stale).

    Returns:
        A StalenessCheckResult indicating whether the scope is stale.
    """
    changed: list[str] = []
    missing: list[str] = []
    rejected: list[str] = []

    # If no explicit project_root, use base_path for boundary checking
    effective_root = project_root or base_path

    for path_str, recorded_fp in recorded_fingerprints.items():
        path = Path(path_str)
        if base_path and not path.is_absolute():
            path = base_path / path

        # Boundary validation when project root is available
        if effective_root is not None:
            try:
                validate_artifact_path(path, effective_root)
            except ProjectBoundaryError:
                rejected.append(path_str)
                continue
            except FileNotFoundError:
                missing.append(path_str)
                continue

        if not path.exists():
            missing.append(path_str)
            continue

        current_fp = compute_file_fingerprint(path)
        if current_fp != recorded_fp:
            changed.append(path_str)

    if changed or missing or rejected:
        reasons = []
        if changed:
            reasons.append(f"Changed files: {', '.join(changed)}")
        if missing:
            reasons.append(f"Missing files: {', '.join(missing)}")
        if rejected:
            reasons.append(f"Rejected (outside project): {', '.join(rejected)}")
        return StalenessCheckResult(
            is_stale=True,
            changed_files=changed,
            missing_files=missing,
            rejected_files=rejected,
            reason="; ".join(reasons),
        )

    return StalenessCheckResult(is_stale=False)
