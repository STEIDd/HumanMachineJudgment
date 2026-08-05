# Terminology Reference

This document defines every key term used in the Human-Machine Judgment project. Each entry provides a definition and a usage context that clarifies how the term applies in practice.

---

## Judgment Point

**Definition.** A durable, machine-readable record of a consequential choice in a technical workflow. A Judgment Point surfaces a decision that requires deliberation, supports investigation and comparison of alternatives, records an authorized resolution, and connects the resolution to the work that depends on it.

**Usage context.** When an agent encounters a choice that could materially affect the outcome of an analysis, it creates a Judgment Point rather than making the choice silently. The Judgment Point persists as a first-class record in the project, surviving workflow interruptions, session boundaries, and agent restarts.

---

## Judgment Candidate

**Definition.** A potential Judgment Point that has been detected but not yet promoted to active status. Candidates exist in the `candidate` state and represent choices that may or may not warrant structured review, depending on their materiality and the project's policy configuration.

**Usage context.** Detection rules and agent analysis continuously produce candidates. Low-materiality candidates may be logged at the trace level and never promoted. Higher-materiality candidates are promoted to `pending` status, at which point they become active Judgment Points requiring attention.

---

## Judgment Policy

**Definition.** A declarative rule set that governs when work may proceed, when it must pause, when comparison is required, and when choices may be delegated. Policies map conditions (such as materiality thresholds, categories, and trigger sources) to intervention levels and authority modes.

**Usage context.** A project administrator defines policies to reflect the organization's risk tolerance and regulatory requirements. For example, a policy might require that all Judgment Points in the `assumption` category with a materiality score above 10 must pause execution and require human resolution.

---

## Judgment Resolution

**Definition.** The recorded outcome of a Judgment Point decision. A resolution captures which alternative was selected, the rationale for the selection, known uncertainties at the time of decision, any conditions applied to the resolution, and validation requirements that must be satisfied afterward.

**Usage context.** When a user or authorized agent resolves a Judgment Point, the system creates a resolution record. This record is immutable once created. If the decision is later revisited, the original resolution is preserved in the revision history and a new resolution is recorded.

---

## Judgment Dependency

**Definition.** A relationship between a Judgment Point and an artifact, parameter, or another Judgment Point whose correctness depends on the resolution. Dependencies establish the traceability chain that allows the system to detect when upstream changes invalidate downstream decisions.

**Usage context.** If a Judgment Point about material properties is resolved with the decision to use constant (temperature-independent) values, and a downstream computation uses those values, the computation is a dependency of that Judgment Point. If the material property data source changes, the system marks the resolution as potentially stale.

---

## Judgment Review

**Definition.** A structured examination of a resolved Judgment Point, typically triggered by staleness detection, a reopen condition being met, or an explicit request from a user or auditor. A review evaluates whether the original resolution remains valid given current information.

**Usage context.** During an audit or when conditions change, a reviewer examines the Judgment Point's resolution, the evidence that supported it, the alternatives that were considered, and whether the validity conditions still hold. The review may result in the Judgment Point being reopened or confirmed.

---

## Judgment Event

**Definition.** An immutable record of a single action or state transition in the lifecycle of a Judgment Point. Events form the append-only audit log. Event types include `created`, `promoted`, `investigation-started`, `resolution-recorded`, `delegated`, `dismissed`, `reopened`, `marked-stale`, `dependency-changed`, `artifact-linked`, `artifact-unlinked`, `alternative-added`, `comparison-requested`, `comparison-completed`, and `validity-condition-changed`.

**Usage context.** Every significant action on a Judgment Point produces an event. Events are never modified or deleted after creation. The current state of a Judgment Point is a projection derived by replaying its event history.

---

## Judgment Authority

**Definition.** The specification of who or what is authorized to resolve a Judgment Point. Authority is expressed as a mode (`human`, `collaborative`, `delegated`, or `rule`) combined with an optional actor identifier and an optional policy identifier.

**Usage context.** A Judgment Point with authority mode `human` requires a specific human to make the decision. A Judgment Point with authority mode `delegated` permits an agent to resolve the decision, but only under the terms of an explicit delegation policy. The authority mode determines which resolution paths are valid.

---

## Materiality

**Definition.** A structured assessment of how much a choice matters to the overall outcome. Materiality is not a binary property; it is a multi-dimensional score that captures different aspects of a decision's significance.

