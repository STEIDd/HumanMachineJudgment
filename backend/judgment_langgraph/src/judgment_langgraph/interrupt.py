"""Judgment-specific wrapper around LangGraph's interrupt mechanism.

Provides :func:`judgment_interrupt` which formats a :class:`JudgmentPoint`
into a structured interrupt payload and delegates to LangGraph's
:func:`langgraph.types.interrupt`.
"""

from __future__ import annotations

from typing import Any

from judgment_core.types import JudgmentPoint


def build_interrupt_payload(point: JudgmentPoint) -> dict[str, Any]:
    """Build the interrupt payload dict from a JudgmentPoint.

    This is a pure function that does **not** call LangGraph's
    ``interrupt()`` and is therefore safe to use in tests and outside
    of a graph context.
    """
    return {
        "type": "judgment-point",
        "judgment_point_id": point.id,
        "question": point.question,
        "alternatives": [
            {"id": alt.id, "label": alt.label, "description": alt.description}
            for alt in point.alternatives
        ],
        "authority_mode": str(point.authority.mode),
        "intervention_level": (
            str(point.materiality.intervention_level)
            if point.materiality.intervention_level
            else None
        ),
    }


def judgment_interrupt(point: JudgmentPoint) -> Any:
    """Create a judgment-specific interrupt payload and call LangGraph interrupt.

    This function must be called from within a LangGraph node that is
    executing inside a compiled graph with a checkpointer enabled.
    On first invocation it raises ``GraphInterrupt``; on resume it
    returns the value supplied via ``Command(resume=...)``.

    Args:
        point: The judgment point to interrupt for.

    Returns:
        The resume value provided by the client after the interrupt.

    Raises:
        GraphInterrupt: On the first invocation (this is how LangGraph
            pauses execution).
    """
    from langgraph.types import interrupt

    payload = build_interrupt_payload(point)
    return interrupt(payload)
