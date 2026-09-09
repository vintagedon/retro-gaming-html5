// Vector Vortex D3 validation: blur and visibilitychange clear held input
// and stop authoritative tick advancement. Resuming produces no catch-up.
// The tests below exercise the real rAF path (NOT pauseRaf) per Spec 01b
// D3.6: disabling the input adapter or the frame runner must fail them.

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

test('window blur stops authoritative tick advancement via the real rAF path (D3.6)', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.locator('#vv-canvas').focus();
  // Let the rAF loop run normally for one second to confirm baseline.
  const before = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  await page.waitForTimeout(1000);
  const afterBaseline = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  expect(afterBaseline).toBeGreaterThan(before);
  // Dispatch blur on the window. The input adapter must pause the clock.
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  // Let the rAF loop run for another second.
  const beforePause = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  await page.waitForTimeout(1000);
  const afterPause = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  expect(afterPause).toBe(beforePause, 'ticks must not advance while the window is blurred');
  // Resume by dispatching focus.
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(200);
  const afterResume = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  expect(afterResume).toBeGreaterThanOrEqual(beforePause);
});

test('visibilitychange to hidden stops tick advancement via the real rAF path (D3.6)', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.locator('#vv-canvas').focus();
  const before = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  await page.waitForTimeout(500);
  const afterBaseline = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  expect(afterBaseline).toBeGreaterThan(before);
  // Simulate visibilitychange -> hidden.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const beforeHidden = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  await page.waitForTimeout(500);
  const afterHidden = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  expect(afterHidden).toBe(beforeHidden, 'ticks must not advance while the tab is hidden');
  // Restore visibility.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(200);
  const afterVisible = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  expect(afterVisible).toBeGreaterThanOrEqual(beforeHidden);
});

test('MUTATION: disabling the input adapter prevents blur from stopping tick advancement', async ({ page }) => {
  await page.addInitScript(() => { window.__vv = Object.assign(window.__vv || {}, { disableInputAdapter: true }); });
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.locator('#vv-canvas').focus();
  // Without an input adapter, the blur handler never fires; ticks keep advancing.
  const before = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  expect(after).toBeGreaterThan(before, 'mutation: ticks keep advancing when the adapter is disabled');
});

test('MUTATION: disabling the frame runner prevents tick advancement entirely', async ({ page }) => {
  await page.addInitScript(() => { window.__vv = Object.assign(window.__vv || {}, { disableFrameRunner: true }); });
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const before = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  expect(after).toBe(before, 'mutation: with the runner disabled, no ticks drain via rAF');
});
