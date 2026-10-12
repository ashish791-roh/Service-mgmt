import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1, // Run E2E tests sequentially to prevent database/session conflicts
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx next dev --port 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
