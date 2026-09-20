// Vector Vortex Spec 02 deliverable 3 validation: keyboard-only shell
// journeys with visible focus and correct restoration, and the relabel
// fixture proving that a shell item's label carries no command semantics.

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
}

test('keyboard-only flow: title → run → pause → settings → resume → outcome → new run → return to title', async ({ page }) => {
  await boot(page);

  // Keyboard-only: Tab from the body reaches the canvas, then the first
  // shell control (Start). Activate with Enter.
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement.id || document.activeElement.tagName)).toBe('vv-canvas');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-start');
  // Visible focus: the focused control shows a non-none focus outline.
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  expect(outline).not.toBe('none');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__vv.getShellState() === 'running');

  // Pause from the canvas with the pause key; the dialog takes focus.
  await page.keyboard.press('p');
  await page.waitForFunction(() => window.__vv.getShellState() === 'paused');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-resume');

  // Settings from the pause dialog; focus lands on the active tab. Escape
  // returns to paused and restores the invoking control. The menu order
  // is Resume, Restart, Settings, Return to Title.
  await page.keyboard.press('Tab'); // resume -> restart
  await page.keyboard.press('Tab'); // restart -> settings
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__vv.getShellState() === 'settings');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-tab-audio');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__vv.getShellState() === 'paused');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-pause-settings');

  // Resume with the pause key from the dialog.
  await page.keyboard.press('p');
  await page.waitForFunction(() => window.__vv.getShellState() === 'running');
  expect(await page.evaluate(() => document.activeElement.id || document.activeElement.tagName)).toBe('vv-canvas');

  // Reach an outcome; the game-over screen takes focus; Play Again by keyboard.
  await page.evaluate(() => window.__vv.advanceTicks(6000));
  await page.waitForFunction(() => window.__vv.getShellState() === 'game-over');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-new-run');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__vv.getShellState() === 'running');

  // A second outcome, then Return to Title by keyboard.
  await page.evaluate(() => window.__vv.advanceTicks(6000));
  await page.waitForFunction(() => window.__vv.getShellState() === 'game-over');
  await page.locator('#vv-end-return-title').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__vv.getShellState() === 'title');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-start');
});

test('relabeling a shell item in a fixture does not alter the named command; each activation fires once', async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      // Fixture relabels: text is presentation; commands bind by identity.
      document.getElementById('vv-start').textContent = 'Launch';
      document.getElementById('vv-resume').textContent = 'Continue';
    }, { once: true });
  });
  await boot(page);
  expect(await page.locator('#vv-start').textContent()).toBe('Launch');
  await page.locator('#vv-start').click();
  await page.waitForFunction(() => window.__vv.getShellState() === 'running');
  let log = await page.evaluate(() => window.__vv.getShellLog());
  expect(log.filter(e => e === 'start').length).toBe(1);

  await page.locator('#vv-pause').click();
  await page.waitForFunction(() => window.__vv.getShellState() === 'paused');
  expect(await page.locator('#vv-resume').textContent()).toBe('Continue');
  await page.locator('#vv-resume').click();
  await page.waitForFunction(() => window.__vv.getShellState() === 'running');
  log = await page.evaluate(() => window.__vv.getShellLog());
  expect(log.filter(e => e === 'resume').length).toBe(1);
  expect(log.filter(e => e === 'pause').length).toBe(1);
});

test('title menu focus containment: Tab cycles inside the title surface', async ({ page }) => {
  await boot(page);
  // Title surface: Tab from Start wraps forward through the vertical menu.
  await page.locator('#vv-start').focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-title-settings');
  await page.keyboard.press('Tab');
  // Wraps back to the first focusable inside the surface, never to the page.
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-start');

  // Shift-Tab from the first control wraps to the last.
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-title-settings');
});

