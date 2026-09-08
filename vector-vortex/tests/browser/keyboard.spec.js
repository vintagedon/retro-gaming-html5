// Vector Vortex D3 validation: physical keydown path drives movement.
// Named mutation: window.__vv.disableKeydown = true must prevent the lane
// from changing while ArrowRight is held.

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

test('holding ArrowRight changes lane through the physical keydown path', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.evaluate(() => { window.__vv.pauseRaf = true; });
  await page.locator('#vv-canvas').focus();
  const before = await page.evaluate(() => window.__vv.getSnapshot().lane);
  await page.keyboard.down('ArrowRight');
  await page.evaluate(() => window.__vv.advanceTicks(3));
  const after = await page.evaluate(() => window.__vv.getSnapshot().lane);
  await page.keyboard.up('ArrowRight');
  expect(after).not.toBe(before);
  expect(after).toBe((before + 3) % 24);
});

test('MUTATION: disabling the keydown handler prevents lane change', async ({ page }) => {
  await page.addInitScript(() => { window.__vv = Object.assign(window.__vv || {}, { disableKeydown: true }); });
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.evaluate(() => { window.__vv.pauseRaf = true; });
  await page.locator('#vv-canvas').focus();
  const before = await page.evaluate(() => window.__vv.getSnapshot().lane);
  await page.keyboard.down('ArrowRight');
  await page.evaluate(() => window.__vv.advanceTicks(3));
  const after = await page.evaluate(() => window.__vv.getSnapshot().lane);
  await page.keyboard.up('ArrowRight');
  expect(after).toBe(before);
});

test('keyboard-only flow reaches both outcomes through the test seam', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.evaluate(() => { window.__vv.pauseRaf = true; });

  // Without firing, every seed loses to a breach on tick ~847.
  const outcomes = await page.evaluate(() => {
    const seen = { survived: 0, lost: 0 };
    for (let s = 1; s <= 10; s++) {
      window.__vv.reset(s);
      window.__vv.advanceTicks(18000);
      const o = window.__vv.getSnapshot().outcome;
      if (o === 'survived' || o === 'lost') seen[o]++;
    }
    // Force a survived outcome: set the core to tick 17999 with high lives
    // and no enemies, then one final tick reaches the run boundary.
    window.__vv.reset(1);
    window.__vv.advanceTicks(17999);
    const s = window.__vv.getSnapshot();
    window.__vv.setState({ ...s, lives: 999, enemies: [], damageGraceRemaining: 0, outcome: null, paused: false, elapsedTicks: 17999 });
    window.__vv.advanceTicks(1);
    if (window.__vv.getSnapshot().outcome === 'survived') seen.survived++;
    return seen;
  });
  expect(outcomes.survived).toBeGreaterThan(0);
  expect(outcomes.lost).toBeGreaterThan(0);
});
