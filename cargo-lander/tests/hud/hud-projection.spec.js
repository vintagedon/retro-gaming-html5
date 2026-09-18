import { test, expect } from '@playwright/test';

function syntheticSnapshot(overrides = {}) {
  return {
    seed: 1,
    rngState: 1,
    elapsedTicks: 0,
    paused: false,
    outcome: null,
    craftState: 'flying',
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    fuel: 100,
    fuelMax: 100,
    fuelRatio: 1,
    hullSegments: 3,
    hullSegmentsMax: 3,
    hullRatio: 1,
    hullPrevSegments: 3,
    hullPrevRatio: 1,
    thrustLevel: 0,
    thrustNotchesMax: 4,
    craftRemaining: 3,
    craftMax: 3,
    craftRatio: 1,
    lastImpact: null,
    altitudeDisplay: '0 m',
    velocityDisplay: '0.0 m/s',
    fuelDisplay: '100 %',
    recentEvents: [],
    ...overrides
  };
}

async function readStyles(page) {
  return page.evaluate(() => {
    const read = (sel, prop) =>
      document.querySelector(sel).style.getPropertyValue(prop);
    return {
      fuelValue: read('[data-hud="fuel-meter"]', '--gc-meter-value'),
      hullValue: read('[data-hud="hull-meter"]', '--gc-meter-value'),
      hullTrail: read('[data-hud="hull-meter"]', '--gc-meter-trail-value'),
      hullSegments: read('[data-hud="hull-meter"]', '--gc-meter-segments'),
      thrustValue: read('[data-hud="thrust-meter"]', '--gc-meter-value'),
      thrustSegments: read('[data-hud="thrust-meter"]', '--gc-meter-segments'),
      craftValue: read('[data-hud="craft-meter"]', '--gc-meter-value'),
      craftPips: read('[data-hud="craft-meter"]', '--gc-meter-pips'),
      altitude: document.querySelector('[data-hud-field="altitude"]').textContent,
      velocity: document.querySelector('[data-hud-field="velocity"]').textContent,
      fuel: document.querySelector('[data-hud-field="fuel"]').textContent,
      impact: document.querySelector('[data-hud-field="impact"]').textContent,
      impactBand: document.querySelector('[data-hud-field="impact"]').dataset.band
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixtures/hud-projection.html');
});

test('zero, intermediate, and full ratios project as percentages', async ({ page }) => {
  await page.evaluate((s) => window.__hud.project(s), syntheticSnapshot({
    fuelRatio: 0,
    hullSegments: 0,
    hullRatio: 0,
    hullPrevRatio: 0,
    thrustLevel: 0,
    craftRemaining: 0,
    craftRatio: 0
  }));
  let styles = await readStyles(page);
  expect(styles.fuelValue).toBe('0.00%');
  expect(styles.hullValue).toBe('0.00%');
  expect(styles.hullTrail).toBe('0.00%');
  expect(styles.thrustValue).toBe('0.00%');
  expect(styles.craftValue).toBe('0.00%');

  await page.evaluate((s) => window.__hud.project(s), syntheticSnapshot({
    fuelRatio: 0.4237,
    velocityDisplay: '13.7 m/s',
    altitudeDisplay: '412 m'
  }));
  styles = await readStyles(page);
  expect(styles.fuelValue).toBe('42.37%');
  expect(styles.velocity).toBe('13.7 m/s');
  expect(styles.altitude).toBe('412 m');

  await page.evaluate((s) => window.__hud.project(s), syntheticSnapshot({
    fuelRatio: 1,
    hullRatio: 1,
    hullPrevRatio: 1,
    thrustLevel: 1,
    craftRatio: 1
  }));
  styles = await readStyles(page);
  expect(styles.fuelValue).toBe('100.00%');
  expect(styles.hullValue).toBe('100.00%');
  expect(styles.hullTrail).toBe('100.00%');
  expect(styles.thrustValue).toBe('100.00%');
  expect(styles.craftValue).toBe('100.00%');
});

test('counted meters cover zero units, one unit, and maximum', async ({ page }) => {
  await page.evaluate((s) => window.__hud.project(s), syntheticSnapshot({
    hullSegments: 1,
    hullRatio: 1 / 3,
    hullPrevSegments: 2,
    hullPrevRatio: 2 / 3,
    craftRemaining: 1,
    craftRatio: 1 / 3
  }));
  const styles = await readStyles(page);
  expect(styles.hullValue).toBe('33.33%');
  expect(styles.hullTrail).toBe('66.67%');
  expect(styles.craftValue).toBe('33.33%');
  expect(styles.hullSegments).toBe('3');
  expect(styles.thrustSegments).toBe('4');
  expect(styles.craftPips).toBe('3');
});

test('segment and pip capacities follow the snapshot maxima, not kit defaults', async ({ page }) => {
  await page.evaluate((s) => window.__hud.project(s), syntheticSnapshot({
    hullSegmentsMax: 5,
    hullSegments: 4,
    hullRatio: 0.8,
    hullPrevRatio: 1,
    thrustNotchesMax: 6,
    thrustLevel: 0.5,
    craftMax: 4,
    craftRemaining: 3,
    craftRatio: 0.75
  }));
  const styles = await readStyles(page);
  expect(styles.hullSegments).toBe('5');
  expect(styles.thrustSegments).toBe('6');
  expect(styles.craftPips).toBe('4');
});

test('display strings are copied verbatim and the impact band follows the core', async ({ page }) => {
  await page.evaluate((s) => window.__hud.project(s), syntheticSnapshot({
    altitudeDisplay: 'ALT 137 m',
    velocityDisplay: 'V 4.2 m/s',
    fuelDisplay: 'FUEL 64 %',
    lastImpact: 'gentle'
  }));
  const styles = await readStyles(page);
  expect(styles.altitude).toBe('ALT 137 m');
  expect(styles.velocity).toBe('V 4.2 m/s');
  expect(styles.fuel).toBe('FUEL 64 %');
  expect(styles.impact).toBe('GENTLE');
  expect(styles.impactBand).toBe('gentle');

  await page.evaluate((s) => window.__hud.project(s), syntheticSnapshot({ lastImpact: 'hard' }));
  expect((await readStyles(page)).impact).toBe('HARD');
});

test('re-projecting an unchanged snapshot performs no DOM writes', async ({ page }) => {
  await page.evaluate(() => {
    window.__mutationCount = 0;
    const observer = new MutationObserver((records) => {
      window.__mutationCount += records.length;
    });
    observer.observe(document.getElementById('fixture-hud'), {
      attributes: true,
      attributeOldValue: false,
      childList: true,
      characterData: true,
      subtree: true
    });
  });

  const changed = syntheticSnapshot({ fuelRatio: 0.5, hullRatio: 2 / 3, thrustLevel: 0.5 });
  await page.evaluate((s) => window.__hud.project(s), changed);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  const afterChange = await page.evaluate(() => window.__mutationCount);
  expect(afterChange).toBeGreaterThan(0);

  await page.evaluate(() => {
    window.__mutationCount = 0;
  });
  await page.evaluate((s) => window.__hud.project(s), changed);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  const afterRepeat = await page.evaluate(() => window.__mutationCount);
  expect(afterRepeat).toBe(0);
});
