# API Reference

This document describes all HTTP endpoints exposed by the Judgment Reference Server. All endpoints under `/api/v1/` accept and return JSON. The server runs on port 8000 by default.

Base URL: `http://localhost:8000`

---

## Health

### GET /health

Return a liveness probe response.

**Response**

```json
{ "status": "ok" }
```

---

## Judgment Points

All judgment point endpoints are prefixed with `/api/v1`.

### POST /api/v1/projects/{project_id}/judgment-points

Create a new candidate judgment point.

**Request body**

```json
{
  "projectId": "string",
  "category": "objective | framing | assumption | method | data | parameter | validation | interpretation",
  "question": "string",
  "context": "string",
  "trigger": {
    "source": "string",
    "description": "string",
    "hardTrigger": "string | null",
    "ruleId": "string | null"
  },
  "materiality": {
    "score": 0,
    "dimensions": {
      "methodologicalDiscretion": 0,
      "downstreamInfluence": 0,
      "uncertainty": 0,
      "consequence": 0,
      "reversibility": 0,
      "accountabilityRequirement": 0
    },
    "detectorConfidence": 0.0,
    "hardTrigger": "string | null",
    "interventionLevel": "string | null"
  },
  "alternatives": [
    {
      "id": "string | null",
      "label": "string",
      "description": "string",
      "tradeoffs": "string | null",
      "source": "string | null"
    }
  ],
  "affectedArtifactIds": ["string"],
  "authority": {
    "mode": "human | collaborative | delegated | rule",
    "actorId": "string | null",
    "policyId": "string | null"
  },
  "validityConditions": ["string"],
  "reopenConditions": ["string"],
  "evidenceRefs": [{}]
}
```

**Response** `201 Created`

Returns the created `JudgmentPoint` object with a generated `id`, `status` set to `"candidate"`, and timestamps.

**Example**

```bash
curl -X POST http://localhost:8000/api/v1/projects/proj-1/judgment-points \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj-1",
    "category": "method",
    "question": "Which interpolation method should be used?",
    "context": "Thermal analysis requires spatial interpolation.",
    "trigger": { "source": "agent", "description": "Model selection detected" },
    "materiality": {
      "score": 9,
      "dimensions": {
        "methodologicalDiscretion": 2,
        "downstreamInfluence": 2,
        "uncertainty": 1,
        "consequence": 2,
        "reversibility": 1,
        "accountabilityRequirement": 1
      }
    },
    "alternatives": [
      { "label": "Linear", "description": "Simple linear interpolation" },
      { "label": "Cubic spline", "description": "Smooth cubic spline fit" }
    ],
    "affectedArtifactIds": [],
    "authority": { "mode": "human" },
    "validityConditions": [],
    "reopenConditions": []
  }'
```

---

### GET /api/v1/projects/{project_id}/judgment-points

List judgment points for a project with optional filters and pagination.

**Query parameters**

| Parameter  | Type       | Default | Description                     |
| ---------- | ---------- | ------- | ------------------------------- |
| `status`   | `string[]` | none    | Filter by status (repeatable)   |
| `category` | `string[]` | none    | Filter by category (repeatable) |
| `offset`   | `int`      | `0`     | Pagination offset (>= 0)        |
| `limit`    | `int`      | `50`    | Page size (1--200)              |

**Response** `200 OK`

```json
{
  "items": [{ "...JudgmentPoint" }],
  "total": 42,
  "offset": 0,
  "limit": 50
}
```

**Example**

```bash
curl "http://localhost:8000/api/v1/projects/proj-1/judgment-points?status=pending&status=investigating&limit=10"
```

---

### GET /api/v1/projects/{project_id}/judgment-points/{point_id}

Get a single judgment point by ID.

**Response** `200 OK`

Returns the full `JudgmentPoint` object.

**Error responses**

| Status | Condition                                     |
| ------ | --------------------------------------------- |
| `404`  | Point not found or does not belong to project |

**Example**

```bash
curl http://localhost:8000/api/v1/projects/proj-1/judgment-points/jp-abc123
```

---

### PATCH /api/v1/projects/{project_id}/judgment-points/{point_id}/promote

Promote a candidate judgment point to pending status.

**Request body**

```json
{
  "actor": {
    "id": "string",
    "type": "user | agent | system | policy"
  }
}
```

**Response** `200 OK`

Returns the updated `JudgmentPoint` with `status` changed to `"pending"`.

**Error responses**

| Status | Condition                          |
| ------ | ---------------------------------- |
| `404`  | Point not found                    |
| `409`  | Invalid transition or guard failed |

**Example**

```bash
curl -X PATCH http://localhost:8000/api/v1/projects/proj-1/judgment-points/jp-abc123/promote \
  -H "Content-Type: application/json" \
  -d '{ "actor": { "id": "user-1", "type": "user" } }'
```

