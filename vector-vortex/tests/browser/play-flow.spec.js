// Vector Vortex 01c gate 2 (continuation): smoke flow.
// Loads the page, moves and fires through real keyboard input for
// several seconds, then runs the pause segment through the REAL frame
// loop: pause, blur/refocus and hide/restore while paused, a real wait
// still paused, and resume. No advanceTicks, no pauseRaf, and no direct
// core-state changes anywhere in the pause segment, because disabling
// animation frames removes the exact timing behavior the check exists to
// observe. Also exercises a hidden then visible transition without a
// separate focus event, and fails on console errors, uncaught page
// errors, unhandled rejections, and failed stylesheet or module loads.
// Optional icon and source-map load failures are identified as such and
// ignored; application errors are never suppressed.

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

function isOptionalAssetFailure(url) {
  // Identified optional loads: the browser's own icon request and source
  // maps. Nothing else is optional.
  return url.includes('favicon') || url.endsWith('.map');
}

function isAppResource(resourceType) {
  return resourceType === 'stylesheet' || resourceType === 'script' || resourceType === 'document';
}

function collectErrors(page, errors) {
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const loc = msg.location()?.url ?? '';
    if (isOptionalAssetFailure(loc) || isOptionalAssetFailure(msg.text())) return;
    errors.push(`console.error: ${msg.text()}`);
  });
  page.on('requestfailed', (req) => {
    if (isOptionalAssetFailure(req.url())) return;
    errors.push(`requestfailed: ${req.url()} (${req.failure()?.errorText ?? 'failed'})`);
  });
  page.on('response', (res) => {
    if (res.status() < 400) return;
    if (!isAppResource(res.request().resourceType())) return;
    if (isOptionalAssetFailure(res.url())) return;
    errors.push(`http ${res.status()}: ${res.url()}`);
  });
}

test('smoke flow: keyboard play, real-frame-loop pause segment, and hidden→visible transition', async ({ page }) => {
  const errors = [];
  collectErrors(page, errors);

  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.getSnapshot === 'function');
  await page.locator('#vv-canvas').focus();

  // 1. Real keyboard movement and firing for several seconds.
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

  // 2. Pause segment through the real frame loop. The game is mid-run
  //    from segment 1; nothing here may bypass the rAF timing path.
  await page.keyboard.press('p');
  expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(true);
  const atPause = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  // Blur and refocus the window while paused, then a real wait.
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks)).toBe(atPause);
  // Hide and restore the document without a focus event, still paused,
  // then another real wait. An unguarded resume would accumulate delta
  // against the paused core here and burst on resume.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks)).toBe(atPause);
  // Resume. The first 500ms drains ~30 ticks at the normal rate; an
  // accumulated catch-up burst overshoots it by the paused interval.
  await page.keyboard.press('p');
  expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(false);
  const resumedAt = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  await page.waitForTimeout(500);
  const firstWindow = (await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks)) - resumedAt;
  expect(firstWindow).toBeGreaterThan(0);
  expect(firstWindow).toBeLessThanOrEqual(48);

  // 3. hidden → visible transition without a separate window focus event,
  //    now with the game running.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const afterHidden = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  await page.waitForTimeout(500);
  const afterVisible = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
  expect(afterVisible).toBeGreaterThan(afterHidden);

  // Final: no errors of any kind surfaced.
  expect(errors, `unexpected page errors: ${errors.join(' | ')}`).toEqual([]);
});

test('smoke error gate: a failed stylesheet request is blocking', async ({ page }) => {
  const errors = [];
  collectErrors(page, errors);
  await page.route('**/styles.css', (route) => route.abort());
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.getSnapshot === 'function');
  await page.waitForTimeout(300);
  expect(errors.some((e) => e.includes('styles.css')), `expected a styles.css failure in: ${errors.join(' | ')}`).toBe(true);
});

test('smoke error gate: a failed icon request is not blocking', async ({ page }) => {
  const errors = [];
  collectErrors(page, errors);
  await page.route('**/favicon.ico', (route) => route.abort());
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.getSnapshot === 'function');
  await page.waitForTimeout(300);
  expect(errors, `unexpected page errors: ${errors.join(' | ')}`).toEqual([]);
});
