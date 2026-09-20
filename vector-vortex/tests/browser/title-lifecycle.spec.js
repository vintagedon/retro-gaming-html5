// Vector Vortex presentation-state lifecycle validation (Spec 03 gate 3).
// The title state hides and disables the gameplay HUD, and the simulation
// advances zero ticks while it is shown: through focus and visibility
// transitions, on the title and on settings reached from the title, and
// gameplay never starts behind the menu. Start begins a fresh run at tick
// zero and wave one.

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
}

test('on the title the HUD is hidden and its controls disabled', async ({ page }) => {
  await boot(page);
  const state = await page.evaluate(() => ({
    hudDisplay: getComputedStyle(document.querySelector('[data-testid="vv-hud"]')).display,
    barDisplay: getComputedStyle(document.getElementById('vv-controls-buttons')).display,
    pauseDisabled: document.getElementById('vv-pause').disabled,
    restartDisabled: document.getElementById('vv-restart').disabled,
    instructionalGone: !document.querySelector('[data-testid="vv-objective"]')
  }));
  expect(state.hudDisplay).toBe('none');
  expect(state.barDisplay).toBe('none');
  expect(state.pauseDisabled).toBe(true);
  expect(state.restartDisabled).toBe(true);
  expect(state.instructionalGone).toBe(true);
});

test('the simulation advances zero ticks while the title is shown', async ({ page }) => {
  await boot(page);
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks)).toBe(0);
});

test('focus and visibility transitions on the title advance zero ticks', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));
  });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks)).toBe(0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks)).toBe(0);
});

test('settings reached from the title never runs the clock and never starts gameplay behind the menu', async ({ page }) => {
  await boot(page);
  await page.locator('#vv-title-settings').click();
  await page.waitForFunction(() => window.__vv.getShellState() === 'settings');
  // The settings surface composes over the frozen title, not a live game.
  await page.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__vv.getShellState())).toBe('settings');
  expect(await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks)).toBe(0);
});

test('start from the title begins a fresh run at tick zero and wave one', async ({ page }) => {
  await boot(page);
  await page.locator('#vv-start').click();
  await page.waitForFunction(() => window.__vv.getShellState() === 'running');
  const s = await page.evaluate(() => window.__vv.getSnapshot());
  expect(s.elapsedTicks).toBe(0);
  expect(s.outcome).toBe(null);
  expect(await page.evaluate(() => document.querySelector('[data-testid="vv-wave"]').textContent)).toBe('1');
});

test('holding the pause key produces exactly one pause and does not resume on its own repeat', async ({ page }) => {
  await boot(page);
  await startRunAndHoldPause(page);
  // The OS repeat delay is well inside one second of holding.
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__vv.getShellState())).toBe('paused');
  let log = await page.evaluate(() => window.__vv.getShellLog());
  expect(log.filter(e => e === 'pause').length).toBe(1);
  expect(log.filter(e => e === 'resume').length).toBe(0);
  // Keep holding past the repeat delay: still paused, still one pause.
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => window.__vv.getShellState())).toBe('paused');
  log = await page.evaluate(() => window.__vv.getShellLog());
  expect(log.filter(e => e === 'pause').length).toBe(1);
  expect(log.filter(e => e === 'resume').length).toBe(0);
  await page.keyboard.up('p');
});

async function startRunAndHoldPause(page) {
  await startRunViaPointer(page);
  await page.locator('#vv-canvas').focus();
  await page.keyboard.down('p');
  await page.waitForFunction(() => window.__vv.getShellState() === 'paused');
}

async function startRunViaPointer(page) {
  await page.locator('#vv-start').click();
  await page.waitForFunction(() => window.__vv.getShellState() === 'running');
}
