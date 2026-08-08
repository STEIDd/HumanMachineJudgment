/**
 * 5-node thermal resistance network solver.
 *
 * Node layout:
 *   Node 1: Processor interface (contact resistance via thermal grease)
 *   Node 2: Heat sink base center (conduction through half the base)
 *   Node 3: Fin root (conduction through other half of base)
 *   Node 4: Fin mid-height (conduction + convection from lower half)
 *   Node 5: Fin tip (conduction + convection from upper half)
 *
 * The solver uses the Churchill-Chu correlation for natural convection
 * on a vertical plate to compute convective heat transfer coefficients.
 */

import type { SolverConfig, ThermalResult } from './types';
import { interpolateProperty } from './materials';
import { computeBaseArea, computeExposedBaseArea, computeTotalFinArea } from './geometry';

// ---------------------------------------------------------------------------
// Physical constants
// ---------------------------------------------------------------------------

const GRAVITY = 9.81; // m/s^2

// ---------------------------------------------------------------------------
// Air property correlations (simplified)
// ---------------------------------------------------------------------------

interface AirProperties {
  k: number; // thermal conductivity, W/m-K
  nu: number; // kinematic viscosity, m^2/s
  Pr: number; // Prandtl number
  alpha: number; // thermal diffusivity, m^2/s
}

/**
 * Approximate air properties at the given film temperature.
 * Uses simplified correlations valid for 20-200 deg C range.
 */
export function getAirProperties(tempC: number): AirProperties {
  const T = tempC + 273.15;
  const k = 0.0241 + 7.6e-5 * (T - 273.15); // W/m-K
  const nu = 1.5e-5 * Math.pow(T / 293, 1.5); // m^2/s (Sutherland approx)
  const Pr = 0.71; // nearly constant for air
  const rho = 1.2 * (293 / T); // ideal gas approx, kg/m^3
  const cp = 1005; // J/kg-K, nearly constant
  const alpha = k / (rho * cp);

  return { k, nu, Pr, alpha };
}

// ---------------------------------------------------------------------------
// Natural convection correlation (Churchill-Chu)
// ---------------------------------------------------------------------------

/**
 * Churchill-Chu correlation for natural convection on a vertical plate.
 *
 * Nu = (0.825 + 0.387 * Ra^(1/6) / (1 + (0.492/Pr)^(9/16))^(8/27))^2
 *
 * @param surfaceTempC - Surface temperature, deg C
 * @param ambientTempC - Ambient air temperature, deg C
 * @param charLength - Characteristic length (fin height), m
 * @returns Convective heat transfer coefficient h, W/m^2-K
 */
export function computeNaturalConvectionH(
  surfaceTempC: number,
  ambientTempC: number,
  charLength: number,
): number {
  // Use film temperature for property evaluation
  const filmTempC = (surfaceTempC + ambientTempC) / 2;
  const air = getAirProperties(filmTempC);

  // Volume expansion coefficient (ideal gas)
  const beta = 1 / (filmTempC + 273.15); // 1/K

  const deltaT = Math.abs(surfaceTempC - ambientTempC);
  if (deltaT < 0.01) {
    // Avoid division issues with negligible temperature difference
    return 5.0; // return a small baseline h
  }

  // Rayleigh number
  const Ra = (GRAVITY * beta * deltaT * Math.pow(charLength, 3)) / (air.nu * air.alpha);

  // Churchill-Chu correlation
  const prTerm = Math.pow(0.492 / air.Pr, 9 / 16);
  const denominator = Math.pow(1 + prTerm, 8 / 27);
  const Nu = Math.pow(0.825 + (0.387 * Math.pow(Ra, 1 / 6)) / denominator, 2);

  return (Nu * air.k) / charLength;
}

// ---------------------------------------------------------------------------
// Fin efficiency
// ---------------------------------------------------------------------------

/**
 * Fin efficiency for a straight rectangular fin.
 *
 * eta = tanh(m * L) / (m * L)
 * where m = sqrt(2 * h / (k * t_fin))
 *
 * @param h - Convective coefficient, W/m^2-K
 * @param k - Fin thermal conductivity, W/m-K
 * @param finHeight - Fin height, m
 * @param finThickness - Fin thickness, m
 * @returns Fin efficiency (0 to 1)
 */
