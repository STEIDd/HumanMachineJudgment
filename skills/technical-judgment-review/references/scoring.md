# Materiality Scoring Reference

This document describes the six materiality dimensions used to assess how
consequential a technical choice is. Each dimension is scored from 0 to 3.
The aggregate score (0 to 18) determines the intervention level.

These scoring criteria are an initial product hypothesis. They have not been
validated through empirical study and should be calibrated against real
workflows and false-positive rates.

## Dimensions

### Methodological Discretion

How much freedom exists in choosing the approach.

| Score | Description                                                                                                                                    |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | The approach is mechanically determined by the inputs, requirements, or prior decisions. No choice exists.                                     |
| 1     | A minor choice exists, but the alternatives produce negligibly different results.                                                              |
| 2     | Several defensible approaches exist, each with meaningful tradeoffs.                                                                           |
| 3     | The choice of approach substantially defines the character of the analysis. Different practitioners would reasonably select different methods. |

### Downstream Influence

How many artifacts, results, or conclusions depend on this choice.

| Score | Description                                                                          |
| ----- | ------------------------------------------------------------------------------------ |
| 0     | The choice has only a local effect on a single computation or artifact.              |
| 1     | A few artifacts are affected, but no major conclusions depend on the choice.         |
| 2     | Several results, plots, or intermediate conclusions are affected.                    |
| 3     | Central conclusions, deliverables, or safety-relevant results depend on this choice. |

### Uncertainty

How well established the evidence and knowledge base is for this choice.

| Score | Description                                                                          |
| ----- | ------------------------------------------------------------------------------------ |
| 0     | The correct approach is well established by evidence, standards, or consensus.       |
| 1     | Limited uncertainty exists, but the likely correct approach is clear.                |
| 2     | Important unknowns exist that could affect which alternative is appropriate.         |
| 3     | Evidence is incomplete, conflicting, or insufficient to determine the best approach. |

### Consequence

What happens if the choice turns out to be wrong or suboptimal.

| Score | Description                                                                     |
| ----- | ------------------------------------------------------------------------------- |
| 0     | The consequence is cosmetic or trivial.                                         |
| 1     | The error is easily corrected with minimal effort.                              |
| 2     | Significant rework, reinterpretation, or schedule impact would result.          |
| 3     | Safety, publication integrity, cost, or major design consequences could follow. |

### Reversibility

How difficult it is to change the decision later.

| Score | Description                                                                    |
| ----- | ------------------------------------------------------------------------------ |
| 0     | The decision can be reversed immediately with no cost.                         |
| 1     | Reversal requires modest effort and has no significant side effects.           |
| 2     | Reversal is expensive, requiring substantial rework of dependent artifacts.    |
| 3     | Reversal is difficult or practically impossible once downstream work proceeds. |

### Accountability Requirement

What level of documentation, justification, or review is expected for this type of decision.

| Score | Description                                                                             |
| ----- | --------------------------------------------------------------------------------------- |
| 0     | No special responsibility is associated with this decision.                             |
| 1     | Internal convention suggests documenting the choice.                                    |
| 2     | Formal technical justification is expected by the project, client, or organization.     |
| 3     | External review, regulatory compliance, or professional responsibility standards apply. |

## Aggregate Score and Intervention Levels

The aggregate materiality score is the sum of all six dimensions (range: 0 to 18).

| Score Range | Intervention          | Description                                                                                 |
| ----------- | --------------------- | ------------------------------------------------------------------------------------------- |
| 0 to 4      | Trace                 | Record the choice in the ordinary activity trace. No interruption.                          |
| 5 to 8      | Disclose              | Disclose the choice to the user without stopping execution.                                 |
| 9 to 13     | Pause                 | Create a Judgment Point and pause execution according to project policy.                    |
| 14 to 18    | Require Investigation | Require explicit resolution with documented alternatives, rationale, and a validation plan. |

These thresholds are configurable per project. They represent an initial
hypothesis about useful intervention levels, not empirically validated
cutoff points.

The score determines how much intervention is required. It never determines
which alternative is correct.
