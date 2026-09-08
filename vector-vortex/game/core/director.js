import { createRng } from './rng.js';

// Director bands per Spec 01. Each band carries the exact first-spawn tick
// because the spec lists 3,659 for band 2 explicitly while describing the
// other three bands under the construction `bandStart + interval - 1`.
// This is a documented spec defect; see docs/spec-defects.md.
export const BANDS = [
  { start: 0, end: 3599, interval: 60, firstSpawn: 59 },
  { start: 3600, end: 10799, interval: 48, firstSpawn: 3659 },
  { start: 10800, end: 14399, interval: 36, firstSpawn: 10835 },
  { start: 14400, end: 17999, interval: 27, firstSpawn: 14426 }
];

export function bandForTick(tick) {
  for (const b of BANDS) {
    if (tick >= b.start && tick <= b.end) return b;
  }
  throw new Error(`tick ${tick} outside run window`);
}

export function shouldSpawnOnTick(tick, band) {
  if (tick < band.start || tick > band.end) return false;
  const offset = tick - band.firstSpawn;
  if (offset < 0) return false;
  return offset % band.interval === 0;
}

export function nextSpawnTickAfter(tick, band) {
  const start = Math.max(tick + 1, band.firstSpawn);
  const k = (start - band.firstSpawn) % band.interval;
  const first = k === 0 ? start : start + (band.interval - k);
  return first <= band.end ? first : null;
}

export function createDirector({ seed }) {
  const rng = createRng(seed);
  return {
    tickSpawned(state) {
      const band = bandForTick(state.elapsedTicks);
      if (!shouldSpawnOnTick(state.elapsedTicks, band)) return null;
      const lane = rng.int(0, 23);
      return { lane };
    },
    _rng: rng
  };
}