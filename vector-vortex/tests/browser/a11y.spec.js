// Vector Vortex D3 validation: a11y + no off-origin + no image/audio.

import { test, expect } from '@playwright/test';
import { startRun } from './helpers.js';

test('canvas has aria-label, role=img, and adjacent objective/status', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const a11y = await page.evaluate(() => {
    const c = document.getElementById('vv-canvas');
    const obj = document.querySelector('[data-testid="vv-objective"]');
    const status = document.querySelector('[data-testid="vv-current-status"]');
    return {
      ariaLabel: c.getAttribute('aria-label'),
      role: c.getAttribute('role'),
      hasObjective: !!obj,
      hasStatus: !!status
    };
  });
  expect(a11y.ariaLabel).toBeTruthy();
  expect(a11y.role).toBe('img');
  expect(a11y.hasObjective).toBe(true);
  expect(a11y.hasStatus).toBe(true);
});

test('no <img> and no <audio> elements on the page', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const counts = await page.evaluate(() => ({
    img: document.querySelectorAll('img').length,
    audio: document.querySelectorAll('audio').length,
    video: document.querySelectorAll('video').length
  }));
  expect(counts.img).toBe(0);
  expect(counts.audio).toBe(0);
  expect(counts.video).toBe(0);
});

test('all network requests are same-origin (the baseURL host)', async ({ page, baseURL }) => {
  const requests = [];
  page.on('request', (req) => requests.push(req.url()));
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  // Run a few interactions to provoke any lazy requests.
  await page.evaluate(() => window.__vv.advanceTicks(10));
  expect(requests.length).toBeGreaterThan(0);
  for (const u of requests) {
    expect(u.startsWith(baseURL)).toBe(true);
  }
});

test('focus-visible CSS exists for the pause button', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await startRun(page);
  // Reach the pause button by real keyboard focus: the framework's focus
  // ring is a :focus-visible contract, and programmatic focus() carries no
  // keyboard modality.
  await page.keyboard.press('Tab');
  const visible = await page.evaluate(() => {
    const b = document.activeElement;
    const cs = window.getComputedStyle(b);
    return { id: b.id, outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle };
  });
  expect(visible.id).toBe('vv-pause');
  expect(visible.outlineStyle).not.toBe('none');
  expect(visible.outlineWidth).not.toBe('0px');
});
