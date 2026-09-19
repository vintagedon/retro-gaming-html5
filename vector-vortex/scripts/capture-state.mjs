#!/usr/bin/env node
// Vector Vortex evidence capture tool (Spec 02).
// Boots the game's static server, opens the named state in Chromium
// headless, and writes a labeled PNG under docs/evidence/.
//
// Usage: node scripts/capture-state.mjs <state> [viewport]
//   states: title | running | paused | settings-audio | settings-display |
//           settings-controls | ended-survived | ended-lost
//   viewport: WxH, default 1280x720
//
// Captures produced by this tool are UNAPPROVED CANDIDATES for maintainer
// review; they are evidence, not accepted presentation.

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = join(HERE, '..');
const OUT_DIR = join(GAME_DIR, 'docs', 'evidence');
const PORT = 8123;
const BASE = `http://127.0.0.1:${PORT}`;

const state = process.argv[2] || 'title';
const viewport = (process.argv[3] || '1280x720').split('x').map(Number);
if (viewport.length !== 2 || viewport.some(n => !Number.isInteger(n) || n <= 0)) {
  console.error('viewport must look like 1280x720');
  process.exit(2);
}

const STATES = new Set([
  'title', 'running', 'paused', 'settings-audio', 'settings-display',
  'settings-controls', 'ended-survived', 'ended-lost'
]);
if (!STATES.has(state)) {
  console.error(`unknown state: ${state} (known: ${[...STATES].join(', ')})`);
  process.exit(2);
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`server did not become ready at ${url}`);
}

const server = spawn('npx', ['--no-install', 'http-server', 'game', '-p', String(PORT), '--silent'], {
  cwd: GAME_DIR,
  stdio: 'ignore'
});

try {
  await waitForServer(BASE);
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: viewport[0], height: viewport[1] } });
  await page.goto(BASE + '/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');

  // State setups run against the served game only: real controls plus the
  // tracked seam for deterministic outcomes.
  if (state !== 'title') {
    await page.locator('#vv-start').click();
    await page.waitForFunction(() => window.__vv.getShellState() === 'running');
  }
  if (state === 'running') {
    // A few seconds into a run: live shots and a moving HUD.
    await page.evaluate(() => {
      window.__vv.setFire(true);
      window.__vv.advanceTicks(90);
      window.__vv.setFire(false);
      window.__vv.advanceTicks(30);
    });
    await page.waitForTimeout(120);
  } else if (state === 'paused') {
    await page.keyboard.press('p');
    await page.waitForFunction(() => window.__vv.getShellState() === 'paused');
  } else if (state.startsWith('settings-')) {
    await page.keyboard.press('p');
    await page.waitForFunction(() => window.__vv.getShellState() === 'paused');
    await page.locator('#vv-pause-settings').click();
    await page.waitForFunction(() => window.__vv.getShellState() === 'settings');
    if (state === 'settings-display') await page.locator('#vv-tab-display').click();
    if (state === 'settings-controls') await page.locator('#vv-tab-controls').click();
    await page.waitForTimeout(120);
  } else if (state === 'ended-survived') {
    await page.evaluate(() => {
      const s = window.__vv.getSnapshot();
      window.__vv.setState({ ...s, elapsedTicks: 17998, lives: 3, enemies: [], shots: [], breaches: [], damageGraceRemaining: 0 });
      window.__vv.advanceTicks(2);
    });
    await page.waitForFunction(() => window.__vv.getShellState() === 'ended');
    await page.waitForTimeout(120);
  } else if (state === 'ended-lost') {
    await page.evaluate(() => window.__vv.advanceTicks(18000));
    await page.waitForFunction(() => window.__vv.getShellState() === 'ended');
    await page.waitForTimeout(120);
  }

  const outfile = join(OUT_DIR, `capture-${state}-${viewport[0]}x${viewport[1]}.png`);
  await page.screenshot({ path: outfile, fullPage: false });
  console.log(outfile);
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
