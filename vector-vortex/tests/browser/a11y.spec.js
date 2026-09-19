// Vector Vortex D3 validation: a11y + no off-origin + no image/audio.

import { test, expect } from '@playwright/test';

test('canvas has aria-label, role=img, and adjacent objective/status', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const a11y = await page.evaluate(() => {
    const c = document.getElementById('vv-canvas');
    const obj = document.querySelector('[data-testid="vv-objective"]');
    const status = document.querySelector('[data-testid="vv-current-status"]');
    return {
      ariaLabel: c.getAttribute('aria-label'),
      role: c.getAttribute('role'),
      hasObjective: !!obj,
      hasStatus: !!status
    };
  });
  expect(a11y.ariaLabel).toBeTruthy();
  expect(a11y.role).toBe('img');
  expect(a11y.hasObjective).toBe(true);
  expect(a11y.hasStatus).toBe(true);
});

test('no <img> and no <audio> elements on the page', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const counts = await page.evaluate(() => ({
    img: document.querySelectorAll('img').length,
    audio: document.querySelectorAll('audio').length,
    video: document.querySelectorAll('video').length
  }));
  expect(counts.img).toBe(0);
  expect(counts.audio).toBe(0);
  expect(counts.video).toBe(0);
});

test('all network requests are same-origin (the baseURL host)', async ({ page, baseURL }) => {
  const requests = [];
  page.on('request', (req) => requests.push(req.url()));
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  // Run a few interactions to provoke any lazy requests.
  await page.evaluate(() => window.__vv.advanceTicks(10));
  expect(requests.length).toBeGreaterThan(0);
  for (const u of requests) {
    expect(u.startsWith(baseURL)).toBe(true);
  }
});

test('focus-visible CSS exists for the pause button', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.locator('#vv-pause').focus();
  const visible = await page.evaluate(() => {
    const b = document.getElementById('vv-pause');
    b.focus();
    // The button is focused; check that it has a non-zero outline.
    const cs = window.getComputedStyle(b);
    return { outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle };
  });
  // Either the rule is matched via :focus-visible and the browser applies
  // it, or the rule is unconditional via :focus. Either way outline-width
  // is non-zero.
  expect(visible.outlineStyle).not.toBe('none');
  expect(visible.outlineWidth).not.toBe('0px');
});
