# Materiality and Policy

This document describes the materiality scoring model, intervention levels, hard trigger rules, policy model, policy precedence, conflict resolution, delegation conditions, and extension mechanisms for the Human-Machine Judgment system.

---

## Calibration Disclaimer

The materiality dimensions, scoring levels, intervention thresholds, and hard trigger rules described in this document are initial hypotheses. They reflect the project authors' best understanding of which factors make a technical choice consequential, but they have not been validated through empirical study.

These values require calibration through real-world usage, user feedback, and structured evaluation. The evaluation plan (see `docs/evaluation-plan.md`) describes the methodology for calibrating these values. Until calibration studies are conducted, the thresholds should be treated as reasonable starting points that organizations should adjust based on their own experience and requirements.

---

## The Six Materiality Dimensions

Each Judgment Point is assessed across six independent dimensions. Each dimension receives a score from 0 (negligible) to 3 (high). The six dimension scores are summed to produce an aggregate materiality score ranging from 0 to 18.

### 1. Methodological Discretion

Measures the degree of professional or technical judgment involved in the choice. Some choices are tightly constrained by standards, codes, or prior agreements; others involve substantial discretion.

| Score | Level      | Description                                                                                                                                            | Example                                                                                                          |
| ----- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 0     | Negligible | The choice is fully determined by a standard, code, or prior agreement. No discretion is exercised.                                                    | Selecting the standard gravitational constant for a structural calculation.                                      |
| 1     | Low        | The choice follows a well-established convention with minor variations. Limited discretion exists.                                                     | Choosing between two standard mesh densities recommended by a software vendor.                                   |
| 2     | Moderate   | Multiple defensible approaches exist, and the choice reflects the analyst's professional judgment about which is most appropriate.                     | Selecting between a linear and a nonlinear constitutive model for a material under moderate strain.              |
| 3     | High       | The choice is substantially open-ended, with no clearly dominant approach. The decision reflects significant discretion and may be contested by peers. | Defining the scope and boundary conditions for a novel coupled-physics simulation with no established precedent. |

### 2. Downstream Influence

Measures how broadly the decision propagates through the analysis. A choice with high downstream influence affects many subsequent computations, conclusions, or recommendations.

| Score | Level      | Description                                                                                                         | Example                                                                                                                         |
| ----- | ---------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Negligible | The choice affects only a single, isolated computation or artifact.                                                 | Selecting the number of decimal places displayed in an intermediate result.                                                     |
| 1     | Low        | The choice affects a small number of directly connected computations.                                               | Choosing the interpolation method for a single data series that feeds into one calculation.                                     |
| 2     | Moderate   | The choice affects multiple computations or conclusions across a significant portion of the analysis.               | Selecting the turbulence model for a CFD analysis that determines pressure distributions used in several structural load cases. |
| 3     | High       | The choice affects the entire analysis or multiple analyses. Nearly all downstream results depend on this decision. | Defining the operating envelope that constrains every subsequent design calculation.                                            |

### 3. Uncertainty

Measures the degree of uncertainty in the information available at the time of the decision. Higher uncertainty means the decision is being made with less confidence in the inputs or assumptions.

| Score | Level      | Description                                                                                                                                     | Example                                                                                                            |
| ----- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 0     | Negligible | The relevant information is well-established and precise.                                                                                       | Using published, peer-reviewed material properties for a common alloy at room temperature.                         |
| 1     | Low        | The information is generally reliable but has minor gaps or tolerances.                                                                         | Using manufacturer-provided data for a material whose properties are characterized at a few discrete temperatures. |
| 2     | Moderate   | Significant gaps exist in the available information, or the data has substantial scatter.                                                       | Estimating fatigue properties for a new alloy based on similarity to other alloys in the same family.              |
| 3     | High       | The decision is made under conditions of deep uncertainty, where the relevant information is largely absent, contradictory, or highly variable. | Predicting long-term degradation behavior for a novel composite material with no field data.                       |

### 4. Consequence

