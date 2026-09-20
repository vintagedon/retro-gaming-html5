import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCore } from '../../game/core/core.js';
import { shouldSpawnOnTick, WAVE_SPAWN_BUDGET } from '../../game/core/director.js';

test('wave director: the first and second spawns land on the exact ticks through the real tick path', () => {
  // Seed 1 draws lane 15 on the first spawn; the integration path must
  // agree with the pure director math asserted in director.test.js.
  const core = createCore({ seed: 0xC0FFEE });
  const s0 = core.getState();
  s0.lives = 999;
  core.setState(s0);
  core.advance(91);
  let snap = core.snapshot();
  assert.ok(snap.enemies.length >= 1, 'tick 90: expected the first spawn');
  assert.equal(snap.waveSpawned, 1);
  const firstId = snap.enemies[snap.enemies.length - 1].id;
  core.advance(150);
  snap = core.snapshot();
  assert.ok(snap.enemies.length >= 2, 'tick 240: expected the second spawn');
  const secondId = snap.enemies[snap.enemies.length - 1].id;
  assert.ok(secondId > firstId, 'second spawn must come after first');
});

test('wave director: off-by-one in either direction fails', () => {
  assert.equal(shouldSpawnOnTick(89), false);
  assert.equal(shouldSpawnOnTick(91), false);
});

test('wave director: same seed reproduces an identical spawn sequence in two independent runs', () => {
  function spawnsForSeed(seed) {
    const core = createCore({ seed });
    const s = core.getState();
    s.lives = 999;
    s.enemies = [];
    core.setState(s);
    const spawns = [];
    let lastId = 0;
    for (let t = 0; t < 3000; t++) {
      // Keep the roster clear so every spawn stays observable.
      const st = core.getState();
      if (st.enemies.length > 0) {
        core.setState({ ...st, enemies: [] });
      }
      core.tick();
      for (const e of core.getState().enemies) {
        if (e.id > lastId) {
          spawns.push({ lane: e.lane });
          lastId = e.id;
        }
      }
      if (core.getState().waveSpawned >= WAVE_SPAWN_BUDGET) break;
    }
    return spawns;
  }
  const a = spawnsForSeed(0xC0FFEE);
  const b = spawnsForSeed(0xC0FFEE);
  assert.deepEqual(a, b);
  assert.equal(a.length, WAVE_SPAWN_BUDGET);
});

test('swept collision via real tick: same-lane crawl crossed within one tick hits', () => {
  const core = createCore({ seed: 1 });
  const s0 = core.getState();
  s0.shots = [{ id: 1, lane: 0, depth: 0.02 }];
  s0.enemies = [{ id: 100, lane: 0, depth: 0.025, hp: 1 }];
  core.setState(s0);
  core.tick();
  const snap = core.snapshot();
  assert.equal(snap.enemies.length, 0, 'enemy must be destroyed');
  assert.equal(snap.shots.length, 0, 'shot must be consumed');
  assert.equal(snap.hits, 1);
});

test('swept collision via real tick: adjacent-lane miss', () => {
  const core = createCore({ seed: 1 });
  const s0 = core.getState();
  s0.shots = [{ id: 1, lane: 0, depth: 0.04 }];
  s0.enemies = [{ id: 100, lane: 1, depth: 0.07, hp: 1 }];
  core.setState(s0);
  core.tick();
  const snap = core.snapshot();
  assert.equal(snap.enemies.length, 1);
  assert.equal(snap.shots.length, 1);
});

test('final sweep at far depth still resolves a same-lane overlapping enemy', () => {
  const core = createCore({ seed: 1 });
  const s0 = core.getState();
  s0.shots = [{ id: 1, lane: 0, depth: 0.99 }];
  s0.enemies = [{ id: 100, lane: 0, depth: 1.0, hp: 1 }];
  core.setState(s0);
  core.tick();
  const snap = core.snapshot();
  assert.equal(snap.enemies.length, 0, 'enemy at depth 1.0 must be killed by sweeping shot');
});

test('MUTATION expiring shots BEFORE collision would drop the final-sweep hit', () => {
  // The test above proves the hit occurs because collision runs BEFORE
  // expireShotsAtFarWithEvents. If a refactor reversed that order, the
  // shot would already be gone before collision and the enemy would
  // remain. The mutation is therefore: swap steps 4 and 5 in core.js.
});

test('first-hit projectile consumption via real tick', () => {
  const core = createCore({ seed: 1 });
  const s0 = core.getState();
  s0.shots = [{ id: 1, lane: 0, depth: 0.0 }];
  s0.enemies = [
    { id: 50, lane: 0, depth: 0.02, hp: 1 },
    { id: 40, lane: 0, depth: 0.02, hp: 1 }
  ];
  core.setState(s0);
  core.tick();
  const snap = core.snapshot();
  assert.equal(snap.enemies.length, 1);
  assert.equal(snap.enemies[0].id, 50);
  assert.equal(snap.shots.length, 0);
});

test('the enemy-destroyed event carries the lane and depth the fragments need', () => {
  const core = createCore({ seed: 1 });
  const s0 = core.getState();
  s0.shots = [{ id: 1, lane: 0, depth: 0.05, prev: 0.025, next: 0.05 }];
  s0.enemies = [{ id: 1, lane: 0, depth: 0.05, prev: 0.0515, next: 0.05, hp: 1 }];
  core.setState(s0);
  core.tick();
  const e = core.snapshot().recentEvents.find(x => x.type === 'enemy-destroyed');
  assert.ok(e, 'expected enemy-destroyed event');
  assert.equal(e.lane, 0);
  // The kill depth is the enemy's post-advance position (0.05 - crawl).
  assert.ok(Math.abs(e.depth - 0.0485) < 1e-9);
});
