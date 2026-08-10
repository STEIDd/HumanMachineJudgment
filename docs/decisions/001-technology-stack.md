# ADR-001: Technology Stack

**Status**: Amended
**Date**: 2026-08-04
**Amended**: 2026-08-06
**Authors**: Courage Lahban

## Context

The Judgment Points reference implementation requires a technology stack that
supports a monorepo with multiple packages, a web-based reference interface,
a reference HTTP API server, and integration with external protocols (MCP,
LangGraph). The implementation must be accessible to scientists, engineers,
and open-source contributors.

## Decision

The project uses a split-stack approach:

### Frontend (TypeScript)

- **Runtime**: Node.js 22 LTS (current supported LTS release)
- **Package manager**: pnpm 10.x with workspace support
- **Language**: TypeScript in strict mode
- **Frontend framework**: React 19.x
- **Build tool**: Vite 7.x for web applications
- **UI component library build**: Vite library mode
- **Unit and integration testing**: Vitest 4.x
- **End-to-end testing**: Playwright
- **Accessibility testing**: axe-core (integrated with Playwright)
- **Code formatting**: Prettier
- **Linting**: ESLint with typescript-eslint
- **Schema format**: JSON Schema Draft 2020-12

### Backend (Python)

- **Runtime**: Python >= 3.12
- **Package manager**: uv with workspace support
- **HTTP server**: FastAPI with uvicorn
- **ORM**: SQLAlchemy >= 2.0 with aiosqlite
- **Validation**: Pydantic v2
- **MCP integration**: MCP Python SDK (mcp >= 1.0)
- **Agent framework**: LangGraph (langgraph >= 0.4)
- **Testing**: pytest
- **Linting**: ruff
- **Type checking**: mypy

## Amendment

The original decision proposed a TypeScript-only stack with Fastify for the
backend. During development, the backend was migrated to Python with FastAPI.
This change was motivated by:

- Python's stronger ecosystem for scientific computing workflows, which
  aligns with the project's target audience.
- The MCP Python SDK reaching maturity, removing the TypeScript advantage
  for MCP integration.
- LangGraph's Python SDK being more widely adopted than LangGraph.js.
- Pydantic providing equivalent or superior runtime validation to
  TypeScript schema validation for the backend.

The frontend remains TypeScript with React, and JSON schemas are shared
across both stacks.

## Rationale

The split-stack approach preserves TypeScript's strengths for UI development
(static typing, component model, build tooling) while using Python's
strengths for domain logic, storage, and agent framework integration.

The monorepo structure uses pnpm workspaces for TypeScript packages and uv
workspaces for Python packages. JSON Schema Draft 2020-12 provides the
shared contract between the two stacks.

## Consequences

- Contributors must have Node.js 22, pnpm 10, Python 3.12+, and uv installed.
- The project does not support Node.js versions below 22.
- The project does not support Python versions below 3.12.
- Browser-based testing requires Playwright browsers to be installed.

## Alternatives Considered

- **TypeScript-only (original plan)**: Would simplify the build but would
  require maintaining TypeScript versions of MCP and LangGraph integrations
  with less mature SDKs.
- **Python-only**: Would simplify the backend but would require a different
  approach for the reference UI (e.g., Jinja templates, htmx).
- **Deno or Bun**: Would simplify some tooling but have less ecosystem
  maturity for the specific packages needed.
- **Next.js for the demo**: Would add unnecessary framework complexity
  for what is primarily a single-page reference demonstration.
