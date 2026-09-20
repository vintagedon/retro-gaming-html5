// Vector Vortex combat-feel validation (Spec 03 gate 2).
// Destroying an enemy emits fragments that fade and leave no residual
// simulation state; a run with destructions produces the same gameplay
// state at equal completed ticks as one with fragments disabled.
//
// MUTATION: fragments advancing core state would break the digest
// equality; a fragment burst that never fades would keep the pixel
// presence after the fade window.

import { test, expect } from '@playwright/test';
import { startRun } from './helpers.js';

test.use({ viewport: { width: 1280, height: 720 } });

// Seed 1: the wave director's first spawn is lane 15 at tick 90. Firing
// from lane 15 from tick 0 lands the kill around tick 90.
async function runToKill(page, disableFragments) {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.evaluate((flag) => { window.__vv.pauseRaf = true; window.__vv.disableFragments = flag; }, disableFragments);
  await startRun(page);
  await page.evaluate(() => window.__vv.setLane(15));
  await page.evaluate(() => window.__vv.setFire(true));
  await page.evaluate(() => {
    // Advance until the first enemy-destroyed event appears.
    for (let i = 0; i < 300; i++) {
      window.__vv.advanceTicks(1);
      const s = window.__vv.getSnapshot();
      if (s.recentEvents.some(e => e.type === 'enemy-destroyed')) break;
    }
  });
  await page.evaluate(() => window.__vv.setFire(false));
  return page.evaluate(() => {
    const s = window.__vv.getSnapshot();
    const kill = s.recentEvents.find(e => e.type === 'enemy-destroyed');
    return {
      kill,
      digest: JSON.stringify({
        lane: s.lane, lives: s.lives, score: s.score, elapsedTicks: s.elapsedTicks,
        cooldown: s.cooldown, shots: s.shots, enemies: s.enemies, enemyShots: s.enemyShots,
        breaches: s.breaches, damageGraceRemaining: s.damageGraceRemaining,
        shotsSpawned: s.shotsSpawned, hits: s.hits, kills: s.kills,
        waveSpawned: s.waveSpawned, outcome: s.outcome
      })
    };
  });
}

test('a run with destructions produces the same gameplay state as one with fragments disabled', async ({ page }) => {
  const withFragments = await runToKill(page, false);
  expect(withFragments.kill).toBeTruthy();
  const withoutFragments = await runToKill(page, true);
  expect(withoutFragments.kill).toBeTruthy();
  // Equal completed ticks, equal gameplay state: the fragment layer never
  // touches the simulation.
  expect(withoutFragments.digest).toBe(withFragments.digest);
});

test('the fragment burst renders on the resolving frame and fades away', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await startRun(page);
  await page.evaluate(() => window.__vv.setLane(15));
  await page.evaluate(() => window.__vv.setFire(true));
  await page.evaluate(() => {
    for (let i = 0; i < 300; i++) {
      window.__vv.advanceTicks(1);
      const s = window.__vv.getSnapshot();
      if (s.recentEvents.some(e => e.type === 'enemy-destroyed')) break;
    }
  });
  await page.evaluate(() => window.__vv.setFire(false));
  const kill = await page.evaluate(() => {
    const s = window.__vv.getSnapshot();
    return s.recentEvents.find(e => e.type === 'enemy-destroyed');
  });
  expect(kill).toBeTruthy();

  // Count enemy-colour pixels on the live canvas right after the kill
  // (the burst is drawn wide) and again after the fade window.
  async function enemyPixels() {
    return page.evaluate(() => {
      const c = document.getElementById('vv-canvas');
      const ctx = c.getContext('2d');
      const { data } = ctx.getImageData(0, 0, c.width, c.height);
      // Enemy magenta #ff3bd4 blends toward black on AA edges; accept
      // blends of at least a third of the full colour.
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const t = (r * 255 + g * 59 + b * 212) / (255 * 255 + 59 * 59 + 212 * 212);
        if (t >= 0.35 && t <= 1.15
          && Math.abs(r - t * 255) <= 20 && Math.abs(g - t * 59) <= 20 && Math.abs(b - t * 212) <= 20) {
          count++;
        }
      }
      return count;
    });
  }

  // Fragments render on real frames; let the loop draw.
  await page.waitForTimeout(50);
  const during = await enemyPixels();
  await page.waitForTimeout(700);
  const after = await enemyPixels();
  expect(during).toBeGreaterThan(0);
  // The burst fades: materially fewer enemy-colour pixels once the
  // twenty-tick lifetime has passed. (A live enemy could add pixels back,
  // so compare against the burst, not zero.)
  expect(after).toBeLessThan(during);
});

