"""Integration tests for the Judgment Reference Server."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient

from reference_server.app import create_app

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def app():
    """Create a fresh application instance with in-memory storage for each test."""
    return create_app()


@pytest.fixture
async def client(app):
    """Provide an async HTTP client bound to the test application."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


# ---------------------------------------------------------------------------
# Test data helpers
# ---------------------------------------------------------------------------

PROJECT_ID = "proj-001"
ALT_PROJECT_ID = "proj-002"


def _candidate_body(
    project_id: str = PROJECT_ID,
    category: str = "assumption",
    question: str = "Which correlation model?",
    intervention_level: str = "pause",
) -> dict[str, Any]:
    """Return a valid create-candidate request body."""
    return {
        "projectId": project_id,
        "category": category,
        "question": question,
        "context": "Selecting a thermodynamic correlation model for phase equilibrium.",
        "trigger": {
            "source": "agent",
            "description": "Agent detected a modeling choice.",
        },
        "materiality": {
            "score": 12,
            "dimensions": {
                "methodologicalDiscretion": 2,
                "downstreamInfluence": 2,
                "uncertainty": 2,
                "consequence": 2,
                "reversibility": 2,
                "accountabilityRequirement": 2,
            },
            "interventionLevel": intervention_level,
        },
        "alternatives": [
            {
                "id": "alt-1",
                "label": "Peng-Robinson",
                "description": "Standard cubic equation of state.",
            },
            {
                "id": "alt-2",
                "label": "SRK",
                "description": "Soave-Redlich-Kwong equation of state.",
            },
        ],
        "affectedArtifactIds": ["cell-42"],
        "authority": {"mode": "collaborative"},
        "validityConditions": ["Temperature range 300-900 K"],
        "reopenConditions": ["New experimental data available"],
    }


def _actor(actor_id: str = "user-1", actor_type: str = "user") -> dict[str, Any]:
    return {"id": actor_id, "type": actor_type}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_health_returns_ok(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# Create candidate
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_create_candidate_returns_201(client: AsyncClient):
    resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=_candidate_body(),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["projectId"] == PROJECT_ID
    assert data["status"] == "candidate"
    assert data["category"] == "assumption"
    assert len(data["alternatives"]) == 2


@pytest.mark.anyio
async def test_create_candidate_project_id_mismatch(client: AsyncClient):
    body = _candidate_body(project_id="wrong-project")
    resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=body,
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# List and get
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_list_judgment_points(client: AsyncClient):
    # Create two points
    await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=_candidate_body(),
    )
    await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=_candidate_body(question="Which solver?"),
    )

    resp = await client.get(f"/api/v1/projects/{PROJECT_ID}/judgment-points")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


@pytest.mark.anyio
async def test_get_single_judgment_point(client: AsyncClient):
    create_resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=_candidate_body(),
    )
    point_id = create_resp.json()["id"]

    resp = await client.get(f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == point_id


@pytest.mark.anyio
async def test_get_unknown_point_returns_404(client: AsyncClient):
    resp = await client.get(f"/api/v1/projects/{PROJECT_ID}/judgment-points/nonexistent-id")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Project isolation
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_project_isolation(client: AsyncClient):
    """A point created under one project must not be visible under another."""
    create_resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=_candidate_body(),
    )
    point_id = create_resp.json()["id"]

    # Attempting to fetch via a different project should 404
    resp = await client.get(f"/api/v1/projects/{ALT_PROJECT_ID}/judgment-points/{point_id}")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Promote
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_promote_candidate(client: AsyncClient):
    create_resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=_candidate_body(),
    )
    point_id = create_resp.json()["id"]

    resp = await client.patch(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/promote",
        json={"actor": _actor()},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "pending"


# ---------------------------------------------------------------------------
# Invalid transition
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_invalid_transition_returns_409(client: AsyncClient):
    """Attempting to resolve a candidate (skipping promote/investigate) is invalid."""
    create_resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=_candidate_body(),
    )
    point_id = create_resp.json()["id"]

    resp = await client.patch(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/resolve",
        json={
            "actor": _actor(),
            "resolution": {
                "selectedAlternativeId": "alt-1",
                "rationale": "Best fit for our temperature range.",
                "resolvedAt": datetime.now(UTC).isoformat(),
            },
        },
    )
    assert resp.status_code == 409


