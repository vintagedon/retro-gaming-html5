// Vector Vortex published-preview validation (Spec 03 gate 1 isolation
// rewrite). The preview marker resolves, the page loads from the published
// tree, and the load is same-origin and error-free. The spec invokes the
// idempotent publish itself so the browser suite is self-contained.
//
// Isolation contract (Spec 03 gate 1): the publish runs into an isolated
// temporary root inside the repository tree through VV_PUBLISH_ROOT. This
// spec never writes to /opt/agents/www/ and never requires the production
// preview directory to exist.

import { test, expect } from '@playwright/test';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, rmSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = join(HERE, '..', '..', '');
const PUBLISH = join(GAME_DIR, 'publish.sh');
const ISOLATION_BASE = join(GAME_DIR, 'test-results', 'preview-isolation');
const PREVIEW_PORT = 8125;
const PREVIEW_BASE = `http://127.0.0.1:${PREVIEW_PORT}`;

rmSync(ISOLATION_BASE, { recursive: true, force: true });
const PUBLISH_ROOT = join(ISOLATION_BASE, `run-${process.pid}`, 'retrogaming');
mkdirSync(PUBLISH_ROOT, { recursive: true });
const PREVIEW_DIR = join(PUBLISH_ROOT, 'vector-vortex');

test.use({ viewport: { width: 1280, height: 720 } });

test('published preview: marker present, page loads, only same-origin runtime files', async ({ page }) => {
  // Idempotent publish into the isolated root: the preview exists and
  // matches the current tree.
  execFileSync(PUBLISH, {
    env: { ...process.env, VV_PUBLISH_ROOT: PUBLISH_ROOT },
    stdio: 'pipe'
  });
  const marker = readFileSync(join(PREVIEW_DIR, 'vv-preview-marker.txt'), 'utf8').trim();

  // An orphaned preview server from an earlier run would serve a stale
  // tree on this port (npx leaves its http-server grandchild behind).
  // Clear the port, then spawn detached so the whole process group can be
  // terminated in the finally block.
  try {
    execFileSync('pkill', ['-f', 'http-server .*-p 8125'], { stdio: 'ignore' });
  } catch { /* no listener */ }
  await new Promise(r => setTimeout(r, 300));

  const server = spawn('npx', ['--no-install', 'http-server', PREVIEW_DIR, '-p', String(PREVIEW_PORT), '--silent'], {
    stdio: 'ignore',
    detached: true
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
    try {
      if (server.pid) process.kill(-server.pid, 'SIGTERM');
    } catch {
      server.kill('SIGTERM');
    }
  }
});
