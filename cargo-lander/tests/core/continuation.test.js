import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLanderCore } from '../../game/core/lander.js';
import { runScript, jsonOf, tuneConfig } from './determinism.test.js';

const SEED = 424242;

test('a JSON snapshot restored after RNG advancement continues identically', () => {
  const a = createLanderCore({ seed: SEED });
  runScript(a, 0, 300);

  const b = createLanderCore({ snapshot: JSON.parse(JSON.stringify(a.snapshot())) });
  assert.equal(jsonOf(a), jsonOf(b), 'restored core must match at the save point');

  runScript(a, 300, 800);
  runScript(b, 300, 800);
  assert.equal(jsonOf(a), jsonOf(b), 'continued runs must stay identical');
});

test('continuation survives a contact and retry boundary', () => {
  const config = tuneConfig({
    start: { x: 700, y: 2, vx: 0, vy: -4, angle: 0 },
    terrain: { ridgeHeight: 0 }
  });
  const a = createLanderCore({ config, seed: SEED });

  const settle = (core) => {
    for (let i = 0; i < 5000; i += 1) {
      core.tick();
      const s = core.snapshot();
      if (s.outcome !== null || s.craftState !== 'flying') return s;
      if (s.inContact && s.vx === 0 && s.vy === 0 && s.thrustNotch === 0) return s;
    }
    throw new Error('craft never settled');
  };
  const hop = (core) => {
    core.setThrustNotch(core.snapshot().thrustNotchesMax);
    for (let i = 0; i < 45; i += 1) core.tick();
    core.setThrustNotch(0);
  };

  const settled = settle(a);
  assert.equal(settled.hullSegments, 2, 'gentle impact costs one segment');
  assert.ok(settled.inContact, 'craft rests in contact');

  const b = createLanderCore({ config, snapshot: JSON.parse(JSON.stringify(settled)) });
  assert.equal(jsonOf(a), jsonOf(b));

  // Resting in contact must continue identically: a restored core that
  // lost its contact state would resolve a phantom second impact.
  for (let i = 0; i < 300; i += 1) {
    a.tick();
    b.tick();
  }
  assert.equal(jsonOf(a), jsonOf(b));
  assert.equal(a.snapshot().hullSegments, 2, 'resting must not recharge damage');

  hop(a);
  hop(b);
  settle(a);
  settle(b);
  assert.equal(jsonOf(a), jsonOf(b), 'a distinct second contact must match');

  hop(a);
  hop(b);
  const wrecked = settle(a);
  settle(b);
  assert.equal(wrecked.craftState, 'destroyed', 'third gentle contact destroys the craft');
  assert.equal(jsonOf(a), jsonOf(b));

  assert.equal(a.retry(), true);
  assert.equal(b.retry(), true);
  assert.equal(jsonOf(a), jsonOf(b), 'retry must restore identical state');

  runScript(a, 0, 600);
  runScript(b, 0, 600);
  assert.equal(jsonOf(a), jsonOf(b), 'runs must stay identical across the retry boundary');
});

test('restored RNG state reproduces subsequent draws through a fresh restart', () => {
  const a = createLanderCore({ seed: SEED });
  runScript(a, 0, 200);

  const b = createLanderCore({ snapshot: JSON.parse(JSON.stringify(a.snapshot())) });

  a.restartRun();
  b.restartRun();
  assert.equal(jsonOf(a), jsonOf(b), 'seedless restart must draw identically');
  const ra = a.snapshot();
  const rb = b.snapshot();
  assert.equal(ra.seed, rb.seed, 'continued RNG stream must produce the same next seed');
  assert.deepEqual(ra.terrain.heights, rb.terrain.heights);

  runScript(a, 0, 250);
  runScript(b, 0, 250);
  assert.equal(jsonOf(a), jsonOf(b));
});

test('an explicit seed restart is reproducible from a fresh core', () => {
  const a = createLanderCore({ seed: SEED });
  a.restartRun({ seed: 777 });
  const b = createLanderCore({ seed: 777 });
  assert.equal(jsonOf(a), jsonOf(b));
  runScript(a, 0, 400);
  runScript(b, 0, 400);
  assert.equal(jsonOf(a), jsonOf(b));
});
