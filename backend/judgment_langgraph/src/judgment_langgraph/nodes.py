"""Node factory functions for LangGraph judgment workflows.

Each factory accepts a :class:`JudgmentClient` (and optional configuration)
and returns an async callable suitable for use with
:meth:`langgraph.graph.StateGraph.add_node`.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from judgment_core.detection import DetectionContext, DetectionRule, DeterministicDetector
from judgment_sdk import JudgmentClient


def create_detection_node(
    client: JudgmentClient,
    rules: list[DetectionRule] | None = None,
) -> Callable[..., Any]:
    """Create a graph node that scans actions for judgment points.

    The node reads the latest entry in ``state["messages"]``, builds a
    :class:`DetectionContext`, and runs the deterministic detector.  The
    result is written to ``state["last_detection_result"]``.

    Args:
        client: The Judgment SDK client (reserved for future server-side
            detection calls).
        rules: Optional list of detection rules.  When *None* (the default)
            the detector is initialised with an empty rule set so that
            callers can add rules later or rely on model-based detection.

    Returns:
        An async callable that accepts and returns a state dict.
    """
    detector = DeterministicDetector(rules)

    async def detection_node(state: dict[str, Any]) -> dict[str, Any]:
        messages = state.get("messages", [])
        if not messages:
            return {"last_detection_result": None}

        last_msg = messages[-1] if messages else {}
        context = DetectionContext(
            action=last_msg.get("action", ""),
            description=last_msg.get("content", ""),
        )

        summary = detector.detect(context)

        return {
            "last_detection_result": {
                "has_detections": summary.has_detections,
                "results": [
                    {
                        "rule_id": r.rule_id,
                        "reason": r.reason,
                        "confidence": r.confidence,
                    }
                    for r in summary.results
                ],
            }
        }

    return detection_node


def create_judgment_check_node(client: JudgmentClient) -> Callable[..., Any]:
    """Create a node that checks for pending judgments and interrupts if needed.

    For each id in ``state["pending_judgment_ids"]`` the node fetches the
    corresponding :class:`JudgmentPoint` via the SDK.  If the point's
    intervention level is ``pause`` or ``require-investigation``, execution
    is interrupted using LangGraph's native :func:`interrupt` mechanism.

    After the graph is resumed the node moves the judgment id from the
    *pending* list to the *resolved* list.

    Args:
        client: The Judgment SDK client used to fetch judgment points.

    Returns:
        An async callable that accepts and returns a state dict.
    """

    async def judgment_check_node(state: dict[str, Any]) -> dict[str, Any]:
        from langgraph.types import interrupt

        pending_ids = state.get("pending_judgment_ids", [])

        for point_id in pending_ids:
            point = await client.get_judgment_point(point_id)
            if point is None:
                continue

            # Check if this point requires a pause
            level = point.materiality.intervention_level
            if level in ("pause", "require-investigation"):
                # Interrupt the graph execution — the value is surfaced to the
                # client and `interrupt()` returns the resume payload on restart.
                from judgment_langgraph.interrupt import build_interrupt_payload

                interrupt(build_interrupt_payload(point))

                # After resume, result contains the resolution data.
                return {
                    "resolved_judgment_ids": [
                        *state.get("resolved_judgment_ids", []),
                        point_id,
                    ],
                    "pending_judgment_ids": [pid for pid in pending_ids if pid != point_id],
                }

        return {}

    return judgment_check_node


def create_resolution_node(client: JudgmentClient) -> Callable[..., Any]:
    """Create a node that processes resolution data after interrupt resume.

    This is a lightweight pass-through node that can be extended to
    persist resolution data back to the Judgment SDK or trigger
    downstream effects.

    Args:
        client: The Judgment SDK client (reserved for future resolution
            persistence).

    Returns:
        An async callable that accepts and returns a state dict.
    """

    async def resolution_node(state: dict[str, Any]) -> dict[str, Any]:
        resolved_ids = state.get("resolved_judgment_ids", [])
        return {"resolved_judgment_ids": resolved_ids}

    return resolution_node
