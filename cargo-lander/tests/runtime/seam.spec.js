import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/game/index.html');
  await page.evaluate(() => window.__cl.stop());
});

test('manual advancement adds exactly the requested active ticks', async ({ page }) => {
  const state = await page.evaluate(() => {
    window.__cl.reset(424242);
    window.__cl.advanceTicks(10);
    return window.__cl.getSnapshot();
  });
  expect(state.elapsedTicks).toBe(10);

  const after = await page.evaluate(
    () =>
      new Promise((resolve) => {
        let fired = 0;
        const step = () => {
          fired += 1;
          if (fired >= 10) resolve(window.__cl.getSnapshot().elapsedTicks);
          else window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
      })
  );
  expect(after).toBe(10);
});

test('advanceTicks is rejected while the runner is running', async ({ page }) => {
  const error = await page.evaluate(async () => {
    window.__cl.start();
    try {
      window.__cl.advanceTicks(1);
      return null;
    } catch (err) {
      return String(err);
    }
  });
  expect(error).toContain('rejected');
  await page.evaluate(() => window.__cl.stop());
});

test('start resumes ordinary advancement without replaying stopped time', async ({ page }) => {
  const stoppedTicks = await page.evaluate(() => {
    window.__cl.reset(424242);
    window.__cl.advanceTicks(5);
    return window.__cl.getSnapshot().elapsedTicks;
  });
  expect(stoppedTicks).toBe(5);

  await page.evaluate(() => window.__cl.start());
  await page.waitForTimeout(500);
  const running = await page.evaluate(() => {
    const ticks = window.__cl.getSnapshot().elapsedTicks;
    window.__cl.stop();
    return ticks;
  });
  expect(running).toBeGreaterThan(5 + 12);
  expect(running).toBeLessThan(5 + 60);

  await page.evaluate(() => window.__cl.advanceTicks(3));
  const exact = await page.evaluate(() => window.__cl.getSnapshot().elapsedTicks);
  expect(exact).toBe(running + 3);
});

test('repeated start and stop calls create no duplicate runners', async ({ page }) => {
  await page.evaluate(() => {
    window.__cl.start();
    window.__cl.start();
    window.__cl.stop();
    window.__cl.stop();
    window.__cl.start();
    window.__cl.stop();
  });
  const base = await page.evaluate(() => window.__cl.getSnapshot().elapsedTicks);
  await page.waitForTimeout(250);
  const unchanged = await page.evaluate(() => window.__cl.getSnapshot().elapsedTicks);
  expect(unchanged).toBe(base);

  await page.evaluate(() => window.__cl.advanceTicks(7));
  const exact = await page.evaluate(() => window.__cl.getSnapshot().elapsedTicks);
  expect(exact).toBe(base + 7);
});

test('reset preserves the runner stopped or running mode', async ({ page }) => {
  await page.evaluate(() => window.__cl.reset(1111));
  await page.evaluate(() => window.__cl.advanceTicks(4));
  expect((await page.evaluate(() => window.__cl.getSnapshot())).elapsedTicks).toBe(4);

  await page.evaluate(() => window.__cl.start());
  const rejected = await page.evaluate(() => {
    window.__cl.reset(2222);
    try {
      window.__cl.advanceTicks(1);
      return false;
    } catch {
      return true;
    }
  });
  expect(rejected).toBe(true);
  await page.evaluate(() => window.__cl.stop());
});

test('gameplay pause stops tick advancement and resume does not replay', async ({ page }) => {
  await page.evaluate(() => {
    window.__cl.start();
    window.__cl.input.setPaused(true);
  });
  await page.waitForTimeout(300);
  const pausedTicks = await page.evaluate(() => window.__cl.getSnapshot().elapsedTicks);

  await page.evaluate(() => window.__cl.input.setPaused(false));
  const resumed = await page.evaluate(() => window.__cl.getSnapshot().elapsedTicks);
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => {
    const ticks = window.__cl.getSnapshot().elapsedTicks;
    window.__cl.stop();
    return ticks;
  });
  expect(after).toBeGreaterThan(resumed);
  expect(after - resumed).toBeLessThan(60);
  await page.evaluate(() => window.__cl.input.setPaused(true));
});

test('the page reports no console errors during seam operation', async ({ page }) => {
  const problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(msg.text());
  });
  page.on('pageerror', (err) => problems.push(String(err)));
  await page.evaluate(() => {
    window.__cl.reset(999);
    window.__cl.advanceTicks(30);
    window.__cl.start();
  });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__cl.stop());
  expect(problems).toEqual([]);
});
