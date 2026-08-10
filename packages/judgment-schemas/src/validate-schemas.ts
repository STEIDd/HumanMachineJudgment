/**
 * Validates that all JSON schema files in the schemas/ directory are
 * syntactically valid JSON and contain the required $schema, $id, title,
 * and description fields.
 *
 * This script is run as part of the CI pipeline to catch schema errors
 * before they reach consumers.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SCHEMAS_DIR = resolve(import.meta.dirname, '../../../schemas');
const REQUIRED_FIELDS = ['$schema', '$id', 'title', 'description', 'type'] as const;

interface SchemaValidationError {
  file: string;
  errors: string[];
}

function validateSchemaFile(filePath: string, fileName: string): string[] {
  const errors: string[] = [];

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    errors.push(`Could not read file: ${filePath}`);
    return errors;
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch (e) {
    errors.push(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
    return errors;
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in parsed)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if ('$schema' in parsed && parsed['$schema'] !== 'https://json-schema.org/draft/2020-12/schema') {
    errors.push(
      `Expected $schema to be "https://json-schema.org/draft/2020-12/schema", ` +
        `got "${String(parsed['$schema'])}"`,
    );
  }

  if ('$id' in parsed && typeof parsed['$id'] === 'string') {
    const expectedSuffix = fileName;
    if (!parsed['$id'].endsWith(expectedSuffix)) {
      errors.push(`$id "${parsed['$id']}" does not end with the filename "${expectedSuffix}"`);
    }
  }

  return errors;
}

function main(): void {
  let files: string[];
  try {
    files = readdirSync(SCHEMAS_DIR).filter((f) => f.endsWith('.schema.json'));
  } catch {
    console.error(`Could not read schemas directory: ${SCHEMAS_DIR}`);
    process.exit(2);
  }

  if (files.length === 0) {
    console.error('No schema files found in schemas/ directory.');
    process.exit(2);
  }

  const validationErrors: SchemaValidationError[] = [];

  for (const file of files) {
    const filePath = join(SCHEMAS_DIR, file);
    const errors = validateSchemaFile(filePath, file);
    if (errors.length > 0) {
      validationErrors.push({ file, errors });
    }
  }

  if (validationErrors.length > 0) {
    console.error('Schema validation failed:\n');
    for (const { file, errors } of validationErrors) {
      console.error(`  ${file}:`);
      for (const error of errors) {
        console.error(`    - ${error}`);
      }
    }
    process.exit(1);
  }

  console.log(`Validated ${files.length} schema files successfully.`);
}

main();
