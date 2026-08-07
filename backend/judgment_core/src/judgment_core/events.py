"""Event creation functions for the Judgment Point lifecycle.

Each function creates a JudgmentEvent with the appropriate event type and payload.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from judgment_core.id_gen import generate_id
from judgment_core.types import (
    Actor,
    ArtifactReference,
    EventMetadata,
    EventType,
    JudgmentAlternative,
    JudgmentEvent,
    JudgmentResolution,
    JudgmentStatus,
)


def _create_base_event(
    event_type: EventType,
    judgment_point_id: str,
    project_id: str,
    actor: Actor,
    payload: dict[str, Any] | None = None,
    metadata: EventMetadata | None = None,
) -> JudgmentEvent:
    return JudgmentEvent(
        id=generate_id(),
        judgment_point_id=judgment_point_id,
        project_id=project_id,
        event_type=event_type,
        timestamp=datetime.now(UTC),
        actor_id=actor.id,
        actor_type=actor.type,
        payload=payload,
        metadata=metadata,
    )


# ---------------------------------------------------------------------------
# Event creation functions
# ---------------------------------------------------------------------------


def create_created_event(
    *,
    judgment_point_id: str,
    project_id: str,
    actor: Actor,
    candidate_data: dict[str, Any],
) -> JudgmentEvent:
    return _create_base_event(
        EventType.created,
        judgment_point_id,
        project_id,
        actor,
        payload=candidate_data,
        metadata=EventMetadata(previous_status=None, new_status="candidate"),
    )


def create_promoted_event(
    *,
    judgment_point_id: str,
    project_id: str,
    actor: Actor,
    previous_status: JudgmentStatus,
    new_status: JudgmentStatus,
    payload: dict[str, Any] | None = None,
) -> JudgmentEvent:
    return _create_base_event(
        EventType.promoted,
        judgment_point_id,
        project_id,
        actor,
        payload=payload,
        metadata=EventMetadata(previous_status=previous_status.value, new_status=new_status.value),
    )


def create_investigation_started_event(
    *,
    judgment_point_id: str,
    project_id: str,
    actor: Actor,
    previous_status: JudgmentStatus,
    new_status: JudgmentStatus,
    payload: dict[str, Any] | None = None,
) -> JudgmentEvent:
    return _create_base_event(
        EventType.investigation_started,
        judgment_point_id,
        project_id,
        actor,
        payload=payload,
        metadata=EventMetadata(previous_status=previous_status.value, new_status=new_status.value),
    )


def create_resolution_recorded_event(
    *,
    judgment_point_id: str,
    project_id: str,
    actor: Actor,
    previous_status: JudgmentStatus,
    resolution: JudgmentResolution,
) -> JudgmentEvent:
    return _create_base_event(
        EventType.resolution_recorded,
        judgment_point_id,
        project_id,
        actor,
        payload=resolution.model_dump(by_alias=True),
        metadata=EventMetadata(previous_status=previous_status.value, new_status="resolved"),
    )


def create_delegated_event(
    *,
    judgment_point_id: str,
    project_id: str,
    actor: Actor,
    previous_status: JudgmentStatus,
    delegate_id: str,
    policy_id: str,
) -> JudgmentEvent:
    return _create_base_event(
        EventType.delegated,
        judgment_point_id,
        project_id,
        actor,
        payload={"delegateId": delegate_id, "policyId": policy_id},
        metadata=EventMetadata(previous_status=previous_status.value, new_status="delegated"),
    )


def create_dismissed_event(
    *,
    judgment_point_id: str,
    project_id: str,
    actor: Actor,
    previous_status: JudgmentStatus,
    reason: str,
) -> JudgmentEvent:
    return _create_base_event(
        EventType.dismissed,
        judgment_point_id,
        project_id,
        actor,
        payload={"reason": reason},
        metadata=EventMetadata(previous_status=previous_status.value, new_status="dismissed"),
    )


def create_reopened_event(
    *,
    judgment_point_id: str,
    project_id: str,
    actor: Actor,
    previous_status: JudgmentStatus,
    reason: str,
) -> JudgmentEvent:
    return _create_base_event(
        EventType.reopened,
        judgment_point_id,
        project_id,
        actor,
        payload={"reason": reason},
        metadata=EventMetadata(previous_status=previous_status.value, new_status="reopened"),
    )


def create_marked_stale_event(
    *,
    judgment_point_id: str,
    project_id: str,
    actor: Actor,
    reason: str,
    previous_status: JudgmentStatus | None = None,
) -> JudgmentEvent:
    return _create_base_event(
        EventType.marked_stale,
        judgment_point_id,
        project_id,
        actor,
        payload={"reason": reason},
        metadata=EventMetadata(
            previous_status=(previous_status.value if previous_status else "resolved"),
            new_status="stale",
        ),
    )


def create_dependency_changed_event(
    *,
    judgment_point_id: str,
    project_id: str,
    actor: Actor,
    upstream_id: str,
    change_description: str,
) -> JudgmentEvent:
    return _create_base_event(
        EventType.dependency_changed,
        judgment_point_id,
        project_id,
        actor,
        payload={
            "upstreamId": upstream_id,
            "changeDescription": change_description,
        },
    )


def create_artifact_linked_event(
    *,
    judgment_point_id: str,
    project_id: str,
    actor: Actor,
    artifact: ArtifactReference,
) -> JudgmentEvent:
    return _create_base_event(
        EventType.artifact_linked,
        judgment_point_id,
        project_id,
        actor,
        payload=artifact.model_dump(by_alias=True),
    )


def create_artifact_unlinked_event(
    *,
    judgment_point_id: str,
    project_id: str,
    actor: Actor,
    artifact_id: str,
    reason: str,
) -> JudgmentEvent:
    return _create_base_event(
        EventType.artifact_unlinked,
        judgment_point_id,
        project_id,
        actor,
        payload={"artifactId": artifact_id, "reason": reason},
    )


def create_alternative_added_event(
    *,
    judgment_point_id: str,
    project_id: str,
    actor: Actor,
    alternative: JudgmentAlternative,
) -> JudgmentEvent:
    return _create_base_event(
        EventType.alternative_added,
        judgment_point_id,
        project_id,
        actor,
        payload=alternative.model_dump(by_alias=True),
    )


def create_comparison_requested_event(
    *,
    judgment_point_id: str,
    project_id: str,
    actor: Actor,
    alternative_ids: list[str],
    criteria: str | None = None,
) -> JudgmentEvent:
    return _create_base_event(
        EventType.comparison_requested,
        judgment_point_id,
        project_id,
        actor,
        payload={"alternativeIds": alternative_ids, "criteria": criteria},
    )


def create_comparison_completed_event(
    *,
    judgment_point_id: str,
    project_id: str,
    actor: Actor,
    results: dict[str, Any],
) -> JudgmentEvent:
    return _create_base_event(
        EventType.comparison_completed,
        judgment_point_id,
        project_id,
        actor,
        payload=results,
    )


def create_validity_condition_changed_event(
    *,
    judgment_point_id: str,
    project_id: str,
    actor: Actor,
    reason: str,
    previous_condition: str | None = None,
    new_condition: str | None = None,
) -> JudgmentEvent:
    return _create_base_event(
        EventType.validity_condition_changed,
        judgment_point_id,
        project_id,
        actor,
        payload={
            "previousCondition": previous_condition,
            "newCondition": new_condition,
            "reason": reason,
        },
    )
