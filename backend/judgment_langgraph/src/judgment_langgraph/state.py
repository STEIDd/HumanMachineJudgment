"""LangGraph state type that includes judgment tracking fields."""

from __future__ import annotations

from typing import Any, TypedDict


class JudgmentState(TypedDict, total=False):
    """LangGraph state dict that includes judgment tracking fields.

    All fields are optional (``total=False``) so that nodes can return
    partial updates containing only the keys they modify.
    """

    messages: list[dict[str, Any]]
    judgment_points: list[dict[str, Any]]
    pending_judgment_ids: list[str]
    resolved_judgment_ids: list[str]
    last_detection_result: dict[str, Any] | None
