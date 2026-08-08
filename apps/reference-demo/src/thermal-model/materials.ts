/**
 * Material property data for 6061-T6 Aluminum.
 *
 * All values are from published ASM data. Temperature-dependent thermal
 * conductivity data spans 25-200 deg C with data points at 25-degree
 * intervals for the lower range and 50-degree intervals above 100 deg C.
 */

import type { MaterialProperties } from './types';

export const ALUMINUM_6061_T6: MaterialProperties = {
  name: '6061-T6 Aluminum',
  thermalConductivity: {
    constant25C: 167, // W/m-K at 25 deg C
    constantMean: 171, // W/m-K at ~60 deg C (mean operating temp)
    temperatureDependent: [
      { tempC: 25, kWmK: 167 },
      { tempC: 50, kWmK: 168 },
      { tempC: 100, kWmK: 172 },
      { tempC: 150, kWmK: 175 },
      { tempC: 200, kWmK: 177 },
    ],
  },
  specificHeat: {
    constant25C: 896, // J/kg-K
    constantMean: 903, // J/kg-K at ~60 deg C
  },
  density: 2700, // kg/m^3
};

/**
 * Linearly interpolate a thermal conductivity value from tabulated data.
 *
 * If the temperature is below the minimum data point, returns the value at
 * the minimum. If above the maximum, returns the value at the maximum.
 *
 * @param table - Array of {tempC, kWmK} data points, assumed sorted by tempC
 * @param tempC - Temperature in degrees Celsius at which to interpolate
 * @returns Interpolated thermal conductivity in W/m-K
 */
export function interpolateProperty(
  table: Array<{ tempC: number; kWmK: number }>,
  tempC: number,
): number {
  if (table.length === 0) {
    return 0;
  }

  const first = table[0];
  const last = table[table.length - 1];

  // Guard: should never be undefined given length check, but satisfy strict TS
  if (!first || !last) {
    return 0;
  }

  // Clamp below minimum
  if (tempC <= first.tempC) {
    return first.kWmK;
  }

  // Clamp above maximum
  if (tempC >= last.tempC) {
    return last.kWmK;
  }

  // Find the bracketing interval
  for (let i = 0; i < table.length - 1; i++) {
    const lower = table[i];
    const upper = table[i + 1];
    if (!lower || !upper) continue;

    if (tempC >= lower.tempC && tempC <= upper.tempC) {
      const fraction = (tempC - lower.tempC) / (upper.tempC - lower.tempC);
      return lower.kWmK + fraction * (upper.kWmK - lower.kWmK);
    }
  }

  // Fallback (should not reach here for well-formed data)
  return last.kWmK;
}
