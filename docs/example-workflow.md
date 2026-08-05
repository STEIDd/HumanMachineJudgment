# Example Workflow: Reduced-Order Thermal Modeling

This document walks through a realistic example of using the Judgment Points system during a thermal analysis workflow. The example involves an engineer working with an AI agent to analyze the thermal behavior of a heat sink component. The analysis uses a reduced-order thermal model (ROTM) to estimate temperature distributions and thermal resistance.

All numerical values in this document are illustrative. They are chosen to be physically plausible but are not the result of an actual analysis. This example does not replace a validated engineering analysis, and no engineering conclusions should be drawn from the numbers presented here.

---

## Scenario Description

An engineer is analyzing the thermal performance of an aluminum heat sink used in an electronic enclosure. The heat sink dissipates 50 W of thermal power from a processor module. The analysis must determine whether the heat sink maintains the processor junction temperature below the manufacturer's rated maximum of 105 degrees Celsius under steady-state operating conditions.

The engineer uses an AI agent to assist with the analysis. The agent sets up the thermal model, selects material properties, chooses the modeling approach, and prepares validation criteria. During this process, four consequential choices arise, each represented as a Judgment Point.

---

## Judgment Point 1: Intended Use and Fidelity Level

### Detection

As the agent begins setting up the analysis, it frames the problem as a "quick thermal check to confirm the heat sink is adequate." The Detector recognizes this as a framing choice that defines the analysis scope and fidelity expectations.

**Trigger.** Hard trigger: Objective Redefinition (the agent is implicitly defining the analysis objective and fidelity level).

**Category.** `framing`

### Question

"What is the intended use of this thermal analysis, and what fidelity level is appropriate?"

### Context

The engineer needs to determine whether the heat sink keeps the processor within its thermal limits. The answer to this framing question determines whether a quick screening calculation is sufficient or whether a more detailed analysis is needed. The intended use affects every subsequent modeling decision.

### Alternatives

**Alternative A: Screening-level estimate.** Use a simple thermal resistance network with published correlations for convective heat transfer. The goal is a rapid estimate (within an hour) that identifies whether the design is clearly adequate, clearly inadequate, or marginal. If the result is marginal, a more detailed analysis would follow.

- Tradeoffs: Fast, simple, low computational cost. May not capture local temperature variations. Acceptable for preliminary assessment.
- Source: agent

**Alternative B: Detailed reduced-order model.** Build a multi-node reduced-order model that captures spatial temperature variation within the heat sink, including fin efficiency effects and local convective coefficients. The goal is a design-level analysis suitable for documentation.

- Tradeoffs: More accurate spatial resolution. Takes several hours. Requires more material property data. Appropriate for design verification.
- Source: agent

**Alternative C: Full three-dimensional finite element analysis.** Model the complete heat sink geometry in a 3D FEA tool with conjugate heat transfer.

- Tradeoffs: Highest accuracy. Requires significant computation time (hours to days) and specialized software. Appropriate for final design validation or regulatory submission.
- Source: agent

### Materiality Assessment

| Dimension                  | Score | Rationale                                                                                    |
| -------------------------- | ----- | -------------------------------------------------------------------------------------------- |
| Methodological discretion  | 3     | The fidelity level is a judgment call with no single correct answer.                         |
| Downstream influence       | 3     | Every subsequent modeling choice depends on this framing.                                    |
| Uncertainty                | 1     | The operating conditions are well-defined.                                                   |
| Consequence                | 2     | An inappropriate fidelity level could lead to over-confidence or wasted effort.              |
| Reversibility              | 2     | Changing the fidelity level after analysis is underway requires restarting much of the work. |
| Accountability requirement | 1     | This is an internal analysis; no regulatory submission is planned at this stage.             |

**Aggregate score: 12.** Intervention level: `pause`.

### Resolution

The engineer reviews the alternatives and resolves:

- **Selected alternative:** B (Detailed reduced-order model).
- **Rationale:** The heat sink is in a production enclosure, and the analysis will be included in the design file. A screening estimate is too coarse for design documentation, but a full FEA is disproportionate for a heat sink with well-understood geometry.
- **Conditions:** If the ROTM result shows the design is marginal (junction temperature within 10 degrees of the limit), escalate to a full FEA.
- **Validation requirements:** Compare the ROTM result with a published benchmark for a similar fin geometry.
- **Resolution type:** direct-human
- **Recommendation shown:** false (alternatives were presented without preference)

### Validity Conditions

- "The heat sink geometry remains a straight-fin design without significant modifications."
- "The thermal power does not exceed 60 W."

---

## Judgment Point 2: Constant vs. Temperature-Dependent Material Properties

### Detection

The agent retrieves the thermal conductivity of 6061-T6 aluminum and prepares to assign a single constant value (167 W/m-K at 25 degrees Celsius) for all calculations.