Measures the magnitude of the impact if the decision turns out to be wrong. Consequence captures what is at stake, not how likely a bad outcome is.

| Score | Level      | Description                                                                                                                                                 | Example                                                                                                       |
| ----- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 0     | Negligible | An incorrect decision has no meaningful impact. The error can be corrected trivially.                                                                       | Choosing between equivalent formatting options for a data table.                                              |
| 1     | Low        | An incorrect decision causes minor rework or delays. The impact is contained within the immediate analysis.                                                 | Using a slightly suboptimal curve-fitting algorithm that requires re-running one calculation step.            |
| 2     | Moderate   | An incorrect decision causes significant rework, affects project timelines, or produces misleading intermediate results that could propagate if not caught. | Selecting an inappropriate boundary condition that leads to nonphysical results in a portion of the analysis. |
| 3     | High       | An incorrect decision could lead to unsafe designs, regulatory non-compliance, financial loss, or harm.                                                     | Selecting a safety factor that is too low for a structural component in a life-safety application.            |

### 5. Reversibility

Measures how easily the decision can be changed after it has been made and its effects have propagated. Some decisions are easy to reverse; others create commitments that are difficult or expensive to undo.

| Score | Level      | Description                                                                                                                                                      | Example                                                                                                |
| ----- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 0     | Negligible | The decision can be reversed instantly with no cost or downstream impact.                                                                                        | Changing a plot color scheme.                                                                          |
| 1     | Low        | The decision can be reversed with minor effort. A small amount of rework is required.                                                                            | Changing a convergence tolerance and re-running a solver.                                              |
| 2     | Moderate   | Reversing the decision requires significant rework or has implications for other decisions that have already been made.                                          | Changing the finite element type after a mesh has been generated and several load cases have been run. |
| 3     | High       | The decision is practically irreversible within the project timeline, or reversing it would require starting a significant portion of the analysis from scratch. | Changing the fundamental modeling approach after weeks of analysis built on the original approach.     |

### 6. Accountability Requirement

Measures the degree to which the decision must be documented, justified, and traceable for regulatory, contractual, or professional accountability purposes.

| Score | Level      | Description                                                                                                                              | Example                                                                                                |
| ----- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 0     | Negligible | No external accountability requirement exists for this decision.                                                                         | An internal exploratory analysis with no external audience.                                            |
| 1     | Low        | The decision should be documented for good practice, but no specific regulatory or contractual requirement governs it.                   | Documenting the choice of solver settings in an internal technical report.                             |
| 2     | Moderate   | A regulatory standard, contractual requirement, or professional standard of care requires that the decision be documented and justified. | Selecting an analysis method governed by an industry standard such as ASME or Eurocode.                |
| 3     | High       | The decision is subject to external audit, regulatory review, or legal scrutiny. The decision-maker may be held personally accountable.  | Choosing the safety factor for a nuclear component where the decision is subject to regulatory review. |

---

## Aggregate Score Computation

The aggregate materiality score is computed as the arithmetic sum of the six dimension scores:

```
aggregate = methodologicalDiscretion
          + downstreamInfluence
          + uncertainty
          + consequence
          + reversibility
          + accountabilityRequirement
```

The minimum possible aggregate is 0 (all dimensions negligible). The maximum possible aggregate is 18 (all dimensions high).

The aggregate score is an integer. Fractional scores are not used because the individual dimension scores are integers.

---

## Intervention Levels

The aggregate materiality score maps to one of four intervention levels. The default mapping is:

| Score Range | Intervention Level      | System Behavior                                                                                                                                                                               |
| ----------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 to 4      | `trace`                 | The decision is logged silently. The user is not interrupted. Work continues without pause.                                                                                                   |
| 5 to 8      | `disclose`              | The decision is surfaced to the user through a notification or inline marker. Work continues without blocking. The user can review the decision at their convenience.                         |
| 9 to 13     | `pause`                 | Execution halts until the decision is resolved. The user must explicitly resolve the Judgment Point before work can continue.                                                                 |
| 14 to 18    | `require-investigation` | Execution halts, and structured comparison of alternatives is mandatory before resolution. The user must review at least two alternatives with their tradeoffs before recording a resolution. |

