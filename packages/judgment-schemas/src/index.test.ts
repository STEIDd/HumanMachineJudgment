import { describe, it, expect } from 'vitest';
import { VERSION } from './index.js';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

describe('judgment-schemas', () => {
  it('exports a version string', () => {
    expect(VERSION).toBe('0.1.0');
  });

  describe('schema files', () => {
    const schemasDir = resolve(import.meta.dirname, '../../../schemas');
    const schemaFiles = readdirSync(schemasDir).filter((f) => f.endsWith('.schema.json'));

    it('contains at least 5 schema files', () => {
      expect(schemaFiles.length).toBeGreaterThanOrEqual(5);
    });

    for (const file of schemaFiles) {
      it(`${file} is valid JSON`, () => {
        const content = readFileSync(join(schemasDir, file), 'utf-8');
        expect(() => JSON.parse(content)).not.toThrow();
      });

      it(`${file} uses JSON Schema Draft 2020-12`, () => {
        const content = readFileSync(join(schemasDir, file), 'utf-8');
        const schema = JSON.parse(content) as Record<string, unknown>;
        expect(schema['$schema']).toBe('https://json-schema.org/draft/2020-12/schema');
      });

      it(`${file} has required metadata fields`, () => {
        const content = readFileSync(join(schemasDir, file), 'utf-8');
        const schema = JSON.parse(content) as Record<string, unknown>;
        expect(schema).toHaveProperty('$id');
        expect(schema).toHaveProperty('title');
        expect(schema).toHaveProperty('description');
        expect(schema).toHaveProperty('type');
      });
    }
  });
});
