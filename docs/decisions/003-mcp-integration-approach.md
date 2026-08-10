# ADR-003: MCP Integration Approach

**Status**: Accepted
**Date**: 2026-08-04
**Authors**: Courage Lahban

## Context

The Model Context Protocol (MCP) provides a standardized way for AI agents
to interact with external tools and resources. The Judgment Points system
should be accessible to any MCP-compatible agent, allowing agents to propose
candidates, query decisions, and receive materiality assessments through
the standard protocol.

The MCP specification underwent a major revision on July 28, 2026 (protocol
version 2026-07-28). This revision deprecated Sampling, introduced Multi
Round-Trip Requests (MRTR) with the input-required mechanism, redesigned
subscriptions, and split the TypeScript SDK into separate packages.

## Decision

The judgment-mcp package targets MCP protocol version 2026-07-28 and uses
the MCP Python SDK (mcp >= 1.0).

The integration uses:

- **Tools** for actions: proposing candidates, assessing materiality,
  resolving decisions, delegating, reopening, marking stale, attaching
  artifacts.
- **Resources** for read access: project policies, pending decisions,
  active decisions, individual Judgment Point details, artifact decisions.
- **MRTR input-required** for elicitation: when a tool call requires user
  input (such as a resolution decision), the server returns an
  InputRequiredResult. The client gathers the user's response and re-issues
  the call with the response and echoed requestState.

The integration does NOT use:

- **Sampling** (deprecated in 2026-07-28).
- **The old elicitation/create pattern** (replaced by MRTR).
- **resources/subscribe** (removed; replaced by subscriptions/listen).

## Rationale

Building on the current protocol version avoids accumulating technical debt
from deprecated features. The MRTR mechanism is well-suited to Judgment
Points because it naturally supports the pause-and-resume pattern: a tool
call pauses, the server indicates that user input is needed, and the client
re-issues the call after gathering the resolution.

Tools and resources are the primary extension mechanisms in MCP 2026-07-28,
and they align with the Judgment Points operational model: tools perform
actions (propose, resolve, delegate), and resources provide contextual
information (policies, pending decisions, decision details).

## Consequences

- The MCP integration requires the MCP Python SDK (mcp >= 1.0).
- Clients using the legacy v1.x SDK may not support MRTR. The integration
  should degrade gracefully by returning an error that explains the
  requirement.
- If the official SDK does not fully support a required protocol feature
  at implementation time, the integration will isolate the incomplete
  feature, document the limitation, and provide a host-managed fallback.
- Protected resolution requires verified authority. An external agent
  cannot resolve a protected Judgment Point merely because it can call
  the judgment.resolve tool. The server validates authority before
  accepting a resolution.

## Alternatives Considered

- **Building on MCP 2025-11-25 with Sampling**: Would use a deprecated
  feature with a 12-month removal window. Not advisable for a new
  implementation.
- **Custom WebSocket protocol**: Would lose MCP interoperability. Agents
  using MCP-compatible clients would not be able to interact with the
  system.
- **REST-only without MCP**: Would work for the reference server but would
  not provide the standardized agent integration that MCP enables.
