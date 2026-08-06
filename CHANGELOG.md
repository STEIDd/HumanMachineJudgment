# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Core domain types, state machine (8 states, 12 transitions), materiality scoring, hard-trigger evaluation, policy engine, authority and guard functions, event creation (15 event types), event sourcing projection, dependency graph, and staleness detection in `judgment-core`.
- Storage interface (`JudgmentStorage`) with in-memory implementation in `judgment-storage-memory`.
- Developer SDK (`JudgmentClient`) with full lifecycle, query, alternative, artifact, and policy operations in `judgment-sdk`.
- Reference HTTP API server with Fastify in `reference-server`, providing judgment point lifecycle, policy, event, and artifact endpoints under `/api/v1/`.
- Error handler mapping domain errors to HTTP status codes (404, 400, 403, 409, 422).
- Unit tests for state machine, materiality, hard triggers, policy engine, authority guards, events, projection, staleness, dependency graph, memory storage, SDK client, and server routes (200+ tests).
- Monorepo structure with pnpm workspaces for packages and applications.
- Initial JSON Schema definitions for judgment point records.
- Project governance model (`GOVERNANCE.md`).
- Code of conduct based on the Contributor Covenant v2.1 (`CODE_OF_CONDUCT.md`).
- Security policy with private vulnerability reporting (`SECURITY.md`).
- Maintainers listing (`MAINTAINERS.md`).
- Trademark usage guidelines (`TRADEMARKS.md`).
- Citation metadata (`CITATION.cff`).
- Contributing guidelines (`CONTRIBUTING.md`).
- Project roadmap (`ROADMAP.md`).
- Package scaffolding for `judgment-core`, `judgment-schemas`, `judgment-sdk`, `judgment-mcp`, `judgment-langgraph`, `judgment-storage-memory`, `judgment-storage-sqlite`, and `judgment-ui`.
- Application scaffolding for `reference-demo`, `reference-server`, and `documentation`.
- Agent Skill definition for technical judgment review.
- Evaluation framework scaffolding with fixtures, interruption burden, trigger detection, and workflow comparison directories.
- Architecture decision records in `docs/decisions/`.
- Root-level development scripts for build, test, lint, format, typecheck, and validate.
- GitHub issue templates for bug reports, feature requests, and conceptual feedback.
- GitHub pull request template.
- CODEOWNERS configuration.
