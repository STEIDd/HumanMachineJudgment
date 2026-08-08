import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'cd ../../backend && uv run python -m reference_server',
      url: 'http://localhost:8000/health',
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm run dev',
      url: 'http://localhost:5173',
      timeout: 30000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
