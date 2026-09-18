import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLanderCore } from '../../game/core/lander.js';
import { driveToSettled, tuneConfig } from './determinism.test.js';

const SEED = 61161;

function hardDropConfig() {
  return tuneConfig({
    start: { x: 960, y: 2, vx: 0, vy: -13, angle: 0 },
    terrain: { ridgeHeight: 0 }
  });
}

function destroyCurrentCraft(core) {
  return driveToSettled(core);
}

test('destruction sets hull to zero and decrements craftRemaining exactly once', () => {
  const core = createLanderCore({ config: hardDropConfig(), seed: SEED });
  const s = destroyCurrentCraft(core);
  assert.equal(s.craftState, 'destroyed');
  assert.equal(s.hullSegments, 0);
  assert.equal(s.hullPrevSegments, 3);
  assert.equal(s.craftRemaining, 2);

  const ticksBefore = s.elapsedTicks;
  const rngBefore = s.rngState;
  for (let i = 0; i < 600; i += 1) core.tick();
  const after = core.snapshot();
  assert.equal(after.craftRemaining, 2, 'a destroyed craft cannot be charged twice');
  assert.equal(after.craftState, 'destroyed');
  assert.equal(after.hullSegments, 0);
  assert.equal(after.rngState, rngBefore, 'no hidden draws while waiting');
  assert.equal(after.elapsedTicks, ticksBefore, 'ticks stop while destroyed');
});

test('retry restores pose, hull, and fuel while preserving run identity', () => {
  const core = createLanderCore({ config: hardDropConfig(), seed: SEED });
  destroyCurrentCraft(core);

  core.setRotate(1);
  core.setThrustNotch(3);
  const pre = core.snapshot();
  assert.equal(pre.craftRemaining, 2);

  assert.equal(core.retry(), true);
  const s = core.snapshot();
  const config = hardDropConfig();
  assert.equal(s.craftState, 'flying');
  assert.equal(s.outcome, null);
  assert.equal(s.x, config.start.x);
  assert.equal(s.y, config.start.y);
  assert.equal(s.vx, config.start.vx);
  assert.equal(s.vy, config.start.vy);
  assert.equal(s.angle, config.start.angle);
  assert.equal(s.hullSegments, 3);
  assert.equal(s.hullPrevSegments, 3, 'retry clears the damage trail');
  assert.equal(s.hullPrevRatio, 1);
  assert.equal(s.fuel, config.fuel.capacity);
  assert.equal(s.fuelRatio, 1);
  assert.equal(s.thrustNotch, 0, 'retry clears control input');
  assert.equal(s.thrustLevel, 0);
  assert.equal(s.lastImpact, null);
  assert.equal(s.inContact, false);
  assert.equal(s.craftRemaining, 2, 'retry consumes no craft');
  assert.equal(s.seed, pre.seed, 'retry preserves the run seed');
  assert.equal(s.rngState, pre.rngState, 'retry preserves the RNG state');
  assert.equal(s.elapsedTicks, pre.elapsedTicks, 'retry preserves elapsed ticks');
  assert.ok(s.recentEvents.some((e) => e.kind === 'retry'));
});

test('retry is rejected unless a craft was destroyed and craft remain', () => {
  const core = createLanderCore({ config: hardDropConfig(), seed: SEED });
  assert.equal(core.retry(), false, 'a flying craft cannot retry');
  destroyCurrentCraft(core);
  assert.equal(core.retry(), true);
});

test('exhausting the craft count sets run-over and rejects retry', () => {
  const core = createLanderCore({ config: hardDropConfig(), seed: SEED });

  destroyCurrentCraft(core);
  assert.equal(core.retry(), true);
  destroyCurrentCraft(core);
  assert.equal(core.retry(), true);
  destroyCurrentCraft(core);

  const s = core.snapshot();
  assert.equal(s.craftState, 'destroyed');
  assert.equal(s.craftRemaining, 0);
  assert.equal(s.craftRatio, 0);
  assert.equal(s.outcome, 'run-over');
  assert.ok(s.recentEvents.some((e) => e.kind === 'run-over'));
  assert.equal(core.retry(), false, 'run-over rejects retry');

  const frozenTicks = s.elapsedTicks;
  for (let i = 0; i < 120; i += 1) core.tick();
  const still = core.snapshot();
  assert.equal(still.outcome, 'run-over');
  assert.equal(still.elapsedTicks, frozenTicks, 'a terminal run stops ticking');
});

test('restart after a terminal outcome starts a fresh run', () => {
  const core = createLanderCore({ config: hardDropConfig(), seed: SEED });
  destroyCurrentCraft(core);
  core.retry();
  destroyCurrentCraft(core);
  core.retry();
  destroyCurrentCraft(core);
  assert.equal(core.snapshot().outcome, 'run-over');

  core.restartRun({ seed: 424242 });
  const s = core.snapshot();
  assert.equal(s.outcome, null);
  assert.equal(s.craftState, 'flying');
  assert.equal(s.craftRemaining, 3);
  assert.equal(s.craftRatio, 1);
  assert.equal(s.hullSegments, 3);
  assert.equal(s.fuelRatio, 1);
  assert.equal(s.elapsedTicks, 0);
  assert.equal(s.seed, 424242);
});

test('a successful landing ends the run and freezes the craft', () => {
  const config = tuneConfig({
    start: { x: 960, y: 2, vx: 0, vy: -4, angle: 0 },
    terrain: { ridgeHeight: 0 }
  });
  const core = createLanderCore({ config, seed: SEED });
  const s = driveToSettled(core);
  assert.equal(s.craftState, 'landed');
  assert.equal(s.outcome, 'landed');
  assert.equal(s.craftRemaining, 3);
  const ticks = s.elapsedTicks;
  for (let i = 0; i < 240; i += 1) core.tick();
  const after = core.snapshot();
  assert.equal(after.elapsedTicks, ticks, 'a landed run stops ticking');
  assert.equal(after.outcome, 'landed');
});
