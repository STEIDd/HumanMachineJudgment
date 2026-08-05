# MCP Integration

This document describes how the Human-Machine Judgment system integrates with the Model Context Protocol (MCP). It covers the target protocol version, SDK versions, exposed resources and tools, authorization boundaries, subscription behavior, and current limitations.

---

## Protocol and SDK Versions

| Component    | Version                               |
| ------------ | ------------------------------------- |
| MCP Protocol | 2026-07-28                            |
| Server SDK   | `@modelcontextprotocol/server` v2.0.0 |
| Client SDK   | `@modelcontextprotocol/client` v2.0.0 |

The `judgment-mcp` package implements an MCP server that exposes Judgment Point operations as tools and resources. The server conforms to the MCP specification dated 2026-07-28.

---

## Deprecated Features

### Sampling

The MCP sampling capability is deprecated as of the 2026-07-28 specification. The `judgment-mcp` server does not use sampling. Any integration that previously relied on sampling for server-initiated model interactions must migrate to an alternative mechanism.

### MRTR (Input-Required)

The mechanism for server-initiated user interaction is MRTR (Model-Requested Tool Response), exposed through the `input-required` notification pattern. When the Judgment Points system requires user input (for example, to resolve a paused Judgment Point), it uses the MRTR mechanism to signal to the client that user interaction is needed.

The MRTR flow works as follows:

1. The server encounters a state that requires user input (a Judgment Point has reached the `pause` or `require-investigation` intervention level).
2. The server sends an `input-required` notification to the client, including the Judgment Point identifier and a description of the input needed.
3. The client presents the input request to the user.
4. The user provides input (a resolution, dismissal, or investigation action).
5. The client sends the user's input back to the server through a tool call.
6. The server processes the input, updates the Judgment Point state, and resumes the workflow.

---

## Exposed Resources

The `judgment-mcp` server exposes the following MCP resources. Resources provide read-only access to Judgment Point data.

### judgment://projects/{projectId}/policies

**Description.** Lists all active policies for the specified project.

**URI template.** `judgment://projects/{projectId}/policies`

**Parameters.**

- `projectId` (string, required): The project identifier.

**Returns.** A JSON array of `JudgmentPolicy` objects conforming to `judgment-policy.schema.json`.

### judgment://projects/{projectId}/judgments

**Description.** Lists all Judgment Points for the specified project, with optional filtering.

**URI template.** `judgment://projects/{projectId}/judgments`

**Parameters.**

- `projectId` (string, required): The project identifier.

**Query parameters (optional).**

- `status`: Comma-separated list of status values to filter by.
- `category`: Comma-separated list of category values to filter by.
- `minScore`: Minimum materiality score.
- `maxScore`: Maximum materiality score.

**Returns.** A JSON array of `JudgmentPoint` objects conforming to `judgment-point.schema.json`.

### judgment://projects/{projectId}/judgments/{judgmentId}

**Description.** Retrieves a single Judgment Point by identifier.

**URI template.** `judgment://projects/{projectId}/judgments/{judgmentId}`

**Parameters.**

- `projectId` (string, required): The project identifier.
- `judgmentId` (string, required): The Judgment Point identifier.

**Returns.** A single `JudgmentPoint` object conforming to `judgment-point.schema.json`.

### judgment://projects/{projectId}/judgments/{judgmentId}/events

**Description.** Retrieves the event history for a single Judgment Point.

**URI template.** `judgment://projects/{projectId}/judgments/{judgmentId}/events`

**Parameters.**

- `projectId` (string, required): The project identifier.
- `judgmentId` (string, required): The Judgment Point identifier.

**Returns.** A JSON array of `JudgmentEvent` objects conforming to `judgment-event.schema.json`, ordered by timestamp.

---

## Exposed Tools

The `judgment-mcp` server exposes the following MCP tools. Tools enable agents to perform actions on Judgment Points.

### judgment.propose

**Description.** Proposes a new Judgment Candidate.

**Input schema.**

```json
{
  "type": "object",
  "required": ["projectId", "category", "question", "context", "trigger", "materiality"],
  "properties": {
    "projectId": { "type": "string" },
    "category": {
      "type": "string",
      "enum": [
        "objective",
        "framing",
        "assumption",
        "method",
        "data",
        "parameter",
        "validation",
        "interpretation"
      ]
    },
    "question": { "type": "string" },
    "context": { "type": "string" },
    "trigger": { "$ref": "JudgmentTrigger" },
    "materiality": { "$ref": "MaterialityAssessment" },
    "affectedArtifactIds": { "type": "array", "items": { "type": "string" } },
    "validityConditions": { "type": "array", "items": { "type": "string" } },
    "reopenConditions": { "type": "array", "items": { "type": "string" } }
  }
}
```

