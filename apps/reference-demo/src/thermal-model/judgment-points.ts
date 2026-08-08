/**
 * Judgment point definitions for the thermal model workflow.
 *
 * Defines the four judgment points from docs/example-workflow.md:
 *   JP1: Intended Use and Fidelity Level (framing)
 *   JP2: Constant vs. Temperature-Dependent Material Properties (assumption)
 *   JP3: 5-Node ROTM vs. Higher-Fidelity Method (method)
 *   JP4: Validation and Acceptance Criterion (validation)
 *
 * Dependency chain: JP1 -> JP2 -> JP3 -> JP4
 */

import type { CreateCandidateRequest } from '../api/types';

// ---------------------------------------------------------------------------
// Judgment Point IDs (stable identifiers for cross-referencing)
// ---------------------------------------------------------------------------

export const JP_FIDELITY_ID = 'jp-fidelity';
export const JP_MATERIAL_PROPS_ID = 'jp-material-props';
export const JP_MODELING_METHOD_ID = 'jp-modeling-method';
export const JP_VALIDATION_ID = 'jp-validation';

// ---------------------------------------------------------------------------
// Dependency chain
// ---------------------------------------------------------------------------

export const THERMAL_MODEL_DEPENDENCIES: Array<{ from: string; to: string }> = [
  { from: JP_FIDELITY_ID, to: JP_MATERIAL_PROPS_ID },
  { from: JP_MATERIAL_PROPS_ID, to: JP_MODELING_METHOD_ID },
  { from: JP_MODELING_METHOD_ID, to: JP_VALIDATION_ID },
];

// ---------------------------------------------------------------------------
// JP1: Intended Use and Fidelity Level
// ---------------------------------------------------------------------------

function createJP1(projectId: string): CreateCandidateRequest {
  return {
    projectId,
    category: 'framing',
    question:
      'What is the intended use of this thermal analysis, and what fidelity level is appropriate?',
    context:
      'The engineer needs to determine whether the heat sink keeps the processor within its thermal limits. The answer to this framing question determines whether a quick screening calculation is sufficient or whether a more detailed analysis is needed. The intended use affects every subsequent modeling decision.',
    trigger: {
      source: 'agent',
      description:
        'The agent is framing the problem as a "quick thermal check to confirm the heat sink is adequate," implicitly defining the analysis objective and fidelity level.',
      hardTrigger: 'objective-redefinition',
    },
    materiality: {
      score: 12,
      dimensions: {
        methodologicalDiscretion: 3,
        downstreamInfluence: 3,
        uncertainty: 1,
        consequence: 2,
        reversibility: 2,
        accountabilityRequirement: 1,
      },
      hardTrigger: 'objective-redefinition',
      interventionLevel: 'pause',
    },
    alternatives: [
      {
        id: 'jp1-alt-a',
        label: 'Screening-level estimate',
        description:
          'Use a simple thermal resistance network with published correlations for convective heat transfer. The goal is a rapid estimate (within an hour) that identifies whether the design is clearly adequate, clearly inadequate, or marginal.',
        tradeoffs:
          'Fast, simple, low computational cost. May not capture local temperature variations. Acceptable for preliminary assessment.',
        source: 'agent',
      },
      {
        id: 'jp1-alt-b',
        label: 'Detailed reduced-order model',
        description:
          'Build a multi-node reduced-order model that captures spatial temperature variation within the heat sink, including fin efficiency effects and local convective coefficients. The goal is a design-level analysis suitable for documentation.',
        tradeoffs:
          'More accurate spatial resolution. Takes several hours. Requires more material property data. Appropriate for design verification.',
        source: 'agent',
      },
      {
        id: 'jp1-alt-c',
        label: 'Full three-dimensional finite element analysis',
        description:
          'Model the complete heat sink geometry in a 3D FEA tool with conjugate heat transfer.',
        tradeoffs:
          'Highest accuracy. Requires significant computation time (hours to days) and specialized software. Appropriate for final design validation or regulatory submission.',
        source: 'agent',
      },
    ],
    authority: { mode: 'human' },
    validityConditions: [
      'The heat sink geometry remains a straight-fin design without significant modifications.',
      'The thermal power does not exceed 60 W.',
    ],
  };
}

// ---------------------------------------------------------------------------
// JP2: Constant vs. Temperature-Dependent Material Properties
// ---------------------------------------------------------------------------

