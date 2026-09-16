// Vector Vortex D3 validation: Canvas save/restore balance at DPR 2.
// Named mutation: window.__vv.skipOneRestore = true must unbalance the stack.

import { test, expect } from '@playwright/test';

function readTransform(ctx) {
  // Chromium's DOMMatrix exposes the composed transform via named
  // properties (m11..m42 and a..f), not by numeric indexing.
  const t = ctx.getTransform();
  return [t.a, t.b, t.c, t.d, t.e, t.f];
}

test('saveCount === restoreCount on frame 1 and frame 30 at DPR 2', async ({ browser }) => {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.getKeyCounters === 'function');
  // Render 30 frames.
  for (let i = 0; i < 30; i++) {
    await page.evaluate(() => window.__vv.advanceTicks(0));
    await page.waitForTimeout(20);
  }
  const counters = await page.evaluate(() => window.__vv.getKeyCounters());
  // D3.6: saveCount must be strictly greater than zero (frames actually
    // rendered) AND equal to restoreCount (balanced stack).
    expect(counters.saveCount).toBeGreaterThan(0);
    expect(counters.saveCount).toBe(counters.restoreCount);
    // Compare the composed transform across two frames at DPR 2.
    const t1 = await page.evaluate(() => {
      const c = document.getElementById('vv-canvas');
      const ctx = c.getContext('2d');
      return [ctx.getTransform().a, ctx.getTransform().b, ctx.getTransform().c, ctx.getTransform().d, ctx.getTransform().e, ctx.getTransform().f];
    });
    await page.evaluate(() => window.__vv.advanceTicks(0));
    await page.waitForTimeout(20);
    const t2 = await page.evaluate(() => {
      const c = document.getElementById('vv-canvas');
      const ctx = c.getContext('2d');
      return [ctx.getTransform().a, ctx.getTransform().b, ctx.getTransform().c, ctx.getTransform().d, ctx.getTransform().e, ctx.getTransform().f];
    });
    // a (m11) and d (m22) should be the DPR; b, c, e, f should be 0.
    expect(t2[0]).toBeGreaterThan(1); // DPR > 1, so m11 > 1
    for (let i = 0; i < 6; i++) {
      expect(t1[i]).toBe(t2[i]);
    }
    await context.close();
});

test('MUTATION: skipOneRestore unbalances the save/restore counter', async ({ browser }) => {
  const context = await browser.newContext({ deviceScaleFactor: 2, viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.addInitScript(() => { window.__vv = Object.assign(window.__vv || {}, { skipOneRestore: true }); });
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.getKeyCounters === 'function');
  await page.evaluate(() => window.__vv.advanceTicks(0));
  await page.waitForTimeout(40);
  const counters = await page.evaluate(() => window.__vv.getKeyCounters());
  expect(counters.saveCount).not.toBe(counters.restoreCount);
  await context.close();
});
