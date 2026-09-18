import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLanderCore } from '../../game/core/lander.js';
import { CONFIG } from '../../game/core/config.js';

const SEED = 20260918;

// A fixed action script: the same deterministic pattern of control
// changes, including a crude hover controller that reads only the
// snapshot, applied tick by tick to any core under test.
export function applyScriptStep(core, tickIndex) {
  const phase = tickIndex % 240;
  if (phase === 0) core.setRotate(1);
  else if (phase === 6) core.setRotate(0);
  else if (phase === 120) core.setRotate(-1);
  else if (phase === 126) core.setRotate(0);

  if (tickIndex % 61 === 0) core.nudgeThrust(tickIndex % 183 === 0 ? -1 : 1);
  if (tickIndex % 17 === 0) {
    const s = core.snapshot();
    if (s.vy < -2) core.setThrustNotch(4);
    else if (s.vy > 0) core.setThrustNotch(1);
  }
}

export function runScript(core, from, to) {
  for (let i = from; i < to; i += 1) {
    applyScriptStep(core, i);
    core.tick();
  }
}

export function jsonOf(core) {
  return JSON.stringify(core.snapshot());
}

// Drives a core until its situation stops changing on its own: a
// terminal outcome, a destroyed craft, or a resting survivor.
export function driveToSettled(core, maxTicks = 5000) {
  for (let i = 0; i < maxTicks; i += 1) {
    core.tick();
    const s = core.snapshot();
    if (s.outcome !== null) return s;
    if (s.craftState !== 'flying') return s;
    if (s.inContact && s.vx === 0 && s.vy === 0 && s.thrustNotch === 0) return s;
  }
  return core.snapshot();
}

// Builds a config with the given start pose and landing overrides.
export function tuneConfig(overrides = {}) {
  const merged = structuredClone(CONFIG);
  Object.assign(merged.start, overrides.start ?? {});
  Object.assign(merged.landing, overrides.landing ?? {});
  Object.assign(merged.fuel, overrides.fuel ?? {});
  Object.assign(merged.impact, overrides.impact ?? {});
  Object.assign(merged.terrain, overrides.terrain ?? {});
  Object.assign(merged.craft, overrides.craft ?? {});
  return merged;
}

test('same seed and action script produce identical snapshots after 5000 ticks', () => {
  // A large tank keeps the scripted flight aloft for the full run;
  // the tuning values under test are determinism, not fuel economy.
  const config = tuneConfig({ fuel: { capacity: 100000, burnRate: 8 } });
  const a = createLanderCore({ config, seed: SEED });
  const b = createLanderCore({ config, seed: SEED });
  const checkpoints = [1, 60, 500, 2500, 5000];
  let reached = 0;
  for (const stop of checkpoints) {
    runScript(a, reached, stop);
    runScript(b, reached, stop);
    reached = stop;
    assert.equal(jsonOf(a), jsonOf(b), `snapshots diverge at tick ${stop}`);
  }
  const final = a.snapshot();
  assert.equal(final.elapsedTicks, 5000);
  assert.equal(final.craftState, 'flying');
});

test('a different seed produces different terrain and snapshots', () => {
  const a = createLanderCore({ seed: SEED });
  const b = createLanderCore({ seed: SEED + 1 });
  runScript(a, 0, 120);
  runScript(b, 0, 120);
  const sa = a.snapshot();
  const sb = b.snapshot();
  assert.equal(sa.terrain.width, sb.terrain.width);
  assert.notDeepEqual(sa.terrain.heights, sb.terrain.heights);
  assert.notEqual(jsonOf(a), jsonOf(b));
});

test('snapshot is JSON-safe and carries every required field', () => {
  const core = createLanderCore({ seed: SEED });
  runScript(core, 0, 30);
  const snap = JSON.parse(JSON.stringify(core.snapshot()));
  const required = [
    'seed', 'rngState', 'elapsedTicks', 'paused', 'outcome', 'craftState',
    'x', 'y', 'vx', 'vy', 'angle',
    'fuel', 'fuelMax', 'fuelRatio',
    'hullSegments', 'hullSegmentsMax', 'hullRatio',
    'hullPrevSegments', 'hullPrevRatio',
    'thrustLevel', 'thrustNotchesMax',
    'craftRemaining', 'craftMax', 'craftRatio',
    'lastImpact', 'altitudeDisplay', 'velocityDisplay', 'fuelDisplay',
    'recentEvents'
  ];
  for (const field of required) {
    assert.ok(field in snap, `snapshot is missing required field ${field}`);
  }
  for (const field of ['fuelRatio', 'hullRatio', 'hullPrevRatio', 'thrustLevel', 'craftRatio']) {
    assert.ok(snap[field] >= 0 && snap[field] <= 1, `${field} must be bounded 0..1`);
  }
  assert.ok(snap.thrustNotchesMax >= 2, 'thrust notch count must be at least two');
});

test('thrust notches are discrete, include off, intermediate, and full', () => {
  const core = createLanderCore({ seed: SEED });
  core.setThrustNotch(core.snapshot().thrustNotchesMax);
  assert.equal(core.snapshot().thrustLevel, 1);
  core.setThrustNotch(0);
  assert.equal(core.snapshot().thrustLevel, 0);
  const seen = new Set();
  for (let k = 0; k <= core.snapshot().thrustNotchesMax; k += 1) {
    core.setThrustNotch(k);
    seen.add(core.snapshot().thrustLevel);
  }
  const levels = [...seen].sort((a, b) => a - b);
  assert.ok(levels.length >= 3, 'notches must include off, intermediate, and full');
  assert.equal(levels[0], 0);
  assert.equal(levels[levels.length - 1], 1);
});
