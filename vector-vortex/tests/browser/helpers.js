// Shared browser-test helper for the Spec 02 shell lifecycle: the game
// boots at the title state, so a run must be started before any journey
// that assumes the running state.

import { expect } from '@playwright/test';

export async function startRun(page) {
  await page.locator('#vv-start').click();
  await expect(page.evaluate(() => window.__vv.getShellState()), 'shell reaches running').resolves.toBe('running');
  await page.locator('#vv-canvas').focus();
}