**Output.** The created `JudgmentPoint` object in `candidate` status.

**Authorization.** Any authenticated agent or user with access to the project may propose candidates.

### judgment.assess_materiality

**Description.** Computes or reassesses the materiality of a Judgment Point.

**Input schema.**

```json
{
  "type": "object",
  "required": ["judgmentId", "dimensions"],
  "properties": {
    "judgmentId": { "type": "string" },
    "dimensions": {
      "type": "object",
      "properties": {
        "methodologicalDiscretion": { "type": "integer", "minimum": 0, "maximum": 3 },
        "downstreamInfluence": { "type": "integer", "minimum": 0, "maximum": 3 },
        "uncertainty": { "type": "integer", "minimum": 0, "maximum": 3 },
        "consequence": { "type": "integer", "minimum": 0, "maximum": 3 },
        "reversibility": { "type": "integer", "minimum": 0, "maximum": 3 },
        "accountabilityRequirement": { "type": "integer", "minimum": 0, "maximum": 3 }
      }
    },
    "detectorConfidence": { "type": "number", "minimum": 0, "maximum": 1 }
  }
}
```

**Output.** The updated materiality assessment with computed aggregate score and intervention level.

**Authorization.** Any authenticated agent or user with access to the project may assess materiality.

### judgment.add_alternative

**Description.** Adds an alternative to an existing Judgment Point.

**Input schema.**

```json
{
  "type": "object",
  "required": ["judgmentId", "label", "description"],
  "properties": {
    "judgmentId": { "type": "string" },
    "label": { "type": "string" },
    "description": { "type": "string" },
    "tradeoffs": { "type": "string" },
    "source": { "type": "string", "enum": ["agent", "user", "standard", "prior-decision"] },
    "evidenceRefs": { "type": "array", "items": { "$ref": "ArtifactReference" } }
  }
}
```

**Output.** The updated Judgment Point with the new alternative included.

**Authorization.** Any authenticated agent or user with access to the project may add alternatives.

### judgment.resolve

**Description.** Records a resolution for a Judgment Point.

**Input schema.**

```json
{
  "type": "object",
  "required": ["judgmentId", "selectedAlternativeId", "rationale"],
  "properties": {
    "judgmentId": { "type": "string" },
    "selectedAlternativeId": { "type": "string" },
    "rationale": { "type": "string" },
    "uncertainty": { "type": "array", "items": { "type": "string" } },
    "conditions": { "type": "array", "items": { "type": "string" } },
    "validationRequirements": { "type": "array", "items": { "type": "string" } }
  }
}
```

**Output.** The updated Judgment Point with the resolution recorded.

**Authorization.** Resolution is subject to the Judgment Point's authority configuration. See the Authorization section below.

### judgment.dismiss

**Description.** Dismisses a Judgment Point as not requiring a decision.

**Input schema.**

```json
{
  "type": "object",
  "required": ["judgmentId", "reason"],
  "properties": {
    "judgmentId": { "type": "string" },
    "reason": { "type": "string" }
  }
}
```

**Output.** The updated Judgment Point in `dismissed` status.

**Authorization.** Dismissal is subject to the dismissal guard (see `docs/lifecycle.md`).

### judgment.reopen

**Description.** Reopens a previously resolved, stale, or dismissed Judgment Point.

**Input schema.**

```json
{
  "type": "object",
  "required": ["judgmentId", "reason"],
  "properties": {
    "judgmentId": { "type": "string" },
    "reason": { "type": "string" }
  }
}
```

**Output.** The updated Judgment Point in `reopened` status.

**Authorization.** Any authenticated user with access to the project may reopen a Judgment Point.

### judgment.link_artifact

**Description.** Links an artifact reference to a Judgment Point.

**Input schema.**

```json
{
  "type": "object",
  "required": ["judgmentId", "artifactType", "label", "relationship"],
  "properties": {
    "judgmentId": { "type": "string" },
    "artifactType": {
      "type": "string",
      "enum": [
        "cell",
        "parameter",
        "model",
        "plot",
        "conclusion",
        "dataset",
        "standard",
        "requirement",
        "document",
        "computation"
      ]
    },
    "label": { "type": "string" },
    "relationship": {
      "type": "string",
      "enum": ["depends-on", "informs", "produced-by", "validates", "contradicts"]
    },
    "location": { "type": "object" },
    "description": { "type": "string" }
  }
}
```

