// Vector Vortex Spec 02 deliverable 1 validation: the page composes the
// vendored GameUI foundations, loads them relatively with no off-origin
// request, activates data-gc-theme="vector-vortex", renders real published
// primitives carrying the frozen theme's computed roles, and keeps the
// reserved shift-energy magenta out of every runtime surface.
//
// A check that passed over an empty element set would satisfy nothing here:
// every primitive assertion first requires a nonzero element count.
//
// Mutations: dropping the theme <link> fails stylesheet loading and every
// computed-role probe; flipping a frozen hex in vector-vortex-theme.css
// fails the exact rgb equality checks; adding an off-origin <link> fails
// the request-origin scan.

import { test, expect } from '@playwright/test';

const FROZEN = {
  field: 'rgb(5, 8, 13)',        // #05080d
  geometry: 'rgb(94, 231, 255)', // #5ee7ff
  warning: 'rgb(255, 191, 71)',  // #ffbf47
  text: 'rgb(232, 241, 247)',    // #e8f1f7
  muted: 'rgb(127, 147, 163)'    // #7f93a3
};

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
    const h1 = document.querySelector('.vv-header h1');
    const objective = document.querySelector('[data-testid="vv-objective"]');
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
      h1Color: h1 ? computedColor(h1, 'color') : null,
      objectiveColor: objective ? computedColor(objective, 'color') : null,
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

  // Accent-bearing surfaces carry the Geometry role exactly.
  expect(result.h1Color).toBe(FROZEN.geometry);
  expect(result.pauseColor).toBe(FROZEN.text);
  expect(result.objectiveColor).toBe(FROZEN.muted);

  // Panel consumes the themed raised surface token.
  expect(result.panelBackground).toBe(result.raisedProbe);

  // Frozen monospace stack and compact uppercase labels.
  expect(result.bodyFont).toBe('ui-monospace, SFMono-Regular, Menlo, Consolas, monospace');
  expect(result.labelTransform).toBe('uppercase');
});

test('focus ring renders the Geometry accent on a real control', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const ring = await page.evaluate(() => {
    const b = document.getElementById('vv-pause');
    b.focus();
    const cs = getComputedStyle(b);
    return { color: cs.outlineColor, width: cs.outlineWidth, style: cs.outlineStyle };
  });
  expect(ring.style).not.toBe('none');
  expect(ring.width).not.toBe('0px');
  expect(ring.color).toBe(FROZEN.geometry);
});

test('every loaded runtime stylesheet is magenta-free (reserved role unused)', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const findings = await page.evaluate(async () => {
    const links = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => l.getAttribute('href'));
    const offenders = [];
    // The rendered scan must run over a real page, not an empty shell.
    const elementCount = document.querySelectorAll('*').length;
    if (elementCount < 20) offenders.push(`page renders only ${elementCount} elements; scan scope too small`);
    const magenta = 'rgb(255, 79, 216)';
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.color === magenta || cs.backgroundColor === magenta) {
        offenders.push(`rendered element ${el.tagName}.${el.className} carries reserved magenta`);
        break;
      }
    }
    for (const href of links) {
      const text = await fetch(href).then(r => r.text());
      if (/ff4fd8/i.test(text) || /255,\s*79,\s*216/.test(text)) offenders.push(href);
    }
    const html = await fetch('/').then(r => r.text());
    if (/ff4fd8/i.test(html)) offenders.push('index.html');
    return { links, offenders };
  });
  expect(findings.links.length).toBeGreaterThanOrEqual(3);
  expect(findings.offenders).toEqual([]);
});

test('canvas playfield renders only frozen roles (pixel palette probe)', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  // Advance past the first director spawn (tick 59) so the scan sees the
  // tube, player, and at least one hostile, then let a frame render.
  await page.evaluate(() => window.__vv.advanceTicks(120));
  await page.waitForTimeout(120);

  const counts = await page.evaluate(() => {
    const c = document.getElementById('vv-canvas');
    const ctx = c.getContext('2d');
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    const totals = {
      pixels: 0,
      field: 0,      // #05080d
      geometry: 0,   // #5ee7ff tube, player, shots, focus lane
      warning: 0,    // #ffbf47 hostiles
      banned: 0
    };
    const banned = new Set([
      '0,0,0',         // old mechanics-slice clear
      '58,110,165',    // old tube
      '255,209,102',   // old player/lane highlight
      '31,53,80',      // old dim rail
      '89,192,255',    // old shot
      '255,93,108',    // old hostile
      '255,79,216'     // reserved shift-energy role
    ]);
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      totals.pixels++;
      const key = `${r},${g},${b}`;
      if (r === 5 && g === 8 && b === 13) totals.field++;
      else if (r === 94 && g === 231 && b === 255) totals.geometry++;
      else if (r === 255 && g === 191 && b === 71) totals.warning++;
      if (banned.has(key)) totals.banned++;
    }
    return totals;
  });

  expect(counts.pixels).toBeGreaterThan(10000);
  // The field role owns the playfield background.
  expect(counts.field).toBeGreaterThan(counts.pixels * 0.5);
  // Accent-bearing surfaces: tube, focus lane, and player are on every frame.
  expect(counts.geometry).toBeGreaterThan(0);
  // A hostile is on screen after the first spawn and reads Warning.
  expect(counts.warning).toBeGreaterThan(0);
  // No superseded palette color and no reserved magenta anywhere.
  expect(counts.banned).toBe(0);
});
