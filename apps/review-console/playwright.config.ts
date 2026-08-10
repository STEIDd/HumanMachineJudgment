import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: './e2e/seed-data.ts',
  use: {
    baseURL: 'http://127.0.0.1:8457',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'cd ../../backend && uv run hmj serve',
    url: 'http://127.0.0.1:8457',
    timeout: 30000,
    reuseExistingServer: false,
  },
});
