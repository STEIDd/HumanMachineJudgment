# Architecture

This document describes the architecture of the Human-Machine Judgment system, covering the monorepo structure, package dependency graph, boundaries, storage model, event sourcing approach, authorization, workflow pause and resume, extension points, and the technology stack.

---

## System Overview

Human-Machine Judgment is organized as a monorepo containing a Python backend, publishable TypeScript frontend packages, runnable applications, standalone schemas, agent skill definitions, and evaluation tooling. The monorepo uses pnpm workspaces for TypeScript packages and uv workspaces for Python packages.

The top-level directories serve these purposes:

| Directory   | Purpose                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/`  | Python backend containing core runtime, SDK, storage adapters, and reference server                                                         |
| `packages/` | TypeScript frontend libraries including JSON schemas and UI components                                                                      |
| `apps/`     | Runnable applications including the reference demonstration and documentation site                                                          |
| `schemas/`  | Standalone JSON Schema files defining the canonical data shapes for Judgment Points, events, policies, resolutions, and artifact references |
| `skills/`   | Agent Skill definitions that teach agents how to interact with the Judgment Points system                                                   |
| `evals/`    | Evaluation harness, test fixtures, and evaluation scenarios                                                                                 |
| `examples/` | Example workflows and configurations demonstrating practical usage                                                                          |
| `docs/`     | Prose documentation source, including architecture decision records                                                                         |
| `scripts/`  | Build and maintenance scripts, including type generation from canonical JSON Schemas                                                        |

---

## Package Inventory

### Python Packages (backend/)

The `backend/` directory is a uv workspace containing the following Python packages:

| Package                   | Responsibility                                                                                                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `judgment_core`           | Core domain types, state machine, lifecycle guards, materiality scoring, hard-trigger evaluation, policy evaluation, authority evaluation, resolution validation, dependency invalidation, staleness detection, and event creation |
| `judgment_sdk`            | Developer SDK providing typed interfaces for creating, querying, resolving, and managing Judgment Points programmatically                                                                                                          |
| `judgment_storage_memory` | In-memory storage adapter implementing the storage interface defined by the core package                                                                                                                                           |
| `judgment_storage_sqlite` | SQLite storage adapter using SQLAlchemy for persistent single-user or development scenarios                                                                                                                                        |
| `judgment_mcp`            | Model Context Protocol server exposing Judgment Point operations as MCP tools and resources                                                                                                                                        |
| `judgment_langgraph`      | LangGraph adapter for integrating Judgment Points into LangGraph-based agent graphs                                                                                                                                                |
| `reference_server`        | FastAPI-based HTTP server exposing the Judgment Points API over HTTP with full lifecycle endpoints                                                                                                                                 |

### TypeScript Packages (packages/)

The `packages/` directory contains the remaining TypeScript libraries:

| Package            | Name                              | Responsibility                                                                                                            |
| ------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `judgment-schemas` | `@human-machine-judgment/schemas` | JSON Schema definitions, generated TypeScript types, schema validation utilities, and validation fixtures                 |
| `judgment-ui`      | `@human-machine-judgment/ui`      | React component library providing UI elements for rendering Judgment Points, markers, panels, cards, and comparison views |

### Applications (apps/)

| Application      | Name                                     | Responsibility                                                                                    |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `reference-demo` | `@human-machine-judgment/reference-demo` | Vite-based React application providing an interactive environment for exploring Judgment Points   |
| `documentation`  | `@human-machine-judgment/documentation`  | Static documentation site hosting specification, API reference, integration guides, and tutorials |

---

## Package Dependency Graph

Dependencies flow in a single direction. Packages at the bottom of the graph depend on packages above them, never the reverse.

### Python Dependencies

```
                judgment_core
                (Pydantic models, no external framework deps)
                     |
         +-----------+-----------+
         |                       |
  judgment_sdk            judgment_storage
  (depends on core)       (core + SQLAlchemy)
         |
  +------+------+
  |             |
judgment_mcp  judgment_langgraph
(core + sdk)  (core)
         |
  judgment_server
  (FastAPI + sdk + storage)
```

### TypeScript Dependencies

```
  judgment-schemas        judgment-ui
  (standalone)            (React components)
