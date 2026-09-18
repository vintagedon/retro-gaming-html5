import { createRng } from './rng.js';

// Terrain is a fixed-height polyline generated from RNG draws, so the
// same run seed always produces the same ground. The landing site is
// flattened to datum height and everything else carries procedural
// ridges bounded by config.
export function generateTerrain(config, rng) {
  const { points, ridgeHeight, padFlatMargin } = config.terrain;
  const width = config.world.width;
  const raw = [];
  for (let i = 0; i < points; i += 1) {
    raw.push(rng.draw());
  }

  const heights = new Array(points);
  for (let i = 0; i < points; i += 1) {
    const prev = raw[Math.max(0, i - 1)];
    const next = raw[Math.min(points - 1, i + 1)];
    const smooth = (prev + 2 * raw[i] + next) / 4;
    heights[i] = smooth * ridgeHeight;
  }

  const half = config.landing.siteWidth / 2;
  const flatLow = config.landing.siteX - half - padFlatMargin;
  const flatHigh = config.landing.siteX + half + padFlatMargin;
  const spacing = width / (points - 1);
  for (let i = 0; i < points; i += 1) {
    const x = i * spacing;
    if (x >= flatLow && x <= flatHigh) {
      heights[i] = 0;
    }
  }

  return { width, points, heights };
}

export function terrainHeightAt(terrain, x) {
  const { width, points, heights } = terrain;
  const clamped = Math.min(Math.max(x, 0), width);
  const position = (clamped / width) * (points - 1);
  const low = Math.floor(position);
  const high = Math.min(low + 1, points - 1);
  const t = position - low;
  return heights[low] + (heights[high] - heights[low]) * t;
}
