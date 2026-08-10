"""Hook processing for Claude Code integration.

Handles PreToolUse, PostToolUse, and Stop hook events from Claude Code.
Runs the detection pipeline, manages decision deduplication, tracks
artifact modifications for staleness, and enforces session-scoped
judgment requirements at stop time.

All hook payloads are validated through typed Pydantic models before
processing (see ``hmj.hook_schemas``).

**Fail-safe policy**: If a PreToolUse payload cannot be validated,
the tool call is denied (fail-closed) to prevent bypassing detection.
If a PostToolUse or Stop payload cannot be validated, the hook returns
an empty response (no-op) since those hooks are advisory.
"""

from __future__ import annotations

import sys
from typing import Any

from pydantic import ValidationError

from judgment_core.storage import JudgmentStorage
from judgment_core.types import InterventionLevel, JudgmentStatus


async def process_hook_event(event_type: str, hook_input: dict[str, Any]) -> dict[str, Any]:
    """Process a Claude Code hook event.

    Args:
        event_type: The hook event type (e.g., "pre-tool-use", "post-tool-use", "stop").
        hook_input: The JSON input from Claude Code.

    Returns:
        A JSON-serializable dict for the hook response.
        Empty dict means "allow" (no intervention).
    """
    if event_type == "pre-tool-use":
        return await _handle_pre_tool_use(hook_input)
    elif event_type == "post-tool-use":
        return await _handle_post_tool_use(hook_input)
    elif event_type == "stop":
        return await _handle_stop(hook_input)
    else:
        return {}


# ---------------------------------------------------------------------------
# PreToolUse — detection, deduplication, candidate creation
# ---------------------------------------------------------------------------


async def _handle_pre_tool_use(hook_input: dict[str, Any]) -> dict[str, Any]:
    """Process a PreToolUse hook event.

    1. Validate payload via typed schema (fail-closed on validation error).
    2. Run detection pipeline.
    3. If pause/require-investigation:
       a. Compute decision key and check for existing resolution.
       b. If valid resolution exists → allow (return empty).
       c. If existing unresolved point → deny referencing it (no duplicate).
       d. Otherwise → create candidate, deny.
    """
    from hmj.hook_schemas import parse_pre_tool_use

    try:
        parsed = parse_pre_tool_use(hook_input)
    except ValidationError as e:
        print(f"[hmj] PreToolUse payload validation failed: {e}", file=sys.stderr)
        return _deny_response(
            "HMJ could not validate the hook payload. Denying tool call as a safety precaution."
        )

    tool_name = parsed.tool_name
    tool_input = parsed.tool_input

    if not tool_name:
        return {}

    from hmj.detection import build_detection_context, create_hook_detector

    context = build_detection_context(tool_name, tool_input)
    detector = create_hook_detector()
    summary = detector.detect(context)

    if not summary.has_detections:
        return {}

    # For trace/disclose levels, log but don't block.
    if summary.highest_intervention in (
        InterventionLevel.trace,
        InterventionLevel.disclose,
    ):
        top_result = summary.results[0]
        print(
            f"[hmj] Detected: {top_result.reason} (level: {summary.highest_intervention})",
            file=sys.stderr,
        )
        return {}

    # For pause/require-investigation levels — check dedup, then deny or allow.
    top_result = summary.results[0]
    reason = top_result.reason
    category = str(
        top_result.suggested_category.value if top_result.suggested_category else "method"
    )
    session_id = parsed.session_id

    try:
        from hmj.deduplication import compute_decision_key, extract_key_args
        from hmj.identity import resolve_hook_identity
        from hmj.project import load_project
        from hmj.storage import get_storage

        project = load_project()
        storage = get_storage(project)

        from judgment_sdk import CreateCandidateParams, JudgmentClient

        key_args = extract_key_args(tool_name, tool_input)
        decision_key = compute_decision_key(
            category, tool_name, key_args, project_id=project.project_id
        )

        async with storage:
            # --- Deduplication check ---
            existing = await storage.get_by_decision_key(project.project_id, decision_key)

            if existing is not None:
                if existing.status == JudgmentStatus.resolved:
                    # Check resolution scope validity (fingerprints)
                    if await _is_scope_valid(storage, existing.id, project.root):
                        print(
                            f"[hmj] Reusing resolution for decision {decision_key}",
                            file=sys.stderr,
                        )
                        return {}  # Allow — valid resolution exists

                    # Resolution is stale — deny and inform
                    return _deny_response(
                        f"Previous resolution for this decision is stale. "
                        f"Review point {existing.id} with 'hmj show {existing.id}'."
                    )

                if existing.status == JudgmentStatus.dismissed:
                    # Dismissed decisions are allowed to proceed
                    print(
                        f"[hmj] Decision {decision_key} was previously dismissed",
                        file=sys.stderr,
                    )
                    return {}

                # Existing unresolved point — deny without creating duplicate
                return _deny_response(
                    f"Judgment point {existing.id} already tracks this decision. "
                    f"Status: {existing.status.value}. "
                    f"Use 'hmj show {existing.id}' to review."
                )

            # --- No existing point — create candidate ---
            client = JudgmentClient(storage)
            identity = resolve_hook_identity()

            materiality = _materiality_for_intervention(summary.highest_intervention)

            params = CreateCandidateParams(
                project_id=project.project_id,
                category=category,
                question=f"Should this action proceed? Tool: {tool_name}",
                context=f"Tool input: {context.description[:200]}",
                trigger={
                    "source": "tool",
                    "description": reason,
                },
                materiality=materiality,
            )

            point = await client.create_candidate(params, identity.actor)

            # Persist decision key and session ID via storage methods
            await storage.set_decision_key(point.id, decision_key)
            if session_id:
                await storage.set_session_id(point.id, session_id)

    except Exception as e:  # noqa: BLE001 — best-effort; deny response must still be returned
        print(f"[hmj] Warning: could not create candidate: {e}", file=sys.stderr)

    return _deny_response(f"Judgment required: {reason}. Use 'hmj status' to review.")


