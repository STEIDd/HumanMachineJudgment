# Evaluation Plan

This document describes the evaluation plan for the Human-Machine Judgment system. It distinguishes between formative evaluation (used during development to guide design decisions) and validated evidence (which requires structured studies that have not yet been conducted). It covers detection quality metrics, workflow burden metrics, technical usefulness metrics, human engagement comparison, the fixture-based evaluation harness, proposed human study designs, and the machine-readable results format.

---

## Distinction Between Formative Evaluation and Validated Evidence

This evaluation plan serves two purposes that must be clearly distinguished:

**Formative evaluation** is conducted during development to guide design decisions, calibrate thresholds, identify usability problems, and improve the system iteratively. Formative evaluation uses developer testing, fixture-based validation, internal pilot usage, and heuristic analysis. Its results inform development but do not constitute evidence of effectiveness.

**Validated evidence** requires structured, pre-registered studies with defined populations, controlled conditions, and statistical analysis. No validated claims about the system's effectiveness, usability, or superiority to alternatives can be made until such studies are designed, conducted, analyzed, and reported. This evaluation plan describes the proposed study designs, but it does not present results.

**No validated claims are made in this document or elsewhere in the project.** All statements about system behavior are descriptions of design intent, not empirical findings. The phrase "the system is designed to" is distinct from "the system has been shown to."

---

## Detection Quality Metrics

Detection quality measures how well the system identifies consequential choices.

### Precision

**Definition.** The proportion of detected candidates that are genuinely consequential choices, as judged by domain experts.

**Measurement method.** A set of agent workflow transcripts is processed by the detection system. Each detected candidate is independently reviewed by at least two domain experts who classify it as a true positive (genuinely consequential choice) or a false positive (not a consequential choice). Precision is computed as true positives divided by (true positives plus false positives).

**Target.** The formative target is precision above 0.80. This means that no more than 20% of detected candidates should be false positives. False positives create unnecessary interruptions and erode trust in the system.

### Recall

**Definition.** The proportion of genuinely consequential choices in a workflow that are detected by the system.

**Measurement method.** Domain experts independently review the same workflow transcripts and identify all consequential choices, including those the system did not detect. Recall is computed as detected true positives divided by (detected true positives plus missed choices).

**Target.** The formative target is recall above 0.90 for hard trigger categories (the ten defined hard trigger rules) and above 0.70 for soft trigger categories (context-dependent choices that require heuristic detection). Missing a high-consequence choice is more harmful than generating a false positive.

### Category Accuracy

**Definition.** The proportion of detected candidates assigned to the correct category.

**Measurement method.** Domain experts classify each detected candidate into the correct category. Category accuracy is computed as the proportion of candidates where the system's assigned category matches the expert's classification.

**Target.** The formative target is category accuracy above 0.85.

### Materiality Score Correlation

**Definition.** The correlation between the system's computed materiality score and expert-assigned materiality scores.

**Measurement method.** Domain experts independently assign materiality scores (using the same six-dimension framework) to a set of detected candidates. The Pearson correlation between system scores and expert scores is computed.

**Target.** The formative target is a correlation coefficient above 0.70. Perfect agreement is not expected because materiality assessment involves subjective judgment.

---

## Workflow Burden Metrics

Workflow burden measures the cost of using the Judgment Points system in terms of interruptions, time, and cognitive load.

### Interruption Rate

**Definition.** The number of pausing interruptions per hour of agent-assisted work.

**Measurement method.** During a timed workflow session, the number of times the agent pauses for a Judgment Point at the `pause` or `require-investigation` intervention level is counted. The interruption rate is computed as interruptions per hour of active work time (excluding time spent on resolution).

**Target.** The formative target is fewer than 5 pausing interruptions per hour. Higher rates suggest that thresholds are too aggressive or that the system is detecting too many low-materiality choices as requiring a pause.

### Resolution Time

**Definition.** The time from when a Judgment Point pauses execution to when a resolution is recorded.

**Measurement method.** The system records timestamps for the pause event and the resolution event. Resolution time is the difference, measured in seconds.

