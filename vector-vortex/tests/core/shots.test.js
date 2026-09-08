import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tryFireShot,
  advanceShots,
  expireShotsAtFar,
  tryFireShotWithEvent,
  advanceShotsWithDepth,
  expireShotsAtFarWithEvents,
  SHOT_COOLDOWN_TICKS,
  MAX_ACTIVE_SHOTS,
  SHOT_SPEED,
  FAR_DEPTH
} from '../../game/core/shots.js';

function freshState() {
  return {
    lane: 0,
    cooldown: 0,
    shots: [],
    nextShotId: 1
  };
}

test('SHOT_COOLDOWN_TICKS is 8 and MAX_ACTIVE_SHOTS is 6', () => {
  assert.equal(SHOT_COOLDOWN_TICKS, 8);
  assert.equal(MAX_ACTIVE_SHOTS, 6);
  assert.equal(SHOT_SPEED, 0.025);
  assert.equal(FAR_DEPTH, 1);
});

test('fire produces shot at depth 0 on current lane, sets cooldown to 8', () => {
  let s = { ...freshState(), lane: 7 };
  s = tryFireShot(s);
  assert.equal(s.shots.length, 1);
  assert.equal(s.shots[0].depth, 0);
  assert.equal(s.shots[0].lane, 7);
  assert.equal(s.shots[0].id, 1);
  assert.equal(s.cooldown, 8);
});

test('cooldown blocks fire for 8 ticks (eighth-tick bypass rejected)', () => {
  let s = freshState();
  s = tryFireShot(s);
  assert.equal(s.cooldown, 8);
  // ticks 1..8 (cooldown 7..1): every tryFireShot must not add a shot
  for (let t = 1; t <= 8; t++) {
    const lenBefore = s.shots.length;
    const after = tryFireShot(s);
    assert.equal(after.shots.length, lenBefore, `tick ${t} bypassed cooldown`);
    // manually decrement to simulate the per-tick clock
    s = { ...after, cooldown: after.cooldown - 1 };
  }
  assert.equal(s.cooldown, 0);
  // tick 9: cooldown is 0 again, fire succeeds
  s = tryFireShot(s);
  assert.equal(s.shots.length, 2);
});

test('cap of 6 active shots: 7th fire blocked', () => {
  let s = freshState();
  for (let i = 0; i < 6; i++) {
    s = tryFireShot(s);
    s = { ...s, cooldown: 0 };
  }
  assert.equal(s.shots.length, 6);
  const before = s.shots.length;
  s = tryFireShot(s);
  assert.equal(s.shots.length, before, 'seventh shot must be blocked');
});

test('advanceShots moves each shot inward by SHOT_SPEED', () => {
  let s = freshState();
  s = tryFireShot(s);
  s = { ...s, shots: [{ id: 1, lane: 0, depth: 0.05 }] };
  s = advanceShots(s);
  assert.equal(s.shots[0].depth, 0.05 + SHOT_SPEED);
});

test('expireShotsAtFar removes shots at or past depth FAR_DEPTH', () => {
  let s = { ...freshState(), shots: [
    { id: 1, lane: 0, depth: 0.9 },
    { id: 2, lane: 0, depth: 1.0 },
    { id: 3, lane: 0, depth: 1.001 }
  ] };
  s = expireShotsAtFar(s);
  assert.equal(s.shots.length, 1);
  assert.equal(s.shots[0].id, 1);
});

test('tryFireShotWithEvent returns shot-fired event after commit', () => {
  const s0 = { ...freshState(), lane: 4, elapsedTicks: 7 };
  const r = tryFireShotWithEvent(s0);
  assert.equal(r.state.shots.length, 1);
  assert.deepEqual(r.event, { type: 'shot-fired', shotId: 1, lane: 4, tick: 7 });
});

test('tryFireShotWithEvent silently blocks on cooldown', () => {
  const s0 = { ...freshState(), lane: 4, cooldown: 3, elapsedTicks: 0 };
  const r = tryFireShotWithEvent(s0);
  assert.equal(r.event, null);
  assert.equal(r.state.shots.length, 0);
});

test('tryFireShotWithEvent silently blocks when cap is reached', () => {
  const s0 = { ...freshState(), cooldown: 0, shots: Array.from({ length: 6 }, (_, i) => ({ id: 100 + i, lane: 0, depth: 0.1 })) };
  const r = tryFireShotWithEvent(s0);
  assert.equal(r.event, null);
  assert.equal(r.state.shots.length, 6);
});

test('advanceShotsWithDepth returns prev/next depths and updates state', () => {
  const s0 = { shots: [{ id: 1, lane: 0, depth: 0.05 }] };
  const r = advanceShotsWithDepth(s0);
  assert.equal(r.shots[0].prev, 0.05);
  assert.ok(Math.abs(r.shots[0].next - 0.075) < 1e-12);
  assert.ok(Math.abs(r.state.shots[0].depth - 0.075) < 1e-12);
});

test('expireShotsAtFarWithEvents returns expired list and surviving shots', () => {
  const s0 = { shots: [
    { id: 1, lane: 0, depth: 0.9, prev: 0.875, next: 0.9 },
    { id: 2, lane: 0, depth: 1.0, prev: 0.975, next: 1.0 },
    { id: 3, lane: 0, depth: 1.001, prev: 0.976, next: 1.001 }
  ]};
  const r = expireShotsAtFarWithEvents(s0);
  assert.equal(r.state.shots.length, 1);
  assert.equal(r.state.shots[0].id, 1);
  assert.deepEqual(r.expired.map(e => e.id), [2, 3]);
});