import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.js',
  timeout: 30000,
  // The suite is serial by design: several validations depend on a visible
  // tab (the clock suppresses hidden time), and parallel pages would make
  // only one page visible at a time.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    headless: true,
    baseURL: 'http://127.0.0.1:8931'
  },
  webServer: {
    command: 'node tests/dev-server.mjs --root . --port 8931',
    url: 'http://127.0.0.1:8931/game/index.html',
    reuseExistingServer: false,
    timeout: 15000
  }
});
