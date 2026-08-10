# Judgment Categories

This document defines the eight categories used to classify Judgment Points.
Each category represents a distinct type of consequential technical choice.

## Objective

A choice about the purpose, intended use, or required fidelity of the work.

Examples:

- Deciding whether an analysis is intended for preliminary screening or
  detailed design verification.
- Choosing the level of conservatism appropriate for the intended application.
- Defining success criteria for the overall effort.

Use this category when the choice affects what the work is for, not how it
is performed.

## Framing

A choice about how the problem is formulated, bounded, or structured.

Examples:

- Deciding whether to model a three-dimensional problem as two-dimensional.
- Choosing the system boundary for a thermal analysis.
- Selecting which physical phenomena to include or exclude from the model.

Use this category when the choice determines the scope or formulation of the
technical problem before specific methods or parameters are selected.

## Assumption

A choice to accept a condition as true for the purpose of the analysis,
where that condition is not established by direct evidence or requirement.

Examples:

- Assuming steady-state conditions when transient behavior may be relevant.
- Assuming material isotropy when the actual material has directional properties.
- Assuming a uniform load distribution when the actual distribution is unknown.

Use this category when the choice involves adopting an unverified premise
that affects the results.

## Method

A choice about which computational, analytical, or experimental approach to use.

Examples:

- Choosing between a finite element analysis and a closed-form solution.
- Selecting a turbulence model for a fluid dynamics simulation.
- Deciding between a reduced-order model and a full-fidelity simulation.

Use this category when the choice determines the technical approach used to
produce results.

## Data

A choice about which data to use, how to process it, or whether to include
or exclude specific observations.

Examples:

- Selecting which material property dataset to use when multiple sources exist.
- Deciding to exclude outlier measurements from a calibration dataset.
- Choosing between experimental data and published reference values.

Use this category when the choice affects which information enters the analysis.

## Parameter

A choice about a specific numerical value, coefficient, or setting that
materially affects the results.

Examples:

- Selecting a safety factor value when the applicable standard permits a range.
- Choosing a mesh density for a numerical simulation.
- Setting a convergence tolerance for an iterative solver.

Use this category when the choice involves a specific value rather than a
method or assumption. Only use it when the parameter choice materially affects
outcomes; routine parameter settings that do not change conclusions should
not be flagged.

## Validation

A choice about how to verify results, what criteria to apply, or what
constitutes acceptable agreement.

Examples:

- Selecting acceptance criteria for a code verification study.
- Deciding what constitutes sufficient agreement between model predictions
  and experimental data.
- Choosing which benchmark problem to use for validation.

Use this category when the choice determines how the quality or correctness
of results is assessed.

## Interpretation

A choice about what the results mean, what conclusions they support, or
how ambiguous findings should be characterized.

Examples:

- Deciding whether observed discrepancies indicate a modeling error or
  acceptable variation.
- Interpreting a marginal safety factor as adequate or inadequate.
- Characterizing the significance of a sensitivity study result.

Use this category when the choice involves assigning meaning to computed
or observed results, particularly when the results are ambiguous or could
support multiple conclusions.
