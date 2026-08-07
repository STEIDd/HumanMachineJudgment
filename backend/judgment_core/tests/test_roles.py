"""Tests for the judgment_core.roles module."""

from __future__ import annotations

from judgment_core.roles import AgentContext, RoleName, select_role

# ---------------------------------------------------------------------------
# RoleName enum
# ---------------------------------------------------------------------------


class TestRoleName:
    """RoleName enum should expose the four canonical roles."""

    def test_has_four_members(self) -> None:
        assert len(RoleName) == 4

    def test_values(self) -> None:
        assert RoleName.detector == "detector"
        assert RoleName.analyst == "analyst"
        assert RoleName.executor == "executor"
        assert RoleName.critic == "critic"


# ---------------------------------------------------------------------------
# AgentContext
# ---------------------------------------------------------------------------


class TestAgentContext:
    """AgentContext should store role, project_id, and optional fields."""

    def test_construction_with_required_fields(self) -> None:
        ctx = AgentContext(role=RoleName.detector, project_id="proj-1")
        assert ctx.role == RoleName.detector
        assert ctx.project_id == "proj-1"
        assert ctx.session_id is None
        assert ctx.capabilities == []
        assert ctx.metadata == {}

    def test_construction_with_all_fields(self) -> None:
        ctx = AgentContext(
            role=RoleName.analyst,
            project_id="proj-2",
            session_id="sess-99",
            capabilities=["read", "write"],
            metadata={"key": "value"},
        )
        assert ctx.session_id == "sess-99"
        assert ctx.capabilities == ["read", "write"]
        assert ctx.metadata == {"key": "value"}


# ---------------------------------------------------------------------------
# select_role
# ---------------------------------------------------------------------------


class TestSelectRole:
    """select_role returns the appropriate role based on action and flags."""

    def test_default_is_detector(self) -> None:
        assert select_role("do something generic") == RoleName.detector

    def test_review_action_returns_critic(self) -> None:
        assert select_role("review changes") == RoleName.critic

    def test_audit_action_returns_critic(self) -> None:
        assert select_role("audit the results") == RoleName.critic

    def test_validate_action_returns_critic(self) -> None:
        assert select_role("validate output") == RoleName.critic

    def test_execute_with_resolved_judgments_returns_executor(self) -> None:
        result = select_role("execute plan", has_resolved_judgments=True)
        assert result == RoleName.executor

    def test_apply_with_resolved_judgments_returns_executor(self) -> None:
        result = select_role("apply resolution", has_resolved_judgments=True)
        assert result == RoleName.executor

    def test_execute_without_resolved_judgments_returns_detector(self) -> None:
        result = select_role("execute plan", has_resolved_judgments=False)
        assert result == RoleName.detector

    def test_analyze_with_pending_judgments_returns_analyst(self) -> None:
        result = select_role("analyze evidence", has_pending_judgments=True)
        assert result == RoleName.analyst

    def test_assess_with_pending_judgments_returns_analyst(self) -> None:
        result = select_role("assess materiality", has_pending_judgments=True)
        assert result == RoleName.analyst

    def test_analyze_without_pending_judgments_returns_detector(self) -> None:
        result = select_role("analyze evidence", has_pending_judgments=False)
        assert result == RoleName.detector