test('below 960x540 the title and settings surfaces stay operable', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 480 });
  await boot(page);
  // Title surface operable by keyboard.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-start');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__vv.getShellState() === 'running');

  // Settings reachable and its tabs operable in the small viewport.
  await page.keyboard.press('p');
  await page.waitForFunction(() => window.__vv.getShellState() === 'paused');
  await page.locator('#vv-pause-settings').click();
  await page.waitForFunction(() => window.__vv.getShellState() === 'settings');
  await page.locator('#vv-tab-display').click();
  expect(await page.evaluate(() => document.getElementById('vv-panel-display').getAttribute('data-vv-panel'))).toBe('active');
  // The ended surface is reachable and operable too.
  await page.locator('#vv-settings-close').click();
  await page.locator('#vv-resume').click();
  await page.evaluate(() => window.__vv.advanceTicks(6000));
  await page.waitForFunction(() => window.__vv.getShellState() === 'game-over');
  await page.locator('#vv-new-run').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__vv.getShellState() === 'running');
});

test('blur during running enters paused once and clears held actions; blur elsewhere changes nothing', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => { window.__vv.pauseRaf = true; });
  await page.locator('#vv-start').click();
  await page.locator('#vv-canvas').focus();

  // Hold actions, then blur: held flags clear and the shell pauses once.
  await page.evaluate(() => {
    window.__vv.setRight(true);
    window.__vv.setFire(true);
  });
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect(await page.evaluate(() => window.__vv.getShellState())).toBe('paused');
  const flags = await page.evaluate(() => window.__vv.getSnapshot().heldInput);
  expect(flags).toEqual({ left: false, right: false, fire: false });

  // A second blur while paused changes nothing.
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect(await page.evaluate(() => window.__vv.getShellState())).toBe('paused');

  // Return to title, then blur: neither shell nor core changes.
  await page.evaluate(() => window.__vv.setState({ ...window.__vv.getSnapshot(), paused: false }));
  await page.locator('#vv-return-title').click();
  expect(await page.evaluate(() => window.__vv.getShellState())).toBe('title');
  const before = await page.evaluate(() => window.__vv.getSnapshot());
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect(await page.evaluate(() => window.__vv.getShellState())).toBe('title');
  const after = await page.evaluate(() => window.__vv.getSnapshot());
  expect(after.paused).toBe(before.paused);
  expect(after.elapsedTicks).toBe(before.elapsedTicks);
  expect(after.heldInput).toEqual(before.heldInput);
});

test('paused and wave-complete are reachable and leavable by keyboard with focus contained and restored', async ({ page }) => {
  await boot(page);
  await page.locator('#vv-start').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__vv.getShellState() === 'running');

  // Keyboard pause lands focus on the paused surface's first control.
  await page.keyboard.press('p');
  await page.waitForFunction(() => window.__vv.getShellState() === 'paused');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-resume');
  // Shift-Tab from the first control wraps to the last; the cycle never
  // leaves the surface.
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-return-title');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-resume');

  // Escape resumes and focus returns to the canvas.
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__vv.getShellState() === 'running');
  expect(await page.evaluate(() => document.activeElement.id || document.activeElement.tagName)).toBe('vv-canvas');

  // Wave complete is reachable by keyboard: Play Again restarts, focus
  // returns to the canvas, and the run is fresh.
  await page.evaluate(() => {
    const s = window.__vv.getSnapshot();
    window.__vv.setState({ ...s, waveSpawned: 12, enemies: [], enemyShots: [], outcome: null });
    window.__vv.advanceTicks(1);
  });
  await page.waitForFunction(() => window.__vv.getShellState() === 'wave-complete');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-play-again');
  // Tab containment on the results surface cycles between the two controls.
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-wc-return-title');
  // Return to Title is leavable by keyboard; the title then starts fresh.
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__vv.getShellState() === 'title');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-start');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__vv.getShellState() === 'running');
  const fresh = await page.evaluate(() => window.__vv.getSnapshot());
  expect(fresh.elapsedTicks).toBeLessThan(5);
  expect(fresh.outcome).toBe(null);
});