---

### PATCH /api/v1/projects/{project_id}/judgment-points/{point_id}/investigate

Start investigation on a judgment point. Transitions from `pending` to `investigating`.

**Request body**

```json
{
  "actor": {
    "id": "string",
    "type": "user | agent | system | policy"
  }
}
```

**Response** `200 OK`

Returns the updated `JudgmentPoint` with `status` changed to `"investigating"`.

**Error responses**

| Status | Condition                          |
| ------ | ---------------------------------- |
| `404`  | Point not found                    |
| `409`  | Invalid transition or guard failed |

**Example**

```bash
curl -X PATCH http://localhost:8000/api/v1/projects/proj-1/judgment-points/jp-abc123/investigate \
  -H "Content-Type: application/json" \
  -d '{ "actor": { "id": "user-1", "type": "user" } }'
```

---

### PATCH /api/v1/projects/{project_id}/judgment-points/{point_id}/resolve

Resolve a judgment point by selecting an alternative and providing rationale.

**Request body**

```json
{
  "actor": {
    "id": "string",
    "type": "user | agent | system | policy"
  },
  "resolution": {
    "selectedAlternativeId": "string",
    "rationale": "string",
    "resolvedAt": "2026-01-01T00:00:00Z",
    "uncertainty": ["string"],
    "conditions": ["string"],
    "validationRequirements": ["string"]
  }
}
```

**Response** `200 OK`

Returns the updated `JudgmentPoint` with `status` changed to `"resolved"` and a populated `resolution` field.

**Error responses**

| Status | Condition                          |
| ------ | ---------------------------------- |
| `404`  | Point not found                    |
| `403`  | Actor not authorized to resolve    |
| `409`  | Invalid transition or guard failed |

**Example**

```bash
curl -X PATCH http://localhost:8000/api/v1/projects/proj-1/judgment-points/jp-abc123/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "actor": { "id": "user-1", "type": "user" },
    "resolution": {
      "selectedAlternativeId": "alt-1",
      "rationale": "Cubic spline provides better accuracy for this mesh density.",
      "resolvedAt": "2026-01-15T10:30:00Z"
    }
  }'
```

---

### PATCH /api/v1/projects/{project_id}/judgment-points/{point_id}/delegate

Delegate a judgment point to another actor under a delegation policy.

**Request body**

```json
{
  "actor": {
    "id": "string",
    "type": "user | agent | system | policy"
  },
  "delegateId": "string",
  "policyId": "string"
}
```

**Response** `200 OK`

Returns the updated `JudgmentPoint` with `status` changed to `"delegated"`.

**Error responses**

| Status | Condition                          |
| ------ | ---------------------------------- |
| `404`  | Point not found                    |
| `409`  | Invalid transition or guard failed |

**Example**

```bash
curl -X PATCH http://localhost:8000/api/v1/projects/proj-1/judgment-points/jp-abc123/delegate \
  -H "Content-Type: application/json" \
  -d '{
    "actor": { "id": "user-1", "type": "user" },
    "delegateId": "agent-1",
    "policyId": "policy-1"
  }'
```

---

### PATCH /api/v1/projects/{project_id}/judgment-points/{point_id}/dismiss

Dismiss a judgment point with a reason.

**Request body**

```json
{
  "actor": {
    "id": "string",
    "type": "user | agent | system | policy"
  },
  "reason": "string"
}
```

**Response** `200 OK`

Returns the updated `JudgmentPoint` with `status` changed to `"dismissed"`.

**Error responses**

| Status | Condition                          |
| ------ | ---------------------------------- |
| `404`  | Point not found                    |
| `409`  | Invalid transition or guard failed |

**Example**

```bash
curl -X PATCH http://localhost:8000/api/v1/projects/proj-1/judgment-points/jp-abc123/dismiss \
  -H "Content-Type: application/json" \
  -d '{
    "actor": { "id": "user-1", "type": "user" },
    "reason": "Duplicate of jp-xyz789"
  }'
```

---

### PATCH /api/v1/projects/{project_id}/judgment-points/{point_id}/reopen

Reopen a previously resolved, stale, or dismissed judgment point.

**Request body**

```json
{
  "actor": {
    "id": "string",
    "type": "user | agent | system | policy"
  },
  "reason": "string"
}
```

**Response** `200 OK`

Returns the updated `JudgmentPoint` with `status` changed to `"reopened"`.

**Error responses**

| Status | Condition                          |
| ------ | ---------------------------------- |
| `404`  | Point not found                    |
| `409`  | Invalid transition or guard failed |

**Example**

```bash
curl -X PATCH http://localhost:8000/api/v1/projects/proj-1/judgment-points/jp-abc123/reopen \
  -H "Content-Type: application/json" \
  -d '{
    "actor": { "id": "user-1", "type": "user" },
    "reason": "New data invalidates previous resolution"
  }'
```