```

### Cross-Language Type Sharing

Types are kept in sync between Python and TypeScript through code generation from canonical JSON Schema definitions in the `schemas/` directory. The `scripts/generate_types.py` script generates both Python (Pydantic) models and TypeScript types from these schemas. The `scripts/check_type_drift.sh` script verifies that generated types are not stale in CI.

The dependency rules are:

1. `judgment_core` has zero external framework dependencies. It depends only on Pydantic for data modeling and validation.
2. `judgment-schemas` (TypeScript) contains the canonical JSON Schema definitions in the `schemas/` directory and generated TypeScript types. Generated Python types are in `judgment_core`.
3. `judgment_sdk` depends on `judgment_core` for domain types and lifecycle operations. It provides the primary programmatic interface for external consumers.
4. `judgment_storage` depends on `judgment_core` for the storage interface definition. It implements in-memory and SQLite adapters using SQLAlchemy without introducing any dependency from core back to storage.
5. `judgment_mcp` depends on `judgment_core` for domain logic and `judgment_sdk` for the client interface.
6. `judgment_langgraph` depends on `judgment_core` for domain types and lifecycle operations.
7. `judgment-ui` (TypeScript) depends on `judgment-schemas` for type definitions. It uses React for rendering.

---

## Architectural Boundaries

The following boundaries are enforced to maintain separation of concerns:

**Core isolation.** The `judgment_core` package must not depend on FastAPI, React, MCP, LangGraph, any storage driver implementation, or any model provider. This ensures that the core domain logic can be used in any Python environment without pulling in framework-specific dependencies.

**Storage abstraction.** The core package defines a storage interface using Python abstract base classes. Concrete storage implementations (in-memory, SQLite via SQLAlchemy) implement these interfaces. Application code interacts with storage only through the interface, never through concrete implementations directly.

**Protocol isolation.** The MCP server package (`judgment_mcp`) wraps the SDK and core functionality behind MCP tool and resource definitions. Changes to the MCP protocol version or SDK do not affect the core domain logic.

**Framework isolation.** The LangGraph adapter wraps core functionality behind LangGraph node and edge definitions. Changes to the LangGraph API do not affect the core domain logic.

**Language boundary.** Python handles all backend logic (core runtime, storage, API server, agent integrations). TypeScript handles all frontend concerns (React UI components, schema validation utilities). Types are shared via code generation from canonical JSON Schemas, not through direct cross-language imports.

**UI isolation.** The UI component library depends on schema types for data shapes but does not contain business logic. All state transitions, validation, and policy evaluation happen in the Python backend. The UI renders data and dispatches user actions through the HTTP API.

---

## Storage Abstraction

The storage layer is designed around two complementary structures: an immutable event log and a derived current-state projection.

### Immutable Event Log

Every action taken on a Judgment Point produces an event. Events are appended to the log and are never modified or deleted after creation. The event log is the system of record. If the current-state projection is lost or corrupted, it can be reconstructed by replaying the event log from the beginning.

The event log stores instances of the `JudgmentEvent` schema. Each event carries:

- A unique event identifier
- The Judgment Point identifier it belongs to
- The project identifier
- The event type (one of 15 defined types)
- A timestamp
- The actor identifier and actor type (user, agent, system, or policy)
- An event-specific payload
- Optional metadata (correlation ID, session ID, tool name, policy ID, status before and after, notes)

### Current-State Projection

The current-state projection is a materialized view of each Judgment Point's current data, derived from the event log. It stores the complete `JudgmentPoint` record, including all fields defined in the schema: status, alternatives, materiality, authority, resolution, validity conditions, reopen conditions, revision history, and timestamps.

When a new event is appended, the projection is updated by applying the event's effects to the current state. For example, a `resolution-recorded` event updates the projection's `resolution` field, changes the `status` to `resolved`, and appends an entry to the `revisionHistory`.

### Storage Interface

The storage interface (`JudgmentStorage`) defines the following operations:

- **append_event(event)**: Append an event to the immutable log.
- **get_events(judgment_point_id, filters?)**: Retrieve all events for a Judgment Point, with optional filters by event type, actor, or time range.
- **get_events_by_project(project_id, filters?, offset?, limit?)**: Retrieve paginated events for a project, ordered by timestamp.
- **get_judgment_point(id)**: Retrieve the current-state projection for a Judgment Point, or None if not found.
- **get_judgment_points(project_id, filters?, offset?, limit?)**: List current-state projections for all Judgment Points in a project, with optional filters by status, category, materiality score range, or creation date range.
- **save_judgment_point(point)**: Persist a current-state projection (used after applying an event).
- **save_policy(policy)**: Create a new policy.
- **get_policy(id)**: Retrieve a single policy by ID.
- **get_policies(project_id)**: List all policies for a project.
- **update_policy(policy)**: Update an existing policy.
- **delete_policy(id)**: Delete a policy by ID.

Storage adapters implement this interface. The in-memory adapter stores data in Python dictionaries and is suitable for testing and short-lived processes. The SQLite adapter uses SQLAlchemy for persistent single-user or development scenarios.

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

Any storage backend can be used by implementing the storage interface defined in `judgment_core`. The interface requires implementing the operations listed in the Storage Interface section above. A PostgreSQL adapter, a cloud-native adapter, or a distributed event store adapter could be created by implementing the abstract base class methods.

### Custom Detection Rules

Hard trigger rules are defined as deterministic functions that evaluate the workflow context and return a trigger result. Custom rules can be registered with the detection system to extend or replace the default set. Each rule receives the current agent action context and returns either a trigger (with a rule identifier and intervention level) or no match.

### Custom Policy Rules

Policy rules use the `PolicyRule` schema, which supports condition matching on materiality scores, dimension thresholds, hard triggers, categories, and free-form expressions. The expression field supports a domain-specific language for advanced condition matching. Custom policies can be created and registered at the project level.

### Model Provider Adapters

The system does not depend on any specific AI model provider. When model-assisted detection or analysis is used, it operates through a provider adapter interface that accepts a prompt and returns structured output. Adapters can be implemented for any model provider (OpenAI, Anthropic, local models, or any other provider) without changing the core detection or analysis logic.

---

## Technology Stack

### Backend (Python)

| Component                  | Technology  | Version        |
| -------------------------- | ----------- | -------------- |
| Language                   | Python      | >= 3.12        |
| Package manager            | uv          | latest         |
| Web framework              | FastAPI     | 0.x            |
| Data modeling / validation | Pydantic    | 2.x            |
| Database ORM               | SQLAlchemy  | 2.x            |
| Local database             | SQLite      | Via SQLAlchemy |
| Unit and integration tests | pytest      | 8.x            |
| Linting                    | ruff        | latest         |
| Type checking              | mypy        | latest         |
| Formatting                 | ruff format | latest         |

### Frontend (TypeScript)

| Component                  | Technology | Version        |
| -------------------------- | ---------- | -------------- |
| Runtime                    | Node.js    | 22 LTS         |
| Package manager            | pnpm       | >= 10.0.0      |
| Language                   | TypeScript | 6.0.3 (strict) |
| UI framework               | React      | 19.x           |
| Build tool                 | Vite       | 7.x            |
| Unit and integration tests | Vitest     | 4.x            |
| End-to-end tests           | Playwright | To be added    |
| Linting                    | ESLint     | 10.x           |
| Formatting                 | Prettier   | 3.x            |

### Shared

| Component     | Technology                | Version    |
| ------------- | ------------------------- | ---------- |
| Schema format | JSON Schema Draft 2020-12 | 2020-12    |
| MCP protocol  | Model Context Protocol    | 2026-07-28 |
| License       | Apache-2.0                | N/A        |

TypeScript is configured in strict mode across all frontend packages. Each package has its own `tsconfig.json` that extends the shared `tsconfig.base.json` at the repository root. Python uses mypy in strict mode for type checking across all backend packages.

---

## Application Architecture

### Reference Demo (`apps/reference-demo`)

The reference demonstration is a Vite-based React application that provides an interactive environment for exploring Judgment Points. It communicates with the Python backend server via HTTP API calls.

### Reference Server (`backend/judgment_server`)

The reference server is a FastAPI-based HTTP server that exposes the Judgment Points API over HTTP. It supports both in-memory and SQLite storage adapters and provides REST endpoints for creating, querying, resolving, and managing Judgment Points.

### Documentation Site (`apps/documentation`)

The documentation site is a static site that hosts the project's prose documentation, API reference, and integration guides.

---

## UI Component Library

The `judgment-ui` package provides 18 React components for rendering and interacting with Judgment Points. Components are organized in a flat directory structure, each in its own folder with a `.tsx` implementation, `.module.css` stylesheet, and `.test.tsx` test file.

### Components

| Component                | Purpose                                                             |
| ------------------------ | ------------------------------------------------------------------- |
| `StatusBadge`            | Displays the current status of a judgment point                     |
| `CategoryBadge`          | Displays the judgment category                                      |
| `InterventionLevelBadge` | Displays the intervention level (trace, disclose, pause, require)   |
| `MaterialityGauge`       | Visual gauge showing the materiality score (0--18)                  |
| `StaleIndicator`         | Indicates when a resolved judgment point has become stale           |
| `AlternativeCard`        | Renders a single alternative with label, description, and tradeoffs |
| `ComparisonView`         | Side-by-side grid comparison of alternatives                        |
| `JudgmentCard`           | Summary card for a judgment point in a list                         |
| `JudgmentPanel`          | Detailed panel showing full judgment point data and actions         |
| `JudgmentMarker`         | Compact marker for embedding in document or code views              |
| `JudgmentTimeline`       | Chronological timeline of events for a judgment point               |
| `DependencyGraph`        | SVG-based visualization of judgment point dependency relationships  |
| `ResolutionForm`         | Form for recording a resolution (alternative selection, rationale)  |
| `DelegationDialog`       | Modal dialog for delegating a judgment point                        |
| `ReopenDialog`           | Modal dialog for reopening a resolved or dismissed judgment point   |
| `PolicyRuleEditor`       | Editor for creating and modifying policy rules                      |
| `ProjectJudgmentsView`   | Project-level view listing all judgment points with filters         |
| `ActivityFeed`           | Chronological feed of recent judgment point events                  |

### Styling

All components use CSS Modules for styling. This provides:

- Zero-runtime CSS (styles extracted at build time)
- Scoped class names (no global style conflicts)
- Standard CSS syntax (no learning curve for CSS-in-JS APIs)
- Compatibility with the `prefers-reduced-motion` media query

### Accessibility

All components follow WCAG 2.2 Level AA guidelines. See the [Accessibility Audit](./accessibility-audit.md) for details.

---

## Reference Web Application

The reference demo (`apps/reference-demo`) is a Vite-based React single-page application that provides an interactive environment for exploring the Judgment Points system.

### Routing

The application uses hash-based routing (`/#/path`) for navigation. This approach requires no server-side routing configuration and works with any static file server.

