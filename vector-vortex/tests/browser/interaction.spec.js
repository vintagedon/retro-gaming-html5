// Vector Vortex 01c continuation gate 1: interaction journeys.
// Each test drives the real production runtime (real rAF loop, real input
// adapter, real DOM buttons) through the player journeys that exposed the
// pause/focus/visibility/restart interaction defects. No test-only runner.

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

async function ticks(page) {
  return page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
}

async function sampleAdvance(page, ms) {
  // Ticks advanced over the next `ms` of real frames. A healthy clock
  // drains ~60 ticks per second; an accumulator that built up against a
  // paused core bursts far past that in the first window after resume.
  const before = await ticks(page);
  await page.waitForTimeout(ms);
  return (await ticks(page)) - before;
}

test('paused game survives blur and refocus with zero ticks and a normal post-resume rate', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.locator('#vv-canvas').focus();
  // Baseline: the game runs.
  await page.waitForTimeout(300);
  // Pause with the keyboard (canvas focused).
  await page.keyboard.press('p');
  expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(true);
  const atPause = await ticks(page);
  // Blur and refocus the window while paused, then wait a real interval.
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(1200);
  expect(await ticks(page)).toBe(atPause);
  // Still paused; the resume guard must not have resumed the clock.
  await page.waitForTimeout(300);
  expect(await ticks(page)).toBe(atPause);
  // Resume and measure the drain through the real frame loop. The first
  // 500ms window carries the evidence: a guarded resume drains ~30 ticks,
  // an unguarded one bursts with the whole paused interval's delta.
  await page.keyboard.press('p');
  const atResume = await ticks(page);
  expect(atResume).toBe(atPause);
  const firstWindow = await sampleAdvance(page, 500);
  expect(firstWindow).toBeGreaterThan(0);
  expect(firstWindow).toBeLessThanOrEqual(48);
  // Advancement continues at the normal rate after the first window.
  expect(await sampleAdvance(page, 500)).toBeGreaterThan(0);
});

test('paused game survives hide and restore without a focus event with zero ticks and a normal post-resume rate', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.locator('#vv-canvas').focus();
  await page.waitForTimeout(300);
  await page.keyboard.press('p');
  expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(true);
  const atPause = await ticks(page);
  // Hide the document without any window blur/focus event.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(1200);
  expect(await ticks(page)).toBe(atPause);
  // Restore without a focus event. While still paused, nothing may drain
  // and the clock must stay paused through a real interval.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(1200);
  expect(await ticks(page)).toBe(atPause);
  // Resume and measure the drain through the real frame loop. The first
  // 500ms window carries the evidence: a guarded resume drains ~30 ticks,
  // an unguarded one bursts with the whole paused interval's delta.
  await page.keyboard.press('p');
  const atResume = await ticks(page);
  const firstWindow = await sampleAdvance(page, 500);
  expect(firstWindow).toBeGreaterThan(0);
  expect(firstWindow).toBeLessThanOrEqual(48);
  // Advancement continues at the normal rate after the first window.
  expect(await sampleAdvance(page, 500)).toBeGreaterThan(0);
});

test('hidden interval with no animation callbacks replays no hidden time on restoration', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.locator('#vv-canvas').focus();
  await page.waitForTimeout(300);
  // Stop animation-frame DELIVERY to the production runner. The runner
  // stays wired end to end; only the browser's callback delivery is
  // suspended, which is what a real hidden tab does.
  await page.evaluate(() => {
    window.__vv_realRaf = window.requestAnimationFrame.bind(window);
    window.__vv_rafQueue = [];
    window.requestAnimationFrame = (cb) => { window.__vv_rafQueue.push(cb); return window.__vv_rafQueue.length; };
  });
  await page.waitForTimeout(80); // let the pending frame drain into the stub
  // Hide. No animation callback can run for the whole hidden interval.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const atHide = await ticks(page);
  await page.waitForTimeout(900);
  expect(await ticks(page)).toBe(atHide);
  // Restore without a focus event, then release callback delivery.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.evaluate(() => {
    window.requestAnimationFrame = window.__vv_realRaf;
    const q = window.__vv_rafQueue;
    window.__vv_rafQueue = [];
    const now = performance.now();
    for (const cb of q) cb(now);
  });
  // The first restored frame must replay none of the hidden interval: the
  // synchronous flush of the queued callbacks may add zero ticks. Without
  // the lifecycle rebase the first frame computes dt against the stale
  // pre-hidden timestamp and bursts.
  expect(await ticks(page)).toBe(atHide);
  // Advancement resumes at the normal rate afterward: ~30 ticks per 500ms
  // window, never a burst.
  expect(await sampleAdvance(page, 500)).toBeLessThanOrEqual(48);
  expect(await sampleAdvance(page, 500)).toBeGreaterThan(0);
});

