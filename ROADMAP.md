# Roadmap

This document outlines the planned development phases for Human-Machine Judgment. It provides a general direction for the project, not a commitment to specific timelines or deliverables.

> **Disclaimer.** This roadmap reflects current plans and priorities. Timelines are not committed. Phases may be reordered, combined, or revised as the project evolves and as we learn from implementation and feedback. Specific items within each phase may be added, removed, or moved between phases.

## Phase 1: Research, Specification, and Repository Foundation

**Status: Complete**

This phase establishes the project's conceptual foundation and repository infrastructure.

- Define the judgment point specification, including core concepts, categories, and evaluation criteria.
- Set up the monorepo structure with pnpm workspaces.
- Create initial JSON Schema definitions for judgment point records.
- Establish project governance, contributing guidelines, and code of conduct.
- Develop architecture decision records for foundational choices.
- Set up CI/CD pipeline with formatting, linting, type checking, and test automation.
- Produce initial documentation covering project scope, concepts, and terminology.
- Build evaluation framework scaffolding for comparing judgment approaches.

## Phase 2: Core Runtime, Schemas, Storage, and Evaluation Harness

**Status: Complete**

> **Note:** The backend stack was migrated from TypeScript (Node.js, Fastify) to Python (FastAPI, Pydantic, SQLAlchemy). The core runtime, SDK, storage adapters, and reference server are now implemented in Python under the `backend/` directory. TypeScript is retained for frontend packages (`judgment-schemas`, `judgment-ui`) and apps (`reference-demo`, `documentation`).

This phase delivers the core libraries and storage layer that other components depend on.

- ~~Implement the core runtime (`judgment-core`) for creating, resolving, and querying judgment points.~~
- ~~Finalize and validate JSON Schema definitions (`judgment-schemas`) with comprehensive test coverage.~~
- ~~Build the developer SDK (`judgment-sdk`) with typed interfaces for working with judgment points.~~
- ~~Implement in-memory storage adapter (`judgment-storage-memory`).~~
- ~~Build the reference HTTP API server (`reference-server`) with full lifecycle endpoints.~~
- ~~Implement SQLite storage adapter (`judgment-storage-sqlite`).~~
- ~~Complete the evaluation harness with support for trigger detection, interruption burden measurement, and workflow comparison.~~
- ~~Create evaluation fixtures covering common agent workflow patterns.~~
- ~~Establish schema versioning and migration tooling.~~

## Phase 3: Agent Integration, MCP Server, Agent Skill, and LangGraph Adapter

**Status: Complete**

This phase provides the integration layer for connecting judgment points to agent frameworks and tools.

- ~~Implement trigger detection system for identifying judgment-worthy moments in agent workflows.~~
- ~~Implement the Model Context Protocol server (`judgment-mcp`) exposing judgment point operations as MCP tools and resources.~~
- ~~Develop Agent Skill definitions (`skills/`) for use in agent workflows.~~
- ~~Build the LangGraph adapter (`judgment-langgraph`) for integrating judgment points into LangGraph-based agent graphs.~~
- ~~Define standard patterns for agent-initiated judgment requests and resolution flows.~~
- ~~Test integration scenarios across multiple agent frameworks.~~
- ~~Document integration guides for each supported framework.~~

## Phase 4: Reference Interface, Reference Server, Reference Workflow, and Documentation Site

**Status: Complete**

This phase delivers user-facing reference applications and comprehensive documentation.

- ~~Build the reference demonstration application (`reference-demo`) showing judgment points in a realistic workflow.~~
- ~~Complete the reference server (`reference-server`) with a full API surface (19 HTTP endpoints).~~
- ~~Develop the UI component library (`judgment-ui`) with 18 accessible, tested React components for judgment point interaction.~~
- ~~Build a complete thermal model scientific example with genuine heat transfer calculations.~~
- ~~Implement Python evaluation harness with 12 fixture-based tests.~~
- ~~Add CORS configuration for frontend-backend communication.~~
- ~~Create API reference documentation, getting started guide, deployment guide, security review, performance review, and accessibility audit.~~
- ~~Conduct accessibility audit against WCAG 2.2 Level AA and address findings.~~
- ~~Set up CI pipeline with TypeScript and Python jobs, evaluation harness, and build verification.~~
