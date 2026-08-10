"""Tests for decision key computation and deduplication logic."""

from __future__ import annotations

from hmj.deduplication import compute_decision_key


class TestComputeDecisionKey:
    def test_deterministic(self) -> None:
        key1 = compute_decision_key("method", "Bash", {"command": "rm -rf"})
        key2 = compute_decision_key("method", "Bash", {"command": "rm -rf"})
        assert key1 == key2

    def test_different_categories_produce_different_keys(self) -> None:
        key1 = compute_decision_key("method", "Bash")
        key2 = compute_decision_key("data", "Bash")
        assert key1 != key2

    def test_different_tools_produce_different_keys(self) -> None:
        key1 = compute_decision_key("method", "Bash")
        key2 = compute_decision_key("method", "Write")
        assert key1 != key2

    def test_different_args_produce_different_keys(self) -> None:
        key1 = compute_decision_key("method", "Bash", {"command": "rm -rf"})
        key2 = compute_decision_key("method", "Bash", {"command": "ls"})
        assert key1 != key2

    def test_no_args_produces_valid_key(self) -> None:
        key = compute_decision_key("method", "Bash")
        assert isinstance(key, str)
        assert len(key) == 16

    def test_key_length(self) -> None:
        key = compute_decision_key("method", "Bash", {"a": 1, "b": "two"})
        assert len(key) == 16

    def test_arg_order_does_not_matter(self) -> None:
        key1 = compute_decision_key("method", "Bash", {"a": 1, "b": 2})
        key2 = compute_decision_key("method", "Bash", {"b": 2, "a": 1})
        assert key1 == key2

    def test_none_args_same_as_no_args(self) -> None:
        key1 = compute_decision_key("method", "Bash", None)
        key2 = compute_decision_key("method", "Bash")
        assert key1 == key2
