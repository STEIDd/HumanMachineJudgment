"""Tests for judgment_core.dependency_graph.DependencyGraph."""

from __future__ import annotations

from judgment_core.dependency_graph import DependencyGraph


class TestAddAndGetDependencies:
    def test_get_downstream_after_add(self) -> None:
        graph = DependencyGraph()
        graph.add_dependency("A", "B")

        assert "B" in graph.get_downstream("A")

    def test_get_upstream_after_add(self) -> None:
        graph = DependencyGraph()
        graph.add_dependency("A", "B")

        assert "A" in graph.get_upstream("B")

    def test_multiple_downstream(self) -> None:
        graph = DependencyGraph()
        graph.add_dependency("A", "B")
        graph.add_dependency("A", "C")

        downstream = graph.get_downstream("A")
        assert set(downstream) == {"B", "C"}

    def test_multiple_upstream(self) -> None:
        graph = DependencyGraph()
        graph.add_dependency("A", "C")
        graph.add_dependency("B", "C")

        upstream = graph.get_upstream("C")
        assert set(upstream) == {"A", "B"}


class TestRemoveDependency:
    def test_remove_existing_dependency(self) -> None:
        graph = DependencyGraph()
        graph.add_dependency("A", "B")
        graph.remove_dependency("A", "B")

        assert graph.get_downstream("A") == []
        assert graph.get_upstream("B") == []

    def test_remove_nonexistent_dependency_is_safe(self) -> None:
        graph = DependencyGraph()
        # Should not raise
        graph.remove_dependency("X", "Y")


class TestTransitiveDependents:
    def test_chain_a_b_c(self) -> None:
        graph = DependencyGraph()
        graph.add_dependency("A", "B")
        graph.add_dependency("B", "C")

        result = graph.get_transitive_dependents("A")
        assert set(result) == {"B", "C"}

    def test_diamond_shape(self) -> None:
        graph = DependencyGraph()
        graph.add_dependency("A", "B")
        graph.add_dependency("A", "C")
        graph.add_dependency("B", "D")
        graph.add_dependency("C", "D")

        result = graph.get_transitive_dependents("A")
        assert set(result) == {"B", "C", "D"}

    def test_no_dependents_returns_empty(self) -> None:
        graph = DependencyGraph()
        graph.add_dependency("A", "B")

        # B has no downstream dependents
        assert graph.get_transitive_dependents("B") == []


class TestCycleDetection:
    def test_would_create_cycle_direct(self) -> None:
        graph = DependencyGraph()
        graph.add_dependency("A", "B")

        assert graph.would_create_cycle("B", "A") is True

    def test_would_create_cycle_transitive(self) -> None:
        graph = DependencyGraph()
        graph.add_dependency("A", "B")
        graph.add_dependency("B", "C")

        assert graph.would_create_cycle("C", "A") is True

    def test_self_dependency_is_cycle(self) -> None:
        graph = DependencyGraph()

        assert graph.would_create_cycle("A", "A") is True

    def test_no_cycle_when_safe(self) -> None:
        graph = DependencyGraph()
        graph.add_dependency("A", "B")

        # A -> C would not create a cycle
        assert graph.would_create_cycle("A", "C") is False


class TestRemovePoint:
    def test_removes_all_edges(self) -> None:
        graph = DependencyGraph()
        graph.add_dependency("A", "B")
        graph.add_dependency("B", "C")

        graph.remove_point("B")

        assert graph.get_downstream("A") == []
        assert graph.get_upstream("C") == []
        assert graph.get_downstream("B") == []
        assert graph.get_upstream("B") == []

    def test_remove_nonexistent_point_is_safe(self) -> None:
        graph = DependencyGraph()
        # Should not raise
        graph.remove_point("Z")


class TestEmptyGraph:
    def test_empty_graph_returns_empty_lists(self) -> None:
        graph = DependencyGraph()

        assert graph.get_upstream("X") == []
        assert graph.get_downstream("X") == []
        assert graph.get_transitive_dependents("X") == []
