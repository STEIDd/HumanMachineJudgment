/**
 * High-level thermal solver interface.
 *
 * Provides convenience functions that wrap the resistance network solver
 * with preset configurations matching the three material property treatment
 * alternatives defined in the thermal model judgment points.
 */

import type { ComparisonResult, ThermalConditions, ThermalResult } from './types';
import { ALUMINUM_6061_T6 } from './materials';
import { DEFAULT_HEAT_SINK } from './geometry';
import { computeThermalNetwork } from './resistance-network';

/**
 * Default thermal conditions for the reference scenario.
 *
 * - 40 deg C maximum rated ambient
 * - 50 W processor power
 * - 105 deg C manufacturer junction limit
 */
export const DEFAULT_CONDITIONS: ThermalConditions = {
  ambientTempC: 40,
  powerW: 50,
  junctionLimitC: 105,
};

/**
 * Run a screening-level analysis using constant properties at 25 deg C.
 *
 * This corresponds to the simplest analysis approach (JP1 Alternative A
 * combined with JP2 Alternative A).
 */
export function solveScreeningLevel(
  conditions: ThermalConditions = DEFAULT_CONDITIONS,
): ThermalResult {
  // Create a copy of the material with constant 25 deg C conductivity
  const material = {
    ...ALUMINUM_6061_T6,
    thermalConductivity: {
      ...ALUMINUM_6061_T6.thermalConductivity,
      constantMean: ALUMINUM_6061_T6.thermalConductivity.constant25C,
    },
  };

  return computeThermalNetwork({
    useTemperatureDependentProps: false,
    nodeCount: 5,
    materialProperties: material,
    geometry: DEFAULT_HEAT_SINK,
    conditions,
  });
}

/**
 * Run a detailed ROTM analysis.
 *
 * @param conditions - Thermal boundary conditions
 * @param useTemperatureDependentProps - If true, uses iterative temperature-
 *   dependent property evaluation. If false, uses constant properties at
 *   the mean operating temperature.
 */
export function solveDetailedROTM(
  conditions: ThermalConditions = DEFAULT_CONDITIONS,
  useTemperatureDependentProps: boolean = false,
): ThermalResult {
  return computeThermalNetwork({
    useTemperatureDependentProps,
    nodeCount: 5,
    materialProperties: ALUMINUM_6061_T6,
    geometry: DEFAULT_HEAT_SINK,
    conditions,
  });
}

/**
 * Run the solver with constant properties at 25 deg C.
 */
function solveWithConstant25C(conditions: ThermalConditions): ThermalResult {
  const material = {
    ...ALUMINUM_6061_T6,
    thermalConductivity: {
      ...ALUMINUM_6061_T6.thermalConductivity,
      constantMean: ALUMINUM_6061_T6.thermalConductivity.constant25C,
    },
  };

  return computeThermalNetwork({
    useTemperatureDependentProps: false,
    nodeCount: 5,
    materialProperties: material,
    geometry: DEFAULT_HEAT_SINK,
    conditions,
  });
}

/**
 * Run the solver with constant properties at the mean operating temperature.
 */
function solveWithConstantMean(conditions: ThermalConditions): ThermalResult {
  return computeThermalNetwork({
    useTemperatureDependentProps: false,
    nodeCount: 5,
    materialProperties: ALUMINUM_6061_T6,
    geometry: DEFAULT_HEAT_SINK,
    conditions,
  });
}

/**
 * Run the solver with temperature-dependent properties (iterative).
 */
function solveWithTempDependent(conditions: ThermalConditions): ThermalResult {
  return computeThermalNetwork({
    useTemperatureDependentProps: true,
    nodeCount: 5,
    materialProperties: ALUMINUM_6061_T6,
    geometry: DEFAULT_HEAT_SINK,
    conditions,
  });
}

/**
 * Compare results from all three material property treatment options.
 *
 * Returns results from constant at 25 deg C, constant at mean temperature,
 * and temperature-dependent property solutions, along with the junction
 * temperature differences.
 */
export function compareConfigurations(
  conditions: ThermalConditions = DEFAULT_CONDITIONS,
): ComparisonResult {
  const constant25C = solveWithConstant25C(conditions);
  const constantMean = solveWithConstantMean(conditions);
  const temperatureDependent = solveWithTempDependent(conditions);

  return {
    constant25C,
    constantMean,
    temperatureDependent,
    junctionTempDifference25CvsMean:
      constant25C.junctionTemperature - constantMean.junctionTemperature,
    junctionTempDifference25CvsDependent:
      constant25C.junctionTemperature - temperatureDependent.junctionTemperature,
  };
}
