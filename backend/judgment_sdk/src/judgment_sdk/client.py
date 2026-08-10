"""JudgmentClient SDK -- typed facade over storage with lifecycle guards and event sourcing.

This module is the Python port of the TypeScript ``JudgmentClient`` found in
``packages/judgment-sdk/src/client.ts``.  Every mutation goes through the
canonical state-machine checks, authority guards, and event-sourcing pipeline
before being persisted.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from judgment_core.authority import (
    can_delegate,
    can_dismiss,
    can_investigate,
    can_mark_stale,
    can_promote,
    can_reopen,
    can_resolve,
)
from judgment_core.errors import GuardError, NotFoundError
from judgment_core.events import (
    create_alternative_added_event,
    create_artifact_linked_event,
    create_artifact_unlinked_event,
    create_comparison_completed_event,
    create_comparison_requested_event,
    create_created_event,
    create_delegated_event,
    create_dismissed_event,
    create_investigation_started_event,
    create_marked_stale_event,
    create_promoted_event,
    create_reopened_event,
    create_resolution_recorded_event,
)
from judgment_core.id_gen import generate_id
from judgment_core.materiality import compute_aggregate_score, compute_intervention_level
from judgment_core.projection import apply_event
from judgment_core.state_machine import assert_transition
from judgment_core.storage import (
    EventFilters,
    JudgmentPointFilters,
    JudgmentStorage,
    PaginatedResult,
)
from judgment_core.types import (
    Actor,
    ArtifactReference,
    DelegationConditions,
    InterventionLevel,
    JudgmentAlternative,
    JudgmentEvent,
    JudgmentPoint,
    JudgmentPolicy,
    JudgmentResolution,
    JudgmentStatus,
    MaterialityAssessment,
    MaterialityDimensions,
)

# ---------------------------------------------------------------------------
# Params types
# ---------------------------------------------------------------------------


@dataclass
class CreateCandidateParams:
    """Parameters for creating a new candidate Judgment Point."""

    project_id: str
    category: str
    question: str
    context: str
    trigger: dict[str, Any]
    materiality: dict[str, Any]
    alternatives: list[dict[str, Any]] = field(default_factory=list)
    affected_artifact_ids: list[str] = field(default_factory=list)
    authority: dict[str, Any] = field(default_factory=lambda: {"mode": "collaborative"})
    validity_conditions: list[str] = field(default_factory=list)
    reopen_conditions: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------


class JudgmentClient:
    """High-level SDK client for Judgment Point lifecycle management.

    Wraps a :class:`JudgmentStorage` backend with lifecycle guards and
    event sourcing.  Every state mutation validates the transition, runs
    the appropriate guard, creates a domain event, applies the projection,
    and persists both the event and the updated point.
    """

    def __init__(self, storage: JudgmentStorage) -> None:
        self._storage = storage

    # -------------------------------------------------------------------
    # Lifecycle operations
    # -------------------------------------------------------------------

    async def create_candidate(
        self,
        params: CreateCandidateParams,
        actor: Actor,
    ) -> JudgmentPoint:
        """Create a new Judgment Point in *candidate* status."""
        id = generate_id()
        now = datetime.now(UTC)

        point = JudgmentPoint.model_validate(
            {
                "id": id,
                "projectId": params.project_id,
                "category": params.category,
                "question": params.question,
                "context": params.context,
                "trigger": params.trigger,
                "materiality": params.materiality,
                "status": "candidate",
                "alternatives": params.alternatives,
                "evidenceRefs": [],
                "affectedArtifactIds": params.affected_artifact_ids,
                "authority": params.authority,
                "validityConditions": params.validity_conditions,
                "reopenConditions": params.reopen_conditions,
                "revisionHistory": [],
                "createdAt": now.isoformat(),
                "updatedAt": now.isoformat(),
            }
        )

        event = create_created_event(
            judgment_point_id=id,
            project_id=params.project_id,
            actor=actor,
            candidate_data=point.model_dump(by_alias=True),
        )

        await self._storage.append_event(event)
        await self._storage.save_judgment_point(point)

        return point

    async def promote(self, point_id: str, actor: Actor) -> JudgmentPoint:
        """Promote a *candidate* to *pending*."""
        point = await self._require_point(point_id)

        assert_transition(point.status, JudgmentStatus.pending)
        guard = can_promote(point)
        if not guard.allowed:
            raise GuardError("Cannot promote", guard.reasons)

        event = create_promoted_event(
            judgment_point_id=point_id,
            project_id=point.project_id,
            actor=actor,
            previous_status=point.status,
            new_status=JudgmentStatus.pending,
        )

        updated = apply_event(point, event)
        await self._storage.append_event(event)
        await self._storage.save_judgment_point(updated)
        return updated

    async def start_investigation(self, point_id: str, actor: Actor) -> JudgmentPoint:
        """Transition a *pending* or *reopened* point to *investigating*."""
        point = await self._require_point(point_id)

        assert_transition(point.status, JudgmentStatus.investigating)
        guard = can_investigate(point)
        if not guard.allowed:
            raise GuardError("Cannot start investigation", guard.reasons)

        event = create_investigation_started_event(
            judgment_point_id=point_id,
            project_id=point.project_id,
            actor=actor,
            previous_status=point.status,
            new_status=JudgmentStatus.investigating,
        )

        updated = apply_event(point, event)
        await self._storage.append_event(event)
        await self._storage.save_judgment_point(updated)
        return updated

    async def resolve(
        self,
        point_id: str,
        resolution: JudgmentResolution,
        actor: Actor,
    ) -> JudgmentPoint:
        """Resolve an *investigating* or *delegated* point."""
        point = await self._require_point(point_id)

        assert_transition(point.status, JudgmentStatus.resolved)
        guard = can_resolve(
            point,
            actor,
            resolution.selected_alternative_id,
            resolution.rationale,
        )
        if not guard.allowed:
            raise GuardError("Cannot resolve", guard.reasons)

        event = create_resolution_recorded_event(
            judgment_point_id=point_id,
            project_id=point.project_id,
            actor=actor,
            previous_status=point.status,
            resolution=resolution,
        )

        updated = apply_event(point, event)
        await self._storage.append_event(event)
        await self._storage.save_judgment_point(updated)
        return updated

    async def delegate(
        self,
        point_id: str,
        delegate_id: str,
        policy_id: str,
        actor: Actor,
        delegation_conditions: DelegationConditions | None = None,
    ) -> JudgmentPoint:
        """Delegate a *pending* point to another actor under a policy."""
        point = await self._require_point(point_id)

        assert_transition(point.status, JudgmentStatus.delegated)
        conditions = delegation_conditions or DelegationConditions(allowed=True)
        guard = can_delegate(point, conditions)
        if not guard.allowed:
            raise GuardError("Cannot delegate", guard.reasons)

        event = create_delegated_event(
            judgment_point_id=point_id,
            project_id=point.project_id,
            actor=actor,
            previous_status=point.status,
            delegate_id=delegate_id,
            policy_id=policy_id,
        )

        updated = apply_event(point, event)
        await self._storage.append_event(event)
        await self._storage.save_judgment_point(updated)
        return updated

    async def dismiss(
        self,
        point_id: str,
        reason: str,
        actor: Actor,
    ) -> JudgmentPoint:
        """Dismiss a *pending* or *reopened* point."""
        point = await self._require_point(point_id)

        assert_transition(point.status, JudgmentStatus.dismissed)
        intervention_level = (
            point.materiality.intervention_level
            if point.materiality.intervention_level is not None
            else InterventionLevel.trace
        )
        guard = can_dismiss(point, intervention_level)
        if not guard.allowed:
            raise GuardError("Cannot dismiss", guard.reasons)

        event = create_dismissed_event(
            judgment_point_id=point_id,
            project_id=point.project_id,
            actor=actor,
            previous_status=point.status,
            reason=reason,
        )

        updated = apply_event(point, event)
        await self._storage.append_event(event)
        await self._storage.save_judgment_point(updated)
        return updated

    async def reopen(
        self,
        point_id: str,
        reason: str,
        actor: Actor,
    ) -> JudgmentPoint:
        """Reopen a *resolved*, *stale*, or *dismissed* point."""
        point = await self._require_point(point_id)

        assert_transition(point.status, JudgmentStatus.reopened)
        guard = can_reopen(point, reason)
        if not guard.allowed:
            raise GuardError("Cannot reopen", guard.reasons)

        event = create_reopened_event(
            judgment_point_id=point_id,
            project_id=point.project_id,
            actor=actor,
            previous_status=point.status,
            reason=reason,
        )

        updated = apply_event(point, event)
        await self._storage.append_event(event)
        await self._storage.save_judgment_point(updated)
        return updated

    async def mark_stale(
        self,
        point_id: str,
        reason: str,
        actor: Actor,
    ) -> JudgmentPoint:
        """Mark a *resolved* point as *stale*."""
        point = await self._require_point(point_id)

        assert_transition(point.status, JudgmentStatus.stale)
        guard = can_mark_stale(point, reason)
        if not guard.allowed:
            raise GuardError("Cannot mark stale", guard.reasons)

        event = create_marked_stale_event(
            judgment_point_id=point_id,
            project_id=point.project_id,
            actor=actor,
            reason=reason,
            previous_status=point.status,
        )

        updated = apply_event(point, event)
        await self._storage.append_event(event)
        await self._storage.save_judgment_point(updated)
        return updated

    # -------------------------------------------------------------------
    # Query operations
    # -------------------------------------------------------------------

    async def get_judgment_point(self, point_id: str) -> JudgmentPoint | None:
        """Retrieve a single Judgment Point by ID, or ``None`` if not found."""
        return await self._storage.get_judgment_point(point_id)

    async def list_judgment_points(
        self,
        project_id: str,
        filters: JudgmentPointFilters | None = None,
        offset: int = 0,
        limit: int = 50,
    ) -> PaginatedResult[JudgmentPoint]:
        """List Judgment Points for a project with optional filtering and pagination."""
        return await self._storage.get_judgment_points(project_id, filters, offset, limit)

    async def get_events(
        self,
        judgment_point_id: str,
        filters: EventFilters | None = None,
    ) -> list[JudgmentEvent]:
        """Return the event history for a Judgment Point."""
        return await self._storage.get_events(judgment_point_id, filters)

    # -------------------------------------------------------------------
    # Alternative operations
    # -------------------------------------------------------------------

    async def add_alternative(
        self,
        point_id: str,
        alternative: JudgmentAlternative,
        actor: Actor,
    ) -> JudgmentPoint:
        """Append a new alternative to a Judgment Point."""
        point = await self._require_point(point_id)

        event = create_alternative_added_event(
            judgment_point_id=point_id,
            project_id=point.project_id,
            actor=actor,
            alternative=alternative,
        )

        updated = apply_event(point, event)
        await self._storage.append_event(event)
        await self._storage.save_judgment_point(updated)
        return updated

    async def request_comparison(
        self,
        point_id: str,
        alternative_ids: list[str],
        actor: Actor,
        criteria: str | None = None,
    ) -> JudgmentPoint:
        """Request a structured comparison of alternatives."""
        point = await self._require_point(point_id)

        event = create_comparison_requested_event(
            judgment_point_id=point_id,
            project_id=point.project_id,
            actor=actor,
            alternative_ids=alternative_ids,
            criteria=criteria,
        )

        updated = apply_event(point, event)
        await self._storage.append_event(event)
        await self._storage.save_judgment_point(updated)
        return updated

    async def complete_comparison(
        self,
        point_id: str,
        results: dict[str, Any],
        actor: Actor,
    ) -> JudgmentPoint:
        """Record the results of a completed comparison."""
        point = await self._require_point(point_id)

        event = create_comparison_completed_event(
            judgment_point_id=point_id,
            project_id=point.project_id,
            actor=actor,
            results=results,
        )

        updated = apply_event(point, event)
        await self._storage.append_event(event)
        await self._storage.save_judgment_point(updated)
        return updated

    # -------------------------------------------------------------------
    # Artifact operations
    # -------------------------------------------------------------------

    async def link_artifact(
        self,
        point_id: str,
        artifact: ArtifactReference,
        actor: Actor,
    ) -> JudgmentPoint:
        """Link an artifact reference to a Judgment Point."""
        point = await self._require_point(point_id)

        event = create_artifact_linked_event(
            judgment_point_id=point_id,
            project_id=point.project_id,
            actor=actor,
            artifact=artifact,
        )

        updated = apply_event(point, event)
        await self._storage.append_event(event)
        await self._storage.save_judgment_point(updated)
        return updated

    async def unlink_artifact(
        self,
        point_id: str,
        artifact_id: str,
        reason: str,
        actor: Actor,
    ) -> JudgmentPoint:
        """Unlink an artifact reference from a Judgment Point."""
        point = await self._require_point(point_id)

        event = create_artifact_unlinked_event(
            judgment_point_id=point_id,
            project_id=point.project_id,
            actor=actor,
            artifact_id=artifact_id,
            reason=reason,
        )

        updated = apply_event(point, event)
        await self._storage.append_event(event)
        await self._storage.save_judgment_point(updated)
        return updated

    # -------------------------------------------------------------------
    # Policy operations
    # -------------------------------------------------------------------

    async def add_policy(self, policy: JudgmentPolicy) -> None:
        """Save a new Judgment Policy."""
        await self._storage.save_policy(policy)

    async def get_policies(self, project_id: str) -> list[JudgmentPolicy]:
        """List policies for a project, ordered by priority."""
        return await self._storage.get_policies(project_id)

    async def update_policy(self, policy: JudgmentPolicy) -> None:
        """Update an existing Judgment Policy."""
        await self._storage.update_policy(policy)

    # -------------------------------------------------------------------
    # Materiality
    # -------------------------------------------------------------------

    def assess_materiality(
        self,
        dimensions: MaterialityDimensions,
        hard_trigger: str | None = None,
    ) -> MaterialityAssessment:
        """Compute a materiality assessment from dimension scores.

        Returns a :class:`MaterialityAssessment` with the aggregate score
        and the computed intervention level.
        """
        score = compute_aggregate_score(dimensions)
        assessment = MaterialityAssessment.model_validate(
            {
                "score": score,
                "dimensions": dimensions.model_dump(by_alias=True),
                "hardTrigger": hard_trigger,
            }
        )
        intervention_level = compute_intervention_level(assessment)
        return MaterialityAssessment.model_validate(
            {
                "score": score,
                "dimensions": dimensions.model_dump(by_alias=True),
                "hardTrigger": hard_trigger,
                "interventionLevel": intervention_level.value,
            }
        )

    # -------------------------------------------------------------------
    # Private helpers
    # -------------------------------------------------------------------

    async def _require_point(self, point_id: str) -> JudgmentPoint:
        """Fetch a point or raise :class:`NotFoundError`."""
        point = await self._storage.get_judgment_point(point_id)
        if point is None:
            raise NotFoundError(f"Judgment point '{point_id}' not found")
        return point
