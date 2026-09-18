import { test, expect } from '@playwright/test';

test('ordinary keyboard input drives the running frame loop', async ({ page }) => {
  const problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(msg.text());
  });
  page.on('pageerror', (err) => problems.push(String(err)));

  await page.goto('/game/index.html');
  await page.evaluate(() => window.__cl.stop());
  await page.evaluate(() => window.__cl.reset(20260918));
  await page.evaluate(() => window.__cl.start());
  await expect
    .poll(() => page.evaluate(() => window.__cl.getSnapshot().elapsedTicks), { timeout: 4000 })
    .toBeGreaterThan(10);

  const startAngle = await page.evaluate(() => window.__cl.getSnapshot().angle);
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(350);
  await page.keyboard.up('ArrowLeft');
  const leftAngle = await page.evaluate(() => window.__cl.getSnapshot().angle);
  expect(leftAngle).toBeLessThan(startAngle);

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowRight');
  const rightAngle = await page.evaluate(() => window.__cl.getSnapshot().angle);
  expect(rightAngle).toBeGreaterThan(leftAngle);

  await page.evaluate(() => window.__cl.input.setThrustNotch(0));
  await page.keyboard.press('KeyW');
  await expect
    .poll(() => page.evaluate(() => window.__cl.getSnapshot().thrustLevel))
    .toBe(0.25);
  await page.keyboard.press('KeyW');
  await expect
    .poll(() => page.evaluate(() => window.__cl.getSnapshot().thrustLevel))
    .toBe(0.5);
  await page.keyboard.press('ArrowUp');
  await expect
    .poll(() => page.evaluate(() => window.__cl.getSnapshot().thrustLevel))
    .toBe(0.75);
  await page.keyboard.press('ShiftLeft');
  await expect
    .poll(() => page.evaluate(() => window.__cl.getSnapshot().thrustLevel))
    .toBe(1);
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.querySelector('[data-hud="thrust-meter"]').style.getPropertyValue('--gc-meter-value')
      )
    )
    .toBe('100.00%');
  await page.keyboard.press('KeyS');
  await expect
    .poll(() => page.evaluate(() => window.__cl.getSnapshot().thrustLevel))
    .toBe(0.75);
  await page.keyboard.press('KeyX');
  await expect
    .poll(() => page.evaluate(() => window.__cl.getSnapshot().thrustLevel))
    .toBe(0);

  await page.keyboard.press('KeyP');
  await expect
    .poll(() => page.evaluate(() => window.__cl.getSnapshot().paused))
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() => document.getElementById('overlay').hasAttribute('hidden'))
    )
    .toBe(false);
  const pausedOverlay = await page.evaluate(() => ({
    hidden: document.getElementById('overlay').hasAttribute('hidden'),
    title: document.getElementById('overlay-title').textContent
  }));
  expect(pausedOverlay.hidden).toBe(false);
  expect(pausedOverlay.title).toBe('PAUSED');
  await page.keyboard.press('KeyP');
  await expect
    .poll(() => page.evaluate(() => window.__cl.getSnapshot().paused))
    .toBe(false);

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(2200);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('ShiftLeft');
  await page.waitForTimeout(2500);
  await expect
    .poll(
      () => page.evaluate(() => window.__cl.getSnapshot().craftState),
      { timeout: 20000 }
    )
    .toBe('destroyed');

  await page.keyboard.press('KeyR');
  await expect
    .poll(() => page.evaluate(() => window.__cl.getSnapshot().craftState))
    .toBe('flying');
  const afterRetry = await page.evaluate(() => window.__cl.getSnapshot());
  expect(afterRetry.craftRemaining).toBe(2);

  await page.keyboard.press('Enter');
  await expect
    .poll(() => page.evaluate(() => window.__cl.getSnapshot().craftRemaining))
    .toBe(3);
  const restarted = await page.evaluate(() => window.__cl.getSnapshot());
  expect(restarted.elapsedTicks).toBeLessThan(120);
  expect(restarted.outcome).toBe(null);

  expect(problems).toEqual([]);
});
