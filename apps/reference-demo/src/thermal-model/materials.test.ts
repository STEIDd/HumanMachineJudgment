import { describe, it, expect } from 'vitest';
import { interpolateProperty, ALUMINUM_6061_T6 } from './materials';

describe('interpolateProperty', () => {
  const table = ALUMINUM_6061_T6.thermalConductivity.temperatureDependent;

  it('returns exact value at a data point (25 deg C)', () => {
    expect(interpolateProperty(table, 25)).toBe(167);
  });

  it('returns exact value at a data point (100 deg C)', () => {
    expect(interpolateProperty(table, 100)).toBe(172);
  });

  it('returns exact value at a data point (200 deg C)', () => {
    expect(interpolateProperty(table, 200)).toBe(177);
  });

  it('interpolates between two data points', () => {
    // Between 25 deg C (167) and 50 deg C (168), at 37.5 deg C
    // Expected: 167 + 0.5 * (168 - 167) = 167.5
    const result = interpolateProperty(table, 37.5);
    expect(result).toBeCloseTo(167.5, 5);
  });

  it('interpolates between 50 and 100 deg C', () => {
    // Between 50 (168) and 100 (172), at 75 deg C
    // Expected: 168 + 0.5 * (172 - 168) = 170
    const result = interpolateProperty(table, 75);
    expect(result).toBeCloseTo(170, 5);
  });

  it('interpolates at an arbitrary point between 100 and 150 deg C', () => {
    // Between 100 (172) and 150 (175), at 120 deg C
    // Expected: 172 + (20/50) * (175 - 172) = 172 + 0.4 * 3 = 173.2
    const result = interpolateProperty(table, 120);
    expect(result).toBeCloseTo(173.2, 5);
  });

  it('clamps below minimum temperature to first value', () => {
    const result = interpolateProperty(table, 0);
    expect(result).toBe(167);
  });

  it('clamps below minimum (negative temperature)', () => {
    const result = interpolateProperty(table, -50);
    expect(result).toBe(167);
  });

  it('clamps above maximum temperature to last value', () => {
    const result = interpolateProperty(table, 300);
    expect(result).toBe(177);
  });

  it('clamps above maximum (very high temperature)', () => {
    const result = interpolateProperty(table, 1000);
    expect(result).toBe(177);
  });

  it('returns 0 for empty table', () => {
    expect(interpolateProperty([], 50)).toBe(0);
  });

  it('returns the single value for a one-element table', () => {
    const singleTable = [{ tempC: 50, kWmK: 170 }];
    // At 50, should return 170
    expect(interpolateProperty(singleTable, 50)).toBe(170);
    // Below 50, clamp to 170
    expect(interpolateProperty(singleTable, 25)).toBe(170);
    // Above 50, clamp to 170
    expect(interpolateProperty(singleTable, 100)).toBe(170);
  });
});

describe('ALUMINUM_6061_T6', () => {
  it('has expected constant values', () => {
    expect(ALUMINUM_6061_T6.thermalConductivity.constant25C).toBe(167);
    expect(ALUMINUM_6061_T6.thermalConductivity.constantMean).toBe(171);
    expect(ALUMINUM_6061_T6.specificHeat.constant25C).toBe(896);
    expect(ALUMINUM_6061_T6.specificHeat.constantMean).toBe(903);
    expect(ALUMINUM_6061_T6.density).toBe(2700);
  });

  it('has temperature-dependent data sorted by temperature', () => {
    const data = ALUMINUM_6061_T6.thermalConductivity.temperatureDependent;
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      if (prev && curr) {
        expect(curr.tempC).toBeGreaterThan(prev.tempC);
      }
    }
  });

  it('has 5 data points in temperature-dependent table', () => {
    expect(ALUMINUM_6061_T6.thermalConductivity.temperatureDependent).toHaveLength(5);
  });
});
