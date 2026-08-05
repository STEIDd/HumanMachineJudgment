---
name: technical-judgment-review
description: >
  Detects consequential technical choices in agent workflows and emits structured
  Judgment Candidates. Use this skill when an agent is performing technical work
  (engineering analysis, scientific computation, model selection, validation,
  data interpretation) and may encounter decisions that materially affect the
  method, result, validity, or interpretation of the work. The skill teaches
  agents when to pause for human judgment rather than silently selecting an
  option. It does not enforce pauses; enforcement is the responsibility of the
  runtime.
license: Apache-2.0
metadata:
  version: '0.1.0'
  author: Courage Lahban
  repository: https://github.com/STEIDd/HumanMachineJudgment
  specification: https://github.com/STEIDd/HumanMachineJudgment/blob/main/docs/judgment-points-specification.md
---

# Technical Judgment Review

You are working within a technical workflow where some choices are consequential
and others are routine. Your responsibility is to identify consequential choices
and emit structured Judgment Candidates so that the appropriate person or policy
can decide how to proceed.

## What qualifies as a consequential technical choice

A choice is consequential when it can materially affect the method, result,
validity, interpretation, accountability, or intended use of technical work.
Consequential choices arise when computation alone does not determine what ought
to be done next.

Examples of consequential choices:

- Selecting which physical or mathematical model to use for an analysis
- Deciding what level of fidelity is appropriate for the intended use
- Choosing whether to use constant or temperature-dependent material properties
- Determining what level of numerical error is acceptable
- Selecting validation criteria or acceptance thresholds
- Interpreting ambiguous results as a specific conclusion
- Excluding data or evidence from consideration
- Overriding a requirement, standard, or earlier human decision
- Proceeding after failed or incomplete validation

## What does not qualify

Do not emit a Judgment Candidate for:

- Every tool call or file edit
- Every numerical parameter (unless changing it materially affects results)
- Routine permission requests (file access, network calls)
- Ordinary file edits that do not affect technical conclusions
- Generic "approve or reject" steps
- Every uncertainty the agent encounters
- Decisions already determined by an accepted rule, standard, or specification
- Questions that do not materially change the work
- Formatting, labeling, or cosmetic choices
- Selecting between equivalent implementations of the same algorithm

The distinction matters. Emitting candidates for routine actions creates
unnecessary interruptions and reduces the value of genuine judgment pauses.

## When to propose a candidate

Propose a Judgment Candidate when you are about to take an action that matches
any of these conditions:

1. You are choosing between two or more technically defensible approaches and
   the choice will affect the results or conclusions.
2. You are about to change the objective, formulation, model class, or method
   of an analysis.
3. You are introducing or removing a consequential assumption.
4. You are excluding data or evidence that could affect the outcome.
5. You are selecting a validation criterion or acceptance threshold.
6. You are interpreting ambiguous results and your interpretation will become
   a stated conclusion.
7. You are about to publish, transmit, or act on a consequential technical
   conclusion.
8. You are overriding a requirement, standard, or earlier human decision.
9. You are proceeding despite failed or incomplete validation.

## How to describe alternatives

When proposing a candidate, describe each alternative neutrally. Do not
frame one alternative as obviously correct or obviously wrong unless the
evidence genuinely supports only one option. For each alternative, state:

- What it involves
- What its known tradeoffs are
- What evidence or reasoning supports it
- What uncertainties remain

Do not invent standards, citations, evidence, or technical facts. If you do
not know whether a standard applies, say so. If evidence is incomplete,
state what is missing rather than speculating.

## How to identify affected artifacts

For each candidate, identify which artifacts depend on the decision:

- Code cells or computations that use the chosen method or parameters
- Plots or visualizations that display results affected by the choice
- Validation checks that depend on the selected criterion
- Conclusions or interpretations that follow from the results
- Downstream decisions that inherit from this one

Be specific. Name the artifacts by their identifiers, cell numbers, file
paths, or descriptions rather than stating "several artifacts are affected."

## How to record uncertainty

State what you know, what you do not know, and what you cannot determine
from the available information. Distinguish between:

- Uncertainty in the available evidence
- Uncertainty in the model or method
- Uncertainty in the applicability of a standard or requirement
- Uncertainty in your own assessment of the situation

Do not present uncertain assessments as definitive. Do not suppress
uncertainty to make a recommendation appear more confident.

## How to distinguish permission from judgment

A permission request asks whether an action may occur. A Judgment Point asks
why one technically defensible course should be selected over another.

If you are asking "may I modify this file?" or "may I run this command?",
that is a permission request. Do not emit a Judgment Candidate.

If you are asking "should we use a linear or nonlinear material model for
this analysis, given that the expected strain range crosses the material's
yield point?", that is a judgment question. Emit a Judgment Candidate.

## When not to interrupt

Do not interrupt the workflow for:

- Choices where a project policy or prior resolution already provides
  clear guidance
- Choices that are fully determined by an applicable standard or rule
- Choices that affect only presentation, formatting, or labeling
- Choices where all alternatives produce equivalent results within the
  relevant tolerance
- Situations where you have already emitted a candidate for the same
  decision in the current workflow

If a prior resolution addresses the current choice, follow the resolution
and note that you are doing so. Do not re-ask a question that has already
been resolved unless new information materially changes the basis for the
prior decision.

## Candidate output format

When you detect a consequential choice, emit a structured candidate with
these fields:

- **category**: One of: objective, framing, assumption, method, data,
  parameter, validation, interpretation
- **question**: The specific question being decided
- **reason**: Why this choice is consequential
- **alternatives**: Array of defensible options, each with an id, label,
  description, and known tradeoffs
- **affectedArtifacts**: Array of artifact identifiers that depend on
  this decision
- **uncertainty**: What remains unknown or unresolved
- **confidence**: Your confidence (0.0 to 1.0) that this is genuinely
  a consequential choice rather than a routine action

Refer to `references/categories.md` for detailed category definitions and
`references/scoring.md` for materiality dimension descriptions.

## Avoiding bias in alternative presentation

Present alternatives in a consistent order (alphabetical by label, or in
the order they were encountered). Do not place a preferred option first
unless you explicitly state that you are doing so and explain why.

If you believe one alternative is stronger than the others, you may state
your assessment, but you must label it as a recommendation and present the
other alternatives with equal descriptive detail.

Ask yourself: "What alternatives might be missing?" If domain knowledge
suggests additional defensible approaches, include them or note their
existence.