test('restart from a paused outcome screen produces a running fresh run without pause toggling', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.locator('#vv-canvas').focus();
  // Reach an outcome through the seam (journey setup only).
  await page.evaluate(() => window.__vv.advanceTicks(18000));
  expect(await page.evaluate(() => window.__vv.getSnapshot().outcome)).not.toBe(null);
  // Pause on the outcome screen.
  await page.keyboard.press('p');
  expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(true);
  // Click the enabled Restart button.
  await page.click('#vv-restart');
  const snap = await page.evaluate(() => window.__vv.getSnapshot());
  expect(snap.elapsedTicks).toBe(0);
  expect(snap.paused).toBe(false);
  expect(snap.outcome).toBe(null);
  // The fresh run must advance on its own, with no pause toggle.
  const atRestart = await ticks(page);
  await page.waitForFunction(
    (t) => window.__vv.getSnapshot().elapsedTicks - t >= 15,
    atRestart,
    { timeout: 3000 }
  );
});

test('keyboard pause clears held movement and fire for both P and Escape', async ({ page }) => {
  for (const pauseKey of ['p', 'Escape']) {
    await page.goto('/');
    await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
    await page.locator('#vv-canvas').focus();
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('Space');
    // Wait for real advancement instead of a fixed window. ~31 ticks of
    // held movement (allowing one tick of dispatch latency) lands the
    // lane safely away from both 0 and the 24-lane wrap.
    await page.waitForFunction(() => window.__vv.getSnapshot().elapsedTicks >= 31, null, { timeout: 5000 });
    const held = await page.evaluate(() => window.__vv.getSnapshot());
    expect(held.lane).toBeGreaterThan(0);
    expect(held.shotsSpawned).toBeGreaterThan(0);
    const laneAtPause = held.lane;
    const shotsAtPause = held.shotsSpawned;
    const ticksAtPause = held.elapsedTicks;
    await page.keyboard.press(pauseKey);
    expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(true);
    // Held flags must already be clear, before any gameplay-key release.
    const flags = await page.evaluate(() => window.__vv.getSnapshot().heldInput);
    expect(flags).toEqual({ left: false, right: false, fire: false });
    // Resume without a fresh gameplay keydown: no lane change, no shots.
    await page.keyboard.press(pauseKey);
    expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(false);
    await page.waitForTimeout(500);
    const resumed = await page.evaluate(() => window.__vv.getSnapshot());
    expect(resumed.lane).toBe(laneAtPause);
    expect(resumed.shotsSpawned).toBe(shotsAtPause);
    // Release, press again, and movement and firing resume.
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('Space');
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('Space');
    await page.waitForFunction(
      (t) => window.__vv.getSnapshot().elapsedTicks >= t + 25,
      ticksAtPause + 31,
      { timeout: 5000 }
    );
    const again = await page.evaluate(() => window.__vv.getSnapshot());
    expect(again.lane).not.toBe(laneAtPause);
    expect(again.shotsSpawned).toBeGreaterThan(shotsAtPause);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('Space');
  }
});

test('mouse pause and resume restore canvas keyboard control; Space-activated restart returns control too', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  // Mouse-only pause and resume.
  await page.click('#vv-pause');
  expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(true);
  await page.click('#vv-pause');
  expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(false);
  // With no intervening click, an arrow key must move the player. ~25
  // ticks of held movement lands the lane safely away from 0 and the wrap.
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.__vv.getSnapshot().elapsedTicks >= 31, null, { timeout: 5000 });
  await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => window.__vv.getSnapshot().lane)).toBeGreaterThan(0);
  // Reach an outcome, then activate the enabled Restart with Space.
  await page.evaluate(() => window.__vv.advanceTicks(18000));
  expect(await page.evaluate(() => window.__vv.getSnapshot().outcome)).not.toBe(null);
  await page.locator('#vv-restart').focus();
  await page.keyboard.press('Space');
  const afterRestart = await page.evaluate(() => window.__vv.getSnapshot());
  expect(afterRestart.elapsedTicks).toBe(0);
  expect(afterRestart.outcome).toBe(null);
  // Ticks advance and canvas keyboard control returns without another click.
  const atRestart = await ticks(page);
  await page.waitForFunction(
    (t) => window.__vv.getSnapshot().elapsedTicks - t >= 15,
    atRestart,
    { timeout: 3000 }
  );
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(
    (t) => window.__vv.getSnapshot().elapsedTicks >= t + 25,
    atRestart + 15,
    { timeout: 5000 }
  );
  await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => window.__vv.getSnapshot().lane)).toBeGreaterThan(0);
});

test('at 1024x576 the bottom edge of the lowest control is inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 576 });
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const bounds = await page.evaluate(() => {
    const b = document.querySelector('#vv-controls-buttons').getBoundingClientRect();
    return { bottom: b.bottom, innerH: window.innerHeight, scrollH: document.documentElement.scrollHeight };
  });
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.innerH);
  expect(bounds.scrollH).toBeLessThanOrEqual(bounds.innerH);
  await page.screenshot({ path: 'test-results/vv-controls-1024x576.png', fullPage: true });
});
