import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VectorVortexCore } from '../../game/src/core/core.js';
import { FixedStepRunner } from '../../game/src/core/runner.js';
import { CONSTANTS } from '../../game/src/core/constants.js';

describe('VectorVortexCore Deliverable 1 - Pure Deterministic Core', () => {
  it('initializes with expected default state', () => {
    const core = new VectorVortexCore({ seed: 12345 });
    const snap = core.getSnapshot();
    assert.equal(snap.playerLane, 0);
    assert.equal(snap.lives, 3);
    assert.equal(snap.score, 0);
    assert.equal(snap.elapsedTicks, 0);
    assert.equal(snap.status, 'active');
    assert.equal(snap.shots.length, 0);
    assert.equal(snap.enemies.length, 0);
  });

  it('moves player lane with wrap around 0..23', () => {
    const core = new VectorVortexCore({ seed: 1 });
    // Move left from 0 -> wraps to 23
    core.step({ left: true, right: false, fire: false });
    assert.equal(core.getSnapshot().playerLane, 23);

    // Move left again -> 22
    core.step({ left: true, right: false, fire: false });
    assert.equal(core.getSnapshot().playerLane, 22);

    // Move right -> 23
    core.step({ left: false, right: true, fire: false });
    assert.equal(core.getSnapshot().playerLane, 23);

    // Move right -> 0
    core.step({ left: false, right: true, fire: false });
    assert.equal(core.getSnapshot().playerLane, 0);
  });

  it('cancels simultaneous left and right movement', () => {
    const core = new VectorVortexCore({ seed: 1 });
    core.step({ left: true, right: true, fire: false });
    assert.equal(core.getSnapshot().playerLane, 0);
  });

  it('enforces fire cooldown (8 ticks) and max active shots (6)', () => {
    const core = new VectorVortexCore({ seed: 1 });
    // Tick 1: Fire shot 1
    core.step({ left: false, right: false, fire: true });
    assert.equal(core.getSnapshot().shots.length, 1);
    assert.equal(core.getSnapshot().shotsSpawned, 1);

    // Ticks 2..8 (7 ticks): Fire held, should not spawn because cooldown is 8 ticks
    for (let i = 0; i < 7; i++) {
      core.step({ left: false, right: false, fire: true });
      assert.equal(core.getSnapshot().shots.length, 1);
      assert.equal(core.getSnapshot().shotsSpawned, 1);
    }

    // Tick 9 (8 ticks after tick 1): Spawns shot 2
    core.step({ left: false, right: false, fire: true });
    assert.equal(core.getSnapshot().shots.length, 2);
    assert.equal(core.getSnapshot().shotsSpawned, 2);
  });

  it('rejects a 7th active shot when max active shots (6) is reached', () => {
    const core = new VectorVortexCore({ seed: 1 });
    // Manually push 6 shots that are still in flight
    for (let i = 0; i < 6; i++) {
      core.shots.push({
        id: i + 1,
        lane: 0,
        depth: 0.1 * (i + 1),
        prevDepth: 0.1 * (i + 1) - 0.025,
      });
    }
    core.shotsSpawned = 6;
    core.fireCooldownTimer = 0;

    core.step({ left: false, right: false, fire: true });
    assert.equal(core.shots.length, 6);
    assert.equal(core.shotsSpawned, 6);
  });

  it('produces identical state digest for fixed seed and fixed action log across independent instances and JSON round-trip', () => {
    const actionLog = [
      { left: true, right: false, fire: true },
      { left: true, right: false, fire: false },
      { left: false, right: true, fire: true },
      { left: false, right: false, fire: false },
      { left: false, right: true, fire: true },
    ];

    const core1 = new VectorVortexCore({ seed: 42 });
    const core2 = new VectorVortexCore({ seed: 42 });

    for (const action of actionLog) {
      core1.step(action);
      core2.step(action);
    }

    const digest1 = core1.getDigest();
    const digest2 = core2.getDigest();
    assert.equal(digest1, digest2);

    // Test JSON state serialization and roundtrip
    const serialized = JSON.stringify(core1.serialize());
    const restoredCore = VectorVortexCore.deserialize(JSON.parse(serialized));
    assert.equal(restoredCore.getDigest(), digest1);

    // Step both once more
    const nextAction = { left: true, right: false, fire: true };
    core1.step(nextAction);
    restoredCore.step(nextAction);
    assert.equal(core1.getDigest(), restoredCore.getDigest());
  });

  it('exercises fixed-step accumulator across 30Hz, 60Hz, and 144Hz schedules with uneven deltas and catch-up cap, producing identical authoritative digest', () => {
    const totalTicks = 300;
    const fixedInputs = [];
    for (let t = 0; t < totalTicks; t++) {
      fixedInputs.push({
        left: t % 5 === 0,
        right: t % 7 === 0,
        fire: t % 8 === 0,
      });
    }

    // 1. Direct baseline: 300 authoritative ticks
    const baselineCore = new VectorVortexCore({ seed: 99 });
    for (const inp of fixedInputs) {
      baselineCore.step(inp);
    }
    const baselineDigest = baselineCore.getDigest();

    // Helper to create an input source function that serves the fixed sequence sequentially per tick step
    const makeInputSource = (inputs) => {
      let idx = 0;
      return () => inputs[idx++] || { left: false, right: false, fire: false };
    };

    // 2. 60 Hz schedule: exactly 1000/60 ms = 16.6666... ms per frame, 300 frames
    const core60 = new VectorVortexCore({ seed: 99 });
    const runner60 = new FixedStepRunner({ core: core60, maxFrameDeltaMs: 250 });
    const src60 = makeInputSource(fixedInputs);
    for (let f = 0; f < totalTicks; f++) {
      runner60.processFrame(1000 / 60, src60);
    }
    assert.equal(core60.elapsedTicks, totalTicks);
    assert.equal(core60.getDigest(), baselineDigest);

    // 3. 30 Hz schedule: exactly 1000/30 ms = 33.3333... ms per frame, 150 frames (2 ticks per frame)
    const core30 = new VectorVortexCore({ seed: 99 });
    const runner30 = new FixedStepRunner({ core: core30, maxFrameDeltaMs: 250 });
    const src30 = makeInputSource(fixedInputs);
    for (let f = 0; f < 150; f++) {
      runner30.processFrame(1000 / 30, src30);
    }
    assert.equal(core30.elapsedTicks, totalTicks);
    assert.equal(core30.getDigest(), baselineDigest);

    // 4. 144 Hz schedule with uneven deltas, fractional ticks, and a frame exceeding the 250ms catch-up cap
    // We drive frames of varying durations totaling the time required for 300 ticks,
    // plus a stall of 500ms (capped at 250ms = 15 ticks) tested in a dedicated sub-fixture.
    const core144 = new VectorVortexCore({ seed: 99 });
    const runner144 = new FixedStepRunner({ core: core144, maxFrameDeltaMs: 250 });
    const src144 = makeInputSource(fixedInputs);

    // 144Hz frame is ~6.944ms. Let's create variable frame deltas: [6.944, 7.1, 6.8, 14.2, 3.5, ...]
    let accumulatedTimeMs = 0;
    const targetTotalTimeMs = totalTicks * (1000 / 60); // 5000ms

    while (core144.elapsedTicks < totalTicks) {
      // Vary frame deltas around 144Hz (6.944ms) and introduce jitter
      const jitter = ((core144.elapsedTicks % 7) - 3) * 0.5; // -1.5ms to +1.5ms
      const deltaMs = Math.max(1.0, (1000 / 144) + jitter);
      runner144.processFrame(deltaMs, src144);
    }

    assert.equal(core144.elapsedTicks, totalTicks);
    assert.equal(core144.getDigest(), baselineDigest);

    // 5. Test maxFrameDeltaMs catch-up cap enforcement:
    // A single frame delta of 500ms must be capped at 250ms (yielding floor(250 / 16.6666...) = 15 ticks, not 30 ticks)
    const coreCapTest = new VectorVortexCore({ seed: 1 });
    const runnerCap = new FixedStepRunner({ core: coreCapTest, maxFrameDeltaMs: 250 });
    const ticksRun = runnerCap.processFrame(500, () => ({ left: false, right: false, fire: false }));
    assert.equal(ticksRun, 15, '500ms frame delta must be capped to 250ms (15 ticks)');
    assert.equal(coreCapTest.elapsedTicks, 15);

    // Mutation note: If maxFrameDeltaMs were removed or ignored, ticksRun would be 30 instead of 15.
  });
});
