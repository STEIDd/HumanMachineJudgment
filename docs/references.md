# References

This document lists the official primary sources referenced throughout the Human-Machine Judgment project documentation, schemas, and implementation. Each entry provides the source title, version or edition, publisher, and the canonical URL for accessing the source.

---

## Protocol Specifications

### Model Context Protocol (MCP) Specification

- **Title:** Model Context Protocol Specification
- **Version:** 2026-07-28
- **Publisher:** Anthropic
- **URL:** https://spec.modelcontextprotocol.io/
- **Relevance:** The `judgment-mcp` package implements an MCP server conforming to this specification. The server exposes Judgment Point operations as MCP tools and resources, and uses the MRTR (input-required) mechanism for server-initiated user interaction. Sampling, which was available in earlier protocol versions, is deprecated as of this version.

### Model Context Protocol Python SDK

- **Title:** MCP Python SDK
- **Version:** >= 1.0
- **Publisher:** Model Context Protocol project
- **Package:** `mcp`
- **URL:** https://github.com/modelcontextprotocol/python-sdk
- **Relevance:** The `judgment_mcp` Python package depends on the MCP Python SDK for implementing the MCP server. The SDK provides the server framework, tool and resource registration, and the MRTR (input-required) mechanism used for server-initiated user interaction.

---

## Agent Frameworks

### Agent Skills Specification

- **Title:** Agent Skills Specification
- **Published:** December 2025
- **Publisher:** agentskills.io
- **URL:** https://agentskills.io/specification
- **Relevance:** The Judgment Points Agent Skill (in `skills/technical-judgment-review/`) is built on this specification. It uses the three-tier progressive loading model and follows the skill definition format described in the specification.

### LangGraph Documentation (Python)

- **Title:** LangGraph Documentation
- **Version:** Python >= 0.4
- **Publisher:** LangChain, Inc.
- **URL:** https://langchain-ai.github.io/langgraph/
- **Relevance:** The `judgment_langgraph` Python package provides an adapter for integrating Judgment Points into LangGraph-based agent graphs. The adapter uses LangGraph's interrupt mechanism for pausing workflows at judgment points and integrates with the LangGraph checkpointer for state persistence across workflow interruptions.

---

## Schema and Data Standards

### JSON Schema Draft 2020-12

- **Title:** JSON Schema: A Media Type for Describing JSON Documents
- **Version:** Draft 2020-12
- **Publisher:** JSON Schema Organization
- **URL:** https://json-schema.org/draft/2020-12/json-schema-core
- **Relevance:** All schema files in the `schemas/` directory use JSON Schema Draft 2020-12 as their meta-schema. The `$schema` keyword in each schema file references this draft. The `judgment-schemas` package uses Draft 2020-12 features including `$defs` for local definitions and `$ref` for cross-schema references.

### OpenAPI 3.1

- **Title:** OpenAPI Specification
- **Version:** 3.1.1
- **Publisher:** OpenAPI Initiative
- **URL:** https://spec.openapis.org/oas/v3.1.1
- **Relevance:** The reference server (`backend/reference_server`) documents its HTTP API using OpenAPI 3.1. OpenAPI 3.1 aligns with JSON Schema Draft 2020-12, allowing the same schema definitions to be used in both the standalone schema files and the API specification.

---

## Accessibility

### Web Content Accessibility Guidelines (WCAG) 2.2

- **Title:** Web Content Accessibility Guidelines (WCAG) 2.2
- **Version:** 2.2
- **Publisher:** World Wide Web Consortium (W3C)
- **URL:** https://www.w3.org/TR/WCAG22/
- **Relevance:** The `judgment-ui` component library and all user-facing interfaces in the reference applications are designed to meet WCAG 2.2 Level AA conformance. The interface specification (see `docs/interface-specification.md`) references specific WCAG requirements for contrast ratios, keyboard accessibility, screen-reader support, and reduced-motion support.

---

## Security and Governance

### NIST AI Risk Management Framework

- **Title:** Artificial Intelligence Risk Management Framework (AI RMF 1.0)
- **Version:** 1.0
- **Publisher:** National Institute of Standards and Technology (NIST)
- **URL:** https://www.nist.gov/itl/ai-risk-management-framework
- **Relevance:** The Judgment Points system's design reflects principles described in the NIST AI RMF, including transparency of AI-assisted decision-making, accountability for decisions, and human oversight of consequential choices. The materiality scoring model, authority modes, and audit logging address risk management practices described in the framework. No formal conformance claim is made; the framework is referenced as a guiding source.

### OAuth 2.1