**Trigger.** Soft trigger: The agent is making a simplifying assumption about material properties. The hard trigger for assumption detection fires because the agent is introducing a simplification with downstream impact.

**Category.** `assumption`

### Question

"Should material properties (thermal conductivity and specific heat) be treated as constant or as temperature-dependent?"

### Context

The operating temperature range for this analysis spans approximately 25 degrees Celsius (ambient) to an estimated 95 degrees Celsius (near the heat source). Over this range, the thermal conductivity of 6061-T6 aluminum decreases from approximately 167 W/m-K at 25 degrees Celsius to approximately 175 W/m-K at 100 degrees Celsius. The variation is modest (approximately 5%).

### Alternatives

**Alternative A: Constant properties at 25 degrees Celsius.** Use thermal conductivity of 167 W/m-K and specific heat of 896 J/kg-K, evaluated at room temperature.

- Tradeoffs: Simpler model. Introduces a systematic bias of approximately 3-5% in local temperatures near the heat source. May be acceptable given the overall uncertainty.
- Source: agent
- Evidence: Published ASM data for 6061-T6 aluminum.

**Alternative B: Constant properties at mean operating temperature.** Use thermal conductivity of 171 W/m-K evaluated at 60 degrees Celsius (estimated mean temperature).

- Tradeoffs: Reduces systematic bias at the extremes compared to room-temperature properties. Still does not capture spatial variation. Simple to implement.
- Source: agent

**Alternative C: Temperature-dependent properties.** Use a lookup table or polynomial fit for thermal conductivity and specific heat as functions of temperature, based on published data from 25 degrees Celsius to 150 degrees Celsius.

- Tradeoffs: More accurate. Adds complexity to the ROTM solver (requires iterative solution). Computation time increases moderately.
- Source: agent
- Evidence: Published ASM data for 6061-T6 aluminum, with data points at 25, 50, 100, 150, and 200 degrees Celsius.

### Materiality Assessment

| Dimension                  | Score | Rationale                                                                                                                       |
| -------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------- |
| Methodological discretion  | 2     | Both approaches are defensible for this temperature range.                                                                      |
| Downstream influence       | 2     | Material properties affect all computed temperatures.                                                                           |
| Uncertainty                | 1     | The property data is well-characterized for this alloy.                                                                         |
| Consequence                | 1     | The property variation is small; the error from constant properties is bounded.                                                 |
| Reversibility              | 1     | Switching between constant and temperature-dependent properties requires re-running the solver but not restructuring the model. |
| Accountability requirement | 1     | Internal analysis.                                                                                                              |

**Aggregate score: 8.** Intervention level: `pause`.

### Resolution

The engineer reviews the alternatives and resolves:

- **Selected alternative:** B (Constant properties at mean operating temperature).
- **Rationale:** For a 5% variation over the temperature range, constant properties at the mean temperature provide a reasonable balance of accuracy and simplicity. The ROTM is already an approximation, and the additional accuracy from temperature-dependent properties would be smaller than the model's inherent uncertainty.
- **Uncertainty:** ["Property values are interpolated between published data points at 25-degree intervals."]
- **Conditions:** ["Use thermal conductivity of 171 W/m-K, specific heat of 903 J/kg-K, evaluated at 60 degrees Celsius."]
- **Validation requirements:** ["Verify that the maximum temperature difference between constant-property and temperature-dependent-property solutions is less than 3 degrees Celsius for this geometry."]
- **Resolution type:** direct-human
- **Recommendation shown:** false

### Validity Conditions

- "Operating temperature range does not exceed 25 degrees Celsius to 150 degrees Celsius."
- "Material remains 6061-T6 aluminum."

---

## Judgment Point 3: Reduced-Order Model vs. Higher-Fidelity Method

### Detection

The agent proposes to model the heat sink using a thermal resistance network with five nodes: processor interface, heat sink base, fin root, fin mid-height, and fin tip. The Detector recognizes this as a method selection choice.

**Trigger.** Hard trigger: Model Substitution (selecting a reduced-order approach when higher-fidelity alternatives exist).

**Category.** `method`

### Question

"Is a 5-node thermal resistance network an appropriate modeling approach for this heat sink, or should a higher-fidelity method be used?"

### Context

The heat sink has a simple straight-fin geometry with 12 fins. The 5-node ROTM uses analytical expressions for conduction resistance through the base and fins, a fin efficiency correlation, and a convective resistance correlation for the fin surfaces and base plate exposed area.

### Alternatives

**Alternative A: 5-node thermal resistance network (ROTM).** Model the heat sink as a network of thermal resistances connecting the heat source to the ambient air.

