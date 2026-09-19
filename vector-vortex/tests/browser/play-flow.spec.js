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
  // Identified optional loads, matched precisely: the browser's own icon
  // request (/favicon.ico) and source maps. Nothing else is optional. The
  // match is on the exact optional targets only; a substring test such as
  // url.includes('favicon') would also swallow genuine application
  // failures for any URL or text that merely contains the word.
  if (!url) return false;
  const path = url.split('?')[0];
  return path.endsWith('/favicon.ico') || path.endsWith('.map');
}

function isAppResource(resourceType) {
  return resourceType === 'stylesheet' || resourceType === 'script' || resourceType === 'document';
}

function collectErrors(page, errors) {
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    // Identify optional failures by their resource URL only. Matching the
    // message text would suppress application errors whose prose mentions
    // an optional target (for example a handler logging a favicon cache
    // failure); only the request's own URL identifies an optional load.
    const loc = msg.location()?.url ?? '';
    if (isOptionalAssetFailure(loc)) return;
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
  // Issue the optional icon request deterministically and observe it
  // fail. Waiting for the browser to fetch the icon of its own accord is
  // not evidence: Chromium routes its favicon fetching through the
  // browser process's favicon service, which produces no page-attributed
  // network events, so a bare favicon.ico route never fires and the gate
  // would pass vacuously (that is how this test originally passed while
  // proving nothing). A query-suffixed fetch of the same icon URL goes
  // through the ordinary, interceptable request pipeline. The route
  // counter and the requestfailed capture prove the request happened and
  // was seen failing; the empty error list proves the gate tolerates an
  // identified optional failure.
  let iconRouteHits = 0;
  const iconFailures = [];
  page.on('requestfailed', (req) => {
    if (req.url().split('?')[0].endsWith('/favicon.ico')) iconFailures.push(req.url());
  });
  await page.route('**/favicon.ico*', (route) => {
    iconRouteHits += 1;
    route.abort();
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.getSnapshot === 'function');
  await page.evaluate(async () => {
    try {
      await fetch('favicon.ico?probe=icon-failure-gate');
    } catch {
      // The abort is the point of the request.
    }
  });
  await page.waitForTimeout(300);
  expect(iconRouteHits, 'the icon request must actually be issued').toBeGreaterThan(0);
  expect(iconFailures.length, 'the icon failure must actually be observed').toBeGreaterThan(0);
  expect(errors, `unexpected page errors: ${errors.join(' | ')}`).toEqual([]);
});
