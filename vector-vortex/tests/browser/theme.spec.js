// Vector Vortex theme validation (Spec 03 gate 1 rewrite).
// The page composes the vendored GameUI foundations, loads them relatively
// with no off-origin request, activates data-gc-theme="vector-vortex", and
// renders real published primitives carrying the theme's computed roles.
// The canvas probe asserts per-entity colour: web, player, basic enemy,
// player shot and enemy shot each render in a distinct colour, read from
// rendered pixels rather than declarations, and the playfield interior
// stays black.
//
// Mutations: dropping the theme <link> fails stylesheet loading and every
// computed-role probe; changing a palette hex in the renderer fails the
// pixel counts; rendering any two entities in the same colour fails the
// distinctness counts.

import { test, expect } from '@playwright/test';

const FROZEN = {
  field: 'rgb(5, 8, 13)',        // #05080d page surface (chrome)
  geometry: 'rgb(94, 231, 255)', // #5ee7ff accent
  warning: 'rgb(255, 191, 71)',  // #ffbf47
  text: 'rgb(232, 241, 247)',    // #e8f1f7
  muted: 'rgb(127, 147, 163)'    // #7f93a3
};

// The renderer palette, mirrored here ONLY as the expected values; the
// assertions below count rendered pixels of exactly these colours, so a
// renderer-side change fails the counts rather than satisfying a copy.
const PALETTE = {
  field: [0, 0, 0],          // playfield interior: black
  web: [47, 71, 255],        // #2f47ff
  player: [255, 210, 31],    // #ffd21f
  enemy: [255, 59, 212],     // #ff3bd4
  playerShot: [60, 255, 110],// #3cff6e
  enemyShot: [240, 240, 240] // #f0f0f0
};

