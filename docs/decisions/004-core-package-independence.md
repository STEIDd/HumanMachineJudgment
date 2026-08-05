# ADR-004: Core Package Independence

**Status**: Accepted
**Date**: 2026-08-04
**Authors**: Courage Lahban

## Context

The judgment-core package contains the domain types, state machine, lifecycle
guards, materiality scoring, policy evaluation, and event creation logic.
Multiple integration packages (MCP, LangGraph, UI, storage adapters) depend
on these core types and logic.

## Decision

The judgment-core package must not depend on React, MCP, LangGraph, storage
drivers, model providers, or any framework-specific library. Its only
dependencies are TypeScript standard library types.

All framework-specific integrations depend on judgment-core, not the reverse.
Storage is accessed through an abstract interface defined in judgment-core
and implemented by judgment-storage-memory and judgment-storage-sqlite.

## Rationale

Keeping the core package independent ensures that:

1. The domain model and business rules can be tested without any framework
   or infrastructure setup.
2. New integrations (additional storage backends, different UI frameworks,
   alternative agent runtimes) can be added without modifying core logic.
3. The core package can be used in environments where specific frameworks
   are not available (server-side scripts, CLI tools, embedded systems).
4. Dependency conflicts between frameworks do not affect the domain logic.

## Consequences

- The core package defines abstract interfaces (StorageAdapter,
  DetectionRule, PolicyEvaluator) that integration packages implement.
- Integration packages must handle the translation between their
  framework-specific types and the core domain types.
- Changes to core types require updating all dependent packages.
  The monorepo structure and TypeScript strict mode help detect
  these changes at build time.

## Alternatives Considered

- **Single package with optional peer dependencies**: Simpler structure
  but would pull framework types into the core package's type definitions
  and make it harder to test in isolation.
- **Separate type package and logic package**: Would add an unnecessary
  layer of indirection for the current project size.
