// Vector Vortex D3 validation: all four supported viewports + DPR 1 and DPR 2
// keep the complete tube, status, and controls visible without overlap or
// horizontal scrolling, and the sub-960 viewport warning is shown by the
// stylesheet's media query (display toggling), with no JavaScript or markup
// class involved (D2.7).

import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { width: 1024, height: 576, label: '1024x576' },
  { width: 1280, height: 720, label: '1280x720' },
  { width: 1440, height: 900, label: '1440x900' },
  { width: 1920, height: 1080, label: '1920x1080' }
];

for (const v of VIEWPORTS) {
  test(`viewport ${v.label}: no horizontal scroll, status + canvas visible`, async ({ page }) => {
    await page.setViewportSize({ width: v.width, height: v.height });
    await page.goto('/');
    await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
    const layout = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const status = document.getElementById('vv-status');
      const canvas = document.getElementById('vv-canvas');
      const pause = document.getElementById('vv-pause');
      const restart = document.getElementById('vv-restart');
      return {
        docW, winW,
        statusVisible: status && status.getBoundingClientRect().width > 0,
        canvasVisible: canvas && canvas.getBoundingClientRect().width > 0,
        pauseVisible: pause && pause.getBoundingClientRect().width > 0,
        restartVisible: restart && restart.getBoundingClientRect().width > 0
      };
    });
    expect(layout.docW).toBeLessThanOrEqual(layout.winW);
    expect(layout.statusVisible).toBe(true);
    expect(layout.canvasVisible).toBe(true);
    expect(layout.pauseVisible).toBe(true);
    expect(layout.restartVisible).toBe(true);
  });
}

test('DPR 1 probe: tube, status, and controls have no overlap and are not off-screen', async ({ browser }) => {
  const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1024, height: 576 } });
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const layout = await page.evaluate(() => {
    const winW = window.innerWidth;
    const docW = document.documentElement.scrollWidth;
    const status = document.getElementById('vv-status');
    const canvas = document.getElementById('vv-canvas');
    const pause = document.getElementById('vv-pause');
    const restart = document.getElementById('vv-restart');
    const a = status.getBoundingClientRect();
    const b = canvas.getBoundingClientRect();
    const c = pause.getBoundingClientRect();
    const d = restart.getBoundingClientRect();
    return {
      docW, winW,
      statusBox: { x: a.x, y: a.y, w: a.width, h: a.height },
      canvasBox: { x: b.x, y: b.y, w: b.width, h: b.height },
      pauseBox: { x: c.x, y: c.y, w: c.width, h: c.height },
      restartBox: { x: d.x, y: d.y, w: d.width, h: d.height }
    };
  });
  expect(layout.docW).toBeLessThanOrEqual(layout.winW);
  for (const k of ['statusBox', 'canvasBox', 'pauseBox', 'restartBox']) {
    const b = layout[k];
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.w).toBeLessThanOrEqual(layout.winW);
    expect(b.w).toBeGreaterThan(0);
  }
  expect(layout.statusBox.y + layout.statusBox.h).toBeLessThanOrEqual(layout.canvasBox.y);
  expect(layout.canvasBox.y + layout.canvasBox.h).toBeLessThanOrEqual(layout.pauseBox.y);
  await context.close();
});

test('below 960x540: warning is visible; above 960 it is not (D2.7)', async ({ browser }) => {
  const ctxSmall = await browser.newContext({ viewport: { width: 800, height: 480 } });
  const pageSmall = await ctxSmall.newPage();
  await pageSmall.goto('/');
  await pageSmall.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const visibleSmall = await pageSmall.evaluate(() => {
    const w = document.querySelector('[data-testid="vv-viewport-warning"]');
    if (!w) return false;
    const cs = window.getComputedStyle(w);
    return cs.display !== 'none' && w.getBoundingClientRect().width > 0;
  });
  expect(visibleSmall).toBe(true);
  await ctxSmall.close();
  const ctxWide = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const pageWide = await ctxWide.newPage();
  await pageWide.goto('/');
  await pageWide.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const visibleWide = await pageWide.evaluate(() => {
    const w = document.querySelector('[data-testid="vv-viewport-warning"]');
    if (!w) return false;
    const cs = window.getComputedStyle(w);
    return cs.display !== 'none' && w.getBoundingClientRect().width > 0;
  });
  expect(visibleWide).toBe(false);
  await ctxWide.close();
});