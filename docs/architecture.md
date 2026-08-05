# Architecture

This document describes the architecture of the Human-Machine Judgment system, covering the monorepo structure, package dependency graph, boundaries, storage model, event sourcing approach, authorization, workflow pause and resume, extension points, and the technology stack.

---

## System Overview

Human-Machine Judgment is organized as a monorepo containing publishable packages, runnable applications, standalone schemas, agent skill definitions, and evaluation tooling. The monorepo is managed with pnpm workspaces, and all workspace roots are declared in `pnpm-workspace.yaml`.

The top-level directories serve these purposes:

| Directory   | Purpose                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/` | Publishable libraries that implement the system's runtime, schemas, SDK, integrations, storage adapters, and UI components                  |
| `apps/`     | Runnable applications including the reference demonstration, reference server, and documentation site                                       |
| `schemas/`  | Standalone JSON Schema files defining the canonical data shapes for Judgment Points, events, policies, resolutions, and artifact references |
| `skills/`   | Agent Skill definitions that teach agents how to interact with the Judgment Points system                                                   |
| `evals/`    | Evaluation harness, test fixtures, and evaluation scenarios                                                                                 |
| `examples/` | Example workflows and configurations demonstrating practical usage                                                                          |
| `docs/`     | Prose documentation source, including architecture decision records                                                                         |

---

## Package Inventory

The `packages/` directory contains the following libraries:

| Package                   | Name                                     | Responsibility                                                                                                                                                                                                                     |
| ------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `judgment-core`           | `@human-machine-judgment/core`           | Core domain types, state machine, lifecycle guards, materiality scoring, hard-trigger evaluation, policy evaluation, authority evaluation, resolution validation, dependency invalidation, staleness detection, and event creation |
| `judgment-schemas`        | `@human-machine-judgment/schemas`        | JSON Schema definitions, generated TypeScript types, schema validation utilities, and validation fixtures                                                                                                                          |
| `judgment-sdk`            | `@human-machine-judgment/sdk`            | Developer SDK providing typed interfaces for creating, querying, resolving, and managing Judgment Points programmatically                                                                                                          |
| `judgment-mcp`            | `@human-machine-judgment/mcp`            | Model Context Protocol server exposing Judgment Point operations as MCP tools and resources                                                                                                                                        |
| `judgment-langgraph`      | `@human-machine-judgment/langgraph`      | LangGraph adapter for integrating Judgment Points into LangGraph-based agent graphs                                                                                                                                                |
| `judgment-storage-memory` | `@human-machine-judgment/storage-memory` | In-memory storage adapter implementing the storage interface defined by the core package                                                                                                                                           |
| `judgment-storage-sqlite` | `@human-machine-judgment/storage-sqlite` | SQLite storage adapter for persistent storage of Judgment Points and events                                                                                                                                                        |
| `judgment-ui`             | `@human-machine-judgment/ui`             | React component library providing UI elements for rendering Judgment Points, markers, panels, cards, and comparison views                                                                                                          |

---

## Package Dependency Graph

Dependencies flow in a single direction. Packages at the bottom of the graph depend on packages above them, never the reverse.

```
                    judgment-core
                    (no external deps)
                         |
              +----------+-----------+
              |                      |
       judgment-schemas         judgment-sdk
       (generates types)        (depends on core)
              |                      |
              +----------+-----------+
                         |
         +---------------+---------------+
         |               |               |
  judgment-mcp    judgment-langgraph   storage-*
  (core + sdk)    (core)              (core)
         |
    judgment-ui
    (core)