**Usage context.** Materiality determines the intervention level for a Judgment Point. A low-materiality choice (such as a formatting preference) may be logged silently. A high-materiality choice (such as a safety factor selection) must pause execution and require investigation before resolution.

---

## Materiality Score

**Definition.** An integer between 0 and 18, computed as the sum of six materiality dimension scores (each ranging from 0 to 3). The aggregate score provides a single numeric measure that policies and rules use to determine intervention levels.

**Usage context.** A materiality score of 3 might map to the `trace` intervention level, while a score of 14 might map to `require-investigation`. The exact thresholds are configured through policies and are subject to calibration as the system is used.

---

## Materiality Dimension

**Definition.** One of six independent aspects of a decision's significance. The six dimensions are: methodological discretion, downstream influence, uncertainty, consequence, reversibility, and accountability requirement.

**Usage context.** Each dimension is scored from 0 (negligible) to 3 (high). A decision might score 3 on downstream influence (because many artifacts depend on it) but 0 on accountability requirement (because no regulatory or contractual obligation governs it). Dimensions are evaluated independently to prevent a single high score from being diluted by unrelated low scores.

---

## Intervention Level

**Definition.** The required system response when a Judgment Point is detected. The four intervention levels, from least to most disruptive, are: `trace`, `disclose`, `pause`, and `require-investigation`.

- **trace**: The decision is logged but the user is not interrupted. Work continues.
- **disclose**: The decision is surfaced to the user, but work continues without blocking.
- **pause**: Execution halts until the decision is resolved.
- **require-investigation**: Execution halts, and the system mandates structured comparison of alternatives before a resolution can be recorded.

**Usage context.** Intervention levels are assigned by evaluating the Judgment Point's materiality score against the project's active policies. Hard trigger rules can override the score-based intervention level.

---

## Hard Trigger

**Definition.** A deterministic, rule-based condition that, when matched, forces a specific intervention level regardless of the computed materiality score. Hard triggers represent situations where the nature of the choice, rather than its numeric score, demands a particular response.

**Usage context.** The ten hard trigger rules cover situations such as: the agent is about to change the analysis objective, the agent is discarding data points, the agent is selecting a safety or design factor, or the agent is making an irreversible commitment. When a hard trigger fires, the Judgment Point is promoted directly to the intervention level specified by the rule, bypassing the normal score-based escalation.

---

## Soft Trigger

**Definition.** A heuristic or pattern-based detection signal that suggests a choice may warrant review but does not force a specific intervention level. Soft triggers contribute to candidate generation and may increase the materiality score, but the final intervention level is still determined by policy evaluation.

**Usage context.** A soft trigger might fire when an agent uses language suggesting uncertainty ("I'll assume," "for simplicity," "a reasonable default"). The soft trigger creates a candidate, and the candidate's materiality is assessed through normal scoring. The result may be a trace-level log entry or a full pause, depending on the score and policies.

---

## Category

**Definition.** A classification of the type of technical choice a Judgment Point represents. The eight categories are:

- **objective**: Defines or changes what the analysis is trying to achieve.
- **framing**: Defines or changes how the problem is conceptualized or bounded.
- **assumption**: Introduces or modifies a simplifying assumption.
- **method**: Selects or changes the analytical or computational method.
- **data**: Selects, filters, transforms, or substitutes source data.
- **parameter**: Sets or modifies a parameter value used in computation.
- **validation**: Defines or changes the validation approach or acceptance criteria.
- **interpretation**: Interprets results, draws conclusions, or makes recommendations.

**Usage context.** Categories are used by policies to apply different rules to different types of choices. For example, a policy might allow delegation for `parameter` choices below a materiality threshold but require human authority for all `objective` choices regardless of score.

---

## Status Values

**Definition.** The lifecycle states a Judgment Point may occupy. Each status represents a distinct phase of the decision process.

- **candidate**: Detected but not yet promoted. The choice has been identified as potentially consequential.
- **pending**: Promoted and awaiting action. The choice requires attention but investigation has not yet begun.
- **investigating**: Structured investigation is underway. Alternatives are being compared and evidence is being gathered.
- **resolved**: A resolution has been recorded by an authorized actor.
- **delegated**: Resolution authority has been assigned to an agent under an explicit delegation policy.
- **stale**: A previously resolved Judgment Point whose validity conditions may no longer hold due to changed inputs or dependencies.
- **reopened**: A previously resolved or dismissed Judgment Point that has been reopened for reconsideration.
- **dismissed**: The Judgment Point has been dismissed as not requiring a decision. Dismissals are recorded with a reason.