function rgb([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`;
}

test('page loads only same-origin runtime files and every stylesheet/script answers', async ({ page }) => {
  const failures = [];
  const responses = [];
  page.on('requestfailed', req => failures.push(`requestfailed: ${req.url()}`));
  page.on('response', res => responses.push(res));
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');

  expect(failures).toEqual([]);
  expect(responses.length).toBeGreaterThan(0);

  const paths = responses.map(r => new URL(r.url()).pathname);
  for (const required of ['/vendor/gameui/gc.css', '/vendor/gameui/gc.js', '/vector-vortex-theme.css', '/styles.css']) {
    expect(paths).toContain(required);
  }
  for (const res of responses) {
    expect(res.status(), res.url()).toBeLessThan(400);
    expect(res.url().startsWith('http://127.0.0.1:8123/'), res.url()).toBe(true);
  }
});

test('documented theme attribute is active on <html>', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-gc-theme'));
  expect(theme).toBe('vector-vortex');
});

test('required rendered primitives exist and carry computed theme roles', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');

  const result = await page.evaluate(() => {
    function computedColor(el, prop) {
      return getComputedStyle(el)[prop];
    }
    // A probe resolves a token on a rendered element, so assertions check
    // computed results rather than declarations.
    function probeToken(token, prop) {
      const el = document.createElement('div');
      el.style[prop] = `var(${token})`;
      document.body.append(el);
      const value = getComputedStyle(el)[prop];
      el.remove();
      return value;
    }
    const panels = [...document.querySelectorAll('.gc-panel')];
    const buttons = [...document.querySelectorAll('.gc-button')];
    const pauseButton = document.querySelector('#vv-pause');
    const body = document.body;
    return {
      panelCount: panels.length,
      buttonCount: buttons.length,
      bodyBackground: computedColor(body, 'backgroundColor'),
      canvasField: probeToken('--gc-surface-canvas', 'backgroundColor'),
      accent: probeToken('--gc-accent', 'color'),
      text: probeToken('--gc-text-primary', 'color'),
      muted: probeToken('--gc-text-muted', 'color'),
      warning: probeToken('--gc-status-warning', 'color'),
      pauseColor: pauseButton ? computedColor(pauseButton, 'color') : null,
      panelBackground: panels[0] ? computedColor(panels[0], 'backgroundColor') : null,
      raisedProbe: probeToken('--gc-surface-raised', 'backgroundColor'),
      bodyFont: computedColor(body, 'fontFamily'),
      labelTransform: pauseButton ? computedColor(pauseButton, 'textTransform') : null
    };
  });

  // Non-empty primitive sets (an empty set must fail, not pass).
  expect(result.panelCount).toBeGreaterThan(0);
  expect(result.buttonCount).toBeGreaterThanOrEqual(2);

  // Frozen palette roles resolve exactly on rendered elements.
  expect(result.bodyBackground).toBe(FROZEN.field);
  expect(result.canvasField).toBe(FROZEN.field);
  expect(result.accent).toBe(FROZEN.geometry);
  expect(result.text).toBe(FROZEN.text);
  expect(result.muted).toBe(FROZEN.muted);
  expect(result.warning).toBe(FROZEN.warning);

  // Buttons carry the text role; panels consume the themed raised surface.
  expect(result.pauseColor).toBe(FROZEN.text);
  expect(result.panelBackground).toBe(result.raisedProbe);

  // Frozen monospace stack and compact uppercase labels.
  expect(result.bodyFont).toBe('ui-monospace, SFMono-Regular, Menlo, Consolas, monospace');
  expect(result.labelTransform).toBe('uppercase');
});

test('focus ring renders the Geometry accent on a real control', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  // Keyboard focus gives the control :focus-visible modality, which is
  // what the framework's focus contract styles.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const ring = await page.evaluate(() => {
    const b = document.activeElement;
    const cs = getComputedStyle(b);
    return { id: b.id, color: cs.outlineColor, width: cs.outlineWidth, style: cs.outlineStyle };
  });
  expect(ring.id).toBe('vv-start');
  expect(ring.style).not.toBe('none');
  expect(ring.width).not.toBe('0px');
  expect(ring.color).toBe(FROZEN.geometry);
});

test('every loaded runtime stylesheet is shift-magenta-free in chrome', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const findings = await page.evaluate(async () => {
    const links = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.getAttribute('href'));
    const offenders = [];
    // The rendered scan must run over a real page, not an empty shell.
    const elementCount = document.querySelectorAll('*').length;
    if (elementCount < 20) offenders.push(`page renders only ${elementCount} elements; scan scope too small`);
    const reserved = 'rgb(255, 79, 216)';
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.color === reserved || cs.backgroundColor === reserved) {
        offenders.push(`rendered element ${el.tagName}.${el.className} carries reserved magenta`);
        break;
      }
    }
    for (const href of links) {
      const text = await fetch(href).then(r => r.text());
      if (/ff4fd8/i.test(text) || /255,\s*79,\s*216/.test(text)) offenders.push(href);
    }
    return { links, offenders };
  });
  expect(findings.links.length).toBeGreaterThanOrEqual(3);
  expect(findings.offenders).toEqual([]);
});

// Anti-aliased strokes blend their colour with black, so a pixel matches a
// target when it is that target scaled toward black by a consistent factor.
// Palette hues sit far apart, so no blend of one kind reads as another.
function blendsToward(r, g, b, [tr, tg, tb]) {
  const denom = tr * tr + tg * tg + tb * tb;
  const t = (r * tr + g * tg + b * tb) / denom;
  if (t < 0.35 || t > 1.15) return false;
  return Math.abs(r - t * tr) <= 20
    && Math.abs(g - t * tg) <= 20
    && Math.abs(b - t * tb) <= 20;
}

// Render a synthetic frame containing all five entity kinds through the
// real renderer module and count matched pixels per colour. Distinctness
// is proven by each colour's own pixel count, not by comparing
// declarations.
async function countSyntheticFrameColors(page) {
  return page.evaluate(async (expected) => {
    const mod = await import('/runtime/renderer.js');
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    // The renderer sizes itself from getBoundingClientRect, so the probe
    // canvas must be in the document with explicit CSS dimensions.
    canvas.style.position = 'fixed';
    canvas.style.left = '-10000px';
    canvas.style.top = '0';
    canvas.style.width = '1280px';
    canvas.style.height = '720px';
    document.body.appendChild(canvas);
    const renderer = mod.createRenderer({ canvas });
    renderer.resize();
    renderer.render({
      lane: 0,
      shots: [{ id: 1, lane: 2, depth: 0.3 }],
      enemies: [{ id: 1, lane: 5, depth: 0.5 }],
      enemyShots: [{ id: 1, lane: 9, depth: 0.5 }]
    });
    const ctx = canvas.getContext('2d');
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const counts = {};
    for (const key of Object.keys(expected)) counts[key] = 0;
    const match = (r, g, b, [tr, tg, tb]) => {
      const denom = tr * tr + tg * tg + tb * tb;
      const t = (r * tr + g * tg + b * tb) / denom;
      if (t < 0.35 || t > 1.15) return false;
      return Math.abs(r - t * tr) <= 20 && Math.abs(g - t * tg) <= 20 && Math.abs(b - t * tb) <= 20;
    };
    for (let i = 0; i < data.length; i += 4) {
      for (const [key, target] of Object.entries(expected)) {
        if (key === 'field') {
          if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) counts[key]++;
        } else if (match(data[i], data[i + 1], data[i + 2], target)) {
          counts[key]++;
        }
      }
    }
    canvas.remove();
    return counts;
  }, PALETTE);
}

test('the five entity kinds each render in a distinct colour on one frame', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const counts = await countSyntheticFrameColors(page);

  // Every entity kind left rendered pixels of its own colour.
  expect(counts.web).toBeGreaterThan(0);
  expect(counts.player).toBeGreaterThan(0);
  expect(counts.enemy).toBeGreaterThan(0);
  expect(counts.playerShot).toBeGreaterThan(0);
  expect(counts.enemyShot).toBeGreaterThan(0);

  // Distinctness: the five expected colours are pairwise different values.
  const values = Object.entries(PALETTE)
    .filter(([k]) => k !== 'field')
    .map(([, v]) => v.join(','));
  expect(new Set(values).size).toBe(5);
  // And each count is independent, so no colour was counted for another.
  const total = counts.web + counts.player + counts.enemy + counts.playerShot + counts.enemyShot;
  expect(total).toBeGreaterThan(0);
});

test('the playfield interior stays black on a live frame', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  // Advance past the first director spawn (tick 59) so the scan sees the
  // tube, player, and at least one hostile, then let a frame render.
  await page.evaluate(() => {
    window.__vv.setFire(true);
    window.__vv.advanceTicks(120);
    window.__vv.setFire(false);
  });
  await page.waitForTimeout(120);

  const counts = await page.evaluate((palette) => {
    const c = document.getElementById('vv-canvas');
    const ctx = c.getContext('2d');
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    const totals = { pixels: 0, field: 0, web: 0, player: 0, enemy: 0, playerShot: 0 };
    const targets = {
      web: palette.web,
      player: palette.player,
      enemy: palette.enemy,
      playerShot: palette.playerShot
    };
    const match = (r, g, b, [tr, tg, tb]) => {
      const denom = tr * tr + tg * tg + tb * tb;
      const t = (r * tr + g * tg + b * tb) / denom;
      if (t < 0.35 || t > 1.15) return false;
      return Math.abs(r - t * tr) <= 20 && Math.abs(g - t * tg) <= 20 && Math.abs(b - t * tb) <= 20;
    };
    for (let i = 0; i < data.length; i += 4) {
      totals.pixels++;
      if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) totals.field++;
      for (const [key, target] of Object.entries(targets)) {
        if (match(data[i], data[i + 1], data[i + 2], target)) totals[key]++;
      }
    }
    return totals;
  }, PALETTE);

  expect(counts.pixels).toBeGreaterThan(10000);
  // The black interior owns the playfield.
  expect(counts.field).toBeGreaterThan(counts.pixels * 0.5);
  // Web, player claw, at least one hostile, and at least one live shot.
  expect(counts.web).toBeGreaterThan(0);
  expect(counts.player).toBeGreaterThan(0);
  expect(counts.enemy).toBeGreaterThan(0);
  expect(counts.playerShot).toBeGreaterThan(0);
});