```

The dependency rules are:

1. `judgment-core` has zero external runtime dependencies. It depends only on the Node.js standard library and TypeScript's built-in types.
2. `judgment-schemas` generates TypeScript types from the JSON Schema definitions in the `schemas/` directory. It provides validation utilities that other packages use to validate data at runtime.
3. `judgment-sdk` depends on `judgment-core` for domain types and lifecycle operations. It provides the primary programmatic interface for external consumers.
4. `judgment-storage-memory` and `judgment-storage-sqlite` depend on `judgment-core` for the storage interface definition. They implement the interface without introducing any dependency from core back to them.
5. `judgment-mcp` depends on `judgment-core` for domain logic and `judgment-sdk` for the client interface. It also depends on the MCP SDK (`@modelcontextprotocol/server`).
6. `judgment-langgraph` depends on `judgment-core` for domain types and lifecycle operations.
7. `judgment-ui` depends on `judgment-core` for domain types. It uses React for rendering but does not introduce a React dependency into the core package.

---

## Architectural Boundaries

The following boundaries are enforced to maintain separation of concerns:

**Core isolation.** The `judgment-core` package must not depend on React, MCP, LangGraph, any storage driver implementation, or any model provider. This ensures that the core domain logic can be used in any JavaScript or TypeScript environment without pulling in framework-specific dependencies.

**Storage abstraction.** The core package defines a storage interface as a set of TypeScript interfaces. Concrete storage implementations (`judgment-storage-memory`, `judgment-storage-sqlite`) implement these interfaces. Application code interacts with storage only through the interface, never through concrete implementations directly.

**Protocol isolation.** The MCP server package (`judgment-mcp`) wraps the SDK and core functionality behind MCP tool and resource definitions. Changes to the MCP protocol version or SDK do not affect the core domain logic.

**Framework isolation.** The LangGraph adapter wraps core functionality behind LangGraph node and edge definitions. Changes to the LangGraph API do not affect the core domain logic.

**UI isolation.** The UI component library depends on core types for data shapes but does not contain business logic. All state transitions, validation, and policy evaluation happen in the core package. The UI renders data and dispatches user actions through the SDK.

---

## Storage Abstraction

The storage layer is designed around two complementary structures: an immutable event log and a derived current-state projection.

### Immutable Event Log

Every action taken on a Judgment Point produces an event. Events are appended to the log and are never modified or deleted after creation. The event log is the system of record. If the current-state projection is lost or corrupted, it can be reconstructed by replaying the event log from the beginning.

The event log stores instances of the `JudgmentEvent` schema. Each event carries:

- A unique event identifier
- The Judgment Point identifier it belongs to
- The project identifier
- The event type (one of 16 defined types)
- A timestamp
- The actor identifier and actor type (user, agent, system, or policy)
- An event-specific payload
- Optional metadata (correlation ID, session ID, tool name, policy ID, status before and after, notes)

### Current-State Projection

The current-state projection is a materialized view of each Judgment Point's current data, derived from the event log. It stores the complete `JudgmentPoint` record, including all fields defined in the schema: status, alternatives, materiality, authority, resolution, validity conditions, reopen conditions, revision history, and timestamps.

When a new event is appended, the projection is updated by applying the event's effects to the current state. For example, a `resolution-recorded` event updates the projection's `resolution` field, changes the `status` to `resolved`, and appends an entry to the `revisionHistory`.

### Storage Interface

The storage interface defines the following operations:

- **appendEvent(event)**: Append an event to the immutable log. Returns the persisted event.
- **getEvents(judgmentPointId)**: Retrieve all events for a Judgment Point, ordered by timestamp.
- **getEventsByProject(projectId)**: Retrieve all events for a project, ordered by timestamp.
- **getCurrentState(judgmentPointId)**: Retrieve the current-state projection for a Judgment Point.
- **listByProject(projectId, filters)**: List current-state projections for all Judgment Points in a project, with optional filters by status, category, or materiality score range.
- **getDependencies(judgmentPointId)**: Retrieve artifact references and dependency relationships for a Judgment Point.

Storage adapters implement this interface. The in-memory adapter stores data in JavaScript objects and is suitable for testing and short-lived processes. The SQLite adapter stores data in a local database file and is suitable for persistent single-user or development scenarios.

---

## Event Sourcing

The system uses event sourcing as its foundational persistence pattern. This design has several implications:

**Append-only writes.** All mutations to Judgment Point state are expressed as events. There are no direct updates to the current-state projection. This ensures a complete, tamper-evident history of every action.

**Projection rebuilding.** The current-state projection can be rebuilt from the event log at any time. This provides resilience against data corruption and supports schema migration: when the projection schema changes, the system can replay all events through the new projection logic.

**Temporal queries.** Because every state transition is recorded with a timestamp, it is possible to reconstruct the state of any Judgment Point at any point in its history. This supports audit, debugging, and historical analysis.

**Consistency.** Event ordering within a single Judgment Point is determined by timestamp. The system does not require global event ordering across Judgment Points or projects.

---

## Authorization Model

### Project Isolation

Every Judgment Point belongs to exactly one project, identified by its `projectId`. All operations are scoped to a project. A user or agent with access to one project cannot read or modify Judgment Points in another project through the same operation.

### Role-Based Authority

Authority to resolve a Judgment Point is governed by the `JudgmentAuthority` structure, which specifies a mode and an optional actor identifier. The authority mode determines the rules for who may resolve:

- **human**: Only the identified human user (or any human, if no specific actor is identified) may record the resolution.
- **collaborative**: A human and an agent work together. The human retains final authority.
- **delegated**: An agent may resolve, but only if the delegation policy's conditions are met (maximum materiality score, required confidence, excluded categories, prior human resolution requirement, and audit flag).
- **rule**: Resolution is determined by a predefined rule or external standard. No discretionary judgment is exercised.

### Policy-Based Escalation

Policies can override the default authority mode for Judgment Points matching specific conditions. For example, a policy might escalate all `assumption` category Judgment Points with materiality scores above 12 from `collaborative` to `human` authority.

---

## Pause and Resume

Agent workflows often involve long-running processes that span multiple sessions. The Judgment Points system supports pausing and resuming workflows across interruptions.

### Pause Mechanism

When a Judgment Point at the `pause` or `require-investigation` intervention level is encountered during agent execution, the system:

1. Records a `created` event (and possibly a `promoted` event) for the Judgment Point.
2. Persists the current workflow state, including the Judgment Point's identifier and the execution context.
3. Returns a structured response to the agent framework indicating that execution should halt until the Judgment Point is resolved.

### Resume Mechanism

When a previously paused Judgment Point is resolved, the system:

1. Records a `resolution-recorded` event.
2. Updates the current-state projection to `resolved` status.
3. Notifies the agent framework (through polling or subscription) that the Judgment Point has been resolved.
4. The agent framework resumes execution from the point where it was paused, using the persisted workflow state and the resolution data.

### State Preservation

Workflow state is preserved through the combination of the event log (which records all Judgment Point state) and the agent framework's own state management. For LangGraph integrations, the LangGraph checkpointer persists the graph state. For MCP integrations, the MCP session context preserves the interaction state.

---

## Extension Points

The system is designed with several extension points that allow customization without modifying core code.

### Custom Storage Adapters

Any storage backend can be used by implementing the storage interface defined in `judgment-core`. The interface requires implementing the operations listed in the Storage Interface section above. A PostgreSQL adapter, a cloud-native adapter, or a distributed event store adapter could be created by implementing these methods.

### Custom Detection Rules

Hard trigger rules are defined as deterministic functions that evaluate the workflow context and return a trigger result. Custom rules can be registered with the detection system to extend or replace the default set. Each rule receives the current agent action context and returns either a trigger (with a rule identifier and intervention level) or no match.

### Custom Policy Rules

Policy rules use the `PolicyRule` schema, which supports condition matching on materiality scores, dimension thresholds, hard triggers, categories, and free-form expressions. The expression field supports a domain-specific language for advanced condition matching. Custom policies can be created and registered at the project level.

### Model Provider Adapters

The system does not depend on any specific AI model provider. When model-assisted detection or analysis is used, it operates through a provider adapter interface that accepts a prompt and returns structured output. Adapters can be implemented for any model provider (OpenAI, Anthropic, local models, or any other provider) without changing the core detection or analysis logic.

---

## Technology Stack

| Component                  | Technology                | Version            |
| -------------------------- | ------------------------- | ------------------ |
| Runtime                    | Node.js                   | 22 LTS             |
| Package manager            | pnpm                      | >= 10.0.0          |
| Language                   | TypeScript                | 6.0.3 (strict)     |
| UI framework               | React                     | 19.x               |
| Build tool                 | Vite                      | 7.x                |
| HTTP server                | Fastify                   | 5.x                |
| Local database             | SQLite                    | Via better-sqlite3 |
| Unit and integration tests | Vitest                    | 4.x                |
| End-to-end tests           | Playwright                | To be added        |
| Schema format              | JSON Schema Draft 2020-12 | 2020-12            |
| MCP protocol               | Model Context Protocol    | 2026-07-28         |
| Linting                    | ESLint                    | 10.x               |
| Formatting                 | Prettier                  | 3.x                |
| License                    | Apache-2.0                | N/A                |

TypeScript is configured in strict mode across all packages. Each package has its own `tsconfig.json` that extends the shared `tsconfig.base.json` at the repository root. Build configurations (`tsconfig.build.json`) are separate from development configurations to support different output targets.

---

## Application Architecture

### Reference Demo (`apps/reference-demo`)

The reference demonstration is a Vite-based React application that provides an interactive environment for exploring Judgment Points. It uses the in-memory storage adapter and includes pre-loaded example data.

### Reference Server (`apps/reference-server`)

The reference server is a Fastify-based HTTP server that exposes the Judgment Points API over HTTP. It uses the SQLite storage adapter for persistent storage and provides REST endpoints for creating, querying, resolving, and managing Judgment Points.

### Documentation Site (`apps/documentation`)

The documentation site is a static site that hosts the project's prose documentation, API reference, and integration guides.

---

## Design Constraints

Several design constraints guide architectural decisions:

1. **No implicit state.** All Judgment Point state must be explicitly recorded as events. There is no hidden or ambient state that affects decision outcomes.

2. **No model dependency in core.** The core package must function without any AI model. Model-assisted features are optional enhancements, not requirements.

3. **No framework lock-in.** The system must be usable from any agent framework, not just LangGraph or MCP. The SDK provides a framework-agnostic interface.

4. **Deterministic by default.** Detection, policy evaluation, and lifecycle transitions are deterministic operations. Given the same inputs, they produce the same outputs. Model-assisted features are the only non-deterministic components, and they are always optional.

5. **Offline capable.** The core system must function without network access. The SQLite storage adapter, local detection rules, and local policy evaluation all work offline. Features that require external services (such as MCP transport over HTTP or model-assisted detection) are not available offline, but the core lifecycle and storage operations do not require network connectivity.