# ---------------------------------------------------------------------------
# PostToolUse — artifact tracking and staleness
# ---------------------------------------------------------------------------

_FILE_MODIFYING_TOOLS = frozenset({"Edit", "Write", "NotebookEdit"})


async def _handle_post_tool_use(hook_input: dict[str, Any]) -> dict[str, Any]:
    """Process a PostToolUse hook event.

    After a file-modifying tool succeeds, check whether any resolved
    judgment point has a resolution scope that includes the modified
    artifact. If so, recompute fingerprints and mark stale if changed.
    """
    from hmj.hook_schemas import parse_post_tool_use

    try:
        parsed = parse_post_tool_use(hook_input)
    except ValidationError:
        # PostToolUse is advisory — fail-open on malformed payload
        return {}

    tool_name = parsed.tool_name
    tool_input = parsed.tool_input

    # Only process file-modifying tools
    if tool_name not in _FILE_MODIFYING_TOOLS:
        return {}

    file_path = tool_input.get("file_path", "")
    if not file_path:
        return {}

    try:
        from hmj.fingerprint import compute_file_fingerprint
        from hmj.identity import resolve_hook_identity
        from hmj.project import load_project
        from hmj.storage import get_storage

        project = load_project()
        storage = get_storage(project)

        from pathlib import Path

        from judgment_sdk import JudgmentClient

        async with storage:
            # Find resolved points with resolution scopes referencing this file
            result = await storage.get_judgment_points(project.project_id)
            stale_points: list[str] = []

            for point in result.items:
                if point.status != JudgmentStatus.resolved:
                    continue

                scope = await storage.get_resolution_scope(point.id)
                if not scope:
                    continue

                fingerprints = scope.get("artifactFingerprints", {})
                matched_path = _match_artifact_path(file_path, fingerprints, project.root)
                if not matched_path:
                    continue

                # Recompute fingerprint and compare
                current_fp = compute_file_fingerprint(Path(file_path))
                stored_fp = fingerprints.get(matched_path, "")

                if current_fp != stored_fp:
                    identity = resolve_hook_identity()
                    client = JudgmentClient(storage)
                    try:
                        await client.mark_stale(
                            point.id,
                            f"Artifact '{matched_path}' was modified (fingerprint changed)",
                            identity.actor,
                        )
                        stale_points.append(point.id)
                    except Exception as e:  # noqa: BLE001
                        print(
                            f"[hmj] Warning: could not mark {point.id} stale: {e}",
                            file=sys.stderr,
                        )

            if stale_points:
                msg = (
                    f"[hmj] Resolution(s) invalidated by edit to {file_path}: "
                    f"{', '.join(stale_points)}"
                )
                print(msg, file=sys.stderr)
                return {
                    "hookSpecificOutput": {
                        "hookEventName": "PostToolUse",
                        "additionalContext": (
                            f"A previous judgment resolution has become stale because "
                            f"'{file_path}' was modified. Affected judgment point(s): "
                            f"{', '.join(stale_points)}. Use 'hmj status' to review."
                        ),
                    },
                }

    except Exception as e:  # noqa: BLE001
        print(f"[hmj] Warning: PostToolUse processing failed: {e}", file=sys.stderr)

    return {}


