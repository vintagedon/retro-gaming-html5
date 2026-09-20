// Vector Vortex HUD validation (Spec 03 gate 1 rewrite).
// Every HUD value is checked against the same core snapshot after shots,
// hits, and a life loss; the wide horizontal time bar is removed and the
// playfield owns the viewport; geometry probes at the four supported
// viewports keep the HUD and actions inside the viewport with keyboard- and
// pointer-operable actions and no horizontal scroll.
//
// Determinism: window.__vv.disableFrameRunner is set before boot so no
// real-time frame advances the simulation; every tick advance goes through
// the tracked seam. Scenario staging uses the seam's setState to place an
// otherwise-live core at a chosen elapsed tick; the core's own rules then
// produce the outcome.

import { test, expect } from '@playwright/test';
import { startRun } from './helpers.js';

const VIEWPORTS = [
  { width: 1024, height: 576, label: '1024x576' },
  { width: 1280, height: 720, label: '1280x720' },
  { width: 1440, height: 900, label: '1440x900' },
  { width: 1920, height: 1080, label: '1920x1080' }
];

// Seed 1: the wave director's first spawn is lane 15 at tick 90 (verified
// against the tracked core). Firing from lane 15 across tick 90 lands a hit.

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await startRun(page);
}

function stage(page, overrides) {
  return page.evaluate((o) => {
    const snap = window.__vv.getSnapshot();
    window.__vv.setState({
      ...snap,
      paused: false,
      outcome: null,
      cooldown: 0,
      heldInput: { left: false, right: false, fire: false },
      ...o
    });
    return window.__vv.getSnapshot();
  }, overrides);
}

async function readHud(page) {
  return page.evaluate(() => {
    const glyphs = [...document.querySelectorAll('.vv-life')];
    return {
      score: document.querySelector('[data-testid="vv-score"]').textContent,
      best: document.querySelector('[data-testid="vv-best"]').textContent,
      status: document.querySelector('[data-testid="vv-current-status"]').textContent,
      activeGlyphs: glyphs.filter(g => !g.classList.contains('vv-life--spent')).length,
      glyphCount: glyphs.length
    };
  });
}

test('fresh run: three life glyphs, BEST renders from provider', async ({ page }) => {
  await page.addInitScript(() => {
    window.__vv = Object.assign(window.__vv || {}, {
      disableFrameRunner: true,
      bestProvider: () => 4321
    });
  });
  await boot(page);
  const hud = await readHud(page);
  const snap = await page.evaluate(() => window.__vv.getSnapshot());

  expect(hud.activeGlyphs).toBe(3);
  expect(hud.glyphCount).toBe(3);
  expect(hud.best).toBe('4321');
  expect(hud.score).toBe(String(snap.score));
  expect(hud.status).toBe('running');
});

test('scripted run: shots, a deterministic hit, and a life loss all match the same snapshot', async ({ page }) => {
  await page.addInitScript(() => {
    window.__vv = Object.assign(window.__vv || {}, { disableFrameRunner: true });
  });
  await boot(page);

  // Move to the seeded first-spawn lane before the shot sequence (seed 1
  // draws lane 15 at tick 90).
  await page.evaluate(() => window.__vv.setLane(15));
  // Hold fire across the tick-90 spawn so a shot crosses the Crawler.
  await page.evaluate(() => window.__vv.setFire(true));
  await page.evaluate(() => window.__vv.advanceTicks(130));
  await page.evaluate(() => window.__vv.setFire(false));

  let snap = await page.evaluate(() => window.__vv.getSnapshot());
  let hud = await readHud(page);
  expect(snap.kills).toBeGreaterThanOrEqual(1);
  expect(snap.hits).toBeGreaterThanOrEqual(1);
  expect(hud.score).toBe(String(snap.score));

  // Let the second spawn (tick 240, lane 0) reach the rim untouched.
  await page.evaluate(() => window.__vv.advanceTicks(820));
  snap = await page.evaluate(() => window.__vv.getSnapshot());
  hud = await readHud(page);
  expect(snap.lives).toBe(2);
  expect(hud.activeGlyphs).toBe(2);
  expect(hud.status).toBe('running');
});

test('a lost run flips the status mirror and spends every life glyph', async ({ page }) => {
  await page.addInitScript(() => {
    window.__vv = Object.assign(window.__vv || {}, { disableFrameRunner: true });
  });
  await boot(page);

  await stage(page, {
    elapsedTicks: 5000,
    lives: 1,
    enemies: [{ id: 9001, lane: 3, depth: 0.0008, hp: 1 }],
    shots: [],
    breaches: [],
    damageGraceRemaining: 0
  });
  await page.evaluate(() => window.__vv.advanceTicks(2));
  const snap = await page.evaluate(() => window.__vv.getSnapshot());
  const hud = await readHud(page);

  expect(snap.outcome).toBe('game-over');
  expect(snap.lives).toBe(0);
  expect(hud.activeGlyphs).toBe(0);
  expect(hud.status).toBe('game-over');
});

for (const v of VIEWPORTS) {
  test(`HUD geometry at ${v.label}: inside the viewport, no horizontal scroll, actions operable`, async ({ page }) => {
    await page.setViewportSize({ width: v.width, height: v.height });
    await boot(page);

    const layout = await page.evaluate(() => {
      const innerW = window.innerWidth;
      const innerH = window.innerHeight;
      const rect = sel => {
        const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom, right: r.right };
      };
      const required = {
        hudTop: rect('[data-testid="vv-hud-top"]'),
        score: rect('[data-testid="vv-score"]'),
        best: rect('[data-testid="vv-best"]'),
        canvas: rect('#vv-canvas'),
        hudBottom: rect('[data-testid="vv-hud-bottom"]'),
        lives: rect('[data-testid="vv-lives"]'),
        status: rect('[data-testid="vv-current-status"]'),
        pause: rect('#vv-pause'),
        restart: rect('#vv-restart')
      };
      const inside = b => b.w > 0 && b.h > 0 && b.x >= 0 && b.y >= 0 && b.right <= innerW && b.bottom <= innerH;
      const results = {};
      for (const [name, b] of Object.entries(required)) {
        results[name] = { ok: inside(b), box: b };
      }
      return {
        innerW, innerH,
        scrollW: document.documentElement.scrollWidth,
        results
      };
    });

    expect(layout.scrollW).toBeLessThanOrEqual(layout.innerW);
    for (const [name, r] of Object.entries(layout.results)) {
      expect(r.ok, `${name} bounds inside viewport at its viewport`).toBe(true);
    }

    await page.screenshot({ path: `test-results/hud-geometry-${v.label}.png`, fullPage: true });

    // Actions remain operable by pointer and by keyboard at this viewport.
    await page.click('#vv-pause');
    expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(true);
    await page.click('#vv-resume');
    expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(false);
    await page.locator('#vv-pause').focus();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(true);
    // The pause handler moves focus into the dialog (shell contract), so
    // the resuming activation uses the dialog's Resume control.
    await page.locator('#vv-resume').focus();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(false);
  });
}
