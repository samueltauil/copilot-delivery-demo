import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:43179', browserName: 'chromium' },
  webServer: {
    command: 'node scripts/julia.js start',
    url: 'http://127.0.0.1:43179',
    env: { PORT: '43179' },
    reuseExistingServer: false,
    timeout: 120000
  }
});
