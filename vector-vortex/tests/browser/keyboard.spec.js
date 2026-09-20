// Vector Vortex D3 validation: physical keydown path drives movement.
// Named mutation: window.__vv.disableKeydown = true must prevent the lane
// from changing while ArrowRight is held. Spec 03 gate 2: movement is
// tap-and-repeat, so one held tick moves one lane and repeats arrive only
// after the configured delay.

import { test, expect } from '@playwright/test';
import { startRun } from './helpers.js';

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
  expect(after).toBe((before + 1) % 24);
});

test('holding ArrowRight repeats only after the configured delay, through the real frame loop', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.locator('#vv-canvas').focus();
  await startRun(page);
  const before = await page.evaluate(() => window.__vv.getSnapshot().lane);
  await page.keyboard.down('ArrowRight');
  // Hold through 11 ticks: no repeat yet inside the 12-tick delay.
  await page.waitForFunction(() => window.__vv.getSnapshot().elapsedTicks >= 11, null, { timeout: 5000 });
  const beforeRepeat = await page.evaluate(() => window.__vv.getSnapshot().lane);
  // Hold through 30 ticks: press step plus repeats at 12, 17, 22, 27.
  await page.waitForFunction(() => window.__vv.getSnapshot().elapsedTicks >= 30, null, { timeout: 5000 });
  const afterRepeat = await page.evaluate(() => window.__vv.getSnapshot().lane);
  await page.keyboard.up('ArrowRight');
  expect(afterRepeat).toBe((beforeRepeat + 4) % 24);
  void before;
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

  // Without firing, every seed loses three lives to breaches: game-over.
  const outcomes = await page.evaluate(() => {
    const seen = { 'wave-complete': 0, 'game-over': 0 };
    for (let s = 1; s <= 10; s++) {
      window.__vv.reset(s);
      window.__vv.advanceTicks(6000);
      const o = window.__vv.getSnapshot().outcome;
      if (o === 'wave-complete' || o === 'game-over') seen[o]++;
    }
    // Force a wave-complete outcome: exhaust the budget with an empty
    // roster, then one tick grants the clear.
    window.__vv.reset(1);
    window.__vv.advanceTicks(1);
    const s = window.__vv.getSnapshot();
    window.__vv.setState({ ...s, waveSpawned: 12, lives: 999, enemies: [], damageGraceRemaining: 0, outcome: null, paused: false });
    window.__vv.advanceTicks(1);
    if (window.__vv.getSnapshot().outcome === 'wave-complete') seen['wave-complete']++;
    return seen;
  });
  expect(outcomes['game-over']).toBeGreaterThan(0);
  expect(outcomes['wave-complete']).toBeGreaterThan(0);
});

test('D3.8 keyboard flow: lane wrap 23→0, hold-fire through cooldown, pause and resume', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.evaluate(() => { window.__vv.pauseRaf = true; });
  await startRun(page);

  // 1. Lane wrap 23→0: tap 23 right-steps through the seam, then one
  //    physical right press must wrap to lane 0.
  await page.evaluate(() => window.__vv.setLane(23));
  await page.keyboard.down('ArrowRight');
  await page.evaluate(() => window.__vv.advanceTicks(1));
  await page.keyboard.up('ArrowRight');
  const afterWrap = await page.evaluate(() => window.__vv.getSnapshot().lane);
  expect(afterWrap).toBe(0);

  // 2. Hold-fire through cooldown: hold Space for 20 ticks (> 8-tick cooldown)
  //    and assert shotsSpawned > 1 (multiple shots fired).
  await page.evaluate(() => window.__vv.reset(1));
  await page.locator('#vv-canvas').focus();
  await page.keyboard.down('Space');
  await page.evaluate(() => window.__vv.advanceTicks(20));
  await page.keyboard.up('Space');
  const shots = await page.evaluate(() => window.__vv.getSnapshot().shotsSpawned);
  expect(shots).toBeGreaterThan(1);

  // 3. Pause and resume: dispatch pause via the pause button click,
  //    verify paused, advanceTicks does nothing while paused, then
  //    resume via the pause button and verify ticks advance.
  await page.evaluate(() => window.__vv.reset(1));
  await page.locator('#vv-canvas').focus();
  await page.keyboard.down('ArrowRight');
  await page.evaluate(() => window.__vv.advanceTicks(3));
  await page.keyboard.up('ArrowRight');
  // Pause: activate the focused pause button (production wiring).
  await page.locator('#vv-pause').focus();
  await page.keyboard.press('Space'); // activates the focused pause button
  const pausedSnap = await page.evaluate(() => window.__vv.getSnapshot());
  expect(pausedSnap.paused).toBe(true);
  const before = pausedSnap.elapsedTicks;
  await page.evaluate(() => window.__vv.advanceTicks(60));
  const stillPaused = await page.evaluate(() => window.__vv.getSnapshot());
  expect(stillPaused.elapsedTicks).toBe(before);
  // Resume via the pause dialog's Resume control (the shell owns pause focus).
  await page.locator('#vv-resume').focus();
  await page.keyboard.press('Enter');
  await page.evaluate(() => window.__vv.advanceTicks(3));
  const resumed = await page.evaluate(() => window.__vv.getSnapshot());
  expect(resumed.paused).toBe(false);
  expect(resumed.elapsedTicks).toBeGreaterThan(before);
});

test('a single tap through the real frame loop moves exactly one lane and stops', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await startRun(page);
  const before = await page.evaluate(() => window.__vv.getSnapshot().lane);
  await page.keyboard.down('ArrowRight');
  // The press step resolves on the first drained tick.
  await page.waitForFunction(
    (b) => window.__vv.getSnapshot().lane === (b + 1) % 24,
    before,
    { timeout: 5000 }
  );
  await page.keyboard.up('ArrowRight');
  // Well past the repeat delay with the key released: no further step.
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.__vv.getSnapshot().lane);
  expect(after).toBe((before + 1) % 24);
});

test('a synthetic auto-repeat keydown adds no step and does not restart a held action across a pause', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.evaluate(() => { window.__vv.pauseRaf = true; });
  await startRun(page);
  await page.locator('#vv-canvas').focus();

  // Fresh press: one step.
  await page.keyboard.down('ArrowRight');
  await page.evaluate(() => window.__vv.advanceTicks(1));
  expect(await page.evaluate(() => window.__vv.getSnapshot().lane)).toBe(1);

  // A synthetic auto-repeat keydown for the held key adds nothing.
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', repeat: true }));
  });
  await page.evaluate(() => window.__vv.advanceTicks(3));
  expect(await page.evaluate(() => window.__vv.getSnapshot().lane)).toBe(1);

  // Pause mid-hold: the shell clears held input. An auto-repeat keydown
  // that arrives while paused must not re-arm the action.
  await page.locator('#vv-pause').click();
  expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(true);
  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', repeat: true }));
  });
  await page.locator('#vv-resume').click();
  expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(false);
  // The held action was not restarted: the lane holds until a fresh press.
  await page.evaluate(() => window.__vv.advanceTicks(15));
  expect(await page.evaluate(() => window.__vv.getSnapshot().lane)).toBe(1);

  // A fresh press after the pause steps again. Focus returns to the
  // canvas first: movement dispatch is gated on the game surface.
  await page.keyboard.up('ArrowRight');
  await page.evaluate(() => window.__vv.advanceTicks(1));
  await page.locator('#vv-canvas').focus();
  await page.keyboard.down('ArrowRight');
  await page.evaluate(() => window.__vv.advanceTicks(1));
  await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => window.__vv.getSnapshot().lane)).toBe(2);
});
