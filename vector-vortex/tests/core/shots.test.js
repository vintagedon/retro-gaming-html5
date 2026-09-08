import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tryFireShot,
  advanceShots,
  expireShotsAtFar,
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