export function computeFinEfficiency(
  h: number,
  k: number,
  finHeight: number,
  finThickness: number,
): number {
  const m = Math.sqrt((2 * h) / (k * finThickness));
  const mL = m * finHeight;
  if (mL < 1e-6) return 1.0;
  return Math.tanh(mL) / mL;
}

// ---------------------------------------------------------------------------
// Thermal resistance computations
// ---------------------------------------------------------------------------

interface ThermalResistances {
  contact: number;
  baseHalf1: number;
  baseHalf2: number;
  finLower: number;
  finUpper: number;
  convFinLower: number;
  convFinUpper: number;
  convBase: number;
}

/**
 * Compute all thermal resistances in the 5-node network.
 */
function computeResistances(
  geometry: {
    baseWidth: number;
    baseLength: number;
    baseThickness: number;
    finHeight: number;
    finThickness: number;
    finCount: number;
    finSpacing: number;
  },
  k: number,
  h: number,
  finEff: number,
): ThermalResistances {
  const baseArea = computeBaseArea(geometry);
  const exposedBaseArea = computeExposedBaseArea(geometry);
  const totalFinArea = computeTotalFinArea(geometry);

  // Contact resistance (typical value for thermal grease interface)
  const contact = 0.5; // K/W

  // Conduction through base: R = thickness / (k * area)
  // Split into two halves for the 5-node model
  const halfBaseThickness = geometry.baseThickness / 2;
  const baseHalf1 = halfBaseThickness / (k * baseArea);
  const baseHalf2 = halfBaseThickness / (k * baseArea);

  // Conduction along fin: R = (height/2) / (k * crossSection * nFins)
  const finCrossSection = geometry.finThickness * geometry.baseLength;
  const totalFinCrossSection = finCrossSection * geometry.finCount;
  const halfFinHeight = geometry.finHeight / 2;
  const finLower = halfFinHeight / (k * totalFinCrossSection);
  const finUpper = halfFinHeight / (k * totalFinCrossSection);

  // Convection from fin surfaces (accounting for fin efficiency)
  const lowerFinArea = totalFinArea / 2;
  const convFinLower = 1 / (h * finEff * lowerFinArea);

  const upperFinArea = totalFinArea / 2;
  const convFinUpper = 1 / (h * finEff * upperFinArea);

  // Convection from exposed base area
  const convBase = exposedBaseArea > 0 ? 1 / (h * exposedBaseArea) : 1e6;

  return {
    contact,
    baseHalf1,
    baseHalf2,
    finLower,
    finUpper,
    convFinLower,
    convFinUpper,
    convBase,
  };
}

// ---------------------------------------------------------------------------
// 5-node network solver
// ---------------------------------------------------------------------------

/**
 * Solve the 5-node thermal resistance network.
 *
 * The network is solved iteratively: the convective coefficient h depends
 * on surface temperature, which depends on h. We iterate until the
 * junction temperature converges (all cases iterate, since h is
 * temperature-dependent even when material properties are not).
 *
 * The network topology:
 *   Power -> [R_contact] -> Node1 -> [R_base1] -> Node2 -> [R_base2] -> Node3
 *            Node3 -> [R_fin_lower] -> Node4 -> [R_fin_upper] -> Node5
 *            Node3 also loses heat via R_conv_base to ambient
 *            Node4 also loses heat via R_conv_fin_lower to ambient
 *            Node5 also loses heat via R_conv_fin_upper to ambient
 */
