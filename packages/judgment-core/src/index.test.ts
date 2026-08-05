import { describe, it, expect } from 'vitest';
import { VERSION } from './index.js';

describe('judgment-core', () => {
  it('exports a version string', () => {
    expect(VERSION).toBe('0.1.0');
  });

  it('version follows semver format', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
