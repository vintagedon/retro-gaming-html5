import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClock } from '../../game/runtime/clock.js';
import { createRunner } from '../../game/runtime/runner.js';

const HERE = dirname(fileURLToPath(import.meta.url));

function makeFakeCore({ paused = false } = {}) {
  return {
    ticks: 0,
    paused,
    tick() { this.ticks += 1; },
    snapshot() { return { paused: this.paused }; }
  };
}

function makeFakeFrames() {
  let sequence = 0;
  const scheduled = new Map();
  const requestFrame = (cb) => {
    sequence += 1;
    scheduled.set(sequence, cb);
    return sequence;
  };
  const cancelFrame = (id) => {
    scheduled.delete(id);
  };
  const fire = (now) => {
    const callbacks = [...scheduled.values()];
    scheduled.clear();
    for (const cb of callbacks) cb(now);
  };
  const pendingCount = () => scheduled.size;
  return { requestFrame, cancelFrame, fire, pendingCount };
}

test('an ordinary frame chain ticks proportionally to its delta', () => {
  const core = makeFakeCore();
  const clock = createClock();
  const frames = makeFakeFrames();
  const runner = createRunner({ core, clock, requestFrame: frames.requestFrame, cancelFrame: frames.cancelFrame });

  runner.start();
  frames.fire(0);
  frames.fire(100);
  assert.equal(core.ticks, 6, 'a 100 ms frame contributes six ticks');
  frames.fire(200);
  assert.equal(core.ticks, 12);
});

test('stop cancels scheduling; manual advancement adds exactly the requested ticks', () => {
  const core = makeFakeCore();
  const clock = createClock();
  const frames = makeFakeFrames();
  const runner = createRunner({ core, clock, requestFrame: frames.requestFrame, cancelFrame: frames.cancelFrame });

  runner.start();
  frames.fire(0);
  frames.fire(50);
  assert.ok(core.ticks > 0);

  runner.stop();
  const before = core.ticks;
  frames.fire(1000);
  frames.fire(2000);
  frames.fire(3000);
  assert.equal(core.ticks, before, 'animation-frame opportunities add nothing while stopped');

  assert.equal(runner.advanceTicks(10), 10);
  assert.equal(core.ticks, before + 10);
});

test('advanceTicks is rejected while the runner is running', () => {
  const core = makeFakeCore();
  const clock = createClock();
  const frames = makeFakeFrames();
  const runner = createRunner({ core, clock, requestFrame: frames.requestFrame, cancelFrame: frames.cancelFrame });
  runner.start();
  assert.throws(() => runner.advanceTicks(1), /rejected while the runner is running/);
  runner.stop();
  assert.doesNotThrow(() => runner.advanceTicks(1));
});

test('start resumes without replaying stopped time and cannot double-schedule', () => {
  const core = makeFakeCore();
  const clock = createClock();
  const frames = makeFakeFrames();
  const runner = createRunner({ core, clock, requestFrame: frames.requestFrame, cancelFrame: frames.cancelFrame });

  runner.start();
  frames.fire(0);
  frames.fire(100);
  const before = core.ticks;
  runner.stop();

  runner.start();
  runner.start();
  assert.equal(frames.pendingCount(), 1, 'repeated start leaves exactly one scheduled frame');

  frames.fire(10000);
  assert.equal(core.ticks, before, 'the first frame after start is a rebase, not a replay');
  frames.fire(10100);
  assert.equal(core.ticks, before + 6, 'ordinary advancement resumes from the fresh origin');

  runner.stop();
  runner.stop();
  assert.equal(frames.pendingCount(), 0);
  assert.equal(runner.advanceTicks(5), 5);
  assert.equal(core.ticks, before + 11);
});

test('pause and visibility restoration rebase the runner timestamp', () => {
  const core = makeFakeCore();
  const clock = createClock();
  const frames = makeFakeFrames();
  const runner = createRunner({ core, clock, requestFrame: frames.requestFrame, cancelFrame: frames.cancelFrame });

  runner.start();
  frames.fire(0);
  frames.fire(100);
  const before = core.ticks;

  core.paused = true;
  clock.pause();
  runner.markRebase();
  frames.fire(10000);
  frames.fire(10100);
  frames.fire(10200);
  assert.equal(core.ticks, before, 'a paused core ticks nowhere regardless of frames');
  assert.ok(clock.pending() < 1 / 60, 'paused wall-clock time accumulates no whole tick');

  core.paused = false;
  clock.resume();
  runner.markRebase();
  frames.fire(20000);
  assert.equal(core.ticks, before, 'the restoration frame is a rebase, not a burst');
  frames.fire(20100);
  assert.equal(core.ticks, before + 6, 'ticking resumes from the restoration origin');
});

test('one frame can drain at most the fifteen-tick clamp ceiling', () => {
  const core = makeFakeCore();
  const clock = createClock();
  const frames = makeFakeFrames();
  const runner = createRunner({ core, clock, requestFrame: frames.requestFrame, cancelFrame: frames.cancelFrame });

  runner.start();
  frames.fire(0);
  const before = core.ticks;
  frames.fire(60000);
  assert.equal(core.ticks - before, 15, 'a sixty-second frame contributes fifteen ticks');
});

test('the frame loop reads no test flag', () => {
  const runnerSrc = readFileSync(join(HERE, '..', '..', 'game', 'runtime', 'runner.js'), 'utf8');
  const mainSrc = readFileSync(join(HERE, '..', '..', 'game', 'main.js'), 'utf8');
  const flagPattern = /\bisTest\b|\b__test\b|testMode|test_flag|TESTING|isTesting/;
  assert.equal(flagPattern.test(runnerSrc), false, 'runner.js must not branch on a test flag');
  assert.equal(flagPattern.test(mainSrc), false, 'main.js must not branch on a test flag');
});
