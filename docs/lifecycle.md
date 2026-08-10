# Judgment Point Lifecycle

This document describes the lifecycle of a Judgment Point, including its state machine, valid transitions, transition guards, staleness detection, reopening, dismissal, delegation, and revision history.

---

## State Machine Diagram

The following ASCII art shows all states and valid transitions:

```
                         +------------------+
                         |                  |
          detect         |    candidate     |
       +---------------->|                  |
                         +--------+---------+
                                  |
                         promote  |
                                  v
                         +--------+---------+
                         |                  |<----------------------------+
                         |     pending      |                             |
                         |                  |                             |
                         +---+----+----+----+                             |
                             |    |    |                                  |
           begin-investigation|   |    | dismiss                         |
                             |    |    +--------->+------------------+   |
                             v    |               |                  |   |
                  +----------+--+ |               |    dismissed     |   |
                  |             | |               |                  |   |
                  |investigating| |               +--------+---------+   |
                  |             | |                        |              |
                  +------+------+ |               reopen   |              |
                         |        |                        +--------------+
                resolve  |        |
                         |        | delegate
                         v        v
                  +------+------+ +------------------+
                  |             | |                  |
                  |  resolved   | |    delegated     |
                  |             | |                  |
                  +--+----+---+-+ +--------+---------+
                     |    |   |            |
          mark-stale |    |   |   resolve  |
                     v    |   |            v
           +---------+--+ |  |   +--------+---------+
           |             | |  |   |                  |
           |    stale    | |  |   |    resolved      |
           |             | |  |   |  (from delegated)|
           +------+------+ |  |   +------------------+
                  |         |  |
         reopen   |         |  | reopen
                  v         |  v
           +------+---------+--+
           |                   |
           |     reopened      |
           |                   |
           +------+----+------+
                  |    |
     investigate  |    | dismiss
                  v    v
          (back to investigating
           or dismissed)
```

---

## State Descriptions

### candidate

The initial state. A consequential choice has been detected by a rule, agent, or tool, but it has not yet been promoted to an active Judgment Point. Candidates are lightweight: they carry the detected trigger, a preliminary materiality assessment, and the question being asked.

Candidates may be promoted or may remain as trace-level records indefinitely if their materiality score does not meet the promotion threshold. The system does not automatically delete candidates.

### pending

The Judgment Point has been promoted from candidate status and is awaiting action. The choice has been confirmed as requiring attention, but structured investigation has not yet begun. In this state, the Judgment Point is visible to the user and appears in the project's Judgment Point list.

From pending, the Judgment Point may transition to `investigating` (when structured comparison begins), `dismissed` (when the Judgment Point is determined not to require a decision), or `delegated` (when resolution authority is assigned to an agent under a delegation policy).

### investigating

Structured investigation of alternatives is underway. In this state, the system or an agent is actively comparing alternatives, gathering evidence, and preparing the information needed for a resolution. New alternatives may be added, comparison calculations may be requested and completed, and evidence may be linked.

Investigation does not have a fixed duration. It continues until the authorized actor records a resolution.

### resolved

A resolution has been recorded by an authorized actor. The resolution includes the selected alternative, a rationale, known uncertainties, conditions, and validation requirements. The resolution is immutable once created; if the decision is revisited, the previous resolution is preserved in the revision history.

Resolved Judgment Points may transition to `stale` (if validity conditions are no longer met) or `reopened` (if an explicit reopen action is taken).

### delegated

Resolution authority has been assigned to an agent under an explicit delegation policy. In this state, the agent is authorized to resolve the Judgment Point without further human input, provided the delegation conditions are met.

The delegated state is distinct from resolved: a Judgment Point in `delegated` status has not yet been resolved; it has been authorized for agent resolution. Once the agent records a resolution, the Judgment Point transitions to `resolved`.

### stale

A previously resolved Judgment Point whose validity conditions may no longer hold. Staleness indicates that something has changed since the resolution was recorded, and the decision may need to be revisited. The system does not automatically reopen stale Judgment Points; it marks them as stale and leaves the decision to the user.

Stale Judgment Points may transition to `reopened` (when a user decides to revisit the decision) or may remain stale if the user determines that the change does not actually invalidate the resolution.

### reopened

A previously resolved, stale, or dismissed Judgment Point that has been reopened for reconsideration. Reopening preserves the entire prior history, including the previous resolution. From the reopened state, the Judgment Point follows the same paths as pending: it may transition to `investigating` or `dismissed`.

### dismissed

The Judgment Point has been dismissed as not requiring a decision. Dismissals are recorded with a reason explaining why the choice does not warrant a judgment. Dismissed Judgment Points are retained in the system for audit purposes and can be reopened if circumstances change.

---

## Valid Transitions

The following table enumerates every valid state transition, the event that triggers it, and the conditions that must be met.