**Target.** The formative target is a median resolution time under 120 seconds for `pause`-level Judgment Points and under 300 seconds for `require-investigation`-level Judgment Points. These targets assume that the system has prepared adequate information before pausing.

### Investigation Quality

**Definition.** The proportion of resolved Judgment Points where the user reports that the investigation information (alternatives, evidence, comparison data) was sufficient for making the decision.

**Measurement method.** After resolution, the user is optionally prompted with a brief satisfaction question about the quality of the information presented. Investigation quality is the proportion of positive responses.

**Target.** The formative target is satisfaction above 0.75.

### Interruption Appropriateness

**Definition.** The proportion of pausing interruptions that the user considers appropriate (i.e., the user agrees that the choice warranted pausing).

**Measurement method.** After resolution, the user is optionally asked whether pausing was appropriate for this choice. Interruption appropriateness is the proportion of affirmative responses.

**Target.** The formative target is appropriateness above 0.85. If many users report that pauses are unnecessary, the materiality thresholds need recalibration.

---

## Technical Usefulness Metrics

Technical usefulness measures whether the Judgment Points system produces decision records that are actually useful for downstream purposes.

### Record Completeness

**Definition.** The proportion of resolved Judgment Points that include all recommended record fields: rationale, uncertainty, conditions, validation requirements, and evidence references.

**Measurement method.** Automated analysis of the resolved Judgment Point records.

**Target.** The formative target is completeness above 0.70.

### Traceability Coverage

**Definition.** The proportion of artifacts in a project that are linked to at least one Judgment Point through an artifact reference.

**Measurement method.** Automated analysis comparing the project's artifact inventory with the Judgment Points' artifact references.

**Target.** No specific target. This metric is informational and helps assess whether the system is capturing decision-to-artifact traceability.

### Staleness Detection Rate

**Definition.** The proportion of dependency changes that are correctly detected and result in stale marking of affected Judgment Points.

**Measurement method.** Simulated dependency changes applied to a project with resolved Judgment Points. The staleness detection rate is the proportion of changes that correctly trigger staleness marking.

**Target.** The formative target is a detection rate above 0.95 for direct dependencies and above 0.80 for transitive dependencies.

---

## Human Engagement Comparison

This section describes comparisons between different approaches to human-agent interaction during technical work. These comparisons are proposed; they have not been conducted.

### Comparison Conditions

Three conditions are proposed for comparison:

1. **Ordinary workflow.** The agent works autonomously, making all choices without interruption. The human reviews the final output. This represents the baseline condition where no judgment system is present.

2. **Approval-only workflow.** The agent pauses for binary (yes/no) approval at predefined checkpoints. This represents a traditional permission-based approach.

3. **Judgment Points workflow.** The agent uses the Judgment Points system to detect consequential choices, present alternatives, and record structured resolutions. This represents the system described in this project.

### Comparison Metrics

The proposed comparison would measure:

- **Decision quality.** Expert evaluation of the technical quality of decisions made in each condition.
- **Decision documentation.** The completeness and usefulness of the decision records produced in each condition.
- **Workflow completion time.** Total time to complete the same technical task in each condition.
- **User cognitive load.** Self-reported cognitive load (using a validated instrument such as NASA-TLX).
- **User satisfaction.** Self-reported satisfaction with the interaction model.
- **Error detection.** The proportion of deliberate errors injected into the workflow that the human detects in each condition.

---

## Fixture-Based Evaluation Harness

The fixture-based evaluation harness is a testing infrastructure that supports formative evaluation during development.

### Harness Structure

The evaluation harness is located in the `evals/` directory and is organized into four evaluation categories:

```
evals/
  fixtures/                Test fixtures for evaluation
  trigger-detection/       Trigger detection evaluation
  interruption-burden/     Interruption burden evaluation
  workflow-comparison/     Workflow comparison evaluation
  dependency-tracing/      Dependency tracing evaluation
```

### Fixture Format

Each fixture defines a scenario, inputs, and expected outputs:

```json
{
  "fixtureId": "td-001",
  "category": "trigger-detection",
  "description": "Agent sets a safety factor for a structural component.",
  "input": {
    "agentAction": {
      "type": "set-parameter",
      "parameterName": "safetyFactor",
      "newValue": 1.5,
      "context": "Structural analysis of a pressure vessel head."
    },
    "workflowState": {
      "existingJudgmentPoints": [],
      "artifacts": ["model-fea", "loads-specification"]
    }
  },
  "expectedOutput": {
    "triggered": true,
    "hardTrigger": "safety-factor-selection",
    "expectedCategory": "parameter",
    "minMaterialityScore": 8,
    "expectedInterventionLevel": "pause"
  }
}
```

### Running the Harness

The evaluation harness is executed through the standard test runner:

```sh
pnpm --filter evals run evaluate
```

The harness loads each fixture, runs it through the detection and scoring pipeline, compares the output to the expected results, and generates a report.

### Extending the Harness

New fixtures can be added by creating JSON files in the appropriate subdirectory under `evals/fixtures/`. Fixtures must conform to the fixture schema. The harness automatically discovers and runs all fixtures in the directory.

---

## Proposed Human Study Design

The following study design is proposed for validating the system's effectiveness. This study has not been conducted. It is described here to document the intended validation methodology.

### Study Population

Participants should be practicing engineers or technical analysts who regularly perform the type of work the Judgment Points system is designed to support. A minimum of 30 participants per condition is proposed to achieve adequate statistical power.

### Study Design

A between-subjects design with three conditions (ordinary workflow, approval-only, Judgment Points) is proposed. Each participant completes the same technical task (a simplified version of the reduced-order thermal modeling example) using one of the three interaction models.

### Task Description

Participants analyze the thermal behavior of a component using an agent-assisted workflow. The task involves four consequential choices (corresponding to the four Judgment Points in the example workflow). The agent is pre-configured with a set of responses for each condition.

### Data Collection

The study collects:

- Workflow transcripts (all interactions between the participant and the agent).
- Decision records (the decisions made and their documentation).
- Task completion time.
- Self-reported cognitive load (NASA-TLX, administered after task completion).
- Self-reported satisfaction (a brief Likert-scale questionnaire).
- Expert evaluation of decision quality (two independent domain experts rate each participant's decisions on a rubric).

### Analysis Plan

- Decision quality is compared across conditions using a one-way ANOVA or Kruskal-Wallis test (depending on distributional assumptions).
- Decision documentation completeness is compared using chi-squared tests.
- Task completion time is compared using a one-way ANOVA with Bonferroni correction.
- Cognitive load is compared using a one-way ANOVA.
- User satisfaction is compared using a Kruskal-Wallis test.

### Ethical Considerations

The study would require institutional review board (IRB) approval. Participants would provide informed consent. All data would be anonymized. Participants would be told that the study evaluates different interaction models but would not be told which model is expected to perform best.

---

## Machine-Readable Results Format

Evaluation results are recorded in a machine-readable JSON format to support automated analysis, trend tracking, and comparison across evaluation runs.

### Result Record Format

```json
{
  "evaluationId": "eval-2026-08-01-001",
  "timestamp": "2026-08-01T14:30:00Z",
  "harness": {
    "version": "0.1.0",
    "fixtureCount": 47,
    "passCount": 43,
    "failCount": 4
  },
  "metrics": {
    "detection": {
      "precision": 0.87,
      "recall": 0.92,
      "categoryAccuracy": 0.89,
      "materialityCorrelation": 0.74
    },
    "burden": {
      "interruptionRatePerHour": 3.2,
      "medianResolutionTimeSeconds": 85,
      "investigationQuality": null,
      "interruptionAppropriateness": null
    },
    "usefulness": {
      "recordCompleteness": 0.78,
      "traceabilityCoverage": 0.65,
      "stalenessDetectionRate": 0.97
    }
  },
  "fixtures": [
    {
      "fixtureId": "td-001",
      "passed": true,
      "details": {}
    },
    {
      "fixtureId": "td-015",
      "passed": false,
      "details": {
        "expected": { "hardTrigger": "data-exclusion" },
        "actual": { "hardTrigger": null }
      }
    }
  ]
}
```

Metrics with `null` values indicate measurements that require human participants and have not been collected in the current evaluation run. The format accommodates both automated fixture results and human-collected data within the same structure.