These thresholds are configurable through policies. An organization may lower or raise the thresholds based on their risk tolerance and the nature of their work.

---

## Hard Trigger Rules

Hard triggers are deterministic rules that force a specific intervention level regardless of the computed materiality score. When a hard trigger fires, it overrides the score-based intervention level with the trigger's specified level.

The following ten hard trigger rules are defined in the initial configuration:

### 1. Objective Redefinition

**Description.** The agent is changing or redefining the stated objective of the analysis.

**Trigger condition.** The agent's proposed action modifies the analysis objective, success criteria, or the fundamental question being answered.

**Forced intervention.** `require-investigation`

**Example.** An agent analyzing structural adequacy proposes to change the analysis from "verify that the component meets yield strength requirements" to "evaluate fatigue life." This is a fundamental change in what the analysis is trying to achieve.

### 2. Safety or Design Factor Selection

**Description.** The agent is selecting or modifying a safety factor, design margin, or knockdown factor.

**Trigger condition.** The agent sets or changes a parameter that is explicitly identified as a safety factor, design margin, or knockdown factor.

**Forced intervention.** `pause`

**Example.** An agent proposes to use a safety factor of 1.5 for a structural component. The hard trigger fires because safety factors are high-consequence choices that should not be made silently.

### 3. Data Exclusion

**Description.** The agent is excluding, filtering, or discarding data points from a dataset.

**Trigger condition.** The agent removes data points, applies a filter that reduces the dataset, or excludes records from a data source.

**Forced intervention.** `pause`

**Example.** An agent performing a statistical analysis proposes to remove outliers more than three standard deviations from the mean. The hard trigger fires because data exclusion decisions can change analysis conclusions.

### 4. Irreversible Commitment

**Description.** The agent is making a commitment that cannot be reversed within the project timeline.

**Trigger condition.** The agent's proposed action is identified as creating a dependency that would require restarting a substantial portion of the analysis to reverse.

**Forced intervention.** `pause`

**Example.** An agent proposes to commit to a specific finite element mesh topology before all load cases have been defined.

### 5. Validation Criterion Selection

**Description.** The agent is defining or modifying the criteria used to determine whether results are acceptable.

**Trigger condition.** The agent sets or changes acceptance criteria, convergence criteria, error tolerances, or pass/fail thresholds.

**Forced intervention.** `pause`

**Example.** An agent sets the mesh convergence criterion to "results change by less than 5% between mesh refinement levels."

### 6. External Requirement Interpretation

**Description.** The agent is interpreting an external requirement, standard, or specification in a way that involves discretion.

**Trigger condition.** The agent applies a requirement from a standard, code, or specification and the application involves interpretive judgment about scope, applicability, or meaning.

**Forced intervention.** `pause`

**Example.** An agent interprets an ASME code provision as applicable to a non-standard geometry by analogy with the standard geometry covered by the code.

### 7. Contradictory Evidence

**Description.** The agent has encountered evidence that contradicts a prior assumption or decision.

**Trigger condition.** New data, results, or information conflicts with information used in a prior decision, and the agent proposes to proceed without reconciling the contradiction.

**Forced intervention.** `require-investigation`

**Example.** A simulation produces results that disagree with experimental data by more than the expected uncertainty, and the agent proposes to proceed with the simulation results.

### 8. Model Substitution

**Description.** The agent is replacing one analytical or computational model with a different model.

**Trigger condition.** The agent changes the fundamental model, solver, or computational approach used for a significant portion of the analysis.

**Forced intervention.** `pause`

**Example.** An agent replaces a full three-dimensional finite element model with a reduced-order lumped-parameter model.

### 9. Assumption of Worst-Case or Best-Case

**Description.** The agent is assuming a worst-case or best-case value for a parameter where the actual value is uncertain.

**Trigger condition.** The agent explicitly selects an extreme bound of a parameter range as the assumed value, rather than a nominal or expected value.

