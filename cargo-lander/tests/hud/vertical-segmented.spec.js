import { test, expect } from '@playwright/test';

const TOLERANCE = 2.5;

async function measure(page) {
  return page.evaluate(() => {
    const meter = document.getElementById('vs-meter');
    const fill = document.getElementById('vs-fill');
    const trail = document.getElementById('vs-trail');
    const m = meter.getBoundingClientRect();
    const f = fill.getBoundingClientRect();
    const t = trail.getBoundingClientRect();
    return {
      meterWidth: m.width,
      meterHeight: m.height,
      fillWidth: f.width,
      fillHeight: f.height,
      trailWidth: t.width,
      trailHeight: t.height
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/vertical-segmented.html');
});

test('the vertical segmented fill and trail hold full track width at every value', async ({ page }) => {
  for (const [fill, trail] of [['0%', '0%'], ['50%', '25%'], ['100%', '100%'], ['33%', '17%']]) {
    await page.evaluate(([f, t]) => window.__setValues(f, t), [fill, trail]);
    const geo = await measure(page);
    expect(Math.abs(geo.fillWidth - geo.meterWidth)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(geo.trailWidth - geo.meterWidth)).toBeLessThanOrEqual(TOLERANCE);
  }
});

test('heights quantize to whole segments at zero, an intermediate notch, and full', async ({ page }) => {
  await page.evaluate(() => window.__setValues('0%', '0%', 4));
  let geo = await measure(page);
  expect(geo.fillHeight).toBeLessThanOrEqual(TOLERANCE);
  expect(geo.trailHeight).toBeLessThanOrEqual(TOLERANCE);

  await page.evaluate(() => window.__setValues('50%', '25%', 4));
  geo = await measure(page);
  expect(Math.abs(geo.fillHeight - geo.meterHeight * 0.5)).toBeLessThanOrEqual(TOLERANCE);
  expect(Math.abs(geo.trailHeight - geo.meterHeight * 0.25)).toBeLessThanOrEqual(TOLERANCE);

  await page.evaluate(() => window.__setValues('100%', '100%', 4));
  geo = await measure(page);
  expect(Math.abs(geo.fillHeight - geo.meterHeight)).toBeLessThanOrEqual(TOLERANCE);
  expect(Math.abs(geo.trailHeight - geo.meterHeight)).toBeLessThanOrEqual(TOLERANCE);
});

test('an unquantized value snaps down to the last completed segment', async ({ page }) => {
  await page.evaluate(() => window.__setValues('33%', '58%', 4));
  const geo = await measure(page);
  expect(Math.abs(geo.fillHeight - geo.meterHeight * 0.25)).toBeLessThanOrEqual(TOLERANCE);
  expect(Math.abs(geo.trailHeight - geo.meterHeight * 0.5)).toBeLessThanOrEqual(TOLERANCE);
});

test('the gameplay thrust meter is a vertical segmented meter over real notches', async ({ page }) => {
  await page.goto('/game/index.html');
  await page.evaluate(() => {
    window.__cl.stop();
    window.__cl.reset(20260918);
  });

  for (const notch of [0, 1, 2, 3, 4]) {
    await page.evaluate((k) => {
      window.__cl.input.setThrustNotch(k);
      window.__cl.advanceTicks(1);
    }, notch);
    await page.waitForTimeout(400);
    const geo = await page.evaluate(() => {
      const meter = document.querySelector('[data-hud="thrust-meter"]');
      const fill = meter.querySelector('.gc-meter__fill');
      const m = meter.getBoundingClientRect();
      const f = fill.getBoundingClientRect();
      return {
        meterWidth: m.width,
        meterHeight: m.height,
        fillWidth: f.width,
        fillHeight: f.height,
        segments: meter.style.getPropertyValue('--gc-meter-segments'),
        value: meter.style.getPropertyValue('--gc-meter-value')
      };
    });
    expect(geo.segments).toBe('4');
    expect(geo.value).toBe(`${((notch / 4) * 100).toFixed(2)}%`);
    expect(Math.abs(geo.fillWidth - geo.meterWidth)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(geo.fillHeight - geo.meterHeight * (notch / 4))).toBeLessThanOrEqual(
      TOLERANCE
    );
  }
});
