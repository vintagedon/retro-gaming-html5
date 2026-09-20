// Vector Vortex Spec 02 deliverable 3 validation: defensive persistence
// and the settings surface. Reload fixtures for missing, corrupt,
// wrong-shape, out-of-range, unavailable, and valid storage all reach an
// operable title; Start actually activates; a completed run's best score
// survives a reload; valid preferences survive; in-progress state never
// persists. The settings surface has exactly Audio, Display, and Controls,
// each activated by keyboard and pointer, with no forbidden surfaces.

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

const KEY = 'retrohtml5.vector-vortex.v1';

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
}

function seedStorage(value) {
  return JSON.stringify(value);
}

test.describe('storage fixtures reach an operable title', () => {
  const fixtures = [
    ['missing', null],
    ['corrupt', 'not-json-at-all'],
    ['wrong-shape-string', JSON.stringify('a string')],
    ['wrong-shape-array', JSON.stringify([1, 2, 3])],
    ['wrong-version', JSON.stringify({ version: 2, preferences: {}, bestScore: 5 })],
    ['out-of-range', JSON.stringify({ version: 1, preferences: { muted: 'yes', volume: 9000, motion: 'sideways' }, bestScore: -5 })]
  ];

  for (const [name, raw] of fixtures) {
    test(`fixture ${name} reaches an operable title with default preferences`, async ({ page }) => {
      await page.addInitScript(({ k, v }) => {
        if (v !== null) window.localStorage.setItem(k, v);
      }, { k: KEY, v: raw });
      await boot(page);
      expect(await page.evaluate(() => window.__vv.getShellState())).toBe('title');

      // Defaults are active: volume readout 80, System motion pressed.
      await page.locator('#vv-title-settings').click();
      await page.waitForFunction(() => window.__vv.getShellState() === 'settings');
      expect(await page.locator('#vv-volume-value').textContent()).toBe('80');
      expect(await page.locator('#vv-motion-system').getAttribute('aria-pressed')).toBe('true');
      await page.locator('#vv-settings-close').click();

      // Start is actually activated and a run is completed.
      await page.locator('#vv-start').click();
      await page.waitForFunction(() => window.__vv.getShellState() === 'running');
      await page.evaluate(() => window.__vv.advanceTicks(18000));
      await page.waitForFunction(() => window.__vv.getShellState() === 'ended');
      expect(await page.evaluate(() => window.__vv.getSnapshot().outcome)).toBe('game-over');
    });
  }

  test('unavailable storage reaches an operable title and stays operable through a run', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() { throw new DOMException('storage denied', 'SecurityError'); }
      });
    });
    await boot(page);
    expect(await page.evaluate(() => window.__vv.getShellState())).toBe('title');
    await page.locator('#vv-start').click();
    await page.waitForFunction(() => window.__vv.getShellState() === 'running');
    await page.evaluate(() => window.__vv.advanceTicks(18000));
    await page.waitForFunction(() => window.__vv.getShellState() === 'ended');
    // The persistence failure is silent: no error surfaced, game complete.
    expect(await page.evaluate(() => document.querySelector('[data-testid="vv-end-outcome"]').textContent)).toBe('Game Over');
  });
});

test('a completed run writes its best score and it survives a reload; valid preferences survive too', async ({ page }) => {
  await page.addInitScript(({ k }) => {
    // Seed only when absent: a reload must not clobber what the game
    // persisted, which is exactly what the reload assertions check.
    if (!window.localStorage.getItem(k)) {
      window.localStorage.setItem(k, JSON.stringify({
        version: 1,
        preferences: { muted: false, volume: 37, motion: 'reduced' },
        bestScore: 500
      }));
    }
  }, { k: KEY });
  await boot(page);

  // Valid preferences are active after load.
  await page.locator('#vv-title-settings').click();
  await page.waitForFunction(() => window.__vv.getShellState() === 'settings');
  expect(await page.locator('#vv-volume-value').textContent()).toBe('37');
  expect(await page.locator('#vv-motion-reduced').getAttribute('aria-pressed')).toBe('true');
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-vv-motion'))).toBe('reduced');
  await page.locator('#vv-settings-close').click();

  // HUD BEST renders the stored best through the provider.
  expect(await page.locator('[data-testid="vv-best"]').textContent()).toBe('500');

  // Complete a run whose score beats the stored best: exhaust the wave
  // budget with an empty roster, staging kills for the score.
  await page.locator('#vv-start').click();
  await page.waitForFunction(() => window.__vv.getShellState() === 'running');
  await page.evaluate(() => {
    const s = window.__vv.getSnapshot();
    window.__vv.setState({
      ...s,
      waveSpawned: 12,
      lives: 3,
      kills: 7,
      score: 700,
      enemies: [],
      shots: [],
      enemyShots: [],
      breaches: [],
      damageGraceRemaining: 0
    });
  });
  await page.evaluate(() => window.__vv.advanceTicks(1));
  await page.waitForFunction(() => window.__vv.getShellState() === 'ended');
  const finalScore = await page.evaluate(() => window.__vv.getSnapshot().score);
  expect(finalScore).toBeGreaterThanOrEqual(500);

  // Reload: best and preferences survive.
  await page.reload();
  await boot(page);
  expect(await page.locator('[data-testid="vv-best"]').textContent()).toBe(String(finalScore));
  await page.locator('#vv-title-settings').click();
  await page.waitForFunction(() => window.__vv.getShellState() === 'settings');
  expect(await page.locator('#vv-volume-value').textContent()).toBe('37');
});

