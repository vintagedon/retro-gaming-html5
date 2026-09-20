// Vector Vortex enemy fire validation (Spec 03 gate 2).
// The enemy fires back: along its own lane, toward the rim, costing a life
// only while the player occupies that lane, resolved by the swept-interval
// rule so a shot cannot pass through the player between ticks. Shots
// expire at the rim, removed after hit resolution. A breach and an enemy
// shot resolving on the same tick cost at most one life.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCore } from '../../game/core/core.js';
import { WAVE_SPAWN_BUDGET } from '../../game/core/director.js';
import {
  ENEMY_SHOT_SPEED,
  MAX_ACTIVE_ENEMY_SHOTS,
  ENEMY_FIRE_INTERVAL_TICKS,
  ENEMY_FIRE_EARLIEST_TICK,
  initialFireTick
} from '../../game/core/enemy-shots.js';

function stage(core, overrides) {
  const s0 = core.getState();
  core.setState({ ...s0, ...overrides });
  return core;
}

test('the enemy fire balance rows carry the recorded values', () => {
  assert.equal(ENEMY_SHOT_SPEED, 0.01);
  assert.equal(MAX_ACTIVE_ENEMY_SHOTS, 4);
  assert.equal(ENEMY_FIRE_INTERVAL_TICKS, 150);
  assert.equal(ENEMY_FIRE_EARLIEST_TICK, 120);
  assert.equal(initialFireTick(200), 320);
});

test('an enemy fires along its own lane and the shot travels toward the rim', () => {
  const core = createCore({ seed: 1 });
  // Spawned at tick 0, fire due during the tick with elapsedTicks 120.
  stage(core, {
    waveSpawned: WAVE_SPAWN_BUDGET,
    enemies: [{ id: 1, lane: 7, depth: 0.5, hp: 1, spawnedTick: 0, nextFireTick: 120 }],
    enemyShots: []
  });
  core.advance(121);
  let s = core.snapshot();
  assert.equal(s.enemyShots.length, 1, 'the due enemy fired');
  assert.equal(s.enemyShots[0].lane, 7, 'the shot rides the enemy lane');
  assert.equal(s.recentEvents.some(e => e.type === 'enemy-shot-fired'), true);
  // One tick of travel moves the shot toward the rim by ENEMY_SHOT_SPEED.
  const before = s.enemyShots[0].depth;
  core.tick();
  s = core.snapshot();
  assert.ok(Math.abs(s.enemyShots[0].depth - (before - ENEMY_SHOT_SPEED)) < 1e-12, 'shot travels toward the rim');
});

test('an enemy does not fire before its earliest fire tick', () => {
  const core = createCore({ seed: 1 });
  stage(core, {
    waveSpawned: WAVE_SPAWN_BUDGET,
    enemies: [{ id: 1, lane: 3, depth: 0.9, hp: 1, spawnedTick: 0, nextFireTick: 120 }],
    enemyShots: []
  });
  core.advance(120);
  assert.equal(core.snapshot().enemyShots.length, 0, 'no fire before the due tick');
  core.tick(); // the tick whose elapsedTicks is 120
  assert.equal(core.snapshot().enemyShots.length, 1, 'fires on the due tick');
  // The next fire waits a full interval. Shot count alone cannot tell a
  // second fire from an expiry, so count shots via the core's id counter.
  assert.equal(core.getState().nextEnemyShotId, 2, 'one fire has happened');
  core.advance(ENEMY_FIRE_INTERVAL_TICKS - 1);
  assert.equal(core.getState().nextEnemyShotId, 2, 'no second fire inside the interval');
  core.advance(1);
  assert.equal(core.getState().nextEnemyShotId, 3, 'second fire exactly one interval later');
});

test('the active enemy-shot cap holds at four', () => {
  const core = createCore({ seed: 1 });
  // Two enemies due on the same tick, firing every 20 ticks so the cap is
  // reached while earlier shots are still in flight.
  stage(core, {
    enemies: [
      { id: 1, lane: 5, depth: 0.9, hp: 1, spawnedTick: 0, nextFireTick: 120 },
      { id: 2, lane: 9, depth: 0.9, hp: 1, spawnedTick: 0, nextFireTick: 120 }
    ],
    enemyShots: []
  });
  core.advance(120 + 8 * 20);
  const peak = Math.max(...core.getState().enemyShots.map(s => s.depth), 0);
  assert.ok(core.snapshot().enemyShots.length <= MAX_ACTIVE_ENEMY_SHOTS, 'cap never exceeded');
  void peak;
});