### State Management

Application state is managed through React Context. There is no external state management library. This keeps the bundle small and the data flow explicit.

### Pages

- **Projects list**: Overview of all projects with judgment point counts.
- **Project detail**: List of judgment points for a project with status and category filters.
- **Judgment point detail**: Full detail view with lifecycle actions, event timeline, and linked artifacts.
- **Policy management**: Create, view, and edit policies for a project.
- **Component gallery**: Showcase of all UI components with interactive examples.
- **Thermal model demo**: Scientific example using genuine heat transfer calculations.

---

## Thermal Model Scientific Example

The reference demo includes a thermal analysis workflow that demonstrates judgment points in a realistic scientific context. The thermal model performs genuine heat transfer calculations, not mock data:

- **Fourier's law** for heat conduction through materials
- **Thermal resistance** calculations for composite walls
- **Newton's law of cooling** for convective boundary conditions
- **Steady-state temperature distribution** across a thermal assembly

Judgment points arise naturally from engineering decisions: mesh density selection, boundary condition specification, material property sources, and convergence criteria.

---

## Evaluation Harness

The `evals/` directory contains a Python-based evaluation framework with 12 fixture-based tests. Each fixture is a JSON file describing a scenario:

| Fixture Category        | Count | Purpose                                               |
| ----------------------- | ----- | ----------------------------------------------------- |
| Valid candidates        | 2     | Verify correct candidate detection                    |
| Invalid candidates      | 1     | Verify correct rejection of non-judgment-worthy items |
| Missed candidates       | 1     | Detect false negatives in candidate identification    |
| Skill activation        | 3     | Test hard trigger and soft detection scenarios        |
| Malformed agent output  | 2     | Verify graceful handling of invalid agent responses   |
| Unauthorized resolution | 2     | Verify authority enforcement                          |
| Restart/resume          | 1     | Test workflow pause and resume                        |