function createJP2(projectId: string): CreateCandidateRequest {
  return {
    projectId,
    category: 'assumption',
    question:
      'Should material properties (thermal conductivity and specific heat) be treated as constant or as temperature-dependent?',
    context:
      'The operating temperature range for this analysis spans approximately 25 deg C (ambient) to an estimated 95 deg C (near the heat source). Over this range, the thermal conductivity of 6061-T6 aluminum increases from approximately 167 W/m-K at 25 deg C to approximately 175 W/m-K at 100 deg C. The variation is modest (approximately 5%).',
    trigger: {
      source: 'agent',
      description:
        'The agent retrieves the thermal conductivity of 6061-T6 aluminum and prepares to assign a single constant value (167 W/m-K at 25 deg C) for all calculations.',
    },
    materiality: {
      score: 8,
      dimensions: {
        methodologicalDiscretion: 2,
        downstreamInfluence: 1,
        uncertainty: 1,
        consequence: 2,
        reversibility: 1,
        accountabilityRequirement: 1,
      },
      interventionLevel: 'disclose',
    },
    alternatives: [
      {
        id: 'jp2-alt-a',
        label: 'Constant properties at 25 deg C',
        description:
          'Use thermal conductivity of 167 W/m-K and specific heat of 896 J/kg-K, evaluated at room temperature.',
        tradeoffs:
          'Simpler model. Introduces a systematic bias of approximately 3-5% in local temperatures near the heat source. May be acceptable given the overall uncertainty.',
        source: 'agent',
      },
      {
        id: 'jp2-alt-b',
        label: 'Constant properties at mean operating temperature',
        description:
          'Use thermal conductivity of 171 W/m-K evaluated at 60 deg C (estimated mean temperature).',
        tradeoffs:
          'Reduces systematic bias at the extremes compared to room-temperature properties. Still does not capture spatial variation. Simple to implement.',
        source: 'agent',
      },
      {
        id: 'jp2-alt-c',
        label: 'Temperature-dependent properties',
        description:
          'Use a lookup table or polynomial fit for thermal conductivity and specific heat as functions of temperature, based on published data from 25 deg C to 150 deg C.',
        tradeoffs:
          'More accurate. Adds complexity to the ROTM solver (requires iterative solution). Computation time increases moderately.',
        source: 'agent',
      },
    ],
    authority: { mode: 'human' },
    validityConditions: [
      'Operating temperature range does not exceed 25 deg C to 150 deg C.',
      'Material remains 6061-T6 aluminum.',
    ],
  };
}

// ---------------------------------------------------------------------------
// JP3: 5-Node ROTM vs. Higher-Fidelity Method
// ---------------------------------------------------------------------------

function createJP3(projectId: string): CreateCandidateRequest {
  return {
    projectId,
    category: 'method',
    question:
      'Is a 5-node thermal resistance network an appropriate modeling approach for this heat sink, or should a higher-fidelity method be used?',
    context:
      'The heat sink has a simple straight-fin geometry with 12 fins. The 5-node ROTM uses analytical expressions for conduction resistance through the base and fins, a fin efficiency correlation, and a convective resistance correlation for the fin surfaces and base plate exposed area.',
    trigger: {
      source: 'agent',
      description:
        'The agent proposes to model the heat sink using a thermal resistance network with five nodes: processor interface, heat sink base, fin root, fin mid-height, and fin tip.',
      hardTrigger: 'model-substitution',
    },
    materiality: {
      score: 11,
      dimensions: {
        methodologicalDiscretion: 2,
        downstreamInfluence: 2,
        uncertainty: 2,
        consequence: 2,
        reversibility: 2,
        accountabilityRequirement: 1,
      },
      hardTrigger: 'model-substitution',
      interventionLevel: 'pause',
    },
    alternatives: [
      {
        id: 'jp3-alt-a',
        label: '5-node thermal resistance network (ROTM)',
        description:
          'Model the heat sink as a network of thermal resistances connecting the heat source to the ambient air.',
        tradeoffs:
          'Fast computation (under 1 second). Captures overall thermal resistance and average temperatures. Does not capture temperature gradients within the base or local hot spots. Validated against published correlations for similar geometries.',
        source: 'agent',
      },
      {
        id: 'jp3-alt-b',
        label: '20-node extended ROTM',
        description:
          'A finer discretization of the resistance network with 20 nodes, including multiple nodes across the base thickness and along the fin height.',
        tradeoffs:
          'Better spatial resolution than the 5-node model. Still fast (under 5 seconds). Captures base spreading effects. Does not capture 3D effects at fin tips.',
        source: 'agent',
      },
      {
        id: 'jp3-alt-c',
        label: '2D finite element model',
        description: 'A two-dimensional cross-section model solved with FEA.',
        tradeoffs:
          'Higher accuracy for spatial temperature distribution. Computation time approximately 10 minutes. Requires meshing and solver setup. Captures base spreading and fin conduction gradients.',
        source: 'agent',
      },
    ],
    authority: { mode: 'human' },
    validityConditions: [
      'Heat sink geometry is a straight-fin design with aspect ratio between 2:1 and 5:1.',
      'Cooling mode remains natural convection.',
    ],
  };
}

