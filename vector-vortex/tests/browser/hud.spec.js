// Vector Vortex Spec 02 deliverable 2 validation: the frozen DOM HUD.
// Every HUD value is checked against the same core snapshot after shots,
// hits, a life loss, final-minute entry, survival, and loss; the depletion
// meter hits its Warning threshold at exactly 3,600 remaining ticks and
// zero at elapsed tick 18,000 including a final-tick loss; a loss before
// the final tick freezes the remaining value; and geometry probes at the
// four supported viewports keep the HUD, playfield, and actions visible,
// ordered, and inside the viewport with keyboard- and pointer-operable
// actions.
//
// Determinism: window.__vv.disableFrameRunner is set before boot so no
// real-time frame advances the simulation; every tick advance goes through
// the tracked seam. Scenario staging uses the seam's setState to place an
// otherwise-live core at a chosen elapsed tick; the core's own rules then
// produce the outcome.

import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { width: 1024, height: 576, label: '1024x576' },
  { width: 1280, height: 720, label: '1280x720' },
  { width: 1440, height: 900, label: '1440x900' },
  { width: 1920, height: 1080, label: '1920x1080' }
];

// Seed 1: the director's first spawn is lane 15 at tick 59 (verified against
// the tracked core). Firing from lane 15 across tick 59 guarantees a hit.
const HIT_SEED_LANE = 15;

async function boot(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
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
    const meter = document.getElementById('vv-meter');
    const glyphs = [...document.querySelectorAll('.vv-life')];
    return {
      score: document.querySelector('[data-testid="vv-score"]').textContent,
      best: document.querySelector('[data-testid="vv-best"]').textContent,
      kills: document.querySelector('[data-testid="vv-kills"]').textContent,
      accuracy: document.querySelector('[data-testid="vv-accuracy"]').textContent,
      status: document.querySelector('[data-testid="vv-current-status"]').textContent,
      meterValue: meter.style.getPropertyValue('--gc-meter-value'),
      meterNow: meter.getAttribute('aria-valuenow'),
      meterMax: meter.getAttribute('aria-valuemax'),
      meterText: meter.getAttribute('aria-valuetext'),
      meterWarning: meter.classList.contains('vv-meter--warning'),
      meterFill: getComputedStyle(meter.querySelector('.gc-meter__fill')).backgroundColor,
      meterFillGeometry: 'rgb(94, 231, 255)',
      meterFillWarning: 'rgb(255, 191, 71)',
      activeGlyphs: glyphs.filter(g => !g.classList.contains('vv-life--spent')).length,
      glyphCount: glyphs.length
    };
  });
}

test('fresh run: meter starts full, ACC shows --, three life glyphs, BEST renders from provider', async ({ page }) => {
  await page.addInitScript(() => {
    window.__vv = Object.assign(window.__vv || {}, {
      disableFrameRunner: true,
      bestProvider: () => 4321
    });
  });
  await boot(page);
  const hud = await readHud(page);
  const snap = await page.evaluate(() => window.__vv.getSnapshot());

  expect(snap.remainingTicks).toBe(18000);
  expect(hud.meterValue).toBe('100%');
  expect(hud.meterNow).toBe('18000');
  expect(hud.meterMax).toBe('18000');
  expect(hud.meterText).toBe('05:00 remaining');
  expect(hud.meterWarning).toBe(false);
  expect(hud.meterFill).toBe(hud.meterFillGeometry);
  expect(hud.accuracy).toBe('ACC --');
  expect(hud.activeGlyphs).toBe(3);
  expect(hud.glyphCount).toBe(3);
  expect(hud.best).toBe('4321');
  expect(hud.score).toBe(String(snap.score));
  expect(hud.kills).toBe(String(snap.kills));
  expect(hud.status).toBe('running');
});

test('scripted run: shots, a deterministic hit, and a life loss all match the same snapshot', async ({ page }) => {
  await page.addInitScript(() => {
    window.__vv = Object.assign(window.__vv || {}, { disableFrameRunner: true });
  });
  await boot(page);

  // Move to the seeded first-spawn lane before the shot sequence.
  await page.evaluate(l => window.__vv.setLane(l), HIT_SEED_LANE);
  // Hold fire across the tick-59 spawn so a shot crosses the Crawler.
  await page.evaluate(() => window.__vv.setFire(true));
  await page.evaluate(() => window.__vv.advanceTicks(100));
  await page.evaluate(() => window.__vv.setFire(false));

  let snap = await page.evaluate(() => window.__vv.getSnapshot());
  let hud = await readHud(page);
  expect(snap.kills).toBeGreaterThanOrEqual(1);
  expect(snap.hits).toBeGreaterThanOrEqual(1);
  expect(hud.score).toBe(String(snap.score));
  expect(hud.kills).toBe(String(snap.kills));
  expect(hud.accuracy).toBe(`ACC ${snap.accuracyPercent}%`);

  // Let the second spawn (tick 119, lane 0) reach the rim untouched.
  await page.evaluate(() => window.__vv.advanceTicks(700));
  snap = await page.evaluate(() => window.__vv.getSnapshot());
  hud = await readHud(page);
  expect(snap.lives).toBe(2);
  expect(hud.activeGlyphs).toBe(2);
  expect(hud.status).toBe('running');
  // A loss has not happened, so nothing is frozen yet; the meter tracks remaining.
  expect(hud.meterNow).toBe(String(snap.remainingTicks));
});

