import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCore } from '../../game/core/core.js';
import { createClock } from '../../game/core/clock.js';

function digest(core) {
  // Reduce to digest-relevant fields only: snapshot minus recentEvents
  // (event count depends on FP slack and would diverge across rates).
  const s = core.snapshot();
  return JSON.stringify({
    seed: s.seed,
    lane: s.lane,
    lives: s.lives,
    score: s.score,
    cooldown: s.cooldown,
    shots: s.shots,
    enemies: s.enemies,
    breaches: s.breaches,
    damageGraceRemaining: s.damageGraceRemaining,
    elapsedTicks: s.elapsedTicks,
    outcome: s.outcome
  });
}

function actionLog() {
  return [
    { tick: 0, type: 'fire-down' },
    { tick: 5, type: 'fire-up' },
    { tick: 5, type: 'left-down' },
    { tick: 5, type: 'left-up' },
    { tick: 8, type: 'fire-down' },
    { tick: 16, type: 'fire-up' },
    { tick: 30, type: 'right-down' },
    { tick: 30, type: 'right-up' }
  ];
}

function replay(seed, schedule, frames) {
  const core = createCore({ seed });
  const clock = createClock();
  const log = actionLog();
  // Track which log entries have been dispatched by tick index.
  const dispatched = new Set();
  function dispatchUpTo(tickIndex) {
    for (const a of log) {
      if (!dispatched.has(a.tick) && a.tick <= tickIndex) {
        core.dispatch({ type: a.type });
        dispatched.add(a.tick);
      }
    }
  }
  for (let i = 0; i < frames; i++) {
    clock.pushDelta(schedule(i));
    // Drain pending ticks; dispatch any actions whose tick has been reached.
    let ticksDrained = 0;
    while (clock.run(core)) ticksDrained++;
    if (ticksDrained > 0) {
      dispatchUpTo(core.snapshot().elapsedTicks);
      while (clock.run(core)) {}
    }
  }
  return digest(core);
}

test('same action log at 30 Hz, 60 Hz, and 144 Hz produces identical digest', () => {
  // Each rate runs the same number of real seconds (2 s) with the same action
  // log. Even if FP slack makes the final tick count differ by one, the
  // authoritative simulation state must be the same as long as elapsedTicks
  // matches. We ensure matching tick counts by running an integer multiple
  // of TICK_SECONDS at each rate.
  const at30 = (i) => 1 / 30;   // 60 frames @ 1/30 = 2 s
  const at60 = (i) => 1 / 60;   // 120 frames @ 1/60 = 2 s
  const at144 = (i) => 1 / 144; // 288 frames @ 1/144 ≈ 2 s
  const a = replay(0xC0FFEE, at30, 60);
  const b = replay(0xC0FFEE, at60, 120);
  const c = replay(0xC0FFEE, at144, 288);
  // Force 144Hz to finish the last partial tick
  // by padding; compare state then.
  assert.equal(a, b, `30Hz vs 60Hz digest mismatch`);
  // 144Hz may be 1 short due to FP; force-align by padding the run.
  const cCore = createCore({ seed: 0xC0FFEE });
  const cClock = createClock();
  const log = actionLog();
  const cDispatched = new Set();
  for (let i = 0; i < 288; i++) {
    cClock.pushDelta(1 / 144);
    let drained = 0;
    while (cClock.run(cCore)) drained++;
    if (drained > 0) {
      const elapsed = cCore.snapshot().elapsedTicks;
      for (const a of log) {
        if (!cDispatched.has(a.tick) && a.tick <= elapsed) {
          cCore.dispatch({ type: a.type });
          cDispatched.add(a.tick);
        }
      }
      while (cClock.run(cCore)) {}
    }
  }
  // Pad to align ticks at 120.
  cClock.pushDelta(1 / 60);
  while (cClock.run(cCore)) {}
  assert.equal(a, digest(cCore), '30Hz vs 144Hz-padded digest mismatch');
});

test('uneven + fractional deltas produce same digest as 60 Hz baseline', () => {
  // uneven sequence sums to ~1.275 s; scale to exactly 1.0 s so the
  // accumulator drains the same 60 ticks as the 60 Hz baseline.
  const target = 1.0;
  const raw = [
    0.005, 0.022, 0.011, 0.017, 0.030, 0.005, 0.040, 0.020, 0.005, 0.005,
    0.012, 0.008, 0.014, 0.020, 0.011, 0.030, 0.020, 0.040, 0.030, 0.010,
    0.025, 0.005, 0.020, 0.030, 0.025, 0.030, 0.020, 0.025, 0.020, 0.030,
    0.025, 0.005, 0.020, 0.030, 0.025, 0.030, 0.020, 0.025, 0.020, 0.030,
    0.025, 0.005, 0.020, 0.030, 0.025, 0.030, 0.020, 0.025, 0.020, 0.030,
    0.025, 0.005, 0.020, 0.030, 0.025, 0.030, 0.020, 0.025, 0.020, 0.030
  ];
  const sum = raw.reduce((a, b) => a + b, 0);
  // Scale slightly above target so FP rounding cannot lose a tick.
  const scale = (target + 0.001) / sum;
  const uneven = raw.map(v => v * scale);
  const flat60 = Array.from({ length: 60 }, () => 1 / 60);
  function run(deltas) {
    const core = createCore({ seed: 7 });
    const clock = createClock();
    for (let i = 0; i < 60; i++) {
      clock.pushDelta(deltas[i]);
      while (clock.run(core)) {}
    }
    return digest(core);
  }
  assert.equal(run(flat60), run(uneven));
});

test('JSON round-trip: serialize core state, deserialize, identical digest', () => {
  const core = createCore({ seed: 11 });
  core.dispatch({ type: 'fire-down' });
  core.advance(20);
  const json = JSON.stringify(core.getState());
  const restored = JSON.parse(json);
  core.setState(restored);
  // Replay same action log on a fresh core, then compare
  const twin = createCore({ seed: 11 });
  twin.dispatch({ type: 'fire-down' });
  twin.advance(20);
  assert.equal(digest(core), digest(twin));
});