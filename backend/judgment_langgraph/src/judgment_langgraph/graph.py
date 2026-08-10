"""Pre-built LangGraph graph factory with judgment point detection and interrupts.

Use :func:`create_judgment_graph` to get an uncompiled :class:`StateGraph`
that wires together detection and judgment-check nodes.  The caller is
responsible for compiling the graph with a checkpointer so that
``interrupt()`` works correctly::

    graph = create_judgment_graph(client, detection_rules=rules)
    compiled = graph.compile(checkpointer=InMemorySaver())
"""

from __future__ import annotations

from typing import Any

from judgment_core.detection import DetectionRule
from judgment_langgraph.nodes import create_detection_node, create_judgment_check_node
from judgment_langgraph.state import JudgmentState
from judgment_sdk import JudgmentClient


def create_judgment_graph(
    client: JudgmentClient,
    detection_rules: list[DetectionRule] | None = None,
) -> Any:
    """Create a LangGraph graph with judgment point detection and interrupts.

    The returned graph has two nodes:

    * **detect** -- scans the latest message for judgment-worthy actions
      using the supplied (or empty) set of detection rules.
    * **check_judgments** -- iterates over ``pending_judgment_ids`` and
      interrupts the graph when a point requires human input.

    The graph is returned *uncompiled*.  Call
    ``graph.compile(checkpointer=...)`` before invoking or streaming.

    Args:
        client: A :class:`JudgmentClient` instance used by the nodes.
        detection_rules: Optional detection rules forwarded to the
            detection node.

    Returns:
        An uncompiled :class:`langgraph.graph.StateGraph`.
    """
    from langgraph.graph import END, StateGraph

    detection_node = create_detection_node(client, detection_rules)
    check_node = create_judgment_check_node(client)

    graph = StateGraph(JudgmentState)
    graph.add_node("detect", detection_node)
    graph.add_node("check_judgments", check_node)

    graph.set_entry_point("detect")
    graph.add_edge("detect", "check_judgments")
    graph.add_edge("check_judgments", END)

    return graph
