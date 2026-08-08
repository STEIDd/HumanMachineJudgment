/**
 * Type definitions for the reduced-order thermal model (ROTM).
 *
 * These types describe material properties, heat sink geometry, thermal
 * boundary conditions, solver configuration, and result structures used
 * throughout the thermal analysis workflow.
 */

export interface MaterialProperties {
  name: string;
  thermalConductivity: {
    constant25C: number; // W/m-K at 25 deg C
    constantMean: number; // W/m-K at mean operating temp (~60 deg C)
    temperatureDependent: Array<{ tempC: number; kWmK: number }>;
  };
  specificHeat: {
    constant25C: number; // J/kg-K
    constantMean: number; // J/kg-K at mean operating temp
  };
  density: number; // kg/m^3
}

export interface HeatSinkGeometry {
  baseWidth: number; // m
  baseLength: number; // m
  baseThickness: number; // m
  finHeight: number; // m
  finThickness: number; // m
  finCount: number;
  finSpacing: number; // m (computed from count and width)
}

export interface ThermalConditions {
  ambientTempC: number;
  powerW: number;
  junctionLimitC: number;
}

export interface ThermalResult {
  nodeTemperatures: number[];
  overallResistance: number; // K/W
  junctionTemperature: number; // deg C
  finEfficiency: number;
  margin: number; // deg C below limit
  isAdequate: boolean;
}

export interface SolverConfig {
  useTemperatureDependentProps: boolean;
  nodeCount: 5 | 20;
  materialProperties: MaterialProperties;
  geometry: HeatSinkGeometry;
  conditions: ThermalConditions;
}

export interface ComparisonResult {
  constant25C: ThermalResult;
  constantMean: ThermalResult;
  temperatureDependent: ThermalResult;
  junctionTempDifference25CvsMean: number;
  junctionTempDifference25CvsDependent: number;
}