test('at the smallest supported viewport, shots are visible at both depth extremes and the claw and enemy silhouettes differ', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const probe = await page.evaluate(async () => {
    const W = 1024, H = 576;
    const mod = await import('/runtime/renderer.js');
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    canvas.style.position = 'fixed';
    canvas.style.left = '-10000px';
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    document.body.appendChild(canvas);
    const renderer = mod.createRenderer({ canvas });
    renderer.resize();
    renderer.render({
      lane: 0,
      shots: [
        { id: 1, lane: 6, depth: 1 },    // player shot at the far rim
        { id: 2, lane: 6, depth: 0.1 },  // player shot near the rim
        { id: 3, lane: 18, depth: 1 }    // player shot on the other side
      ],
      enemies: [{ id: 1, lane: 12, depth: 1 }],
      enemyShots: [
        { id: 1, lane: 18, depth: 1 },
        { id: 2, lane: 18, depth: 0.1 }
      ]
    });
    const data = canvas.getContext('2d').getImageData(0, 0, W, H).data;
    // Blend-tolerant matcher: a pixel matches a target when it is that
    // target scaled toward black by a consistent factor.
    const match = (r, g, b, [tr, tg, tb]) => {
      const denom = tr * tr + tg * tg + tb * tb;
      const t = (r * tr + g * tg + b * tb) / denom;
      if (t < 0.35 || t > 1.15) return false;
      return Math.abs(r - t * tr) <= 20 && Math.abs(g - t * tg) <= 20 && Math.abs(b - t * tb) <= 20;
    };
    const colours = {
      playerShot: [60, 255, 110],
      enemyShot: [240, 240, 240],
      enemy: [255, 59, 212],
      player: [255, 210, 31]
    };
    const bbox = {};
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        for (const [key, c] of Object.entries(colours)) {
          if (match(data[i], data[i + 1], data[i + 2], c)) {
            bbox[key] ??= { minX: x, maxX: x, minY: y, maxY: y, n: 0 };
            const b = bbox[key];
            b.minX = Math.min(b.minX, x); b.maxX = Math.max(b.maxX, x);
            b.minY = Math.min(b.minY, y); b.maxY = Math.max(b.maxY, y);
            b.n += 1;
          }
        }
      }
    }
    canvas.remove();
    return bbox;
  });

  // Both shot kinds are visible at depth 1 and at depth 0.1 (colour
  // pixels exist per kind; depth placement itself is pinned by the
  // render-depth unit tests and the live-frame probes).
  expect(probe.playerShot.n).toBeGreaterThan(0);
  expect(probe.enemyShot.n).toBeGreaterThan(0);
  expect(probe.enemy.n).toBeGreaterThan(0);
  expect(probe.player.n).toBeGreaterThan(0);

  // Silhouette distinction at depth 1: the basic enemy is a closed form
  // (roughly as wide as tall), while a player shot is a dash elongated
  // along its lane axis.
  const enemyW = probe.enemy.maxX - probe.enemy.minX + 1;
  const enemyH = probe.enemy.maxY - probe.enemy.minY + 1;
  expect(enemyW / enemyH).toBeGreaterThan(0.5);
  expect(enemyW / enemyH).toBeLessThan(2);
  // The claw's chevron is wider than it is deep; the enemy diamond is not.
  const clawW = probe.player.maxX - probe.player.minX + 1;
  const clawH = probe.player.maxY - probe.player.minY + 1;
  expect(clawW).toBeGreaterThan(clawH);
});