# ---------------------------------------------------------------------------
# Stop — session-scoped judgment enforcement
# ---------------------------------------------------------------------------


async def _handle_stop(hook_input: dict[str, Any]) -> dict[str, Any]:
    """Process a Stop hook event.

    Check whether the current session has unresolved judgment points
    that require attention before the task can be considered complete.
    Uses stop_hook_active to prevent infinite loops.
    """
    from hmj.hook_schemas import parse_stop

    try:
        parsed = parse_stop(hook_input)
    except ValidationError:
        # Stop is advisory — fail-open on malformed payload
        return {}

    # Loop prevention: if we already continued once, allow stop
    if parsed.stop_hook_active:
        return {}

    session_id = parsed.session_id
    if not session_id:
        return {}

    try:
        from hmj.project import load_project
        from hmj.storage import get_storage

        project = load_project()
        storage = get_storage(project)

        async with storage:
            # Get points for this session directly
            points = await storage.get_points_by_session(project.project_id, session_id)

            # Find unresolved points that require attention
            unresolved = []
            for point in points:
                if point.status not in (
                    JudgmentStatus.pending,
                    JudgmentStatus.investigating,
                    JudgmentStatus.reopened,
                ):
                    continue

                # Check intervention level — only block for pause or higher
                intervention = point.materiality.intervention_level
                if intervention in (
                    InterventionLevel.pause,
                    InterventionLevel.require_investigation,
                ):
                    unresolved.append(point)

            if not unresolved:
                return {}

            # Block stop — direct user to resolve
            top = unresolved[0]
            count_msg = f" (and {len(unresolved) - 1} more)" if len(unresolved) > 1 else ""
            return {
                "decision": "block",
                "reason": (
                    f"Unresolved judgment point requires attention{count_msg}: "
                    f"{top.question} "
                    f"Use 'hmj show {top.id}' to review or "
                    f"'hmj resolve {top.id}' to resolve."
                ),
            }

    except Exception as e:  # noqa: BLE001
        print(f"[hmj] Warning: Stop hook processing failed: {e}", file=sys.stderr)

    return {}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _materiality_for_intervention(level: InterventionLevel | None) -> dict[str, Any]:
    """Build a materiality dict matching the detected intervention level."""
    if level == InterventionLevel.require_investigation:
        return {
            "score": 15,
            "dimensions": {
                "methodologicalDiscretion": 3,
                "downstreamInfluence": 3,
                "uncertainty": 3,
                "consequence": 2,
                "reversibility": 2,
                "accountabilityRequirement": 2,
            },
            "interventionLevel": "require-investigation",
        }
    if level == InterventionLevel.pause:
        return {
            "score": 10,
            "dimensions": {
                "methodologicalDiscretion": 2,
                "downstreamInfluence": 2,
                "uncertainty": 2,
                "consequence": 2,
                "reversibility": 1,
                "accountabilityRequirement": 1,
            },
            "interventionLevel": "pause",
        }
    # For disclose and trace levels (shouldn't reach candidate creation, but be safe)
    return {
        "score": 0,
        "dimensions": {
            "methodologicalDiscretion": 0,
            "downstreamInfluence": 0,
            "uncertainty": 0,
            "consequence": 0,
            "reversibility": 0,
            "accountabilityRequirement": 0,
        },
    }


def _deny_response(reason: str) -> dict[str, Any]:
    """Build a PreToolUse deny response."""
    return {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        },
    }


async def _is_scope_valid(storage: JudgmentStorage, point_id: str, project_root: Any) -> bool:
    """Check whether a resolved point's resolution scope is still valid."""
    scope = await storage.get_resolution_scope(point_id)
    if not scope:
        # No scope recorded — treat as valid (legacy resolution)
        return True

    fingerprints = scope.get("artifactFingerprints", {})
    if not fingerprints:
        return True

    from pathlib import Path

    from hmj.fingerprint import check_scope_validity

    root = Path(str(project_root))
    result = check_scope_validity(fingerprints, base_path=root, project_root=root)
    return not result.is_stale


def _match_artifact_path(
    modified_path: str,
    fingerprints: dict[str, str],
    project_root: Any,
) -> str | None:
    """Match a modified file path against fingerprint keys.

    Returns the matching key from fingerprints, or None.
    """
    from pathlib import Path

    modified = Path(modified_path)

    for fp_path in fingerprints:
        candidate = Path(fp_path)
        if not candidate.is_absolute() and project_root:
            candidate = Path(str(project_root)) / candidate
        try:
            if modified.resolve() == candidate.resolve():
                return fp_path
        except (OSError, ValueError):
            continue

    return None
