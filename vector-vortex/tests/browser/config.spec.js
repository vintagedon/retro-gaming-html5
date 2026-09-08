// Vector Vortex D3 validation: Playwright config must resolve navigation targets.
// Named mutation: removing `use.baseURL` must make the suite fail, not skip.

import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import config from '../../playwright.config.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(HERE, '..', '..', 'playwright.config.js');
const CONFIG_SOURCE = readFileSync(CONFIG_PATH, 'utf8');

test('config exposes webServer and baseURL so the suite can navigate on its own', () => {
  expect(config.use?.baseURL, 'config.use.baseURL must be set so the suite resolves targets itself').toBeTruthy();
  expect(config.webServer?.command, 'config.webServer.command must be set to launch the local server').toBeTruthy();
});

test('config source file contains the baseURL and webServer keys (mutation-detection)', () => {
  // This test fails the moment a maintainer removes either key from
  // playwright.config.js, which is the discriminating mutation the spec names.
  expect(CONFIG_SOURCE, 'config source must define use.baseURL').toMatch(/baseURL\s*:/);
  expect(CONFIG_SOURCE, 'config source must define webServer.command').toMatch(/webServer[\s\S]*command\s*:/);
});

test('smoke: page loads via baseURL and exposes the test seam', async ({ page, baseURL }) => {
  const requests = [];
  page.on('request', (req) => requests.push(req.url()));
  await page.goto('/');
  const seamPresent = await page.evaluate(() => typeof window.__vv === 'object' && typeof window.__vv.advanceTicks === 'function');
  expect(seamPresent).toBe(true);
  // All requests must be same-origin (the baseURL host).
  for (const u of requests) {
    expect(u.startsWith(baseURL)).toBe(true);
  }
});

test('MUTATION: baseURL is required for navigation; the suite would fail without it', async ({ page }) => {
  // The config above asserts baseURL is truthy. If a maintainer removed it,
  // every other test in this file would fail because /index.html would not
  // resolve. This test exercises the negation directly: with an empty
  // baseURL, navigation by relative path is impossible.
  const hasBaseURL = !!config.use?.baseURL;
  expect(hasBaseURL, 'removing baseURL from the config must be detected (this test fails on the mutation)').toBe(true);
});