**Forced intervention.** `disclose`

**Example.** An agent assumes the maximum possible ambient temperature for a thermal analysis rather than the expected operating temperature.

### 10. Conclusion or Recommendation Formulation

**Description.** The agent is formulating a conclusion or recommendation based on analysis results.

**Trigger condition.** The agent generates a summary conclusion, design recommendation, or go/no-go recommendation based on computed results.

**Forced intervention.** `pause`

**Example.** An agent concludes that "the design meets all structural requirements with adequate margin" and presents this as a final recommendation.

---

## Policy Model

### Policy Structure

A Judgment Policy is a JSON document conforming to the `judgment-policy.schema.json` schema. Each policy contains:

- **id**: A unique identifier.
- **projectId**: The project this policy belongs to.
- **name**: A human-readable name.
- **description**: An explanation of what the policy governs and why.
- **scope**: A set of conditions that determine which Judgment Points the policy applies to. Scope conditions include categories, trigger sources, artifact types, and materiality score ranges.
- **rules**: An ordered list of policy rules. Rules are evaluated in order; the first matching rule determines the outcome.
- **priority**: A precedence ordering value (lower numbers indicate higher priority).
- **enabled**: Whether the policy is currently active.

### Policy Scope

The scope defines which Judgment Points a policy applies to. All specified scope conditions must be met (logical AND). Omitted conditions match everything.

Scope conditions include:

- **categories**: The policy applies only to Judgment Points in the listed categories.
- **triggerSources**: The policy applies only to Judgment Points detected by the listed trigger sources.
- **artifactTypes**: The policy applies only to Judgment Points affecting the listed artifact types.
- **materialityScoreMin**: The policy applies only to Judgment Points with an aggregate score at or above this value.
- **materialityScoreMax**: The policy applies only to Judgment Points with an aggregate score at or below this value.

### Policy Rule Evaluation

Within a policy, rules are evaluated in the order they are defined. Each rule has a condition and an intervention level. When a rule's condition matches the Judgment Point, the rule's intervention level is applied, and evaluation of that policy stops.

Rule conditions can match on:

- **materialityScoreMin / materialityScoreMax**: Aggregate score range.
- **dimensionThresholds**: If any specified dimension meets or exceeds its threshold, the condition matches.
- **hardTrigger**: If the Judgment Point was created by the specified hard trigger.
- **categories**: If the Judgment Point's category is in the list.
- **expression**: A free-form expression for advanced matching.

All specified fields in a condition must match (logical AND). Omitted fields are not evaluated.

### Authority Override

A policy rule may include an authority override that changes the default authority mode when the rule matches. This allows policies to escalate or relax authority requirements based on conditions. For example, a rule might override the authority to `human` for all Judgment Points with materiality scores above 14.

### Delegation Conditions

A policy rule may include delegation conditions that specify when automated resolution is permitted. Delegation conditions include:

- **allowed**: Whether delegation is permitted at all.
- **maxMaterialityScore**: Maximum score for which delegation is allowed.
- **requiredConfidence**: Minimum detector confidence required.
- **excludedCategories**: Categories that are never eligible for delegation.
- **requiresPriorHumanResolution**: Whether a similar decision must have been resolved by a human before delegation is allowed.
- **auditRequired**: Whether delegated resolutions must be flagged for human audit.

---

## Policy Precedence

When multiple policies match a Judgment Point, the system determines the effective intervention level and authority mode using a seven-level precedence hierarchy. Higher-numbered levels take precedence over lower-numbered levels.

| Precedence | Source                      | Description                                                                 |
| ---------- | --------------------------- | --------------------------------------------------------------------------- |
| 1          | Default threshold           | The score-based default mapping from aggregate score to intervention level. |
| 2          | Project-level policy        | A policy defined at the project level with no specific scope restrictions.  |
| 3          | Category-scoped policy      | A policy scoped to specific categories.                                     |
| 4          | Artifact-type-scoped policy | A policy scoped to specific artifact types.                                 |
| 5          | Dimension-threshold policy  | A policy with specific dimension threshold conditions.                      |
| 6          | Hard trigger override       | A hard trigger rule that forces a specific intervention level.              |
| 7          | User explicit override      | An explicit override by an authorized user for a specific Judgment Point.   |