- **Title:** The OAuth 2.1 Authorization Framework
- **Version:** Draft (most recent IETF draft)
- **Publisher:** Internet Engineering Task Force (IETF)
- **URL:** https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-12
- **Relevance:** The reference server's authentication and authorization mechanisms are designed to support OAuth 2.1 flows. Project isolation and role-based authority in the Judgment Points system are compatible with OAuth 2.1 token-based access control. The current implementation uses a simplified authentication layer for development; production deployments should integrate with an OAuth 2.1 provider.

---

## Web Frameworks and Libraries

### FastAPI Documentation

- **Title:** FastAPI Documentation
- **Version:** >= 0.115
- **Publisher:** Sebastián Ramírez
- **URL:** https://fastapi.tiangolo.com/
- **Relevance:** The reference server (`backend/reference_server`) is built on FastAPI. FastAPI provides the HTTP server framework, request validation via Pydantic, automatic OpenAPI generation, and dependency injection used by the server.

### React Documentation

- **Title:** React Documentation
- **Version:** React 19.x
- **Publisher:** Meta Platforms, Inc.
- **URL:** https://react.dev/
- **Relevance:** The `judgment-ui` component library and the review console (`apps/review-console`) are built with React. React provides the component model, state management, and rendering pipeline for the user interface.

---

## Database

### SQLite Documentation

- **Title:** SQLite Documentation
- **Publisher:** SQLite Consortium
- **URL:** https://www.sqlite.org/docs.html
- **Relevance:** The `judgment_storage_sqlite` Python package uses SQLite as its storage backend. The storage adapter uses SQLite through SQLAlchemy ORM with the aiosqlite async driver. SQLite provides the append-only event storage and current-state projection tables used by the Judgment Points system.

---

## Testing

### Vitest Documentation

- **Title:** Vitest Documentation
- **Version:** Current (v4.x)
- **Publisher:** Vitest project
- **URL:** https://vitest.dev/
- **Relevance:** All unit and integration tests in the project use Vitest as the test runner and assertion library. The `vitest.workspace.ts` file at the repository root configures the workspace-wide test settings. Each package has its own `vitest.config.ts` for package-specific test configuration.

### Playwright Documentation

- **Title:** Playwright Documentation
- **Version:** Current
- **Publisher:** Microsoft
- **URL:** https://playwright.dev/
- **Relevance:** End-to-end tests for the reference demonstration application and the reference server use Playwright for browser automation, accessibility checking (via axe-core integration), and cross-browser testing.

---

## Build and Development Tools

### TypeScript Documentation

- **Title:** TypeScript Documentation
- **Version:** 6.0.3
- **Publisher:** Microsoft
- **URL:** https://www.typescriptlang.org/docs/
- **Relevance:** The frontend packages and UI components are written in TypeScript with strict mode enabled. The `tsconfig.base.json` at the repository root defines shared compiler options, and each TypeScript package extends this base configuration.

### pnpm Documentation

- **Title:** pnpm Documentation
- **Version:** 10.x
- **Publisher:** pnpm project
- **URL:** https://pnpm.io/
- **Relevance:** The project uses pnpm as its package manager and workspace orchestrator. The `pnpm-workspace.yaml` file defines the workspace roots, and `pnpm-lock.yaml` locks all dependency versions.

### Vite Documentation

- **Title:** Vite Documentation
- **Version:** 7.x
- **Publisher:** Vite project
- **URL:** https://vite.dev/
- **Relevance:** The review console (`apps/review-console`) and the documentation site (`apps/documentation`) use Vite as their build tool and development server.

### ESLint Documentation

- **Title:** ESLint Documentation
- **Version:** Current (v10.x)
- **Publisher:** OpenJS Foundation
- **URL:** https://eslint.org/docs/latest/
- **Relevance:** The project uses ESLint for static analysis and code quality checks. The `eslint.config.js` file at the repository root defines the linting rules applied across all packages.

### Prettier Documentation

- **Title:** Prettier Documentation
- **Version:** Current (v3.x)
- **Publisher:** Prettier project
- **URL:** https://prettier.io/docs/
- **Relevance:** The project uses Prettier for automatic code formatting. All code is formatted consistently using Prettier's default configuration.

---

## Citation Guidance

When citing this project or its dependencies in academic or professional work, use the citation information provided in the `CITATION.cff` file at the repository root. For citing the primary sources listed above, follow the citation guidance provided by each source's publisher.

All URLs in this document were verified at the time of writing. URLs may change over time; if a link is broken, search for the source by its title and publisher.
