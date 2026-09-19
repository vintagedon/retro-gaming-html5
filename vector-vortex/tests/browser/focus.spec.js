// Vector Vortex D3 validation: focus on pause/restart activates the button.
// Named mutation: window.__vv.preventSpaceAtWindow = true must make Space
// no longer activate the focused button.

import { test, expect } from '@playwright/test';
import { startRun } from './helpers.js';

test('Space on focused pause button activates pause', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await startRun(page);
  await page.locator('#vv-pause').focus();
  const beforeStatus = await page.locator('[data-testid="vv-current-status"]').textContent();
  expect(beforeStatus).toBe('running');
  await page.keyboard.press('Space');
  // Wait one frame for the click handler and the next rAF tick.
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="vv-current-status"]');
    return el && el.textContent === 'paused';
  }, null, { timeout: 2000 });
  const after = await page.locator('[data-testid="vv-current-status"]').textContent();
  expect(after).toBe('paused');
});

test('ArrowRight on a focused DOM control does NOT change the player lane (D2.4)', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await startRun(page);
  await page.evaluate(() => { window.__vv.pauseRaf = true; });
  // The restart control is disabled while a run is live, so the enabled
  // pause button stands in for the DOM-control half of the gate contract.
  await page.locator('#vv-pause').focus();
  const before = await page.evaluate(() => window.__vv.getSnapshot().lane);
  await page.keyboard.down('ArrowRight');
  await page.evaluate(() => window.__vv.advanceTicks(3));
  await page.keyboard.up('ArrowRight');
  const after = await page.evaluate(() => window.__vv.getSnapshot().lane);
  expect(after).toBe(before, 'lane must not change while focus is on a DOM control');
});

test('Space on focused pause button does NOT spawn a shot (D2.4)', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await startRun(page);
  await page.evaluate(() => { window.__vv.pauseRaf = true; });
  await page.locator('#vv-pause').focus();
  const before = await page.evaluate(() => window.__vv.getSnapshot().shotsSpawned);
  await page.keyboard.press('Space');
  const after = await page.evaluate(() => window.__vv.getSnapshot().shotsSpawned);
  expect(after).toBe(before, 'no shot must spawn while focus is on the pause button');
});

test('MUTATION: disabling the focus gate spawns shots even when pause is focused (D2.4)', async ({ page }) => {
  await page.addInitScript(() => { window.__vv = Object.assign(window.__vv || {}, { disableFocusGate: true }); });
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await startRun(page);
  await page.evaluate(() => { window.__vv.pauseRaf = true; });
  await page.locator('#vv-pause').focus();
  const before = await page.evaluate(() => window.__vv.getSnapshot().shotsSpawned);
  await page.keyboard.down('Space');
  await page.evaluate(() => window.__vv.advanceTicks(20));
  const after = await page.evaluate(() => window.__vv.getSnapshot().shotsSpawned);
  await page.keyboard.up('Space');
  expect(after).toBeGreaterThan(before, 'mutation: with the gate disabled, holding Space must spawn shots even with focus on the pause button');
});

test('MUTATION: preventing Space at window level breaks button activation', async ({ page }) => {
  await page.addInitScript(() => { window.__vv = Object.assign(window.__vv || {}, { preventSpaceAtWindow: true }); });
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await startRun(page);
  await page.locator('#vv-pause').focus();
  await page.keyboard.press('Space');
  // Give the click handler time to fire (or not).
  await page.waitForTimeout(300);
  const after = await page.locator('[data-testid="vv-current-status"]').textContent();
  expect(after).toBe('running');
});