// ---------------------------------------------------------------------------
// JP4: Validation and Acceptance Criterion
// ---------------------------------------------------------------------------

function createJP4(projectId: string): CreateCandidateRequest {
  return {
    projectId,
    category: 'validation',
    question:
      'What acceptance criterion should be used to determine whether the heat sink design is adequate?',
    context:
      'The processor manufacturer specifies a maximum junction temperature of 105 deg C. The analysis computes the junction temperature as the sum of the ambient temperature and the computed temperature rise. The ambient temperature for this application is 40 deg C (maximum rated ambient). The acceptance criterion must account for modeling uncertainty and safety margin.',
    trigger: {
      source: 'agent',
      description:
        'The agent proposes to accept the analysis results if "the computed junction temperature is below 105 deg C."',
      hardTrigger: 'validation-criterion-selection',
    },
    materiality: {
      score: 12,
      dimensions: {
        methodologicalDiscretion: 2,
        downstreamInfluence: 2,
        uncertainty: 2,
        consequence: 2,
        reversibility: 2,
        accountabilityRequirement: 2,
      },
      hardTrigger: 'validation-criterion-selection',
      interventionLevel: 'pause',
    },
    alternatives: [
      {
        id: 'jp4-alt-a',
        label: 'Junction temperature below 105 deg C',
        description:
          'Accept if the computed junction temperature (ambient plus temperature rise) is below the rated maximum.',
        tradeoffs:
          'No safety margin. If the model under-predicts temperature by any amount, the actual junction temperature could exceed the limit. Simple and directly tied to the manufacturer specification.',
        source: 'agent',
      },
      {
        id: 'jp4-alt-b',
        label: 'Junction temperature below 95 deg C (10-degree margin)',
        description:
          'Accept if the computed junction temperature is below 95 deg C, providing a 10-degree margin below the rated maximum.',
        tradeoffs:
          'Provides margin for modeling uncertainty, manufacturing variation, and environmental variation. May reject designs that are actually adequate.',
        source: 'user',
      },
      {
        id: 'jp4-alt-c',
        label: 'Junction temperature below 100 deg C, with uncertainty analysis',
        description:
          'Accept if the computed junction temperature is below 100 deg C and a sensitivity analysis shows that the result is not sensitive to input variations within their expected ranges.',
        tradeoffs:
          'Balances margin and confidence. Requires additional computation for sensitivity analysis. Provides a more rigorous basis for the acceptance decision.',
        source: 'agent',
      },
    ],
    authority: { mode: 'human' },
    validityConditions: [
      'Processor maximum junction temperature rating is 105 deg C.',
      'Maximum rated ambient temperature is 40 deg C.',
    ],
  };
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

/**
 * Create all four judgment point request objects for the thermal model workflow.
 *
 * @param projectId - Project ID to associate with the judgment points
 * @returns Array of CreateCandidateRequest objects in dependency order
 */
export function createThermalModelJudgmentPoints(projectId: string): CreateCandidateRequest[] {
  return [createJP1(projectId), createJP2(projectId), createJP3(projectId), createJP4(projectId)];
}

/**
 * Short labels for each judgment point, for display in the dependency graph.
 */
export const JP_LABELS: Record<string, string> = {
  [JP_FIDELITY_ID]: 'Fidelity Level',
  [JP_MATERIAL_PROPS_ID]: 'Material Props',
  [JP_MODELING_METHOD_ID]: 'Model Method',
  [JP_VALIDATION_ID]: 'Acceptance',
};
