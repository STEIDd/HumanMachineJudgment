# Judgment Candidate Examples

This document provides examples of correctly identified Judgment Candidates,
incorrectly flagged non-candidates, and missed candidates. These examples
serve as reference material for agents and as fixtures for evaluation.

## Correctly Identified Candidates

### Example 1: Material Property Treatment

**Context**: An agent is setting up a thermal stress analysis. The predicted
temperature range is 300 K to 850 K. The material (a nickel-based alloy) has
properties that vary significantly across this range.

**Candidate**:

```json
{
  "category": "assumption",
  "question": "Should material properties be treated as constant or temperature-dependent for this analysis?",
  "reason": "The predicted temperature range (300-850 K) crosses a region where the yield strength of the alloy decreases by approximately 40%. Using constant properties evaluated at a single temperature would not capture this variation.",
  "alternatives": [
    {
      "id": "constant",
      "label": "Constant properties",
      "description": "Use material properties evaluated at a single reference temperature.",
      "tradeoffs": "Simpler implementation, faster computation, but may underestimate thermal strain and overestimate strength at elevated temperatures."
    },
    {
      "id": "temperature-dependent",
      "label": "Temperature-dependent properties",
      "description": "Use interpolated material properties as a function of temperature from the source dataset.",
      "tradeoffs": "More representative of physical behavior across the temperature range, but requires validated property data and increases computational cost."
    }
  ],
  "affected_artifacts": ["cell-21", "cell-27", "plot-4", "conclusion-2"],
  "uncertainty": "The available property dataset covers 300-900 K but has limited data points between 700-800 K. Interpolation accuracy in this subrange is uncertain.",
  "confidence": 0.92
}
```

**Why this is correct**: The choice materially affects the predicted stress
distribution and could change whether the component passes or fails the
acceptance criterion.

### Example 2: Validation Acceptance Criterion

**Context**: An agent has completed a reduced-order thermal model and needs
to compare its predictions against reference data.

**Candidate**:

```json
{
  "category": "validation",
  "question": "What acceptance criterion should be used to determine whether the reduced-order model predictions are adequate?",
  "reason": "The choice of acceptance criterion determines whether the model is considered valid for the intended use. Different criteria could lead to different conclusions about model adequacy.",
  "alternatives": [
    {
      "id": "relative-error-5pct",
      "label": "5% relative error threshold",
      "description": "Accept the model if peak temperature predictions differ from reference data by less than 5%.",
      "tradeoffs": "Common engineering threshold, but may be too strict for a screening-level analysis or too lenient for a detailed design verification."
    },
    {
      "id": "relative-error-10pct",
      "label": "10% relative error threshold",
      "description": "Accept the model if predictions differ by less than 10%.",
      "tradeoffs": "More permissive, appropriate for preliminary screening, but may mask significant modeling deficiencies."
    },
    {
      "id": "feature-based",
      "label": "Feature-based comparison",
      "description": "Evaluate whether the model captures the correct trends, peak locations, and relative magnitudes rather than applying a single error threshold.",
      "tradeoffs": "More informative assessment of model capability, but requires subjective judgment about what constitutes adequate agreement."
    }
  ],
  "affected_artifacts": ["validation-check-v03", "conclusion-3"],
  "uncertainty": "No project-specific validation standard has been established. The appropriate criterion depends on the intended use, which is itself a separate judgment.",
  "confidence": 0.88
}
```

## Incorrectly Flagged Non-Candidates

### Example 3: Plot Formatting

**Context**: An agent is generating a temperature contour plot and selects
a color map.

This should NOT be flagged as a Judgment Candidate. The color map choice
does not materially affect the analysis results or conclusions. It is a
presentation decision.

### Example 4: File Organization

**Context**: An agent decides to store intermediate results in a subdirectory
rather than the project root.

This should NOT be flagged. File organization does not affect technical
outcomes.

### Example 5: Routine Parameter with Negligible Effect

**Context**: An agent sets the number of output time steps for a steady-state
analysis to 100 instead of 50. Both values produce identical final results;
only the intermediate output density changes.

This should NOT be flagged. The choice does not materially affect the results.

## Missed Candidates

### Example 6: Silent Model Change

**Context**: An agent replaces a linear elastic material model with a
bilinear plasticity model without flagging the change. This alters the
predicted stress distribution and peak stresses.

This SHOULD have been flagged as a Judgment Candidate with category "method".
Changing the constitutive model class is a consequential technical choice.

### Example 7: Data Exclusion

**Context**: An agent removes three data points from a calibration dataset
because they fall outside the expected range, without noting the exclusion.

This SHOULD have been flagged with category "data". Excluding data that
could affect calibration results is a consequential choice requiring
justification.
