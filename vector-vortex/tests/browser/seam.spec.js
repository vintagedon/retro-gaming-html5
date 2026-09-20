// Vector Vortex D3 validation: test seam reset rebinds every consumer.
// Named mutation: window.__vv.skipFrameRunnerRebind = true must leave an
// orphaned core that the seam continues to advance.

import { test, expect } from '@playwright/test';

test('reset(seed) returns the core to a fresh state and the visible snapshot matches', async ({ page }) => {
  await page.addInitScript(() => { window.__vv = Object.assign(window.__vv || {}, { pauseRaf: true }); });
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.evaluate(() => {
    window.__vv.setRight(true);
    window.__vv.advanceTicks(5);
    window.__vv.setRight(false);
  });
  const beforeReset = await page.evaluate(() => {
    const s = window.__vv.getSnapshot();
    return { lane: s.lane, elapsed: s.elapsedTicks };
  });
  expect(beforeReset.elapsed).toBe(5);
  await page.evaluate(() => window.__vv.reset(1));
  const afterReset = await page.evaluate(() => {
    const s = window.__vv.getSnapshot();
    return { lane: s.lane, elapsed: s.elapsedTicks };
  });
  expect(afterReset.lane).toBe(0);
  expect(afterReset.elapsed).toBe(0);
});

test('DOM status values are projections, no duplicate calculation', async ({ page }) => {
  await page.addInitScript(() => { window.__vv = Object.assign(window.__vv || {}, { pauseRaf: true }); });
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  // Advance a few ticks; the DOM should mirror the snapshot exactly.
  await page.evaluate(() => window.__vv.advanceTicks(10));
  const projected = await page.evaluate(() => {
    const s = window.__vv.getSnapshot();
    return {
      snapshot: { score: s.score, lives: s.lives, remaining: s.remainingTicks },
      dom: {
        score: Number(document.querySelector('[data-testid="vv-score"]').textContent),
        livesLabel: document.querySelector('[data-testid="vv-lives"]').getAttribute('aria-label'),
        time: document.querySelector('[data-testid="vv-time"]').textContent,
        meterNow: Number(document.getElementById('vv-meter').getAttribute('aria-valuenow'))
      }
    };
  });
  expect(projected.dom.score).toBe(projected.snapshot.score);
  expect(projected.dom.livesLabel).toBe(`Lives: ${projected.snapshot.lives}`);
  const totalSeconds = Math.floor(projected.snapshot.remaining / 60);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  const expected = `${mm < 10 ? '0' : ''}${mm}:${ss < 10 ? '0' : ''}${ss}`;
  expect(projected.dom.time).toBe(`${expected} remaining`);
  expect(projected.dom.meterNow).toBe(projected.snapshot.remaining);
});

test('MUTATION: skipFrameRunnerRebind leaves the orphaned core visible through the seam', async ({ page }) => {
  await page.addInitScript(() => {
    window.__vv = Object.assign(window.__vv || {}, { skipFrameRunnerRebind: true, pauseRaf: true });
  });
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  // Advance the seam's core, then reset with the rebind skipped. The
  // runner keeps the ORPHANED core: every seam consumer (advanceTicks,
  // getSnapshot, publish) still reads it, so the advanced state survives
  // the reset. With the toggle inactive, reset(7) rebinds and the same
  // read reports lane 0 / tick 0, so this assertion fails both the
  // correct behavior and a neutered toggle.
  await page.evaluate(() => {
    window.__vv.setRight(true);
    window.__vv.advanceTicks(5);
    window.__vv.setRight(false);
  });
  await page.evaluate(() => window.__vv.reset(7));
  const orphaned = await page.evaluate(() => {
    const s = window.__vv.getSnapshot();
    return { lane: s.lane, elapsed: s.elapsedTicks };
  });
  expect(orphaned.lane).toBe(5);
  expect(orphaned.elapsed).toBe(5);
});
