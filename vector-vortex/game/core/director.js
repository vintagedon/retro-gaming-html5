import { createRng } from './rng.js';

// Single-wave director (Spec 03 gate 2). The four elapsed-time bands and
// the 18,000-tick run boundary are superseded: this slice plays one wave
// with a fixed spawn budget and interval. Rows are balance values, tuned
// by feel, and recorded alongside the tunable balance table.

export const WAVE_SPAWN_BUDGET = 12;
export const WAVE_SPAWN_INTERVAL_TICKS = 150;
export const WAVE_FIRST_SPAWN_TICK = 90;

export function shouldSpawnOnTick(tick) {
  if (tick < WAVE_FIRST_SPAWN_TICK) return false;
  return (tick - WAVE_FIRST_SPAWN_TICK) % WAVE_SPAWN_INTERVAL_TICKS === 0;
}

export function budgetExhausted(state) {
  return (state.waveSpawned ?? 0) >= WAVE_SPAWN_BUDGET;
}

// The wave clears when the spawn budget is exhausted and no enemies
// remain. A breach removes its enemy, so resolved enemies count, not
// kills; a survivable breach must not strand the player.
export function waveCleared(state) {
  return budgetExhausted(state) && state.enemies.length === 0;
}

export function createWaveDirector({ seed }) {
  const rng = createRng(seed);
  return {
    tickSpawned(state) {
      if (budgetExhausted(state)) return null;
      if (!shouldSpawnOnTick(state.elapsedTicks)) return null;
      const lane = rng.int(0, 23);
      return { lane };
    },
    _rng: rng
  };
}
