import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from '../../game/runtime/clock.js';

function makeFakeCore({ paused = false } = {}) {
  return {
    ticks: 0,
    paused,
    tick() { this.ticks += 1; },
    snapshot() { return { paused: this.paused }; }
  };
}

test('a ten-second frame gap contributes fifteen ticks, not six hundred', () => {
  const clock = createClock();
  const core = makeFakeCore();
  clock.pushDelta(10);
  let ticks = 0;
  while (clock.run(core)) ticks += 1;
  assert.equal(ticks, 15);
  assert.equal(core.ticks, 15);
  assert.ok(clock.pending() < 1 / 60, 'accumulator residue stays under one tick');
});

test('time passed while hidden produces no ticks and no burst on return', () => {
  const clock = createClock();
  const core = makeFakeCore();
  clock.setHidden(true);
  clock.pushDelta(5);
  assert.equal(clock.pending(), 0, 'hidden deltas are refused');

  clock.setHidden(false);
  clock.pushDelta(0.001);
  assert.equal(clock.run(core), false, 'the first visible frame carries no burst');
  clock.pushDelta(0.1);
  let ticks = 0;
  while (clock.run(core)) ticks += 1;
  assert.equal(ticks, 6, 'only the visible frame\'s own delta ticks');
});

test('a paused clock accumulates nothing', () => {
  const clock = createClock();
  const core = makeFakeCore();
  clock.pause();
  clock.pushDelta(1);
  assert.equal(clock.pending(), 0);
  assert.equal(clock.run(core), false);
  clock.resume();
  clock.pushDelta(1 / 60);
  assert.equal(clock.run(core), true);
});

test('the clock refuses to tick a gameplay-paused core and keeps its pending time', () => {
  const clock = createClock();
  const core = makeFakeCore({ paused: true });
  clock.pushDelta(0.25);
  assert.equal(clock.run(core), false);
  assert.equal(core.ticks, 0);
  assert.ok(clock.pending() >= 0.25 - 1e-9, 'pending time is not lost');
  core.paused = false;
  let ticks = 0;
  while (clock.run(core)) ticks += 1;
  assert.equal(ticks, 15);
});

test('non-finite and negative deltas are ignored', () => {
  const clock = createClock();
  clock.pushDelta(Number.NaN);
  clock.pushDelta(-1);
  clock.pushDelta(Number.POSITIVE_INFINITY);
  assert.equal(clock.pending(), 0);
});