**Output.** The updated Judgment Point with the linked artifact.

**Authorization.** Any authenticated agent or user with access to the project may link artifacts.

### judgment.request_comparison

**Description.** Requests a structured comparison of alternatives for a Judgment Point.

**Input schema.**

```json
{
  "type": "object",
  "required": ["judgmentId"],
  "properties": {
    "judgmentId": { "type": "string" },
    "alternativeIds": { "type": "array", "items": { "type": "string" } },
    "comparisonType": { "type": "string" }
  }
}
```

**Output.** A confirmation that the comparison has been requested, with a correlation identifier for tracking.

**Authorization.** Any authenticated agent or user with access to the project may request comparisons.

---

## Authorization

The MCP integration enforces the same authorization model as the core system, with one additional constraint specific to external agents.

### External Agent Resolution Restriction

External agents connecting through the MCP interface cannot resolve protected Judgment Points merely by calling the `judgment.resolve` tool. The resolution guard is enforced on the server side:

1. The server identifies the caller by the MCP session's authenticated identity.
2. The server evaluates whether the caller is authorized to resolve the Judgment Point, based on the authority configuration:
   - If the authority mode is `human`, the caller must be authenticated as a human user. Agent callers receive an authorization error.
   - If the authority mode is `collaborative`, the caller must be a human user.
   - If the authority mode is `delegated`, the caller must be the delegated agent specified in the delegation policy, and all delegation conditions must be met.
   - If the authority mode is `rule`, the resolution must reference the applicable rule.
3. If authorization fails, the tool returns an error response with a clear explanation of why the resolution was rejected.

This prevents an agent from bypassing human oversight by directly calling the resolve tool on Judgment Points that require human authority.

---

## Subscription Behavior

The MCP server supports subscriptions through the `subscriptions/listen` mechanism defined in the MCP specification. Clients can subscribe to events for specific Judgment Points or for all Judgment Points in a project.

### Subscribing to a Judgment Point

```json
{
  "method": "subscriptions/listen",
  "params": {
    "uri": "judgment://projects/my-project/judgments/jp-001"
  }
}
```

The server sends notifications when the subscribed Judgment Point's state changes (status transitions, new alternatives, new evidence, staleness marking, or resolution).

### Subscribing to a Project

```json
{
  "method": "subscriptions/listen",
  "params": {
    "uri": "judgment://projects/my-project/judgments"
  }
}
```

The server sends notifications when any Judgment Point in the project is created, promoted, resolved, or otherwise modified.

### Notification Format

Notifications include the event type, the Judgment Point identifier, and a summary of the change. The client can then read the full resource to get the updated state.

---

## Current Limitations

The following limitations apply to the MCP integration in the current version:

### Protocol Feature Isolation

Several MCP protocol features are not yet fully implemented or are isolated from the core system:

1. **Prompts.** The MCP prompts capability is not used. The server does not expose prompt templates through MCP. Agent prompting is handled by the Agent Skill definitions in the `skills/` directory.

2. **Roots.** The MCP roots capability is not used. The server does not declare file system roots through MCP.

3. **Logging.** The MCP logging capability is deprecated in the 2026-07-28 specification. Implementations should migrate to stderr or OpenTelemetry for structured logging. MCP-level logs and Judgment Events are separate streams.

4. **Completion.** The MCP completion capability is not currently implemented. The server does not provide argument completion suggestions for tools.

### Transport Limitations

The current implementation supports the stdio transport. HTTP/SSE transport support is planned but not yet implemented. Agents connecting over network transports must use the reference server's HTTP API instead of the MCP server.

### Schema Versioning

The MCP server does not currently negotiate schema versions with clients. It serves the current schema version only. Clients that expect a different schema version may receive data that does not match their expectations. Schema version negotiation is planned for a future release.

### Batch Operations

The MCP tools operate on individual Judgment Points. Batch operations (such as resolving multiple Judgment Points in a single call, or proposing multiple candidates at once) are not supported through MCP tools. Clients that need batch operations should use the SDK directly or make multiple sequential tool calls.

### Rate Limiting

The MCP server does not implement rate limiting. In deployments where multiple agents connect concurrently, rate limiting should be implemented at the transport or infrastructure layer.
