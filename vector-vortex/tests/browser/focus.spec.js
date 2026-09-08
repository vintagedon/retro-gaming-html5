// Vector Vortex D3 validation: focus on pause/restart activates the button.
// Named mutation: window.__vv.preventSpaceAtWindow = true must make Space
// no longer activate the focused button.

import { test, expect } from '@playwright/test';

test('Space on focused pause button activates pause', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
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

test('MUTATION: preventing Space at window level breaks button activation', async ({ page }) => {
  await page.addInitScript(() => { window.__vv = Object.assign(window.__vv || {}, { preventSpaceAtWindow: true }); });
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.locator('#vv-pause').focus();
  await page.keyboard.press('Space');
  // Give the click handler time to fire (or not).
  await page.waitForTimeout(300);
  const after = await page.locator('[data-testid="vv-current-status"]').textContent();
  expect(after).toBe('running');
});
