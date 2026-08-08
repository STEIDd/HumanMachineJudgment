import { describe, it, expect } from 'vitest';
import {
  solveScreeningLevel,
  solveDetailedROTM,
  compareConfigurations,
  DEFAULT_CONDITIONS,
} from './solver';

describe('solveScreeningLevel', () => {
  it('returns a valid thermal result', () => {
    const result = solveScreeningLevel();
    expect(result.junctionTemperature).toBeGreaterThan(DEFAULT_CONDITIONS.ambientTempC);
    expect(result.overallResistance).toBeGreaterThan(0);
    expect(result.nodeTemperatures).toHaveLength(5);
  });

  it('produces junction temperature in physically plausible range', () => {
    const result = solveScreeningLevel();
    // With 50W at 40 deg C ambient and natural convection (including 0.5 K/W
    // contact resistance), junction should be between 80 and 160 deg C
    expect(result.junctionTemperature).toBeGreaterThan(80);
    expect(result.junctionTemperature).toBeLessThan(160);
  });
});

describe('solveDetailedROTM', () => {
  it('returns a valid thermal result without temperature-dependent props', () => {
    const result = solveDetailedROTM(DEFAULT_CONDITIONS, false);
    expect(result.junctionTemperature).toBeGreaterThan(DEFAULT_CONDITIONS.ambientTempC);
    expect(result.overallResistance).toBeGreaterThan(0);
  });

  it('returns a valid thermal result with temperature-dependent props', () => {
    const result = solveDetailedROTM(DEFAULT_CONDITIONS, true);
    expect(result.junctionTemperature).toBeGreaterThan(DEFAULT_CONDITIONS.ambientTempC);
    expect(result.overallResistance).toBeGreaterThan(0);
  });

  it('screening and detailed results are consistent', () => {
    const screening = solveScreeningLevel();
    const detailed = solveDetailedROTM(DEFAULT_CONDITIONS, false);

    // Both should produce junction temperatures in the same ballpark
    // (within 10 deg C, since they use slightly different k values)
    const diff = Math.abs(screening.junctionTemperature - detailed.junctionTemperature);
    expect(diff).toBeLessThan(10);
  });

  it('temperature-dependent vs constant shows expected small difference', () => {
    const constant = solveDetailedROTM(DEFAULT_CONDITIONS, false);
    const tempDep = solveDetailedROTM(DEFAULT_CONDITIONS, true);

    // The difference should be small (< 5 deg C) since k varies only ~5%
    const diff = Math.abs(constant.junctionTemperature - tempDep.junctionTemperature);
    expect(diff).toBeLessThan(5);
  });
});

describe('compareConfigurations', () => {
  it('returns results for all three configurations', () => {
    const comparison = compareConfigurations();

    expect(comparison.constant25C).toBeDefined();
    expect(comparison.constantMean).toBeDefined();
    expect(comparison.temperatureDependent).toBeDefined();
  });

  it('computes junction temperature differences', () => {
    const comparison = compareConfigurations();

    // constant25C uses k=167, constantMean uses k=171
    // Lower k => higher thermal resistance => higher junction temp
    // So difference should be positive (25C predicts higher temp than mean)
    expect(comparison.junctionTempDifference25CvsMean).toBeGreaterThan(0);
  });

  it('all three junction temperatures are in plausible range', () => {
    const comparison = compareConfigurations();

    for (const result of [
      comparison.constant25C,
      comparison.constantMean,
      comparison.temperatureDependent,
    ]) {
      // With 50W at 40 deg C ambient and natural convection (including 0.5 K/W
      // contact resistance), junction temps fall in the 80-160 deg C range
      expect(result.junctionTemperature).toBeGreaterThan(80);
      expect(result.junctionTemperature).toBeLessThan(160);
    }
  });

  it('accepts custom conditions', () => {
    const customConditions = {
      ambientTempC: 25,
      powerW: 30,
      junctionLimitC: 105,
    };
    const comparison = compareConfigurations(customConditions);

    // With lower power and lower ambient, junction temps should be lower
    // than the default case (which is ~137 deg C for constant-25C)
    expect(comparison.constant25C.junctionTemperature).toBeLessThan(100);
  });
});