---

### PATCH /api/v1/projects/{project_id}/judgment-points/{point_id}/mark-stale

Mark a resolved judgment point as stale.

**Request body**

```json
{
  "actor": {
    "id": "string",
    "type": "user | agent | system | policy"
  },
  "reason": "string"
}
```

**Response** `200 OK`

Returns the updated `JudgmentPoint` with `status` changed to `"stale"`.

**Error responses**

| Status | Condition                          |
| ------ | ---------------------------------- |
| `404`  | Point not found                    |
| `409`  | Invalid transition or guard failed |

**Example**

```bash
curl -X PATCH http://localhost:8000/api/v1/projects/proj-1/judgment-points/jp-abc123/mark-stale \
  -H "Content-Type: application/json" \
  -d '{
    "actor": { "id": "system", "type": "system" },
    "reason": "Upstream dependency changed"
  }'
```

---

### POST /api/v1/projects/{project_id}/judgment-points/{point_id}/alternatives

Add an alternative to a judgment point.

**Request body**

```json
{
  "alternative": {
    "id": "string | null",
    "label": "string",
    "description": "string",
    "tradeoffs": "string | null",
    "source": "string | null"
  }
}
```

**Response** `201 Created`

Returns the updated `JudgmentPoint` with the new alternative appended.

**Error responses**

| Status | Condition       |
| ------ | --------------- |
| `404`  | Point not found |

**Example**

```bash
curl -X POST http://localhost:8000/api/v1/projects/proj-1/judgment-points/jp-abc123/alternatives \
  -H "Content-Type: application/json" \
  -d '{
    "alternative": {
      "label": "Kriging",
      "description": "Geostatistical interpolation with uncertainty estimates"
    }
  }'
```

---

### POST /api/v1/projects/{project_id}/judgment-points/{point_id}/artifacts

Link an artifact to a judgment point.

**Request body**

```json
{
  "artifact": {
    "id": "string | null",
    "type": "cell | parameter | model | plot | conclusion | dataset | standard | requirement | document | computation",
    "name": "string",
    "location": {
      "filePath": "string | null",
      "cellId": "string | null"
    }
  }
}
```

**Response** `201 Created`

Returns the updated `JudgmentPoint` with the new artifact linked.

**Error responses**

| Status | Condition       |
| ------ | --------------- |
| `404`  | Point not found |

**Example**

```bash
curl -X POST http://localhost:8000/api/v1/projects/proj-1/judgment-points/jp-abc123/artifacts \
  -H "Content-Type: application/json" \
  -d '{
    "artifact": {
      "type": "model",
      "name": "thermal-fea-model",
      "location": { "filePath": "models/thermal.py" }
    }
  }'
```

---

### DELETE /api/v1/projects/{project_id}/judgment-points/{point_id}/artifacts/{artifact_id}

Unlink an artifact from a judgment point.

**Query parameters**

| Parameter | Type     | Default | Description        |
| --------- | -------- | ------- | ------------------ |
| `reason`  | `string` | `""`    | Reason for removal |

**Response** `200 OK`

Returns the updated `JudgmentPoint` with the artifact removed.

**Error responses**

| Status | Condition       |
| ------ | --------------- |
| `404`  | Point not found |

**Example**

```bash
curl -X DELETE "http://localhost:8000/api/v1/projects/proj-1/judgment-points/jp-abc123/artifacts/art-1?reason=outdated"
```

---

## Events

All event endpoints are prefixed with `/api/v1`.

### GET /api/v1/projects/{project_id}/judgment-points/{point_id}/events

Get all events for a specific judgment point, ordered by timestamp.

**Response** `200 OK`

Returns an array of `JudgmentEvent` objects.

```json
[
  {
    "id": "string",
    "judgmentPointId": "string",
    "projectId": "string",
    "type": "string",
    "timestamp": "2026-01-01T00:00:00Z",
    "actor": { "id": "string", "type": "string" },
    "payload": {},
    "metadata": {}
  }
]
```

**Error responses**

| Status | Condition                                     |
| ------ | --------------------------------------------- |
| `404`  | Point not found or does not belong to project |

**Example**

```bash
curl http://localhost:8000/api/v1/projects/proj-1/judgment-points/jp-abc123/events
```

---

### GET /api/v1/projects/{project_id}/events

Get all events for a project with pagination.

**Query parameters**

| Parameter | Type  | Default | Description              |
| --------- | ----- | ------- | ------------------------ |
| `offset`  | `int` | `0`     | Pagination offset (>= 0) |
| `limit`   | `int` | `50`    | Page size (1--200)       |

**Response** `200 OK`

```json
{
  "items": [{ "...JudgmentEvent" }],
  "total": 100,
  "offset": 0,
  "limit": 50
}
```

