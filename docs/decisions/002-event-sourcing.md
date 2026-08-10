# ADR-002: Event Sourcing for Judgment Point State

**Status**: Accepted
**Date**: 2026-08-04
**Authors**: Courage Lahban

## Context

Judgment Points require a complete, tamper-evident history of all decisions,
transitions, and revisions. A resolved decision may later become stale or
be reopened, and the system must preserve the original resolution, the
circumstances of the revision, and the new resolution without overwriting
historical records.

## Decision

The system uses an immutable event log as the source of truth. Current state
is derived by projecting events in order. Events are append-only and are
never modified or deleted after creation.

Each Judgment Event records:

- The event type (created, promoted, resolution-recorded, reopened, etc.)
- A timestamp
- The actor who caused the event
- The actor type (user, agent, system, policy)
- Event-specific payload data

Current state (the latest status, resolution, validity, and artifact
links for a Judgment Point) is computed by replaying or caching the
projection of all events for that Judgment Point.

## Rationale

Event sourcing serves three requirements:

1. **Audit integrity**: Reviewers, regulators, and future analysts need to
   see the complete decision history, not just the current state. Overwriting
   previous resolutions would destroy accountability evidence.

2. **Staleness and reopening**: When a decision becomes stale, the system
   must preserve the original resolution alongside the new one. Without
   event sourcing, this would require complex versioning of the main record.

3. **Evaluation**: The evaluation framework needs to measure human engagement
   patterns (initial positions, revisions, time to decision). These
   measurements require event-level data.

## Consequences

- Storage grows monotonically. For the reference implementation (projects
  with tens to hundreds of Judgment Points), this is negligible.
- Read queries require projection from events unless a materialized view
  is maintained. The reference implementation maintains a current-state
  cache updated on each event.
- Deletion of individual events is not supported by design. Data retention
  policies must operate at the project level.

## Alternatives Considered

- **Mutable records with a separate audit log**: Simpler to implement but
  creates two sources of truth that can diverge.
- **Mutable records with soft deletes**: Does not preserve the full
  transition history needed for evaluation and accountability.
