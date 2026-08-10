# Roadmap

This document outlines planned future work for Human-Machine Judgment. It provides a general direction for the project, not a commitment to specific timelines or deliverables.

> **Disclaimer.** This roadmap reflects current plans and priorities. Timelines are not committed. Items may be reordered, combined, or revised as the project evolves and as we learn from implementation and feedback.

## Current State

The project provides a complete reference implementation of Judgment Points, including:

- Core domain logic with state machine, materiality scoring, policy engine, and event sourcing (Python)
- Developer SDK, in-memory and SQLite storage adapters
- MCP server (protocol 2026-07-28) and LangGraph adapter
- FastAPI reference server with 19 HTTP endpoints
- 18 React UI components targeting WCAG 2.2 Level AA
- Reference web application with thermal model scientific example
- Evaluation harness with 12 fixture-based test scenarios
- Agent Skill definition for technical judgment review
- JSON Schema definitions (Draft 2020-12)
- CI pipeline with TypeScript, Python, and evaluation harness jobs

## Planned Work

### Empirical Validation

- Conduct structured user studies comparing judgment-assisted workflows to approval-only and unassisted workflows.
- Measure detection quality (precision, recall), interruption burden, and decision record completeness.
- Validate and calibrate materiality scoring thresholds using real workflow data.

### Storage and Scalability

- Add PostgreSQL storage adapter for production deployments.
- Implement cursor-based pagination for large event histories.
- Add schema migration tooling for storage adapter upgrades.

### Integration Improvements

- Add HTTP/SSE transport support for the MCP server.
- Test MCP integration with the MCP Inspector.
- Publish the Agent Skill to skill registries.
- Add batch operations for proposing and resolving multiple judgment points.

### Security and Authentication

- Implement OAuth 2.1 authentication for the reference server.
- Add role-based access control for judgment resolution authority.
- Implement rate limiting for API endpoints.

### Developer Experience

- Publish Python packages to PyPI.
- Publish TypeScript packages to npm.
- Create an OpenAPI specification file for the reference server.
- Add a CLI tool for common judgment point operations.

### Documentation

- Add interactive API documentation with example requests.
- Create integration tutorials for common agent frameworks.
- Publish evaluation results as they become available.
