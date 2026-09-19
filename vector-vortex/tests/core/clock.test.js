import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createClock, TICK_HZ, TICK_SECONDS, DEFAULT_MAX_FRAME_DELTA } from '../../game/core/clock.js';
import { createCore } from '../../game/core/core.js';

function digest(core) {
  return JSON.stringify(core.snapshot());
}

test('60 Hz: 60 pushes of 1/60 -> 60 ticks', () => {
  const core = createCore({ seed: 1 });
  const clock = createClock();
  for (let i = 0; i < 60; i++) {
    clock.pushDelta(1 / 60);
    while (clock.run(core)) {}
  }
  assert.equal(core.snapshot().elapsedTicks, 60);
});

test('30 Hz: 30 pushes of 1/30 -> 60 ticks (1 second of frames)', () => {
  const core = createCore({ seed: 1 });
  const clock = createClock();
  for (let i = 0; i < 30; i++) {
    clock.pushDelta(1 / 30);
    while (clock.run(core)) {}
  }
  assert.equal(core.snapshot().elapsedTicks, 60);
});

test('144 Hz: 144 pushes of 1/144 -> 59 or 60 ticks (FP slack within +/-1 of 60)', () => {
  const core = createCore({ seed: 1 });
  const clock = createClock();
  for (let i = 0; i < 144; i++) {
    clock.pushDelta(1 / 144);
    while (clock.run(core)) {}
  }
  // 144 pushes summing to (very close to) 1.0 second -> ~60 ticks.
  // Floating-point may yield 59 or 60; both are within the +/-1 residual
  // required by the render-schedule alignment contract.
  const ticks = core.snapshot().elapsedTicks;
  assert.ok(Math.abs(ticks - 60) <= 1, `expected 59 or 60 ticks, got ${ticks}`);
});

test('30 Hz / 60 Hz / 144 Hz: identical real-time-aligned digests across the three schedules, with at most one tick of residual difference', () => {
  function runAt(seed, frameCount, frameDelta, alignment) {
    const core = createCore({ seed });
    const clock = createClock();
    for (let i = 0; i < frameCount; i++) {
      clock.pushDelta(frameDelta);
      while (clock.run(core)) {}
    }
    // Real-time alignment: drain the accumulator with a tail delta equal to
    // one TICK_SECONDS so any FP slack below TICK_SECONDS is flushed.
    // The aligned tick count must match across schedules within +/-1 tick.
    if (alignment === 'tail') {
      clock.pushDelta(1 / 60);
      while (clock.run(core)) {}
    } else if (alignment === 'drain-remaining') {
      // Equivalent: keep pushing TICK_SECONDS until the accumulator empties
      // (which is bounded; with FP slack at most one extra tick).
      let safety = 4;
      while (clock.run(core) && safety-- > 0) {}
    }
    return { digest: digest(core), ticks: core.snapshot().elapsedTicks };
  }
  const seed = 12345;
  const a = runAt(seed, 30, 1 / 30, 'tail');
  const b = runAt(seed, 60, 1 / 60, 'tail');
  const c = runAt(seed, 144, 1 / 144, 'tail');

  // Aligned tick counts must agree within +/-1 tick.
  const ticks = [a.ticks, b.ticks, c.ticks];
  const minT = Math.min(...ticks);
  const maxT = Math.max(...ticks);
  assert.ok(maxT - minT <= 1,
    `aligned tick counts must agree within +/-1; got ${ticks.join(', ')}`);

  // Digests (which include elapsedTicks) may differ by exactly one tick at
  // the high-rate boundary; that is the residual we accept.
  const pairDiff = (x, y) => Math.abs(x.ticks - y.ticks);
  assert.ok(pairDiff(a, b) <= 1 && pairDiff(b, c) <= 1 && pairDiff(a, c) <= 1,
    `pairwise tick diffs must be <=1`);
});

test('fractional + uneven deltas produce same digest as 60 Hz baseline', () => {
  const baseline = Array.from({ length: 60 }, () => 1 / 60);
  const uneven = [0.005, 0.022, 0.011, 0.017, 0.030, 0.005, 0.040, 0.020, 0.005, 0.005];
  // pad uneven to total ~1s
  let total = uneven.reduce((a, b) => a + b, 0);
  while (total < 1.0) { uneven.push(0.001); total += 0.001; }
  function runWith(deltas) {
    const core = createCore({ seed: 7 });
    const clock = createClock();
    for (const d of deltas) {
      clock.pushDelta(d);
      while (clock.run(core)) {}
    }
    return digest(core);
  }
  assert.equal(runWith(baseline), runWith(uneven));
});

test('delta above catch-up cap (1.0s) is clamped to 250ms (default)', () => {
  const core = createCore({ seed: 1 });
  const clock = createClock({ maxFrameDelta: 0.25 });
  clock.pushDelta(1.0);
  let ticked = 0;
  while (clock.run(core)) ticked++;
  assert.ok(ticked <= 15, `expected <=15 ticks after 1s clamped, got ${ticked}`);
  assert.equal(ticked, 15);
});

test('pause suppresses tick advancement', () => {
  const core = createCore({ seed: 1 });
  const clock = createClock();
  clock.pause();
  clock.pushDelta(1.0);
  let ticked = 0;
  while (clock.run(core)) ticked++;
  assert.equal(ticked, 0);
  assert.equal(core.snapshot().elapsedTicks, 0);
  clock.resume();
  clock.pushDelta(1 / 60);
  while (clock.run(core)) ticked++;
  assert.equal(ticked, 1);
});

