"""Event-sourced projection: reconstruct JudgmentPoint state from an event log.

Events must be ordered by timestamp (oldest first).
"""

from __future__ import annotations

from typing import Any

from judgment_core.types import (
    JudgmentEvent,
    JudgmentPoint,
)


def project_current_state(events: list[JudgmentEvent]) -> JudgmentPoint:
    """Project the current state of a judgment point from its event log.

    Raises if the events list is empty or if the first event is not 'created'.
    """
    if not events:
        raise ValueError("Cannot project state from an empty event list")

    first = events[0]
    if first.event_type != "created":
        raise ValueError(f"First event must be 'created', got '{first.event_type}'")

    payload: dict[str, Any] = first.payload or {}

    point = JudgmentPoint.model_validate(
        {
            "id": first.judgment_point_id,
            "projectId": first.project_id,
            "category": payload.get("category", "assumption"),
            "question": payload.get("question", ""),
            "context": payload.get("context", ""),
            "trigger": payload.get("trigger", {"source": "agent", "description": ""}),
            "materiality": payload.get(
                "materiality",
                {
                    "score": 0,
                    "dimensions": {
                        "methodologicalDiscretion": 0,
                        "downstreamInfluence": 0,
                        "uncertainty": 0,
                        "consequence": 0,
                        "reversibility": 0,
                        "accountabilityRequirement": 0,
                    },
                },
            ),
            "status": "candidate",
            "alternatives": payload.get("alternatives", []),
            "evidenceRefs": payload.get("evidenceRefs", []),
            "affectedArtifactIds": payload.get("affectedArtifactIds", []),
            "authority": payload.get("authority", {"mode": "collaborative"}),
            "validityConditions": payload.get("validityConditions", []),
            "reopenConditions": payload.get("reopenConditions", []),
            "revisionHistory": [],
            "createdAt": first.timestamp.isoformat(),
            "updatedAt": first.timestamp.isoformat(),
        }
    )

    for evt in events[1:]:
        point = apply_event(point, evt)

    return point


def apply_event(point: JudgmentPoint, event: JudgmentEvent) -> JudgmentPoint:
    """Apply a single event to a judgment point, returning the updated state."""
    updates: dict[str, Any] = {"updatedAt": event.timestamp.isoformat()}

    match event.event_type.value:
        case "promoted":
            updates["status"] = "pending"

        case "investigation-started":
            updates["status"] = "investigating"

        case "resolution-recorded":
            updates["status"] = "resolved"
            if event.payload:
                updates["resolution"] = event.payload

        case "delegated":
            payload = event.payload or {}
            updates["status"] = "delegated"
            updates["authority"] = {
                "mode": "delegated",
                "actorId": payload.get("delegateId"),
                "policyId": payload.get("policyId"),
            }

        case "dismissed":
            updates["status"] = "dismissed"

        case "reopened":
            revision = {
                "timestamp": event.timestamp.isoformat(),
                "previousStatus": point.status.value,
                "newStatus": "reopened",
                "reason": (event.payload or {}).get("reason", ""),
                "actorId": event.actor_id,
            }
            if point.resolution:
                revision["previousResolution"] = point.resolution.model_dump(by_alias=True)
            existing = [r.model_dump(by_alias=True) for r in (point.revision_history or [])]
            existing.append(revision)
            updates["status"] = "reopened"
            updates["resolution"] = None
            updates["revisionHistory"] = existing

        case "marked-stale":
            updates["status"] = "stale"

        case "artifact-linked":
            if event.payload:
                existing_refs = [r.model_dump(by_alias=True) for r in (point.evidence_refs or [])]
                existing_refs.append(event.payload)
                updates["evidenceRefs"] = existing_refs

        case "artifact-unlinked":
            artifact_id = (event.payload or {}).get("artifactId")
            if artifact_id:
                updates["evidenceRefs"] = [
                    r.model_dump(by_alias=True)
                    for r in (point.evidence_refs or [])
                    if r.id != artifact_id
                ]

        case "alternative-added":
            if event.payload:
                existing_alts = [a.model_dump(by_alias=True) for a in point.alternatives]
                existing_alts.append(event.payload)
                updates["alternatives"] = existing_alts

        case "validity-condition-changed":
            payload = event.payload or {}
            prev = payload.get("previousCondition")
            new = payload.get("newCondition")
            conditions = list(point.validity_conditions)
            if prev is not None and prev in conditions:
                conditions.remove(prev)
            if new is not None:
                conditions.append(new)
            updates["validityConditions"] = conditions

        case "dependency-changed" | "comparison-requested" | "comparison-completed":
            # These events are informational — they update the timestamp
            # (handled above) but do not change point status or fields.
            pass

        case _:
            pass

    # Reconstruct using model_validate to handle aliased fields
    base = point.model_dump(by_alias=True)
    base.update(updates)
    return JudgmentPoint.model_validate(base)
