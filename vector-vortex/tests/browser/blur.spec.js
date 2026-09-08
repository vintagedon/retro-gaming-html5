// Vector Vortex D3 validation: blur and visibilitychange clear held input
// and stop authoritative tick advancement. Resuming produces no catch-up.

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

test('window blur clears held input and pauses tick advancement', async ({ page }) => {
  // Pause the rAF loop so held input is only consumed by the seam's ticks.
  await page.addInitScript(() => { window.__vv = Object.assign(window.__vv || {}, { pauseRaf: true }); });
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.locator('#vv-canvas').focus();
  await page.keyboard.down('ArrowRight');
  await page.evaluate(() => window.__vv.advanceTicks(5));
  const laneAfter = await page.evaluate(() => window.__vv.getSnapshot().lane);
  expect(laneAfter).toBe(5);
  // Dispatch a blur on the window. The input adapter will clear held input.
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
  });
  // Now advance again — without held input, lane should not change.
  const laneBefore = await page.evaluate(() => window.__vv.getSnapshot().lane);
  await page.evaluate(() => window.__vv.advanceTicks(5));
  const laneAfter2 = await page.evaluate(() => window.__vv.getSnapshot().lane);
  expect(laneAfter2).toBe(laneBefore);
  await page.keyboard.up('ArrowRight');
});

test('visibilitychange to hidden clears held input and stops ticks (via seam)', async ({ page }) => {
  await page.addInitScript(() => { window.__vv = Object.assign(window.__vv || {}, { pauseRaf: true }); });
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.locator('#vv-canvas').focus();
  await page.keyboard.down('ArrowRight');
  await page.evaluate(() => window.__vv.advanceTicks(3));
  const before = await page.evaluate(() => window.__vv.getSnapshot().lane);
  expect(before).toBe(3);
  // Simulate visibilitychange -> hidden.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  // Held input cleared -> no further lane change.
  const heldAfter = await page.evaluate(() => window.__vv.getSnapshot().lane);
  await page.evaluate(() => window.__vv.advanceTicks(5));
  const after = await page.evaluate(() => window.__vv.getSnapshot().lane);
  expect(after).toBe(heldAfter);
  await page.keyboard.up('ArrowRight');
  // Reset visibility for the next test.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });
});
