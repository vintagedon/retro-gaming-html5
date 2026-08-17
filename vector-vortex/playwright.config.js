import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'python3 -m http.server 8085 --directory game',
    port: 8085,
    reuseExistingServer: !process.env.CI,
  },
});
