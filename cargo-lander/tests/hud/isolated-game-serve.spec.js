import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = resolve(HERE, '..', '..');
const PORT = 8932;
const BASE = `http://127.0.0.1:${PORT}`;

let server;
let requests = [];

test.beforeAll(async () => {
  server = spawn('node', ['tests/dev-server.mjs', '--root', 'game', '--port', String(PORT)], {
    cwd: PROJECT_DIR,
    stdio: 'ignore'
  });
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const ok = await fetch(`${BASE}/index.html`).then((r) => r.ok).catch(() => false);
    if (ok) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('isolated game server never became ready');
});

test.afterAll(async () => {
  if (server) server.kill('SIGTERM');
});

test('serving only the game tree loads the whole kit with rendered appearance', async ({ page }) => {
  requests = [];
  page.on('request', (req) => requests.push(new URL(req.url())));
  const failed = [];
  page.on('response', (res) => {
    if (!res.ok()) failed.push(`${res.status()} ${res.url()}`);
  });
  const problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(msg.text());
  });
  page.on('pageerror', (err) => problems.push(String(err)));

  await page.goto(`${BASE}/index.html`);
  await page.waitForSelector('.gc-meter');

  expect(failed).toEqual([]);
  expect(problems).toEqual([]);
  expect(requests.length).toBeGreaterThan(0);
  for (const url of requests) {
    expect(url.origin).toBe(BASE);
  }

  const cssPaths = requests.filter((u) => u.pathname.endsWith('.css')).map((u) => u.pathname);
  expect(cssPaths).toContain('/vendor/h5gameui/src/gc.css');
  expect(cssPaths).toContain('/vendor/h5gameui/src/tokens/primitives.css');
  expect(cssPaths).toContain('/vendor/h5gameui/src/tokens/semantic.css');
  expect(cssPaths).toContain('/vendor/h5gameui/src/tokens/components.css');
  expect(cssPaths).toContain('/vendor/h5gameui/src/core/base.css');
  expect(cssPaths).toContain('/vendor/h5gameui/src/core/components.css');
  expect(cssPaths).toContain('/vendor/h5gameui/src/themes/modern.css');
  expect(cssPaths).toContain('/vendor/h5gameui/src/themes/arcade.css');
  expect(cssPaths).toContain('/vendor/h5gameui/src/themes/scifi.css');
  expect(cssPaths).toContain('/vendor/h5gameui/src/themes/fantasy.css');

  const appearance = await page.evaluate(() => {
    const panel = document.getElementById('hud-left');
    const meter = document.querySelector('.gc-meter');
    const ps = getComputedStyle(panel);
    const ms = getComputedStyle(meter);
    return {
      panelBorder: ps.borderTopWidth,
      panelRadius: ps.borderTopLeftRadius,
      meterRadius: ms.borderTopLeftRadius,
      meterBackground: ms.backgroundColor,
      fillBackground: getComputedStyle(
        meter.querySelector('.gc-meter__fill')
      ).backgroundColor
    };
  });
  expect(appearance.panelBorder).toBe('1px');
  expect(parseFloat(appearance.panelRadius)).toBeGreaterThan(0);
  expect(parseFloat(appearance.meterRadius)).toBeGreaterThan(0);
  expect(appearance.meterBackground).not.toBe('rgba(0, 0, 0, 0)');
  expect(appearance.fillBackground).not.toBe('rgba(0, 0, 0, 0)');
});
