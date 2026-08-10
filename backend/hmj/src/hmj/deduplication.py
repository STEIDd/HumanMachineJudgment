"""Decision deduplication via stable decision keys.

A decision key is a stable identifier for a class of decisions.
If the same decision arises again (same tool, same context), the
system checks whether a resolution already exists rather than
creating a duplicate judgment point.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any


def compute_decision_key(
    category: str,
    tool_name: str,
    key_args: dict[str, Any] | None = None,
    *,
    project_id: str = "",
) -> str:
    """Compute a stable decision key from the decision context.

    The key is a SHA-256 hash of the project ID, category, tool name,
    and sorted key arguments.  Including the project ID prevents
    cross-project deduplication collisions.
    """
    parts = [project_id, category, tool_name]

    if key_args:
        # Sort keys for deterministic hashing
        sorted_args = json.dumps(key_args, sort_keys=True, default=str)
        parts.append(sorted_args)

    raw = ":".join(parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def extract_key_args(tool_name: str, tool_input: dict[str, Any]) -> dict[str, Any] | None:
    """Extract the salient arguments from a tool call for decision keying.

    Returns the minimal set of arguments that identify the decision.
    Irrelevant details (descriptions, timeouts) are excluded so that
    differently-worded but semantically equivalent calls produce the
    same key.
    """
    if tool_name == "Bash":
        command = tool_input.get("command", "")
        # Normalize: extract the base command (first token chain)
        # e.g. "rm -rf /important" → "rm -rf"
        # e.g. "git push --force origin main" → "git push --force"
        tokens = command.split()
        # Keep command + flags (tokens starting with -)
        base: list[str] = []
        for t in tokens:
            if t.startswith("-") or not base:
                base.append(t)
            elif len(base) == 1:
                # Second positional token (sub-command like "push")
                base.append(t)
            else:
                break
        return {"command_pattern": " ".join(base)} if base else None

    if tool_name in ("Edit", "Write", "NotebookEdit"):
        file_path = tool_input.get("file_path", "")
        return {"file_path": file_path} if file_path else None

    # For other tools, use tool_name alone (no key_args)
    return None
