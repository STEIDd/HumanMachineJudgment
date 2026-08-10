/**
 * Playwright global setup: seed the HMJ project with test judgment points.
 *
 * Runs before all E2E tests. Uses the Python SDK via a seed script
 * to create known judgment points in the local SQLite database.
 */

import { execSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.resolve(__dirname, '../../../backend');
const SEED_SCRIPT = path.resolve(__dirname, 'seed_e2e_data.py');

export default async function globalSetup() {
  // Ensure a project is initialized
  try {
    execSync('uv run hmj init --name e2e-test', {
      cwd: BACKEND_DIR,
      stdio: 'pipe',
    });
  } catch {
    // Already initialized — that's fine
  }

  // Seed test data (the Python script handles DB reset internally)
  execSync(`uv run python ${SEED_SCRIPT}`, {
    cwd: BACKEND_DIR,
    stdio: 'inherit',
    timeout: 30000,
  });
}