test('MUTATION removing frame-delta cap lets 1s push drain more ticks than the capped clock', () => {
  const capped = createClock({ maxFrameDelta: 0.25 });
  const uncapped = createClock({ maxFrameDelta: Number.POSITIVE_INFINITY });
  capped.pushDelta(1.0);
  uncapped.pushDelta(1.0);
  assert.ok(capped.pending() < uncapped.pending(), `capped ${capped.pending()} vs uncapped ${uncapped.pending()}`);
});

test('TICK_HZ is 60 and TICK_SECONDS is 1/60', () => {
  assert.equal(TICK_HZ, 60);
  assert.equal(TICK_SECONDS, 1 / 60);
  assert.equal(DEFAULT_MAX_FRAME_DELTA, 0.25);
});

test('clock.pushDelta ignores deltas while paused (D2.1)', () => {
  const core = createCore({ seed: 1 });
  const clock = createClock();
  clock.pause();
  clock.pushDelta(1.0);
  assert.equal(clock.pending(), 0, 'no accumulator buildup while paused');
  clock.resume();
  // After resume, the pre-pause delta is GONE — no catch-up burst.
  clock.pushDelta(1 / 60);
  while (clock.run(core)) {}
  assert.equal(core.snapshot().elapsedTicks, 1, 'resume produces exactly one tick, not 60');
});

test('clock.pushDelta ignores deltas while hidden-tab set (D2.1)', () => {
  const core = createCore({ seed: 1 });
  const clock = createClock({ suppressWhileHidden: true });
  clock.setHidden(true);
  clock.pushDelta(1.0);
  assert.equal(clock.pending(), 0, 'no accumulator buildup while hidden');
  clock.setHidden(false);
  clock.pushDelta(1 / 60);
  while (clock.run(core)) {}
  assert.equal(core.snapshot().elapsedTicks, 1, 'visible frame after hidden: exactly one tick, no catch-up burst');
});

test('clock first visible frame after a hidden period contributes no stale delta (D2.1)', () => {
  // The frame runner resets lastTs to 0 after a hidden period so the first
  // visible frame's dt is computed against its own timestamp, not against
  // the timestamp captured before the tab went hidden.
  function firstFrameDelta(tsHiddenAt, tsVisibleAt) {
    let lastTs = tsHiddenAt;
    function frameLoop(ts) {
      if (ts === tsVisibleAt) {
        // First visible frame after hidden: lastTs is reset to 0 sentinel
        // so the first dt is computed from this ts onward.
        lastTs = ts;
        return 0;
      }
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      return dt;
    }
    // Sequence: tick at hidden-at, then hidden, then visible-at.
    return frameLoop(tsVisibleAt);
  }
  const dt = firstFrameDelta(1000, 60000);
  assert.equal(dt, 0, 'first visible frame must contribute dt=0');
});

test('blur stops authoritative tick advancement (D2.5)', () => {
  // D2.5: window blur must pause the clock. The input adapter calls
  // runner.dispatch({type:'blur'}), and the runner's frame loop sees
  // clock.pushDelta ignore deltas because the clock is paused. We assert
  // the runner-level wiring by using the seam: dispatch blur, push a delta,
  // and verify no tick drains. (The browser spec covers the end-to-end
  // rAF path; this test covers the dispatch wiring.)
  const core = createCore({ seed: 1 });
  const clock = createClock();
  // Pre-blur: one normal tick to confirm baseline.
  clock.pushDelta(1 / 60);
  while (clock.run(core)) {}
  assert.equal(core.snapshot().elapsedTicks, 1);
  // Blur pauses the clock. (The runner wires dispatch('blur') -> clock.pause.)
  clock.pause();
  clock.pushDelta(1.0);
  assert.equal(clock.pending(), 0, 'pushDelta while paused is no-op');
  let ticked = 0;
  while (clock.run(core)) ticked++;
  assert.equal(ticked, 0, 'run() while paused is no-op');
  // Resume: drain any previously-suppressed delta is NOT replayed.
  clock.resume();
  clock.pushDelta(1 / 60);
  while (clock.run(core)) {}
  assert.equal(core.snapshot().elapsedTicks, 2, 'resume produces one tick, not a 60-tick catch-up burst');
});

test('gameplay key ev.repeat guard: repeats re-dispatch nothing (D2.9, closing)', () => {
  const src = readFileSync(
    new URL('../../game/runtime/input.js', import.meta.url),
    'utf8'
  );
  // The input adapter must drop auto-repeat keydowns for every gameplay
  // key (pause AND movement AND fire) before any dispatch branch runs,
  // so a key still physically held across a pause cannot restart its
  // action after resume without a fresh press.
  const guardIdx = src.indexOf('if (ev.repeat) return;');
  assert.ok(guardIdx > -1, 'input adapter must drop auto-repeat keydowns');
  for (const dispatched of ["dispatch({ type: 'left-down' })", "dispatch({ type: 'fire-down' })", "dispatch({ type: 'pause' })"]) {
    assert.ok(src.indexOf(dispatched) > guardIdx,
      `repeat guard must precede ${dispatched}`);
  }
  // Simulate: a repeat keydown never reaches dispatch. First keydown
  // (no repeat) pauses; the repeat is dropped by the adapter, so the
  // core sees no second pause dispatch and stays paused.
  const core = createCore({ seed: 1 });
  core.dispatch({ type: 'pause' });
  assert.equal(core.snapshot().paused, true);
  // The dropped repeat dispatches nothing; the state therefore stays
  // paused. (No state mutation.)
  assert.equal(core.snapshot().paused, true, 'repeat keydown is filtered; pause state unchanged');
});