| From          | To            | Trigger Event           | Description                                                                                         |
| ------------- | ------------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| candidate     | pending       | `promoted`              | The candidate's materiality score meets the promotion threshold, or a hard trigger forces promotion |
| pending       | investigating | `investigation-started` | An actor initiates structured investigation of alternatives                                         |
| pending       | dismissed     | `dismissed`             | An authorized actor determines the choice does not require a judgment                               |
| pending       | delegated     | `delegated`             | A delegation policy assigns resolution authority to an agent                                        |
| investigating | resolved      | `resolution-recorded`   | An authorized actor records a resolution                                                            |
| delegated     | resolved      | `resolution-recorded`   | The delegated agent records a resolution under the delegation policy                                |
| resolved      | stale         | `marked-stale`          | A validity condition is no longer met, or an upstream dependency has changed                        |
| resolved      | reopened      | `reopened`              | An authorized actor explicitly reopens the decision                                                 |
| stale         | reopened      | `reopened`              | An authorized actor reopens a stale decision for review                                             |
| dismissed     | reopened      | `reopened`              | An authorized actor reopens a dismissed Judgment Point                                              |
| reopened      | investigating | `investigation-started` | The reopened Judgment Point enters structured investigation                                         |
| reopened      | dismissed     | `dismissed`             | The reopened Judgment Point is dismissed again                                                      |

Transitions not listed in this table are invalid. Attempting an invalid transition results in an error. For example, a Judgment Point cannot transition directly from `candidate` to `resolved`, because the promotion, pending, and investigation phases must occur first (unless the intervention level is `trace`, in which case the candidate is logged but never promoted).

---

## Transition Guards

Guards are preconditions that must be satisfied before a transition is executed. If a guard fails, the transition is rejected and no event is created.

### Promotion Guard (candidate to pending)

- The candidate must have a complete materiality assessment.
- The materiality score must meet the project's promotion threshold (configurable via policy), or a hard trigger must be present.
- The candidate must not already have been promoted (no duplicate promotion).

### Investigation Guard (pending or reopened to investigating)

- The Judgment Point must have at least one alternative defined.
- The actor initiating investigation must have access to the project.

### Resolution Guard (investigating or delegated to resolved)

- The actor recording the resolution must be authorized according to the Judgment Point's authority configuration.
- For `human` authority mode: the actor must be a human user (actor type `user`).
- For `collaborative` authority mode: the actor must be a human user, and the resolution should indicate that agent analysis was reviewed.
- For `delegated` authority mode: the delegation policy's conditions must all be met (materiality score within bounds, confidence above threshold, category not excluded, prior human resolution requirement satisfied if applicable).
- For `rule` authority mode: the resolution must reference the rule or standard that determined it.
- The selected alternative must exist in the Judgment Point's alternatives list.
- The rationale field must not be empty.

### Dismissal Guard (pending or reopened to dismissed)

- The actor must have access to the project.
- A dismissal reason must be provided.
- The Judgment Point's intervention level must permit dismissal. Judgment Points with `require-investigation` intervention level cannot be dismissed without first completing investigation.

### Delegation Guard (pending to delegated)

- A delegation policy must be specified.
- The delegation policy must be active (enabled) in the project.
- The Judgment Point's materiality score must not exceed the delegation policy's `maxMaterialityScore`.
- The Judgment Point's category must not be in the delegation policy's `excludedCategories`.
- If the delegation policy requires prior human resolution (`requiresPriorHumanResolution`), a materially similar Judgment Point must have been previously resolved by a human.

### Staleness Guard (resolved to stale)

- At least one validity condition must have been detected as no longer holding, or at least one upstream dependency must have changed.
- The Judgment Point must currently be in `resolved` status.

### Reopen Guard (resolved, stale, or dismissed to reopened)

- The actor must have access to the project.
- A reopen reason must be provided.

---

## Staleness Detection

Staleness detection is the process of identifying resolved Judgment Points whose resolutions may no longer be valid. The system detects staleness through two mechanisms:

### Dependency Change Detection

When an artifact that is referenced by a resolved Judgment Point's `affectedArtifactIds` or `evidenceRefs` changes, the system evaluates whether the change affects the resolution. If the change is material (for example, a data source is updated with new values, or a requirement document is revised), the system generates a `dependency-changed` event followed by a `marked-stale` event.

Dependency changes propagate through the dependency graph. If Judgment Point A depends on Judgment Point B, and B is marked stale, A is also evaluated for staleness.

### Validity Condition Evaluation

Each resolved Judgment Point carries a list of validity conditions. These are human-readable statements that describe the circumstances under which the resolution remains valid. The system evaluates validity conditions through two approaches:

1. **Rule-based evaluation.** Some validity conditions can be evaluated automatically. For example, a condition stating "Operating temperature remains below 600 K" can be checked against the current parameter values if those values are tracked in the system.

