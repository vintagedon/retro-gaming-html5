// Vector Vortex D3 validation: smoke test — page loads, status visible, seam works.

import { test, expect } from '@playwright/test';

test('smoke: page loads and all status fields are present', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const ids = ['vv-score', 'vv-best', 'vv-lives', 'vv-wave', 'vv-current-status'];
  for (const id of ids) {
    const el = await page.locator(`[data-testid="${id}"]`).count();
    expect(el).toBe(1);
  }
});
