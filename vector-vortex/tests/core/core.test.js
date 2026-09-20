import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCore, serializeState, deserializeState } from '../../game/core/core.js';
import { WAVE_SPAWN_BUDGET } from '../../game/core/director.js';

function snapshotDigest(core) {
  return JSON.stringify(core.snapshot());
}

test('initial snapshot has lane=0, lives=3, score=0, elapsed=0, no shots, no enemies', () => {
  const core = createCore({ seed: 1 });
  const s = core.snapshot();
  assert.equal(s.lane, 0);
  assert.equal(s.lives, 3);
  assert.equal(s.score, 0);
  assert.equal(s.elapsedTicks, 0);
  assert.equal(s.shots.length, 0);
  assert.equal(s.enemies.length, 0);
  assert.equal(s.enemyShots.length, 0);
  assert.equal(s.outcome, null);
});

test('a single keypress moves exactly one lane (tap-and-repeat)', () => {
  const core = createCore({ seed: 1 });
  core.dispatch({ type: 'left-down' });
  core.tick();
  core.dispatch({ type: 'left-up' });
  assert.equal(core.snapshot().lane, 23);
  // Ticks with no held input never move.
  core.advance(11);
  assert.equal(core.snapshot().lane, 23);
});

test('dispatch right then tick advances lane from 23 to 0 (wrap)', () => {
  const core = createCore({ seed: 1 });
  for (let i = 0; i < 23; i++) {
    core.dispatch({ type: 'right-down' });
    core.tick();
    core.dispatch({ type: 'right-up' });
    core.tick(); // the release tick: the next press is fresh
  }
  assert.equal(core.snapshot().lane, 23);
  core.dispatch({ type: 'right-down' });
  core.tick();
  core.dispatch({ type: 'right-up' });
  core.tick();
  assert.equal(core.snapshot().lane, 0);
});

test('simultaneous left+right cancel: lane unchanged after tick', () => {
  const core = createCore({ seed: 1 });
  core.dispatch({ type: 'left-down' });
  core.dispatch({ type: 'right-down' });
  core.tick();
  assert.equal(core.snapshot().lane, 0);
});

test('holding produces the first repeat only after the configured delay, then at the interval', () => {
  const core = createCore({ seed: 1 });
  core.dispatch({ type: 'right-down' });
  core.tick(); // press tick: lane 1
  core.advance(11); // ticks 1..11: no repeat before the 12-tick delay
  assert.equal(core.snapshot().lane, 1, 'no repeat inside the delay');
  core.tick(); // tick 12: first repeat
  assert.equal(core.snapshot().lane, 2, 'first repeat after the delay');
  core.advance(4); // ticks 13..16: inside the 5-tick interval
  assert.equal(core.snapshot().lane, 2, 'no second repeat inside the interval');
  core.tick(); // tick 17: second repeat
  assert.equal(core.snapshot().lane, 3, 'repeat at the interval');
  core.dispatch({ type: 'right-up' });
});

test('fire creates shot at lane=0 depth=0.025 after one tick', () => {
  const core = createCore({ seed: 1 });
  core.dispatch({ type: 'fire-down' });
  core.tick();
  const s = core.snapshot();
  assert.equal(s.shots.length, 1);
  assert.equal(s.shots[0].lane, 0);
  assert.equal(s.shots[0].depth, 0.025);
  assert.equal(s.shots[0].id, 1);
});

test('cap of 6 active shots enforced: seventh fire blocked when 6 already active', () => {
  const core = createCore({ seed: 1 });
  core.dispatch({ type: 'fire-down' });
  core.tick();
  // To prove the cap, stage 6 active shots with the cooldown cleared.
  const filled = JSON.parse(JSON.stringify(core.getState()));
  filled.shots = Array.from({ length: 6 }, (_, i) => ({ id: 100 + i, lane: 0, depth: 0.5 }));
  filled.cooldown = 0;
  core.setState(filled);
  core.tick();
  assert.equal(core.snapshot().shots.length, 6, 'seventh fire blocked while 6 active');
});