test('depletion meter switches to Warning at exactly 3,600 remaining ticks', async ({ page }) => {
  await page.addInitScript(() => {
    window.__vv = Object.assign(window.__vv || {}, { disableFrameRunner: true });
  });
  await boot(page);

  await stage(page, { elapsedTicks: 14398, lives: 3, enemies: [], shots: [], breaches: [], damageGraceRemaining: 0 });
  await page.evaluate(() => window.__vv.advanceTicks(1));
  let hud = await readHud(page);
  expect(hud.meterNow).toBe('3601');
  expect(hud.meterWarning).toBe(false);
  expect(hud.meterFill).toBe(hud.meterFillGeometry);

  await page.evaluate(() => window.__vv.advanceTicks(1));
  hud = await readHud(page);
  expect(hud.meterNow).toBe('3600');
  expect(hud.meterWarning).toBe(true);
  expect(hud.meterFill).toBe(hud.meterFillWarning);
  expect(hud.meterText).toBe('01:00 remaining');
});

test('survived run: meter reaches zero at elapsed tick 18,000 with cash-out shown', async ({ page }) => {
  await page.addInitScript(() => {
    window.__vv = Object.assign(window.__vv || {}, { disableFrameRunner: true });
  });
  await boot(page);

  await stage(page, { elapsedTicks: 17998, lives: 3, enemies: [], shots: [], breaches: [], damageGraceRemaining: 0 });
  await page.evaluate(() => window.__vv.advanceTicks(2));
  const snap = await page.evaluate(() => window.__vv.getSnapshot());
  const hud = await readHud(page);

  expect(snap.outcome).toBe('survived');
  expect(snap.elapsedTicks).toBe(18000);
  expect(snap.remainingTicks).toBe(0);
  expect(snap.score).toBeGreaterThanOrEqual(5000);
  expect(hud.meterValue).toBe('0%');
  expect(hud.meterNow).toBe('0');
  expect(hud.status).toBe('survived');
  expect(hud.score).toBe(String(snap.score));
});

test('loss before the final tick freezes the remaining value rather than emptying it', async ({ page }) => {
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

  expect(snap.outcome).toBe('lost');
  expect(snap.lives).toBe(0);
  expect(snap.elapsedTicks).toBe(5001);
  expect(snap.remainingTicks).toBe(12999);
  expect(hud.meterNow).toBe('12999');
  expect(hud.meterValue).not.toBe('0%');
  expect(hud.activeGlyphs).toBe(0);
  expect(hud.status).toBe('lost');
});

test('final-tick breach is lethal and the meter still reads zero at 18,000', async ({ page }) => {
  await page.addInitScript(() => {
    window.__vv = Object.assign(window.__vv || {}, { disableFrameRunner: true });
  });
  await boot(page);

  await stage(page, {
    elapsedTicks: 17999,
    lives: 1,
    enemies: [{ id: 9002, lane: 5, depth: 0.0008, hp: 1 }],
    shots: [],
    breaches: [],
    damageGraceRemaining: 0
  });
  await page.evaluate(() => window.__vv.advanceTicks(1));
  const snap = await page.evaluate(() => window.__vv.getSnapshot());
  const hud = await readHud(page);

  expect(snap.outcome).toBe('lost');
  expect(snap.elapsedTicks).toBe(18000);
  expect(snap.remainingTicks).toBe(0);
  expect(hud.meterValue).toBe('0%');
  expect(hud.status).toBe('lost');
});

for (const v of VIEWPORTS) {
  test(`HUD geometry at ${v.label}: ordered, inside the viewport, actions operable`, async ({ page }) => {
    await page.setViewportSize({ width: v.width, height: v.height });
    await boot(page);

    const layout = await page.evaluate(() => {
      const innerW = window.innerWidth;
      const innerH = window.innerHeight;
      const rect = sel => {
        const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, top: r.top, w: r.width, h: r.height, bottom: r.bottom, right: r.right };
      };
      const required = {
        hudTop: rect('[data-testid="vv-hud-top"]'),
        score: rect('[data-testid="vv-score"]'),
        best: rect('[data-testid="vv-best"]'),
        meter: rect('[data-testid="vv-meter"]'),
        canvas: rect('#vv-canvas'),
        hudBottom: rect('[data-testid="vv-hud-bottom"]'),
        lives: rect('[data-testid="vv-lives"]'),
        kills: rect('[data-testid="vv-kills"]'),
        accuracy: rect('[data-testid="vv-accuracy"]'),
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
        results,
        topOrder: required.hudTop.bottom <= required.canvas.top,
        bottomOrder: required.canvas.bottom <= required.hudBottom.top,
        actionsOrder: required.hudBottom.bottom <= rect('#vv-controls-buttons').top
      };
    });

    expect(layout.scrollW).toBeLessThanOrEqual(layout.innerW);
    for (const [name, r] of Object.entries(layout.results)) {
      expect(r.ok, `${name} bounds inside viewport at its viewport`).toBe(true);
    }
    expect(layout.topOrder).toBe(true);
    expect(layout.bottomOrder).toBe(true);
    expect(layout.actionsOrder).toBe(true);

    await page.screenshot({ path: `test-results/hud-geometry-${v.label}.png`, fullPage: true });

    // Actions remain operable by pointer and by keyboard at this viewport.
    await page.click('#vv-pause');
    expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(true);
    await page.click('#vv-pause');
    expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(false);
    await page.locator('#vv-pause').focus();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(true);
    // The pause handler returns focus to the game surface (01c contract),
    // so the resuming activation re-focuses the control first.
    await page.locator('#vv-pause').focus();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => window.__vv.getSnapshot().paused)).toBe(false);
  });
}
