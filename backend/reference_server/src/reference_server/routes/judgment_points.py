"""Routes for creating and managing Judgment Points."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

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
from judgment_core.errors import ValidationError as JValidationError
from judgment_core.events import (
    create_alternative_added_event,
    create_artifact_linked_event,
    create_artifact_unlinked_event,
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
from judgment_core.projection import apply_event
from judgment_core.state_machine import assert_transition
from judgment_core.storage import JudgmentPointFilters, JudgmentStorage
from judgment_core.types import (
    Actor,
    ActorType,
    ArtifactReference,
    DelegationConditions,
    InterventionLevel,
    JudgmentAlternative,
    JudgmentCategory,
    JudgmentPoint,
    JudgmentResolution,
    JudgmentStatus,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Request body models
# ---------------------------------------------------------------------------


class ActorRequest(BaseModel):
    id: str
    type: str  # "user", "agent", "system", "policy"


class TriggerRequest(BaseModel):
    source: str
    description: str
    hard_trigger: str | None = Field(default=None, alias="hardTrigger")
    rule_id: str | None = Field(default=None, alias="ruleId")

    model_config = {"populate_by_name": True}


class DimensionsRequest(BaseModel):
    methodological_discretion: int = Field(alias="methodologicalDiscretion")
    downstream_influence: int = Field(alias="downstreamInfluence")
    uncertainty: int
    consequence: int
    reversibility: int
    accountability_requirement: int = Field(alias="accountabilityRequirement")

    model_config = {"populate_by_name": True}


class MaterialityRequest(BaseModel):
    score: int
    dimensions: DimensionsRequest
    detector_confidence: float | None = Field(default=None, alias="detectorConfidence")
    hard_trigger: str | None = Field(default=None, alias="hardTrigger")
    intervention_level: str | None = Field(default=None, alias="interventionLevel")

    model_config = {"populate_by_name": True}


class AuthorityRequest(BaseModel):
    mode: str
    actor_id: str | None = Field(default=None, alias="actorId")
    policy_id: str | None = Field(default=None, alias="policyId")

    model_config = {"populate_by_name": True}


class AlternativeRequest(BaseModel):
    id: str | None = None
    label: str
    description: str
    tradeoffs: str | None = None
    source: str | None = None

    model_config = {"populate_by_name": True}


class CreateCandidateRequest(BaseModel):
    project_id: str = Field(alias="projectId")
    category: str
    question: str
    context: str
    trigger: TriggerRequest
    materiality: MaterialityRequest
    alternatives: list[AlternativeRequest] = Field(default_factory=list)
    affected_artifact_ids: list[str] = Field(default_factory=list, alias="affectedArtifactIds")
    authority: AuthorityRequest
    validity_conditions: list[str] = Field(default_factory=list, alias="validityConditions")
    reopen_conditions: list[str] = Field(default_factory=list, alias="reopenConditions")
    evidence_refs: list[dict[str, Any]] | None = Field(default=None, alias="evidenceRefs")

    model_config = {"populate_by_name": True}


class PromoteRequest(BaseModel):
    actor: ActorRequest


class InvestigateRequest(BaseModel):
    actor: ActorRequest


class ResolutionBody(BaseModel):
    selected_alternative_id: str = Field(alias="selectedAlternativeId")
    rationale: str
    resolved_at: str = Field(alias="resolvedAt")
    uncertainty: list[str] | None = None
    conditions: list[str] | None = None
    validation_requirements: list[str] | None = Field(default=None, alias="validationRequirements")

    model_config = {"populate_by_name": True}


class ResolveRequest(BaseModel):
    actor: ActorRequest
    resolution: ResolutionBody


class DelegateRequest(BaseModel):
    actor: ActorRequest
    delegate_id: str = Field(alias="delegateId")
    policy_id: str = Field(alias="policyId")

    model_config = {"populate_by_name": True}


class DismissRequest(BaseModel):
    actor: ActorRequest
    reason: str


class ReopenRequest(BaseModel):
    actor: ActorRequest
    reason: str


class MarkStaleRequest(BaseModel):
    actor: ActorRequest
    reason: str


class AddAlternativeRequest(BaseModel):
    alternative: AlternativeRequest


class ArtifactLocationRequest(BaseModel):
    file_path: str | None = Field(default=None, alias="filePath")
    cell_id: str | None = Field(default=None, alias="cellId")

    model_config = {"populate_by_name": True}


class AddArtifactRequest(BaseModel):
    artifact: dict[str, Any]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_storage(request: Request) -> JudgmentStorage:
    storage: JudgmentStorage = request.app.state.storage
    return storage


def _to_actor(actor_req: ActorRequest) -> Actor:
    return Actor(id=actor_req.id, type=ActorType(actor_req.type))


def _point_json(point: JudgmentPoint) -> dict[str, Any]:
    return point.model_dump(by_alias=True, mode="json")


async def _get_point_or_404(
    storage: JudgmentStorage, point_id: str, project_id: str | None = None
) -> JudgmentPoint:
    point = await storage.get_judgment_point(point_id)
    if point is None:
        raise NotFoundError(f"Judgment point '{point_id}' not found")
    if project_id is not None and point.project_id != project_id:
        raise NotFoundError(f"Judgment point '{point_id}' not found in project '{project_id}'")
    return point


def _check_guard(result: Any) -> None:
    """Raise GuardError if a guard result is not allowed."""
    if not result.allowed:
        raise GuardError("Guard check failed", reasons=result.reasons)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/projects/{project_id}/judgment-points", status_code=201)
async def create_candidate(
    project_id: str,
    body: CreateCandidateRequest,
    request: Request,
) -> JSONResponse:
    """Create a new candidate judgment point."""
    if body.project_id != project_id:
        raise JValidationError(
            f"project_id in body ('{body.project_id}') does not match URL ('{project_id}')",
            fields=["projectId"],
        )

    storage = _get_storage(request)
    point_id = generate_id()
    now = datetime.now(UTC)

    # Build alternatives with generated IDs where needed
    alternatives: list[dict[str, Any]] = []
    for alt in body.alternatives:
        alt_dict = alt.model_dump(by_alias=True, exclude_none=True)
        if "id" not in alt_dict or alt_dict["id"] is None:
            alt_dict["id"] = generate_id()
        alternatives.append(alt_dict)

    # Build candidate data payload for the created event
    candidate_data: dict[str, Any] = {
        "category": body.category,
        "question": body.question,
        "context": body.context,
        "trigger": body.trigger.model_dump(by_alias=True, exclude_none=True),
        "materiality": body.materiality.model_dump(by_alias=True, exclude_none=True),
        "alternatives": alternatives,
        "affectedArtifactIds": body.affected_artifact_ids,
        "authority": body.authority.model_dump(by_alias=True, exclude_none=True),
        "validityConditions": body.validity_conditions,
        "reopenConditions": body.reopen_conditions,
    }

    if body.evidence_refs is not None:
        candidate_data["evidenceRefs"] = body.evidence_refs

    actor = Actor(id="system", type=ActorType.system)

    event = create_created_event(
        judgment_point_id=point_id,
        project_id=project_id,
        actor=actor,
        candidate_data=candidate_data,
    )

    # Build the JudgmentPoint directly
    point_data: dict[str, Any] = {
        "id": point_id,
        "projectId": project_id,
        "category": body.category,
        "question": body.question,
        "context": body.context,
        "trigger": candidate_data["trigger"],
        "materiality": candidate_data["materiality"],
        "status": "candidate",
        "alternatives": alternatives,
        "evidenceRefs": body.evidence_refs or [],
        "affectedArtifactIds": body.affected_artifact_ids,
        "authority": candidate_data["authority"],
        "validityConditions": body.validity_conditions,
        "reopenConditions": body.reopen_conditions,
        "revisionHistory": [],
        "createdAt": now.isoformat(),
        "updatedAt": now.isoformat(),
    }
    point = JudgmentPoint.model_validate(point_data)

    await storage.append_event(event)
    await storage.save_judgment_point(point)

    return JSONResponse(status_code=201, content=_point_json(point))


@router.get("/projects/{project_id}/judgment-points")
async def list_judgment_points(
    project_id: str,
    request: Request,
    status: list[str] | None = Query(default=None),
    category: list[str] | None = Query(default=None),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> dict[str, Any]:
    """List judgment points for a project with optional filters."""
    storage = _get_storage(request)

    filters = JudgmentPointFilters(
        status=[JudgmentStatus(s) for s in status] if status else None,
        category=[JudgmentCategory(c) for c in category] if category else None,
    )
    result = await storage.get_judgment_points(
        project_id, filters=filters, offset=offset, limit=limit
    )

    return {
        "items": [_point_json(p) for p in result.items],
        "total": result.total,
        "offset": result.offset,
        "limit": result.limit,
    }


@router.get("/projects/{project_id}/judgment-points/{point_id}")
async def get_judgment_point(
    project_id: str,
    point_id: str,
    request: Request,
) -> JSONResponse:
    """Get a single judgment point."""
    storage = _get_storage(request)
    point = await _get_point_or_404(storage, point_id, project_id)

    return JSONResponse(content=_point_json(point))


@router.patch("/projects/{project_id}/judgment-points/{point_id}/promote")
async def promote_point(
    project_id: str,
    point_id: str,
    body: PromoteRequest,
    request: Request,
) -> JSONResponse:
    """Promote a candidate to pending."""
    storage = _get_storage(request)
    point = await _get_point_or_404(storage, point_id, project_id)

    guard = can_promote(point)
    _check_guard(guard)
    assert_transition(JudgmentStatus(point.status), JudgmentStatus.pending)

    actor = _to_actor(body.actor)
    event = create_promoted_event(
        judgment_point_id=point_id,
        project_id=project_id,
        actor=actor,
        previous_status=JudgmentStatus(point.status),
        new_status=JudgmentStatus.pending,
    )

    point = apply_event(point, event)

    await storage.append_event(event)
    await storage.save_judgment_point(point)

    return JSONResponse(content=_point_json(point))


@router.patch("/projects/{project_id}/judgment-points/{point_id}/investigate")
async def investigate_point(
    project_id: str,
    point_id: str,
    body: InvestigateRequest,
    request: Request,
) -> JSONResponse:
    """Start investigation on a judgment point."""
    storage = _get_storage(request)
    point = await _get_point_or_404(storage, point_id, project_id)

    guard = can_investigate(point)
    _check_guard(guard)
    assert_transition(JudgmentStatus(point.status), JudgmentStatus.investigating)

    actor = _to_actor(body.actor)
    event = create_investigation_started_event(
        judgment_point_id=point_id,
        project_id=project_id,
        actor=actor,
        previous_status=JudgmentStatus(point.status),
        new_status=JudgmentStatus.investigating,
    )

    point = apply_event(point, event)

    await storage.append_event(event)
    await storage.save_judgment_point(point)

    return JSONResponse(content=_point_json(point))


@router.patch("/projects/{project_id}/judgment-points/{point_id}/resolve")
async def resolve_point(
    project_id: str,
    point_id: str,
    body: ResolveRequest,
    request: Request,
) -> JSONResponse:
    """Resolve a judgment point."""
    storage = _get_storage(request)
    point = await _get_point_or_404(storage, point_id, project_id)

    actor = _to_actor(body.actor)
    guard = can_resolve(
        point,
        actor,
        body.resolution.selected_alternative_id,
        body.resolution.rationale,
    )
    _check_guard(guard)
    assert_transition(JudgmentStatus(point.status), JudgmentStatus.resolved)

    resolved_at = datetime.fromisoformat(body.resolution.resolved_at)
    resolution = JudgmentResolution(
        selected_alternative_id=body.resolution.selected_alternative_id,
        rationale=body.resolution.rationale,
        resolved_at=resolved_at,
        resolved_by=actor.id,
        uncertainty=body.resolution.uncertainty or [],
        conditions=body.resolution.conditions or [],
        validation_requirements=body.resolution.validation_requirements or [],
    )

    event = create_resolution_recorded_event(
        judgment_point_id=point_id,
        project_id=project_id,
        actor=actor,
        previous_status=JudgmentStatus(point.status),
        resolution=resolution,
    )

    point = apply_event(point, event)

    await storage.append_event(event)
    await storage.save_judgment_point(point)

    return JSONResponse(content=_point_json(point))


@router.patch("/projects/{project_id}/judgment-points/{point_id}/delegate")
async def delegate_point(
    project_id: str,
    point_id: str,
    body: DelegateRequest,
    request: Request,
) -> JSONResponse:
    """Delegate a judgment point."""
    storage = _get_storage(request)
    point = await _get_point_or_404(storage, point_id, project_id)

    conditions = DelegationConditions(allowed=True)
    guard = can_delegate(point, conditions)
    _check_guard(guard)
    assert_transition(JudgmentStatus(point.status), JudgmentStatus.delegated)

    actor = _to_actor(body.actor)
    event = create_delegated_event(
        judgment_point_id=point_id,
        project_id=project_id,
        actor=actor,
        previous_status=JudgmentStatus(point.status),
        delegate_id=body.delegate_id,
        policy_id=body.policy_id,
    )

    point = apply_event(point, event)

    await storage.append_event(event)
    await storage.save_judgment_point(point)

    return JSONResponse(content=_point_json(point))


@router.patch("/projects/{project_id}/judgment-points/{point_id}/dismiss")
async def dismiss_point(
    project_id: str,
    point_id: str,
    body: DismissRequest,
    request: Request,
) -> JSONResponse:
    """Dismiss a judgment point."""
    storage = _get_storage(request)
    point = await _get_point_or_404(storage, point_id, project_id)

    # Use the intervention level from the materiality assessment, default to disclose
    intervention = point.materiality.intervention_level or "disclose"
    guard = can_dismiss(point, InterventionLevel(intervention))
    _check_guard(guard)
    assert_transition(JudgmentStatus(point.status), JudgmentStatus.dismissed)

    actor = _to_actor(body.actor)
    event = create_dismissed_event(
        judgment_point_id=point_id,
        project_id=project_id,
        actor=actor,
        previous_status=JudgmentStatus(point.status),
        reason=body.reason,
    )

    point = apply_event(point, event)

    await storage.append_event(event)
    await storage.save_judgment_point(point)

    return JSONResponse(content=_point_json(point))


@router.patch("/projects/{project_id}/judgment-points/{point_id}/reopen")
async def reopen_point(
    project_id: str,
    point_id: str,
    body: ReopenRequest,
    request: Request,
) -> JSONResponse:
    """Reopen a previously resolved, stale, or dismissed judgment point."""
    storage = _get_storage(request)
    point = await _get_point_or_404(storage, point_id, project_id)

    guard = can_reopen(point, body.reason)
    _check_guard(guard)
    assert_transition(JudgmentStatus(point.status), JudgmentStatus.reopened)

    actor = _to_actor(body.actor)
    event = create_reopened_event(
        judgment_point_id=point_id,
        project_id=project_id,
        actor=actor,
        previous_status=JudgmentStatus(point.status),
        reason=body.reason,
    )

    point = apply_event(point, event)

    await storage.append_event(event)
    await storage.save_judgment_point(point)

    return JSONResponse(content=_point_json(point))


@router.patch("/projects/{project_id}/judgment-points/{point_id}/mark-stale")
async def mark_stale_point(
    project_id: str,
    point_id: str,
    body: MarkStaleRequest,
    request: Request,
) -> JSONResponse:
    """Mark a resolved judgment point as stale."""
    storage = _get_storage(request)
    point = await _get_point_or_404(storage, point_id, project_id)

    guard = can_mark_stale(point, body.reason)
    _check_guard(guard)
    assert_transition(JudgmentStatus(point.status), JudgmentStatus.stale)

    actor = _to_actor(body.actor)
    event = create_marked_stale_event(
        judgment_point_id=point_id,
        project_id=project_id,
        actor=actor,
        reason=body.reason,
        previous_status=JudgmentStatus(point.status),
    )

    point = apply_event(point, event)

    await storage.append_event(event)
    await storage.save_judgment_point(point)

    return JSONResponse(content=_point_json(point))


@router.post(
    "/projects/{project_id}/judgment-points/{point_id}/alternatives",
    status_code=201,
)
async def add_alternative(
    project_id: str,
    point_id: str,
    body: AddAlternativeRequest,
    request: Request,
) -> JSONResponse:
    """Add an alternative to a judgment point."""
    storage = _get_storage(request)
    point = await _get_point_or_404(storage, point_id, project_id)

    alt_data = body.alternative.model_dump(by_alias=True, exclude_none=True)
    if "id" not in alt_data or alt_data["id"] is None:
        alt_data["id"] = generate_id()

    alternative = JudgmentAlternative.model_validate(alt_data)

    actor = Actor(id="system", type=ActorType.system)
    event = create_alternative_added_event(
        judgment_point_id=point_id,
        project_id=project_id,
        actor=actor,
        alternative=alternative,
    )

    point = apply_event(point, event)

    await storage.append_event(event)
    await storage.save_judgment_point(point)

    return JSONResponse(status_code=201, content=_point_json(point))


@router.post(
    "/projects/{project_id}/judgment-points/{point_id}/artifacts",
    status_code=201,
)
async def add_artifact(
    project_id: str,
    point_id: str,
    body: AddArtifactRequest,
    request: Request,
) -> JSONResponse:
    """Link an artifact to a judgment point."""
    storage = _get_storage(request)
    point = await _get_point_or_404(storage, point_id, project_id)

    artifact_data = dict(body.artifact)
    if "id" not in artifact_data or artifact_data["id"] is None:
        artifact_data["id"] = generate_id()

    artifact = ArtifactReference.model_validate(artifact_data)

    actor = Actor(id="system", type=ActorType.system)
    event = create_artifact_linked_event(
        judgment_point_id=point_id,
        project_id=project_id,
        actor=actor,
        artifact=artifact,
    )

    point = apply_event(point, event)

    await storage.append_event(event)
    await storage.save_judgment_point(point)

    return JSONResponse(status_code=201, content=_point_json(point))


@router.delete("/projects/{project_id}/judgment-points/{point_id}/artifacts/{artifact_id}")
async def remove_artifact(
    project_id: str,
    point_id: str,
    artifact_id: str,
    request: Request,
    reason: str = Query(default=""),
) -> JSONResponse:
    """Unlink an artifact from a judgment point."""
    storage = _get_storage(request)
    point = await _get_point_or_404(storage, point_id, project_id)

    actor = Actor(id="system", type=ActorType.system)
    event = create_artifact_unlinked_event(
        judgment_point_id=point_id,
        project_id=project_id,
        actor=actor,
        artifact_id=artifact_id,
        reason=reason,
    )

    point = apply_event(point, event)

    await storage.append_event(event)
    await storage.save_judgment_point(point)

    return JSONResponse(content=_point_json(point))