export function computeThermalNetwork(config: SolverConfig): ThermalResult {
  const { geometry, conditions, materialProperties } = config;
  const ambientC = conditions.ambientTempC;
  const power = conditions.powerW;

  // Determine initial thermal conductivity based on config
  let k: number = materialProperties.thermalConductivity.constantMean;

  // All cases iterate because h depends on surface temperature.
  // Temperature-dependent material properties add k updates per iteration.
  const maxIterations = 30;
  const convergenceTol = 0.1; // deg C

  // Initialize with a reasonable surface temperature estimate.
  // For natural convection, a rough first estimate: assume R_total ~ 1.2 K/W
  const initialTempRise = power * 1.2;
  const initialSurfaceEstimate = ambientC + initialTempRise * 0.6;

  let nodeTemps = [
    ambientC + initialTempRise,
    ambientC + initialTempRise * 0.9,
    ambientC + initialTempRise * 0.8,
    ambientC + initialTempRise * 0.5,
    ambientC + initialTempRise * 0.3,
  ];
  let overallResistance = 0;
  let finEff = 0;
  let prevJunctionTemp = 0;

  for (let iter = 0; iter < maxIterations; iter++) {
    // Estimate surface temperature for convection: use weighted average
    // of fin root and mid-height temperatures
    const t3est = nodeTemps[2] ?? initialSurfaceEstimate;
    const t4est = nodeTemps[3] ?? initialSurfaceEstimate;
    const surfaceTempEstimate = (t3est + t4est) / 2;

    // Compute convective coefficient using Churchill-Chu
    const h = computeNaturalConvectionH(surfaceTempEstimate, ambientC, geometry.finHeight);

    // Compute fin efficiency
    finEff = computeFinEfficiency(h, k, geometry.finHeight, geometry.finThickness);

    // Compute all resistances
    const R = computeResistances(geometry, k, h, finEff);

    // Effective resistance of the fin+convection path:
    // Upper fin path: R_fin_upper + R_conv_fin_upper (series)
    const upperFinPath = R.finUpper + R.convFinUpper;

    // At node 4: convection from lower fin area in parallel with
    // (upper fin conduction + upper fin convection)
    const node4toAmbient = (R.convFinLower * upperFinPath) / (R.convFinLower + upperFinPath);

    // Fin path from node 3: R_fin_lower + parallel(R_conv_fin_lower, upperFinPath)
    const finPath = R.finLower + node4toAmbient;

    // At node 3: fin path in parallel with base convection
    const node3toAmbient = (finPath * R.convBase) / (finPath + R.convBase);

    // Overall: contact + base conduction (both halves) + node3-to-ambient
    overallResistance = R.contact + R.baseHalf1 + R.baseHalf2 + node3toAmbient;

    // Compute junction temperature
    const junctionTemp = ambientC + power * overallResistance;

    // Compute node temperatures (approximate distribution)
    const t1 = junctionTemp; // Node 1: junction
    const t2 = junctionTemp - power * R.contact; // Node 2: after contact
    const t3 = t2 - power * (R.baseHalf1 + R.baseHalf2); // Node 3: fin root

    // Power splits between fin path and base convection at node 3
    const deltaT3 = t3 - ambientC;
    const pFin = deltaT3 > 0 ? deltaT3 / finPath : 0;
    const t4 = t3 - pFin * R.finLower; // Node 4: fin mid
    const deltaT4 = t4 - ambientC;
    const pUpper = deltaT4 > 0 ? deltaT4 / upperFinPath : 0;
    const t5 = t4 - pUpper * R.finUpper; // Node 5: fin tip

    nodeTemps = [t1, t2, t3, t4, t5];

    // Update thermal conductivity if using temperature-dependent properties
    if (config.useTemperatureDependentProps) {
      const avgMaterialTemp = (t2 + t3) / 2;
      k = interpolateProperty(
        materialProperties.thermalConductivity.temperatureDependent,
        avgMaterialTemp,
      );
    }

    // Check convergence
    if (Math.abs(junctionTemp - prevJunctionTemp) < convergenceTol && iter > 0) {
      break;
    }
    prevJunctionTemp = junctionTemp;
  }

  const junctionTemperature = nodeTemps[0] ?? ambientC;
  const margin = conditions.junctionLimitC - junctionTemperature;

  return {
    nodeTemperatures: nodeTemps,
    overallResistance,
    junctionTemperature,
    finEfficiency: finEff,
    margin,
    isAdequate: margin > 0,
  };
}