- Tradeoffs: Fast computation (under 1 second). Captures overall thermal resistance and average temperatures. Does not capture temperature gradients within the base or local hot spots. Validated against published correlations for similar geometries.
- Source: agent
- Comparison data: Estimated overall thermal resistance 1.2 K/W. Estimated junction-to-ambient temperature rise 60 K.

**Alternative B: 20-node extended ROTM.** A finer discretization of the resistance network with 20 nodes, including multiple nodes across the base thickness and along the fin height.

- Tradeoffs: Better spatial resolution than the 5-node model. Still fast (under 5 seconds). Captures base spreading effects. Does not capture 3D effects at fin tips.
- Source: agent
- Comparison data: Estimated overall thermal resistance 1.25 K/W (slightly higher due to spreading resistance). Estimated junction-to-ambient temperature rise 62.5 K.

**Alternative C: 2D finite element model.** A two-dimensional cross-section model solved with FEA.

- Tradeoffs: Higher accuracy for spatial temperature distribution. Computation time approximately 10 minutes. Requires meshing and solver setup. Captures base spreading and fin conduction gradients.
- Source: agent
- Comparison data: Estimated overall thermal resistance 1.23 K/W. Estimated junction-to-ambient temperature rise 61.5 K.

Note: The numerical differences between these alternatives are small for this geometry. None of these methods is automatically superior; each represents a different balance of accuracy, computational cost, and modeling effort. The choice depends on the intended use (Judgment Point 1) and the required confidence in the result.

### Materiality Assessment

| Dimension                  | Score | Rationale                                                          |
| -------------------------- | ----- | ------------------------------------------------------------------ |
| Methodological discretion  | 2     | Multiple methods are defensible.                                   |
| Downstream influence       | 3     | The modeling method determines all computed temperature values.    |
| Uncertainty                | 1     | The geometry is simple and well-understood.                        |
| Consequence                | 2     | An inappropriate method could over- or under-predict temperatures. |
| Reversibility              | 2     | Changing the method requires rebuilding the model.                 |
| Accountability requirement | 1     | Internal analysis.                                                 |

**Aggregate score: 11.** Intervention level: `pause`.

### Resolution

The engineer reviews the alternatives and resolves:

- **Selected alternative:** A (5-node thermal resistance network).
- **Rationale:** The 5-node ROTM is consistent with the design-level fidelity chosen in Judgment Point 1. The estimated thermal resistance values from all three methods agree within 5%, suggesting that additional spatial resolution would not change the design conclusion for this simple geometry. If the margin is tight, the resolution of Judgment Point 1 already specifies escalation to FEA.
- **Uncertainty:** ["Convective heat transfer coefficient is based on a correlation for natural convection over vertical plates; actual airflow patterns may differ."]
- **Conditions:** ["Use validated correlations from Incropera & DeWitt for fin efficiency and natural convection."]
- **Validation requirements:** ["Overall thermal resistance should be within 15% of the manufacturer's published value of 1.1 K/W."]
- **Resolution type:** direct-human
- **Recommendation shown:** false

### Validity Conditions

- "Heat sink geometry is a straight-fin design with aspect ratio between 2:1 and 5:1."
- "Cooling mode remains natural convection."

---

## Judgment Point 4: Validation and Acceptance Criterion

### Detection

The agent proposes to accept the analysis results if "the computed junction temperature is below 105 degrees Celsius." The Detector recognizes this as a validation criterion selection.

**Trigger.** Hard trigger: Validation Criterion Selection.

**Category.** `validation`

### Question

"What acceptance criterion should be used to determine whether the heat sink design is adequate?"

### Context

The processor manufacturer specifies a maximum junction temperature of 105 degrees Celsius. The analysis computes the junction temperature as the sum of the ambient temperature and the computed temperature rise. The ambient temperature for this application is 40 degrees Celsius (maximum rated ambient). The acceptance criterion must account for modeling uncertainty and safety margin.

### Alternatives

**Alternative A: Junction temperature below 105 degrees Celsius.** Accept if the computed junction temperature (ambient plus temperature rise) is below the rated maximum.

- Tradeoffs: No safety margin. If the model under-predicts temperature by any amount, the actual junction temperature could exceed the limit. Simple and directly tied to the manufacturer's specification.
- Source: agent

**Alternative B: Junction temperature below 95 degrees Celsius (10-degree margin).** Accept if the computed junction temperature is below 95 degrees Celsius, providing a 10-degree margin below the rated maximum.

- Tradeoffs: Provides margin for modeling uncertainty, manufacturing variation, and environmental variation. May reject designs that are actually adequate.
- Source: user

**Alternative C: Junction temperature below 100 degrees Celsius, with uncertainty analysis.** Accept if the computed junction temperature is below 100 degrees Celsius and a sensitivity analysis shows that the result is not sensitive to input variations (material properties, ambient temperature, heat load) within their expected ranges.

