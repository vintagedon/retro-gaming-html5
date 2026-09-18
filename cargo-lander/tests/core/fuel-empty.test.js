import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLanderCore } from '../../game/core/lander.js';
import { tuneConfig } from './determinism.test.js';

const SEED = 8308;

// A config that burns the whole tank quickly: tiny capacity, high burn.
function burnoutConfig() {
  return tuneConfig({
    fuel: { capacity: 5, burnRate: 8 },
    terrain: { ridgeHeight: 0 }
  });
}

test('fuel burns to empty without going negative', () => {
  const core = createLanderCore({ config: burnoutConfig(), seed: SEED });
  core.setThrustNotch(core.snapshot().thrustNotchesMax);
  for (let i = 0; i < 3000; i += 1) core.tick();
  const s = core.snapshot();
  assert.equal(s.fuel, 0);
  assert.equal(s.fuelRatio, 0);
  assert.ok(Number.isFinite(s.fuel), 'fuel must stay a finite number');
});

test('requesting full thrust at empty fuel produces zero thrust level', () => {
  const core = createLanderCore({ config: burnoutConfig(), seed: SEED });
  core.setThrustNotch(core.snapshot().thrustNotchesMax);
  for (let i = 0; i < 3000; i += 1) core.tick();

  core.setThrustNotch(core.snapshot().thrustNotchesMax);
  const s = core.snapshot();
  assert.equal(s.fuel, 0);
  assert.equal(s.thrustLevel, 0, 'empty fuel strips thrust authority');
});

test('full thrust at empty fuel equals coasting from the identical state', () => {
  const config = burnoutConfig();

  const burner = createLanderCore({ config, seed: SEED });
  const coaster = createLanderCore({ config, seed: SEED });

  const script = (core) => {
    core.setThrustNotch(core.snapshot().thrustNotchesMax);
    for (let i = 0; i < 3000; i += 1) core.tick();
  };
  script(burner);
  script(coaster);
  assert.equal(burner.snapshot().fuel, 0);
  assert.equal(coaster.snapshot().fuel, 0);

  burner.setThrustNotch(burner.snapshot().thrustNotchesMax);
  coaster.setThrustNotch(0);

  burner.tick();
  coaster.tick();

  const b = burner.snapshot();
  const c = coaster.snapshot();
  assert.equal(b.thrustLevel, 0);
  assert.equal(c.thrustLevel, 0);
  assert.equal(b.vx, c.vx, 'thrust at empty must not change horizontal velocity');
  assert.equal(b.vy, c.vy, 'thrust at empty must not change vertical velocity');
  assert.equal(b.x, c.x);
  assert.equal(b.y, c.y);
});
