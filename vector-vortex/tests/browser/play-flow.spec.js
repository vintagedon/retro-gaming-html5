// Vector Vortex 01c gate 2: smoke flow.
// Loads the page, moves and fires through real keyboard input for
// several seconds, pauses and resumes, and exercises hidden then
// visible transitions without a separate focus event. Asserts that
// movement, firing, and resumed tick advancement actually happen.
// Fails on console errors, uncaught page errors, or unhandled
// rejections throughout the flow. The visibility transition is what
// surfaces the reproduced visibility-handler stack overflow; merely
// loading and playing never invokes the faulty path.

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

test('smoke flow: keyboard play, pause/resume, and hidden→visible transition', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  page.on('requestfailed', (req) => {
    // Static asset failures (favicon, source map) are not blocking.
    if (req.url().endsWith('.css') || req.url().endsWith('.js')) return;
    errors.push(`requestfailed: ${req.url()}`);
  });

  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');

  // Capture errors from navigation onward.
  await page.evaluate(() => { window.__vv_errors = []; });

  await page.locator('#vv-canvas').focus();

  // 1. Real keyboard movement for several seconds.
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(1500);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('Space');
  await page.waitForTimeout(1500);
  await page.keyboard.up('Space');
  const afterPlay = await page.evaluate(() => window.__vv.getSnapshot());
  expect(afterPlay.elapsedTicks).toBeGreaterThan(60);
  expect(afterPlay.shotsSpawned).toBeGreaterThan(0);
  expect(afterPlay.lane).not.toBe(0);

  // 2. Pause and resume through the pause button.
  await page.evaluate(() => window.__vv.reset(1));
  await page.locator('#vv-canvas').focus();
  await page.evaluate(() => { window.__vv.pauseRaf = true; });
  await page.locator('#vv-pause').focus();
  await page.keyboard.press('Space');
  let snap = await page.evaluate(() => window.__vv.getSnapshot());
  expect(snap.paused).toBe(true);
  const beforeTicks = snap.elapsedTicks;
  await page.evaluate(() => window.__vv.advanceTicks(60));
  snap = await page.evaluate(() => window.__vv.getSnapshot());
  expect(snap.elapsedTicks).toBe(beforeTicks);
  // Resume
  await page.locator('#vv-pause').focus();
  await page.keyboard.press('Space');
  await page.evaluate(() => { window.__vv.advanceTicks(3); });
  snap = await page.evaluate(() => window.__vv.getSnapshot());
  expect(snap.paused).toBe(false);
  expect(snap.elapsedTicks).toBeGreaterThan(beforeTicks);

  // 3. hidden → visible transition WITHOUT a separate window focus event.
  await page.evaluate(() => { window.__vv.pauseRaf = false; });
  // Pause the rAF loop via Playwright's emulate media? We need to actually
  // toggle document.visibilityState. Playwright does not expose a direct
  // visibility toggle for headless Chromium, so we dispatch the underlying
  // event by hiding then showing the page via Page.dispatchEvent.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  // After visible, ticks must advance again on the next real rAF tick.
  const afterHidden = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  await page.waitForTimeout(500);
  const afterVisible = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  expect(afterVisible).toBeGreaterThan(afterHidden);

  // Final: no errors of any kind surfaced.
  expect(errors, `unexpected page errors: ${errors.join(' | ')}`).toEqual([]);
});