test('a shot crossing the rim on the player lane costs a life; another lane does not', () => {
  const core = createCore({ seed: 1 });
  // Player stands on lane 0. The shot sweeps from 0.005 to -0.005.
  stage(core, {
    enemies: [],
    enemyShots: [{ id: 1, lane: 0, depth: 0.005, prev: 0.015, next: 0.005 }]
  });
  core.tick();
  const s = core.snapshot();
  assert.equal(s.lives, 2, 'the shot on the player lane costs a life');
  assert.equal(s.damageGraceRemaining, 30, 'the hit starts the damage grace');
  assert.equal(s.enemyShots.length, 0, 'the shot is consumed');

  const core2 = createCore({ seed: 1 });
  stage(core2, {
    enemyShots: [{ id: 1, lane: 1, depth: 0.005, prev: 0.015, next: 0.005 }]
  });
  core2.tick();
  const s2 = core2.snapshot();
  assert.equal(s2.lives, 3, 'a shot on another lane does nothing');
  assert.equal(s2.enemyShots.length, 0, 'the shot still expires at the rim');
});

test('a shot passing the player lane between ticks still hits (swept resolution)', () => {
  const core = createCore({ seed: 1 });
  // One tick of travel carries the whole crossing: prev 0.005, next
  // -0.005 after the advance, so the hit lands inside a single tick.
  stage(core, {
    enemyShots: [{ id: 1, lane: 0, depth: 0.005 }]
  });
  core.tick();
  assert.equal(core.snapshot().lives, 2, 'the swept crossing hits');
});

test('a breach and an enemy shot on the same tick cost exactly one life', () => {
  const core = createCore({ seed: 1 });
  stage(core, {
    enemies: [{ id: 1, lane: 5, depth: 0.001, hp: 1 }],
    enemyShots: [{ id: 1, lane: 0, depth: 0.005, prev: 0.015, next: 0.005 }]
  });
  core.tick();
  const s = core.snapshot();
  assert.equal(s.lives, 2, 'breach resolves first; the shot finds grace and costs nothing');
  assert.equal(s.damageGraceRemaining, 30);
});

test('while protected by grace, a breach and an enemy shot cost nothing', () => {
  const core = createCore({ seed: 1 });
  stage(core, {
    damageGraceRemaining: 15,
    enemies: [{ id: 1, lane: 5, depth: 0.001, hp: 1 }],
    enemyShots: [{ id: 1, lane: 0, depth: 0.005, prev: 0.015, next: 0.005 }]
  });
  core.tick();
  const s = core.snapshot();
  assert.equal(s.lives, 3, 'grace absorbs both');
});

test('two shots crossing on the player lane in one tick cost at most one life', () => {
  const core = createCore({ seed: 1 });
  stage(core, {
    enemyShots: [
      { id: 1, lane: 0, depth: 0.005, prev: 0.015, next: 0.005 },
      { id: 2, lane: 0, depth: 0.004, prev: 0.014, next: 0.004 }
    ]
  });
  core.tick();
  const s = core.snapshot();
  assert.equal(s.lives, 2, 'the first hit starts the grace the second finds');
});

test('a shot whose firing enemy is destroyed remains in flight', () => {
  const core = createCore({ seed: 1 });
  // The enemy fires during tick 100 and a player shot destroys it on that
  // same tick; its shot must survive the enemy's death. A second enemy
  // keeps the wave live so the clear cannot discard the shot (the clear
  // rule discards in-flight shots, and that is tested against the core).
  stage(core, {
    waveSpawned: WAVE_SPAWN_BUDGET - 1,
    enemies: [
      { id: 1, lane: 5, depth: 0.9, hp: 1, spawnedTick: 0, nextFireTick: 100 },
      { id: 2, lane: 15, depth: 0.99, hp: 1, spawnedTick: 10, nextFireTick: 999999 }
    ],
    enemyShots: [],
    shots: []
  });
  core.advance(100); // ticks 0..99
  const st = core.getState();
  st.shots = [{ id: 1, lane: 5, depth: 0.725 }];
  core.setState(st);
  core.advance(1); // tick 100: the enemy fires and dies on the same tick
  const s = core.snapshot();
  assert.equal(s.enemies.length, 1, 'only the firing enemy was destroyed');
  assert.equal(s.enemies[0].id, 2);
  assert.equal(s.enemyShots.length, 1, 'the enemy shot stays in flight');
  assert.equal(s.outcome, null, 'the wave is still live');
});
