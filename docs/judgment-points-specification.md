# Judgment Points Specification

## 1. Document Status and Version

| Field      | Value                                          |
| ---------- | ---------------------------------------------- |
| Version    | 0.1.0                                          |
| Status     | Draft                                          |
| Date       | August 4, 2026                                 |
| License    | Apache-2.0                                     |
| Repository | https://github.com/STEIDd/HumanMachineJudgment |
| Author     | Courage Lahban                                 |

This document is the canonical conceptual and product specification for Judgment Points. It defines the concepts, data structures, behaviors, and integration patterns that govern how consequential choices are identified, investigated, resolved, and tracked in technical agent workflows. All other project artifacts, including JSON schemas, runtime code, integration adapters, and reference applications, are derived from and governed by this specification.

This is a draft specification. The concepts, structures, and behaviors described here have not been validated through production use. Interfaces, scoring mechanisms, lifecycle states, and integration patterns will change as the project develops. The version number follows Semantic Versioning. During the 0.x period, breaking changes may occur in any minor release and will be documented in the project changelog.

Readers should treat quantitative thresholds (such as materiality score boundaries and intervention level mappings) as working hypotheses rather than validated parameters. These values are included to make the specification concrete enough to implement, not because they have been empirically calibrated.

The specification does not describe the current state of the reference implementation. It describes the intended behavior of a complete implementation. The reference implementation is in early development, and many features described here are planned rather than built. Where the distinction matters, the specification notes what is planned versus what exists.

---

## 2. Purpose

This specification defines Judgment Points: a structured mechanism for identifying, recording, investigating, and resolving consequential choices that arise when AI agents perform technical work alongside human operators.

The specification serves four purposes.

First, it provides a shared conceptual vocabulary. Terms like "judgment candidate," "materiality," "intervention level," and "resolution" have precise meanings within this specification. Without a shared vocabulary, conversations about how agents should handle consequential choices devolve into vague discussions about "keeping humans in control" without specifying what that means in practice.

Second, it provides a data model. Judgment Points are structured records, not prose in a conversation log. The specification defines the exact fields, types, relationships, and constraints of those records. This data model enables interoperability: different systems can produce and consume judgment records because they share a common structure.

Third, it provides behavioral rules. The specification defines when a judgment candidate should be created, how it should be evaluated, what intervention the system should perform, how resolution should be recorded, and how changes should propagate. These rules enable consistent behavior across implementations.

Fourth, it provides integration contracts. The specification defines how Judgment Points interact with the Model Context Protocol, LangGraph, Agent Skills, and the WEEMS technical computing environment. These contracts enable implementors to build integrations without guessing about expected behavior.

The intended audience includes implementors building judgment-aware agent systems, engineers designing tools that interact with judgment records, product designers creating interfaces for judgment workflows, and researchers studying how judgment is exercised in collaborative human-machine technical work.

---

## 3. Problem Being Addressed

AI agents operating in technical workflows routinely make choices that shape the direction and validity of subsequent work. In engineering analysis, scientific computation, data analysis, and software development, these choices include selecting modeling approaches, choosing parameter values, deciding which data sources to trust, framing the scope of an investigation, and interpreting ambiguous results.

The fundamental problem is not that agents make choices. Agents must make choices to be useful. The problem is that the choices are invisible, unrecorded, disconnected from their consequences, and made without clear authorization. Each of these is a distinct failure mode.

### 3.1 Invisible Choices

When an agent selects a modeling approach, adopts an assumption, or chooses a parameter value, the choice is typically embedded in the agent's output without being explicitly identified as a choice. The person responsible for the work sees the result of the choice (a particular model, a particular assumption, a particular value) but does not see that a choice was made, what alternatives existed, or why this option was selected.

This invisibility is not a malfunction. It is a natural consequence of how agents work: they produce outputs, not decision trees. But in technical work, the choices embedded in those outputs can be as important as the outputs themselves. An engineer reviewing an agent's analysis needs to know not just what the agent computed, but what decisions it made along the way that determined the structure, scope, and validity of the computation.

### 3.2 Unrecorded Choices

Even when a choice is visible in the conversation transcript (because the agent mentioned it in passing), it is not recorded in a structured, queryable, durable format. Conversation transcripts are ephemeral, unstructured, and difficult to search. They do not support systematic review of decisions across a project. They do not enable automated detection of when a prior decision has been invalidated by changed conditions.

The absence of structured records creates a gap in the knowledge base of a project. Technical projects accumulate hundreds of choices over their lifetime. Without records, there is no way to answer questions like: "What assumptions did we make in the thermal analysis?" or "Which choices would be affected if we changed the material specification?" or "Who authorized the selection of the reduced-order model?"

### 3.3 Disconnected Choices

A modeling decision made early in a workflow may affect dozens of downstream calculations, plots, and conclusions. Without an explicit link between the decision and its downstream effects, there is no way to propagate changes when the decision is revised, and no way to assess the validity of dependent work when conditions change.

Consider an analyst who selects a particular convection correlation for a heat transfer model. That correlation affects the computed heat transfer coefficients, which affect the temperature predictions, which affect the thermal stress calculations, which affect the design adequacy conclusion. If the convection correlation is later found to be inappropriate for the temperature range of interest, every step in that chain may need to be re-examined. Without explicit dependency links, the analyst must reconstruct the chain manually, which is error-prone and time-consuming.

### 3.4 Unauthorized Choices

When an agent makes a choice without explicit authorization, the accountability for that choice is ambiguous. Did the human operator endorse the choice? Were they aware of it? Would they have decided differently if asked? In professional practice, the person who signs the work product bears responsibility for the decisions embedded in it. If those decisions were made by an agent without the person's knowledge or informed consent, the accountability relationship is broken.

This is not merely a philosophical concern. In regulated industries (aerospace, nuclear, civil engineering, pharmaceutical), the technical basis for design decisions must be documented and attributable to qualified individuals. An agent's implicit choice does not satisfy this requirement, even if the choice happens to be correct.

### 3.5 The Scale of the Problem

The frequency and consequence of implicit choices in agent-assisted technical work are both higher than casual observation might suggest. Consider a single session of engineering analysis assisted by an AI agent. The agent might:

- Choose between two formulations for a governing equation.
- Select a discretization strategy.
- Adopt a particular treatment of boundary conditions.
- Choose a convergence criterion.
- Select a property database.
- Decide which validation references to compare against.
- Interpret whether results are "close enough" to validation data.
- Frame the conclusions and recommendations.

Each of these is a choice. Many of them are consequential in the sense defined by this specification. In a typical session, five to fifteen such choices may arise, of which two to five may be genuinely consequential. Across a project with dozens of analysis sessions, the accumulated invisible choices number in the hundreds.

The problem compounds over time. Early choices constrain later choices. An assumption adopted in session 3 may determine what methods are viable in session 15. Without records, the analyst in session 15 may not even know that the assumption was made, let alone that it was a choice rather than a necessity.

### 3.6 Permission Is Not Judgment

The existing approach of asking permission before every action does not solve these problems. Permission-based systems (such as tool-use confirmation dialogs) address the question of whether an agent may act, but they do not address the question of which option should be selected when multiple defensible alternatives exist. Clicking "approve" on an agent's proposed action does not constitute an informed judgment about a consequential choice; it merely authorizes execution.

This distinction is discussed further in Section 8.

### 3.7 What Judgment Points Provide

Judgment Points address these problems by providing a structured mechanism for:

- Surfacing consequential choices so they are visible to the responsible party.
- Presenting defensible alternatives so the choice is understood as a choice, not as a foregone conclusion.
- Supporting investigation and comparison so the decision-maker can evaluate the options.
- Recording authorized resolutions with rationale so the decision is documented and attributable.
- Connecting resolutions to the artifacts that depend on them so changes can be propagated and validity can be assessed.

The goal is not to slow down the workflow. The goal is to ensure that consequential choices receive the attention they deserve. Routine choices (low materiality) flow through without interruption. Moderate choices are disclosed without blocking. Significant choices pause the workflow. Critical choices require investigation. The materiality assessment (Section 14) and policy model (Section 16) together determine how each choice is handled.

---

## 4. Definition of a Judgment Point

A Judgment Point is a consequential choice in a technical workflow that is surfaced as a durable, machine-readable record, resolved by an authorized party, and connected to the work that depends on it.

This definition is precise and every word carries weight. Each of the six essential properties (consequential, choice, durable, machine-readable, authorized, connected) is necessary. A record that lacks any of these properties is not a Judgment Point under this specification.

The definition deliberately avoids describing what the system does (it does not say "a prompt" or "a dialog" or "an interruption") and instead describes what the record is. This is because Judgment Points are fundamentally data records, not user interface elements. They can be created by agents, by users, by rules, or by tools. They can be presented through MCP tools, LangGraph interrupts, web interfaces, or command-line interfaces. The definition is independent of the presentation mechanism.

A useful way to test whether a record qualifies as a Judgment Point is to check each property:

1. **Is it consequential?** Does the choice materially affect the outcome, validity, or direction of subsequent work? If no, it is not a Judgment Point.
2. **Is it a choice?** Do two or more defensible alternatives exist? If the answer is determined by computation, constraint, or mandate with no room for discretion, it is not a Judgment Point.
3. **Is it durable?** Is the record persisted beyond the session, conversation, or process that created it? If the record vanishes when the session ends, it is not a Judgment Point.
4. **Is it machine-readable?** Does the record conform to a defined schema with typed fields, enumerated values, and structured relationships? If it is free-text prose in a conversation log, it is not a Judgment Point.
5. **Is it authorized?** Is the resolution recorded by a party with explicit authority to make the decision? If the decision was made by default, by accident, or without clear authorization, it is not a properly resolved Judgment Point.
6. **Is it connected?** Is the record linked to the artifacts that depend on it? If the decision exists in isolation with no connection to downstream work, it is not fulfilling the traceability requirement of a Judgment Point.

---

## 5. Meaning of Each Part of the Definition

### 5.1 Consequential

A choice is consequential when it materially affects the outcome, validity, or direction of subsequent work. Not every decision in a workflow rises to this level. Formatting choices, variable naming, output ordering, and other decisions that do not change the substance of results are not consequential in this sense.

A consequential choice is one where at least one of the following is true:

- Selecting a different option would produce a meaningfully different outcome in the downstream work.
- The decision requires the exercise of professional or technical judgment that cannot be fully determined by computation alone.
- An incorrect decision could lead to invalid results, wasted effort, or unsafe conclusions.
- The decision must be documented and justified to meet professional, organizational, or regulatory standards.

The materiality assessment (Section 14) provides a structured method for evaluating how consequential a particular choice is. The assessment produces a numerical score that maps to an intervention level: choices with low materiality may be logged without interruption, while choices with high materiality require explicit investigation and resolution before work continues.

The threshold between consequential and inconsequential is not absolute. It depends on the domain, the project, the applicable standards, and the risk tolerance of the responsible party. Policies (Section 16) allow this threshold to be configured for different contexts.

### 5.2 Choice

A Judgment Point must involve a genuine choice between two or more defensible alternatives. The word "defensible" is important: each alternative must be a position that a competent practitioner could reasonably adopt, not merely a straw man included to make the list longer. If the situation has only one correct answer determinable by computation, it is not a judgment call. If no alternatives exist because the path is forced by constraints, standards, or prior commitments, no judgment is required.

The existence of multiple defensible options is what distinguishes a judgment from a calculation. A calculation has a correct answer. A judgment has multiple acceptable answers, and the selection among them requires weighing factors that are not reducible to a single optimization function.

Each alternative within a Judgment Point must be described with enough clarity that a reviewer can understand what it entails, what tradeoffs it involves, and what evidence supports or contradicts it. The alternatives are not merely options to click; they are substantive positions that can be compared, evaluated, and debated. The specification requires a minimum of two alternatives, but in practice, three or more alternatives are common for consequential technical choices.

The alternatives must be described at a consistent level of abstraction. If one alternative is described in detail and another is described vaguely, the comparison is biased. The system should encourage balanced presentation of all alternatives, though enforcing balance is a detection quality concern rather than a structural requirement.

### 5.3 Durable

A Judgment Point record persists beyond the session, conversation, or process in which it was created. The record exists as a first-class data object that can be stored, queried, referenced, and audited independently of the workflow that produced it.

Durability means three specific things.

First, the record survives the execution context. If the agent session ends, the notebook is closed, the server restarts, or the application is updated, the judgment record remains available for review and reference. This is in contrast to conversation transcripts, which may be ephemeral, truncated, or inaccessible after the session ends.

Second, the record is self-contained. It contains enough information to understand the decision without reconstructing the original context. The question, the alternatives, the rationale, the evidence references, the conditions, and the resolution must all be captured in the record itself. A reader examining the record months or years later should be able to understand what was decided, why, and under what circumstances.

Third, the record is immutable in its event history. While the current state of a Judgment Point changes (it moves through lifecycle states, its resolution may be revised, it may become stale), the event log that records these changes is append-only. No event is ever deleted or modified. This immutability provides an auditable history of the decision process.

### 5.4 Machine-Readable

A Judgment Point record is structured data conforming to a defined JSON Schema, not free-text prose in a conversation transcript. Machine readability enables automated systems to:

- Query judgment records by status, category, materiality, project, or other criteria.
- Evaluate whether validity conditions are still met.
- Detect when upstream conditions have changed and propagate staleness.
- Generate reports and dashboards summarizing the decision landscape of a project.
- Enforce policies about intervention levels and authority modes.
- Integrate with other systems through standard APIs.

The JSON Schema definitions in the `schemas/` directory define the canonical structure of judgment records. All fields have defined types, constraints, and descriptions. Enumerated values (such as categories, statuses, and authority modes) are defined as closed sets in the schema.

Machine readability is distinct from machine generation. An agent may detect and propose a judgment candidate, but the record's value comes from its structure, not from the identity of its creator. Human-initiated judgment records are equally valid and use the same schema.

Machine readability is also distinct from machine understanding. The system does not need to understand the semantic content of a rationale or an alternative description to process the judgment record. It operates on the structured metadata (categories, scores, statuses, identifiers) rather than the prose content.

### 5.5 Authorized

A Judgment Point is resolved by a party with explicit authority to make the decision. Authority is not assumed; it is assigned through a policy or by explicit designation.

The authorization requirement addresses a specific failure mode in current agent systems: decisions made by default. When an agent encounters a choice, the default behavior in most systems is for the agent to select an option and proceed. The person using the agent may or may not be aware that a choice was made. Even if they are aware, they may not have been explicitly empowered to make that choice (they may lack the domain expertise, the organizational authority, or the regulatory qualification).

The authority model (Section 17) defines four modes of authority:

- Human: requires a direct human decision.
- Collaborative: requires a human decision informed by agent analysis.
- Delegated: permits agent resolution under an explicit delegation policy.
- Rule: resolution is determined by an external standard or requirement.

The authorization requirement ensures that consequential choices are not resolved by default, by accident, or by the mere absence of objection. Someone or something must be explicitly empowered to make the decision, and the resolution must record who resolved it and under what authority.

### 5.6 Connected

A Judgment Point is linked to the artifacts that depend on it. This connection is bidirectional: the judgment record references the artifacts it affects, and artifacts can be traced back to the judgments that govern them.

Connection serves three purposes.

First, change propagation. When a judgment is revised or reopened, the system can identify which downstream artifacts may need to be updated or re-evaluated. Without this connection, a revision to an upstream judgment leaves downstream work in an unknown state, potentially invalid but not flagged as such.

Second, traceability. When an artifact is questioned (why was this model used? why was this parameter value chosen? why was this data source selected?), reviewers can trace it back to the judgment that authorized the approach. This traceability is essential for professional accountability and regulatory compliance.

Third, impact assessment. When conditions change (new data becomes available, a standard is updated, an upstream assumption is revised), the system can determine which judgments may be affected and mark them for review. Without connection, impact assessment requires manual reconstruction of the decision chain.

The connection between judgments and artifacts is established through artifact references (Section 27) and maintained through dependency propagation (Section 25). The `affectedArtifactIds` field on a Judgment Point lists the identifiers of artifacts that depend on the decision. Artifact references include a `relationship` field that describes the nature of the connection (depends-on, informs, produced-by, validates, contradicts).

---

## 6. What Is Not a Judgment Point

The following categories of decisions are explicitly excluded from the Judgment Point framework. Recognizing what does not qualify is important for preventing the system from generating excessive interruptions and for keeping the framework focused on its intended purpose.

### 6.1 Permission Requests

An agent asking whether it may perform an action (such as writing a file, calling an API, executing a command, or accessing a resource) is a permission request, not a Judgment Point. Permission addresses the question "may the agent do this?" Judgment addresses the question "which option should be chosen, and why?" These are different questions requiring different mechanisms, and conflating them dilutes the value of both.

A file-write confirmation dialog does not surface alternatives, does not assess materiality, does not record rationale, and does not connect the decision to downstream artifacts. It is a binary gate, not a structured decision record. Section 8 discusses this distinction in detail.

### 6.2 Formatting and Presentation Choices

Decisions about output formatting, chart colors, axis labels, table column widths, variable naming, comment style, indentation, or other presentation concerns are not consequential in the technical sense defined here. They do not change the substance of results, the validity of conclusions, or the direction of subsequent analysis.

There is an edge case where presentation choices do affect technical conclusions: for example, choosing a logarithmic versus linear scale for a plot can change how a reader interprets the data. If the choice of presentation materially affects the technical conclusion, it may qualify as an interpretation judgment (Section 12.8). The distinguishing criterion is whether the choice changes the substance of what is communicated, not merely the form.

### 6.3 Deterministic Computations

When the correct answer can be computed directly from the inputs and a well-defined algorithm, no judgment is involved. The system should not surface a Judgment Point for a calculation that has a single, objectively correct result. For example, computing the sum of a column of numbers, inverting a matrix, or evaluating a defined function at a specified input are computations, not judgments.

The boundary between computation and judgment can be subtle. Selecting which algorithm to use for the computation may be a judgment (if multiple algorithms with different accuracy/performance characteristics are available). But the execution of the selected algorithm is a computation.

### 6.4 Routine Tool Selection

An agent choosing between equivalent tools to accomplish a well-defined task (for example, selecting which HTTP library to use for a simple GET request, or choosing between two CSV parsers) is not exercising consequential judgment, provided the tools produce equivalent results for the task at hand.

If the tools differ in ways that affect the outcome (for example, one library handles Unicode normalization differently, and the data contains Unicode characters), the choice may be consequential and may warrant a Judgment Point. The criterion is whether the choice affects the substance of the result, not whether the agent made a selection.

### 6.5 Preferences Without Downstream Consequences

User preferences that do not affect the technical outcome (such as output verbosity, progress reporting frequency, interface language, notification settings, or display density) are not Judgment Points. These preferences affect the user's experience but do not change the technical work product.

### 6.6 Already-Committed Decisions

If a decision has already been made and committed through an external process (a requirements document, a contract specification, a regulatory mandate, a prior Judgment Point resolution), there is no judgment to exercise. The constraint may be documented as context for other judgments, but it is not itself a choice point. The specification's `rule` authority mode (Section 17) is used when an external constraint determines the answer.

### 6.7 Trivially Reversible Actions

Actions that can be undone instantly and at no cost do not require the overhead of a Judgment Point. However, actions that appear reversible but have hidden costs (such as recomputing expensive simulations, re-collecting experimental data, or re-running long-duration tests) may still qualify despite appearing reversible on the surface. The reversibility dimension of the materiality assessment (Section 14.5) provides a structured way to evaluate this.

### 6.8 Exploratory Work Under Explicit Framing

When the user has explicitly framed the work as exploratory ("try a few approaches and show me what happens," "generate some options for me to review"), the individual choices made during exploration are not Judgment Points. The user has indicated that they will evaluate the results holistically rather than authorizing each step individually. However, the decision about which exploration results to adopt for the final work product is a judgment.

---

## 7. Philosophical Basis

Judgment is required when computation alone does not determine what ought to be done next. This is the foundational premise of the Judgment Points framework.

### 7.1 The Underdetermination of Technical Choices

In formal terms, many technical workflows contain decision nodes where the correct next step is underdetermined by the available data, models, and rules. At these nodes, multiple defensible paths exist, and choosing among them requires the exercise of something beyond calculation: professional experience, domain knowledge, risk tolerance, value weighting, or practical wisdom. This capacity is what is meant by "judgment" in this specification.

Underdetermination arises from several sources.

Incomplete information. The analyst does not have all the data needed to determine the best approach with certainty. Material properties may be uncertain. Operating conditions may not be fully specified. Future requirements may be unknown.

Competing objectives. The choice involves tradeoffs between accuracy and computational cost, generality and specificity, simplicity and fidelity, speed and rigor. These tradeoffs cannot be resolved by optimizing a single objective function because the relative importance of the objectives is itself a matter of judgment.

Contested methodologies. Multiple methods exist for addressing the same question, and the professional community does not agree on which is best for all circumstances. The selection depends on the specific context, the intended use of the results, and the analyst's assessment of which method's assumptions best match the problem at hand.

Value-laden criteria. Some choices involve implicit value judgments about what level of risk is acceptable, what confidence is sufficient, or what counts as adequate agreement with reference data. These are not purely technical questions; they involve judgments about what matters and how much.

### 7.2 Computation and Judgment Are Not Opposed

The distinction between computation and judgment is not a claim about artificial intelligence capabilities in general. It is not a claim that machines cannot think, that agents cannot reason, or that AI will never be capable of making good decisions. It is a narrower, practical observation about a specific class of decisions in technical practice.

The observation is this: in the current state of technical practice, there are decisions where the responsible party (the engineer, scientist, analyst, or designer who will sign the work product) should be aware of what was decided, should have the opportunity to evaluate the alternatives, and should authorize the chosen path. These are the decisions that Judgment Points capture.

This framing is deliberately agnostic about the long-term trajectory of AI capabilities. If future agents become reliably better than humans at making certain technical decisions, the framework accommodates this through the delegation mechanism: the responsible party can delegate specific categories of decisions to agents under explicit policies, with audit trails. The key requirement is that the delegation itself is a deliberate choice, not a default.

### 7.3 Three Intellectual Traditions

The philosophical position underlying this specification draws on three traditions.

From engineering ethics, it takes the principle that the person who signs the work product bears responsibility for the decisions embedded in it, and therefore must have the opportunity to understand and endorse those decisions. Professional engineering codes of ethics (such as those of NSPE, ASCE, and IEEE) consistently emphasize that engineers must exercise independent professional judgment and must not allow their judgment to be compromised by factors they have not evaluated. Judgment Points provide the structure for this exercise of professional judgment in agent-assisted workflows.

From decision theory, it takes the distinction between decisions under certainty (where computation suffices) and decisions under uncertainty or ambiguity (where judgment is required). Decision theory provides a rich vocabulary for describing the structure of choices, including the concepts of alternatives, consequences, probabilities, and utility functions. Judgment Points borrow this vocabulary (alternatives, tradeoffs, consequences) while acknowledging that not all technical judgments can be formalized as expected utility maximization problems.

From the philosophy of action, it takes the observation that practical reasoning about what to do in a specific situation is not reducible to the application of general rules, because the situation always involves particular features that must be weighed against each other. This observation, traced through Aristotle's concept of phronesis (practical wisdom) to contemporary work on professional expertise, informs the specification's insistence that judgment records capture the particular context, rationale, and conditions of each decision, not merely the outcome.

### 7.4 Practical Wisdom and Technical Practice

The concept of practical wisdom (phronesis) is particularly relevant to technical judgment because technical practice routinely encounters situations where general rules underdetermine the correct action. Consider the engineering guideline "use a safety factor of 2.0 for static loads." This guideline is a useful starting point, but it does not tell the analyst what to do when the loads are partially dynamic, when the material properties are uncertain, when the geometry is complex, when the failure mode is not well-characterized, or when the consequences of failure are severe. In these situations, the analyst must exercise judgment about how to apply the general rule to the specific case.

This exercise of judgment is not a failure of the rule. It is the normal condition of professional practice. Rules provide structure and consistency, but they cannot anticipate every situation. The gap between general rules and particular situations is where judgment operates. Judgment Points provide a structure for making this exercise of judgment visible, recorded, and accountable, without attempting to eliminate the need for it.

The relationship between rules and judgment is not hierarchical (judgment does not override rules, and rules do not replace judgment). It is complementary: rules provide the framework within which judgment operates, and judgment applies the framework to the specific situation. The policy model (Section 16) embodies this complementary relationship by allowing organizations to define rules that govern the judgment process itself (what intervention level to apply, what authority mode to use, when delegation is permitted) while leaving the substance of the judgment to the decision-maker.

### 7.5 What This Does Not Claim

The specification does not claim that humans always exercise judgment well. Humans are subject to cognitive biases, fatigue, expertise limitations, and social pressures that can compromise the quality of their judgments. The specification does not assume that human judgment is infallible; it assumes that consequential choices should be made deliberately and accountably, not silently and by default.

The specification does not claim that every consequential choice must be resolved by a human. The authority model (Section 17) permits delegation to agents under explicit policies. The key requirement is that the delegation is a deliberate choice with defined conditions and audit trails, not a default mode of operation.

The specification does not claim a particular view about consciousness, understanding, or the nature of AI cognition. It is compatible with any position on these questions. The relevant criterion is practical: regardless of what agents are or are not capable of in principle, the current practice of technical work benefits from structured identification, investigation, and recording of consequential choices.

---

## 8. Permission Compared with Judgment

Permission and judgment are often conflated in discussions of agent oversight, but they address different questions and require different mechanisms. This section clarifies the distinction because it is central to understanding what Judgment Points are and are not.

### 8.1 What Permission Does

Permission addresses the question: "Is this agent authorized to perform this action?" It is a binary gate: the action is either allowed or not. Permission systems are appropriate when the concern is whether the agent should act at all, not which specific option should be selected.

Examples of permission mechanisms include:

- Tool-use approval dialogs ("The agent wants to write to file X. Allow?").
- File system access controls (read, write, execute permissions).
- API rate limits and quota enforcement.
- Network access policies (which domains the agent may contact).
- Execution sandboxes (what system resources the agent may access).

Permission mechanisms share several characteristics: they are binary (allow/deny), they do not require evaluation of alternatives, they do not produce substantive rationales, and they do not connect the decision to downstream consequences.

### 8.2 What Judgment Does

Judgment addresses the question: "Given that a choice must be made among defensible alternatives, which option should be selected and why?" Judgment involves evaluation, comparison, and reasoning about tradeoffs. It produces a substantive decision with a rationale, conditions, and validation requirements, not a binary approval.

Judgment mechanisms (as defined by this specification) share several characteristics: they present multiple alternatives, they support investigation and comparison, they require substantive rationales, they record the authority under which the decision was made, and they connect the decision to downstream artifacts.

### 8.3 Two Failure Modes

The distinction matters because treating judgment as permission leads to two failure modes.

The first failure mode is rubber-stamping. When a consequential choice is presented as a permission request ("The agent wants to use Method A. Allow?"), the operator is encouraged to approve or reject without evaluating alternatives. The interaction does not surface what other options exist, what the tradeoffs are, or why Method A was proposed. The operator grants permission without exercising judgment. The system records that the operator "approved" the action, but the approval was not informed by an understanding of the alternatives.

The second failure mode is false accountability. When the operator clicks "approve" on a permission dialog, the system may record that the operator authorized the action. But if the operator was not presented with alternatives, did not understand the consequences, and was not given the opportunity to investigate, the approval is not an informed judgment. Recording it as one creates a misleading accountability record that suggests the operator evaluated and endorsed the decision when in fact they merely allowed the agent to proceed.

### 8.4 Practical Consequences

A practical consequence of this distinction is that systems implementing Judgment Points should not simply add a judgment layer on top of existing permission dialogs. The interaction model, the data structures, and the user experience are different.

Permission gates can remain as they are for access control and safety purposes. They serve a legitimate function: preventing agents from performing actions that should not occur at all. Judgment Points operate at a different level, addressing the substance of technical decisions rather than the mechanics of agent authorization.

A workflow may involve both permission and judgment at different points. An agent may need permission to access a database (a permission decision), and then need judgment about which records in that database to use as training data (a judgment decision). These are different questions requiring different mechanisms, and they should be handled by different subsystems.

### 8.5 Comparative Table

The following table summarizes the key differences between permission and judgment mechanisms:

| Property               | Permission                                               | Judgment                                                                      |
| ---------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Core question          | "May the agent do this?"                                 | "Which option should be selected, and why?"                                   |
| Response type          | Binary (allow/deny)                                      | Selection from alternatives with rationale                                    |
| Alternatives presented | None (the proposed action is the only option)            | Two or more defensible options                                                |
| Rationale required     | No                                                       | Yes                                                                           |
| Downstream connection  | None (the permission does not connect to dependent work) | Connected to artifacts and downstream decisions                               |
| Materiality assessment | Not applicable                                           | Six-dimension assessment determining intervention level                       |
| Audit value            | Records that an action was permitted                     | Records what was decided, why, under what authority, and with what conditions |
| Bias awareness         | Not applicable                                           | Captures recommendation exposure, initial position, information presented     |
| Revisability           | Not meaningful (the action either happened or did not)   | Resolutions can become stale, can be reopened, revised, and audited           |

