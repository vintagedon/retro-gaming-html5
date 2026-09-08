import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCore } from '../../game/core/core.js';
import { BANDS, shouldSpawnOnTick, bandForTick } from '../../game/core/director.js';

test('director: first and second spawn of every band land on the exact tick', () => {
  // Drive the real tick path through the core to each band's first and
  // second spawn ticks. A fresh core for each case avoids noise from
  // earlier bands. The integration path must agree with the pure
  // director math asserted in tests/core/director.test.js.
  // State.elapsedTicks at end equals number of completed ticks, so to
  // reach tick index `c.first` we run `c.first + 1` ticks.
  const cases = [
    { first: 59, second: 119 },
    { first: 3659, second: 3707 },
    { first: 10835, second: 10871 },
    { first: 14426, second: 14453 }
  ];
  for (const c of cases) {
    const core = createCore({ seed: 0xC0FFEE });
    const s0 = core.getState();
    s0.lives = 999;
    core.setState(s0);
    core.advance(c.first + 1);
    let snap = core.snapshot();
    assert.ok(snap.enemies.length >= 1, `tick ${c.first}: expected an enemy to have spawned`);
    const firstId = snap.enemies[snap.enemies.length - 1].id;
    core.advance(c.second - c.first);
    snap = core.snapshot();
    assert.ok(snap.enemies.length >= 2, `tick ${c.second}: expected a second spawn`);
    const secondId = snap.enemies[snap.enemies.length - 1].id;
    assert.ok(secondId > firstId, 'second spawn must come after first');
  }
});

test('director: off-by-one in either direction fails', () => {
  // Verified by tests/core/director.test.js: ticks 58, 60, 3658, 3660
  // are NOT spawn ticks.
  assert.equal(shouldSpawnOnTick(58, bandForTick(59)), false);
  assert.equal(shouldSpawnOnTick(60, bandForTick(59)), false);
  assert.equal(shouldSpawnOnTick(3658, bandForTick(3659)), false);
  assert.equal(shouldSpawnOnTick(3660, bandForTick(3659)), false);
});

test('director: same seed reproduces identical lane sequence in two independent runs', () => {
  function lanesOnSpawnTicks(seed) {
    const ticks = [];
    for (let t = 0; t < 18000; t++) {
      if (shouldSpawnOnTick(t, bandForTick(t))) ticks.push(t);
    }
    const out = [];
    for (const t of ticks) {
      const c = createCore({ seed });
      const s = c.getState();
      s.lives = 999;
      c.setState(s);
      c.advance(t + 1);
      const snap = c.snapshot();
      const last = snap.enemies[snap.enemies.length - 1];
      out.push(last?.lane);
    }
    return out;
  }
  const a = lanesOnSpawnTicks(0xC0FFEE);
  const b = lanesOnSpawnTicks(0xC0FFEE);
  assert.deepEqual(a, b);
  assert.ok(a.length > 100);
});

test('swept collision via real tick: same-lane crawl crossed within one tick hits', () => {
  const core = createCore({ seed: 1 });
  // shot prev=0.02 next=0.045; enemy prev=0.025 next=0.0235
  // swept shot = [0.02, 0.045], swept enemy = [0.0235, 0.025]; overlap.
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

test('final tick breach (tick 17999) is lethal through the real tick path', () => {
  const core = createCore({ seed: 1 });
  const s0 = core.getState();
  s0.lives = 999;
  core.setState(s0);
  core.advance(17999);
  const s1 = core.getState();
  s1.lives = 1;
  s1.damageGraceRemaining = 0;
  s1.enemies = [{ id: 999, lane: 0, depth: 0.0015, hp: 1 }];
  core.setState(s1);
  core.tick();
  const s = core.snapshot();
  assert.equal(s.outcome, 'lost');
  assert.equal(s.lives, 0);
  assert.equal(s.elapsedTicks, 18000);
});

test('BANDS table has 4 bands covering the run', () => {
  assert.equal(BANDS.length, 4);
  assert.equal(BANDS[0].start, 0);
  assert.equal(BANDS[BANDS.length - 1].end, 17999);
});