**Usage context.** Status transitions follow a defined state machine. Not all transitions are valid from all states. Guards enforce constraints such as requiring an authorized actor for resolution.

---

## Authority Modes

**Definition.** The four modes that determine how a Judgment Point may be resolved.

- **human**: Only a human user may record the resolution. The agent may prepare information and recommendations but may not resolve the decision.
- **collaborative**: A human and an agent work together on the decision. The human retains final authority, but the agent contributes structured analysis.
- **delegated**: An agent may resolve the decision, but only under the terms of an explicit delegation policy. The delegation policy specifies conditions such as maximum materiality score, required confidence, and excluded categories.
- **rule**: The resolution is determined by a predefined rule, external standard, or regulatory requirement. No discretionary judgment is exercised.

**Usage context.** Authority modes are set by policies and may be overridden by specific policy rules. The mode constrains who may call the resolve operation and what preconditions must be met.

---

## Artifact Reference

**Definition.** A structured reference to a specific artifact (code cell, parameter, model, plot, conclusion, dataset, standard, requirement, document, or computation) that is related to a Judgment Point. Each reference specifies the artifact's type, a human-readable label, an optional location (file path, cell identifier, line range, or URI), and a relationship type.

**Relationship types:**

- **depends-on**: The artifact's correctness depends on the judgment.
- **informs**: The artifact provides evidence for the judgment.
- **produced-by**: The artifact was generated as a result of the judgment.
- **validates**: The artifact validates the judgment's resolution.
- **contradicts**: The artifact provides evidence against a particular alternative or the current resolution.

**Usage context.** Artifact references establish traceability between decisions and technical work. When a referenced artifact changes, the system can use the dependency graph to identify which Judgment Points may need review.

---

## Validity Condition

**Definition.** A condition under which a Judgment Point's resolution remains valid. If any validity condition is no longer met, the resolution may be marked stale.

**Usage context.** A resolution to use constant material properties might carry the validity condition "Source data covers the operating temperature range of 300 K to 600 K." If the operating temperature range later changes to include 900 K, the validity condition is no longer met, and the Judgment Point transitions to `stale`.

---

## Reopen Condition

**Definition.** A condition that, when met, should trigger a review of a previously resolved or dismissed Judgment Point. Reopen conditions differ from validity conditions in that they describe prospective changes rather than current assumptions.

**Usage context.** A reopen condition might state "Re-evaluate if the sample size exceeds 10,000 data points." The condition does not invalidate the current resolution immediately; instead, it establishes a threshold that, if crossed in the future, warrants reconsideration.

---

## Detector

**Definition.** An agent role responsible for identifying consequential choices as they occur in a workflow. The Detector scans the workflow context, applies hard trigger rules and soft trigger heuristics, and produces Judgment Candidates with preliminary materiality assessments.

**Usage context.** The Detector operates continuously during agent execution. It examines each action the agent is about to take, determines whether the action constitutes a consequential choice, and, if so, creates a candidate. Detection is primarily rule-based and deterministic, with optional model-assisted enhancement.

---

## Analyst

**Definition.** An agent role responsible for investigating a Judgment Point once it has been promoted to active status. The Analyst gathers evidence, identifies alternatives, prepares structured comparisons, and assesses the tradeoffs of each option.

**Usage context.** When a Judgment Point enters the `investigating` state, the Analyst produces a structured analysis that includes the alternatives considered, evidence for and against each alternative, and known unknowns. The Analyst does not make the decision; it prepares the information needed for the authority (human or delegated agent) to decide.

---

## Executor

**Definition.** An agent role responsible for carrying out the resolution of a Judgment Point. Once a resolution is recorded, the Executor implements the chosen alternative in the technical workflow, connecting the decision to the downstream artifacts and computations.

**Usage context.** After a user resolves a Judgment Point by selecting temperature-dependent material properties, the Executor updates the relevant computation cells, adjusts parameter values, and ensures that downstream artifacts reflect the decision.

---

## Critic

**Definition.** An agent role responsible for reviewing the quality and consistency of Judgment Point records. The Critic checks whether resolutions are well-supported by evidence, whether alternatives were adequately considered, and whether validity conditions are reasonable.

