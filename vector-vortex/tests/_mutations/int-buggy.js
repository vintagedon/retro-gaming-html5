// Mutation helper used ONLY by the inclusive-bounds mutation test in
// tests/core/rng.test.js. Uses `max - min` instead of `max - min + 1`,
// which would make int(max,max) impossible. Replays the same seed in
// lockstep with the test so each draw index matches a fresh createRng call.
//
// This file lives under tests/_mutations/ rather than game/core/ to keep
// the rules directory pure (per the purity check).
export function intBuggy(seed, min, max, drawIndex) {
  let s = (seed >>> 0) || 1;
  function next() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  for (let i = 0; i <= drawIndex; i++) next();
  return min + Math.floor(next() * (max - min));
}