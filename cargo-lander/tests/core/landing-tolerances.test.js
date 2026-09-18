import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLanderCore } from '../../game/core/lander.js';
import { driveToSettled, tuneConfig } from './determinism.test.js';

const SEED = 9001;

// Each run descends toward the pad under gravity from a small height,
// differing in exactly one tolerance dimension.
function toleranceRun({ x = 960, vx = 0, vy = -4, angle = 0 }) {
  const config = tuneConfig({
    start: { x, y: 2, vx, vy, angle },
    terrain: { ridgeHeight: 0 }
  });
  const core = createLanderCore({ config, seed: SEED });
  return driveToSettled(core);
}

test('a descent inside all four tolerances lands', () => {
  const s = toleranceRun({ x: 960, vx: 0.5, vy: -4, angle: 0.05 });
  assert.equal(s.craftState, 'landed');
  assert.equal(s.outcome, 'landed');
});

test('violating only the vertical speed tolerance fails to land', () => {
  const s = toleranceRun({ x: 960, vx: 0, vy: -6, angle: 0 });
  assert.notEqual(s.craftState, 'landed');
  assert.notEqual(s.outcome, 'landed');
});

test('violating only the horizontal speed tolerance fails to land', () => {
  const s = toleranceRun({ x: 960, vx: 3.5, vy: -4, angle: 0 });
  assert.notEqual(s.craftState, 'landed');
});

test('violating only the tilt tolerance fails to land', () => {
  const s = toleranceRun({ x: 960, vx: 0, vy: -4, angle: 0.2 });
  assert.notEqual(s.craftState, 'landed');
});

test('violating only the site position tolerance fails to land', () => {
  const s = toleranceRun({ x: 700, vx: 0, vy: -4, angle: 0 });
  assert.notEqual(s.craftState, 'landed');
});

test('every failing band takes a gentle impact rather than destroying the craft', () => {
  for (const s of [
    toleranceRun({ x: 960, vx: 0, vy: -6, angle: 0 }),
    toleranceRun({ x: 960, vx: 3.5, vy: -4, angle: 0 }),
    toleranceRun({ x: 960, vx: 0, vy: -4, angle: 0.2 }),
    toleranceRun({ x: 700, vx: 0, vy: -4, angle: 0 })
  ]) {
    assert.equal(s.craftState, 'flying', 'gentle contact leaves the craft playable');
    assert.equal(s.hullSegments, 2, 'exactly one hull segment is lost');
    assert.equal(s.lastImpact, 'gentle');
    assert.equal(s.craftRemaining, 3, 'no craft is consumed by a survivable impact');
    assert.equal(s.outcome, null);
  }
});
