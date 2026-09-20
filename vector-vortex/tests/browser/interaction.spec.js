// Vector Vortex 01c continuation gate 1: interaction journeys.
// Each test drives the real production runtime (real rAF loop, real input
// adapter, real DOM buttons) through the player journeys that exposed the
// pause/focus/visibility/restart interaction defects. No test-only runner.

import { test, expect } from '@playwright/test';
import { startRun } from './helpers.js';

const LANE_COUNT = 24;

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
  await startRun(page);
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
  // The resume keypress re-opens the live clock, so a frame may tick
  // between the press and this read; exact equality against the paused
  // count races the next frame (the same live-clock race family as the
  // restart read below). The pause-interval freeze is proven by the
  // equalities above, which read while paused. A real paused-interval
  // replay would add the whole interval (over 100 ticks for the ~1.8 s
  // paused here), far above this bound, which only absorbs read latency.
  const atResume = await ticks(page);
  expect(atResume - atPause).toBeGreaterThanOrEqual(0);
  expect(atResume - atPause).toBeLessThanOrEqual(4);
  const firstWindow = await sampleAdvance(page, 500);
  expect(firstWindow).toBeGreaterThan(0);
  expect(firstWindow).toBeLessThanOrEqual(48);
  // Advancement continues at the normal rate after the first window.
  expect(await sampleAdvance(page, 500)).toBeGreaterThan(0);
});

test('paused game survives hide and restore without a focus event with zero ticks and a normal post-resume rate', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await startRun(page);
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
  await startRun(page);
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

test('new run from the ended surface produces a running fresh run', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await startRun(page);
  // Reach an outcome through the seam (journey setup only); the shell
  // observes the outcome and opens the ended surface.
  await page.evaluate(() => window.__vv.advanceTicks(18000));
  expect(await page.evaluate(() => window.__vv.getSnapshot().outcome)).not.toBe(null);
  await page.waitForFunction(() => window.__vv.getShellState() === 'ended');
  // Click New Run on the ended surface.
  await page.click('#vv-new-run');
  const snap = await page.evaluate(() => window.__vv.getSnapshot());
  // The restart dispatch itself resumes the live clock (the runner
  // re-syncs the clock on restart), and rAF keeps running throughout, so
  // a frame may tick between the dispatch and this read. The stopped-clock
  // zero assertion this test used was therefore still racy. The assertion
  // is a fresh unpaused run near zero, never the finished 18,000-tick run;
  // the advancement wait below retains the proof that the fresh run runs.
  expect(snap.elapsedTicks).toBeLessThan(10);
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
    await startRun(page);
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
    // Auto-repeat keydowns from the still-physically-held keys must not
    // resurrect the cleared held flags either: a real OS repeat while the
    // key never came up would otherwise restart movement and fire across
    // the pause without a fresh press. Playwright does not synthesize
    // auto-repeat, so the repeat keydowns are dispatched directly to the
    // adapter's window listener.
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', repeat: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', repeat: true }));
    });
    await page.waitForTimeout(300);
    const afterRepeat = await page.evaluate(() => window.__vv.getSnapshot());
    expect(afterRepeat.lane).toBe(laneAtPause);
    expect(afterRepeat.shotsSpawned).toBe(shotsAtPause);
    // Release, press again, and movement and firing resume.
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('Space');
    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('Space');
    // Baseline captured after the keys are down: the game kept ticking
    // through the no-movement wait above, so the pause-time count cannot
    // serve as the base here.
    const baseAtRepress = await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks);
    await page.waitForFunction(
      (t) => window.__vv.getSnapshot().elapsedTicks >= t + 31,
      baseAtRepress,
      { timeout: 5000 }
    );
    const again = await page.evaluate(() => window.__vv.getSnapshot());
    expect(again.lane).not.toBe(laneAtPause);
    expect(again.shotsSpawned).toBeGreaterThan(shotsAtPause);
    await page.keyboard.up('ArrowRight');
    await page.keyboard.up('Space');
  }
});

test('mouse pause and resume follow the shell focus contract; ended surface restart returns control', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await startRun(page);
  // Mouse-only pause: the dialog opens and contains focus.
  await page.click('#vv-pause');
  expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(true);
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-resume');
  // Mouse resume: focus returns to the invoking control (the pause button).
  await page.click('#vv-resume');
  expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(false);
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-pause');
  // Canvas control returns with the canvas focused; held movement lands
  // the lane safely inside the tube before release, away from the wrap
  // seam, so scheduling jitter cannot land the release on lane 0.
  await page.locator('#vv-canvas').focus();
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(
    () => {
      const s = window.__vv.getSnapshot();
      return s.elapsedTicks >= 31 && s.lane >= 4 && s.lane <= 18;
    },
    null,
    { timeout: 5000 }
  );
  await page.keyboard.up('ArrowRight');
  const released = await page.evaluate(() => window.__vv.getSnapshot().lane);
  expect(released).toBeGreaterThan(0);
  expect(released).toBeLessThan(LANE_COUNT);
  // Reach an outcome; the shell opens the ended surface, whose New Run
  // control receives focus and restarts by keyboard.
  await page.evaluate(() => window.__vv.advanceTicks(18000));
  await page.waitForFunction(() => window.__vv.getShellState() === 'ended');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-new-run');
  await page.keyboard.press('Enter');
  const afterRestart = await page.evaluate(() => window.__vv.getSnapshot());
  // The clock is live here, so a frame may tick before the read lands;
  // a fresh unpaused run near zero (not the finished 18,000-tick run)
  // is the assertion.
  expect(afterRestart.elapsedTicks).toBeLessThan(10);
  expect(afterRestart.outcome).toBe(null);
  expect(afterRestart.paused).toBe(false);
  // Ticks advance and canvas keyboard control returns without another click.
  const atRestart = await ticks(page);
  await page.waitForFunction(
    (t) => window.__vv.getSnapshot().elapsedTicks - t >= 15,
    atRestart,
    { timeout: 3000 }
  );
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(
    (t) => {
      const s = window.__vv.getSnapshot();
      return s.elapsedTicks >= t + 25 && s.lane >= 4 && s.lane <= 18;
    },
    atRestart + 15,
    { timeout: 5000 }
  );
  await page.keyboard.up('ArrowRight');
  const releasedAfterRestart = await page.evaluate(() => window.__vv.getSnapshot().lane);
  expect(releasedAfterRestart).toBeGreaterThan(0);
  expect(releasedAfterRestart).toBeLessThan(LANE_COUNT);
});

test('at 1024x576 the bottom edge of the lowest control is inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 576 });
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await startRun(page);
  const bounds = await page.evaluate(() => {
    const b = document.querySelector('#vv-controls-buttons').getBoundingClientRect();
    return { bottom: b.bottom, innerH: window.innerHeight, scrollH: document.documentElement.scrollHeight };
  });
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.innerH);
  expect(bounds.scrollH).toBeLessThanOrEqual(bounds.innerH);
  await page.screenshot({ path: 'test-results/vv-controls-1024x576.png', fullPage: true });
});
