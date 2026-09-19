#!/usr/bin/env node
// Vector Vortex evidence capture tool (Spec 02).
// Boots the game's static server, opens the named state in Chromium
// headless, and writes a labeled PNG under docs/evidence/.
//
// Usage: node scripts/capture-state.mjs <state> [viewport]
//   states: title (more land with their deliverables)
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

  let suffix = '';
  if (state === 'title') {
    // Title state: the served page as loaded, before any run input.
  } else {
    throw new Error(`unknown state: ${state}`);
  }

  const outfile = join(OUT_DIR, `capture-${state}-${viewport[0]}x${viewport[1]}${suffix}.png`);
  await page.screenshot({ path: outfile, fullPage: false });
  console.log(outfile);
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
