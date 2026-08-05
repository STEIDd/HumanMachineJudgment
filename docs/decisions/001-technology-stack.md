# ADR-001: Technology Stack

**Status**: Accepted
**Date**: 2026-08-04
**Authors**: Courage Lahban

## Context

The Judgment Points reference implementation requires a technology stack that
supports a monorepo with multiple packages, a web-based reference interface,
a reference HTTP API server, and integration with external protocols (MCP,
LangGraph). The implementation must be accessible to scientists, engineers,
and open-source contributors.

## Decision

The project uses the following stack:

- **Runtime**: Node.js 22 LTS (current supported LTS release)
- **Package manager**: pnpm 10.x with workspace support
- **Language**: TypeScript in strict mode (TypeScript 6.0.3)
- **Frontend framework**: React 19.x
- **Build tool**: Vite 7.x for web applications
- **HTTP server**: Fastify 5.x for the reference API
- **Local persistence**: SQLite via a storage abstraction
- **Unit and integration testing**: Vitest 4.x
- **End-to-end testing**: Playwright (to be added in Phase 4)
- **Accessibility testing**: axe-core (to be integrated with Playwright)
- **Property-based testing**: fast-check (to be added in Phase 2)
- **Code formatting**: Prettier
- **Linting**: ESLint with typescript-eslint
- **Schema format**: JSON Schema Draft 2020-12
- **API specification**: OpenAPI 3.1 (to be created in Phase 2)
- **Release management**: Changesets (to be added when publishing begins)

## Rationale

TypeScript provides static typing that helps enforce the strict domain model
required by Judgment Points (lifecycle states, authority modes, materiality
dimensions). The monorepo structure with pnpm workspaces allows the core
domain logic to remain independent of framework-specific code while sharing
types and build configuration.

React was selected for the reference interface because it has broad adoption,
which lowers the barrier to contribution. Fastify was selected for the server
because it provides TypeScript-first support, schema-based validation, and
adequate performance for a reference implementation.

SQLite provides durable local persistence without requiring an external
database service. The storage abstraction allows other adapters (PostgreSQL,
cloud storage) to be added later without changing the core domain logic.

## Consequences

- Contributors must have Node.js 22 and pnpm 10 installed.
- The project does not support Node.js versions below 22.
- Python-based tools (such as the skill validation script) require a
  separate Python installation but are not part of the core build.
- Browser-based testing requires Playwright browsers to be installed.

## Alternatives Considered

- **Python-first**: Would align with many scientific computing workflows
  but would complicate the MCP integration (MCP TypeScript SDK is more
  mature) and the React-based reference interface.
- **Deno or Bun**: Would simplify some tooling but have less ecosystem
  maturity for the specific packages needed (Fastify, MCP SDK).
- **Next.js for the demo**: Would add unnecessary framework complexity
  for what is primarily a single-page reference demonstration.
