# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

No unreleased changes.

## [0.1.0] - 2026-08-08

### Added

- Core domain types, state machine (8 states, 12 transitions), materiality scoring, hard-trigger evaluation, policy engine, authority and guard functions, event creation (15 event types), event sourcing projection, dependency graph, and staleness detection in `judgment_core` (Python).
- Storage interface (`JudgmentStorage`) with in-memory and SQLite implementations.
- Developer SDK (`JudgmentClient`) with full lifecycle, query, alternative, artifact, and policy operations in `judgment_sdk`.
- Reference HTTP API server with FastAPI in `reference_server`, providing judgment point lifecycle, policy, event, and artifact endpoints under `/api/v1/`.
- MCP server (`judgment_mcp`) exposing judgment point operations as MCP tools and resources, targeting protocol version 2026-07-28.
- LangGraph adapter (`judgment_langgraph`) with interrupt-based pause/resume for judgment points.
- Error handler mapping domain errors to HTTP status codes (404, 400, 403, 409, 422).
- Unit tests for state machine, materiality, hard triggers, policy engine, authority guards, events, projection, staleness, dependency graph, storage adapters, SDK client, and server routes (496 Python tests).
- JSON Schema definitions for judgment point records (JSON Schema Draft 2020-12).
- UI component library with 18 React components: StatusBadge, CategoryBadge, InterventionLevelBadge, MaterialityGauge, StaleIndicator, AlternativeCard, ComparisonView, JudgmentCard, JudgmentPanel, JudgmentMarker, JudgmentTimeline, DependencyGraph, ResolutionForm, DelegationDialog, ReopenDialog, PolicyRuleEditor, ProjectJudgmentsView, ActivityFeed.
- Reference web application with project management, judgment lifecycle walkthrough, policy management, and component gallery.
- Complete thermal model workflow example with genuine heat transfer calculations (Fourier's law, thermal resistance, Newton's law of cooling).
- Python evaluation harness with 12 fixture-based tests covering candidate detection, skill activation, malformed output handling, unauthorized resolution, and restart/resume scenarios.
- CORS configuration for frontend-backend communication.
- API reference documentation covering all 19 HTTP endpoints.
- Getting started guide with prerequisites, installation, and workflow walkthrough.
- Deployment documentation with Docker example, Nginx configuration, and production considerations.
- Security review against OWASP Top 10.
- Performance review documenting bundle size, runtime performance, and test execution characteristics.
- Accessibility audit targeting WCAG 2.2 Level AA compliance.
- CI pipeline jobs for TypeScript, Python, evaluation harness, and build verification.
- Monorepo structure with pnpm workspaces (TypeScript) and uv workspaces (Python).
- Agent Skill definition for technical judgment review.
- Evaluation framework with fixtures, interruption burden, trigger detection, and workflow comparison scenarios.
- Architecture decision records in `docs/decisions/`.
- Project governance model, code of conduct, security policy, contributing guidelines, and trademark guidelines.
- GitHub issue templates for bug reports, feature requests, and conceptual feedback.
- GitHub pull request template and CODEOWNERS configuration.
- Citation metadata (`CITATION.cff`).
