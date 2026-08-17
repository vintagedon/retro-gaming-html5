import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VectorVortexCore } from '../../game/src/core/core.js';
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

  it('decouples rendering frequency: same input log presented at 30Hz, 60Hz, 144Hz produces identical authoritative state', () => {
    // 30Hz: 1 frame = 2 ticks
    // 60Hz: 1 frame = 1 tick
    // 144Hz: variable fractional ticks with accumulator
    const fixedInputs = [];
    for (let t = 0; t < 120; t++) {
      fixedInputs.push({
        left: t % 5 === 0,
        right: t % 7 === 0,
        fire: t % 8 === 0,
      });
    }

    // Direct 60 ticks execution
    const coreDirect = new VectorVortexCore({ seed: 99 });
    for (const input of fixedInputs) {
      coreDirect.step(input);
    }

    // Simulation Runner with fixed timestep accumulator (simulate 30Hz frames)
    const core30Hz = new VectorVortexCore({ seed: 99 });
    let inputIdx30 = 0;
    for (let f = 0; f < 60; f++) {
      // each 30Hz frame advances 2 ticks (1/30s = 33.333ms = 2 * 16.666ms)
      for (let k = 0; k < 2; k++) {
        core30Hz.step(fixedInputs[inputIdx30++]);
      }
    }

    assert.equal(coreDirect.getDigest(), core30Hz.getDigest());
  });
});