# ---------------------------------------------------------------------------
# Full lifecycle
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_full_lifecycle(client: AsyncClient):
    """Exercise the full lifecycle: create -> promote -> add alt -> investigate -> resolve."""

    # 1. Create candidate
    create_resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=_candidate_body(),
    )
    assert create_resp.status_code == 201
    point_id = create_resp.json()["id"]

    # 2. Promote
    promote_resp = await client.patch(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/promote",
        json={"actor": _actor()},
    )
    assert promote_resp.status_code == 200
    assert promote_resp.json()["status"] == "pending"

    # 3. Add a third alternative
    alt_resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/alternatives",
        json={
            "alternative": {
                "id": "alt-3",
                "label": "NRTL",
                "description": "Non-Random Two-Liquid model.",
            }
        },
    )
    assert alt_resp.status_code == 201
    assert len(alt_resp.json()["alternatives"]) == 3

    # 4. Investigate
    invest_resp = await client.patch(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/investigate",
        json={"actor": _actor()},
    )
    assert invest_resp.status_code == 200
    assert invest_resp.json()["status"] == "investigating"

    # 5. Resolve
    resolve_resp = await client.patch(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/resolve",
        json={
            "actor": _actor(),
            "resolution": {
                "selectedAlternativeId": "alt-1",
                "rationale": "Peng-Robinson is the standard choice for hydrocarbon systems.",
                "resolvedAt": datetime.now(UTC).isoformat(),
            },
        },
    )
    assert resolve_resp.status_code == 200
    data = resolve_resp.json()
    assert data["status"] == "resolved"
    assert data["resolution"]["selectedAlternativeId"] == "alt-1"


# ---------------------------------------------------------------------------
# Dismiss
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_dismiss_pending_point(client: AsyncClient):
    create_resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=_candidate_body(),
    )
    point_id = create_resp.json()["id"]

    # Promote first
    await client.patch(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/promote",
        json={"actor": _actor()},
    )

    resp = await client.patch(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/dismiss",
        json={"actor": _actor(), "reason": "Not relevant to current scope."},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "dismissed"


# ---------------------------------------------------------------------------
# Reopen
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_reopen_dismissed_point(client: AsyncClient):
    create_resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=_candidate_body(),
    )
    point_id = create_resp.json()["id"]

    await client.patch(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/promote",
        json={"actor": _actor()},
    )
    await client.patch(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/dismiss",
        json={"actor": _actor(), "reason": "Not relevant."},
    )

    resp = await client.patch(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/reopen",
        json={"actor": _actor(), "reason": "New data arrived."},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "reopened"


# ---------------------------------------------------------------------------
# Mark stale
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_mark_stale_resolved_point(client: AsyncClient):
    """A resolved point can be marked stale."""
    create_resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=_candidate_body(),
    )
    point_id = create_resp.json()["id"]

    await client.patch(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/promote",
        json={"actor": _actor()},
    )
    await client.patch(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/investigate",
        json={"actor": _actor()},
    )
    await client.patch(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/resolve",
        json={
            "actor": _actor(),
            "resolution": {
                "selectedAlternativeId": "alt-1",
                "rationale": "Best fit.",
                "resolvedAt": datetime.now(UTC).isoformat(),
            },
        },
    )

    resp = await client.patch(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/mark-stale",
        json={"actor": _actor(), "reason": "Upstream data changed."},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "stale"


# ---------------------------------------------------------------------------
# Delegate
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_delegate_pending_point(client: AsyncClient):
    create_resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=_candidate_body(),
    )
    point_id = create_resp.json()["id"]

    await client.patch(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/promote",
        json={"actor": _actor()},
    )

    resp = await client.patch(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/delegate",
        json={
            "actor": _actor(),
            "delegateId": "agent-007",
            "policyId": "policy-1",
        },
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "delegated"
    assert resp.json()["authority"]["mode"] == "delegated"


# ---------------------------------------------------------------------------
# Artifacts
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_add_and_remove_artifact(client: AsyncClient):
    create_resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=_candidate_body(),
    )
    point_id = create_resp.json()["id"]

    # Add artifact
    art_resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/artifacts",
        json={
            "artifact": {
                "id": "art-1",
                "artifactType": "document",
                "label": "API-521 standard",
                "relationship": "informs",
            }
        },
    )
    assert art_resp.status_code == 201
    refs = art_resp.json()["evidenceRefs"]
    assert any(r["id"] == "art-1" for r in refs)

    # Remove artifact
    del_resp = await client.delete(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/artifacts/art-1",
        params={"reason": "No longer relevant"},
    )
    assert del_resp.status_code == 200
    refs = del_resp.json()["evidenceRefs"]
    assert not any(r["id"] == "art-1" for r in refs)


