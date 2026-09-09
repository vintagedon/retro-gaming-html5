// Vector Vortex D2.3 validation: director's RNG position is serialized in
// the core state. A fresh run, a restarted run, and a round-tripped run at
// the same seed produce identical lane sequences for their next ten spawns.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCore } from '../../game/core/core.js';

function nextTenLaneSequence(core) {
  const lanes = [];
  for (let t = 0; t < 18000 && lanes.length < 10; t++) {
    core.dispatch({ type: 'fire-down' });
    core.dispatch({ type: 'fire-up' });
    core.tick();
    // Look for new enemies this tick.
    const s = core.getState();
    for (const e of s.enemies) {
      if (lanes.length < 10 && (!lanes._lastId || e.id > lanes._lastId)) {
        lanes.push(e.lane);
        lanes._lastId = e.id;
      }
    }
  }
  return lanes.slice(0, 10);
}

test('director with seed 0xC0FFEE produces 10 spawns over 720 ticks (D2.3 baseline)', () => {
  const a = createCore({ seed: 0xC0FFEE });
  let lastEnemyId = 0;
  let spawnCount = 0;
  for (let t = 0; t < 720; t++) {
    a.tick();
    for (const e of a.getState().enemies) {
      if (e.id > lastEnemyId) { spawnCount++; lastEnemyId = e.id; }
    }
  }
  assert.ok(spawnCount >= 10, `should have observed 10+ spawns; got ${spawnCount}`);
});

test('round-tripped state at the same seed produces the next 10 lanes identical to a fresh run (D2.3)', () => {
  // Run A to tick 60, snapshot state, reconstruct core B with the snapshot.
  const a = createCore({ seed: 0xC0FFEE });
  for (let t = 0; t < 60; t++) a.tick();
  const snapshotA = a.getState();
  assert.ok(snapshotA.rngState != null, 'state must persist rngState after a spawn');
  // The next 10 spawn lanes of A.
  function nextTen(core) {
    const seq = [];
    let lastId = 0;
    let safety = 18000;
    while (seq.length < 10 && safety-- > 0) {
      core.tick();
      for (const e of core.getState().enemies) {
        if (e.id > lastId) { seq.push(e.lane); lastId = e.id; }
      }
    }
    return seq;
  }
  const aLanes = nextTen(a);
  // Round-trip via JSON.
  const json = JSON.stringify(snapshotA);
  const restored = JSON.parse(json);
  const b = createCore({ seed: 0xC0FFEE, initialState: restored });
  const bLanes = nextTen(b);
  assert.deepEqual(aLanes, bLanes, 'round-tripped lanes must equal the fresh-run continuation');
});

test('restart resets the director RNG so the next 10 lanes match a fresh run (D2.3)', () => {
  const a = createCore({ seed: 0xC0FFEE });
  // Advance to tick 60 and capture next 10 lanes.
  for (let t = 0; t < 60; t++) a.tick();
  function nextTen(core) {
    const seq = [];
    let lastId = 0;
    let safety = 18000;
    while (seq.length < 10 && safety-- > 0) {
      core.tick();
      for (const e of core.getState().enemies) {
        if (e.id > lastId) { seq.push(e.lane); lastId = e.id; }
      }
    }
    return seq;
  }
  const aLanes = nextTen(a);
  // Restart and capture next 10 lanes.
  a.dispatch({ type: 'restart' });
  const bLanes = nextTen(a);
  assert.deepEqual(aLanes, bLanes, 'restarted run lanes must match a fresh run continuation');
});

test('MUTATION: omitting rngState from the snapshot makes round-trip lanes diverge', () => {
  const a = createCore({ seed: 0xC0FFEE });
  for (let t = 0; t < 60; t++) a.tick();
  const snapshotA = a.getState();
  const mutated = { ...snapshotA, rngState: null };
  const json = JSON.stringify(mutated);
  const restored = JSON.parse(json);
  const b = createCore({ seed: 0xC0FFEE, initialState: restored });
  function nextTen(core) {
    const seq = [];
    let lastId = 0;
    let safety = 18000;
    while (seq.length < 10 && safety-- > 0) {
      core.tick();
      for (const e of core.getState().enemies) {
        if (e.id > lastId) { seq.push(e.lane); lastId = e.id; }
      }
    }
    return seq;
  }
  const aLanes = nextTen(a);
  const bLanes = nextTen(b);
  assert.notDeepEqual(aLanes, bLanes, 'mutation: dropping rngState must diverge the round-trip sequence');
});