Within the same precedence level, policies are ordered by their `priority` field (lower numbers indicate higher priority).

---

## Conflict Resolution

When multiple policies at the same precedence level produce different intervention levels for the same Judgment Point, the system applies the following conflict resolution rules:

1. **Most restrictive wins.** The intervention level that imposes the greatest constraint is applied. The ordering from most to least restrictive is: `require-investigation` > `pause` > `disclose` > `trace`.

2. **Authority escalation.** If multiple policies specify different authority modes, the most restrictive authority mode is applied. The ordering from most to least restrictive is: `human` > `collaborative` > `delegated` > `rule`.

3. **Delegation restriction.** If any matching policy disallows delegation, delegation is disallowed regardless of what other policies permit.

These rules ensure that safety-oriented constraints cannot be relaxed by the addition of a more permissive policy.

---

## Adding Custom Policy Rules

To add a custom policy rule to a project:

1. Define the policy as a JSON document conforming to `judgment-policy.schema.json`.
2. Specify the scope to match the Judgment Points the policy should govern.
3. Define rules with conditions and intervention levels.
4. Set the priority to determine where the policy falls in the precedence ordering relative to other policies.
5. Register the policy with the project through the SDK's `addPolicy` method or the MCP `judgment.add_policy` tool.

Custom policies are evaluated alongside the built-in default thresholds and hard trigger rules. They can raise the intervention level above the default but cannot lower it below a hard trigger override (precedence level 6).

---

## Adjusting Materiality Thresholds

The default score-to-intervention-level mapping can be adjusted at the project level by creating a policy with no scope restrictions (matching all Judgment Points) and rules that define the desired thresholds.

For example, to lower the `pause` threshold from 8 to 6:

```json
{
  "id": "custom-thresholds",
  "projectId": "my-project",
  "name": "Adjusted materiality thresholds",
  "description": "Lowers the pause threshold from 8 to 6 for increased scrutiny.",
  "scope": {},
  "rules": [
    {
      "id": "pause-at-6",
      "condition": { "materialityScoreMin": 6 },
      "intervention": "pause",
      "description": "Pause for any Judgment Point with score 6 or higher."
    }
  ],
  "priority": 10,
  "enabled": true,
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

Because policies cannot lower the intervention level below a hard trigger override, this custom threshold policy would raise the intervention to `pause` for scores 6 and above but would not prevent `require-investigation` for scores 13 and above (unless a separate rule also changes that threshold).

---

## Dimension-Level Policy Examples

Policies can also target specific materiality dimensions rather than the aggregate score. This allows fine-grained control over which aspects of a decision trigger specific responses.

**Example: High-consequence choices always pause.**

```json
{
  "id": "high-consequence-pause",
  "projectId": "my-project",
  "name": "Pause on high consequence",
  "description": "Any choice with consequence score 3 must pause regardless of aggregate score.",
  "scope": {},
  "rules": [
    {
      "id": "consequence-3-pause",
      "condition": {
        "dimensionThresholds": { "consequence": 3 }
      },
      "intervention": "pause",
      "description": "Pause when consequence is at the highest level."
    }
  ],
  "priority": 5,
  "enabled": true,
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

**Example: Require investigation for high-accountability assumptions.**

```json
{
  "id": "accountable-assumptions",
  "projectId": "my-project",
  "name": "Investigate accountable assumptions",
  "description": "Assumptions with high accountability requirements must be investigated.",
  "scope": {
    "categories": ["assumption"]
  },
  "rules": [
    {
      "id": "accountability-3-investigate",
      "condition": {
        "dimensionThresholds": { "accountabilityRequirement": 3 }
      },
      "intervention": "require-investigation",
      "description": "Require investigation when accountability is at the highest level for assumptions."
    }
  ],
  "priority": 3,
  "enabled": true,
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```