**Usage context.** The Critic operates as a quality assurance function. It may flag a resolution that dismissed all but one alternative without stated reasoning, or a Judgment Point that lacks validity conditions despite having high downstream influence.

---

## Permission vs. Judgment Distinction

**Definition.** The distinction between asking for permission to proceed and recording a judgment about a consequential choice. Permissions are binary (yes/no) approval gates. Judgments are structured, multi-alternative decision records that capture why a choice was made, what was considered, and what conditions bound the decision.

**Usage context.** A traditional approval workflow asks "May I proceed?" and records a yes or no response. A Judgment Point asks "What is the best approach for this specific choice, given these alternatives and this evidence?" The distinction is important because permission-based systems lose the reasoning behind decisions, while judgment-based systems preserve it.

---

## Consequential Choice

**Definition.** A choice made during a technical workflow that materially affects the outcome, reliability, or interpretability of the results. Not all choices are consequential. Formatting decisions, variable naming preferences, and equivalent code refactorings are generally not consequential. Choosing a numerical method, selecting a data source, or defining an acceptance criterion are typically consequential.

**Usage context.** The Judgment Points system is designed to surface consequential choices, not to interrupt every action an agent takes. The materiality scoring and hard trigger rules work together to distinguish consequential choices from routine ones.

---

## Downstream Influence

**Definition.** The extent to which a decision propagates through the analysis, affecting subsequent computations, conclusions, or artifacts. A decision with high downstream influence affects many parts of the workflow; a decision with low downstream influence affects only a local computation.

**Usage context.** Downstream influence is one of the six materiality dimensions. A decision about the mesh resolution for a finite element model has high downstream influence because it affects every computed result. A decision about the color scheme for a visualization has low downstream influence because it affects only the visual presentation.

---

## Recommendation Anchoring

**Definition.** The cognitive bias that occurs when a human decision-maker is shown an AI-generated recommendation before making their own assessment. The recommendation can unconsciously influence the human's judgment, even when the human believes they are deciding independently.

**Usage context.** The Judgment Points system mitigates recommendation anchoring by (1) capturing the decision-maker's initial position before showing any recommendation, (2) recording whether a recommendation was shown, and (3) presenting alternatives without indicating a preferred option when the intervention level requires human judgment. The resolution schema includes explicit fields (`initialPosition` and `recommendationShown`) to support awareness of this bias.

---

## Summary Table

| Term                     | Short Definition                                                         |
| ------------------------ | ------------------------------------------------------------------------ |
| Judgment Point           | Durable record of a consequential choice                                 |
| Judgment Candidate       | Detected but not yet promoted potential Judgment Point                   |
| Judgment Policy          | Declarative rule set governing intervention and authority                |
| Judgment Resolution      | Recorded outcome of a decision                                           |
| Judgment Dependency      | Traceability link between a decision and downstream work                 |
| Judgment Review          | Structured examination of a resolved Judgment Point                      |
| Judgment Event           | Immutable audit log entry for a lifecycle action                         |
| Judgment Authority       | Specification of who may resolve a Judgment Point                        |
| Materiality              | Multi-dimensional assessment of a choice's significance                  |
| Materiality Score        | Sum of six dimension scores (0 to 18)                                    |
| Materiality Dimension    | One of six independent aspects of significance                           |
| Intervention Level       | Required system response (trace, disclose, pause, require-investigation) |
| Hard Trigger             | Deterministic rule that forces a specific intervention                   |
| Soft Trigger             | Heuristic signal suggesting a choice may warrant review                  |
| Category                 | Classification of the type of technical choice                           |
| Status                   | Current lifecycle state of a Judgment Point                              |
| Authority Mode           | How resolution authority is assigned                                     |
| Artifact Reference       | Structured reference linking a decision to a technical artifact          |
| Validity Condition       | Condition under which a resolution remains valid                         |
| Reopen Condition         | Condition that should trigger reconsideration                            |
| Detector                 | Agent role that identifies consequential choices                         |
| Analyst                  | Agent role that investigates alternatives                                |
| Executor                 | Agent role that implements resolutions                                   |
| Critic                   | Agent role that reviews decision quality                                 |
| Permission vs. Judgment  | Distinction between binary approval and structured decision records      |
| Consequential Choice     | A choice that materially affects outcomes                                |
| Downstream Influence     | Extent of propagation through the analysis                               |
| Recommendation Anchoring | Cognitive bias from seeing AI recommendations before deciding            |
