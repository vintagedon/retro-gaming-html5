import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLanderCore } from '../../game/core/lander.js';
import { driveToSettled, tuneConfig } from './determinism.test.js';

const SEED = 71717;

function gentleDropConfig() {
  return tuneConfig({
    start: { x: 700, y: 2, vx: 0, vy: -4, angle: 0 },
    terrain: { ridgeHeight: 0 }
  });
}

test('remaining in one contact episode charges damage only once', () => {
  const core = createLanderCore({ config: gentleDropConfig(), seed: SEED });
  const settled = driveToSettled(core);
  assert.equal(settled.hullSegments, 2);
  assert.equal(settled.inContact, true);

  for (let i = 0; i < 900; i += 1) core.tick();
  const after = core.snapshot();
  assert.equal(after.hullSegments, 2, 'resting in contact must not recharge damage');
  assert.equal(after.craftRemaining, 3);
  assert.equal(after.craftState, 'flying');
  assert.equal(after.hullPrevSegments, 3, 'no additional impact band while resting');
});

test('a survivor can take off and a distinct later contact charges again', () => {
  const core = createLanderCore({ config: gentleDropConfig(), seed: SEED });
  const first = driveToSettled(core);
  assert.equal(first.hullSegments, 2);

  core.setThrustNotch(core.snapshot().thrustNotchesMax);
  let cleared = false;
  for (let i = 0; i < 300; i += 1) {
    core.tick();
    if (core.snapshot().inContact === false) {
      cleared = true;
      break;
    }
  }
  assert.ok(cleared, 'thrust must lift the survivor off the ground');
  core.setThrustNotch(0);

  const second = driveToSettled(core);
  assert.equal(second.hullSegments, 1, 'a distinct contact episode charges again');
  assert.equal(second.lastImpact, 'gentle');
  assert.equal(second.hullPrevSegments, 2);
  assert.equal(second.craftRemaining, 3, 'survivable impacts never consume a craft');
});
