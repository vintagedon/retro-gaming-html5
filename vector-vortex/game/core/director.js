import { createRng } from './rng.js';

// Director bands per Spec 01b (amendment). A band's first spawn tick index is
// computed uniformly as `bandStart + (interval - 1)` (i.e. after exactly one
// full interval of that band has been completed). The per-band explicit
// `firstSpawn` table that Spec 01 v3.0 carried for band 2 (3,659) has been
// removed; the corrected construction yields 3,647 for band 2.
export const BANDS = [
  { start: 0, end: 3599, interval: 60 },
  { start: 3600, end: 10799, interval: 48 },
  { start: 10800, end: 14399, interval: 36 },
  { start: 14400, end: 17999, interval: 27 }
];

export function firstSpawnForBand(band) {
  return band.start + (band.interval - 1);
}

export function bandForTick(tick) {
  for (const b of BANDS) {
    if (tick >= b.start && tick <= b.end) return b;
  }
  throw new Error(`tick ${tick} outside run bounds`);
}

export function shouldSpawnOnTick(tick, band) {
  if (tick < band.start || tick > band.end) return false;
  const firstSpawn = firstSpawnForBand(band);
  const offset = tick - firstSpawn;
  if (offset < 0) return false;
  return offset % band.interval === 0;
}

export function nextSpawnTickAfter(tick, band) {
  const firstSpawn = firstSpawnForBand(band);
  const start = Math.max(tick + 1, firstSpawn);
  const k = (start - firstSpawn) % band.interval;
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