This table illustrates that permission and judgment serve different functions and produce different types of records. Attempting to use a permission mechanism for judgment decisions produces a record that lacks alternatives, rationale, materiality assessment, bias awareness, and downstream connection. Attempting to use a judgment mechanism for simple permission decisions adds unnecessary overhead without corresponding benefit.

---

## 9. Product Scope

The Judgment Points product encompasses the following areas.

### 9.1 Specification

This document is the canonical specification. It defines the concepts, data structures, lifecycle behaviors, integration patterns, and evaluation criteria for Judgment Points. All implementations are measured against this specification.

### 9.2 JSON Schemas

JSON Schema definitions for all Judgment Point data structures provide a canonical, language-independent format for judgment records. The schemas are defined in the `schemas/` directory and use JSON Schema Draft 2020-12. They define the structure of Judgment Points, Judgment Policies, Judgment Resolutions, Judgment Events, and Artifact References.

### 9.3 Core Runtime Library

The core runtime library (`packages/judgment-core`) will implement the domain logic for creating, evaluating, resolving, and tracking Judgment Points. This includes the state machine for lifecycle transitions, materiality scoring, hard trigger evaluation, policy matching, authority assignment, dependency propagation, staleness detection, and event creation. The core library has no dependencies on UI frameworks, agent frameworks, model providers, or storage drivers.

### 9.4 Developer SDK

The developer SDK (`packages/judgment-sdk`) will provide a high-level programmatic API for working with Judgment Points. The SDK wraps the core library with a client-oriented interface suitable for application developers who want to integrate Judgment Points into their systems.

### 9.5 Schema Validation Library

The schema validation library (`packages/judgment-schemas`) provides TypeScript types generated from the JSON Schema definitions, along with validation utilities for checking documents against the schemas.

### 9.6 Storage Adapters

Storage adapters provide persistence for Judgment Point records. Two adapters are planned:

- In-memory (`packages/judgment-storage-memory`): suitable for tests and deterministic demonstrations. All data is held in memory and does not survive process termination.
- SQLite (`packages/judgment-storage-sqlite`): suitable for local development and single-node deployments. Data is persisted to a local file.

### 9.7 MCP Server

The Model Context Protocol server (`packages/judgment-mcp`) will expose Judgment Points as MCP resources and tools, enabling AI agents and LLM-based systems to interact with judgment records through the MCP protocol. Details are in Section 30.

### 9.8 LangGraph Adapter

The LangGraph adapter (`packages/judgment-langgraph`) will integrate Judgment Points into LangGraph-based agent workflows, using LangGraph's interrupt/resume mechanism for durable pausing at judgment decisions. Details are in Section 32.

### 9.9 Agent Skill Definitions

Agent Skill definitions in the `skills/` directory provide skill descriptions for agent systems that support the Agent Skills specification. Details are in Section 31.

### 9.10 Reference Applications

Three reference applications are provided:

- Review console (`apps/review-console`): the production review console served by `hmj serve` for human operators to review and resolve judgment points.
- Reference server (`backend/reference_server`): an HTTP API server providing endpoints for Judgment Point operations.
- Documentation site (`apps/documentation`): a documentation site covering the specification, API reference, integration guides, and tutorials.

### 9.11 UI Components

The UI component library (`packages/judgment-ui`) will provide accessible React components for rendering Judgment Point interactions, including judgment cards, comparison views, judgment markers, and judgment panels.

### 9.12 Evaluation Framework

The evaluation framework in the `evals/` directory provides tools for measuring detection quality, workflow burden, technical usefulness, and human engagement. Details are in Section 36.

### 9.13 Monorepo Structure

The project is organized as a monorepo managed by pnpm workspaces. The monorepo structure supports coordinated development across all packages, shared configuration (TypeScript, ESLint, Prettier), atomic commits that span multiple packages, and consistent versioning. The following directory layout applies:

- `schemas/`: JSON Schema definitions (the canonical data model).
- `packages/`: All library packages (judgment-core, judgment-sdk, judgment-schemas, judgment-mcp, judgment-langgraph, judgment-storage-memory, judgment-storage-sqlite, judgment-ui).
- `apps/`: Applications (review-console, documentation).
- `skills/`: Agent Skill definitions.
- `evals/`: Evaluation framework (trigger-detection, interruption-burden, workflow-comparison, fixtures).
- `docs/`: This specification and supporting documentation.

Development requires Node.js >= 22 and pnpm >= 10. The project uses TypeScript for all packages, Vitest for testing, ESLint and Prettier for code formatting, and tsup for building library packages. The project is licensed under Apache-2.0.

---

## 10. Non-Goals

The following are explicitly outside the scope of this specification and project.

### 10.1 General-Purpose Approval Workflows

Judgment Points are not a general workflow approval system. They are specific to consequential technical choices in agent-assisted work. Document routing, managerial sign-off chains, procurement approvals, and administrative approval processes are out of scope. These processes have their own established tools and patterns, and Judgment Points are not intended to replace them.

### 10.2 Replacing Existing Access Control

Judgment Points do not replace permission systems, file access controls, or security authorization mechanisms. They complement these systems by operating at the level of technical decision-making rather than access management. An agent may need both permission (to access a resource) and judgment (to decide how to use that resource). These are handled by separate mechanisms.

### 10.3 Automating Judgment Away

The goal is not to build a system that eliminates the need for human judgment. Even where delegation is supported, the purpose is to make the delegation explicit and auditable, not to remove humans from the decision process entirely. The specification's value proposition is structured decision-making, not automated decision-making.

### 10.4 Real-Time Collaboration

This specification does not define mechanisms for multiple users to simultaneously investigate and resolve the same Judgment Point in real time. Collaborative resolution is supported through the authority model (one person can delegate to another, or multiple people can be consulted through review requests), but the system does not provide real-time collaborative editing, shared cursors, presence indicators, or other real-time collaboration features.

### 10.5 Natural Language Understanding of Decisions

The specification does not require that the system understand the semantic content of judgment rationales, alternative descriptions, or context fields. These fields are human-readable text stored as strings. The system operates on the structured metadata (categories, scores, statuses, identifiers) rather than the prose content. Natural language understanding could enhance the system (for example, by automatically detecting when a rationale is too vague), but it is not a requirement.

### 10.6 Prescriptive Domain Expertise

The specification does not contain domain-specific rules for what constitutes a correct judgment in any particular field. It provides the structure for recording and tracking judgments, not the expertise for making them. Domain-specific rules can be encoded in policies, but the specification itself is domain-neutral. A thermal engineer and a software architect would both use the same Judgment Point structure and lifecycle, even though the substance of their judgments is entirely different.

### 10.7 Performance Benchmarks or Latency Guarantees

The specification defines behavior, not performance requirements. Implementations are free to optimize for their specific deployment context. The specification does not prescribe maximum response times, minimum throughput, or scalability targets.

### 10.8 Replacing Professional Standards

Judgment Points do not replace professional engineering standards, regulatory requirements, or organizational quality management processes. They can complement these processes by providing structured records that support compliance, but they are not a substitute for domain-specific standards such as ASME V&V, ISO 9001, or FDA 21 CFR Part 11.

### 10.9 Cross-Organization Judgment Sharing

