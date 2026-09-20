// Vector Vortex replay test, restored by the 01c continuation (gate 2).
// The deleted version keyed its dispatch set by tick index, so three
// actions sharing tick 5 collapsed to one, and it drained a whole frame
// before dispatching inputs. This version deduplicates by entry identity,
// preserves same-tick order, dispatches every entry BEFORE its named
// simulation tick, holds movement across ticks, and proves both the
// delivery record and the resulting movement/firing. Cross-rate digests
// are compared at the same completed tick; floating-point residuals are
// aligned by padding whole ticks through the same dispatch path, so no
// input is skipped and no state is rewritten.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCore } from '../../game/core/core.js';
import { createClock, TICK_SECONDS } from '../../game/core/clock.js';

const TARGET_TICKS = 120;

function digest(core) {
  // Snapshot minus recentEvents: the delivery order is asserted separately,
  // so the digest reduces to authoritative simulation state only.
  const s = core.snapshot();
  return JSON.stringify({
    seed: s.seed,
    lane: s.lane,
    lives: s.lives,
    score: s.score,
    cooldown: s.cooldown,
    shots: s.shots,
    enemies: s.enemies,
    enemyShots: s.enemyShots,
    breaches: s.breaches,
    damageGraceRemaining: s.damageGraceRemaining,
    elapsedTicks: s.elapsedTicks,
    outcome: s.outcome,
    shotsSpawned: s.shotsSpawned,
    hits: s.hits,
    kills: s.kills,
    waveSpawned: s.waveSpawned,
    moveDir: s.moveDir,
    moveHeldTicks: s.moveHeldTicks,
    moveCooldown: s.moveCooldown
  });
}

function actionLog() {
  // Ordered by (tick, seq). Entry identity is seq: the three entries at
  // tick 5 share a tick and all three must be delivered, in order, once.
  // Right is held from tick 30 to tick 69 so held movement actually occurs.
  return [
    { seq: 0, tick: 0, type: 'fire-down' },
    { seq: 1, tick: 5, type: 'fire-up' },
    { seq: 2, tick: 5, type: 'left-down' },
    { seq: 3, tick: 5, type: 'left-up' },
    { seq: 4, tick: 8, type: 'fire-down' },
    { seq: 5, tick: 16, type: 'fire-up' },
    { seq: 6, tick: 30, type: 'right-down' },
    { seq: 7, tick: 70, type: 'right-up' }
  ];
}

function dispatchDue(core, log, state) {
  // Dispatch every entry named for the tick about to run, in log order.
  // The monotonic cursor is the identity dedupe: each entry is delivered
  // at most once, and same-tick entries keep their relative order.
  const nextTickIndex = core.snapshot().elapsedTicks;
  while (state.next < log.length && log[state.next].tick === nextTickIndex) {
    const entry = log[state.next];
    core.dispatch({ type: entry.type });
    state.delivered.push({ seq: entry.seq, tick: nextTickIndex });
    state.next += 1;
  }
}

function replay(seed, schedule, frames) {
  const core = createCore({ seed });
  const clock = createClock();
  const log = actionLog();
  const state = { next: 0, delivered: [] };
  for (let i = 0; i < frames; i++) {
    clock.pushDelta(schedule(i));
    for (;;) {
      dispatchDue(core, log, state);
      if (!clock.run(core)) break;
    }
  }
  return { core, clock, log, state };
}

// Pad whole ticks through the normal dispatch path until every run has
// completed exactly TARGET_TICKS. No input is skipped and no state is
// rewritten; the residual frames the schedules lost to floating point are
// re-added as ordinary deltas with the same due-dispatch semantics.
function alignToTarget(run) {
  let guard = 200;
  while (run.core.snapshot().elapsedTicks < TARGET_TICKS && guard-- > 0) {
    run.clock.pushDelta(TICK_SECONDS);
    for (;;) {
      dispatchDue(run.core, run.log, run.state);
      if (!run.clock.run(run.core)) break;
    }
  }
  assert.equal(run.core.snapshot().elapsedTicks, TARGET_TICKS,
    'alignment must reach the target completed tick');
  return run;
}

