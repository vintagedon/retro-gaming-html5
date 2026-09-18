import { test, expect } from '@playwright/test';
import { gentleImpactStep, settledOrResting } from '../helpers/autopilot.js';

const SEED = 20260918;

function pct(ratio) {
  return `${(Math.min(1, Math.max(0, ratio)) * 100).toFixed(2)}%`;
}

async function hudState(page) {
  return page.evaluate(() => {
    const read = (sel, prop) => document.querySelector(sel).style.getPropertyValue(prop);
    return {
      hullValue: read('[data-hud="hull-meter"]', '--gc-meter-value'),
      hullTrail: read('[data-hud="hull-meter"]', '--gc-meter-trail-value'),
      craftValue: read('[data-hud="craft-meter"]', '--gc-meter-value'),
      impactBand: document.querySelector('[data-hud-field="impact"]').dataset.band,
      impact: document.querySelector('[data-hud-field="impact"]').textContent
    };
  });
}

async function fly(page, { step, budget = 900 }) {
  let lastNotch = 0;
  for (let i = 0; i < budget; i += 1) {
    const snap = await page.evaluate(() => window.__cl.getSnapshot());
    if (settledOrResting(snap)) return snap;
    const command = step(snap, lastNotch);
    lastNotch = command.notch;
    await page.evaluate((notch) => window.__cl.input.setThrustNotch(notch), command.notch);
    await page.evaluate(() => window.__cl.advanceTicks(12));
  }
  throw new Error('flow budget exhausted');
}

// Climbs from rest under full thrust until moving up with clearance,
// cuts thrust, and lets the craft fall to a hard impact.
async function climbAndDrop(page, budget = 4000) {
  await page.evaluate(() => window.__cl.input.setThrustNotch(4));
  for (let i = 0; i < budget; i += 1) {
    const snap = await page.evaluate(() => {
      window.__cl.advanceTicks(12);
      return window.__cl.getSnapshot();
    });
    if (snap.vy > 0 && snap.y > 80) {
      await page.evaluate(() => window.__cl.input.setThrustNotch(0));
    }
    if (settledOrResting(snap)) return snap;
  }
  throw new Error('climb-and-drop budget exhausted');
}

test('gentle then hard impacts consume hull and craft correctly through the HUD', async ({ page }) => {
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

  const gentle = await fly(page, { step: gentleImpactStep });
  expect(gentle.craftState).toBe('flying');
  expect(gentle.hullSegments).toBe(2);
  expect(gentle.lastImpact).toBe('gentle');
  expect(gentle.craftRemaining).toBe(3);
  let hud = await hudState(page);
  expect(hud.hullValue).toBe(pct(2 / 3));
  expect(hud.hullTrail).toBe(pct(1));
  expect(hud.craftValue).toBe(pct(1));
  expect(hud.impactBand).toBe('gentle');
  expect(hud.impact).toBe('GENTLE');

  const wrecked = await climbAndDrop(page);
  expect(wrecked.craftState).toBe('destroyed');
  expect(wrecked.hullSegments).toBe(0);
  expect(wrecked.lastImpact).toBe('hard');
  expect(wrecked.craftRemaining).toBe(2);
  hud = await hudState(page);
  expect(hud.hullValue).toBe('0.00%');
  expect(hud.hullTrail).toBe(pct(2 / 3));
  expect(hud.craftValue).toBe(pct(2 / 3));

  const retried = await page.evaluate(() => {
    const ok = window.__cl.input.retry();
    window.__cl.advanceTicks(120);
    return { ok, snapshot: window.__cl.getSnapshot() };
  });
  expect(retried.ok).toBe(true);
  expect(retried.snapshot.craftState).toBe('flying');
  expect(retried.snapshot.hullSegments).toBe(3);
  expect(retried.snapshot.craftRemaining).toBe(2, 'retry consumes no craft');
  expect(retried.snapshot.lastImpact).toBe(null);
  hud = await hudState(page);
  expect(hud.hullValue).toBe(pct(1));
  expect(hud.hullTrail).toBe(pct(1));
  expect(hud.craftValue).toBe(pct(2 / 3));

  const secondWreck = await climbAndDrop(page);
  expect(secondWreck.craftState).toBe('destroyed');
  expect(secondWreck.craftRemaining).toBe(1);
  const retriedAgain = await page.evaluate(() => {
    window.__cl.input.retry();
    return window.__cl.getSnapshot();
  });
  expect(retriedAgain.craftState).toBe('flying');

  const finalWreck = await climbAndDrop(page);
  expect(finalWreck.craftState).toBe('destroyed');
  expect(finalWreck.craftRemaining).toBe(0);
  expect(finalWreck.outcome).toBe('run-over');
  hud = await hudState(page);
  expect(hud.craftValue).toBe('0.00%');

  const retryRejected = await page.evaluate(() => window.__cl.input.retry());
  expect(retryRejected).toBe(false);

  const overlay = await page.evaluate(() => ({
    hidden: document.getElementById('overlay').hasAttribute('hidden'),
    title: document.getElementById('overlay-title').textContent
  }));
  expect(overlay.hidden).toBe(false);
  expect(overlay.title).toBe('RUN OVER');

  expect(problems).toEqual([]);
});