- Tradeoffs: Balances margin and confidence. Requires additional computation for sensitivity analysis. Provides a more rigorous basis for the acceptance decision.
- Source: agent

### Materiality Assessment

| Dimension                  | Score | Rationale                                                                        |
| -------------------------- | ----- | -------------------------------------------------------------------------------- |
| Methodological discretion  | 2     | Multiple criteria are defensible.                                                |
| Downstream influence       | 2     | The acceptance criterion determines the go/no-go decision.                       |
| Uncertainty                | 2     | Modeling uncertainty is not precisely quantified.                                |
| Consequence                | 3     | An inadequate acceptance criterion could approve a design that fails in service. |
| Reversibility              | 1     | The criterion can be changed without rebuilding the model.                       |
| Accountability requirement | 2     | The acceptance criterion will be documented in the design file.                  |

**Aggregate score: 12.** Intervention level: `pause`.

### Resolution

The engineer reviews the alternatives and resolves:

- **Selected alternative:** B (Junction temperature below 95 degrees Celsius).
- **Rationale:** A 10-degree margin below the rated maximum is a standard engineering practice for this type of analysis. It accounts for the ROTM's inherent modeling uncertainty (estimated at 5-10% of the temperature rise) and provides margin for manufacturing variation. The margin is conservative but not excessively so.
- **Uncertainty:** ["The 10-degree margin is based on engineering judgment, not a formal uncertainty quantification."]
- **Conditions:** ["Ambient temperature for the acceptance check is 40 degrees Celsius (maximum rated ambient)."]
- **Validation requirements:** ["Confirm that the computed junction temperature at 40 degrees Celsius ambient is below 95 degrees Celsius."]
- **Resolution type:** direct-human
- **Recommendation shown:** false

### Validity Conditions

- "Processor maximum junction temperature rating is 105 degrees Celsius."
- "Maximum rated ambient temperature is 40 degrees Celsius."

---

## Dependency Propagation

The four Judgment Points form a dependency chain:

```
JP1 (Fidelity Level)
  |
  +---> JP2 (Material Properties)
  |       |
  |       +---> JP3 (Modeling Method)
  |               |
  |               +---> JP4 (Acceptance Criterion)
```

Judgment Point 1 (fidelity level) is the root. The choice of fidelity level constrains what modeling methods are appropriate (JP3), which in turn determines how material properties are used (JP2). The acceptance criterion (JP4) must be appropriate for the fidelity level and modeling method chosen.

If JP1 is reopened (for example, if the analysis is later required for regulatory submission, changing the fidelity requirement from design-level to validation-level), JP2 and JP3 would be marked as stale because their resolutions assumed a design-level fidelity.

---

## Staleness Scenario

Several weeks after the analysis is completed, the product manager notifies the engineer that the processor module has been upgraded. The new processor dissipates 65 W instead of 50 W.

This change affects the analysis in two ways:

1. **Validity condition violation on JP3.** The thermal resistance network correlation assumes a specific heat flux range. The new heat load may be outside this range, invalidating the model's applicability.

2. **Validity condition concern on JP4.** The 10-degree margin was judged adequate for a 50 W heat load. At 65 W, the junction temperature will be higher, potentially consuming most of the margin.

The system detects the dependency change (the heat load is an input artifact linked to all four Judgment Points). It marks JP3 and JP4 as stale with the reason "Upstream input 'thermal-power' changed from 50 W to 65 W."

The engineer reviews the stale markers:

- **JP3 (Modeling Method):** The engineer confirms that the 5-node ROTM remains applicable at 65 W (the correlations are valid over this range) and removes the stale marker.
- **JP4 (Acceptance Criterion):** The engineer reopens JP4 to reconsider whether the 10-degree margin is still adequate. After re-evaluation, the engineer selects Alternative C (100 degrees Celsius with sensitivity analysis) because the higher heat load reduces the available margin. The new resolution is recorded, and the previous resolution is preserved in the revision history.

---

## Summary of the Four Judgment Points

| JP  | Category   | Question             | Selected Alternative                                                              | Score | Status                          |
| --- | ---------- | -------------------- | --------------------------------------------------------------------------------- | ----- | ------------------------------- |
| 1   | framing    | Fidelity level       | Design-level ROTM                                                                 | 12    | resolved                        |
| 2   | assumption | Material properties  | Constant at mean temperature                                                      | 8     | resolved                        |
| 3   | method     | Modeling approach    | 5-node ROTM                                                                       | 11    | resolved (stale marker removed) |
| 4   | validation | Acceptance criterion | 95 degrees Celsius, then revised to 100 degrees Celsius with sensitivity analysis | 12    | resolved (revision 2)           |

This example demonstrates detection, materiality scoring, structured alternatives, resolution with rationale and conditions, dependency propagation, and staleness handling. All values are illustrative and are provided to show how the system operates, not to support any engineering conclusion.
