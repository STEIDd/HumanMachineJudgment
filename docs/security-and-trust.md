# Security and Trust

This document describes the security considerations, trust boundaries, and threat mitigations for the Human-Machine Judgment system. It covers authorization, isolation, validation, immutability, audit, and specific threats related to agent interactions.

---

## Authorization Boundaries

The Judgment Points system enforces authorization at several boundaries to prevent unauthorized access and modification.

### Resolution Authorization

The most critical authorization boundary is resolution. Not all actors may resolve all Judgment Points. The authority model defines four modes:

- **human**: Only authenticated human users may resolve. Agent callers receive an authorization rejection.
- **collaborative**: Only authenticated human users may record the final resolution, though agents may contribute analysis.
- **delegated**: Agents may resolve, but only when all delegation policy conditions are met: materiality score within bounds, detector confidence above threshold, category not excluded, and prior human resolution requirement satisfied (if specified).
- **rule**: Resolution must reference the governing rule or standard.

The authorization check is performed on every resolution attempt, not just at delegation time. An agent that was delegated authority at time T may fail the check at time T+1 if conditions have changed (for example, if the materiality score was reassessed upward).

### Event Creation Authorization

All events are recorded with an actor identifier and actor type. The system validates that the actor has access to the project before allowing any event to be created. Events from unknown or unauthenticated actors are rejected.

### Resource Read Authorization

Reading Judgment Point data (through MCP resources, SDK queries, or HTTP API) is restricted to actors with access to the owning project. Cross-project reads are rejected regardless of the actor's permissions in other projects.

---

## Project Isolation

Every Judgment Point, event, policy, and artifact reference belongs to exactly one project, identified by the `projectId` field.

### Storage-Level Isolation

Storage adapters enforce project isolation at the data layer:

- Queries always include the `projectId` as a filter. There is no API surface for querying across projects.
- Storage writes validate that the `projectId` in the request matches the authenticated context.
- The SQLite adapter uses a single database per project, providing file-system-level isolation.

### Request-Level Isolation

The MCP server and HTTP API extract the project identifier from the request path or parameters and validate that the authenticated caller has access to that project before processing the request. A caller with access to project A cannot read or write data in project B by manipulating request parameters.

### Cross-Project References

Artifact references may reference artifacts in other projects (e.g., a shared requirements document). However, cross-project artifact references carry only metadata (type, label, URI); they do not expose the content of the referenced artifact. An artifact reference does not grant read access to the artifact it points to.

---

## Input Validation

All data entering the system is validated against the JSON Schema definitions before being processed or stored.

### Schema Validation

Every Judgment Point, event, policy, resolution, and artifact reference is validated against its corresponding schema (`judgment-point.schema.json`, `judgment-event.schema.json`, `judgment-policy.schema.json`, `judgment-resolution.schema.json`, `artifact-reference.schema.json`) before persistence.

The schemas use JSON Schema Draft 2020-12 and define:

- Required fields and their types.
- Enumerated values for status, category, authority mode, event type, artifact type, and relationship type.
- Numeric ranges for materiality scores and dimensions.
- Date-time format requirements for timestamps.
- `additionalProperties: false` on all object types (except explicitly extensible `payload` and `metadata` objects) to reject unexpected fields.

Schema validation failures are returned as structured error responses. Invalid data is never persisted.

### String Field Sanitization

Free-text fields (question, context, rationale, description, notes) are validated for:

- Maximum length limits to prevent storage exhaustion.
- Rejection of control characters (except newlines and tabs) that could cause display issues.
- No HTML or script content in fields that will be rendered in the UI (HTML entities are escaped at the rendering layer, not the storage layer).

### Numeric Range Enforcement

Materiality dimension scores are validated as integers between 0 and 3. The aggregate score is validated as an integer between 0 and 18. The aggregate must equal the sum of the six dimensions; a mismatch is rejected.

Detector confidence is validated as a number between 0.0 and 1.0, inclusive.

---

## Output Encoding

The UI rendering layer applies output encoding to all dynamic content before inserting it into the DOM.

### HTML Encoding

All Judgment Point field values (question, context, rationale, alternative descriptions, evidence descriptions) are HTML-encoded before rendering. Special characters (`<`, `>`, `&`, `"`, `'`) are replaced with their HTML entity equivalents.

### URL Encoding

Artifact reference URIs and file paths are URL-encoded when used in link elements. This prevents path traversal and injection through crafted location values.

### JSON Encoding

API responses use standard JSON encoding. No raw string concatenation is used to construct JSON responses; all responses are produced by JSON serialization libraries.