The specification does not define mechanisms for sharing judgment records between organizations. While the JSON Schema provides a common data format that could enable interoperability, the governance of shared judgment records (who can see them, who can reference them, how conflicts between organizations' judgments are resolved) is outside the current scope. Organizations that wish to share judgment records must define their own agreements about access, attribution, and interpretation.

### 10.10 Machine Learning from Judgment Records

The specification does not define mechanisms for training machine learning models from accumulated judgment records. While judgment records contain structured decision data that could be valuable for training (questions, alternatives, resolutions, rationales, materiality assessments), the ethical, legal, and practical considerations of using decision records for model training are substantial and outside the scope of this specification. Organizations should carefully consider the implications before using judgment records for any form of automated learning.

---

## 11. Product Primitives

The Judgment Points system is composed of eight product primitives. Each primitive is a distinct concept with a defined role in the overall system. This section defines each primitive and describes its relationship to the others.

### 11.1 Judgment Policy

A Judgment Policy is a named, versioned set of rules that governs how the system responds to detected judgment candidates. Policies define the conditions under which work must pause, when comparison is required, when choices may be delegated to agents, and what authority mode applies to a given decision.

Each policy has the following structural elements:

- An identifier and human-readable name.
- A description of what the policy governs and why it exists.
- A scope definition that specifies which Judgment Points the policy applies to. Scope can be defined by judgment categories (such as "only method and assumption judgments"), trigger sources (such as "only agent-detected candidates"), artifact types (such as "only decisions affecting model artifacts"), and materiality score ranges.
- An ordered list of rules. Each rule has a condition (which a Judgment Point must match), an intervention level (what the system should do when the condition matches), optional authority overrides, and optional delegation conditions.
- A priority value used for precedence ordering when multiple policies match the same Judgment Point.
- An enabled flag. Disabled policies are retained for audit purposes but are not evaluated during matching.

Policies are the primary mechanism for adapting the system's behavior to different projects, teams, or domains. A research team with high risk tolerance might configure policies that allow agent delegation for most method judgments. A team working on a safety-critical system might configure policies that require human authority for all judgments above a low materiality threshold.

The JSON Schema for Judgment Policies is defined in `schemas/judgment-policy.schema.json`. The policy model is described in detail in Section 16.

### 11.2 Judgment Candidate

A Judgment Candidate is a proposed Judgment Point that has been detected but not yet confirmed. Candidates are generated by the detection process (Section 22) and represent potential consequential choices that may require human involvement.

Not all candidates become Judgment Points. The evaluation process (described in the runtime sequence, Section 19) assesses each candidate's materiality and applies applicable policies to determine whether it should be promoted to a pending Judgment Point, logged silently at the trace level, or discarded.

Candidates enter the system with status `candidate`. If evaluation determines that the candidate warrants attention (its materiality score exceeds the relevant threshold, or a hard trigger applies), it is promoted to status `pending` and becomes a full Judgment Point. If evaluation determines that the candidate does not warrant attention, it is logged as a trace-level event and execution continues.

The candidate stage serves as a filter that prevents low-consequence decisions from interrupting the workflow while ensuring that genuinely consequential choices are surfaced. The quality of this filter depends on the accuracy of materiality scoring and the appropriateness of policy thresholds.

### 11.3 Judgment Point

A Judgment Point is the central record in the system. It represents a consequential choice that has been confirmed as requiring attention and is moving through the resolution lifecycle.

A Judgment Point contains:

- The question being decided, stated clearly enough that a reviewer can understand it without additional context.
- The context surrounding the choice: why it has arisen, what circumstances surround it, and what the current state of the workflow is.
- The category of technical choice (one of the eight categories defined in Section 12).
- The trigger that initiated detection (how the candidate was identified).
- The materiality assessment (six dimension scores, an aggregate score, and the resulting intervention level).
- The available alternatives (at least two, each with a label, description, tradeoffs, evidence references, and source).
- The authority assignment (who or what is authorized to resolve the decision).
- The resolution (if one has been recorded), including the selected alternative, rationale, conditions, uncertainties, and validation requirements.
- Validity conditions that define when the resolution remains appropriate.
- Reopen conditions that define when the decision should be revisited.
- References to the artifacts that depend on the decision.
- A revision history recording all changes to the Judgment Point's status and resolution.
- Creation and update timestamps.

The JSON Schema for Judgment Points is defined in `schemas/judgment-point.schema.json`. The lifecycle states and transitions are described in Section 18.

### 11.4 Judgment Resolution

A Judgment Resolution is the recorded outcome of a Judgment Point. It captures the substantive result of the decision process: what was decided, why, under what conditions, and with what acknowledged uncertainties.

A resolution includes:

- The identifier of the selected alternative.
- A rationale explaining why this alternative was selected. The rationale should be substantive enough that a reviewer can understand the reasoning without needing to reconstruct the original context.
- The resolution type (direct-human, collaborative, delegated, rule-based, or inherited).
- Known uncertainties at the time of resolution.
- Conditions applied to the resolution (constraints on how the selected approach should be implemented or boundaries within which the resolution is valid).
- Validation requirements (checks that must be performed after the resolution is applied to confirm that it produces acceptable results).
- The timestamp and identity of the resolver.

The standalone resolution schema (defined in `schemas/judgment-resolution.schema.json`) extends the embedded resolution within a Judgment Point with additional fields that support accountability and bias-awareness:

- The list of alternatives that were considered before resolution.
- Whether an AI-generated recommendation was displayed to the decision-maker before resolution.
- The decision-maker's initial position (stated before seeing AI recommendations).
- Descriptions of what information was shown to the decision-maker.

These additional fields do not change the resolution outcome. They provide metadata that supports retrospective analysis of how decisions were made and whether cognitive biases may have influenced the outcome.

### 11.5 Judgment Dependency

A Judgment Dependency is the relationship between a Judgment Point and the artifacts or other Judgment Points that depend on it. Dependencies enable the system to propagate the effects of changes: when a Judgment Point is reopened, revised, or invalidated, the system can identify which downstream work may be affected and mark it for review.

Dependencies are expressed through two mechanisms:

- The `affectedArtifactIds` field on a Judgment Point, which lists identifiers of artifacts whose correctness depends on the decision.
- Artifact references with specific relationship types (`depends-on`, `informs`, `produced-by`, `validates`, `contradicts`), which describe the nature and direction of the dependency.

Dependency propagation is described in Section 25. The key behavior is that when an upstream judgment changes, downstream items are evaluated for staleness rather than automatically invalidated. A downstream artifact that depends on an upstream judgment may still be valid even if the upstream judgment is revised, depending on what changed and how the downstream artifact uses the upstream decision.

### 11.6 Judgment Review

A Judgment Review is a request for a second opinion on a Judgment Point. Reviews may be initiated by the original decision-maker (who wants confirmation), by a policy rule (which requires independent review for certain categories of decisions), or by the system (when conditions suggest that a prior resolution should be re-examined, such as when a critic agent flags a potential issue).

A review does not override the existing resolution. It creates a record that the resolution was examined by another party. The reviewer may confirm the resolution, raise concerns, suggest a different alternative, or recommend that the Judgment Point be reopened for full re-investigation.

Reviews are tracked through the event model (Section 28) and the revision history on the Judgment Point record. The system does not prescribe a specific review workflow; it provides the data structures for recording that a review occurred and what its findings were.

### 11.7 Judgment Event

A Judgment Event is an immutable record of a lifecycle action taken on a Judgment Point. Events form an append-only audit log that captures every state transition, artifact linkage, alternative addition, comparison request, and resolution recording. Events are never modified or deleted once created.

Each event records:

- A unique identifier.
- The Judgment Point it belongs to.
- The project it belongs to.
- The event type (from a defined enumeration of 15 event types).
- The timestamp when the event occurred.
- The actor who caused the event (identified by an ID and a type: user, agent, system, or policy).

Events may also include a payload (event-specific structured data) and metadata (correlation identifiers, session identifiers, tool names, policy identifiers, status transitions, and free-form notes).

The event model is described in detail in Section 28. The JSON Schema for events is defined in `schemas/judgment-event.schema.json`.

### 11.8 Judgment Authority

A Judgment Authority defines who or what is empowered to resolve a particular Judgment Point. Authority is not a global setting; it is assigned per Judgment Point based on policies, the judgment category, the materiality score, and any applicable delegation conditions.

The four authority modes are:

**Human.** Resolution requires a direct human decision. The agent may provide analysis and recommendations, but the human must make the final selection and provide the rationale. This mode is appropriate for high-materiality decisions, decisions with regulatory accountability requirements, and decisions that involve value-laden tradeoffs that the responsible party should personally evaluate.

**Collaborative.** The human and agent work together on the resolution. The agent performs investigation, comparison, and analysis. The human reviews the agent's work and makes the final decision. The distinction from human mode is one of emphasis: in collaborative mode, the agent's analytical contribution is an expected and valued part of the process. The human retains final authority.

**Delegated.** The agent is authorized to resolve the Judgment Point under the terms of an explicit delegation policy. Delegation is never implicit. A delegation policy must specify the conditions under which delegation is permitted, the maximum materiality score for delegated decisions, and whether delegated resolutions require subsequent human audit. The delegation and its conditions are part of the judgment's audit trail.

**Rule.** The resolution is determined by an external standard, requirement, or predefined rule. No discretionary judgment is required because the answer is dictated by a binding constraint. This mode applies when a regulatory specification, a contractual requirement, or an industry standard leaves no room for interpretation in the specific situation.

Authority assignment and delegation are described in detail in Section 17.

---

## 12. Judgment Categories

Every Judgment Point is classified into one of eight categories. Categories describe the nature of the technical choice, not its severity or urgency. The same category can appear at any materiality level. A parameter judgment can be trivial (choosing output precision) or critical (choosing a safety factor). Categories serve three purposes: they help organize judgment records for retrieval and review, they enable category-specific policies (for example, requiring human authority for all objective judgments), and they provide a shared vocabulary for discussing the types of decisions that arise in technical work.

### 12.1 Objective

An objective judgment concerns the definition or refinement of the goal itself. What is the analysis trying to accomplish? What question is being answered? What outcome would constitute success? What scope is appropriate?

Objective judgments arise when the stated goal is ambiguous, when multiple valid interpretations exist, or when the scope of the work needs to be defined, narrowed, or expanded. They are typically the highest-level judgments in a workflow and often affect everything downstream.

Example: An agent is asked to "analyze the thermal performance of a heat exchanger." This could mean predicting steady-state outlet temperatures, evaluating transient thermal response under startup conditions, comparing multiple heat exchanger designs against a thermal specification, or assessing compliance with a thermal standard. Clarifying the objective is a judgment about what the work should accomplish, and different clarifications lead to fundamentally different analyses.

A second example: An agent is asked to "optimize the controller." This could mean minimizing overshoot, minimizing settling time, maximizing disturbance rejection, or finding a Pareto-optimal balance among multiple performance criteria. Each interpretation leads to a different optimization formulation with different objective functions, constraints, and success criteria. Choosing among these interpretations is an objective judgment.

Objective judgments are frequently associated with Hard Trigger 1 (objective redefinition) because any change to the objective after work has begun requires reassessing all downstream decisions.

**Cross-references.** Objective judgments often cascade into framing judgments (Section 12.2), because a change in the objective typically requires reframing the problem. They also affect interpretation judgments (Section 12.8), because what counts as a meaningful result depends on what the analysis is trying to accomplish. A materiality assessment for an objective judgment typically scores high on downstream influence (dimension 14.2) because the objective shapes everything that follows.

### 12.2 Framing

A framing judgment concerns how the problem is structured, bounded, or decomposed. Even when the objective is clear, there are typically multiple valid ways to frame the analysis. Framing decisions include choosing what to include and exclude, deciding which aspects of the problem to treat in detail versus which to simplify, and determining the conceptual structure of the approach.

Example: A structural analysis can be framed as a full 3D finite-element problem, a 2D plane-stress approximation, or a beam-element model. Each framing makes different assumptions about the geometry, loading, and boundary conditions. The choice of framing affects every subsequent step: the data requirements, the computational methods, the validation approach, and the conclusions that can be drawn.

A second example: A data analysis task can be framed as a hypothesis-testing problem (is there a significant difference between groups?) or as an estimation problem (what is the best estimate of the effect size?). Each framing leads to different statistical methods, different data requirements, and different forms of the conclusions.

Framing judgments are distinct from method judgments (which concern how the framed problem is solved) and assumption judgments (which concern specific simplifications within the chosen frame).

**Cross-references.** Framing is upstream of method (Section 12.4): the framing determines which methods are available. Framing also shapes what data is needed (Section 12.5), because different framings require different inputs. Framing judgments are often associated with Hard Trigger 3 (exclusion of data or scope) when the framing decision involves excluding aspects of the problem from consideration.

### 12.3 Assumption

An assumption judgment concerns the selection of assumptions that underpin the analysis. Technical work always involves assumptions about boundary conditions, material properties, loading scenarios, environmental factors, initial conditions, and other aspects of the problem that are not directly measured or derived from first principles.

When multiple defensible assumptions exist for the same aspect of the problem, choosing among them is a judgment. The key criterion is that the assumption is a choice, not a necessity: at least one alternative assumption exists and could be defensibly adopted.

Example: Assuming that convection coefficients are constant versus temperature-dependent, or that a material behaves linearly versus nonlinearly, or that boundary conditions are steady-state versus time-varying, are assumption judgments that affect the validity and applicability of results. Each assumption has implications for the complexity of the analysis, the data requirements, and the range of conditions under which the results are valid.

A second example: In a machine learning workflow, assuming that the data is independent and identically distributed (i.i.d.) versus acknowledging temporal or spatial correlation is an assumption judgment. If the data has hidden structure, the i.i.d. assumption leads to incorrect uncertainty estimates and potentially misleading cross-validation results. Choosing to acknowledge correlation requires more complex modeling but produces more reliable results.

**Cross-references.** Assumption judgments are closely related to validation judgments (Section 12.7), because the validity of an assumption can often be checked against data. They are associated with Hard Trigger 4 (assumption with measurable alternatives) when a measurable alternative exists. Assumptions interact with data judgments (Section 12.5): the available data may constrain which assumptions are defensible, and the chosen assumptions may determine what additional data is needed.

### 12.4 Method

A method judgment concerns the selection of a computational, analytical, or experimental approach. When multiple valid methods exist for addressing a problem (as framed and with the adopted assumptions), choosing among them requires weighing accuracy, computational cost, ease of validation, implementation complexity, and suitability for the specific problem.

Example: Choosing between a lumped-capacitance thermal model and a discretized finite-difference model, or between a Monte Carlo simulation and an analytical closed-form approximation, or between a gradient-based optimizer and an evolutionary algorithm, are method judgments. Each method has different accuracy characteristics, computational costs, and domains of applicability.

A second example: In statistical analysis, choosing between a parametric test (which assumes a specific distribution) and a non-parametric test (which makes fewer distributional assumptions) is a method judgment. The parametric test has more statistical power when its assumptions are met, but the non-parametric test is more robust when the assumptions are violated. The choice depends on the analyst's assessment of whether the distributional assumptions are satisfied for the particular dataset.

Method judgments are frequently associated with Hard Trigger 2 (framework or methodology selection) when they involve top-level methodology choices that determine the structure of the entire analysis.

**Cross-references.** Method judgments are downstream of framing judgments (Section 12.2), which determine the problem structure. They are upstream of parameter judgments (Section 12.6), because the selected method determines which parameters must be set. Method judgments also shape what validation is feasible (Section 12.7), because different methods have different verification and validation approaches.

### 12.5 Data

A data judgment concerns the selection, filtering, transformation, or interpretation of input data. Technical workflows routinely involve choices about which data sources to use, how to handle missing or conflicting data, what transformations to apply, what quality criteria to enforce, and how to assess data fitness for the intended purpose.

Example: Choosing between two material property databases that report different values for the same property, deciding whether to include or exclude outliers in a dataset, selecting the appropriate temperature range for property correlations, choosing between raw and processed data for model calibration, or deciding how to interpolate between discrete data points are all data judgments.

Data judgments are consequential because the input data fundamentally determines the output. A poor data choice can invalidate the entire analysis, even if every subsequent step is performed correctly.

**Cross-references.** Data judgments interact with assumption judgments (Section 12.3): the choice of data source may validate or invalidate assumptions about data quality, coverage, and representativeness. Data judgments are associated with Hard Trigger 3 (exclusion of data or scope) when the judgment involves excluding data from the analysis. They also connect to validation judgments (Section 12.7), because data quality assessment is a form of validation.

### 12.6 Parameter

A parameter judgment concerns the selection of specific numerical values that are not directly derivable from data or theory. Parameters include model coefficients, convergence criteria, mesh densities, time step sizes, safety factors, regularization constants, and other quantities that must be chosen by the analyst based on experience, guidelines, and the specific requirements of the problem.

Example: Selecting the number of nodes in a reduced-order model, choosing a convergence tolerance for an iterative solver, setting a safety factor for a structural calculation, choosing a learning rate for a machine learning model, or selecting a smoothing parameter for a filter involves parameter judgments.

Parameter judgments can range from trivial (choosing output decimal places) to critical (choosing a safety factor that determines whether a structure is deemed adequate). The materiality assessment captures this variation.

**Cross-references.** Parameter judgments are downstream of method judgments (Section 12.4): the method determines which parameters are needed. They interact with validation judgments (Section 12.7) through sensitivity analysis: a validation judgment might require demonstrating that results are insensitive to a parameter choice within a defined range. Parameter judgments are associated with Hard Trigger 5 (sensitivity threshold selection) when the parameter controls what the analysis considers significant.

### 12.7 Validation

A validation judgment concerns the criteria and methods used to assess whether results are acceptable. Deciding what constitutes adequate agreement with reference data, what error tolerances to apply, what validation metrics to compute, what benchmarks to compare against, and whether a sensitivity analysis is sufficient are all validation judgments.

Example: Deciding whether a 5% deviation from reference data is acceptable for a given application, choosing which validation metrics to report (RMS error, maximum error, correlation coefficient), determining whether a mesh convergence study with three refinement levels is sufficient, or evaluating whether a sensitivity analysis covers the relevant parameter space are validation judgments.

Validation judgments are particularly important because they determine whether the work product is considered "done" and "correct." A lenient validation criterion may mask significant errors, while an overly strict criterion may reject an adequate analysis and drive unnecessary rework.

**Cross-references.** Validation judgments are downstream of method judgments (Section 12.4), because the method determines what validation is appropriate. They interact with assumption judgments (Section 12.3): validating assumptions is a common form of validation activity. Validation judgments connect to interpretation judgments (Section 12.8), because the interpretation of validation results (is the agreement "good enough"?) is itself a judgment. Validation judgments are associated with Hard Trigger 5 (sensitivity threshold selection) and Hard Trigger 7 (results contradict expectations).

### 12.8 Interpretation

An interpretation judgment concerns the meaning and implications of results. After computation is complete, the results must be interpreted: what do they mean in the context of the original objective, what conclusions can be drawn, what limitations should be noted, what recommendations should be made, and how confident should the analyst be in the findings.

Example: Interpreting whether a predicted temperature of 425 K at a component surface is "safe" requires judgment about applicable thermal limits, safety margins, the intended operating conditions, and the confidence in the prediction. Two analysts may interpret the same numerical result differently depending on their assessment of the relevant context. One may conclude that the component is adequate with margin, while another may conclude that the margin is insufficient given the uncertainties in the analysis.

Interpretation judgments are frequently associated with Hard Trigger 8 (final interpretation and conclusion) because the conclusions of an analysis are the primary deliverable and require explicit judgment about meaning, significance, and caveats.

A second example: An agent computes a correlation coefficient of 0.72 between two variables. Interpreting this as "strong," "moderate," or "weak" correlation depends on the domain, the sample size, the intended use of the finding, and the decision-maker's standards for what constitutes a meaningful relationship. In some domains (psychology, social science), 0.72 would be considered strong. In others (physics, precision engineering), it might be considered inadequate.

**Cross-references.** Interpretation judgments are downstream of all other categories, because interpretation synthesizes the results of the entire analysis chain. They are particularly connected to validation judgments (Section 12.7): the interpretation must acknowledge the limitations revealed by the validation process. Interpretation judgments also connect back to objective judgments (Section 12.1), because the interpretation must be evaluated against the original objective to determine whether the analysis achieved its purpose.

---

## 13. Hard Triggers

Hard triggers are conditions that always require a Judgment Point to be created, regardless of the materiality score. When a hard trigger condition is met, the system bypasses the normal materiality-based evaluation and immediately creates a judgment candidate at the `pause` or `require-investigation` intervention level. Hard triggers represent situations where the nature of the choice demands explicit attention, independent of any quantitative assessment.

Hard triggers exist because some types of decisions are categorically important, not just quantitatively important. A decision to redefine the project objective is consequential by its nature, regardless of whether the materiality scoring formula produces a high number. Hard triggers ensure that these categorically important decisions are never filtered out by the scoring system.

The following ten hard triggers are defined in this specification.

### 13.1 Objective Redefinition

The agent proposes to change, narrow, or expand the stated objective of the analysis. Because the objective defines what the work is trying to accomplish, any change to it affects the relevance and validity of all subsequent work. This trigger fires whenever the agent's proposed next step would alter the question being answered or the scope of the analysis.

### 13.2 Framework or Methodology Selection

The agent selects a modeling framework, analytical methodology, or computational approach when more than one defensible option exists. This trigger applies specifically to top-level methodology choices that determine the structure of the entire analysis, not to routine tool selection within an established methodology. Selecting "finite difference vs. finite element" is a framework selection. Selecting "which finite-element solver to use" is typically a routine tool selection (unless the solvers produce meaningfully different results for the problem at hand).

### 13.3 Exclusion of Data or Scope

The agent proposes to exclude data points, variables, scenarios, failure modes, or other aspects of the problem from the analysis. Exclusion decisions are consequential because they determine what the analysis does not consider, which may be as important as what it does consider. An exclusion that removes a critical failure mode from a safety analysis, or that drops outlier data points that actually represent real operating conditions, can fundamentally compromise the analysis.

### 13.4 Assumption with Measurable Alternatives

The agent adopts an assumption when at least one measurable alternative exists. This trigger distinguishes between assumptions that are genuinely necessary (no alternative approach is available given current knowledge) and assumptions that represent a choice among options. When a measurable alternative exists, the choice between the assumption and the alternative should be made explicitly rather than by default.

### 13.5 Sensitivity Threshold Selection

The agent selects a threshold, tolerance, or criterion for determining what counts as significant, acceptable, or converged. These thresholds directly control what the analysis considers noteworthy and what it ignores. A convergence criterion that is too loose may accept an unconverged solution. An acceptance threshold that is too lenient may approve an inadequate result. These choices should be made deliberately.

### 13.6 Conflicting Evidence

The agent encounters data, standards, references, or other evidence sources that conflict with each other or with the current approach. Proceeding in the face of conflict requires a judgment about which source to trust, how to reconcile the disagreement, or how to characterize the uncertainty introduced by the conflict. Silently choosing one conflicting source over another without flagging the conflict is a failure of transparency.

### 13.7 Results Contradict Expectations

The computed results deviate substantially from prior expectations, reference data, analytical estimates, or established norms. This trigger ensures that unexpected results are examined rather than silently accepted. Unexpected results may indicate an error in the analysis, an incorrect assumption, or a genuine physical phenomenon that was not anticipated. In all cases, the discrepancy warrants explicit examination.

### 13.8 Final Interpretation and Conclusion

The agent formulates conclusions, recommendations, or interpretations based on the analysis results. Because conclusions are what the work ultimately communicates to its audience, they require explicit judgment about meaning, significance, appropriate caveats, and recommendations. An agent's interpretation should be reviewed and endorsed by the responsible party before it becomes a conclusion of the work.

### 13.9 Delegation of Judgment to a Sub-Agent

The agent delegates a consequential decision to another agent, tool, or automated process. Delegation of judgment is itself a judgment about whether the delegatee is competent and appropriate for the decision. It requires explicit authorization and creates an additional link in the accountability chain. This trigger ensures that delegation decisions are visible and recorded.

### 13.10 Revision of a Prior Judgment

The agent proposes to change, override, or revisit a previously resolved Judgment Point. Because prior judgments may have downstream dependencies (other decisions, computations, and conclusions that rely on the prior resolution), revising them requires explicit consideration of the ripple effects. This trigger ensures that revisions are deliberate and that their downstream impact is assessed.

Hard triggers can be referenced in policies through the `hardTrigger` field in rule conditions, allowing policies to define specific intervention levels and authority modes for each trigger type. For example, a policy might specify that Hard Trigger 1 (objective redefinition) always requires the `require-investigation` intervention level with `human` authority, while Hard Trigger 5 (sensitivity threshold selection) requires only the `pause` level with `collaborative` authority.

---

## 14. Materiality Dimensions

The materiality assessment evaluates how consequential a particular choice is along six independent dimensions. Each dimension is scored on a scale from 0 to 3, producing an aggregate score from 0 to 18. The aggregate score, combined with applicable policies and hard trigger conditions, determines the intervention level for the Judgment Point.

The six dimensions are designed to be orthogonal: each captures a different aspect of consequentiality that is not fully captured by the others. A decision can score high on one dimension and low on others. The aggregate score provides a single number for threshold comparisons, but the individual dimension scores provide richer information for policy matching and for understanding why a particular decision was flagged.

### 14.1 Methodological Discretion

This dimension measures the degree to which the choice involves discretionary selection among valid approaches. It captures how much room for judgment exists in the decision.

| Score | Level    | Description                                                                                                                                                                                                                     |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | None     | No discretion is involved. The approach is fully determined by constraints, standards, or prior commitments. There is only one valid option.                                                                                    |
| 1     | Low      | Minor discretionary elements exist, but the range of defensible options is narrow and well-understood. Competent practitioners would generally agree on the approach, with only minor variations.                               |
| 2     | Moderate | Multiple defensible approaches exist with meaningfully different characteristics. The selection requires informed judgment about tradeoffs, and reasonable practitioners might choose differently.                              |
| 3     | High     | The choice among approaches involves substantial uncertainty about which is most appropriate. Different experts would reasonably select different options based on their experience, priorities, and assessment of the problem. |

### 14.2 Downstream Influence

This dimension measures how broadly the decision affects subsequent work. It captures the propagation scope of the choice.

| Score | Level    | Description                                                                                                                                                                                                |
| ----- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | None     | The decision is self-contained and does not affect other parts of the workflow. Changing the decision would not require any rework.                                                                        |
| 1     | Low      | The decision affects a small number of immediately adjacent steps or artifacts. Changing the decision would require localized rework.                                                                      |
| 2     | Moderate | The decision affects multiple downstream steps, and changing the decision would require rework of a significant portion of the analysis. Several artifacts depend on this choice.                          |
| 3     | High     | The decision propagates throughout the workflow. Virtually all subsequent work depends on or is influenced by this choice. Changing the decision would require restarting a major portion of the analysis. |

### 14.3 Uncertainty

This dimension measures the degree of uncertainty surrounding the choice and its consequences. It captures how much is unknown about the decision's effects.

| Score | Level    | Description                                                                                                                                                                                               |
| ----- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | None     | The consequences of the choice are well-understood and predictable. The decision-maker can confidently predict what will happen.                                                                          |
| 1     | Low      | Some uncertainty exists, but the range of possible outcomes is narrow and the risks are well-characterized. The decision-maker has a good understanding of what might go wrong.                           |
| 2     | Moderate | Meaningful uncertainty exists about the consequences. The choice could produce significantly different outcomes depending on conditions that are not fully known. Some risks are difficult to quantify.   |
| 3     | High     | Substantial uncertainty exists. The consequences of the choice are difficult to predict, and the decision must be made with incomplete information about critical factors. There may be unknown unknowns. |

### 14.4 Consequence

This dimension measures the severity of a wrong or suboptimal decision. It captures the cost of getting the decision wrong.

| Score | Level    | Description                                                                                                                                                                                            |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | None     | An incorrect decision has negligible impact. No significant resources are wasted, and no incorrect conclusions are drawn.                                                                              |
| 1     | Low      | An incorrect decision wastes some effort or produces minor inaccuracies, but the impact is limited and easily corrected within the current workflow.                                                   |
| 2     | Moderate | An incorrect decision leads to significant rework, produces misleading results that could affect decisions by others, or undermines the reliability of downstream conclusions.                         |
| 3     | High     | An incorrect decision could lead to fundamentally wrong conclusions, unsafe designs, regulatory non-compliance, publication of erroneous results, or irreversible commitment of significant resources. |

### 14.5 Reversibility

This dimension measures how easily the decision can be changed after it has been made and its effects have propagated. It captures the cost of changing one's mind.

| Score | Level       | Description                                                                                                                                                                                                                                                  |
| ----- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | Trivial     | The decision can be reversed instantly at no cost. No downstream effects need to be updated.                                                                                                                                                                 |
| 1     | Easy        | The decision can be reversed with modest effort. Some rework is required, but it is straightforward and bounded.                                                                                                                                             |
| 2     | Difficult   | Reversing the decision requires substantial rework, re-computation, or re-analysis. The cost of reversal is significant in terms of time, compute resources, or effort, but not prohibitive.                                                                 |
| 3     | Impractical | Reversing the decision is impractical or impossible within the constraints of the project. The choice creates commitments that cannot be undone, such as manufactured hardware, published results, submitted regulatory filings, or contractual obligations. |

### 14.6 Accountability Requirement

This dimension measures the degree to which external requirements demand that this decision be documented, justified, and attributable to a specific authority. It captures the regulatory and professional context of the decision.

| Score | Level    | Description                                                                                                                                                                                                                                   |
| ----- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | None     | No external accountability requirements apply to this decision. The decision is purely internal and informal.                                                                                                                                 |
| 1     | Low      | Internal best practices suggest documenting the decision, but no formal requirement exists. The decision falls within normal professional practice without specific documentation mandates.                                                   |
| 2     | Moderate | Professional standards, organizational policies, or quality management requirements call for documented justification of this type of decision. The decision may be subject to internal review or audit.                                      |
| 3     | High     | Regulatory, contractual, or legal requirements mandate that this decision be formally documented, justified, and attributable to a qualified authority. The decision may be subject to external audit, regulatory review, or legal discovery. |

---

## 15. Intervention Levels

The intervention level determines how the system responds to a detected judgment candidate. Four intervention levels are defined, mapped to ranges of the aggregate materiality score.

The score thresholds defined in this section are an unvalidated initial hypothesis. They have not been calibrated through user research, field testing, A/B experiments, or statistical analysis. They are included to make the specification concrete enough to implement. They will be revised based on empirical evaluation data gathered through the evaluation framework (Section 36). Implementors should treat these thresholds as tunable parameters, not as fixed requirements.

### 15.1 Trace (Score 0 to 4)

The system logs the judgment candidate and continues execution without interrupting the user. The judgment is recorded in the event log and is available for retrospective review, but the user is not notified during the workflow.

Trace-level judgments are appropriate for choices that are minimally consequential: the methodological discretion is low, the downstream influence is limited, the consequences of an error are minor, and the decision can be easily reversed. These choices are still recorded because they may be relevant during retrospective review, auditing, or when investigating the decision chain that led to a particular result.

The user can access trace-level judgments through the project view or by querying the event log. They are not presented proactively.

### 15.2 Disclose (Score 5 to 8)

The system surfaces the judgment candidate to the user without halting execution. The user is informed that a choice was made (or is about to be made) and can review the details at their convenience. The workflow continues without pausing.

Disclosure may take the form of a notification badge, a log entry in a visible activity panel, a marker in the work product, or a non-blocking alert. The specific presentation mechanism depends on the integration (MCP, LangGraph, WEEMS, or other).

The user can choose to engage with a disclosed judgment at any time: they can investigate further, change the selection, add alternatives, or escalate the judgment to the pause level. If the user does not engage, the agent's initial selection stands.

Disclose-level judgments are appropriate for choices that are moderately consequential but where the cost of interrupting the workflow outweighs the risk of proceeding without explicit authorization. They provide transparency without disruption.

### 15.3 Pause (Score 9 to 13)

The system halts execution and presents the Judgment Point to the user for resolution. Work does not continue until the user has reviewed the choice, considered the alternatives, and recorded a resolution (or delegated, dismissed, or deferred the decision).

The pause intervention ensures that moderately to highly consequential choices receive explicit attention before downstream work is performed. This is the most common intervention level for decisions that genuinely require human judgment: the decision is consequential enough that proceeding without authorization is inappropriate, but not so critical that mandatory investigation is required.

At the pause level, the user has full access to all primary actions (Section 34): choosing an alternative, comparing alternatives, investigating, adding alternatives, delegating, requesting review, or dismissing.

### 15.4 Require Investigation (Score 14 to 18)

The system halts execution and mandates structured investigation before resolution is permitted. The user must examine the alternatives, review the available evidence, and (where applicable) perform or request a structured comparison of the options before recording a resolution.

The require-investigation level adds a procedural requirement beyond the pause level: the system does not accept a resolution until investigation activities have been performed. This prevents the decision-maker from immediately selecting an option without engaging with the evidence and alternatives.

This level is appropriate for highly consequential choices where the decision has broad downstream impact, high uncertainty, significant irreversibility, and substantial accountability requirements. These are decisions where a hasty or unconsidered choice could have serious consequences and where the cost of mandatory investigation is justified by the importance of the decision.

The specific investigation activities required are not rigidly defined. The system requires that the decision-maker enter the `investigating` state and perform at least one investigative action (such as viewing a comparison, adding an alternative, or requesting additional evidence) before resolving. The depth and nature of investigation are left to the decision-maker's professional judgment.

### 15.5 Hard Trigger Override

When a hard trigger condition is met (Section 13), the intervention level is set to `pause` or `require-investigation` regardless of the materiality score. Hard triggers represent situations where the nature of the choice demands explicit attention, independent of the quantitative assessment.

The specific intervention level for each hard trigger can be configured through policies. In the absence of a policy specification, the default intervention level for hard triggers is `pause`. Policies can escalate specific hard triggers to `require-investigation` (for example, requiring investigation for all objective redefinition triggers) or can specify authority overrides for specific trigger types.

---

## 16. Policy Model

Policies govern the behavior of the Judgment Points system by mapping conditions to intervention levels and authority assignments. The policy model provides a structured, configurable mechanism for adapting the system's behavior to different projects, domains, and organizational requirements.

### 16.1 Policy Structure

A Judgment Policy contains the following elements:

- **Identifier.** A unique string that identifies the policy for reference in rules, events, and API operations.
- **Project identifier.** The project to which the policy belongs. Policies are scoped to projects.
- **Name.** A human-readable name that describes the policy's purpose (for example, "Safety-Critical Method Judgments" or "Low-Risk Parameter Delegation").
- **Description.** A detailed explanation of what the policy governs and why it exists. This description should be informative enough that a reviewer can understand the policy's intent without examining its rules.
- **Scope.** A definition of which Judgment Points the policy applies to, based on categories, trigger sources, artifact types, and materiality score ranges. All specified scope conditions must be met for the policy to match (logical AND). Conditions that are omitted match everything.
- **Rules.** An ordered list of rules. Each rule has a condition (evaluated against the Judgment Point), an intervention level, optional authority overrides, and optional delegation conditions. Rules are evaluated in order; the first matching rule determines the outcome.
- **Priority.** An integer used for precedence ordering. Lower numbers indicate higher priority.
- **Enabled.** A boolean flag. Disabled policies are retained but not evaluated.
- **Timestamps.** Creation and last-modified timestamps for auditing.

The JSON Schema for policies is defined in `schemas/judgment-policy.schema.json`.

### 16.2 Precedence Rules

When multiple policies match a given Judgment Point, the following precedence rules apply.

First, policies with lower priority values take precedence over policies with higher priority values. A policy with priority 0 takes precedence over a policy with priority 10. Priority values are non-negative integers.

Second, within a single policy, rules are evaluated in the order they appear in the rules array. The first rule whose condition matches determines the outcome for that policy. Subsequent rules are not evaluated. This sequential evaluation allows policies to express logic like "if the score is above 14, require investigation; otherwise, if it is above 9, pause; otherwise, disclose."

Third, when two policies have the same priority value (a tie), the system applies the more restrictive intervention level. The restrictiveness order is: trace (least restrictive), disclose, pause, require-investigation (most restrictive). This default-to-restrictive behavior ensures that when policies conflict at equal precedence, the system errs on the side of more human involvement rather than less.

### 16.3 Conflict Behavior

Policies interact through their scopes. A Judgment Point may match multiple policies simultaneously if their scopes overlap. The precedence rules described above resolve these overlaps deterministically. The system does not warn about overlapping policies, because overlap is a normal and expected configuration pattern (a project may have a general policy and a more specific policy that overrides it for certain categories).

If no policy matches a given Judgment Point, the system falls back to the default behavior determined by the materiality score and the intervention level thresholds defined in Section 15.

Disabled policies are retained in the system for audit purposes but are not evaluated during the matching process. Disabling a policy does not delete it or its history. Policies can be re-enabled at any time.

### 16.4 Rule Conditions

A rule condition is evaluated against a Judgment Point to determine whether the rule applies. Conditions can specify:

- **Minimum and maximum aggregate materiality scores.** If specified, the Judgment Point's aggregate score must fall within the specified range.
- **Dimension-level thresholds.** If specified, the condition matches when any specified dimension score meets or exceeds its threshold. This allows policies to trigger on specific dimensions regardless of the aggregate score (for example, "any decision with accountability requirement >= 3, regardless of total score").
- **Hard trigger name.** If specified, the condition matches when the Judgment Point was created by the named hard trigger, regardless of the materiality score.
- **Category list.** If specified, the Judgment Point's category must appear in the list.
- **Free-form expression.** An optional string for advanced condition matching. The expression language is not standardized in this specification; implementations may define their own.

All specified fields in a condition must match for the condition as a whole to match (logical AND). Fields that are omitted are not evaluated, meaning they match any value. An empty condition (no fields specified) matches everything.

### 16.5 Delegation Conditions

Delegation conditions define when automated or delegated resolution is permitted for a given policy rule. They provide fine-grained control over the boundary between human and agent authority.

- **Allowed.** A boolean indicating whether delegation is permitted at all for this rule. Defaults to false.
- **Maximum materiality score.** The highest aggregate materiality score for which delegation is permitted. Judgments above this threshold must be resolved by a human regardless of other conditions.
- **Required confidence.** The minimum detector confidence (0.0 to 1.0) required for delegation. This ensures that delegation only occurs when the detection system has high confidence in its assessment of the judgment.
- **Excluded categories.** Categories for which delegation is never permitted, even if all other conditions are met. This allows policies to reserve certain types of decisions (such as objective or interpretation judgments) for human authority regardless of materiality.
- **Requires prior human resolution.** If true, delegation is only allowed when a materially similar Judgment Point (same category, similar context) was previously resolved by a human. This ensures that delegated resolution follows an established precedent.
- **Audit required.** If true (the default), delegated resolutions are flagged for subsequent human review. This does not prevent delegation but ensures that a human will eventually examine the decision.

---

## 17. Authority and Delegation

Authority determines who or what may resolve a Judgment Point. Authority is assigned per Judgment Point based on the applicable policies, the judgment category, the materiality score, and the intervention level.

### 17.1 Authority Modes

Four authority modes are defined. These modes are not preferences or suggestions; they are binding assignments that the system enforces.

**Human.** The Judgment Point must be resolved by a human decision-maker. The agent may provide analysis, generate alternatives, perform comparisons, and present recommendations, but the final selection and rationale must come from a human. The system does not accept a resolution from an agent-type actor when the authority mode is human.

This mode is appropriate for high-materiality decisions, decisions with regulatory accountability requirements, decisions that involve value-laden tradeoffs, and decisions where the responsible party's personal endorsement is necessary for the work product to be valid.

**Collaborative.** The human and agent work together on the resolution. The agent performs investigation and comparison, and the human reviews the analysis and makes the final decision. The resolution is recorded as collaborative, indicating that the human's decision was informed by agent-generated analysis.

The distinction from human mode is one of emphasis and expectation. In human mode, agent involvement is permitted but not expected. In collaborative mode, agent involvement is an expected and valued part of the process. The human retains final authority in both modes.

**Delegated.** The agent is authorized to resolve the Judgment Point under the terms of an explicit delegation policy. Delegation requires that a delegation policy exists, that the policy's conditions are met, and that the delegation is recorded in the audit trail. The system does not delegate by default; delegation must be explicitly authorized.

When a Judgment Point is resolved through delegation, the resolution record indicates that it was delegated, identifies the delegation policy that authorized the delegation, and records whether audit is required. If audit is required, the delegated resolution is flagged for subsequent human review.

**Rule.** The resolution is determined by an external standard, requirement, or predefined rule. No discretionary judgment is required. The resolution records which rule or standard determined the answer and cites the applicable reference. This mode applies when the answer is dictated by a binding constraint that leaves no room for interpretation in the specific situation.

### 17.2 Authority Assignment

Authority is assigned through a defined process.

First, the system evaluates applicable policies. If a matching policy rule specifies an authority override, that authority mode is applied to the Judgment Point.

Second, if no policy specifies an authority override, the system applies default authority based on the intervention level:

- Trace and disclose levels: `delegated` authority (if a delegation policy exists and its conditions are met) or `collaborative` authority (otherwise).
- Pause level: `collaborative` authority.
- Require-investigation level: `human` authority.

Third, authority can be reassigned during the lifecycle of a Judgment Point. A human authority can delegate a specific Judgment Point to an agent, subject to the delegation conditions in the applicable policy. A delegated Judgment Point can be reclaimed by a human authority. These reassignments are recorded as events.

### 17.3 Delegation Constraints

Delegation is subject to constraints that prevent inappropriate automation of consequential decisions.

Delegation is never permitted for Judgment Points whose category appears in the `excludedCategories` list of the applicable delegation conditions. A policy that excludes the `objective` and `interpretation` categories ensures that objective-setting and conclusion-drawing decisions always require human authority, regardless of materiality.

Delegation is only permitted when the materiality score is at or below the `maxMaterialityScore` threshold. This ensures that high-stakes decisions are not delegated even if other conditions are favorable.

When `requiresPriorHumanResolution` is true, delegation is only allowed if a materially similar Judgment Point was previously resolved by a human. This precedent requirement ensures that the agent's delegated resolution follows an established pattern of human judgment, not a novel decision that has never been human-reviewed.

When `auditRequired` is true (the default), delegated resolutions are flagged for subsequent human review. The review may be immediate or deferred, but it must occur. This provides a safety net for delegation: even when delegation is appropriate, a human eventually verifies the agent's decision.

### 17.4 Delegation Example

Consider a research team that frequently selects numerical convergence tolerances during computational analysis. The team defines the following delegation policy:

**Policy name:** "Routine Parameter Delegation"
**Scope:** category = parameter, triggerSource = agent
**Rule:** If materialityScore <= 6 and detectorConfidence >= 0.8, then intervention = trace, authority = delegated.
**Delegation conditions:** allowed = true, maxMaterialityScore = 6, requiredConfidence = 0.8, excludedCategories = [objective, interpretation], requiresPriorHumanResolution = true, auditRequired = true.

This policy permits the agent to resolve parameter judgments with low materiality (score 6 or below) when the agent is confident in its detection, provided that a human previously resolved a similar judgment. The policy excludes objective and interpretation judgments from delegation regardless of their materiality. All delegated resolutions are flagged for human audit.

In practice, this means: the first time the agent encounters a convergence tolerance decision, it must be resolved by a human (because `requiresPriorHumanResolution` is true and no precedent exists). The human resolves it with a specific tolerance value and a rationale explaining why. The next time the agent encounters a similar convergence tolerance decision in a similar context, the delegation conditions are met, and the agent can resolve it by inheriting the prior resolution. The delegated resolution is flagged for audit, and a reviewer will eventually verify that the agent's inherited resolution was appropriate for the specific context.

This pattern provides efficiency (the agent handles routine, recurring decisions without interrupting the user) with accountability (the delegation is explicit, the precedent is documented, and every delegated resolution is audited).

---

## 18. Lifecycle and State Transitions

A Judgment Point moves through a defined set of states during its lifecycle. Each state represents a stage in the decision process, and transitions between states are governed by specific actions and conditions. All transitions are recorded as events in the append-only audit log.

### 18.1 States

The following eight states are defined.

**Candidate.** The initial state. A potential judgment has been detected but has not yet been evaluated against policies and materiality thresholds. Not all candidates become Judgment Points; many will be filtered out during evaluation and logged at the trace level.

**Pending.** The candidate has been promoted to a Judgment Point that requires attention. The choice has been identified, the alternatives have been described, the materiality has been assessed, the intervention level has been determined, and the authority has been assigned. The system is waiting for the assigned authority to engage with the Judgment Point.

**Investigating.** Active investigation of the Judgment Point is underway. The user or agent is examining alternatives, reviewing evidence, performing comparisons, adding new alternatives, or gathering additional information to inform the resolution. This state indicates that the Judgment Point has received attention but the decision-maker has not yet reached a conclusion.

**Resolved.** A resolution has been recorded. The selected alternative, rationale, conditions, validation requirements, and resolution metadata have been captured. The Judgment Point is considered decided. Resolved Judgment Points remain in the system indefinitely for auditing, dependency tracking, and reference purposes. A resolved Judgment Point can transition to `stale` or `reopened` if conditions change.

**Delegated.** Resolution authority has been delegated to an agent or automated process under an explicit delegation policy. This state indicates that the Judgment Point will be resolved by a delegatee rather than the originally assigned authority. The delegation record includes the policy under which delegation was authorized and whether audit is required.

**Dismissed.** The Judgment Point has been dismissed as not requiring a decision. This may occur when further investigation reveals that the choice is not actually consequential, that the question is moot because of changed circumstances, or that the candidate was generated in error. Dismissed Judgment Points remain in the audit trail with a recorded reason for dismissal. They can be reopened if subsequent information suggests the choice was consequential.

**Stale.** A previously resolved Judgment Point whose resolution may no longer be valid because conditions have changed. Staleness can be triggered by changes in upstream dependencies, failure of validity conditions, new data availability, revisions to applicable standards, or the passage of time beyond a defined validity window. Stale Judgment Points require re-examination by the assigned authority.

**Reopened.** A previously resolved or dismissed Judgment Point that has been explicitly reopened for reconsideration. Reopening creates a new revision in the judgment's history and initiates a new resolution cycle. The previous resolution is preserved in the revision history.

### 18.2 State Transitions

The following transitions are permitted. Each transition has a defined trigger condition.

| From          | To            | Trigger                                                                                 |
| ------------- | ------------- | --------------------------------------------------------------------------------------- |
| candidate     | pending       | Promotion after materiality evaluation determines the choice requires attention         |
| candidate     | (discarded)   | Evaluation determines the choice does not meet thresholds; logged at trace level        |
| pending       | investigating | The assigned authority begins examining the Judgment Point                              |
| pending       | resolved      | The assigned authority resolves directly without a separate investigation phase         |
| pending       | delegated     | Resolution authority is delegated under an explicit policy                              |
| pending       | dismissed     | The Judgment Point is dismissed as not requiring a decision                             |
| investigating | resolved      | Investigation is complete and a resolution is recorded                                  |
| investigating | delegated     | During investigation, the authority delegates resolution                                |
| investigating | dismissed     | Investigation reveals the choice is not consequential or is moot                        |
| resolved      | stale         | Conditions change such that the resolution may no longer be valid                       |
| resolved      | reopened      | The Judgment Point is explicitly reopened for reconsideration                           |
| delegated     | resolved      | The delegatee records a resolution                                                      |
| delegated     | stale         | Conditions change affecting the delegated resolution                                    |
| stale         | investigating | The stale Judgment Point is re-examined through investigation                           |
| stale         | resolved      | The stale Judgment Point is re-resolved (previous resolution confirmed or updated)      |
| stale         | reopened      | The stale Judgment Point is formally reopened for full reconsideration                  |
| reopened      | investigating | Investigation begins on the reopened Judgment Point                                     |
| reopened      | resolved      | The reopened Judgment Point is resolved with a new or confirmed resolution              |
| reopened      | dismissed     | Upon re-examination, the Judgment Point is dismissed                                    |
| dismissed     | reopened      | A dismissed Judgment Point is reopened because new information warrants reconsideration |

Transitions not listed in this table are not permitted. The system must enforce the valid transition set and reject attempts to make invalid transitions. Invalid transition attempts should be logged as errors but should not corrupt the Judgment Point's state.

Every state transition is recorded as a Judgment Event (Section 28) in the append-only audit log. The event includes the previous state, the new state, the actor who initiated the transition, and the timestamp.

### 18.3 State Persistence

The state of a Judgment Point is persistent. It survives process restarts, session endings, and system reboots. The current state is stored in the Judgment Point record itself (the `status` field) and is updated atomically with each state transition. The state history is preserved in the event log and the revision history.

Implementations must ensure that state transitions are atomic: either the state is updated and the event is recorded, or neither occurs. Partial updates (where the state changes but no event is recorded, or vice versa) would corrupt the audit trail and must be prevented through transactional operations or equivalent consistency mechanisms.

### 18.4 Terminal and Non-Terminal States

The `resolved` and `dismissed` states are terminal in the sense that they represent completed decision processes. However, they are not final: both states can transition to `stale` (through condition or dependency changes) or `reopened` (through explicit reopening). No state in the Judgment Point lifecycle is truly final; every state has at least one valid outgoing transition.

This design reflects the reality that technical decisions are revisable. A decision that was correct when made may become inappropriate as conditions change. The lifecycle must accommodate this revisability while maintaining a clear record of why decisions were made and when they changed.

The `candidate` state is the only state with a non-event exit: candidates that are evaluated and found to not warrant attention are discarded (logged at trace level) without transitioning to another state. This is because candidates that never become Judgment Points are not full lifecycle participants; they are filtered proposals.

---

## 19. Runtime Sequence

The runtime sequence describes the eight steps that occur when the system processes a potential judgment during an active workflow. This sequence applies regardless of the integration mechanism (MCP, LangGraph, SDK, or direct API). Implementations may optimize the internal mechanics, but the observable behavior must follow this sequence.

### Step 1: Load Context

The system loads the current project context. This includes active policies (enabled policies for the project, sorted by priority), existing Judgment Points (their current states and any dependency relationships), artifact references (the known artifacts in the project and their relationships to existing judgments), and project-level configuration (default authority modes, notification preferences, and any domain-specific settings).

Context loading occurs at the beginning of a workflow session and is refreshed when significant changes occur (such as a policy being updated or a new artifact being registered). The context provides the baseline against which new candidates are evaluated.

### Step 2: Plan

The agent (or the user, or a policy rule) identifies an upcoming action that may involve a consequential choice. The plan step recognizes that a decision node is approaching in the workflow.

This step may be performed by several mechanisms:

- The agent's own reasoning recognizes that it is about to make a choice with multiple defensible options.
- A rule-based trigger detects a pattern that indicates a consequential choice (such as the agent invoking a tool that reports multiple valid outputs).
- A tool reports that it has multiple valid options and needs direction.
- The user observes that the agent is about to make or has made a choice that should be examined.

The plan step is where detection begins. It is the transition from routine workflow execution to recognition that a judgment-relevant situation exists.

### Step 3: Emit Candidate

The detector emits a Judgment Candidate. The candidate includes:

- The question being decided, stated as a clear, specific question.
- The category (one of the eight defined categories).
- The detected trigger (source and description, plus hard trigger name if applicable).
- An initial set of alternatives (at least two), each with a label, description, and available tradeoff information.
- The context surrounding the choice (why it has arisen, what the current state of the workflow is, what constraints apply).
- A preliminary materiality assessment (the six dimension scores, the aggregate score, and the detector's confidence in the assessment).
- References to affected artifacts (identifiers of artifacts that depend on or inform the decision).

The candidate enters the system with status `candidate`. The quality of the candidate determines the quality of the subsequent evaluation and resolution. Poorly described questions, vague alternatives, or missing context reduce the value of the judgment process.

### Step 4: Evaluate

The system evaluates the candidate against applicable policies and the materiality thresholds. This evaluation proceeds in a defined order:

1. Compute the aggregate materiality score from the six dimension scores (or verify the score computed by the detector).
2. Check for hard trigger conditions. If a hard trigger applies, the candidate bypasses score-based evaluation and proceeds to the hard trigger's default intervention level.
3. Match the candidate against policy scopes. For each enabled policy in priority order, check whether the candidate falls within the policy's scope (categories, trigger sources, artifact types, materiality range).
4. For the highest-priority matching policy, evaluate rules in order. The first matching rule determines the intervention level and any authority overrides.
5. If no policy matches, apply the default intervention level based on the materiality score thresholds (Section 15).
6. Assign the authority mode based on the matching policy rule's authority override, or based on the default authority for the determined intervention level.

If the evaluation determines that the intervention level is `trace`, the candidate is logged and execution continues without interruption. The candidate does not become a Judgment Point; it remains a trace-level event.

If the evaluation determines that the intervention level is `disclose`, `pause`, or `require-investigation`, the candidate is promoted to status `pending` and becomes a Judgment Point. A `created` event and a `promoted` event are recorded.

### Step 5: User Engages

For Judgment Points at the `pause` or `require-investigation` intervention level, execution halts and the Judgment Point is presented to the assigned authority. The presentation includes the question, context, alternatives, materiality assessment, intervention level, authority assignment, and any applicable evidence references.

The user (or authorized party) may take any of the following actions:

- **Choose an alternative.** Select one of the available alternatives and provide a rationale, recording a resolution and transitioning to the `resolved` state.
- **Request comparison.** Ask the system to perform a structured comparison of two or more alternatives, producing quantitative or qualitative comparison data that is attached to the alternatives.
- **Investigate.** Begin an open-ended investigation, transitioning to the `investigating` state. During investigation, the user can review evidence, add alternatives, request comparisons, and gather additional information.
- **Add an alternative.** Propose a new alternative not already listed, with a label, description, and tradeoff analysis.
- **Delegate.** Delegate resolution authority to an agent or another party, subject to delegation conditions.
- **Request review.** Ask another authority to review the Judgment Point and provide input.
- **Dismiss.** Dismiss the Judgment Point as not requiring a decision, with a recorded reason.

For Judgment Points at the `disclose` level, the user is informed but execution continues. The user may engage with the disclosed judgment at their convenience through the activity rail, project view, or direct reference. If the user does not engage, the agent's initial selection stands.

For Judgment Points at the `require-investigation` level, the system enforces that investigation activities must be performed before resolution. The user cannot immediately select an alternative; they must first enter the `investigating` state and perform at least one investigative action.

### Step 6: Resume

After a resolution is recorded (or the Judgment Point is dismissed or delegated), execution resumes from the point where it was interrupted. The resolution record is attached to the Judgment Point, the status is updated, and the events are recorded.

If the resolution includes conditions or validation requirements, those are recorded on the Judgment Point for subsequent checking. The system does not automatically enforce conditions or perform validation; it records them so that subsequent steps can reference them.

The resume step is where the judgment process rejoins the regular workflow. The agent proceeds with the selected approach, using the resolution as its authorization and the conditions as its constraints.

### Step 7: Propagate

The system propagates the effects of the resolution to downstream artifacts and dependent Judgment Points. This propagation includes:

- Updating artifact references to reflect the resolved state of the Judgment Point.
- Identifying downstream Judgment Points that depend on the resolved one and checking whether their validity conditions are still met.
- If the resolution changes assumptions, parameters, or approaches that affect other parts of the workflow, identifying which downstream work may need to be updated.
- Recording `dependency-changed` events on affected downstream Judgment Points.

Propagation is described in detail in Section 25. It is recursive: a downstream Judgment Point that becomes stale may itself trigger propagation to further downstream items.

### Step 8: Staleness Check

After propagation, the system checks whether any previously resolved Judgment Points are affected by the current resolution or by other changes that have occurred since the last staleness check.

The staleness check evaluates:

- Validity conditions on each resolved Judgment Point. If a validity condition references a factor that has changed, the Judgment Point may be marked stale.
- Reopen conditions on each resolved Judgment Point. If a reopen condition is met, the Judgment Point should be flagged for review.
- Upstream dependency changes that were propagated in Step 7.

Judgment Points identified as stale are transitioned to the `stale` state, and `marked-stale` events are recorded. The system notifies the assigned authority that a previously resolved decision needs re-examination.

---

## 20. Agent Roles

The Judgment Points system defines four functional roles that agents can perform within the judgment workflow. A single agent may perform multiple roles, or different specialized agents may perform each role. These roles describe functions, not permissions; the authority model (Section 17) governs what decisions an agent may make.

### 20.1 Detector

The detector role involves identifying potential judgment candidates during workflow execution. A detector agent monitors the workflow for conditions that indicate a consequential choice is being made or is about to be made.

Detection signals include:

- Hard trigger conditions (Section 13) being met.
- Patterns that suggest methodological discretion (the agent recognizes that it is choosing among valid approaches).
- Conflicting data or evidence sources encountered during the workflow.
- Multiple valid outputs from a tool or computation.
- Situations where the agent's own confidence in its chosen approach is low.
- Patterns matching policy-defined rules.

The detector emits candidates but does not resolve them. Its job is to notice when a judgment-relevant situation exists, not to make the judgment.

Detection can also be performed by non-agent components: policy rules that match on workflow state, tools that report ambiguous outputs, or user observation. The detector role describes the function, regardless of what performs it.

Detection quality is a critical factor in the system's overall value. An agent that detects too few judgments will miss important decisions, leaving the user unaware of choices that were made silently. An agent that detects too many will overwhelm the user with interruptions, leading to fatigue and disengagement. The evaluation framework (Section 36) includes metrics for assessing detection precision and recall.

The following patterns represent common detection opportunities that detector agents should be trained to recognize:

- The agent is about to select one of several named approaches, methods, or tools where the choice affects the outcome (not just the execution path).
- The agent is about to adopt a simplifying assumption when a more detailed treatment is feasible.
- The agent has encountered conflicting data sources, standards, or reference values.
- The agent is about to set a numerical parameter (threshold, tolerance, safety factor, sample size) that determines what the analysis considers acceptable.
- The agent is about to formulate a conclusion or recommendation based on computed results.
- The agent is about to exclude data points, variables, or scenarios from consideration.
- The computed results differ substantially from what the agent expected based on prior experience or analytical estimates.
- The agent is about to delegate a subtask to another agent, tool, or automated process where the subtask involves a consequential choice.

These patterns are not exhaustive. Domain-specific detection guidance can be provided through Agent Skill definitions (Section 31) that include detection criteria tailored to specific technical domains.

### 20.2 Analyst

The analyst role involves investigating a Judgment Point's alternatives, gathering evidence, performing comparisons, and preparing the information that the decision-maker will need to make an informed judgment.

An analyst agent may:

- Compute quantitative comparison metrics (such as running two approaches on the same inputs and comparing the results).
- Retrieve relevant standards, specifications, and reference data.
- Identify precedents in prior Judgment Points (similar decisions made earlier in this project or in related projects).
- Summarize the tradeoffs among alternatives in a structured format.
- Identify gaps in the available evidence and suggest additional data or analysis that would inform the decision.
- Assess the sensitivity of downstream results to the choice among alternatives.

The analyst does not make the final decision (unless delegated to do so under an explicit policy). The analyst prepares the decision by assembling the information, structuring the comparison, and presenting the tradeoffs. The quality of the analyst's work directly affects the quality of the decision, because the decision-maker relies on the analyst's preparation.

### 20.3 Executor

The executor role involves carrying out the actions that follow from a resolution. After a Judgment Point is resolved, the executor applies the selected approach, performs the computation, generates the artifacts, and continues the workflow according to the decision.

The executor role is distinct from the resolution itself. Executing a decision is not the same as making one. The executor follows the resolution's direction, respects its conditions, and satisfies its validation requirements. If the executor encounters a situation where the resolution's conditions cannot be met, it should flag the issue rather than proceeding silently.

### 20.4 Critic

The critic role involves reviewing the quality of judgments after they have been resolved. A critic agent evaluates whether:

- The resolution is consistent with prior decisions on similar questions.
- The rationale is substantive (not a single word or a trivially generic statement).
- The stated conditions and validation requirements have been addressed.
- The resolution appears to have been rubber-stamped (resolved very quickly, with minimal engagement, or without reviewing alternatives).
- The alternatives were balanced in their presentation (not biased toward a preferred option).
- The resolution contradicts evidence that was available at the time of decision.

The critic supports quality assurance but does not override resolutions. Critic findings may trigger reviews, flag decisions for additional attention, or inform evaluation metrics. The critic role is particularly valuable for detecting patterns of disengagement or bias across a project's judgment history.

### 20.5 Role Assignment and Flexibility

The four roles (detector, analyst, executor, critic) are functional descriptions, not rigid assignments. A single agent can perform all four roles in sequence during a workflow, or different specialized agents can perform each role. The roles may also be performed by humans: a human user can serve as a detector (by creating judgment candidates manually), as an analyst (by performing their own investigation), as an executor (by carrying out the resolved approach), or as a critic (by reviewing the quality of prior resolutions).

The role model is descriptive rather than prescriptive. The specification does not require that agents be configured with explicit role assignments. Instead, the roles provide a vocabulary for discussing and analyzing the different functions that participants perform in the judgment workflow. This vocabulary is useful for designing multi-agent systems (where each agent can be optimized for its role), for evaluating system performance (where detection quality metrics apply to the detector function and engagement metrics apply to the analyst and decision-maker functions), and for identifying gaps in the workflow (for example, if no agent or user is performing the critic function, resolution quality may degrade over time without detection).

---

## 21. Context Selection

Context selection is the process of determining what information is relevant to a particular judgment candidate and should be presented to the decision-maker. Good context selection improves decision quality by providing the right information at the right level of detail. Poor context selection either overwhelms the decision-maker with irrelevant data or starves them of essential background.

### 21.1 Context Sources

The context presented for a Judgment Point is assembled from several sources.

**Immediate workflow context.** The current state of the analysis, including what has been computed so far, what inputs are available, and what the next planned steps are. This context establishes the situational frame for the decision. Without workflow context, the decision-maker cannot understand where the choice fits in the overall analysis.

**Related artifacts.** The artifacts that the decision will affect or that inform the decision, including data sources, models, computations, plots, and conclusions. Artifact references in the Judgment Point record identify these connections. The decision-maker needs to understand what downstream work depends on the decision and what evidence is available to inform it.

**Prior judgments.** Previous Judgment Points that are related by category, by artifact linkage, or by dependency. Prior judgments provide precedent and help the decision-maker understand how similar choices were handled earlier in the workflow or in related projects. If a similar question was resolved last week with a particular approach and rationale, the decision-maker should be aware of that precedent (though they are not required to follow it).

**Applicable standards and requirements.** Standards, specifications, regulations, or organizational requirements that constrain or inform the choice. These may be referenced through artifact references with the `informs` or `validates` relationship type. If a standard specifies acceptable methods for a particular type of analysis, the decision-maker should see that standard when choosing a method.

**Policy context.** The policies that apply to this Judgment Point, including the intervention level, authority mode, and any delegation conditions. The decision-maker should understand what the system expects and why, particularly if the intervention level is higher or lower than they might expect.

### 21.2 Context Filtering

Not all available context is useful for every decision. Context selection should apply filtering based on relevance, recency, and the specific nature of the judgment. A method judgment does not need the same context as a parameter judgment or an interpretation judgment.

Context filtering is not fully specified in this version of the specification. The mechanisms for selecting, filtering, ranking, and presenting context will be refined based on implementation experience and evaluation results. The specification provides the data structures (artifact references, prior judgments, policy records) that context selection can draw on, but it does not prescribe a specific algorithm for assembling the context presentation.

The following heuristics provide guidance for context filtering implementations:

**Category-based relevance.** The judgment's category determines which types of context are most relevant. For method judgments, prior method judgments in the same domain and applicable standards for methodology selection are most relevant. For data judgments, data quality assessments, data source documentation, and prior data judgments are most relevant. For interpretation judgments, the analysis results, validation outcomes, applicable acceptance criteria, and prior interpretations of similar results are most relevant.

**Dependency-based relevance.** Upstream Judgment Points that the current judgment depends on (directly or through artifact linkage) are relevant because they establish the decisions that the current judgment builds on. Downstream Judgment Points that depend on the current decision are relevant because they show what will be affected by the resolution.

**Recency weighting.** More recent context is generally more relevant than older context. If the project has evolved since a prior judgment was resolved, the prior judgment may be relevant as precedent but should be presented with an indication of how the context has changed. Recency weighting should not exclude old context entirely; a foundational decision made at the start of the project may remain relevant throughout.

**Materiality-proportional depth.** Higher-materiality judgments warrant deeper context. A trace-level judgment needs minimal context (the question and alternatives may be sufficient). A require-investigation judgment should include the full context: upstream decisions, artifact dependencies, applicable standards, prior precedents, and policy rationale.

### 21.3 Context Volume

Implementations should aim to present context that is sufficient for an informed decision without overwhelming the decision-maker. The appropriate volume depends on the materiality of the decision: high-materiality decisions may warrant extensive context, while low-materiality decisions may need only a brief summary.

As a general principle, the context should answer these questions: What is being decided? Why does it matter? What are the options? What evidence is available? What prior decisions are relevant? What constraints apply? If the presented context answers these questions, it is likely sufficient.

### 21.4 Context Presentation Order

When presenting context to the decision-maker, the ordering should support the decision-making process. The recommended presentation order is:

1. The question being decided and the immediate context explaining why it has arisen.
2. The alternatives, with their descriptions and tradeoffs.
3. Evidence references that bear directly on the choice among alternatives.
4. Applicable standards, requirements, or constraints that bound the decision.
5. Prior judgments that established relevant precedent or upstream decisions.
6. The materiality assessment, intervention level, and authority assignment explaining why the system is presenting this judgment at this level.
7. The policy context explaining any special rules or delegation conditions that apply.

This ordering places the most directly relevant information first (the question and the alternatives) and progressively adds context that helps the decision-maker evaluate the options in their broader setting. Implementations may adjust this ordering based on user preferences and the specific interface design, but the principle of leading with the decision and following with context should be preserved.

---

## 22. Candidate Generation

Candidate generation is the process by which potential Judgment Points are detected and proposed. The system supports multiple detection mechanisms, each corresponding to a trigger source in the Judgment Point schema.

### 22.1 Agent Detection

An agent detects a potential judgment while performing technical work. This is expected to be the most common detection mechanism in practice. The agent recognizes that it is about to make or has just made a consequential choice, and it emits a judgment candidate.

Agent detection relies on the agent's own reasoning about the significance of its actions. This reasoning may be guided by system prompts that describe the criteria for consequential choices, by examples of judgment-relevant situations, or by skill definitions (Section 31) that include detection guidance.

Agent detection quality depends on the agent's ability to recognize consequential choices. This ability varies across agents, models, and domains. The evaluation framework (Section 36) includes metrics for assessing detection quality, and improving detection quality through better prompting, training, and skill design is an ongoing research challenge.

### 22.2 Rule Detection

A policy rule detects a judgment candidate based on predefined conditions. Rule detection is deterministic: if the conditions are met, the candidate is generated. Rules can be defined based on artifact types, workflow patterns, data characteristics, or domain-specific criteria.

Rule detection complements agent detection by catching situations that the agent might miss and by enforcing organizational or regulatory requirements. For example, a rule might specify that any analysis producing results that will be used in a regulatory submission must have its final interpretation flagged as a Judgment Point, regardless of whether the agent considers the interpretation consequential.

### 22.3 Skill Detection

An Agent Skill (Section 31) detects a judgment candidate as part of its specialized function. Skills may include built-in detection logic that identifies judgment-relevant situations within their domain of expertise. For example, a thermal analysis skill might include detection rules specific to heat transfer modeling decisions.

### 22.4 Tool Detection

A tool reports that multiple valid options exist for a given operation, prompting the creation of a judgment candidate. Tool detection occurs when the tool itself recognizes ambiguity in its inputs or outputs and reports the available options rather than silently selecting one.

For example, a material property lookup tool might report that two databases contain different values for the same property, rather than silently returning the value from one database.

### 22.5 User Detection

A human user identifies a potential judgment and creates a candidate manually. User detection is important because users may recognize consequential choices that automated detection mechanisms miss, particularly in novel situations, interdisciplinary work, or domains where detection rules have not been defined.

Users can create judgment candidates through the SDK, MCP tools, or the user interface. User-created candidates follow the same schema and lifecycle as agent-created or rule-created candidates.

### 22.6 Dependency-Change Detection

A change in an upstream dependency triggers the creation of a judgment candidate. This occurs when a previously resolved Judgment Point is reopened or revised, and the change may affect a downstream decision that was made based on the upstream resolution.

Dependency-change detection is automated: the system monitors dependency relationships and generates candidates when upstream changes are detected. These candidates include the upstream change as context, so the decision-maker can understand why the downstream decision is being flagged.

### 22.7 Candidate Content Requirements

A judgment candidate must include, at minimum:

- A clear question describing the choice. The question should be specific enough that a reviewer can understand the decision without additional explanation. Vague questions like "Which approach?" are insufficient.
- A category (one of the eight defined categories).
- A trigger source (agent, rule, skill, tool, user, or dependency-change) with a description of what triggered detection.
- At least two alternatives, each with a label, description, and (where available) tradeoff analysis. Each alternative must be a defensible option, not a straw man.
- Context explaining why the choice has arisen and what the current state of the workflow is.
- A preliminary materiality assessment (the six dimension scores and the aggregate).

The quality of candidates matters. Poorly described questions, vague alternatives, missing context, or inaccurate materiality assessments reduce the value of the judgment process and may lead to inappropriate intervention levels or authority assignments.

### 22.8 Examples of Good and Poor Candidates

The following examples illustrate the difference between well-formed and poorly-formed judgment candidates.

**Well-formed candidate:**

- Question: "Which convection heat transfer correlation should be used for the tube-side fluid: the Dittus-Boelter correlation or the Gnielinski correlation?"
- Category: Method
- Alternatives: Two alternatives, each with a description of the correlation, its range of applicability (Reynolds and Prandtl number ranges), its accuracy characteristics, and its tradeoffs (Dittus-Boelter is simpler but less accurate in the transition regime; Gnielinski is more complex but applicable to a wider range of conditions).
- Context: The analysis involves turbulent flow with Reynolds numbers between 8,000 and 50,000 and Prandtl numbers between 0.7 and 10. Both correlations are applicable in this range.
- Materiality: Scored appropriately based on the impact of the correlation choice on predicted heat transfer coefficients and downstream temperature predictions.

**Poorly-formed candidate:**

- Question: "Which approach should we use?"
- Category: Method
- Alternatives: "Option A" and "Option B" with no descriptions, no tradeoff analysis, and no evidence references.
- Context: None provided.
- Materiality: All dimensions scored at 1 without justification.

The poorly-formed candidate provides insufficient information for the decision-maker to understand the choice, evaluate the alternatives, or assess the materiality. It produces a judgment record with minimal value for accountability, traceability, or future reference. Detection quality metrics (Section 36.1) should assess not only whether candidates are correctly identified (precision and recall) but also whether they are well-formed (content quality).

---

## 23. Investigation and Comparison

Investigation is the process of examining a Judgment Point in depth to support an informed resolution. Comparison is a specific form of investigation in which the alternatives are evaluated against each other using structured criteria.

### 23.1 Investigation Process

When a Judgment Point is at the `investigating` status, the following activities may occur:

- Reviewing the existing alternatives and their descriptions in detail.
- Examining the evidence references linked to the Judgment Point and to individual alternatives.
- Requesting additional information from agents, tools, or external data sources.
- Adding new alternatives that were not part of the initial candidate.
- Performing structured comparisons of two or more alternatives (Section 23.2).
- Consulting prior Judgment Points in the same or related projects to understand precedent.
- Reviewing applicable standards, requirements, or organizational policies that bear on the decision.
- Requesting analysis from an analyst agent (Section 20.2).
- Documenting observations and intermediate reasoning.

Investigation is not a mandatory step for all Judgment Points. At the `pause` intervention level, the decision-maker may resolve the Judgment Point directly without entering the investigating state. At the `require-investigation` level, the system mandates that investigation activities be performed before resolution is permitted.

### 23.2 Structured Comparison

A structured comparison evaluates two or more alternatives against defined criteria and produces quantitative or qualitative results that inform the decision.

Comparisons may involve:

- Running the alternatives through a computation and comparing the results. For example, computing the outlet temperature of a heat exchanger using two different modeling approaches and comparing the predictions.
- Evaluating each alternative against stated requirements or acceptance criteria.
- Analyzing the sensitivity of downstream results to the choice among alternatives.
- Comparing the computational cost, complexity, implementation effort, or maintenance burden of each alternative.
- Assessing each alternative against the applicable hard trigger conditions (for example, does Alternative B introduce new assumptions that would trigger an additional judgment?).

Comparison data is stored in the `comparisonData` field of each `JudgmentAlternative`. The schema allows arbitrary structured data (an object with `additionalProperties: true`) to accommodate different types of comparisons for different domains.

A comparison request and its completion are recorded as Judgment Events (`comparison-requested` and `comparison-completed`). The comparison events capture what was compared, what criteria were used, and who performed the comparison.

### 23.3 Adding Alternatives

During investigation, new alternatives may be added to a Judgment Point. An alternative can be proposed by the user, by the agent, by a tool reporting additional options, or by reference to a standard, guideline, or prior decision.

Added alternatives must meet the same requirements as original alternatives: an identifier, a label, a description, and (where applicable) tradeoff analysis and evidence references. The source of the alternative (user, agent, standard, or prior-decision) is recorded.

Adding an alternative is recorded as a Judgment Event (`alternative-added`). There is no limit on the number of alternatives that can be added, though in practice, more than five or six alternatives may indicate that the question is too broad and should be decomposed into narrower sub-questions.

### 23.4 Investigation at the Require-Investigation Level

At the `require-investigation` intervention level, the system mandates that investigation activities be performed before resolution. This mandate is enforced through a procedural requirement: the system checks that at least one of the following activities has been recorded as an event before accepting a resolution:

- An `investigation-started` event, indicating the decision-maker entered the investigating state.
- A `comparison-requested` event, indicating a structured comparison was initiated.
- A `comparison-completed` event, indicating a structured comparison was finished.
- An `alternative-added` event, indicating the decision-maker contributed a new alternative.

The intent of this requirement is to ensure that high-materiality decisions are not resolved reflexively. By requiring at least one investigative action, the system creates a minimal procedural threshold that encourages the decision-maker to engage with the evidence and alternatives before committing to a resolution.

The requirement is deliberately minimal. The system does not prescribe the depth or duration of investigation. A decision-maker who reviews a comparison result for thirty seconds and then resolves has met the procedural requirement, even if a more thorough investigation might have been appropriate. The system relies on the decision-maker's professional judgment about how much investigation is warranted for the specific decision. The evaluation framework (Section 36) includes metrics for assessing engagement depth that can detect shallow engagement patterns over time.

### 23.5 Comparison Criteria

When requesting a structured comparison, the decision-maker or agent may specify comparison criteria: the dimensions along which the alternatives should be compared. If no criteria are specified, the analyst agent or comparison tool selects criteria appropriate to the judgment category and domain.

Common comparison criteria for technical judgments include:

- **Accuracy.** How accurate is each alternative expected to be for the intended application? What are the known accuracy limitations?
- **Computational cost.** How much computation does each alternative require? What is the expected run time for the problem size under consideration?
- **Complexity.** How complex is each alternative to implement, understand, and maintain? Complexity affects both the initial implementation effort and the long-term maintainability.
- **Validation feasibility.** How easy is it to validate each alternative against known solutions, experimental data, or independent methods?
- **Generality.** How broadly applicable is each alternative? Does it apply only to the specific problem at hand, or does it extend to a range of related problems?
- **Sensitivity.** How sensitive are the results to the parameters, inputs, and assumptions specific to each alternative?
- **Precedent.** Has each alternative been used successfully in similar applications? What is the track record?

The comparison criteria should be selected to illuminate the meaningful differences between alternatives. Criteria that produce the same result for all alternatives do not contribute to the comparison.

---

## 24. Resolution

Resolution is the act of selecting an alternative, recording the reasons for the selection, and closing the active decision process for a Judgment Point. Resolution enables downstream work to proceed.

### 24.1 Resolution Requirements

A valid resolution must include:

- The identifier of the selected alternative from the Judgment Point's alternatives list.
- A rationale explaining why this alternative was selected. The rationale must be substantive: it should reference the tradeoffs, evidence, or reasoning that led to the selection. A rationale of "OK" or "seems fine" does not meet this standard. The system should encourage substantive rationales but may not be able to enforce substantiveness programmatically.
- The timestamp of the resolution.
- The identifier of the person, agent, or policy that resolved it.
- The resolution type (direct-human, collaborative, delegated, rule-based, or inherited).
- The list of alternatives that were considered (at minimum, the selected alternative).
- Whether an AI-generated recommendation was shown to the decision-maker before resolution.

Optional fields that should be provided when applicable:

- Known uncertainties at the time of resolution. These are specific areas where information is incomplete or where the outcome is not fully predictable.
- Conditions applied to the resolution. These are constraints on how the selected approach should be implemented (for example, "use source data covering 300 to 900 K" or "re-evaluate if sample size exceeds 10,000").
- Validation requirements. These are checks that must be performed after the resolution is applied to confirm the approach produces acceptable results (for example, "perform mesh convergence study" or "compare outlet temperatures against analytical solution").
- The decision-maker's initial position before seeing AI recommendations (for bias-awareness analysis).
- Descriptions of what information was presented to the decision-maker.

### 24.2 Resolution Types

Five resolution types are defined. The resolution type describes how the resolution was produced, not who produced it.

**Direct-human.** A human made the decision without AI-generated input. The human reviewed the alternatives, applied their own judgment, and selected an option independently. No AI-generated recommendations, comparisons, or analyses were shown before the selection.

**Collaborative.** A human made the decision after reviewing AI-generated analysis, comparisons, or recommendations. The AI contributed to the information base, but the human made the final selection. This is the most common resolution type when agents serve as analysts.

**Delegated.** An agent resolved the Judgment Point under the terms of an explicit delegation policy. The delegation was authorized by a human through a policy, not assumed by default. The delegation policy identifier is recorded in the resolution.

**Rule-based.** The resolution was determined by a predefined rule, standard, or requirement that leaves no room for discretion. The "decision" is the application of a binding constraint. The applicable rule or standard is cited in the resolution.

**Inherited.** The resolution was carried over from a prior decision on a materially similar Judgment Point. The current Judgment Point adopts the same resolution based on established precedent. The prior Judgment Point's identifier is recorded in the resolution.

### 24.3 Bias Awareness

The resolution record includes fields designed to support awareness of anchoring bias and AI influence on decisions.

The `recommendationShown` field (required) records whether an AI-generated recommendation was displayed before resolution. When true, reviewers can assess whether the resolution may have been unduly influenced by the recommendation.

The `initialPosition` field (optional) captures the decision-maker's stated position before seeing recommendations or structured comparison data. When captured, it is possible to identify cases where the decision-maker's position changed after seeing the recommendation, which may indicate anchoring or may indicate genuinely useful AI input.

The `informationPresented` field (optional) documents what information was shown to the decision-maker. This supports accountability by recording the informational basis of the decision.

These fields do not prevent bias. They make it detectable and studyable. Organizations can use these fields in retrospective reviews to assess whether their decision-making processes are unduly influenced by AI recommendations and to adjust their policies accordingly.

### 24.4 Resolution Workflow

The resolution workflow describes the sequence of interactions between the decision-maker and the system during resolution. While the exact interaction depends on the interface (MCP, LangGraph, WEEMS, or API), the logical workflow is consistent across implementations.

**Step 1: Review alternatives.** The decision-maker reads the question, reviews the alternatives, and examines the tradeoffs described for each option. This step establishes the decision-maker's understanding of what is being decided and what options are available.

**Step 2: Consider evidence.** The decision-maker reviews the evidence references, comparison data (if a comparison has been performed), and any applicable standards or prior precedents. This step provides the informational basis for the decision.

**Step 3: Form a position.** The decision-maker forms a preliminary position. If the `initialPosition` field is being captured, the decision-maker records their position at this point, before seeing any AI recommendation. Recording the initial position supports bias-awareness analysis.

**Step 4: Review recommendation (if applicable).** If an AI recommendation is available and the decision-maker chooses to view it, the recommendation is presented. The `recommendationShown` field is set to true. The decision-maker may confirm, adjust, or reject the recommendation.

**Step 5: Select an alternative.** The decision-maker selects the alternative they have decided on. If the decision-maker's preferred approach is not represented in the existing alternatives, they should use the Add Alternative action to add it before selecting it. Resolving with a "closest match" alternative when the intended approach differs from all listed options produces a misleading record.

**Step 6: Provide rationale.** The decision-maker writes a rationale explaining why they selected this alternative. The rationale should reference the specific tradeoffs, evidence, or reasoning that led to the selection. The system should encourage substantive rationales through interface design (for example, by providing prompts or templates for common rationale structures) but should not rigidly enforce a particular format.

**Step 7: Attach conditions and validation requirements.** The decision-maker optionally specifies conditions that bound the resolution (circumstances under which the decision is valid or constraints on implementation) and validation requirements (checks that must be performed to confirm the resolution produces acceptable results). These fields provide explicit criteria for assessing the ongoing validity of the decision.

**Step 8: Confirm and record.** The decision-maker confirms the resolution. The system records the resolution, transitions the Judgment Point to the `resolved` state, creates a `resolution-recorded` event, and resumes the workflow.

---

## 25. Dependency Propagation

Dependency propagation is the process of identifying and updating downstream work when a Judgment Point is revised, reopened, or invalidated.

### 25.1 Dependency Relationships

Dependencies between Judgment Points and artifacts are expressed through artifact references. The following relationship types are defined in `schemas/artifact-reference.schema.json`:

- **depends-on**: The artifact's correctness depends on the judgment. If the judgment changes, the artifact may need to be updated or re-evaluated. This is the most common dependency relationship.
- **informs**: The artifact provides evidence or context for the judgment. Changes to the artifact may affect the judgment's validity. This is a reverse dependency: the artifact influences the judgment rather than the judgment influencing the artifact.
- **produced-by**: The artifact was generated as a result of the judgment. If the judgment is revised, the artifact may need to be regenerated.
- **validates**: The artifact validates the judgment's resolution. If the validation results change, the judgment's confidence may be affected.
- **contradicts**: The artifact provides evidence against a particular alternative or the current resolution. Contradicting artifacts should be examined during investigation.

Dependencies can also exist between Judgment Points. When one Judgment Point's resolution depends on the outcome of another (for example, a parameter selection that depends on the modeling approach chosen in an earlier judgment), a change to the upstream judgment may trigger re-evaluation of the downstream judgment.

### 25.2 Propagation Behavior

When a Judgment Point transitions to the `stale` or `reopened` state, the system performs the following propagation steps:

1. Identify all artifacts with a `depends-on` or `produced-by` relationship to the affected Judgment Point.
2. For each identified artifact, determine whether other Judgment Points reference the same artifact. These are potentially affected downstream Judgment Points.
3. For each potentially affected downstream Judgment Point, evaluate whether its validity conditions are still met given the upstream change.
4. Mark downstream Judgment Points as `stale` if their validity conditions are no longer met or if the upstream change materially affects their basis.
5. Record `dependency-changed` events on affected downstream Judgment Points, including a reference to the upstream change that triggered the propagation.

Propagation is recursive. A downstream Judgment Point that becomes stale may itself trigger propagation to further downstream items. This recursive behavior ensures that the full impact of an upstream change is identified, not just the immediate first-level effects.

### 25.3 Propagation Limits

To prevent cascading staleness from overwhelming the system with notifications and stale-state transitions, implementations should define reasonable limits on propagation depth. The specification does not prescribe a specific limit, because the appropriate limit depends on the complexity of the dependency graph and the tolerance for cascading notifications.

As a guideline, implementations should log the full propagation chain regardless of depth limits, so that the complete cascade is traceable even if active notification is limited to a defined depth. A reasonable starting point might be to propagate actively to a depth of 3 (the stale Judgment Point, its immediate dependents, and their immediate dependents) and to log deeper dependencies without generating active notifications.

### 25.4 Propagation Example

Consider the following dependency chain in a structural analysis project:

- **JP-1** (Method): Selected beam-element analysis approach. Status: resolved.
- **JP-2** (Data): Selected material property database for beam elements. Status: resolved. Depends on JP-1 (the analysis approach determines the required material data format).
- **JP-3** (Parameter): Selected mesh density for beam-element model. Status: resolved. Depends on JP-1.
- **JP-4** (Validation): Selected validation criteria for beam analysis results. Status: resolved. Depends on JP-1 and JP-3.
- **Artifact A** (computation): Beam-element stress analysis. Depends on JP-2, JP-3.
- **Artifact B** (conclusion): Design adequacy assessment. Depends on JP-4 and Artifact A.

If JP-1 is reopened (for example, because new requirements suggest a shell-element analysis is needed instead of beam elements), the propagation proceeds:

1. JP-1 transitions to `reopened`. The system identifies JP-2, JP-3, and JP-4 as immediately dependent on JP-1.
2. JP-2 is evaluated for staleness. Because the material data format requirements depend on the analysis approach, JP-2 is marked `stale`. A `dependency-changed` event is recorded on JP-2 referencing JP-1.
3. JP-3 is evaluated for staleness. Because mesh density parameters are specific to the analysis method, JP-3 is marked `stale`. A `dependency-changed` event is recorded on JP-3.
4. JP-4 is evaluated for staleness. Because validation criteria depend on the analysis approach, JP-4 is marked `stale`. A `dependency-changed` event is recorded on JP-4.
5. Artifact A depends on JP-2 and JP-3, both of which are now stale. Any Judgment Points that depend on Artifact A would also be flagged.
6. Artifact B depends on JP-4 and Artifact A. If any Judgment Points govern Artifact B, they would be flagged as affected by the upstream changes.

The user sees that reopening JP-1 has cascading effects on three downstream Judgment Points and two artifacts. They can address the stale Judgment Points in a logical order: first re-resolve JP-2 and JP-3 (which establish the new data and parameters for the changed approach), then re-resolve JP-4 (which depends on the updated analysis approach and parameters).

---

## 26. Validity and Reopening

### 26.1 Validity Conditions

A Judgment Point's resolution includes validity conditions: statements of the circumstances under which the resolution remains appropriate. Validity conditions define the boundaries of the decision's applicability.

Examples of validity conditions:

- "Valid while the input data covers the temperature range 300 K to 900 K."
- "Valid as long as the material behaves linearly within the applied stress range."
- "Valid until a revised version of Standard X is published."
- "Valid while the number of data points exceeds 100."
- "Valid for heat exchangers with tube-side Reynolds numbers between 10,000 and 100,000."

Validity conditions are stored as strings in the `validityConditions` array on the Judgment Point record. The system does not automatically evaluate natural-language validity conditions. Automated staleness detection based on natural-language conditions would require interpretation capabilities that are beyond the scope of this specification.

Implementations may support structured, machine-evaluable conditions alongside natural-language conditions. For example, a validity condition might be stored as both a natural-language string (for human readability) and a structured expression (for automated evaluation). This dual representation is not required by the specification but is encouraged for conditions that can be expressed computationally.

### 26.2 Reopen Conditions

Reopen conditions define situations that should trigger a review of the decision. Unlike validity conditions (which describe when the resolution is no longer appropriate), reopen conditions describe when the decision should be revisited regardless of whether the resolution appears valid on its face.

Examples of reopen conditions:

- "Reopen if the project scope is expanded to include transient analysis."
- "Reopen if new experimental data becomes available for this material."
- "Reopen if the analysis tolerance is tightened below 2%."
- "Reopen if a new version of the modeling software is adopted."
- "Reopen if the cost constraints change."

Reopen conditions are stored as strings in the `reopenConditions` array on the Judgment Point record. Like validity conditions, they are primarily human-readable.

### 26.3 Staleness Detection

A Judgment Point becomes stale when one or more of the following conditions are met:

- An upstream dependency (another Judgment Point or an artifact with the `informs` relationship) has changed. This is detected through the dependency propagation mechanism (Section 25).
- A validity condition is no longer met. This may be detected automatically (for structured conditions) or may be identified by a user, agent, or tool.
- A time-based validity window has expired, if one was defined.
- A change in external context (new data availability, revised standards, changed requirements) affects the basis for the resolution.

Staleness does not invalidate the resolution automatically. A stale Judgment Point's resolution may still be correct; the staleness marker indicates that the resolution should be re-examined because something relevant has changed. The assigned authority (or their delegate) must review the stale Judgment Point and either confirm the existing resolution (with an updated rationale noting the review), record a new resolution, or reopen the Judgment Point for full re-investigation.

### 26.4 Reopening

A Judgment Point is reopened when the assigned authority (or a policy rule) explicitly determines that the resolution needs to be reconsidered. Reopening is a stronger action than marking a Judgment Point as stale: it indicates that the prior resolution is no longer adequate and a new decision process must begin.

Reopening creates a revision record in the Judgment Point's revision history, preserving the previous resolution. The Judgment Point transitions to the `reopened` state and enters a new resolution cycle. It can be investigated, resolved with a new or confirmed resolution, or dismissed.

Reopened Judgment Points can be resolved with the same alternative as before (confirming the prior decision with updated rationale reflecting the changed context) or with a different alternative.

### 26.5 Practical Example of Validity and Staleness

Consider a Judgment Point JP-DATA-001 in which the engineer selected NIST Webbook correlations for material properties, with the validity condition: "Valid while the input data covers the temperature range 300 K to 900 K."

**Scenario 1: Validity condition remains met.** The analysis continues within the 300 K to 900 K temperature range. The validity condition is satisfied. JP-DATA-001 remains in the `resolved` state. No action is needed.

**Scenario 2: Upstream dependency changes.** A separate Judgment Point JP-OBJ-001 (the project objective) is reopened because the client has expanded the scope to include cryogenic conditions (temperatures below 200 K). The dependency propagation mechanism identifies that JP-DATA-001 depends on JP-OBJ-001 through the project scope. JP-DATA-001 is marked `stale` with a `dependency-changed` event. The engineer reviews the stale Judgment Point and determines that the NIST correlations do not extend below 250 K, so the data source must be changed. The engineer reopens JP-DATA-001 and resolves it with a different alternative that provides cryogenic property data.

**Scenario 3: External change triggers staleness.** NIST publishes a revised set of property correlations that corrects an error in the specific heat values for the temperature range 500 K to 700 K. A team member or a monitoring tool detects this change and manually marks JP-DATA-001 as `stale`. The engineer reviews the stale Judgment Point, determines that the correction is within the analysis uncertainty, and confirms the existing resolution with an updated rationale noting the published correction and explaining why it does not change the analysis conclusions.

These scenarios illustrate three different pathways to staleness: the validity condition check, the dependency propagation, and the external context change. In each case, the system flags the decision for re-examination without automatically invalidating it.

---

## 27. Data Model

The data model for Judgment Points is defined through JSON Schema documents in the `schemas/` directory of the repository. These schemas are the canonical, language-independent definitions of the data structures used throughout the system. TypeScript types and validation utilities will be generated from these schemas in the `judgment-schemas` package.

### 27.1 Schema Files

The following schema files are defined:

| Schema             | File                                      | Purpose                                                                                                                                                        |
| ------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JudgmentPoint      | `schemas/judgment-point.schema.json`      | The central record: question, category, trigger, materiality, alternatives, authority, resolution, validity conditions, artifact references, revision history. |
| JudgmentPolicy     | `schemas/judgment-policy.schema.json`     | A named set of rules governing intervention levels, authority assignments, and delegation conditions.                                                          |
| JudgmentResolution | `schemas/judgment-resolution.schema.json` | A standalone resolution record with extended accountability and bias-awareness fields.                                                                         |
| JudgmentEvent      | `schemas/judgment-event.schema.json`      | An immutable lifecycle event forming the append-only audit log.                                                                                                |
| ArtifactReference  | `schemas/artifact-reference.schema.json`  | A reference to a technical artifact affected by or informing a Judgment Point.                                                                                 |

### 27.2 Schema Conventions

All schemas use JSON Schema Draft 2020-12 (`$schema: "https://json-schema.org/draft/2020-12/schema"`). Schema identifiers follow the pattern `https://github.com/STEIDd/HumanMachineJudgment/schemas/<name>.schema.json`. All top-level schemas set `additionalProperties` to `false` to enforce strict validation, meaning that documents containing fields not defined in the schema will be rejected.

Enumerated types (such as categories, statuses, authority modes, event types, and relationship types) are defined as `enum` arrays within the schema. Adding a new value to an enumeration is a schema change that must follow the versioning process.

Required fields are explicitly listed in each schema's `required` array. Fields not listed as required are optional and may be omitted from valid documents.

Default values are specified for array fields that are logically optional but should have a defined empty state (such as `evidenceRefs`, `uncertainty`, and `conditions`, which default to empty arrays).

### 27.3 Schema Versioning

Schemas are versioned with the project version. During the pre-1.0 period, schema changes may be breaking and will be documented in the changelog with migration guidance. After 1.0, schema changes will follow Semantic Versioning: additive changes (new optional fields, new enum values) in minor versions, breaking changes (removal of fields, changes to required fields, changes to enum semantics) in major versions.

### 27.4 Key Embedded Data Structures

The following data structures are defined within the schema `$defs` sections.

**JudgmentTrigger.** Records the source and description of what triggered the candidate.

| Field         | Type   | Required | Description                                                                                                                   |
| ------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `source`      | enum   | Yes      | What detected or initiated this candidate. Values: `agent`, `rule`, `skill`, `tool`, `user`, `dependency-change`.             |
| `description` | string | Yes      | Human-readable description of what triggered detection. Should be specific enough to explain why the candidate was generated. |
| `hardTrigger` | string | No       | If a hard trigger rule matched, which rule it was (for example, "framework-selection" or "conflicting-evidence").             |
| `ruleId`      | string | No       | Identifier of the policy rule that triggered detection, if the source is `rule`.                                              |

**MaterialityAssessment.** Contains the scoring that determines the intervention level.

| Field                | Type             | Required | Description                                                                                                                                                                                                  |
| -------------------- | ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `score`              | integer (0-18)   | Yes      | Aggregate materiality score, computed as the sum of the six dimension scores.                                                                                                                                |
| `dimensions`         | object           | Yes      | Individual dimension scores. Contains six required integer fields (0-3 each): `methodologicalDiscretion`, `downstreamInfluence`, `uncertainty`, `consequence`, `reversibility`, `accountabilityRequirement`. |
| `detectorConfidence` | number (0.0-1.0) | No       | Confidence of the detector in its assessment. Used in delegation conditions to ensure delegation only occurs with high-confidence assessments.                                                               |
| `hardTrigger`        | string           | No       | If a hard trigger rule applied, overriding the score-based intervention.                                                                                                                                     |
| `interventionLevel`  | enum             | No       | The determined intervention level: `trace`, `disclose`, `pause`, or `require-investigation`. Computed from the score and applicable policies.                                                                |

**JudgmentAlternative.** Describes a single alternative within a Judgment Point.

| Field            | Type                       | Required | Description                                                                                                                                                         |
| ---------------- | -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | string                     | Yes      | Unique identifier for this alternative within the Judgment Point.                                                                                                   |
| `label`          | string                     | Yes      | Short label (typically 3-10 words) for display and reference.                                                                                                       |
| `description`    | string                     | Yes      | Detailed description of what this alternative entails. Should be specific enough that a reviewer can evaluate it independently.                                     |
| `tradeoffs`      | string                     | No       | Known tradeoffs, risks, or consequences of selecting this alternative.                                                                                              |
| `evidenceRefs`   | array of ArtifactReference | No       | References to evidence (papers, standards, datasets, prior analyses) supporting or relevant to this alternative.                                                    |
| `source`         | enum                       | No       | Who or what proposed this alternative. Values: `agent`, `user`, `standard`, `prior-decision`.                                                                       |
| `comparisonData` | object                     | No       | Structured data from a comparison calculation, if one was performed. Schema is open (additionalProperties: true) to accommodate domain-specific comparison formats. |

**JudgmentAuthority.** Defines the authority assignment for a Judgment Point.

| Field      | Type   | Required | Description                                                                                          |
| ---------- | ------ | -------- | ---------------------------------------------------------------------------------------------------- |
| `mode`     | enum   | Yes      | The authority mode: `human`, `collaborative`, `delegated`, or `rule`.                                |
| `actorId`  | string | No       | Identifier of the person or agent authorized to resolve.                                             |
| `policyId` | string | No       | Identifier of the delegation policy that authorizes resolution, applicable when mode is `delegated`. |

**JudgmentResolution.** (Embedded in JudgmentPoint.) Records the outcome of the decision.

| Field                    | Type             | Required | Description                                                            |
| ------------------------ | ---------------- | -------- | ---------------------------------------------------------------------- |
| `selectedAlternativeId`  | string           | Yes      | Identifier of the chosen alternative from the alternatives array.      |
| `rationale`              | string           | Yes      | Explanation of why this alternative was selected. Must be substantive. |
| `resolvedAt`             | date-time        | Yes      | When the resolution was recorded.                                      |
| `resolvedBy`             | string           | No       | Identifier of the person, agent, or policy that resolved.              |
| `uncertainty`            | array of strings | No       | Known uncertainties at the time of resolution.                         |
| `conditions`             | array of strings | No       | Constraints on how the resolution should be implemented.               |
| `validationRequirements` | array of strings | No       | Checks to be performed after the resolution is applied.                |

**JudgmentRevision.** Records a change in the Judgment Point's status or resolution.

| Field                | Type               | Required | Description                                               |
| -------------------- | ------------------ | -------- | --------------------------------------------------------- |
| `timestamp`          | date-time          | Yes      | When the revision occurred.                               |
| `previousStatus`     | string             | Yes      | The status before this revision.                          |
| `newStatus`          | string             | Yes      | The status after this revision.                           |
| `reason`             | string             | Yes      | Why this revision occurred.                               |
| `previousResolution` | JudgmentResolution | No       | The resolution before this revision, preserved for audit. |
| `actorId`            | string             | No       | Who initiated this revision.                              |

### 27.5 Artifact Reference Structure

Artifact references establish traceability between decisions and technical work products. The ArtifactReference schema defines:

| Field          | Type   | Required | Description                                                                                                                                                                             |
| -------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`           | string | Yes      | Unique identifier for this reference.                                                                                                                                                   |
| `artifactType` | enum   | Yes      | The type of artifact: `cell`, `parameter`, `model`, `plot`, `conclusion`, `dataset`, `standard`, `requirement`, `document`, `computation`.                                              |
| `label`        | string | Yes      | Human-readable name or label for the artifact.                                                                                                                                          |
| `relationship` | enum   | Yes      | How the artifact relates to the Judgment Point: `depends-on`, `informs`, `produced-by`, `validates`, `contradicts`.                                                                     |
| `location`     | object | No       | Location information. Optional fields: `filePath` (relative to project root), `cellId` (notebook cell identifier), `lineRange` (start and end line numbers), `uri` (canonical address). |
| `description`  | string | No       | Human-readable description of the relationship.                                                                                                                                         |

The artifact types are intentionally broad to accommodate different technical domains. A `cell` is a notebook cell. A `parameter` is a named numerical value. A `model` is a mathematical or computational model. A `plot` is a visualization. A `conclusion` is a stated finding or recommendation. A `dataset` is a collection of data. A `standard` is a reference standard or specification. A `requirement` is a design or performance requirement. A `document` is a written document. A `computation` is a defined computational procedure.

---

## 28. Event Model

The event model defines how lifecycle actions on Judgment Points are recorded. Events form an append-only audit log that provides a complete, immutable history of every Judgment Point from creation through resolution and beyond.

### 28.1 Event Properties

Every event includes these required fields:

- `id`: A unique identifier for the event.
- `judgmentPointId`: The Judgment Point the event belongs to.
- `projectId`: The project the event belongs to.
- `eventType`: The type of event (from a defined enumeration).
- `timestamp`: When the event occurred (ISO 8601 date-time).
- `actorId`: Who or what caused the event.
- `actorType`: The type of actor (user, agent, system, or policy).

Events may also include:

- `payload`: An object containing event-specific data. The payload structure varies by event type. For `created` events, the payload may include the initial trigger and materiality assessment. For `resolution-recorded` events, it includes the resolution details. For `artifact-linked` events, it includes the artifact reference.
- `metadata`: Additional context including `correlationId` (for grouping related events), `sessionId` (the user or agent session), `toolName` (the tool executing when the event occurred), `policyId` (the governing policy), `previousStatus` and `newStatus` (for state transitions), and `notes` (free-form text).

### 28.2 Event Types

Fifteen event types are defined:

| Event Type                   | Meaning                                                              |
| ---------------------------- | -------------------------------------------------------------------- |
| `created`                    | Initial detection and creation of a candidate.                       |
| `promoted`                   | Candidate promoted to pending Judgment Point.                        |
| `investigation-started`      | Investigation of alternatives has begun.                             |
| `resolution-recorded`        | A resolution has been recorded.                                      |
| `delegated`                  | Resolution authority has been delegated.                             |
| `dismissed`                  | The Judgment Point has been dismissed.                               |
| `reopened`                   | A previously resolved or dismissed Judgment Point has been reopened. |
| `marked-stale`               | Conditions have changed; the resolution may no longer be valid.      |
| `dependency-changed`         | An upstream dependency has changed.                                  |
| `artifact-linked`            | An artifact has been linked to the Judgment Point.                   |
| `artifact-unlinked`          | An artifact has been unlinked from the Judgment Point.               |
| `alternative-added`          | A new alternative has been added.                                    |
| `comparison-requested`       | A structured comparison of alternatives has been requested.          |
| `comparison-completed`       | A structured comparison has been completed.                          |
| `validity-condition-changed` | A validity condition has been added, removed, or modified.           |

### 28.3 Event Payloads by Type

The payload structure varies by event type. The following describes the expected payload content for each event type.

**`created`**: The initial trigger information (source, description, hard trigger if applicable), the preliminary materiality assessment, and the initial set of alternatives. This payload captures the state of the candidate at the moment of detection.

**`promoted`**: The final materiality assessment (which may differ from the preliminary assessment if it was refined during evaluation), the determined intervention level, the assigned authority mode, and the matching policy identifier (if a policy matched).

**`investigation-started`**: The actor who initiated investigation. Optionally, a description of the investigation plan or initial questions to explore.

**`resolution-recorded`**: The complete resolution record, including the selected alternative identifier, rationale, resolution type, conditions, uncertainties, validation requirements, whether a recommendation was shown, and (if captured) the initial position and information presented.

**`delegated`**: The identifier of the delegatee, the delegation policy identifier, any additional delegation conditions specified by the delegating authority, and whether audit is required.

**`dismissed`**: The reason for dismissal, stated clearly enough that a reviewer can assess whether the dismissal was appropriate.

**`reopened`**: The reason for reopening, including what has changed since the previous resolution or dismissal. If an upstream dependency change triggered the reopening, the upstream Judgment Point identifier is included.

**`marked-stale`**: The reason for staleness (which validity condition failed, which upstream dependency changed, or what external change was detected). Includes references to the specific changes that triggered the staleness determination.

**`dependency-changed`**: The identifier of the upstream Judgment Point or artifact that changed, the nature of the change (reopened, revised, new data), and the assessment of how the change affects the current Judgment Point.

**`artifact-linked`**: The complete artifact reference being linked, including the artifact type, label, relationship, and location.

**`artifact-unlinked`**: The identifier of the artifact reference being removed and the reason for unlinking.

**`alternative-added`**: The complete alternative being added, including its identifier, label, description, tradeoffs, source, and any evidence references.

**`comparison-requested`**: The identifiers of the alternatives being compared, the comparison criteria (if specified), and the requested comparison method.

**`comparison-completed`**: The comparison results for each alternative, the comparison criteria used, and who or what performed the comparison.

**`validity-condition-changed`**: The previous condition (if modified or removed), the new condition (if added or modified), and the reason for the change.

### 28.4 Immutability

Events are immutable. Once an event is created, it is never modified or deleted. This property is essential for auditability and accountability. The event log for a Judgment Point is a complete, tamper-evident record of everything that happened to it.

If an error is made in an event (for example, an incorrect status transition is recorded), a corrective event is appended rather than the original event being modified. The corrective event references the original event and describes the correction.

### 28.4 Ordering

Events within a single Judgment Point's lifecycle are ordered by timestamp. When multiple events occur at the same timestamp (for example, when a batch operation generates several events in rapid succession), the ordering is determined by the sequence in which the system processed them. Implementations should ensure that events within a single Judgment Point are totally ordered, using a tie-breaking mechanism (such as a sequence number or insertion order) when timestamps collide.

---

## 29. API Behavior

The reference server will expose an HTTP API for creating, querying, resolving, and managing Judgment Points. The API specification will be defined in an OpenAPI document that is generated from and consistent with the JSON Schema definitions and the behaviors described in this specification.

### 29.1 Planned API Surface

The API will provide endpoints for the following operations:

**Judgment Point Operations:**

- Create a judgment candidate (POST).
- List Judgment Points with filtering by project, category, status, materiality score, and other criteria (GET with query parameters).
- Retrieve a single Judgment Point by identifier (GET).
- Promote a candidate to pending (PATCH).
- Transition a Judgment Point's status (investigating, resolved, delegated, dismissed, reopened) (PATCH).
- Add an alternative to a pending or investigating Judgment Point (POST sub-resource).
- Record a resolution (POST sub-resource).

**Policy Operations:**

- Create a policy (POST).
- List policies for a project (GET).
- Retrieve a single policy (GET).
- Update a policy (PUT or PATCH).
- Enable or disable a policy (PATCH).

**Event Operations:**

- List events for a Judgment Point (GET with filtering by event type, actor, and time range).
- List events for a project (GET with filtering).

**Artifact Reference Operations:**

- Link an artifact to a Judgment Point (POST).
- Unlink an artifact from a Judgment Point (DELETE).
- List artifact references for a Judgment Point (GET).

**Dependency Operations:**

- Query the dependency graph for a Judgment Point (upstream and downstream) (GET).
- Trigger a staleness check for a Judgment Point or project (POST).

### 29.2 Design Principles

The API will follow these design principles:

- RESTful resource-oriented design with standard HTTP methods (GET, POST, PUT, PATCH, DELETE) and status codes (200, 201, 204, 400, 404, 409, 422).
- JSON request and response bodies conforming to the JSON Schema definitions.
- Idempotent operations where applicable (PUT for full updates, PATCH for partial updates).
- Versioned endpoints (such as `/api/v1/`) to support backward compatibility as the API evolves.
- Consistent error response format with machine-readable error codes and human-readable messages.
- Support for pagination (offset/limit or cursor-based), filtering (query parameters), and sorting on list endpoints.
- Validation of all inputs against the JSON Schema definitions before processing.

### 29.3 Error Handling

The API will use standard HTTP status codes to indicate the outcome of each request. The following error responses are defined:

**400 Bad Request.** The request body is malformed or does not conform to the expected JSON Schema. The response body includes a machine-readable error code and a list of validation errors describing which fields failed validation and why. Example: a `judgment_emit_candidate` request that includes fewer than two alternatives would receive a 400 response with a validation error indicating that the `alternatives` array requires a minimum of two items.

**404 Not Found.** The requested resource does not exist. Example: requesting a Judgment Point by identifier when no Judgment Point with that identifier exists in the specified project.

**409 Conflict.** The requested state transition is not valid for the Judgment Point's current state. Example: attempting to resolve a Judgment Point that is in the `candidate` state (which is not a valid origin state for the `resolved` transition) or attempting to reopen a Judgment Point that is already in the `pending` state. The response body includes the current state and the attempted transition, so the client can understand why the request was rejected.

**422 Unprocessable Entity.** The request is syntactically valid but semantically invalid. Example: attempting to delegate a Judgment Point when no delegation policy exists, when the delegation conditions are not met, or when the Judgment Point's category is excluded from delegation. The response body includes a description of the semantic constraint that was violated.

**500 Internal Server Error.** An unexpected error occurred on the server. The response body includes a correlation identifier that can be used to locate the error in server logs for debugging.

All error responses use a consistent JSON format with the following fields: `error` (a machine-readable error code), `message` (a human-readable description of the error), `details` (an array of specific validation or constraint errors, when applicable), and `correlationId` (a unique identifier for correlating the error with server-side logs).

### 29.4 State Transition Enforcement

The API enforces the valid state transition set defined in Section 18.2. Each PATCH endpoint that modifies a Judgment Point's status validates the transition against the allowed transitions table. If the transition is not permitted, the API returns a 409 Conflict response.

The API also enforces the investigation requirement for `require-investigation` Judgment Points. If a client attempts to record a resolution on a Judgment Point with the `require-investigation` intervention level without first performing at least one investigative action (entering the `investigating` state, requesting a comparison, or adding an alternative), the API returns a 422 response indicating that investigation is required before resolution.

### 29.5 Pagination and Filtering

List endpoints support two pagination strategies:

**Offset-based pagination** uses `offset` and `limit` query parameters. This is suitable for small to moderate result sets where the total count is meaningful and the user may want to jump to a specific page. The response includes a `total` field indicating the total number of matching records.

**Cursor-based pagination** uses a `cursor` query parameter containing an opaque token returned from the previous page of results. This is suitable for large result sets where computing the total count is expensive and where results may change between page requests (for example, new events being appended to the event log). The response includes a `nextCursor` field (or null if there are no more results).

Filtering is supported through query parameters specific to each list endpoint. Common filter parameters include `status`, `category`, `materialityScoreMin`, `materialityScoreMax`, `createdAfter`, `createdBefore`, and `actorId`. Filters are combined with logical AND: all specified filters must match for a record to be included in the results.

### 29.6 Implementation Status

The reference server (`backend/reference_server`) implements all 19 HTTP endpoints described above using FastAPI. See `docs/api-reference.md` for the complete endpoint documentation with request and response examples.

---

## 30. MCP Integration

The Judgment Points system integrates with the Model Context Protocol (MCP) to enable AI agents and LLM-based systems to interact with judgment records through standardized protocol mechanisms. The MCP integration is implemented in the `judgment-mcp` package.

### 30.1 Protocol Version

The MCP integration targets MCP protocol version `2026-07-28`. All MCP interactions conform to this protocol version. The integration will be updated if the MCP protocol version changes.

### 30.2 SDK

The MCP server is built using the MCP Python SDK (`mcp` >= 1.0), which provides the server framework, tool and resource registration, and the MRTR (input-required) mechanism.

- `@modelcontextprotocol/core` for shared types, schemas, and utility functions used by both server and client packages.

### 30.3 Sampling Deprecation

The MCP Sampling feature is deprecated in protocol version `2026-07-28`. The Judgment Points MCP integration does not use Sampling for any purpose. Sampling was previously used in some MCP servers to allow the server to request the LLM to generate text, but this pattern has been superseded by MRTR. Implementations must not build around Sampling; they should use the tools/resources pattern and MRTR (Section 30.6) for all server-client interactions.

### 30.4 MCP Resources

The MCP server will expose the following resources, each identified by a URI.

**`judgment://project/{projectId}/points`**
A list of Judgment Points for a given project. Supports filtering by status, category, and materiality score through URI parameters. Returns a JSON array of Judgment Point summaries (not full records, to limit payload size on large projects). This resource provides read access to the current state of judgment records.

**`judgment://project/{projectId}/points/{pointId}`**
A single Judgment Point record, including its full state: question, context, category, trigger, materiality, alternatives (with comparison data), authority, resolution (if any), validity conditions, reopen conditions, artifact references, and revision history.

**`judgment://project/{projectId}/policies`**
The active policies for a given project. Returns a JSON array of policy records. Only enabled policies are included by default; a query parameter can include disabled policies.

**`judgment://project/{projectId}/policies/{policyId}`**
A single policy record with its full rule set, scope, and delegation conditions.

**`judgment://project/{projectId}/events/{pointId}`**
The event log for a given Judgment Point. Returns a JSON array of events in chronological order. Supports filtering by event type and time range.

**`judgment://project/{projectId}/dependencies/{pointId}`**
The dependency graph for a given Judgment Point. Returns upstream dependencies (Judgment Points and artifacts that this decision depends on) and downstream dependencies (Judgment Points and artifacts that depend on this decision).

Resource subscriptions use `subscriptions/listen` to receive notifications when judgment records change. This is the current subscription mechanism in protocol version `2026-07-28`, replacing the deprecated `resources/subscribe` pattern. Clients subscribe to resource URIs and receive notifications when the resource content changes (for example, when a Judgment Point's status transitions or when a new resolution is recorded).

### 30.5 MCP Tools

The MCP server will expose the following tools.

**`judgment_emit_candidate`**
Creates a new judgment candidate. Input parameters: question (string), category (enum), trigger (object with source and description), alternatives (array of at least two alternative objects), context (string), materiality (materiality assessment object), affectedArtifactIds (array of strings). Returns the created candidate record with its assigned identifier and status.

**`judgment_resolve`**
Records a resolution for a Judgment Point. Input parameters: judgmentPointId (string), selectedAlternativeId (string), rationale (string), resolutionType (enum), conditions (array of strings, optional), uncertainty (array of strings, optional), validationRequirements (array of strings, optional), recommendationShown (boolean). Returns the updated Judgment Point record with the resolution attached.

**`judgment_add_alternative`**
Adds a new alternative to a pending or investigating Judgment Point. Input parameters: judgmentPointId (string), label (string), description (string), tradeoffs (string, optional), source (enum, optional), evidenceRefs (array, optional). Returns the updated Judgment Point record.

**`judgment_request_comparison`**
Requests a structured comparison of alternatives. Input parameters: judgmentPointId (string), alternativeIds (array of strings, optional; compares all if omitted), criteria (array of strings, optional). Returns an acknowledgment. The comparison results are attached to the alternatives when the comparison is completed and a `comparison-completed` event is recorded.

**`judgment_delegate`**
Delegates resolution authority for a Judgment Point. Input parameters: judgmentPointId (string), delegateeId (string), policyId (string), conditions (array of strings, optional). Returns the updated Judgment Point record with delegated status. Fails if the delegation conditions in the applicable policy are not met.

**`judgment_dismiss`**
Dismisses a Judgment Point. Input parameters: judgmentPointId (string), reason (string). Returns the updated record with dismissed status and the reason recorded.

**`judgment_reopen`**
Reopens a previously resolved or dismissed Judgment Point. Input parameters: judgmentPointId (string), reason (string). Returns the updated record with reopened status.

**`judgment_query`**
Queries Judgment Points. Input parameters: projectId (string), status (enum or array, optional), category (enum or array, optional), materialityScoreMin (integer, optional), materialityScoreMax (integer, optional), limit (integer, optional), offset (integer, optional). Returns a paginated list of matching Judgment Point summaries.

### 30.6 User Interaction Through MRTR

When the MCP server needs to present a Judgment Point to the user for resolution (at the `pause` or `require-investigation` intervention level), it uses the MRTR (Multi Round-Trip Requests) mechanism with the `input-required` signal.

The interaction proceeds as follows:

1. The server processes a tool call (such as `judgment_emit_candidate`) that results in a Judgment Point at the `pause` or `require-investigation` level.
2. The server returns a response with the `input-required` signal, including the Judgment Point data in a structured format that the client can present to the user.
3. The client receives the response, recognizes the `input-required` signal, and presents the Judgment Point to the user through its user interface.
4. The user examines the Judgment Point, reviews the alternatives, and records a resolution (or takes another action such as delegating or dismissing).
5. The client sends the user's response back to the server in a subsequent request.
6. The server processes the response, updates the Judgment Point record, and returns the result.

This approach replaces the deprecated Sampling and elicitation patterns from earlier MCP protocol versions. It is compatible with any MCP client that supports MRTR and the `input-required` mechanism. The Judgment Points MCP server does not fall back to deprecated patterns; clients that do not support MRTR will not be able to handle pause-level judgments interactively.

### 30.7 MCP Error Handling

The MCP server returns structured error responses when tool calls fail. Each error response includes an error code, a human-readable message, and (where applicable) additional context about the failure. The following error conditions are defined:

**Invalid input.** When a tool receives input that does not conform to the expected schema (for example, a missing required field, an invalid enum value, or an incorrect type), the server returns an error indicating which field failed validation and what was expected. This enables the agent to correct the input and retry.

**Invalid state transition.** When a tool attempts an operation that is not valid for the Judgment Point's current state (for example, attempting to resolve a Judgment Point that is in the `candidate` state), the server returns an error indicating the current state and the attempted operation. The error message explains which transitions are valid from the current state.

**Delegation not permitted.** When the `judgment_delegate` tool is called but delegation conditions are not met (the materiality score exceeds the maximum for delegation, the category is excluded, the required confidence threshold is not met, or prior human resolution is required but does not exist), the server returns an error identifying which delegation condition was not satisfied.

**Judgment Point not found.** When a tool references a Judgment Point identifier that does not exist, the server returns a not-found error. The agent should verify that the identifier is correct before retrying.

**Investigation required.** When the `judgment_resolve` tool is called on a Judgment Point at the `require-investigation` intervention level and no investigation activities have been performed (no comparison requested, no alternative added, no investigation-started event recorded), the server returns an error indicating that investigation is required before resolution.

### 30.8 MCP Implementation Status

The MCP server (`backend/judgment_mcp`) implements the tools and resources described in this section. It targets MCP protocol version 2026-07-28 and uses stdio transport. See `docs/mcp-integration.md` for details on current limitations.

---

## 31. Agent Skill Integration

The Judgment Points system provides Agent Skill definitions for use in agent systems that support the Agent Skills specification. The Agent Skills specification is published at agentskills.io/specification. It was published as an open standard on December 18, 2025, and has been adopted by 26 or more platforms as of August 2026.

### 31.1 Skill Definitions

Two Agent Skills are defined in the `skills/` directory of the repository.

**technical-judgment-review.** This skill enables an agent to perform the full judgment workflow within a technical analysis: detecting consequential choices, generating well-formed candidates, investigating alternatives, performing structured comparisons, and guiding the resolution process. The skill includes detection criteria specific to technical analysis workflows, guidance for formulating clear judgment questions, and templates for structuring alternatives with tradeoff descriptions.

**dependency-tracing.** This skill enables an agent to trace the dependency relationships between Judgment Points and artifacts. Given a Judgment Point or an artifact, the agent can map the upstream decisions that led to it and the downstream work that depends on it. This skill is used during dependency propagation, impact assessment, and change analysis.

### 31.2 Progressive Loading

Agent Skills are loaded using the three-tier progressive loading model defined in the Agent Skills specification.

**Discovery (Tier 1: frontmatter only).** The agent loads only the SKILL.md frontmatter to determine whether the skill is relevant to the current task. Frontmatter includes the skill name, version, description, supported categories, activation conditions, and compatibility information. This tier involves minimal data transfer (typically a few hundred bytes) and allows the agent to decide whether to activate the skill without loading the full definition.

Discovery loading is appropriate when the agent is scanning available skills to determine which ones to activate. The agent reads the frontmatter of each available skill and activates only those whose activation conditions match the current task context.

**Activation (Tier 2: full SKILL.md).** When the agent determines that the skill is relevant, it loads the full SKILL.md file. The full file includes detailed instructions for using the skill, input and output specifications, behavioral constraints, error handling guidance, and integration requirements. This tier provides the information the agent needs to use the skill effectively.

Activation loading occurs when the agent decides to use the skill for the current task. The agent reads the full SKILL.md and incorporates its instructions into its behavior.

**Reference (Tier 3: supporting files).** For complex tasks, the agent loads supporting files referenced by the SKILL.md. These may include schema definitions (such as the Judgment Point schema), example workflows, validation criteria, domain-specific knowledge bases, and prompt templates. This tier provides depth beyond what is contained in the skill definition itself.

Reference loading occurs during investigation and comparison phases, when the agent needs detailed information about specific aspects of the judgment workflow (such as the exact schema for a resolution record or the criteria for a structured comparison).

### 31.3 Skill Interaction Model

Agent Skills interact with the Judgment Points system through the SDK or MCP interfaces. A skill does not implement its own judgment logic; it uses the system's APIs to emit candidates, query existing judgments, add alternatives, request comparisons, and record resolutions.

This separation ensures that all judgment operations, regardless of the invoking skill, follow the same lifecycle, policy model, and audit trail. A judgment created by the technical-judgment-review skill and a judgment created by a different skill (or by direct API call) are indistinguishable in the audit log except for the trigger source and tool name recorded in the event metadata.

### 31.4 Skill Content Structure

Each Agent Skill definition in the `skills/` directory follows a consistent structure designed to support the three-tier progressive loading model.

**SKILL.md frontmatter.** The frontmatter is a YAML block at the beginning of the SKILL.md file. It contains metadata used during Discovery (Tier 1) loading:

- `name`: The skill name (for example, "technical-judgment-review").
- `version`: The skill version, following SemVer.
- `description`: A concise description of the skill's purpose and capabilities (one to two sentences).
- `categories`: The judgment categories the skill is primarily designed to handle.
- `activation_conditions`: Conditions under which the skill should be activated (for example, "when the agent is performing technical analysis that involves consequential choices").
- `required_tools`: MCP tools or API endpoints the skill requires (for example, "judgment_emit_candidate", "judgment_resolve").
- `compatibility`: Compatibility information (supported agent frameworks, MCP protocol versions, etc.).

**SKILL.md body.** The body of the SKILL.md file contains the full skill definition used during Activation (Tier 2) loading:

- Detailed instructions for performing judgment detection, including category-specific detection criteria and example situations.
- Guidance for formulating clear, specific judgment questions that accurately describe the choice.
- Templates and examples for structuring alternatives with balanced descriptions and substantive tradeoff analysis.
- Instructions for performing structured comparisons, including recommended comparison criteria for different judgment categories.
- Guidance for assessing materiality along the six dimensions, including domain-specific scoring examples.
- Error handling instructions (what to do when detection is uncertain, when alternatives are difficult to identify, or when the judgment category is ambiguous).

**Supporting files.** Supporting files referenced by the SKILL.md provide depth for Reference (Tier 3) loading:

- JSON Schema files defining the data structures the skill uses (Judgment Point schema, Resolution schema, etc.).
- Example judgment records showing well-formed candidates and resolutions for reference.
- Domain-specific knowledge bases (for example, common consequential choices in thermal analysis, common modeling decisions in structural analysis, or common statistical judgment points in data analysis).
- Prompt templates for specific judgment categories.

### 31.5 Skill Versioning and Compatibility

Agent Skills are versioned independently from the specification. A skill's version indicates compatibility with a specific range of specification versions. When the specification introduces new fields, new event types, or new categories, skills should be updated to take advantage of the new capabilities.

Skills should declare their minimum and maximum compatible specification versions in their frontmatter. Agent systems that load skills can use this compatibility information to determine whether a skill is appropriate for the current system version. A skill that declares compatibility with specification 0.1.x should not be used with a system implementing specification 0.2.x unless the skill has been verified to work correctly with the newer schema definitions.

---

## 32. LangGraph Integration

The Judgment Points system integrates with LangGraph to support durable judgment workflows in LangGraph-based agent graphs. The LangGraph integration is implemented in the `judgment-langgraph` package.

### 32.1 Version Compatibility

The LangGraph integration targets LangGraph Python v1.2.10 and LangGraph JS/TS v1.4.8. These are the versions against which the integration is developed and tested. The integration uses stable LangGraph APIs and will be updated as new LangGraph versions are released.

### 32.2 Interrupt and Resume

When a Judgment Point requires user engagement (at the `pause` or `require-investigation` intervention level), the LangGraph adapter uses the `interrupt()` function to halt the graph execution at the current node.

The `interrupt()` function is a LangGraph primitive that pauses execution of the current graph node, persists the graph state, and returns control to the caller. The caller can then present the interruption reason to the user, collect the user's input, and resume execution.

The `interrupt()` call includes the Judgment Point data as its payload. This payload contains the full Judgment Point record: the question, context, alternatives, materiality assessment, authority assignment, and any evidence references. The LangGraph runtime passes this payload to the client, which presents the judgment to the user.

After the user resolves the Judgment Point (by selecting an alternative, providing a rationale, and recording a resolution), execution resumes using `Command(resume=value)`, where `value` contains the resolution data. The adapter extracts the resolution from the `Command` value, records it on the Judgment Point (including all resolution fields: selected alternative, rationale, conditions, uncertainties, validation requirements, resolution type, and bias-awareness fields), updates the Judgment Point's status to `resolved`, and continues the graph execution from the point of interruption.

This pattern provides durable pausing: the graph state is persisted through LangGraph's checkpointing mechanism, and the workflow can resume after an arbitrary delay. The user can close their browser, the server can restart, and days can pass between the `interrupt()` and the `Command(resume=)`. The judgment context is preserved throughout.

### 32.3 Checkpointing

LangGraph saves graph state at each superstep through its checkpointing mechanism. A superstep is a complete execution cycle of a set of graph nodes. The Judgment Points adapter uses this checkpointing to ensure that:

- The state of all Judgment Points (including pending, investigating, and resolved records) is persisted with the graph state at every superstep.
- If the workflow is interrupted by a judgment pause, the full context (including all judgment records, their current states, and their relationships) is available when the workflow resumes.
- If the server restarts, the process is terminated, or a network interruption occurs while a judgment is pending, the workflow can be resumed from the most recent checkpoint with all judgment context intact.

The adapter stores Judgment Point state within the LangGraph graph state. This means that judgment data is automatically included in checkpoints without requiring separate persistence infrastructure. The trade-off is that the graph state grows as judgments accumulate; for long-running workflows with many judgments, the checkpoint size may become significant.

For workflows that require independent judgment persistence (for example, to query judgment records from outside the LangGraph runtime), the adapter can be configured to write judgment records to an external storage adapter (such as the SQLite adapter) in addition to including them in the graph state. This dual-write approach provides both the durability of LangGraph checkpointing and the queryability of external storage.

### 32.4 Graph Structure

The LangGraph adapter provides composable graph components that can be integrated into any LangGraph graph structure.

**Judgment detection node.** A graph node that evaluates the current state for potential judgment candidates. This node can be inserted at points in the graph where consequential choices are likely to arise (for example, before a model selection step, before a parameter setting step, or before a final interpretation step). The detection node evaluates the state against detection criteria, emits judgment candidates if warranted, and either continues execution (if the intervention level is trace or disclose) or invokes `interrupt()` (if the level is pause or require-investigation).

**Judgment resolution node.** A graph node that handles the `interrupt()`/`Command(resume=)` cycle for Judgment Points that require user engagement. This node presents the judgment, waits for the user's resolution, processes the resolution, updates the graph state, and transitions to the next node in the graph.

**Judgment propagation node.** A graph node that checks resolved Judgment Points for staleness and propagates changes to downstream nodes. This node can be inserted at the end of a workflow stage to ensure that decisions made in that stage have not been invalidated by upstream changes.

These nodes can be composed into any LangGraph graph structure, including linear pipelines, branching and merging graphs, multi-agent workflows with separate detector and executor agents, and iterative loops that revisit previous decisions.

### 32.5 Integration Pattern: Single-Agent Workflow

In a single-agent workflow, one agent performs all roles (detector, analyst, executor). The LangGraph graph is a linear or branching pipeline where each node represents a workflow step. Judgment detection nodes are inserted before steps where consequential choices are expected.

The flow is:

1. A workflow node produces output that includes a consequential choice.
2. The downstream judgment detection node evaluates the output for judgment candidates.
3. If a candidate is generated and the intervention level requires user engagement, `interrupt()` is called.
4. The user reviews the Judgment Point through the LangGraph client interface and provides a resolution.
5. `Command(resume=resolution_data)` resumes the graph.
6. The next workflow node proceeds using the resolved approach.

### 32.6 Integration Pattern: Multi-Agent Workflow

In a multi-agent workflow, different agents serve different roles. A detector agent identifies potential judgments. An analyst agent investigates alternatives and performs comparisons. An executor agent carries out the resolved approach.

The LangGraph graph in this pattern uses conditional edges to route work between agents based on judgment status. When a judgment candidate is created, the graph routes to the analyst agent for investigation. When the user resolves the judgment, the graph routes to the executor agent for implementation. The judgment record flows through the graph state, accessible to all agents.

This pattern separates concerns and allows each agent to be optimized for its role: the detector can be tuned for high recall, the analyst for thorough comparison, and the executor for efficient implementation.

### 32.7 Error Handling in LangGraph Integration

Several error conditions can arise during LangGraph-based judgment workflows. The adapter handles these as follows:

**Interrupt timeout.** If a judgment is interrupted and the user does not respond within a configurable timeout period, the adapter takes no automatic action. The graph remains in its interrupted state indefinitely (or until the LangGraph runtime's own checkpointing storage policy expires the checkpoint). The adapter does not resolve judgments on behalf of absent users. Notification mechanisms (such as email or messaging integrations) are outside the scope of the adapter but can be built on top of it using LangGraph's callback infrastructure.

**Invalid resume value.** If the `Command(resume=value)` contains data that does not conform to the expected resolution schema (for example, missing required fields, invalid alternative identifiers, or non-existent Judgment Point references), the adapter rejects the resume, returns an error description to the client, and keeps the graph in its interrupted state. The user can correct the input and try again.

**Concurrent modifications.** If the Judgment Point's state changes between the time of the interrupt and the time of the resume (for example, if another process marks the Judgment Point as stale while the user is formulating their resolution), the adapter detects the version mismatch and notifies the user that the Judgment Point's state has changed. The user can review the updated state and provide a new resolution that accounts for the changes.

**Graph node failures.** If a graph node fails during judgment detection or propagation (due to errors in the detection logic, schema validation failures, or storage adapter errors), the adapter logs the error as a Judgment Event with appropriate metadata (including the error details and the node that failed) and allows the graph to handle the error according to its own error handling strategy (retry, skip, or fail). The adapter does not suppress errors; it ensures they are recorded in the judgment audit trail.

### 32.8 LangGraph Implementation Status

The LangGraph adapter (`backend/judgment_langgraph`) implements the interrupt-based pause and resume pattern described in this section using the Python LangGraph SDK (langgraph >= 0.4).

---

## 33. Native WEEMS Integration

This section describes how Judgment Points are intended to be presented and managed within the WEEMS technical computing environment. WEEMS is a trademark of its respective owner, and this project is not affiliated with, endorsed by, or sponsored by the WEEMS trademark holder. The integration described here is a reference design based on public knowledge of WEEMS capabilities. It describes planned functionality, not existing features.

### 33.1 Canvas Markers

Judgment Points will be represented in the WEEMS canvas as inline markers adjacent to the cells, parameters, or artifacts they affect. Each marker displays the Judgment Point's status using a visual indicator that is distinguishable without relying on color alone (using icons, labels, or patterns in addition to color).

Marker states and their visual treatment:

- **Pending**: Indicates a decision awaiting attention. Visually prominent to draw the user's focus.
- **Investigating**: Indicates active investigation. Visually distinct from pending to show that work is in progress.
- **Resolved**: Indicates a completed decision. Visually subdued relative to pending and investigating states, but still visible for reference.
- **Stale**: Indicates a previously resolved decision that needs re-examination. Visually prominent, similar to pending, to draw attention to the need for review.

Clicking a marker opens the judgment panel (Section 33.3) for that Judgment Point.

### 33.2 Activity Rail

The activity rail (a persistent sidebar or panel in the WEEMS interface) will include a judgment section showing the current state of all Judgment Points in the project. The activity rail provides:

- A count of Judgment Points by status, showing at a glance how many decisions are pending, investigating, resolved, and stale.
- Filtered views allowing the user to see Judgment Points by category, by materiality level, by artifact, or by status.
- Quick access to any Judgment Point's detail panel by clicking its entry in the activity rail.
- Notification indicators for new Judgment Points that have been created since the user last viewed the activity rail, and for Judgment Points that have become stale since their last review.

### 33.3 Judgment Panel

The judgment panel is the primary interface for interacting with a single Judgment Point. It presents all the information needed to understand and resolve the judgment. The panel contains the following sections:

- **Question.** The specific question being decided, displayed prominently at the top of the panel.
- **Context.** The background information explaining why this choice has arisen and what circumstances surround it.
- **Alternatives.** The available alternatives, each with its label, description, tradeoffs, evidence references, and source. If comparison data has been computed, it is displayed alongside or within each alternative.
- **Materiality.** The materiality assessment, showing the aggregate score, the individual dimension scores, and the resulting intervention level. The user can see why this particular intervention level was applied.
- **Authority.** The authority assignment and any applicable delegation conditions, so the user understands their role in the decision.
- **Evidence.** References to standards, data sources, prior decisions, and other evidence that informs the choice.
- **Resolution.** If a resolution has been recorded, the selected alternative, rationale, conditions, validation requirements, and resolution metadata are displayed. For stale Judgment Points, the previous resolution is shown alongside an indication of what has changed.
- **Event Log.** The chronological event log for the Judgment Point, showing every state transition and action taken.

The panel supports all primary actions described in Section 34 through clearly labeled interactive elements.

### 33.4 Comparison Mode

When the user requests a comparison of alternatives, the interface enters comparison mode. In comparison mode, the alternatives are displayed in a side-by-side layout with their respective evidence, tradeoffs, and quantitative comparison data (if computed).

The comparison layout allows the user to evaluate each alternative against the same criteria and to see differences and commonalities clearly. If quantitative comparison data is available (for example, computed outlet temperatures for two different modeling approaches), it is presented in a tabular or graphical format alongside the qualitative descriptions.

Comparison mode is available for any Judgment Point with two or more alternatives. At the `require-investigation` intervention level, entering comparison mode (or performing another form of investigation) is required before resolution is permitted.

### 33.5 Resolved State Display

When a Judgment Point is resolved, the canvas marker updates to show the resolved state. The judgment panel for a resolved Judgment Point displays the selected alternative prominently, along with the rationale, conditions, and validation requirements.

Resolved Judgment Points are not removed from the interface. They remain visible and accessible for audit, reference, and dependency tracking. A reviewer can open any resolved Judgment Point to understand why a particular approach was chosen and what conditions bound the decision.

If a resolved Judgment Point subsequently becomes stale, the marker and panel update to indicate the stale state. The stale display shows both the previous resolution and the change that triggered staleness, so the user can assess whether the resolution is still appropriate without re-reading the entire Judgment Point from scratch.

### 33.6 Project View

The project view provides a high-level summary of all Judgment Points across the project. It shows:

- The total count and distribution of Judgment Points by category and status.
- The distribution of materiality scores, showing whether the project's decisions are concentrated at low, moderate, or high materiality.
- A dependency graph visualization showing how Judgment Points relate to each other and to artifacts.
- A timeline showing when judgments were created and resolved, which can reveal patterns such as clusters of decisions at particular workflow stages.
- Identification of decision chains where changes to one judgment could cascade to multiple downstream items.

The project view is intended for project leads, reviewers, and auditors who need to understand the decision landscape of a project without examining each Judgment Point individually.

### 33.7 Notification Behavior

The WEEMS integration will implement notification behavior appropriate to each intervention level.

**Trace-level judgments** produce no active notification. They are recorded in the event log and visible in the project view but do not surface in the activity rail's notification indicators. Users who want to see trace-level judgments must explicitly filter for them.

**Disclose-level judgments** produce a non-blocking notification in the activity rail. The notification indicates that a judgment was recorded and provides a summary (category, question, and the agent's initial selection). The notification does not interrupt the user's current work. It remains visible until the user acknowledges it or the judgment is subsequently resolved with explicit engagement.

**Pause-level judgments** produce a blocking notification that halts the workflow and draws the user's attention. The notification is visually prominent and requires the user to open the judgment panel to proceed. The workflow does not continue until the user takes action (resolving, delegating, dismissing, or beginning investigation).

**Require-investigation judgments** produce a blocking notification with an additional visual indicator that investigation is required. The resolve action is visually disabled until investigation activities have been performed. The notification explains that the decision is consequential enough to require examination of alternatives before resolution.

### 33.8 Keyboard Shortcuts for Common Actions

The WEEMS integration will define keyboard shortcuts for common judgment actions to support efficient workflows. Planned shortcuts include:

- Navigate to the next pending Judgment Point in the activity rail.
- Navigate to the previous pending Judgment Point in the activity rail.
- Open the judgment panel for the currently focused Judgment Point.
- Close the judgment panel and return focus to the canvas.
- Enter comparison mode for the current Judgment Point.
- Toggle between the judgment panel sections (alternatives, evidence, event log).

All keyboard shortcuts must comply with the accessibility requirements in Section 39.2: they must not conflict with screen reader shortcuts, browser shortcuts, or operating system shortcuts, and they must be discoverable and configurable.

---

## 34. Interface Behavior

This section defines the primary actions available to the user when interacting with a Judgment Point. These actions correspond to the operations described in the lifecycle (Section 18) and the runtime sequence (Section 19). The interface should present these actions clearly and should prevent invalid actions (for example, preventing resolution without investigation at the `require-investigation` level).

### 34.1 Choose

The user selects one of the available alternatives and records a resolution. The interface presents the alternatives, allows the user to select one, and prompts for a rationale explaining the selection. The system also collects the required resolution metadata: resolution type, whether a recommendation was shown, and any conditions, uncertainties, or validation requirements the user wishes to attach.

If the Judgment Point is at the `require-investigation` level and no investigation activities have been performed, the Choose action is disabled. The interface displays a message explaining that investigation is required before resolution.

### 34.2 Compare First

The user requests a structured comparison of the alternatives before making a decision. The interface initiates a comparison process (which may involve agent computation, data retrieval, sensitivity analysis, or side-by-side formatting of existing data) and presents the results in comparison mode (Section 33.4). After reviewing the comparison, the user can proceed to choose an alternative.

The Compare First action satisfies the investigation requirement at the `require-investigation` level, because it involves examining the alternatives in a structured way.

### 34.3 Investigate

The user begins an open-ended investigation of the Judgment Point. The Judgment Point transitions to the `investigating` state. During investigation, the user has full access to all information and tools: they can review evidence, add alternatives, request comparisons, consult prior judgments, query external data sources, and gather any information they need to make an informed decision.

Investigation does not have a fixed workflow or a predefined sequence of steps. It supports the decision-maker's process for arriving at an informed judgment, whatever that process may be. The system records investigation activities as events (comparison-requested, alternative-added, artifact-linked) to provide an audit trail of the investigation process.

### 34.4 Add Alternative

The user adds a new alternative that was not part of the original candidate. The interface provides a form for entering the alternative's label, description, tradeoffs, and evidence references. The source is recorded as `user`.

Adding an alternative is available at the `pending` and `investigating` states. It is not available after resolution (to add an alternative to a resolved Judgment Point, the user must first reopen it).

### 34.5 Delegate with Conditions

The user delegates resolution authority to an agent or another party. The interface presents the applicable delegation conditions from the matching policy and allows the user to confirm or add additional conditions. Delegation fails if no delegation policy exists, if the delegation conditions are not met (for example, the materiality score exceeds the maximum for delegation, or the category is excluded from delegation), or if the policy requires prior human resolution of a similar judgment and no such precedent exists.

The delegation is recorded as an event, and the Judgment Point transitions to the `delegated` state.

### 34.6 Request Review

The user requests a review of the Judgment Point by another authority. The interface allows the user to specify who should review (by identifier or by role) and to add context about what aspects of the judgment they want reviewed. The review request is recorded as an event.

The reviewer can view the Judgment Point through the same interface and provide their assessment. The review outcome does not automatically change the Judgment Point's status; it provides input that the original authority can use in their resolution decision.

### 34.7 Not a Consequential Choice

The user dismisses the Judgment Point, indicating that it does not represent a genuinely consequential choice. The interface requires the user to provide a reason for dismissal. Valid reasons include: the choice is not actually consequential (it does not affect downstream work), the question is moot (circumstances have changed), the candidate was generated in error (the detection was a false positive), or the choice has already been committed through an external process.

The Judgment Point transitions to the `dismissed` state. Dismissed Judgment Points remain in the audit trail and can be reopened if subsequent information suggests the choice was consequential after all.

### 34.8 Reopen

The user reopens a previously resolved or dismissed Judgment Point. The interface requires the user to provide a reason for reopening. The previous resolution (if any) is preserved in the revision history. The Judgment Point transitions to the `reopened` state and enters a new resolution cycle.

Reopening is appropriate when the user has learned something that changes the basis for the prior decision (new data, revised requirements, changed conditions), when a staleness notification has indicated that the resolution may no longer be valid, or when a reviewer has raised concerns about the prior resolution.

The reopened Judgment Point can proceed through investigation, resolution, delegation, or dismissal, following the same lifecycle as any other pending Judgment Point. The user is not required to select a different alternative; they may confirm the prior resolution with an updated rationale reflecting the changed context.

### 34.9 Action Availability by State

Not all actions are available in all states. The following table summarizes which primary actions are available in each Judgment Point state:

| Action          | Candidate | Pending | Investigating | Resolved | Delegated | Dismissed | Stale | Reopened |
| --------------- | --------- | ------- | ------------- | -------- | --------- | --------- | ----- | -------- |
| Choose          | No        | Yes*    | Yes           | No       | No        | No        | No    | Yes*     |
| Compare First   | No        | Yes     | Yes           | No       | No        | No        | No    | Yes      |
| Investigate     | No        | Yes     | N/A           | No       | No        | No        | No    | Yes      |
| Add Alternative | No        | Yes     | Yes           | No       | No        | No        | No    | Yes      |
| Delegate        | No        | Yes     | Yes           | No       | No        | No        | No    | Yes      |
| Request Review  | No        | Yes     | Yes           | Yes      | Yes       | No        | Yes   | Yes      |
| Dismiss         | No        | Yes     | Yes           | No       | No        | No        | No    | Yes      |
| Reopen          | No        | No      | No            | Yes      | No        | Yes       | Yes   | No       |

*Choose is disabled at the `require-investigation` intervention level until investigation activities have been performed.

The interface must enforce this availability matrix. Actions that are not available for the current state should be visually disabled with a tooltip or message explaining why the action is unavailable. Actions should never be hidden entirely, because hidden actions cannot be discovered by users who are unfamiliar with the system.

---

## 35. Example Workflow

This section illustrates the Judgment Points framework through a concrete example: the development of a reduced-order thermal model (ROTM) for a heat exchanger analysis. This example demonstrates four distinct judgment points that arise during the analysis and shows how the lifecycle, materiality assessment, and resolution process work in practice.

### 35.1 Scenario

An engineer is working with an AI agent to develop a reduced-order thermal model of a shell-and-tube heat exchanger. The objective is to predict outlet temperatures under various operating conditions without running a full computational fluid dynamics (CFD) simulation. The AI agent performs the computational work (setting up models, running calculations, generating plots), and the engineer makes the consequential decisions about approach, data, parameters, and validation.

The project has a policy that requires the `pause` intervention for all method judgments with materiality scores above 8, and requires the `require-investigation` intervention for any judgment triggered by Hard Trigger 2 (framework or methodology selection) with a materiality score above 12.

### 35.2 Judgment Point 1: Modeling Approach Selection

**Category:** Method

**Question:** Which reduced-order modeling approach should be used for the heat exchanger thermal analysis: a lumped capacitance model, an effectiveness-NTU method, or a discretized finite-difference model?

**Trigger:** Framework or methodology selection (Hard Trigger 2). The agent recognized that selecting the modeling approach is a top-level methodology decision with multiple defensible options.

**Alternatives:**

Alternative A: Lumped Capacitance Model. Treats the heat exchanger as a single thermal mass with uniform temperature. Simple to implement, fast to execute, and easy to validate against analytical solutions. Tradeoff: Cannot capture spatial temperature variations along the length of the exchanger. Not suitable for identifying hot spots or evaluating non-uniform property distributions.

Alternative B: Effectiveness-NTU Method. Uses the effectiveness-NTU relations for the specific heat exchanger geometry (shell-and-tube, one shell pass, two tube passes). Provides accurate prediction of outlet temperatures for steady-state conditions with uniform properties. Tradeoff: Limited to specific flow configurations codified in the NTU relations; does not capture transient behavior or spatial variations.

Alternative C: Discretized Finite-Difference Model. Divides the heat exchanger into segments along the tube length and solves energy balance equations for each segment. Captures spatial variations in temperature and can accommodate temperature-dependent material properties. Tradeoff: More complex to implement and validate; requires decisions about discretization level and numerical stability.

**Materiality Assessment:** Methodological discretion: 3 (substantial expert disagreement possible). Downstream influence: 3 (the modeling approach determines the structure of the entire analysis). Uncertainty: 2 (the consequences of each approach are reasonably well understood). Consequence: 2 (an inappropriate approach could produce misleading results). Reversibility: 2 (changing the approach after building the model requires substantial rework). Accountability requirement: 1 (good practice to document, but no formal regulatory requirement in this case). Aggregate score: 13. Intervention level: Pause (score 13 falls in the 9-13 range). Because Hard Trigger 2 applies and the score exceeds 12, the project policy escalates this to require-investigation.

**Resolution:** The engineer investigates by requesting a comparison. The agent computes the expected accuracy, computational cost, and feature support for each approach. After reviewing the comparison, the engineer selects Alternative C (Discretized Finite-Difference Model) with the following rationale: "Spatial temperature variation along the tube length is important for the intended use case of evaluating hot spots near the tube sheet. The finite-difference approach can capture these variations and can be validated against both the NTU analytical solution (for the uniform-properties limiting case) and available experimental data. The additional implementation complexity is justified by the analysis requirements."

The resolution includes the condition: "The finite-difference model must be validated against the Effectiveness-NTU solution for the case of uniform properties before being used for non-uniform property analysis."

Resolution type: Collaborative. Recommendation shown: Yes (the agent's comparison included a note that Alternative C best matched the stated requirements).

### 35.3 Judgment Point 2: Property Data Source Selection

**Category:** Data

**Question:** Which source of temperature-dependent material property data should be used for the tube-side fluid: NIST Webbook correlations or manufacturer-provided data sheets?

**Trigger:** Assumption with measurable alternatives (Hard Trigger 4). The agent identified that two data sources were available with different values, and that choosing between them is a judgment about data fitness.

**Alternatives:**

Alternative A: NIST Webbook Correlations. Widely used, peer-reviewed reference data. Covers the temperature range 250 K to 1000 K. Published correlations with documented uncertainty bounds. Tradeoff: Correlations are generic (not lot-specific) and may not capture material variations from the manufacturer's specific production process.

Alternative B: Manufacturer-Provided Data Sheets. Specific to the material lot used in the actual heat exchanger. Covers the range 280 K to 600 K. Includes measured thermal conductivity, specific heat, and viscosity. Tradeoff: Narrower temperature range than the analysis requires; may not have been independently verified; measurement methodology not documented.

**Materiality Assessment:** Methodological discretion: 2. Downstream influence: 2. Uncertainty: 2. Consequence: 1. Reversibility: 1. Accountability requirement: 1. Aggregate score: 9. Intervention level: Pause.

**Resolution:** The engineer selects Alternative A (NIST Webbook correlations) with the rationale: "The analysis temperature range (300 K to 900 K) exceeds the manufacturer data range (280 K to 600 K), making the manufacturer data insufficient for the full analysis. Using NIST correlations provides coverage of the full range and consistency with an established, peer-reviewed reference. For conditions within the manufacturer data range, the NIST correlations and manufacturer data agree within 3%, which is within the analysis uncertainty."

The resolution includes the condition: "If the operating range is later narrowed to within the manufacturer data range (280 K to 600 K), this decision should be revisited because the manufacturer data would then be both sufficient and more specific."

Resolution type: Collaborative. Recommendation shown: Yes.

### 35.4 Judgment Point 3: Discretization Level

**Category:** Parameter

**Question:** How many segments should the finite-difference model use to discretize the heat exchanger length: 10, 50, or 200?

**Trigger:** Agent detection. The agent recognized that the number of segments is a consequential parameter affecting accuracy and computation time, with no single correct value determinable from the inputs.

**Alternatives:**

Alternative A: 10 segments. Coarse spatial resolution. Fast computation (sub-second). Tradeoff: May not capture localized thermal effects near the tube sheet.

Alternative B: 50 segments. Moderate spatial resolution. Reasonable computation time (a few seconds). Tradeoff: May be more resolution than needed for the intended use case, but provides good spatial detail.

Alternative C: 200 segments. Fine spatial resolution. Longer computation time (tens of seconds for each operating condition). Tradeoff: Diminishing accuracy returns beyond a certain resolution; computation time becomes significant when sweeping many operating conditions.

**Materiality Assessment:** Methodological discretion: 2. Downstream influence: 1. Uncertainty: 1. Consequence: 1. Reversibility: 1. Accountability requirement: 0. Aggregate score: 6. Intervention level: Disclose.

**Resolution:** Because the intervention level is `disclose`, the agent proceeds with Alternative B (50 segments) and notifies the engineer through the activity rail. The engineer reviews the choice at their convenience and confirms it, noting: "50 segments provides adequate spatial resolution for hot-spot identification. A convergence study should confirm that results are insensitive to further mesh refinement." The resolution includes the validation requirement: "Perform a convergence study comparing results at 50, 100, and 200 segments to confirm grid independence."

Resolution type: Collaborative. Recommendation shown: Yes (the agent selected 50 segments and disclosed the selection).

### 35.5 Judgment Point 4: Validation Acceptance Criteria

**Category:** Validation

**Question:** What maximum deviation from the Effectiveness-NTU analytical solution is acceptable for validating the finite-difference model under uniform-property conditions?

**Trigger:** Sensitivity threshold selection (Hard Trigger 5). The agent recognized that the validation criterion directly determines whether the model is considered "validated," and that the threshold is a judgment call with significant implications.

**Alternatives:**

Alternative A: 1% maximum deviation in outlet temperature. Strict criterion suitable for detailed design analysis. Tradeoff: May require very fine discretization or higher-order numerical methods to achieve, increasing implementation complexity and computation time.

Alternative B: 5% maximum deviation in outlet temperature. Moderate criterion typical for engineering screening analysis. Tradeoff: Permits meaningful spatial averaging effects in the discrete model; consistent with common practice for reduced-order models.

Alternative C: 10% maximum deviation in outlet temperature. Relaxed criterion. Tradeoff: May not provide sufficient confidence for downstream design decisions; might mask significant modeling errors.

**Materiality Assessment:** Methodological discretion: 2. Downstream influence: 2. Uncertainty: 1. Consequence: 2. Reversibility: 1. Accountability requirement: 1. Aggregate score: 9. Intervention level: Pause.

**Resolution:** The engineer selects Alternative B (5% maximum deviation) with the rationale: "This criterion is consistent with common engineering practice for screening-level thermal analysis. The intended use of the model (identifying hot-spot locations, not precise temperature prediction for detailed design) does not require 1% accuracy. A 5% criterion provides confidence that the model captures the relevant physics without imposing unnecessary accuracy requirements."

The resolution includes the condition: "If the model is later used for detailed design rather than screening, this acceptance criterion must be tightened to 1% or better, and the decision should be reopened."

Resolution type: Direct-human. Recommendation shown: No (the engineer stated their position before the agent provided analysis).

### 35.6 Dependency Relationships

The four Judgment Points form a dependency chain.

Judgment Point 1 (modeling approach) is the upstream foundation. The selection of the discretized finite-difference approach determines that Judgment Point 3 (discretization level) is relevant. If a different approach had been selected (such as the NTU method), the discretization question would not arise.

Judgment Point 2 (property data source) provides inputs to the model selected in Judgment Point 1. The choice of NIST correlations determines the temperature-dependent property functions used in the finite-difference calculations.

Judgment Point 3 (discretization level) depends on Judgment Point 1 (the modeling approach determines that discretization is needed) and affects the accuracy and computational cost of the model.

Judgment Point 4 (validation criteria) depends on Judgment Point 1 (the validation approach must be appropriate for the selected methodology) and defines the acceptance criteria for the model as a whole.

If Judgment Point 1 were reopened and the modeling approach changed from a finite-difference model to the Effectiveness-NTU method, Judgment Points 3 and 4 would become stale. The discretization parameter is irrelevant to the NTU method, and the validation criteria (comparing against the NTU analytical solution) would need to be reconsidered since the model and the validation reference would be the same approach.

### 35.7 Event Sequence for Judgment Point 1

The following event sequence illustrates the complete lifecycle of Judgment Point 1 (Modeling Approach Selection) as it would appear in the audit log.

1. **Event: `created`** (actor: agent, actorType: agent). The agent detects that a modeling approach selection is needed and emits a candidate with three alternatives. Hard Trigger 2 (framework or methodology selection) is recorded.

2. **Event: `promoted`** (actor: system, actorType: system). The system evaluates the candidate, computes the materiality score (13), determines the intervention level (require-investigation, per project policy for Hard Trigger 2 with score > 12), assigns collaborative authority, and promotes the candidate to pending status.

3. **Event: `comparison-requested`** (actor: user, actorType: user). The engineer requests a structured comparison of the three alternatives. The comparison criteria include: accuracy for spatial temperature prediction, computational cost, and validation feasibility.

4. **Event: `comparison-completed`** (actor: agent, actorType: agent). The agent completes the comparison, producing quantitative estimates for each alternative along the requested criteria. Comparison data is attached to each alternative.

5. **Event: `investigation-started`** (actor: user, actorType: user). The engineer reviews the comparison results, transitioning the Judgment Point to the investigating state.

6. **Event: `resolution-recorded`** (actor: user, actorType: user). The engineer selects Alternative C with a substantive rationale. The resolution includes conditions and validation requirements. Resolution type: collaborative. The Judgment Point transitions to resolved.

7. **Event: `artifact-linked`** (actor: agent, actorType: agent). The agent links the finite-difference model implementation to the Judgment Point as a `produced-by` artifact.

This sequence demonstrates the full lifecycle from detection through resolution, including the investigation requirement and the structured comparison. Each event is immutable, timestamped, and attributed to a specific actor, providing a complete audit trail.

### 35.8 What This Example Demonstrates

This example demonstrates several features of the Judgment Points framework working together:

- **Detection at appropriate moments.** The four judgments correspond to genuine decision points in the engineering workflow. They are not trivial choices or formatting decisions; they are substantive technical decisions that affect the quality and validity of the analysis.
- **Materiality differentiation.** The four judgments have different materiality scores (13, 9, 6, 9), reflecting their different levels of consequence. This leads to different intervention levels: require-investigation for the most consequential decision, pause for two moderately consequential decisions, and disclose for the least consequential one.
- **Hard trigger operation.** Three of the four judgments involve hard triggers (framework selection, assumption with alternatives, sensitivity threshold), which ensure they are surfaced regardless of materiality score. The fourth (discretization level) is detected by the agent without a hard trigger.
- **Dependency tracking.** The four judgments form a dependency graph, and the specification describes what happens when an upstream judgment is revised: downstream judgments become stale and require re-examination.
- **Resolution variety.** The four resolutions demonstrate different resolution types (collaborative, direct-human) and different levels of AI involvement (recommendation shown vs. not shown), reflecting the range of resolution patterns that occur in practice.
- **Condition-based validity.** Three of the four resolutions include conditions that define the boundaries of their applicability, providing explicit criteria for when the decision should be revisited.

---

## 36. Evaluation Framework

The evaluation framework provides structured methods for assessing whether the Judgment Points system is performing well. Four evaluation dimensions are defined. The evaluation framework is implemented in the `evals/` directory of the repository, with subdirectories for each evaluation dimension: `trigger-detection/`, `interruption-burden/`, `workflow-comparison/`, and `fixtures/`.

### 36.1 Detection Quality

Detection quality measures whether the system correctly identifies consequential choices.

**Precision.** Of the judgment candidates generated by the system, what fraction represented genuinely consequential choices? High precision means few false positives (the system does not generate excessive spurious candidates). Low precision means the user is frequently interrupted by candidates that turn out not to require judgment, which leads to fatigue and disengagement.

**Recall.** Of the genuinely consequential choices that occurred during the workflow (as determined by expert annotation of ground truth), what fraction were detected and surfaced by the system? High recall means the system catches important decisions. Low recall means the system misses decisions that should have been flagged, leaving the user unaware of choices that were made silently.

**Category accuracy.** Of the correctly identified judgment candidates, what fraction were assigned to the correct category? Miscategorization can lead to incorrect policy application (a method judgment classified as a parameter judgment might receive a lower intervention level than warranted) and can make it harder for users to find and review related decisions.

Detection quality evaluation requires ground truth annotations: a set of workflows in which the consequential choices have been identified and categorized by domain experts. The `evals/fixtures/` directory will contain test fixtures for this purpose. These fixtures will include workflow transcripts with expert annotations marking the consequential choices, their categories, and their materiality assessments.

**Materiality accuracy.** How closely does the system's materiality assessment match expert assessment of the same choice? This metric evaluates whether the six-dimension scoring produces scores that correspond to experts' intuitive assessment of how consequential a choice is. Significant divergence suggests that the dimension definitions, scoring criteria, or detector logic need adjustment.

**Hard trigger accuracy.** Of the hard trigger activations, what fraction correctly identified a categorically important decision? And conversely, of the categorically important decisions (as judged by experts), what fraction were caught by a hard trigger? Hard triggers are the safety net for decisions that must never be missed, so their recall is particularly important.

### 36.2 Workflow Burden

Workflow burden measures the cost imposed by the judgment system on the user's workflow.

**Interruption count.** The number of workflow pauses caused by Judgment Points in a given workflow. This count should be compared against the number of genuinely consequential choices (as determined by ground truth) to assess whether the system is interrupting appropriately. A ratio of interruptions to true consequential choices significantly above 1.0 indicates excessive interruption.

**Interruption timing.** Whether interruptions occur at natural decision points in the workflow or at disruptive moments. An interruption at a point where the user would naturally consider options (such as before starting a new analysis phase) is less burdensome than an interruption in the middle of a complex reasoning chain.

**Resolution time.** The time the user spends resolving Judgment Points, including investigation, comparison, and rationale entry. High resolution times may indicate insufficient context, poor-quality alternatives, or overly complex judgment records.

**Dismissal rate.** The fraction of Judgment Points that the user dismisses as not consequential. A high dismissal rate indicates poor detection quality or overly aggressive materiality scoring. The target dismissal rate is low (most surfaced judgments should be genuinely consequential), though some dismissals are expected and healthy.

### 36.3 Technical Usefulness

Technical usefulness measures whether the judgment records and the resolution process produce outputs that are genuinely useful for the technical work.

**Rationale quality.** Are the recorded rationales substantive enough to inform future reviewers? A resolution with a rationale of "OK" provides no value. A resolution with a rationale that references specific tradeoffs, evidence, and conditions provides lasting value. Rationale quality can be assessed through human review or through heuristic metrics (rationale length, presence of specific keywords, reference to alternatives).

**Validity condition effectiveness.** Do the defined validity conditions correctly identify when resolutions become stale? Are staleness detections accurate (not too many false alarms, not too many missed invalidations)?

**Dependency accuracy.** Are artifact dependencies correctly identified? When a judgment is revised, does the system correctly propagate changes to affected artifacts? Can a reviewer trace from an artifact back to the judgment that governs it?

**Comparison value.** When structured comparisons are performed, do the results meaningfully inform the decision? Are comparison criteria relevant to the choice at hand? Do comparison results affect the resolution (indicating that the comparison provided useful information)?

### 36.4 Human Engagement

Human engagement measures whether users interact with Judgment Points as intended by the design.

**Engagement depth.** Do users review alternatives before resolving, or do they immediately accept the first option presented? Do users request comparisons or investigations, or do they consistently skip these steps? Deep engagement suggests the system is providing value; shallow engagement suggests rubber-stamping.

**Anchoring indicators.** When an AI recommendation is shown (`recommendationShown: true`), how often does the user select the recommended alternative? A very high agreement rate (above 90%) may indicate anchoring bias. This metric should be compared against agreement rates when no recommendation is shown to isolate the effect of the recommendation.

**Resolution diversity.** Across a project, do resolutions span multiple alternatives, or is the same alternative consistently selected (for example, always choosing the first listed option)? Low diversity may indicate that the system is not effectively presenting genuine choices.

**Feedback rate.** Do users provide feedback on the quality of candidates, alternatives, and comparisons? User feedback is a direct signal of engagement quality and system value.

### 36.5 Evaluation Procedures

The evaluation framework defines procedures for conducting evaluations across each dimension.

**Offline evaluation using annotated workflows.** The `evals/fixtures/` directory will contain annotated workflow transcripts in which domain experts have identified the consequential choices, assigned categories, assessed materiality, and recorded "ideal" resolutions. The system is run against these transcripts, and its detection, scoring, and intervention decisions are compared against the expert annotations. This produces precision, recall, category accuracy, and materiality accuracy metrics.

Offline evaluation is useful for measuring detection quality in a controlled environment, but it has limitations. The annotated workflows are static (they do not respond to the system's interventions as a real user would), and the expert annotations represent one assessment of what is consequential (experts may disagree about borderline cases).

**Online evaluation with instrumented deployments.** In an instrumented deployment, the system records all detection events, user actions, resolution patterns, and timing data. This data is analyzed after the fact to compute engagement metrics, workflow burden metrics, and resolution quality indicators. Online evaluation captures how the system performs with real users in real workflows, but it cannot measure recall directly (because there is no ground truth for which choices were consequential but not detected).

**A/B evaluation of configuration changes.** When adjusting materiality thresholds, detection criteria, or policy configurations, A/B evaluation compares the metrics before and after the change. This requires a baseline period and a test period, with consistent workflow characteristics across both periods. A/B evaluation is appropriate for calibrating specific parameters but requires sufficient data volume to produce statistically meaningful comparisons.

**Expert review of resolution records.** Domain experts periodically review a sample of resolution records from real projects, assessing whether the judgments were genuine decision points (or false positives), whether the alternatives were well-formulated, whether the rationales were substantive, and whether the resolutions appear sound given the evidence available at the time. Expert review provides qualitative assessment that quantitative metrics cannot capture.

### 36.6 Evaluation Frequency

Evaluation should be conducted at multiple frequencies:

- **Continuous monitoring** of engagement metrics (resolution time, dismissal rate, engagement depth) through instrumented deployments. These metrics can be computed automatically and reported on dashboards.
- **Periodic review** (quarterly or per-project) of detection quality and resolution quality through expert review of sampled records.
- **Event-driven evaluation** when significant configuration changes are made (new policies, adjusted thresholds, new detection criteria) to assess the impact of the changes.
- **Milestone evaluation** at each specification version to assess overall system performance and identify areas for improvement in the next version.

---

## 37. Risks and Mitigations

The Judgment Points system introduces risks that must be recognized and managed. This section identifies the seven primary risks and describes planned or possible mitigations for each.

### 37.1 Too Many Interruptions

**Risk.** The system generates too many judgment candidates, causing excessive workflow interruptions. Users become annoyed, productivity drops, and users learn to ignore or rubber-stamp judgments to minimize disruption.

**Mitigation.** The materiality scoring system and intervention levels are designed to filter low-consequence decisions to the trace or disclose levels, reserving workflow pauses for genuinely consequential choices. Policies can be tuned to adjust materiality thresholds for specific domains or projects. The evaluation framework includes interruption burden metrics to detect this problem quantitatively. Detection quality improvements (better precision) directly reduce unnecessary interruptions. Users can dismiss candidates and provide feedback that can inform detection tuning. Over time, the system's detection criteria should converge toward the right level of sensitivity through iterative adjustment based on evaluation data.

### 37.2 Rubber-Stamping

**Risk.** Users treat Judgment Points as approval dialogs rather than genuine decision points. They resolve judgments in seconds without reviewing alternatives, provide empty or minimal rationales, and consistently accept the first option or the agent's recommendation without consideration.

**Mitigation.** The resolution record captures engagement signals: resolution time (very fast resolutions suggest insufficient consideration), rationale length and content (empty or minimal rationales are detectable), and engagement depth (whether alternatives were reviewed, whether comparisons were requested, whether the investigating state was entered). The `require-investigation` intervention level mandates investigation activities before resolution for high-materiality decisions. The critic agent role (Section 20.4) can flag resolutions that appear to have been rubber-stamped. These mitigations do not prevent rubber-stamping, but they make it detectable. Detection enables organizational responses: training, policy adjustment, or process changes.

### 37.3 Responsibility Laundering

**Risk.** The existence of a formal judgment record creates a false sense of accountability. A user approves a decision they did not genuinely understand or evaluate, and the record is later used to attribute responsibility for a bad outcome to the user.

**Mitigation.** The resolution record captures the resolution type and whether an AI recommendation was shown. The `informationPresented` field documents what the decision-maker was shown. These fields make it possible to assess whether the decision-maker had a genuine basis for the decision. Policies can require that high-accountability decisions use the `human` authority mode without AI recommendations, requiring the decision-maker to form an independent judgment before seeing any AI analysis. Organizational training and review practices are also necessary mitigations that fall outside the specification's scope but are enabled by the data the specification collects.

### 37.4 AI-Generated Option Narrowing

**Risk.** The agent controls which alternatives are presented. If the agent generates a biased or incomplete set of alternatives, the user's "choice" is constrained by the agent's framing. The user selects the best option from a limited set and believes they have exercised judgment, when the most appropriate option was never presented.

**Mitigation.** Users can add alternatives at any time during the resolution process using the Add Alternative action (Section 34.4). Policies can require investigation for high-materiality decisions, which includes the opportunity to discover and add alternatives that the agent did not propose. The `source` field on each alternative records whether it was proposed by the agent, the user, a standard, or a prior decision. Critic agents can assess whether the alternative set appears balanced. However, fully mitigating this risk requires domain expertise that the system itself may not possess; organizational review practices and domain-expert involvement remain the primary defense.

### 37.5 Post-Hoc Rationales

**Risk.** The decision-maker selects an alternative first (based on intuition, convenience, or the agent's recommendation) and then writes a rationale to justify the choice after the fact. The rationale becomes a post-hoc justification rather than a genuine account of the reasoning process.

**Mitigation.** The `initialPosition` field allows the decision-maker to state their preliminary position before reviewing recommendations or comparison data. This creates a record of the decision trajectory: if the initial position matches the final resolution and was stated before seeing any analysis, the rationale is more likely to reflect genuine reasoning. The `informationPresented` field documents the sequence of information shown. The critic agent can compare the rationale against the tradeoffs described in the alternatives to assess whether the rationale engages substantively with the evidence or merely restates the selected alternative's description.

### 37.6 Stale Decisions

**Risk.** A resolution made early in a project becomes invalid as conditions change, but the invalidation is not detected. Downstream work continues to rely on a decision that is no longer appropriate.

**Mitigation.** Validity conditions and reopen conditions provide explicit criteria for when the decision should be re-examined. The staleness detection mechanism monitors for changes in upstream dependencies and evaluates validity conditions. Dependency propagation identifies downstream effects when a judgment is revised. These mitigations are effective to the degree that validity conditions are well-defined and monitorable. Vague or unmonitorable validity conditions (such as "valid unless something important changes") provide little protection. The specification encourages specific, measurable validity conditions but cannot enforce specificity.

### 37.7 Formalizing Too Much

**Risk.** The system encourages users to formalize decisions that are better handled informally. Excessive formalization makes workflows rigid, slow, and bureaucratic. Users spend more time documenting decisions than doing technical work.

**Mitigation.** The materiality scoring system filters low-consequence decisions to the trace level, avoiding formalization overhead for routine choices. The dismissal action allows users to quickly dispose of candidates that do not warrant formalization. Policies can be configured to narrow the scope of detection. The evaluation framework includes workflow burden metrics to detect when formalization overhead is excessive. If the system is generating too many Judgment Points relative to the number that users find valuable, the detection criteria and materiality thresholds should be adjusted. The goal is a system that surfaces the right decisions, not all decisions.

### 37.8 Inconsistent Detection Across Agents

**Risk.** Different agents (or different versions of the same agent) may detect different consequential choices in the same workflow. An agent with stronger detection capabilities may identify five judgment-relevant situations in a session, while a weaker agent identifies only two. This inconsistency means that the quality of judgment records depends on which agent is used, creating an uneven accountability landscape.

**Mitigation.** The Agent Skills mechanism (Section 31) provides domain-specific detection guidance that can improve consistency across agents by providing shared detection criteria. Rule-based detection (Section 22.2) provides a deterministic baseline that is consistent regardless of agent capability. Policy-driven hard triggers ensure that categorically important decisions are detected regardless of agent capability. Evaluation metrics for detection quality (Section 36.1) help identify which agents have detection gaps. Over time, improving the detection guidance in Agent Skills and expanding the rule-based detection coverage can reduce cross-agent inconsistency.

### 37.9 Context Overload

**Risk.** As a project accumulates many Judgment Points, the amount of context available for each new judgment grows. Prior judgments, artifact dependencies, policy rules, and historical events all contribute to the context. If the system presents all available context for every judgment, the decision-maker may be overwhelmed by information that is technically relevant but not immediately useful.

**Mitigation.** Context filtering (Section 21.2) and materiality-proportional depth (Section 21.3) limit the context presented to what is most relevant and appropriate for the judgment's materiality level. The specification encourages implementations to use heuristics for context relevance, including category-based relevance, dependency-based relevance, and recency weighting. These heuristics are not perfect and may require tuning for specific domains and workflow patterns.

---

## 38. Security and Privacy

### 38.1 Data Sensitivity

Judgment Point records may contain sensitive information: technical details of proprietary analyses, descriptions of design decisions that reveal competitive strategy, references to confidential data sources, descriptions of safety-critical decisions, and the identities of decision-makers. Implementations must protect judgment records with access controls appropriate to their sensitivity.

### 38.2 Access Control

The specification does not define a specific access control model, because access control requirements vary across deployments. Implementations should provide:

- Authentication of users and agents interacting with judgment records. The system should verify the identity of actors before allowing them to create, view, resolve, or modify records.
- Authorization controls that restrict who can create, view, resolve, and manage Judgment Points and policies. Not all users should be able to resolve all judgments; the authority model restricts resolution to assigned authorities, but additional access controls may be needed for viewing and querying.
- Role-based or attribute-based access control that aligns with the organization's existing security model.
- Audit logging of access to judgment records, separate from the judgment event log. The event log captures lifecycle actions (created, resolved, etc.); the access log captures who viewed what and when.

### 38.3 Data at Rest

Judgment records stored by the storage adapters should be protected according to the sensitivity of the data they contain. For the SQLite adapter, this includes file-system permissions and, where appropriate, encryption at rest. The in-memory adapter does not persist data beyond the process lifetime, which provides inherent protection against persistent data exposure but no protection against in-process access by other components.

### 38.4 Data in Transit

All API communications should use TLS to protect judgment records in transit. The MCP integration inherits the transport security of the MCP protocol and the underlying communication channel. Implementations should not transmit judgment records over unencrypted channels.

### 38.5 Credential Handling

Judgment Point records must not contain credentials, API keys, tokens, passwords, or other secret material. If a judgment references a data source, tool, or system that requires authentication, the reference should point to the resource by identifier or URI, not include the authentication credentials. Validation rules should reject judgment records that appear to contain credential-like patterns, though this cannot be perfectly enforced.

### 38.6 Privacy Considerations

Judgment records contain the identifiers of decision-makers (in the `resolvedBy` and `actorId` fields) and may contain information about their reasoning processes (in the `rationale` and `initialPosition` fields). Organizations deploying the system should consider:

- Data retention policies for judgment records. How long should records be retained? Should records be archived or deleted after a defined period?
- Anonymization or pseudonymization requirements, particularly for records that may be shared outside the organization (for example, in publications, regulatory submissions, or open-source projects).
- Compliance with applicable data protection regulations (such as GDPR, CCPA, or PIPEDA) if judgment records contain personal data.
- The right of decision-makers to access, understand, and (where applicable) request correction of the records associated with their decisions.
- Whether judgment records might be subject to legal discovery in litigation, and the implications this has for record content and retention.

### 38.7 Threat Considerations

Several threat scenarios are specific to judgment-aware systems and should be considered by deployments.

**Judgment record tampering.** If an attacker can modify judgment records after creation, they can alter the accountability trail. Mitigations include the append-only event model (which makes history modification detectable), integrity checks on stored records, and access controls that limit who can write to the judgment store.

**Policy manipulation.** If an attacker can modify policies, they can lower intervention levels, enable delegation for sensitive decisions, or disable required policies. Mitigations include access controls on policy management endpoints, audit logging of policy changes, and review processes for policy modifications.

**Materiality score manipulation.** If an agent (or a compromised component) can manipulate materiality scores, it can cause consequential decisions to be classified at the trace level, bypassing user review. Mitigations include human review of materiality assessments for high-stakes domains and cross-validation of agent-generated scores against rule-based or expert assessments.

**Alternative set manipulation.** If an agent controls the alternatives presented in a judgment candidate and can exclude or misrepresent options, the user's choice is constrained without their knowledge. This threat is discussed in Section 37.4 (AI-Generated Option Narrowing). Mitigations include user ability to add alternatives, source attribution on alternatives, and organizational review practices.

### 38.8 Vulnerability Reporting

Security vulnerabilities in the reference implementation should be reported through the process described in `SECURITY.md`. Vulnerabilities should be reported privately through GitHub Security Advisories, not through public issues. The security policy covers vulnerabilities in the code, dependencies, specification, and deployment guidance.

---

## 39. Accessibility

All user-facing components and interfaces produced by this project must meet the accessibility standards described in this section. Accessibility is a requirement for all contributions, not an optional enhancement or a future consideration.

### 39.1 Standards Compliance

User-facing components must comply with WCAG 2.1 Level AA success criteria. This includes requirements across four principles:

- **Perceivable.** Information and interface components must be presentable to users in ways they can perceive. This includes providing text alternatives for non-text content, providing captions and alternatives for multimedia, creating content that can be presented in different ways without losing information, and making it easy for users to see and hear content.
- **Operable.** Interface components must be operable by all users. This includes making all functionality available from a keyboard, giving users enough time to read and use content, not designing content in a way that is known to cause seizures, and providing ways to help users navigate and find content.
- **Understandable.** Information and the operation of the interface must be understandable. This includes making text readable, making content appear and operate in predictable ways, and helping users avoid and correct mistakes.
- **Robust.** Content must be robust enough to be interpreted reliably by a wide variety of user agents, including assistive technologies.

### 39.2 Keyboard Navigation

All interactive elements in the judgment panel, comparison mode, activity rail, canvas markers, and project view must be fully operable with keyboard input alone. Users who cannot use a mouse must be able to perform every action available in the interface. Specific requirements:

- Focus order must follow a logical sequence that matches the visual layout and the logical structure of the content.
- Focus indicators must be visible. The default browser focus indicator may be enhanced but must not be removed.
- Keyboard shortcuts, if provided, must not conflict with screen reader shortcuts, browser shortcuts, or operating system shortcuts. Custom shortcuts must be discoverable and configurable.
- Modal dialogs (such as the judgment panel) must trap focus within the dialog while it is open and must return focus to the triggering element when the dialog is closed.
- Skip navigation links should be provided for interfaces with repeated navigation elements.

### 39.3 Screen Reader Support

All user-facing components must use semantic HTML elements (headings, lists, buttons, forms, tables, landmarks) and appropriate ARIA attributes where semantic HTML is insufficient. Specific requirements:

- Judgment Point status, category, and materiality information must be conveyed through accessible text, not just through visual styling.
- Alternatives in the judgment panel must be presented as a labeled list or group.
- Status changes (such as a Judgment Point transitioning from pending to investigating) must be announced to screen reader users through ARIA live regions with appropriate politeness levels.
- Comparison tables must use proper table markup with row and column headers.
- Charts and graphs must have text alternatives that convey the essential data.

### 39.4 Color and Contrast

Visual indicators for judgment status, materiality levels, and intervention levels must not rely on color alone. Each status must be distinguishable through shape, icon, label, or pattern in addition to color. Text contrast must meet WCAG 2.1 Level AA minimum contrast ratios: 4.5:1 for normal text (below 18pt or 14pt bold), 3:1 for large text (18pt or 14pt bold and above). Interactive elements must have a contrast ratio of at least 3:1 against their background in all states (default, hover, focus, active, disabled).

### 39.5 Content Accessibility

Judgment questions, alternative descriptions, rationales, and context text must be written in clear, understandable language. The system should not generate jargon-laden, unnecessarily complex, or excessively abbreviated language in its user-facing output. While the technical content of judgments will inherently contain domain-specific terminology, the structural elements of the interface (labels, instructions, error messages, help text) should be plain and direct.

### 39.6 Testing

Accessibility must be verified through both automated and manual testing:

- Automated testing using axe-core must be included in the test suite. All axe-core violations must be resolved before merging.
- Manual testing with at least one screen reader (such as NVDA on Windows, VoiceOver on macOS, or Orca on Linux) must be performed for UI changes.
- Keyboard-only testing must confirm that all interactive elements are reachable and operable.
- Pull requests that modify UI components must include a description of the accessibility testing performed.

Accessibility issues are treated as bugs with the same severity and priority as functional bugs. An inaccessible feature is a broken feature.

---

## 40. Known Limitations

This section documents limitations of the current specification and reference implementation that are acknowledged and accepted for this version. These are not bugs to be fixed; they are boundaries of the current design that may be expanded in future versions.

### 40.1 Materiality Score Thresholds Are Unvalidated

The intervention level thresholds (0-4 trace, 5-8 disclose, 9-13 pause, 14-18 require-investigation) are an initial hypothesis, not the result of empirical validation. They have not been tested with real users in real workflows. They may produce too many or too few interruptions. The score boundaries may not correspond well to actual decision consequence as perceived by practitioners. These thresholds will be revised based on evaluation results from the evaluation framework.

### 40.2 Natural-Language Validity Conditions

Validity conditions and reopen conditions are stored as natural-language strings. The system cannot automatically evaluate whether these conditions are still met without interpretation capabilities that are not part of the current specification. Automated staleness detection works for dependency-based triggers (upstream Judgment Points changing state) but not for condition-based triggers (such as "valid until Standard X is revised"). Implementations may supplement natural-language conditions with structured, machine-evaluable conditions, but this is not required.

### 40.3 Detection Quality Depends on Agent Capability

The quality of judgment candidate detection depends on the capability of the detecting agent. The specification defines what constitutes a good candidate but cannot ensure that any particular agent will produce good candidates. Detection quality improvement through better prompting, model capabilities, and skill design is an ongoing research challenge, not a solved problem.

### 40.4 Cross-System Dependency Tracking

The current specification assumes that all Judgment Points within a project are managed by a single system instance. Cross-system dependency tracking (where a judgment in System A affects artifacts managed by System B) is not addressed. This limitation affects organizations that use multiple tool chains or multiple instances of judgment-aware systems for different parts of their workflow.

### 40.5 Limited Policy Expression Language

Policy rule conditions support a limited set of matching criteria. Complex conditions that depend on workflow state, temporal patterns, cross-judgment analysis, or domain-specific logic require the free-form `expression` field, which does not have a standardized syntax. Different implementations may define different expression languages, and there is no guarantee that conditions written for one implementation will work in another.

### 40.6 No Offline or Disconnected Mode

The specification does not address operation in offline or disconnected environments where the judgment storage backend, MCP server, or agent systems are unavailable. Workflows that must continue without interruption in disconnected environments may not be able to use Judgment Points for real-time decision tracking. Offline operation could be supported by local storage with later synchronization, but this is not specified.

### 40.7 Single-User Focus

The current specification is primarily designed for single-user workflows where one person is the primary decision-maker. Multi-user scenarios (such as a team collaborating on a shared project with multiple people making concurrent judgments) are not fully addressed. The authority model supports delegation and review requests, but it does not address concurrent resolution by multiple authorities, conflict resolution among concurrent resolutions, or real-time visibility into what other team members are deciding.

### 40.8 No Quantitative Comparison Standards

The specification defines the concept of structured comparison (Section 23.2) but does not prescribe specific comparison methodologies, metrics, or formats. The comparison data field on alternatives uses an open schema (`additionalProperties: true`) to accommodate different domains, but this flexibility means that comparison results from different implementations, different agents, or different sessions may not be directly comparable. There is no standard for what constitutes a "complete" or "adequate" comparison. Organizations that require consistent comparison practices must define their own standards through policies or organizational procedures.

### 40.9 No Support for Conditional Branching Based on Resolution

The current specification treats each Judgment Point as an independent decision with a single outcome. It does not support conditional branching where different resolutions lead to structurally different downstream workflows. For example, if a method judgment has three alternatives and each alternative requires a fundamentally different set of subsequent steps (different data requirements, different parameter sets, different validation approaches), the specification does not provide a mechanism for defining these conditional paths declaratively. The workflow must handle branching logic outside the judgment system.

### 40.10 Limited Internationalization Support

The specification does not address internationalization (i18n) requirements. Judgment questions, alternative descriptions, rationales, and context text are stored as plain strings without language metadata. The specification does not define mechanisms for storing translations of judgment content, for presenting judgments in multiple languages, or for supporting right-to-left text layouts. Implementations serving multilingual teams must handle internationalization at the application layer.

### 40.11 No Built-In Archival or Data Lifecycle Management

The specification does not define mechanisms for archiving old judgment records, purging records from completed projects, or managing the growth of the event log over time. In long-running projects with thousands of judgment records and tens of thousands of events, storage and query performance may degrade. Implementations must design their own data lifecycle strategies, including archival policies, partitioning schemes, and retention schedules. The append-only nature of the event log makes selective deletion incompatible with the audit trail requirements; archival rather than deletion is the recommended approach.

---

## 41. Open Questions

The following questions are open for discussion and will be addressed in future revisions of the specification. Each question includes a brief description of why it matters and what considerations are involved.

### 41.1 How Should Materiality Scoring Be Calibrated?

The current materiality scoring dimensions and thresholds are an initial proposal based on the authors' judgment about what factors make a decision consequential. How should they be calibrated for different domains? Should calibration be empirical (based on user feedback and evaluation data gathered from real workflows) or theoretical (based on decision theory principles or risk assessment frameworks)? Should different domains have different dimensions or different scoring scales? The answer likely involves both empirical calibration and the ability to configure domain-specific adjustments through policies.

### 41.2 What Is the Right Granularity for Judgment Points?

When should a single broad question be a single Judgment Point, and when should it be decomposed into multiple narrower Judgment Points? For example, "select a modeling approach" could be one question, or it could be decomposed into "select the mathematical formulation," "select the numerical method," and "select the discretization strategy." Overly broad Judgment Points may overwhelm the decision-maker with complexity. Overly narrow ones may fragment the decision into pieces that cannot be evaluated holistically because the parts are interdependent.

### 41.3 How Should Judgment Precedent Work?

When a Judgment Point is materially similar to a previously resolved one (same category, similar context, similar alternatives), should the system suggest the prior resolution as a default? The `inherited` resolution type exists for this purpose, but the criteria for "materially similar" are not defined. Precedent is valuable (it reduces decision burden for repeated patterns) but also risky (it may discourage fresh evaluation when circumstances have changed in subtle ways).

### 41.4 How Should the System Handle Judgment Fatigue?

If many Judgment Points arise in a short period, the decision-maker may experience fatigue and begin rubber-stamping. Should the system detect potential fatigue (based on accelerating resolution speed, declining rationale quality, or decreasing engagement depth) and adjust its behavior? Possible adjustments include batching lower-priority judgments for later review, reducing detection sensitivity temporarily, or alerting the user that their engagement pattern suggests fatigue.

### 41.5 How Should the System Handle Disagreements Between Agents?

In multi-agent workflows, different agents may detect conflicting judgment candidates or propose incompatible alternatives for the same decision. How should the system handle these disagreements? Should conflicting candidates be merged into a single Judgment Point with alternatives from both agents? Should they remain separate? How should the system present the disagreement to the user?

### 41.6 Should the System Support Partial Resolution?

Can a Judgment Point be partially resolved? For example, the decision-maker might select an approach (finite-difference modeling) but defer the parameter choices (number of segments) until more information is available. The current specification requires that resolution select a single alternative from the existing list. Should conditional, provisional, or staged resolutions be supported? This would add complexity to the lifecycle but might better match how decisions are actually made in practice.

### 41.7 How Should the System Integrate with Version Control?

Technical workflows often produce artifacts under version control (Git or similar). How should Judgment Points relate to version control operations? Should a resolution trigger a commit? Should commit messages reference associated Judgment Points? How should branching and merging interact with judgment records? Should judgment records be stored in the repository alongside the code they govern, or in a separate system?

### 41.8 What Is the Right Level of Agent Autonomy by Default?

In the absence of project-specific policies, how much autonomy should agents have to resolve low-materiality Judgment Points? The current specification defaults to delegated or collaborative authority for low-materiality decisions, but this default has not been validated with users. Some users may prefer more agent autonomy by default (fewer interruptions), while others may prefer less (more control). The right default may depend on the domain, the user's experience level, and the consequences of errors in the specific workflow.

### 41.9 How Should the System Handle Evolving Context?

During a long-running analysis, the context surrounding a Judgment Point may change between when the candidate is generated and when it is resolved. New data may become available. The scope of the project may shift. The analyst may learn something that changes their understanding of the problem. Should the system detect when context has materially changed since a candidate was generated and prompt re-evaluation of the materiality assessment before resolution?

### 41.10 What Metrics Best Indicate System Value?

Beyond the evaluation framework metrics (precision, recall, burden, engagement), what metrics would best indicate whether the Judgment Points system is providing net value to technical workflows? Possible candidates include: error rates in work products (do projects using judgment points have fewer technical errors?), decision revision rates (are decisions revised less often because they were better considered initially?), and reviewer efficiency (can reviewers understand and verify the technical basis of work products more quickly when judgment records exist?).

### 41.11 How Should the System Handle Domain-Specific Categories?

The eight categories defined in Section 12 are designed to be broadly applicable across technical domains. However, some domains may have natural category distinctions that do not map cleanly to the defined set. For example, in software engineering, a "security" or "architecture" category might be more natural than "assumption" or "parameter." Should the system support custom categories in addition to the standard set? If so, how should custom categories interact with policies and evaluation metrics that are defined in terms of the standard categories?

### 41.12 Should Judgment Points Support Templates?

For recurring decision patterns (such as selecting a turbulence model in CFD analysis, or choosing a statistical test in data analysis), should the system support judgment templates that pre-populate the question, alternatives, evidence references, and materiality assessment? Templates could reduce the burden of candidate generation and improve consistency, but they could also encourage mechanical application without genuine consideration of the specific context.

---

## 42. Versioning and Change Process

### 42.1 Specification Versioning

This specification is versioned following Semantic Versioning (SemVer).

- **Patch versions** (0.1.x) are used for clarifications, typo corrections, and non-substantive editorial changes that do not affect the meaning or behavior of the specification.
- **Minor versions** (0.x.0) are used for additions of new concepts, data fields, event types, categories, or behaviors that do not remove or change the meaning of existing elements. During the pre-1.0 period, minor versions may also include breaking changes; these will be documented in the changelog with migration guidance.
- **Major versions** (x.0.0) are reserved for breaking changes after the specification reaches 1.0. Breaking changes include removal of required fields, changes to lifecycle states or transitions, changes to the meaning of existing concepts, removal of enumeration values, and incompatible schema modifications.

### 42.2 Change Process

Changes to the specification follow the process defined in the project governance document (`GOVERNANCE.md`).

1. **Proposal.** A change is proposed as a GitHub issue using the appropriate template (feature request for additions, conceptual feedback for changes to existing concepts). The proposal describes the change, its motivation, its expected impact on implementations and users, and any alternatives considered.
2. **Discussion.** The proposal is discussed publicly on the issue. Maintainers and contributors provide feedback, raise concerns, and suggest alternatives. Specification changes receive more scrutiny than routine code changes because they affect all implementations and users.
3. **Draft.** If the proposal gains support, a pull request is submitted containing the specification changes, any necessary schema updates, updated reference implementation code, and updated tests. The pull request must pass all validation checks (formatting, linting, type checking, tests, build).
4. **Review.** The pull request is reviewed by at least one maintainer. Specification changes are evaluated for clarity (can an implementor understand what to do?), consistency (does the change align with existing concepts?), backward compatibility (does it break existing implementations?), and completeness (are all affected sections updated?).
5. **Merge.** Once approved, the pull request is merged. The changelog is updated to describe the change with enough detail for users and implementors to understand what changed and why. If the change is breaking, migration guidance is included.

### 42.3 Schema and Specification Alignment

The JSON Schema definitions in the `schemas/` directory must remain consistent with this specification. When the specification adds, removes, or modifies a data structure, the corresponding schema must be updated in the same pull request. The specification is the authoritative source of truth for concepts and behavior. The schemas are a machine-readable expression of the specification's data model. When the specification and schema disagree, the specification governs, and the schema should be corrected.

### 42.4 Implementation Alignment

The reference implementation (runtime code, MCP server, LangGraph adapter, SDK, and UI components) should reflect the current version of the specification. During active development, the implementation may lag behind specification changes; this is expected during the pre-1.0 period. The roadmap (`ROADMAP.md`) describes planned future work and current project status.

Implementations are not authoritative. When the implementation and specification disagree, the specification governs. Bugs in the specification should be reported as issues; bugs in the implementation should be fixed to match the specification, not the other way around (unless the specification itself is identified as incorrect, in which case a specification change proposal should be filed).

### 42.5 Backward Compatibility Commitment

Before the specification reaches version 1.0, backward compatibility is not guaranteed. Consumers of the specification should expect that structures, behaviors, and interfaces will change as the project learns from implementation experience and user feedback.

After 1.0, the project will maintain backward compatibility within major versions. Specifically:

- New optional fields may be added to schemas in minor versions. Existing implementations that do not use the new fields will continue to work.
- New enumeration values may be added in minor versions (such as new event types or new trigger sources). Implementations should handle unknown enumeration values gracefully.
- Required fields, lifecycle states, and behavior semantics will not change within a major version. Changes to these elements require a new major version.
- Deprecation of fields or features will be announced at least one minor version before removal.
- Migration guidance will be provided for all breaking changes, including code examples and schema transformation instructions.

### 42.6 Release Artifacts

Each specification version will be published as:

- The updated `judgment-points-specification.md` document in the `docs/` directory of the repository.
- Updated JSON Schema files in the `schemas/` directory.
- A changelog entry in `CHANGELOG.md` describing the changes.
- A tagged release in the repository (using the format `v0.x.y`) with associated release notes summarizing the changes and providing migration guidance for any breaking changes.
- Updated TypeScript types in the `judgment-schemas` package, generated from the updated JSON Schema files.

### 42.7 Specification Maintenance Principles

The following principles guide the maintenance and evolution of this specification:

**Stability over novelty.** Changes to the specification should be motivated by concrete problems or requirements, not by theoretical improvements or the desire to add features. Each change has a cost: it requires updates to schemas, implementations, documentation, and user understanding. Changes are worthwhile when their benefit exceeds this cost.

**Precision over brevity.** The specification should be as precise as necessary to enable independent implementation. If a behavior can be misinterpreted, the specification should clarify it, even if the clarification makes the text longer. Ambiguity in a specification produces divergent implementations that are difficult to reconcile.

**Empirical validation over intuition.** Quantitative parameters in the specification (materiality thresholds, intervention level boundaries, default authority assignments) should be validated through empirical evaluation rather than accepted on the basis of intuition. The evaluation framework (Section 36) exists specifically to generate the data needed for this validation. Parameters that have not been empirically validated should be clearly identified as hypotheses, as they are throughout this version of the specification.

**Incremental evolution over redesign.** The specification should evolve incrementally, with each version building on the previous one. Fundamental redesigns (changing the core concepts, restructuring the lifecycle, or replacing the data model) should be reserved for major version transitions and should be motivated by substantial evidence that the current design is inadequate. Incremental improvements to thresholds, policies, and integration patterns are preferred.

**Implementation feedback over specification purity.** The specification exists to enable useful implementations, not as an end in itself. When implementation experience reveals that a specified behavior is impractical, counterproductive, or misaligned with how users actually work, the specification should be revised to accommodate the practical reality. The implementation does not override the specification, but implementation feedback is the primary input for specification improvement.

---

## Appendix A: Glossary

The following terms have specific meanings within this specification.

| Term                   | Definition                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Judgment Point         | A consequential choice surfaced as a durable, machine-readable record, resolved by an authorized party, and connected to dependent work. |
| Judgment Candidate     | A proposed Judgment Point that has been detected but not yet evaluated and promoted.                                                     |
| Materiality            | The degree to which a choice is consequential, assessed along six dimensions producing a score from 0 to 18.                             |
| Intervention Level     | The system's response to a detected judgment: trace, disclose, pause, or require-investigation.                                          |
| Authority Mode         | How a Judgment Point may be resolved: human, collaborative, delegated, or rule.                                                          |
| Hard Trigger           | A condition that always creates a Judgment Point regardless of the materiality score.                                                    |
| Resolution             | The recorded outcome of a Judgment Point decision, including the selected alternative, rationale, and conditions.                        |
| Staleness              | The condition of a resolved Judgment Point whose resolution may no longer be valid due to changed circumstances.                         |
| Artifact Reference     | A link between a Judgment Point and a technical work product (code cell, parameter, model, plot, conclusion, etc.).                      |
| Judgment Event         | An immutable record of a lifecycle action taken on a Judgment Point, forming the append-only audit log.                                  |
| Judgment Policy        | A named set of rules governing intervention levels, authority assignments, and delegation conditions.                                    |
| Delegation             | The explicit transfer of resolution authority from a human to an agent under defined policy conditions.                                  |
| Dependency Propagation | The process of identifying and flagging downstream work when an upstream Judgment Point changes.                                         |
| Validity Condition     | A statement of circumstances under which a Judgment Point's resolution remains appropriate.                                              |
| Reopen Condition       | A statement of circumstances that should trigger re-examination of a resolved Judgment Point.                                            |
| Comparison             | A structured evaluation of alternatives against defined criteria to inform the decision.                                                 |
| Revision History       | The record of all changes to a Judgment Point's status and resolution, preserved for audit.                                              |
| Rubber-Stamping        | The pattern of resolving Judgment Points without genuine consideration, undermining accountability.                                      |

---

_End of specification._