The harness loads fixtures, validates them against the canonical JSON schemas, and asserts expected outcomes.

---

## Testing Stack

| Layer           | Tool       | Scope                                            |
| --------------- | ---------- | ------------------------------------------------ |
| Python unit     | pytest     | Core domain logic, storage adapters, SDK, server |
| TypeScript unit | Vitest     | UI components, schema validation                 |
| End-to-end      | Playwright | Browser-based interaction testing                |
| Accessibility   | axe-core   | WCAG 2.2 Level AA compliance via Playwright      |
| Evaluation      | pytest     | Fixture-based scenario evaluation                |

---

## Design Constraints

Several design constraints guide architectural decisions:

1. **No implicit state.** All Judgment Point state must be explicitly recorded as events. There is no hidden or ambient state that affects decision outcomes.

2. **No model dependency in core.** The core package must function without any AI model. Model-assisted features are optional enhancements, not requirements.

3. **No framework lock-in.** The system must be usable from any agent framework, not just LangGraph or MCP. The SDK provides a framework-agnostic interface.

4. **Deterministic by default.** Detection, policy evaluation, and lifecycle transitions are deterministic operations. Given the same inputs, they produce the same outputs. Model-assisted features are the only non-deterministic components, and they are always optional.

5. **Offline capable.** The core system must function without network access. The SQLite storage adapter, local detection rules, and local policy evaluation all work offline. Features that require external services (such as MCP transport over HTTP or model-assisted detection) are not available offline, but the core lifecycle and storage operations do not require network connectivity.
