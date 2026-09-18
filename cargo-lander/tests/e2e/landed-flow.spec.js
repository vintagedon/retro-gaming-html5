import { test, expect } from '@playwright/test';
import { landingStep, settledOrResting } from '../helpers/autopilot.js';

const SEED = 20260918;

async function hudState(page) {
  return page.evaluate(() => {
    const read = (sel, prop) => document.querySelector(sel).style.getPropertyValue(prop);
    return {
      fuelValue: read('[data-hud="fuel-meter"]', '--gc-meter-value'),
      hullValue: read('[data-hud="hull-meter"]', '--gc-meter-value'),
      hullTrail: read('[data-hud="hull-meter"]', '--gc-meter-trail-value'),
      hullSegments: read('[data-hud="hull-meter"]', '--gc-meter-segments'),
      thrustValue: read('[data-hud="thrust-meter"]', '--gc-meter-value'),
      craftValue: read('[data-hud="craft-meter"]', '--gc-meter-value'),
      craftPips: read('[data-hud="craft-meter"]', '--gc-meter-pips'),
      altitude: document.querySelector('[data-hud-field="altitude"]').textContent,
      velocity: document.querySelector('[data-hud-field="velocity"]').textContent,
      fuel: document.querySelector('[data-hud-field="fuel"]').textContent,
      impact: document.querySelector('[data-hud-field="impact"]').textContent
    };
  });
}

function pct(ratio) {
  return `${(Math.min(1, Math.max(0, ratio)) * 100).toFixed(2)}%`;
}

async function expectHudAgrees(page, label) {
  const [snap, hud] = await Promise.all([
    page.evaluate(() => window.__cl.getSnapshot()),
    hudState(page)
  ]);
  expect(hud.fuelValue, `${label}: fuel meter`).toBe(pct(snap.fuelRatio));
  expect(hud.hullValue, `${label}: hull meter`).toBe(pct(snap.hullRatio));
  expect(hud.hullTrail, `${label}: hull trail`).toBe(pct(snap.hullPrevRatio));
  expect(hud.hullSegments, `${label}: hull segments`).toBe(String(snap.hullSegmentsMax));
  expect(hud.thrustValue, `${label}: thrust meter`).toBe(pct(snap.thrustLevel));
  expect(hud.craftValue, `${label}: craft meter`).toBe(pct(snap.craftRatio));
  expect(hud.craftPips, `${label}: craft pips`).toBe(String(snap.craftMax));
  expect(hud.altitude, `${label}: altitude text`).toBe(snap.altitudeDisplay);
  expect(hud.velocity, `${label}: velocity text`).toBe(snap.velocityDisplay);
  expect(hud.fuel, `${label}: fuel text`).toBe(snap.fuelDisplay);
  expect(hud.impact, `${label}: impact badge`).toBe(
    snap.lastImpact === null ? 'NONE' : snap.lastImpact.toUpperCase()
  );
}

async function fly(page, { step, stopAt, budget = 900 }) {
  let lastNotch = 0;
  for (let i = 0; i < budget; i += 1) {
    const snap = await page.evaluate(() => window.__cl.getSnapshot());
    if (settledOrResting(snap)) return snap;
    if (stopAt && snap.elapsedTicks >= stopAt) return snap;
    const command = step(snap, lastNotch);
    lastNotch = command.notch;
    await page.evaluate((notch) => window.__cl.input.setThrustNotch(notch), command.notch);
    await page.evaluate(() => window.__cl.advanceTicks(12));
  }
  throw new Error('flow budget exhausted');
}

test('a stopped-runner flow flies launch to landed with the HUD agreeing throughout', async ({ page }) => {
  const problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(msg.text());
  });
  page.on('pageerror', (err) => problems.push(String(err)));

  await page.goto('/game/index.html');
  await page.evaluate((seed) => {
    window.__cl.stop();
    window.__cl.reset(seed);
  }, SEED);

  await page.evaluate(() => window.__cl.advanceTicks(60));
  await expectHudAgrees(page, 'launch');

  await fly(page, { step: landingStep, stopAt: 1300 });
  await expectHudAgrees(page, 'mid-descent');

  const final = await fly(page, { step: landingStep });
  await expectHudAgrees(page, 'landed');

  expect(final.outcome).toBe('landed');
  expect(final.craftState).toBe('landed');
  expect(final.hullSegments).toBe(3);
  expect(final.craftRemaining).toBe(3);
  expect(final.x).toBeGreaterThan(890);
  expect(final.x).toBeLessThan(1030);

  const overlay = await page.evaluate(() => ({
    hidden: document.getElementById('overlay').hasAttribute('hidden'),
    title: document.getElementById('overlay-title').textContent
  }));
  expect(overlay.hidden).toBe(false);
  expect(overlay.title).toBe('LANDED');

  expect(problems).toEqual([]);
});
