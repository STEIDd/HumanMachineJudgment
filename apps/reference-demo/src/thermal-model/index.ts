/**
 * Barrel export for the thermal model module.
 */

// Types
export type {
  MaterialProperties,
  HeatSinkGeometry,
  ThermalConditions,
  ThermalResult,
  SolverConfig,
  ComparisonResult,
} from './types';

// Materials
export { ALUMINUM_6061_T6, interpolateProperty } from './materials';

// Geometry
export {
  DEFAULT_HEAT_SINK,
  computeFinSpacing,
  computeBaseArea,
  computeFinArea,
  computeTotalFinArea,
  computeExposedBaseArea,
} from './geometry';

// Resistance network
export {
  computeThermalNetwork,
  computeNaturalConvectionH,
  computeFinEfficiency,
  getAirProperties,
} from './resistance-network';

// Solver
export {
  DEFAULT_CONDITIONS,
  solveScreeningLevel,
  solveDetailedROTM,
  compareConfigurations,
} from './solver';

// Judgment points
export {
  JP_FIDELITY_ID,
  JP_MATERIAL_PROPS_ID,
  JP_MODELING_METHOD_ID,
  JP_VALIDATION_ID,
  JP_LABELS,
  THERMAL_MODEL_DEPENDENCIES,
  createThermalModelJudgmentPoints,
} from './judgment-points';
