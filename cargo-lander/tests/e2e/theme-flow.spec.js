import { test, expect } from '@playwright/test';

// Holds snapshot and HUD markup fixed and flips only the theme
// attribute across modern, arcade, and the game's own token theme.
const THEMES = ['modern', 'arcade', 'cargo-lander'];

async function sample(page) {
  return page.evaluate(() => {
    const meter = document.querySelector('[data-hud="hull-meter"]');
    const fill = meter.querySelector('.gc-meter__fill');
    const panel = document.getElementById('hud-left');
    const body = getComputedStyle(document.body);
    const ms = getComputedStyle(meter);
    const ps = getComputedStyle(panel);
    const fs = getComputedStyle(fill);
    const thrust = document.querySelector('[data-hud="thrust-meter"]');
    const thrustFill = thrust.querySelector('.gc-meter__fill');
    // Layout-box measurements (unaffected by the stage transform and by
    // theme border widths): cross-axis fullness is fill content width
    // over meter content width.
    const thrustContentWidth = thrust.clientWidth;
    const thrustFillLayoutWidth = thrustFill.offsetWidth;
    const thrustContentHeight = thrust.clientHeight;
    const thrustFillLayoutHeight = thrustFill.offsetHeight;
    return {
      theme: document.documentElement.dataset.gcTheme,
      meterFillBackground: fs.backgroundColor,
      meterBackground: ms.backgroundColor,
      meterBorderWidth: ms.borderTopWidth,
      meterRadius: ms.borderTopLeftRadius,
      panelBackground: ps.backgroundColor,
      panelBorder: ps.borderTopColor,
      panelBorderWidth: ps.borderTopWidth,
      panelRadius: ps.borderTopLeftRadius,
      panelFont: ps.fontFamily,
      panelShadow: ps.boxShadow,
      bodyBackground: body.backgroundColor,
      thrustCrossAxis: thrustFillLayoutWidth / thrustContentWidth,
      thrustAlongAxis: thrustFillLayoutHeight / thrustContentHeight,
      hullValue: meter.style.getPropertyValue('--gc-meter-value'),
      hullTrail: meter.style.getPropertyValue('--gc-meter-trail-value'),
      craftValue: document.querySelector('[data-hud="craft-meter"]').style.getPropertyValue('--gc-meter-value'),
      altitude: document.querySelector('[data-hud-field="altitude"]').textContent
    };
  });
}

test('the attribute-only theme flip changes styles while preserving values and geometry', async ({ page }) => {
  const problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(msg.text());
  });
  page.on('pageerror', (err) => problems.push(String(err)));

  await page.goto('/game/index.html');
  await page.evaluate(() => window.__cl.stop());
  await page.evaluate(() => window.__cl.reset(20260918));
  await page.evaluate(() => window.__cl.advanceTicks(90));

  const samples = {};
  for (const theme of THEMES) {
    await page.evaluate((name) => {
      document.documentElement.setAttribute('data-gc-theme', name);
    }, theme);
    await page.waitForTimeout(500);
    samples[theme] = await sample(page);
    expect(samples[theme].theme).toBe(theme);
  }

  const modern = samples.modern;
  const arcade = samples.arcade;
  const custom = samples['cargo-lander'];

  const meterChangedModernToArcade =
    modern.meterFillBackground !== arcade.meterFillBackground ||
    modern.meterRadius !== arcade.meterRadius;
  const chromeChangedModernToArcade =
    modern.panelFont !== arcade.panelFont ||
    modern.panelRadius !== arcade.panelRadius ||
    modern.panelBorderWidth !== arcade.panelBorderWidth ||
    modern.panelBackground !== arcade.panelBackground;
  expect(meterChangedModernToArcade, 'a meter surface must visibly change').toBe(true);
  expect(chromeChangedModernToArcade, 'a chrome surface must visibly change').toBe(true);

  const meterChangedArcadeToCustom =
    arcade.meterFillBackground !== custom.meterFillBackground ||
    arcade.meterBackground !== custom.meterBackground;
  const chromeChangedArcadeToCustom =
    arcade.panelBackground !== custom.panelBackground ||
    arcade.panelBorder !== custom.panelBorder ||
    arcade.bodyBackground !== custom.bodyBackground;
  expect(meterChangedArcadeToCustom, 'the custom theme must visibly change a meter').toBe(true);
  expect(chromeChangedArcadeToCustom, 'the custom theme must visibly change chrome').toBe(true);

  for (const theme of THEMES) {
    const s = samples[theme];
    expect(s.hullValue, `${theme}: hull value preserved`).toBe('100.00%');
    expect(s.hullTrail, `${theme}: hull trail preserved`).toBe('100.00%');
    expect(s.craftValue, `${theme}: craft value preserved`).toBe('100.00%');
    expect(s.altitude, `${theme}: display string preserved`).toMatch(/m$/);
    expect(s.thrustCrossAxis, `${theme}: thrust cross axis stays full`).toBeGreaterThan(0.85);
    expect(s.thrustAlongAxis, `${theme}: thrust along axis stays quantized`).toBeGreaterThanOrEqual(0);
    expect(s.thrustAlongAxis).toBeLessThanOrEqual(1);
    expect(s.meterBorderWidth, `${theme}: meter border present`).not.toBe('0px');
  }

  const metersVisible = await page.evaluate(() => {
    const rect = document.querySelector('[data-hud="hull-meter"]').getBoundingClientRect();
    return rect.width > 10 && rect.height > 5;
  });
  expect(metersVisible, 'usable geometry survives every flip').toBe(true);

  expect(problems).toEqual([]);
});

test('the shipping theme is the game-owned token theme', async ({ page }) => {
  await page.goto('/game/index.html');
  const shipped = await page.evaluate(() => document.documentElement.dataset.gcTheme);
  expect(shipped).toBe('cargo-lander');
});
