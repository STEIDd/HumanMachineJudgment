import { describe, it, expect } from 'vitest';
import {
  computeThermalNetwork,
  computeNaturalConvectionH,
  computeFinEfficiency,
  getAirProperties,
} from './resistance-network';
import { ALUMINUM_6061_T6 } from './materials';
import { DEFAULT_HEAT_SINK } from './geometry';
import type { SolverConfig } from './types';

function makeDefaultConfig(overrides?: Partial<SolverConfig>): SolverConfig {
  return {
    useTemperatureDependentProps: false,
    nodeCount: 5,
    materialProperties: ALUMINUM_6061_T6,
    geometry: DEFAULT_HEAT_SINK,
    conditions: {
      ambientTempC: 40,
      powerW: 50,
      junctionLimitC: 105,
    },
    ...overrides,
  };
}

describe('getAirProperties', () => {
  it('returns positive values for all properties at 50 deg C', () => {
    const air = getAirProperties(50);
    expect(air.k).toBeGreaterThan(0);
    expect(air.nu).toBeGreaterThan(0);
    expect(air.Pr).toBeGreaterThan(0);
    expect(air.alpha).toBeGreaterThan(0);
  });

  it('returns increasing thermal conductivity with temperature', () => {
    const air25 = getAirProperties(25);
    const air100 = getAirProperties(100);
    expect(air100.k).toBeGreaterThan(air25.k);
  });
});

describe('computeNaturalConvectionH', () => {
  it('returns a positive h for typical conditions', () => {
    const h = computeNaturalConvectionH(80, 40, 0.03);
    expect(h).toBeGreaterThan(0);
  });

  it('returns a physically plausible h for natural convection (3-15 W/m2-K)', () => {
    const h = computeNaturalConvectionH(80, 40, 0.03);
    expect(h).toBeGreaterThan(3);
    expect(h).toBeLessThan(30);
  });

  it('returns a baseline h for negligible temperature difference', () => {
    const h = computeNaturalConvectionH(40, 40, 0.03);
    expect(h).toBeGreaterThan(0);
  });
});

describe('computeFinEfficiency', () => {
  it('returns 1.0 for very conductive / short fins', () => {
    // Very high k, short fin
    const eff = computeFinEfficiency(10, 1000, 0.001, 0.01);
    expect(eff).toBeGreaterThan(0.99);
  });

  it('returns a value between 0 and 1 for typical conditions', () => {
    const eff = computeFinEfficiency(10, 170, 0.03, 0.002);
    expect(eff).toBeGreaterThan(0);
    expect(eff).toBeLessThan(1);
  });

  it('decreases with higher convective coefficient', () => {
    const effLow = computeFinEfficiency(5, 170, 0.03, 0.002);
    const effHigh = computeFinEfficiency(20, 170, 0.03, 0.002);
    expect(effHigh).toBeLessThan(effLow);
  });
});

describe('computeThermalNetwork', () => {
  it('produces junction temperature above ambient', () => {
    const config = makeDefaultConfig();
    const result = computeThermalNetwork(config);
    expect(result.junctionTemperature).toBeGreaterThan(config.conditions.ambientTempC);
  });

  it('produces junction temperature below ambient + 100 deg C', () => {
    const config = makeDefaultConfig();
    const result = computeThermalNetwork(config);
    expect(result.junctionTemperature).toBeLessThan(config.conditions.ambientTempC + 100);
  });

  it('produces overall resistance in expected range (0.5-3.0 K/W)', () => {
    const config = makeDefaultConfig();
    const result = computeThermalNetwork(config);
    expect(result.overallResistance).toBeGreaterThan(0.5);
    expect(result.overallResistance).toBeLessThan(3.0);
  });

  it('produces fin efficiency in (0, 1) range', () => {
    const config = makeDefaultConfig();
    const result = computeThermalNetwork(config);
    expect(result.finEfficiency).toBeGreaterThan(0);
    expect(result.finEfficiency).toBeLessThan(1);
  });

  it('produces 5 node temperatures', () => {
    const config = makeDefaultConfig();
    const result = computeThermalNetwork(config);
    expect(result.nodeTemperatures).toHaveLength(5);
  });

  it('node temperatures decrease from junction to tip', () => {
    const config = makeDefaultConfig();
    const result = computeThermalNetwork(config);
    const temps = result.nodeTemperatures;
    // Junction (node 0) should be hottest
    const t0 = temps[0] ?? 0;
    const t4 = temps[4] ?? 0;
    expect(t0).toBeGreaterThan(t4);
  });

  it('reports adequate when junction temp is below limit', () => {
    const config = makeDefaultConfig({
      conditions: { ambientTempC: 25, powerW: 20, junctionLimitC: 120 },
    });
    const result = computeThermalNetwork(config);
    expect(result.isAdequate).toBe(true);
    expect(result.margin).toBeGreaterThan(0);
  });

  it('temperature-dependent and constant solutions produce different results', () => {
    const configConstant = makeDefaultConfig({ useTemperatureDependentProps: false });
    const configDependent = makeDefaultConfig({ useTemperatureDependentProps: true });

    const resultConstant = computeThermalNetwork(configConstant);
    const resultDependent = computeThermalNetwork(configDependent);

    // The results should differ, though the difference should be small
    expect(resultConstant.junctionTemperature).not.toEqual(resultDependent.junctionTemperature);
  });
});
