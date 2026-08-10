"""In-memory dependency graph for tracking relationships between judgment points.

An edge from A to B means "B depends on A" (A is upstream, B is downstream).
When A changes, B may become stale.
"""

from __future__ import annotations


class DependencyGraph:
    """Tracks directed dependencies between judgment points."""

    def __init__(self) -> None:
        self._downstream: dict[str, set[str]] = {}
        self._upstream: dict[str, set[str]] = {}

    def add_dependency(self, upstream_id: str, downstream_id: str) -> None:
        """Add a dependency edge: *downstream_id* depends on *upstream_id*."""
        self._downstream.setdefault(upstream_id, set()).add(downstream_id)
        self._upstream.setdefault(downstream_id, set()).add(upstream_id)

    def remove_dependency(self, upstream_id: str, downstream_id: str) -> None:
        """Remove a dependency edge."""
        down_set = self._downstream.get(upstream_id)
        if down_set is not None:
            down_set.discard(downstream_id)
        up_set = self._upstream.get(downstream_id)
        if up_set is not None:
            up_set.discard(upstream_id)

    def get_upstream(self, point_id: str) -> list[str]:
        """Get the direct upstream dependencies of a point."""
        return list(self._upstream.get(point_id, set()))

    def get_downstream(self, point_id: str) -> list[str]:
        """Get the direct downstream dependents of a point."""
        return list(self._downstream.get(point_id, set()))

    def get_transitive_dependents(self, point_id: str) -> list[str]:
        """Get all transitive downstream dependents of a point (BFS)."""
        visited: set[str] = set()
        queue = list(self._downstream.get(point_id, set()))

        while queue:
            current = queue.pop(0)
            if current in visited:
                continue
            visited.add(current)
            for next_id in self._downstream.get(current, set()):
                if next_id not in visited:
                    queue.append(next_id)

        return list(visited)

    def would_create_cycle(self, upstream_id: str, downstream_id: str) -> bool:
        """Check whether adding a dependency would create a cycle."""
        if upstream_id == downstream_id:
            return True

        visited: set[str] = set()
        queue = list(self._downstream.get(downstream_id, set()))

        while queue:
            current = queue.pop(0)
            if current == upstream_id:
                return True
            if current in visited:
                continue
            visited.add(current)
            for next_id in self._downstream.get(current, set()):
                if next_id not in visited:
                    queue.append(next_id)

        return False

    def remove_point(self, point_id: str) -> None:
        """Remove all edges associated with a point."""
        for down_id in list(self._downstream.get(point_id, set())):
            up_set = self._upstream.get(down_id)
            if up_set is not None:
                up_set.discard(point_id)

        for up_id in list(self._upstream.get(point_id, set())):
            down_set = self._downstream.get(up_id)
            if down_set is not None:
                down_set.discard(point_id)

        self._downstream.pop(point_id, None)
        self._upstream.pop(point_id, None)