---

## Schema Validation

Beyond individual field validation, the system performs structural validation to ensure consistency:

### Referential Integrity

- The `selectedAlternativeId` in a resolution must reference an alternative that exists in the Judgment Point's `alternatives` array.
- The `projectId` on an event must match the `projectId` of the Judgment Point it references.
- Delegation policies referenced in authority configurations must exist and be active.

### State Machine Validation

Every state transition is validated against the lifecycle state machine before an event is created. Invalid transitions (such as attempting to resolve a candidate directly, or dismissing an already-resolved Judgment Point) are rejected with an error explaining the invalid transition.

### Timestamp Ordering

Events within a Judgment Point are validated for timestamp ordering. An event with a timestamp earlier than the most recent event for the same Judgment Point is rejected. This prevents out-of-order event insertion.

---

## Event Immutability

Events in the Judgment Event log are immutable. Once an event is persisted, it cannot be modified or deleted through any application-level interface.

### Write-Once Guarantee

The storage interface provides only an `appendEvent` method. There is no `updateEvent` or `deleteEvent` method. Storage adapters implement this constraint at the data layer:

- The in-memory adapter stores events in a frozen array. Append creates a new array with the new event added.
- The SQLite adapter uses an append-only table with no UPDATE or DELETE statements in the application code.

### Tombstones Over Deletion

When a Judgment Point is dismissed or a resolution is superseded, the system does not delete previous events. Instead, it appends new events that record the dismissal or reopening. The previous events remain in the log.

---

## Audit Integrity

The event log serves as the audit record for all Judgment Point activity. Several mechanisms protect audit integrity.

### Complete History

Every action that changes the state of a Judgment Point produces an event. There are no "side-channel" modifications that bypass the event log. The current-state projection is always derivable from the event log.

### Actor Accountability

Every event records the actor identifier and actor type (user, agent, system, policy). This provides an unbroken chain of accountability for every decision and action.

### Delegation Audit Trail

When a Judgment Point is resolved through delegation, the event records the delegation policy, the delegated agent, and the delegation conditions at the time of resolution. If the delegation policy specified `auditRequired: true`, the resolution is flagged for subsequent human review.

### Projection Verification

The current-state projection can be verified against the event log at any time by replaying all events and comparing the result with the stored projection. A mismatch indicates data corruption or a bug in the projection logic.

---

## Secret Handling

The system does not store secrets (API keys, passwords, tokens) in the event log, Judgment Point records, or artifact references.

### Model Provider Credentials

Model provider API keys (used for optional model-assisted detection) are configured through environment variables or external secret management. They are never included in event payloads, Judgment Point records, or API responses.

### User Identity

User identifiers stored in events and resolutions are opaque identifiers (such as `user:engineer-01`), not email addresses, personal names, or other personally identifiable information. The mapping from opaque identifiers to real identities is managed outside the Judgment Points system.

### Session Tokens

MCP session tokens and HTTP authentication tokens are transient and are not stored in the event log or Judgment Point records.

---

## Dependency Security

### Supply Chain

The core package (`judgment-core`) has zero external runtime dependencies. This eliminates supply chain risk for the core domain logic.

Other packages have controlled dependency trees:

- `judgment-schemas` depends only on JSON Schema validation libraries.
- `judgment-mcp` depends on `@modelcontextprotocol/server`, which is maintained by the MCP specification authors.
- `judgment-ui` depends on React, which is a widely maintained library.

### Dependency Updates

Dependencies are managed through pnpm with a lockfile (`pnpm-lock.yaml`). The lockfile is committed to version control. Dependency updates are reviewed through pull requests, and the full validation suite (`pnpm run validate`) must pass before merging.

### Package Integrity

pnpm verifies package integrity through content-addressable storage. Downloaded packages are verified against their registry checksums.

---

## Safe MCP Tool Design

The MCP tools exposed by `judgment-mcp` follow safe design principles.

### Input Validation

All tool inputs are validated against their declared JSON Schema before processing. Invalid inputs receive an error response without being processed.

### Idempotency

Where possible, MCP tools are designed to be idempotent. Re-proposing the same candidate (with the same identifier) returns the existing candidate rather than creating a duplicate. Re-linking the same artifact reference is a no-op.

### Error Responses

Error responses include a clear error type and message but do not expose internal implementation details, stack traces, or system configuration.

### No Side Effects Beyond Judgment Points

MCP tools modify only Judgment Point data. They do not modify files on the file system, execute arbitrary code, make network requests to external services, or access resources outside the Judgment Points system.

