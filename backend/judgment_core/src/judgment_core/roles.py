"""Agent role definitions for the Judgment system.

Defines the four canonical roles (Detector, Analyst, Executor, Critic)
and role selection logic.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, Protocol, runtime_checkable


class RoleName(StrEnum):
    detector = "detector"
    analyst = "analyst"
    executor = "executor"
    critic = "critic"


@dataclass(frozen=True)
class AgentContext:
    """Context available to an agent operating in a role."""

    role: RoleName
    project_id: str
    session_id: str | None = None
    capabilities: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@runtime_checkable
class DetectorRole(Protocol):
    """Scans agent actions for potential judgment points."""

    async def scan(
        self, context: AgentContext, action: str, description: str
    ) -> list[dict[str, Any]]: ...


@runtime_checkable
class AnalystRole(Protocol):
    """Gathers evidence, constructs alternatives, and assesses materiality."""

    async def analyze(self, context: AgentContext, judgment_point_id: str) -> dict[str, Any]: ...


@runtime_checkable
class ExecutorRole(Protocol):
    """Executes resolved decisions and tracks outcomes."""

    async def execute(
        self, context: AgentContext, judgment_point_id: str, resolution: dict[str, Any]
    ) -> dict[str, Any]: ...


@runtime_checkable
class CriticRole(Protocol):
    """Reviews judgment quality, checks for bias, and validates consistency."""

    async def review(self, context: AgentContext, judgment_point_id: str) -> dict[str, Any]: ...


def select_role(
    action: str,
    has_pending_judgments: bool = False,
    has_resolved_judgments: bool = False,
) -> RoleName:
    """Select the appropriate agent role based on the current action.

    - If the action involves scanning/detecting, use detector.
    - If there are pending judgments requiring analysis, use analyst.
    - If there are resolved judgments to execute, use executor.
    - For review/audit actions, use critic.
    - Default: detector (always scan first).
    """
    action_lower = action.lower()

    if any(kw in action_lower for kw in ("review", "audit", "check", "validate")):
        return RoleName.critic

    if has_resolved_judgments and any(
        kw in action_lower for kw in ("execute", "apply", "implement")
    ):
        return RoleName.executor

    if has_pending_judgments and any(
        kw in action_lower for kw in ("analyze", "assess", "investigate", "compare")
    ):
        return RoleName.analyst

    return RoleName.detector