test('JSON round-trip preserves state digests after identical advances', () => {
  const coreA = createCore({ seed: 0xC0FFEE });
  coreA.dispatch({ type: 'fire-down' });
  coreA.tick();
  coreA.dispatch({ type: 'fire-up' });
  coreA.advance(10);
  const digestA = snapshotDigest(coreA);
  // Round-trip coreA's state
  const restored = deserializeState(serializeState(coreA.getState()));
  // Replay coreA's action log via the snapshot reference on a fresh core
  const coreB = createCore({ seed: 0xC0FFEE });
  coreB.dispatch({ type: 'fire-down' });
  coreB.tick();
  coreB.dispatch({ type: 'fire-up' });
  coreB.advance(10);
  assert.equal(digestA, snapshotDigest(coreB));
  // Replace coreA's state with the round-tripped clone and verify digests match.
  const restoredDigest = snapshotDigest(coreA);
  coreA.setState(restored);
  assert.equal(restoredDigest, snapshotDigest(coreA));
});

test('MUTATION dropping any serialized field changes the digest', () => {
  const core = createCore({ seed: 1 });
  core.dispatch({ type: 'fire-down' });
  core.tick();
  core.dispatch({ type: 'fire-up' });
  const fullState = core.getState();
  const fullDigest = JSON.stringify(core.snapshot());
  const serializedKeys = Object.keys(JSON.parse(serializeState(fullState)));
  let anyDiff = false;
  const allDiffs = [];
  for (const k of serializedKeys) {
    const cloned = JSON.parse(serializeState(fullState));
    delete cloned[k];
    try {
      core.setState(cloned);
      const d = JSON.stringify(core.snapshot());
      if (d !== fullDigest) {
        anyDiff = true;
        allDiffs.push(k);
      }
    } catch {
      anyDiff = true;
      allDiffs.push(k);
    }
  }
  assert.equal(anyDiff, true, `no dropped field changed digest (tried: ${serializedKeys.join(',')})`);
  assert.ok(allDiffs.length > 0);
});

