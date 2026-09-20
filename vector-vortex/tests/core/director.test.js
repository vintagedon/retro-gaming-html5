import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldSpawnOnTick,
  createWaveDirector,
  WAVE_SPAWN_BUDGET,
  WAVE_SPAWN_INTERVAL_TICKS,
  WAVE_FIRST_SPAWN_TICK,
  budgetExhausted,
  waveCleared
} from '../../game/core/director.js';

test('the wave constants carry the recorded budget, interval, and first spawn', () => {
  assert.equal(WAVE_SPAWN_BUDGET, 12);
  assert.equal(WAVE_SPAWN_INTERVAL_TICKS, 150);
  assert.equal(WAVE_FIRST_SPAWN_TICK, 90);
});

test('spawn ticks: first at 90, then every 150, never before', () => {
  assert.equal(shouldSpawnOnTick(0), false);
  assert.equal(shouldSpawnOnTick(89), false);
  assert.equal(shouldSpawnOnTick(90), true);
  assert.equal(shouldSpawnOnTick(91), false);
  assert.equal(shouldSpawnOnTick(239), false);
  assert.equal(shouldSpawnOnTick(240), true);
  assert.equal(shouldSpawnOnTick(390), true);
});

test('MUTATION one-tick offset in either direction fails the first-spawn check', () => {
  assert.notEqual(shouldSpawnOnTick(89), true, 'tick 89 must NOT spawn (off-by-one)');
  assert.notEqual(shouldSpawnOnTick(91), true, 'tick 91 must NOT spawn (off-by-one)');
});

test('budgetExhausted and waveCleared count resolved enemies, not kills', () => {
  assert.equal(budgetExhausted({ waveSpawned: 0 }), false);
  assert.equal(budgetExhausted({ waveSpawned: WAVE_SPAWN_BUDGET - 1 }), false);
  assert.equal(budgetExhausted({ waveSpawned: WAVE_SPAWN_BUDGET }), true);
  // A breach removes its enemy, so an empty roster with a full budget
  // clears even when no kill was ever scored.
  assert.equal(waveCleared({ waveSpawned: WAVE_SPAWN_BUDGET, enemies: [] }), true);
  assert.equal(waveCleared({ waveSpawned: WAVE_SPAWN_BUDGET, enemies: [{ id: 1 }] }), false);
  assert.equal(waveCleared({ waveSpawned: 0, enemies: [] }), false);
});

test('MUTATION counting kills instead of resolved enemies would strand the player after a survivable breach', () => {
  // A survivable breach resolves the enemy without a kill; the clear
  // condition reads the roster, so this passes only under the correct rule.
  const state = { waveSpawned: WAVE_SPAWN_BUDGET, enemies: [] };
  assert.equal(waveCleared(state), true);
});

test('the wave director with a fixed seed produces an identical lane sequence across two runs', () => {
  function runSequence(seed) {
    const dir = createWaveDirector({ seed });
    const lanes = [];
    let spawned = 0;
    for (let t = 0; t < 4000 && spawned < WAVE_SPAWN_BUDGET; t++) {
      const out = dir.tickSpawned({ elapsedTicks: t, waveSpawned: spawned });
      if (out) {
        lanes.push(out.lane);
        spawned += 1;
      }
    }
    return lanes;
  }
  const a = runSequence(0xC0FFEE);
  const b = runSequence(0xC0FFEE);
  assert.deepEqual(a, b);
  assert.equal(a.length, WAVE_SPAWN_BUDGET, 'the director stops at the budget');
  for (const l of a) {
    assert.ok(Number.isInteger(l));
    assert.ok(l >= 0 && l <= 23);
  }
});

test('the director refuses to spawn past the budget even on a schedule tick', () => {
  const dir = createWaveDirector({ seed: 1 });
  const out = dir.tickSpawned({ elapsedTicks: WAVE_FIRST_SPAWN_TICK, waveSpawned: WAVE_SPAWN_BUDGET });
  assert.equal(out, null);
});