# ---------------------------------------------------------------------------
# Policies CRUD
# ---------------------------------------------------------------------------


def _policy_body() -> dict[str, Any]:
    return {
        "name": "Default Policy",
        "description": "Base policy for all judgment points.",
        "scope": {},
        "rules": [
            {
                "id": "rule-1",
                "condition": {"materialityScoreMin": 6},
                "intervention": "pause",
            }
        ],
        "priority": 10,
        "enabled": True,
    }


@pytest.mark.anyio
async def test_policy_create_and_list(client: AsyncClient):
    create_resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/policies",
        json=_policy_body(),
    )
    assert create_resp.status_code == 201
    policy = create_resp.json()
    assert policy["name"] == "Default Policy"
    assert policy["projectId"] == PROJECT_ID

    list_resp = await client.get(f"/api/v1/projects/{PROJECT_ID}/policies")
    assert list_resp.status_code == 200
    policies = list_resp.json()
    assert len(policies) == 1
    assert policies[0]["id"] == policy["id"]


@pytest.mark.anyio
async def test_policy_get_single(client: AsyncClient):
    create_resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/policies",
        json=_policy_body(),
    )
    policy_id = create_resp.json()["id"]

    resp = await client.get(f"/api/v1/projects/{PROJECT_ID}/policies/{policy_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == policy_id


@pytest.mark.anyio
async def test_policy_get_nonexistent_returns_404(client: AsyncClient):
    resp = await client.get(f"/api/v1/projects/{PROJECT_ID}/policies/nonexistent")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_policy_update(client: AsyncClient):
    create_resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/policies",
        json=_policy_body(),
    )
    policy_id = create_resp.json()["id"]

    updated_body = _policy_body()
    updated_body["name"] = "Updated Policy"
    updated_body["priority"] = 5

    resp = await client.put(
        f"/api/v1/projects/{PROJECT_ID}/policies/{policy_id}",
        json=updated_body,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Policy"
    assert resp.json()["priority"] == 5


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_events_for_point(client: AsyncClient):
    """After creating and promoting a point there should be two events."""
    create_resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=_candidate_body(),
    )
    point_id = create_resp.json()["id"]

    await client.patch(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/promote",
        json={"actor": _actor()},
    )

    resp = await client.get(f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/events")
    assert resp.status_code == 200
    events = resp.json()
    assert len(events) == 2
    assert events[0]["eventType"] == "created"
    assert events[1]["eventType"] == "promoted"


@pytest.mark.anyio
async def test_events_for_project(client: AsyncClient):
    """Project-level event query returns events across all points."""
    await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=_candidate_body(),
    )
    await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=_candidate_body(question="Which mesh density?"),
    )

    resp = await client.get(f"/api/v1/projects/{PROJECT_ID}/events")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2  # one created event per point


# ---------------------------------------------------------------------------
# List with filters
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_list_with_status_filter(client: AsyncClient):
    """Filtering by status returns only matching points."""
    create_resp = await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=_candidate_body(),
    )
    point_id = create_resp.json()["id"]

    # Promote to pending
    await client.patch(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points/{point_id}/promote",
        json={"actor": _actor()},
    )

    # Create another that stays as candidate
    await client.post(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        json=_candidate_body(question="Another question?"),
    )

    # Filter for pending only
    resp = await client.get(
        f"/api/v1/projects/{PROJECT_ID}/judgment-points",
        params={"status": "pending"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["status"] == "pending"
