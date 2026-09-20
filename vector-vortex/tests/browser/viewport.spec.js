// Vector Vortex viewport validation (Spec 03 gate 1 rewrite).
// At all four supported viewports the playfield fills the viewport and the
// HUD has nonzero bounds entirely inside it, with no horizontal scroll, at
// DPR 1 and DPR 2. The instructional chrome of the Spec 02 build (header,
// paragraphs, warning) is gone.
//
// Named mutation: a horizontal overflow (scrollWidth beyond the viewport)
// fails every per-viewport check.

import { test, expect } from '@playwright/test';
import { startRun } from './helpers.js';

const VIEWPORTS = [
  { width: 1024, height: 576, label: '1024x576' },
  { width: 1280, height: 720, label: '1280x720' },
  { width: 1440, height: 900, label: '1440x900' },
  { width: 1920, height: 1080, label: '1920x1080' }
];

for (const v of VIEWPORTS) {
  test(`viewport ${v.label}: playfield fills the viewport, HUD inside, no horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width: v.width, height: v.height });
    await page.goto('/');
    await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
    await startRun(page);
    const layout = await page.evaluate(() => {
      const innerW = window.innerWidth;
      const innerH = window.innerHeight;
      const canvas = document.getElementById('vv-canvas');
      const hudTop = document.querySelector('[data-testid="vv-hud-top"]');
      const hudBottom = document.querySelector('[data-testid="vv-hud-bottom"]');
      const box = el => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
      };
      const inside = b => b.w > 0 && b.h > 0 && b.x >= 0 && b.y >= 0 && b.right <= innerW && b.bottom <= innerH;
      return {
        scrollW: document.documentElement.scrollWidth,
        innerW, innerH,
        canvas: box(canvas),
        hudTop: box(hudTop),
        hudBottom: box(hudBottom)
      };
    });
    // No horizontal scroll at any supported viewport.
    expect(layout.scrollW).toBeLessThanOrEqual(layout.innerW);
    // The playfield fills the viewport.
    expect(layout.canvas.w).toBe(layout.innerW);
    expect(layout.canvas.h).toBe(layout.innerH);
    expect(layout.canvas.x).toBe(0);
    expect(layout.canvas.y).toBe(0);
    // The HUD has nonzero bounds entirely inside the viewport.
    for (const name of ['hudTop', 'hudBottom']) {
      const b = layout[name];
      expect(b.w, name).toBeGreaterThan(0);
      expect(b.h, name).toBeGreaterThan(0);
      expect(b.x, name).toBeGreaterThanOrEqual(0);
      expect(b.y, name).toBeGreaterThanOrEqual(0);
      expect(b.right, name).toBeLessThanOrEqual(layout.innerW);
      expect(b.bottom, name).toBeLessThanOrEqual(layout.innerH);
    }
  });
}

test('DPR 1 probe: playfield and HUD have no overlap-driven overflow and are not off-screen', async ({ browser }) => {
  const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1024, height: 576 } });
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await startRun(page);
  const layout = await page.evaluate(() => {
    const winW = window.innerWidth;
    const docW = document.documentElement.scrollWidth;
    const canvas = document.getElementById('vv-canvas').getBoundingClientRect();
    const hudTop = document.querySelector('[data-testid="vv-hud-top"]').getBoundingClientRect();
    const hudBottom = document.querySelector('[data-testid="vv-hud-bottom"]').getBoundingClientRect();
    return { docW, winW, canvas, hudTop, hudBottom };
  });
  expect(layout.docW).toBeLessThanOrEqual(layout.winW);
  for (const k of ['canvas', 'hudTop', 'hudBottom']) {
    const b = layout[k];
    expect(b.width).toBeGreaterThan(0);
    expect(b.left).toBeGreaterThanOrEqual(0);
    expect(b.right).toBeLessThanOrEqual(layout.winW);
  }
  await context.close();
});

test('the HUD renders in the shipped pixel font and stays legible at 1024x576', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 576 });
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await startRun(page);
  const probe = await page.evaluate(() => {
    const hud = document.querySelector('[data-testid="vv-hud"]');
    const score = document.querySelector('[data-testid="vv-score"]');
    const best = document.querySelector('[data-testid="vv-best"]');
    const wave = document.querySelector('[data-testid="vv-wave"]');
    const lives = document.querySelector('[data-testid="vv-lives"]');
    const size = (el) => parseFloat(getComputedStyle(el).fontSize);
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height };
    };
    return {
      hudFont: getComputedStyle(hud).fontFamily,
      scoreSize: size(score),
      bestBox: box(best),
      waveBox: box(wave),
      livesBox: box(lives),
      innerH: window.innerHeight,
      innerW: window.innerWidth
    };
  });
  expect(probe.hudFont).toContain('Owlish Pixel');
  expect(probe.scoreSize).toBeGreaterThanOrEqual(20);
  for (const b of [probe.bestBox, probe.waveBox, probe.livesBox]) {
    expect(b.w).toBeGreaterThan(0);
    expect(b.h).toBeGreaterThan(0);
  }
});
