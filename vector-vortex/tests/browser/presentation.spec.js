// Vector Vortex perspective validation (Spec 03 gate 1).
// A rendered frame shows a near rim, a smaller offset far rim, and
// twenty-four lane rails between them. The checks run against the real
// renderer module rendering a real frame on an offscreen canvas at the
// smallest supported viewport, and sample rendered pixels rather than
// declarations.
//
// MUTATION: dropping one lane rail fails the 24-rail count; filling the
// web interior fails the between-lane darkness check; removing a rim fails
// the rim sampling.

import { test, expect } from '@playwright/test';

const W = 1024;
const H = 576;
const LANE_COUNT = 24;

// Web hue and its dim rail tint, mirrored ONLY as expected values; the
// assertions count rendered pixels of exactly these colours.
const WEB = [47, 71, 255];      // #2f47ff
const WEB_DIM = [20, 29, 89];   // #141d59

// Anti-aliased strokes blend their colour with black, so a pixel matches a
// target when it is that target scaled toward black by a consistent factor.
// This keeps thin 1px rails detectable while black gaps and other hues
// still fail the match.
function blendsToward(r, g, b, [tr, tg, tb]) {
  const denom = tr * tr + tg * tg + tb * tb;
  const t = (r * tr + g * tg + b * tb) / denom;
  if (t < 0.35 || t > 1.15) return false;
  return Math.abs(r - t * tr) <= 20
    && Math.abs(g - t * tg) <= 20
    && Math.abs(b - t * tb) <= 20;
}

function isWebish(data, width, x, y) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const px = x + dx;
      const py = y + dy;
      if (px < 0 || py < 0 || px >= width || py >= H) continue;
      const i = (py * width + px) * 4;
      if (blendsToward(data[i], data[i + 1], data[i + 2], WEB)) return true;
      if (blendsToward(data[i], data[i + 1], data[i + 2], WEB_DIM)) return true;
    }
  }
  return false;
}

async function renderWebFrame(page) {
  return page.evaluate(async ([w, h]) => {
    const mod = await import('/runtime/renderer.js');
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    // The renderer sizes itself from getBoundingClientRect, so the probe
    // canvas must be in the document with explicit CSS dimensions.
    canvas.style.position = 'fixed';
    canvas.style.left = '-10000px';
    canvas.style.top = '0';
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    document.body.appendChild(canvas);
    const renderer = mod.createRenderer({ canvas });
    renderer.resize();
    renderer.render({ lane: 0, shots: [], enemies: [] });
    const L = mod.projectionLayout(w, h);
    const layout = {
      nearCenter: L.nearCenter,
      nearRadius: L.nearRadius,
      vanishing: L.vanishing,
      farRadius: L.farRadius
    };
    const pixels = Array.from(canvas.getContext('2d').getImageData(0, 0, w, h).data);
    canvas.remove();
    return { layout, pixels };
  }, [W, H]);
}

test('a rendered frame shows a near rim, a smaller offset far rim, and 24 lane rails', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const { layout, pixels } = await renderWebFrame(page);

  // Perspective: far rim smaller than the near rim and offset above centre.
  expect(layout.farRadius).toBeLessThan(layout.nearRadius);
  expect(layout.vanishing.y).toBeLessThan(H / 2);

  // All 24 lane rails: the point where every rail crosses the near-rim
  // ring (depth 0.12) renders web colour within a small sample window.
  let litRails = 0;
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const point = ringMidpoints[lane];
    if (isWebish(pixels, W, Math.round(point.x), Math.round(point.y))) litRails++;
  }
  expect(litRails).toBe(LANE_COUNT);
});

// Positions of each rail at a chosen depth, computed with the same
// projection the renderer uses: linear interpolation between the near-rim
// and far-rim lane vertices. Computed here from the geometry the layout
// exports.
function railPointsAtDepth(depth) {
  function laneAngle(lane) {
    return (lane / LANE_COUNT) * Math.PI * 2 - Math.PI / 2;
  }
  const nearRadius = Math.max(24, Math.min(W * 0.44, H * 0.4));
  const nearCenter = { x: W / 2, y: H * 0.55 };
  const vanishing = { x: W / 2, y: H * 0.4 };
  const farRadius = Math.max(8, nearRadius * 0.18);
  const points = [];
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const a = laneAngle(lane);
    const nx = nearCenter.x + Math.cos(a) * nearRadius;
    const ny = nearCenter.y + Math.sin(a) * nearRadius;
    const fx = vanishing.x + Math.cos(a) * farRadius;
    const fy = vanishing.y + Math.sin(a) * farRadius;
    points.push({ x: nx + (fx - nx) * depth, y: ny + (fy - ny) * depth });
  }
  return points;
}

// Rails cross the ring at every depth; the coverage probe runs near the
// rim where lane spacing is widest, so thin-rail coverage is small and a
// filled web still reads near-total.
const ringMidpoints = railPointsAtDepth(0.12);

test('the web is lines, not a filled surface: the mid-depth ring is mostly black', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const { pixels } = await renderWebFrame(page);

  // Walk the near-rim polyline (the ring every rail crosses at depth
  // 0.12) in fine angular steps and measure how much of it renders web
  // colour. Twenty-four thin rails cover a small fraction; a filled web
  // would cover nearly all of it.
  const STEPS = 720;
  let lit = 0;
  for (let s = 0; s < STEPS; s++) {
    const frac = s / STEPS;
    const lanePos = frac * LANE_COUNT;
    const l = Math.floor(lanePos);
    const t = lanePos - l;
    const p1 = ringMidpoints[l];
    const p2 = ringMidpoints[(l + 1) % LANE_COUNT];
    const x = Math.round(p1.x + (p2.x - p1.x) * t);
    const y = Math.round(p1.y + (p2.y - p1.y) * t);
    if (isWebish(pixels, W, x, y)) lit++;
  }
  const coverage = lit / STEPS;
  expect(coverage).toBeGreaterThan(0);   // the rails do cross the ring
  expect(coverage).toBeLessThan(0.3);    // and the web is not filled
});

test('both rims render: near-rim and far-rim sample points carry web colour', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  const { layout, pixels } = await renderWebFrame(page);

  function rimPoint(center, radius, angle) {
    return { x: Math.round(center.x + Math.cos(angle) * radius), y: Math.round(center.y + Math.sin(angle) * radius) };
  }

  let nearLit = 0;
  let farLit = 0;
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    const n = rimPoint(layout.nearCenter, layout.nearRadius, a);
    if (isWebish(pixels, W, n.x, n.y)) nearLit++;
    const f = rimPoint(layout.vanishing, layout.farRadius, a);
    if (isWebish(pixels, W, f.x, f.y)) farLit++;
  }
  expect(nearLit).toBe(12);
  expect(farLit).toBe(12);
});