function runSchedule(seed, schedule, frames) {
  return alignToTarget(replay(seed, schedule, frames));
}

test('every action-log entry is delivered once, in order, before its named tick', () => {
  const run = runSchedule(0xC0FFEE, () => 1 / 60, 100);
  const log = actionLog();
  assert.equal(run.state.delivered.length, log.length, 'every entry delivered exactly once');
  for (let i = 0; i < log.length; i++) {
    assert.deepEqual(
      { seq: run.state.delivered[i].seq, tick: run.state.delivered[i].tick },
      { seq: log[i].seq, tick: log[i].tick },
      `delivery ${i} must be entry seq=${log[i].seq} before its tick ${log[i].tick}`
    );
  }
});

test('the delivered log produces the expected movement and firing', () => {
  const run = runSchedule(0xC0FFEE, () => 1 / 60, 100);
  const s = run.core.snapshot();
  // Right held from tick 30 through tick 69: a press step at 30, then
  // tap-and-repeat steps at 42, 47, 52, 57, 62 and 67: seven lane steps.
  assert.equal(s.lane, 7, `expected seven right steps, got lane ${s.lane}`);
  // Fire held at ticks 0-4 and 8-15 with an 8-tick cooldown: exactly two shots.
  assert.equal(s.shotsSpawned, 2, `expected two shots, got ${s.shotsSpawned}`);
});

test('same action log at 30 Hz, 60 Hz, 144 Hz, and an uneven fractional schedule produces one digest at the same completed tick', () => {
  const seed = 0xC0FFEE;
  const at30 = runSchedule(seed, () => 1 / 30, 60);
  const at60 = runSchedule(seed, () => 1 / 60, 120);
  const at144 = runSchedule(seed, () => 1 / 144, 288);
  // Fractional, uneven frame deltas scaled to just under two seconds so
  // the schedule alone cannot overshoot the target; alignment pads the rest.
  const raw = [
    0.005, 0.022, 0.011, 0.017, 0.030, 0.005, 0.040, 0.020, 0.005, 0.005,
    0.012, 0.008, 0.014, 0.020, 0.011, 0.030, 0.020, 0.040, 0.030, 0.010,
    0.025, 0.005, 0.020, 0.030, 0.025, 0.030, 0.020, 0.025, 0.020, 0.030,
    0.025, 0.005, 0.020, 0.030, 0.025, 0.030, 0.020, 0.025, 0.020, 0.030,
    0.025, 0.005, 0.020, 0.030, 0.025, 0.030, 0.020, 0.025, 0.020, 0.030,
    0.025, 0.005, 0.020, 0.030, 0.025, 0.030, 0.020, 0.025, 0.020, 0.030
  ];
  const scale = (TARGET_TICKS * TICK_SECONDS * 0.999) / raw.reduce((a, b) => a + b, 0);
  const uneven = raw.map((v) => v * scale);
  // One full cycle: 60 deltas summing to just under two seconds, so the
  // schedule alone cannot overshoot the target; alignment pads the rest.
  const unevenRun = runSchedule(seed, (i) => uneven[i], raw.length);

  const digests = new Map([
    ['30 Hz', digest(at30.core)],
    ['60 Hz', digest(at60.core)],
    ['144 Hz', digest(at144.core)],
    ['uneven', digest(unevenRun.core)]
  ]);
  const baseline = digests.get('60 Hz');
  for (const [name, d] of digests) {
    assert.equal(d, baseline, `${name} digest must equal the 60 Hz digest at tick ${TARGET_TICKS}`);
  }
  // Every schedule delivered the full log once.
  for (const run of [at30, at60, at144, unevenRun]) {
    assert.equal(run.state.delivered.length, actionLog().length);
  }
});