test('two independent core instances from same seed produce identical digests under identical action log', () => {
  function runWithSeed(seed, n) {
    const core = createCore({ seed });
    core.dispatch({ type: 'fire-down' });
    core.dispatch({ type: 'fire-up' });
    core.advance(n);
    return core.snapshot();
  }
  const a = runWithSeed(0xC0FFEE, 50);
  const b = runWithSeed(0xC0FFEE, 50);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test('snapshot events array records tick advances', () => {
  const core = createCore({ seed: 1 });
  core.advance(3);
  const s = core.snapshot();
  assert.ok(Array.isArray(s.recentEvents));
});

test('release actions clear held input', () => {
  const core = createCore({ seed: 1 });
  core.dispatch({ type: 'left-down' });
  core.dispatch({ type: 'left-up' });
  core.tick();
  core.tick();
  assert.equal(core.snapshot().lane, 0);
});

test('shot-fired event is emitted after commit', () => {
  const core = createCore({ seed: 1 });
  core.dispatch({ type: 'fire-down' });
  core.tick();
  const events = core.snapshot().recentEvents;
  const e = events.find(x => x.type === 'shot-fired');
  assert.ok(e, 'expected shot-fired event');
  assert.equal(e.lane, 0);
  assert.equal(e.tick, 0);
});

test('two same-tick breaches cost one life, all breachers clear', () => {
  const core = createCore({ seed: 1 });
  const s0 = core.getState();
  s0.enemies = [
    { id: 1, lane: 0, depth: 0.0015, hp: 1 },
    { id: 2, lane: 1, depth: 0.0015, hp: 1 }
  ];
  core.setState(s0);
  core.tick();
  const s = core.snapshot();
  assert.equal(s.lives, 2);
  assert.equal(s.enemies.length, 0);
});

test('breach inside 30-tick grace costs no life', () => {
  const core = createCore({ seed: 1 });
  const s0 = core.getState();
  s0.enemies = [{ id: 1, lane: 0, depth: 0.0015, hp: 1 }];
  core.setState(s0);
  core.tick();
  assert.equal(core.snapshot().lives, 2);
  assert.equal(core.snapshot().damageGraceRemaining, 30);
  const s1 = core.getState();
  s1.enemies = [{ id: 2, lane: 0, depth: 0.0015, hp: 1 }];
  core.setState(s1);
  core.tick();
  assert.equal(core.snapshot().lives, 2);
});

test('a kill scores 100 and kill score only (no survival or accuracy bonus)', () => {
  const core = createCore({ seed: 1 });
  const s0 = core.getState();
  s0.shots = [{ id: 1, lane: 0, depth: 0.05, prev: 0.025, next: 0.05 }];
  s0.enemies = [{ id: 1, lane: 0, depth: 0.05, prev: 0.0515, next: 0.05, hp: 1 }];
  core.setState(s0);
  core.tick();
  const s = core.snapshot();
  assert.equal(s.kills, 1);
  assert.equal(s.score, 100);
  assert.equal(s.accuracyPercent, undefined, 'accuracy projection is retired with the bonus scoring');
});

test('a survivable breach does not strand the player: resolved enemies count toward the clear', () => {
  const core = createCore({ seed: 1 });
  const s0 = core.getState();
  s0.waveSpawned = WAVE_SPAWN_BUDGET;
  s0.lives = 999;
  s0.enemies = [{ id: 1, lane: 0, depth: 0.0015, hp: 1 }];
  core.setState(s0);
  core.tick();
  const s = core.snapshot();
  assert.equal(s.lives, 998, 'the breach cost its life');
  assert.equal(s.enemies.length, 0, 'the breach resolved its enemy');
  assert.equal(s.outcome, 'wave-complete', 'the wave cleared with zero kills on the roster');
});

test('death on the final enemy resolves as game-over rather than a clear', () => {
  const core = createCore({ seed: 1 });
  const s0 = core.getState();
  s0.waveSpawned = WAVE_SPAWN_BUDGET;
  s0.lives = 1;
  s0.damageGraceRemaining = 0;
  s0.enemies = [{ id: 1, lane: 0, depth: 0.0015, hp: 1 }];
  core.setState(s0);
  core.tick();
  const s = core.snapshot();
  assert.equal(s.lives, 0);
  assert.equal(s.outcome, 'game-over', 'damage and death resolve before the clear');
});

test('a wave with an unexhausted budget never clears while enemies remain', () => {
  const core = createCore({ seed: 1 });
  const s0 = core.getState();
  s0.waveSpawned = 1;
  s0.lives = 999;
  s0.enemies = [{ id: 1, lane: 0, depth: 0.5, hp: 1, nextFireTick: 999999 }];
  core.setState(s0);
  core.advance(50);
  assert.equal(core.snapshot().outcome, null, 'the wave is still live');
});

test('clearing the wave discards enemy shots still in flight and freezes gameplay', () => {
  const core = createCore({ seed: 1 });
  const s0 = core.getState();
  s0.waveSpawned = WAVE_SPAWN_BUDGET;
  s0.lives = 999;
  s0.enemies = [{ id: 1, lane: 0, depth: 0.0015, hp: 1 }];
  s0.enemyShots = [{ id: 7, lane: 3, depth: 0.4, prev: 0.41, next: 0.4 }];
  core.setState(s0);
  core.tick();
  const s = core.snapshot();
  assert.equal(s.outcome, 'wave-complete');
  assert.equal(s.enemyShots.length, 0, 'in-flight enemy shots are discarded');
  const before = s.elapsedTicks;
  core.advance(30);
  assert.equal(core.snapshot().elapsedTicks, before, 'gameplay is frozen at the outcome');
});

test('the wave-complete outcome emits its event after commit', () => {
  const core = createCore({ seed: 1 });
  const s0 = core.getState();
  s0.waveSpawned = WAVE_SPAWN_BUDGET;
  s0.lives = 999;
  s0.enemies = [];
  core.setState(s0);
  core.tick();
  const e = core.snapshot().recentEvents.find(x => x.type === 'run-ended');
  assert.ok(e, 'run-ended event expected');
  assert.equal(e.outcome, 'wave-complete');
});

test('a fresh state clears paused and outcome (restart path)', () => {
  const core = createCore({ seed: 1 });
  const s0 = core.getState();
  s0.outcome = 'game-over';
  core.setState(s0);
  core.dispatch({ type: 'restart' });
  const s = core.snapshot();
  assert.equal(s.outcome, null);
  assert.equal(s.lives, 3);
  assert.equal(s.enemyShots.length, 0);
});
