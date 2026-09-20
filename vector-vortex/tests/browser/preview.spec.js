// Vector Vortex Spec 02 deliverable 4 validation: the published preview.
// The preview marker resolves, the page loads from the published tree, and
// the load is same-origin and error-free. The spec invokes the idempotent
// publish itself so the browser suite is self-contained.

import { test, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = join(HERE, '..', '..', '');
const PUBLISH = join(GAME_DIR, 'publish.sh');
const PREVIEW_DIR = '/opt/agents/www/retrogaming/vector-vortex';
const PREVIEW_PORT = 8125;
const PREVIEW_BASE = `http://127.0.0.1:${PREVIEW_PORT}`;

test.use({ viewport: { width: 1280, height: 720 } });

test('published preview: marker present, page loads, only same-origin runtime files', async ({ page }) => {
  // Idempotent publish: the preview exists and matches the current tree.
  execFileSync(PUBLISH, { stdio: 'pipe' });
  const marker = readFileSync(join(PREVIEW_DIR, 'vv-preview-marker.txt'), 'utf8').trim();

  const server = spawn('npx', ['--no-install', 'http-server', PREVIEW_DIR, '-p', String(PREVIEW_PORT), '--silent'], {
    stdio: 'ignore'
  });
  try {
    // Wait for the preview server.
    await expect.poll(async () => {
      try { return (await fetch(PREVIEW_BASE)).ok; } catch { return false; }
    }, { timeoutMs: 15000 }).toBe(true);

    const failures = [];
    page.on('requestfailed', req => failures.push(req.url()));
    const responses = [];
    page.on('response', res => responses.push(res));
    await page.goto(PREVIEW_BASE + '/');
    await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');

    // The published marker matches the served tree.
    const servedMarker = await page.evaluate(async () => {
      const text = await (await fetch('/vv-preview-marker.txt')).text();
      return text.trim();
    });
    expect(servedMarker).toBe(marker);

    // The page loads its runtime from the preview origin only.
    expect(failures).toEqual([]);
    const origins = [...new Set(responses.map(r => new URL(r.url()).origin))];
    expect(origins).toEqual([PREVIEW_BASE]);
    for (const res of responses) {
      expect(res.status(), res.url()).toBeLessThan(400);
    }

    // The published shell is live, not a static husk.
    await page.locator('#vv-start').click();
    await page.waitForFunction(() => window.__vv.getShellState() === 'running');
  } finally {
    server.kill('SIGTERM');
  }
});
