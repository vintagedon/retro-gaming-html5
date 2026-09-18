import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLanderCore } from '../../game/core/lander.js';
import { driveToSettled, tuneConfig } from './determinism.test.js';

const SEED = 5150;

function dropConfig({ x = 700, vy = -4 }) {
  return tuneConfig({
    start: { x, y: 2, vx: 0, vy, angle: 0 },
    terrain: { ridgeHeight: 0 }
  });
}

// Hops the resting craft off the ground with a short burn so a later,
// distinct contact can occur. Burn length is capped so the landing
// speed of the hop stays inside the gentle band.
function hop(core, burnTicks) {
  core.setThrustNotch(core.snapshot().thrustNotchesMax);
  for (let i = 0; i < burnTicks; i += 1) core.tick();
  core.setThrustNotch(0);
}

function settle(core) {
  const before = core.snapshot().elapsedTicks;
  for (let i = 0; i < 5000; i += 1) {
    core.tick();
    const s = core.snapshot();
    if (s.outcome !== null || s.craftState !== 'flying') return s;
    if (s.inContact && s.vx === 0 && s.vy === 0 && s.thrustNotch === 0) return s;
  }
  throw new Error(`craft never settled (started at tick ${before})`);
}

test('a gentle impact leaves the craft flying with one fewer hull segment', () => {
  const core = createLanderCore({ config: dropConfig({}), seed: SEED });
  const s = settle(core);
  assert.equal(s.craftState, 'flying');
  assert.equal(s.hullSegments, 2);
  assert.equal(s.hullPrevSegments, 3);
  assert.equal(s.hullPrevRatio, 1);
  assert.equal(s.lastImpact, 'gentle');
});

test('a hard impact destroys the craft outright', () => {
  const core = createLanderCore({ config: dropConfig({ vy: -13 }), seed: SEED });
  const s = settle(core);
  assert.equal(s.craftState, 'destroyed');
  assert.equal(s.hullSegments, 0);
  assert.equal(s.lastImpact, 'hard');
  assert.equal(s.craftRemaining, 2);
  assert.equal(s.outcome, null, 'craft remain, so the run is not over');
});

test('a third gentle impact on a three-segment hull destroys the craft', () => {
  const core = createLanderCore({ config: dropConfig({}), seed: SEED });

  const first = settle(core);
  assert.equal(first.hullSegments, 2);

  hop(core, 45);
  const second = settle(core);
  assert.equal(second.craftState, 'flying');
  assert.equal(second.hullSegments, 1);
  assert.equal(second.lastImpact, 'gentle');

  hop(core, 45);
  const third = settle(core);
  assert.equal(third.craftState, 'destroyed', 'losing the last segment destroys the craft');
  assert.equal(third.hullSegments, 0);
  assert.equal(third.lastImpact, 'gentle');
  assert.equal(third.craftRemaining, 2);
});