test('in-progress run state never persists', async ({ page }) => {
  await boot(page);
  await page.locator('#vv-start').click();
  await page.waitForFunction(() => window.__vv.getShellState() === 'running');
  await page.evaluate(() => {
    window.__vv.setFire(true);
    window.__vv.advanceTicks(500);
    window.__vv.setFire(false);
  });
  const raw = await page.evaluate((k) => window.localStorage.getItem(k), KEY);
  if (raw !== null) {
    const parsed = JSON.parse(raw);
    expect(Object.keys(parsed).sort()).toEqual(['bestScore', 'preferences', 'version']);
    expect(parsed.bestScore).toBe(0);
  }
  // A reload shows a fresh title, not a restored run.
  await page.reload();
  await boot(page);
  expect(await page.evaluate(() => window.__vv.getShellState())).toBe('title');
  expect(await page.evaluate(() => window.__vv.getSnapshot().elapsedTicks)).toBe(0);
});

test('settings has exactly Audio, Display, and Controls; tabs activate by keyboard and pointer', async ({ page }) => {
  await boot(page);
  await page.locator('#vv-title-settings').click();
  await page.waitForFunction(() => window.__vv.getShellState() === 'settings');

  const tabs = await page.evaluate(() => Array.from(document.querySelectorAll('[role="tab"]')).map(t => t.id));
  expect(tabs).toEqual(['vv-tab-audio', 'vv-tab-display', 'vv-tab-controls']);

  // Pointer activation.
  await page.locator('#vv-tab-display').click();
  expect(await page.evaluate(() => document.getElementById('vv-panel-display').getAttribute('data-vv-panel'))).toBe('active');
  expect(await page.evaluate(() => document.getElementById('vv-panel-audio').getAttribute('data-vv-panel'))).toBe('hidden');

  // Keyboard activation: arrow keys move the roving focus and activate.
  await page.locator('#vv-tab-display').focus();
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-tab-controls');
  expect(await page.evaluate(() => document.getElementById('vv-panel-controls').getAttribute('data-vv-panel'))).toBe('active');
  await page.keyboard.press('Home');
  expect(await page.evaluate(() => document.activeElement.id)).toBe('vv-tab-audio');
  expect(await page.evaluate(() => document.getElementById('vv-panel-audio').getAttribute('data-vv-panel'))).toBe('active');

  // The Controls tab is a read-only map: no rebinding controls exist.
  await page.locator('#vv-tab-controls').click();
  const rebindingControls = await page.evaluate(() => {
    const panel = document.getElementById('vv-panel-controls');
    return panel.querySelectorAll('button, input, select').length;
  });
  expect(rebindingControls).toBe(0);

  // Reset to defaults restores the defaults and persists them.
  await page.locator('#vv-tab-audio').click();
  await page.locator('#vv-volume').fill('10');
  await page.locator('#vv-volume').dispatchEvent('change');
  await page.locator('#vv-reset-defaults').click();
  expect(await page.locator('#vv-volume-value').textContent()).toBe('80');
  const stored = await page.evaluate((k) => JSON.parse(window.localStorage.getItem(k)), KEY);
  expect(stored.preferences.volume).toBe(80);
});

test('no save, import/export, rebinding, account, telemetry, or progression surface appears', async ({ page }) => {
  await boot(page);
  await page.locator('#vv-title-settings').click();
  await page.waitForFunction(() => window.__vv.getShellState() === 'settings');
  const findings = await page.evaluate(() => {
    const dialog = document.querySelector('[data-vv-surface="settings"]');
    const forbidden = /save|import|export|rebind|account|telemetry|progression|profile|login|sign in/i;
    const offenders = [];
    for (const el of dialog.querySelectorAll('button, input, select, a, [role="tab"]')) {
      const text = `${el.textContent ?? ''} ${el.getAttribute('aria-label') ?? ''}`;
      if (forbidden.test(text)) offenders.push(text.trim());
    }
    return offenders;
  });
  expect(findings).toEqual([]);
});