2. **Periodic review prompts.** For conditions that cannot be evaluated automatically, the system periodically prompts the user to confirm whether the conditions still hold. The frequency of these prompts is configurable via policy.

When a validity condition is determined to no longer hold, the Judgment Point transitions from `resolved` to `stale`.

---

## Reopening

A Judgment Point can be reopened from three states: `resolved`, `stale`, and `dismissed`. Reopening is always an explicit action; the system does not automatically reopen Judgment Points.

When a Judgment Point is reopened:

1. A `reopened` event is created, recording the actor, timestamp, and reason for reopening.
2. The current resolution (if the Judgment Point was resolved or stale) is preserved in the `revisionHistory` array.
3. The Judgment Point transitions to the `reopened` status.
4. From `reopened`, the Judgment Point follows the same paths as `pending`: it may be investigated (transitioning to `investigating`) or dismissed again (transitioning to `dismissed`).

The revision history preserves the complete record of all prior resolutions, including:

- The timestamp of each revision
- The previous status
- The new status
- The reason for the revision
- The previous resolution (if applicable)
- The actor who initiated the revision

---

## Dismissal

Dismissal records that a Judgment Point does not require a decision. This is distinct from resolution: a dismissed Judgment Point has no selected alternative and no rationale for a choice. Instead, the dismissal event records a reason explaining why the choice was determined to be unnecessary.

Common reasons for dismissal include:

- The choice was determined to be inconsequential after further analysis.
- The choice is governed by an external standard that leaves no discretion.
- The circumstances that prompted the Judgment Point no longer apply.

Dismissed Judgment Points are retained in the system's event log and current-state projection. They appear in project views with their dismissed status and reason. They can be reopened if circumstances change.

The dismissal guard prevents dismissal of Judgment Points with `require-investigation` intervention level that have not yet completed investigation. This prevents high-materiality choices from being dismissed without adequate consideration.

---

## Delegation

Delegation assigns resolution authority from a human to an agent, under the terms of an explicit delegation policy. The delegation process works as follows:

1. A Judgment Point in `pending` status is evaluated against the project's delegation policies.
2. If a delegation policy matches (based on the policy's scope and rule conditions), and all delegation conditions are met, the Judgment Point may transition to `delegated` status.
3. A `delegated` event is created, recording the delegation policy, the delegated agent, and the timestamp.
4. The delegated agent may now record a resolution, subject to the delegation policy's constraints.
5. When the agent records a resolution, the system validates that the delegation conditions are still met at the time of resolution (not just at the time of delegation).
6. The resolution is recorded with `resolutionType` set to `delegated`, and the `resolvedBy` field identifies the agent.

### Challenging Delegated Decisions

Delegated resolutions can be challenged through the reopen mechanism. A human user can reopen a delegated-and-resolved Judgment Point by providing a reason. When a delegated resolution is reopened, it returns to the standard investigation and resolution workflow.

Additionally, if a delegation policy specifies `auditRequired: true`, all resolutions made under that policy are flagged for subsequent human review. The audit flag does not prevent the resolution from taking effect; it marks it for review.

---

## Revision History Preservation

Every change to a Judgment Point's resolution is preserved in the `revisionHistory` array. This array provides a complete chronological record of how the decision evolved over time.

Each revision entry contains:

- **timestamp**: When the revision occurred.
- **previousStatus**: The Judgment Point's status before the revision.
- **newStatus**: The Judgment Point's status after the revision.
- **reason**: Why the revision occurred.
- **previousResolution**: The resolution that was in effect before the revision (if applicable).
- **actorId**: Who initiated the revision.

The revision history is append-only within the current-state projection. Entries are never modified or removed. This ensures that the complete decision history is available for audit, analysis, and accountability purposes.

---

## Event Flow Examples

### Normal Resolution Flow

```
1. detect         -> created event        -> candidate
2. promote        -> promoted event       -> pending
3. investigate    -> investigation-started -> investigating
4. add alternative -> alternative-added   -> investigating
5. compare        -> comparison-requested -> investigating
6. compare done   -> comparison-completed -> investigating
7. resolve        -> resolution-recorded  -> resolved
```

### Staleness and Reopen Flow

```
1. (resolved state)
2. upstream change  -> dependency-changed  -> resolved
3. condition fails  -> marked-stale        -> stale
4. user reopens     -> reopened event      -> reopened
5. investigate      -> investigation-started -> investigating
6. resolve again    -> resolution-recorded  -> resolved
```

### Delegation Flow

```
1. (pending state)
2. policy matches   -> delegated event     -> delegated
3. agent resolves   -> resolution-recorded -> resolved
4. audit review     -> (flagged for audit, no state change)
```

### Dismissal and Reopen Flow

```
1. (pending state)
2. user dismisses   -> dismissed event     -> dismissed
3. conditions change -> reopened event     -> reopened
4. investigate      -> investigation-started -> investigating
5. resolve          -> resolution-recorded  -> resolved
```