**Example**

```bash
curl "http://localhost:8000/api/v1/projects/proj-1/events?offset=0&limit=20"
```

---

## Policies

All policy endpoints are prefixed with `/api/v1`.

### POST /api/v1/projects/{project_id}/policies

Create a new judgment policy.

**Request body**

```json
{
  "name": "string",
  "description": "string",
  "scope": {
    "categories": ["method", "assumption"],
    "triggerSources": ["agent", "rule"],
    "artifactTypes": ["model"],
    "materialityScoreMin": 0,
    "materialityScoreMax": 18
  },
  "rules": [
    {
      "id": "string",
      "condition": {
        "materialityScoreMin": 0,
        "materialityScoreMax": 18,
        "dimensionThresholds": {
          "methodologicalDiscretion": 0,
          "downstreamInfluence": 0,
          "uncertainty": 0,
          "consequence": 0,
          "reversibility": 0,
          "accountabilityRequirement": 0
        },
        "hardTrigger": "string | null",
        "categories": ["method"],
        "expression": "string | null"
      },
      "intervention": "trace | disclose | pause | require-investigation",
      "authorityOverride": {
        "mode": "human | collaborative | delegated | rule",
        "actorId": "string | null",
        "policyId": "string | null"
      },
      "delegationConditions": {
        "allowed": false,
        "maxMaterialityScore": 18,
        "requiredConfidence": 0.0,
        "excludedCategories": ["assumption"],
        "requiresPriorHumanResolution": false,
        "auditRequired": true
      },
      "description": "string | null"
    }
  ],
  "priority": 0,
  "enabled": true
}
```

**Response** `201 Created`

Returns the created `JudgmentPolicy` with generated `id` and timestamps.

**Example**

```bash
curl -X POST http://localhost:8000/api/v1/projects/proj-1/policies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High materiality escalation",
    "description": "Escalate high-materiality points to human authority",
    "scope": { "materialityScoreMin": 12 },
    "rules": [{
      "id": "rule-1",
      "condition": { "materialityScoreMin": 12 },
      "intervention": "pause",
      "authorityOverride": { "mode": "human" }
    }],
    "priority": 1,
    "enabled": true
  }'
```

---

### GET /api/v1/projects/{project_id}/policies

List all policies for a project.

**Response** `200 OK`

Returns an array of `JudgmentPolicy` objects.

**Example**

```bash
curl http://localhost:8000/api/v1/projects/proj-1/policies
```

---

### GET /api/v1/projects/{project_id}/policies/{policy_id}

Get a single policy by ID.

**Response** `200 OK`

Returns the `JudgmentPolicy` object.

**Error responses**

| Status | Condition                                      |
| ------ | ---------------------------------------------- |
| `404`  | Policy not found or does not belong to project |

**Example**

```bash
curl http://localhost:8000/api/v1/projects/proj-1/policies/pol-abc123
```

---

### PUT /api/v1/projects/{project_id}/policies/{policy_id}

Update an existing policy. Replaces the entire policy except for `id`, `projectId`, and `createdAt`.

**Request body**

Same shape as the create request body.

**Response** `200 OK`

Returns the updated `JudgmentPolicy` with a refreshed `updatedAt` timestamp.

**Error responses**

| Status | Condition                                      |
| ------ | ---------------------------------------------- |
| `404`  | Policy not found or does not belong to project |

**Example**

```bash
curl -X PUT http://localhost:8000/api/v1/projects/proj-1/policies/pol-abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated escalation policy",
    "description": "Revised thresholds",
    "scope": { "materialityScoreMin": 10 },
    "rules": [{
      "id": "rule-1",
      "condition": { "materialityScoreMin": 10 },
      "intervention": "require-investigation",
      "authorityOverride": { "mode": "human" }
    }],
    "priority": 1,
    "enabled": true
  }'
```

---

## Error Responses

All error responses follow a consistent format:

```json
{
  "error": "Human-readable error message"
}
```

Domain errors are mapped to HTTP status codes as follows:

| Status | Error Type                    | Description                     |
| ------ | ----------------------------- | ------------------------------- |
| `400`  | `JudgmentError`               | General domain error            |
| `403`  | `UnauthorizedResolutionError` | Actor not authorized to resolve |
| `404`  | `NotFoundError`               | Resource not found              |
| `409`  | `InvalidTransitionError`      | Invalid state transition        |
| `409`  | `GuardError`                  | Lifecycle guard check failed    |
| `409`  | `PolicyViolationError`        | Policy constraint violated      |
| `409`  | `DuplicateError`              | Duplicate resource              |
| `422`  | `ValidationError`             | Input validation failed         |

`InvalidTransitionError` responses include `fromStatus` and `toStatus` fields. `GuardError` responses include a `reasons` array. `ValidationError` responses include a `fields` array.