---

## Threat Mitigations

### Malicious or Malformed Agent Output

**Threat.** An agent submits a Judgment Candidate with crafted content intended to confuse the user, inject misleading information, or bypass detection rules.

**Mitigation.** All agent-submitted content is validated against the schema. Free-text fields are rendered with output encoding that prevents script injection. The system does not grant any special trust to agent-submitted content; it is treated as untrusted input that must be reviewed by the human user.

### Prompt-Injected Candidate Content

**Threat.** An agent that has been compromised by prompt injection submits candidates whose questions, contexts, or alternative descriptions contain instructions intended to manipulate the human reviewer.

**Mitigation.** The system treats all text content as display text, not as instructions. No text from a Judgment Point record is executed as code, evaluated as a prompt, or interpreted as a system instruction. The UI renders text in a sandboxed context where it cannot affect the behavior of the application.

### Unauthorized Resolution Attempts

**Threat.** An agent attempts to resolve a Judgment Point that requires human authority by calling the resolve tool.

**Mitigation.** The resolution guard checks the actor's identity and authority mode on every resolution attempt. If the Judgment Point requires human authority and the caller is an agent, the resolution is rejected with a clear error message. The failed attempt is logged as an event for audit purposes.

### Replay Attempts

**Threat.** An attacker captures a valid resolution request and replays it to resolve a different Judgment Point or to re-resolve a Judgment Point after it has been reopened.

**Mitigation.** Each resolution request is validated against the current state of the Judgment Point. A resolution request for a Judgment Point that is not in a resolvable state (e.g., already resolved, or in candidate state) is rejected. Timestamps in events are server-generated, not client-provided.

### Stale Resume Tokens

**Threat.** An agent uses a stale workflow resume token (from a previous session) to bypass a Judgment Point that was paused and later reopened.

**Mitigation.** Resume tokens are validated against the current state of the Judgment Point. If the Judgment Point has been reopened since the resume token was issued, the token is invalid, and the agent receives an error indicating that the Judgment Point must be re-resolved.

### Cross-Project Artifact References

**Threat.** An attacker crafts an artifact reference with a location pointing to a sensitive file in another project, using the artifact reference system as a side channel for data exfiltration.

**Mitigation.** Artifact references store metadata only (type, label, relationship, and optional location). The system does not read, fetch, or serve the content of referenced artifacts. The location field is a pointer for the user's convenience; it does not grant the system or any agent access to the referenced content.

### Denial-of-Service Considerations

**Threat.** An agent submits a large number of candidates, alternatives, or events in a short period, overwhelming the storage layer or causing the UI to become unresponsive.

**Mitigation.** The following limits are enforced:

- Maximum number of candidates per project per minute (configurable, default 100).
- Maximum number of alternatives per Judgment Point (configurable, default 20).
- Maximum number of events per Judgment Point per minute (configurable, default 50).
- Maximum length for free-text fields (configurable, default 10,000 characters).

When limits are exceeded, the system returns a rate-limit error and does not process the request.

---

## Data Retention and Deletion

### Retention Policy

Events and Judgment Point records are retained indefinitely by default. The event log is append-only, and the system does not automatically delete records. This default supports audit and accountability requirements.

### Explicit Deletion

When data deletion is required (for example, to comply with a data retention policy or a deletion request), the system provides a project-level deletion operation that removes all events, Judgment Points, policies, and artifact references for a specified project. This is an administrative operation that requires elevated permissions and produces a final audit event recording the deletion.

### Partial Deletion

Individual Judgment Points or events cannot be selectively deleted from the event log, because selective deletion would break the audit trail's integrity. If specific content must be removed (for example, to remove personal data from a free-text field), the system creates a redaction event that records that content was removed, without modifying the original event.

---

## Privacy Boundaries

### Personal Data Minimization

The system is designed to minimize the collection of personal data. User identifiers are opaque strings. The system does not store names, email addresses, or other personally identifiable information. The mapping from opaque identifiers to real identities is managed by the organization's identity system, outside the Judgment Points system.

### Content Scope

The content stored in Judgment Points (questions, contexts, rationales, alternatives) is technical in nature. It describes engineering and analytical choices, not personal information. Organizations should establish guidelines to prevent users from including personal data in Judgment Point free-text fields.

### Access Logging

Read access to Judgment Point data is logged at the transport layer (MCP session logs, HTTP access logs). The Judgment Event log records write operations only. Access logs are managed by the deployment infrastructure, not by the Judgment Points system itself.
