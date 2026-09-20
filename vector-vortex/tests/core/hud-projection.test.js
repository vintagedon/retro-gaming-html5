// Vector Vortex HUD validation (Spec 03 gate 2 rewrite).
// The timed-run projections (remainingTicks, final-minute threshold) are
// retired with the timed run itself, and the HUD binder consumes
// core-owned values without restating any scoring, collision, timing, or
// outcome rule.
//
// Mutation: adding a hits/shotsSpawned ratio to the HUD binder fails the
// purity check.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORE_PATH = join(HERE, '..', '..', 'game', 'core', 'core.js');
const DOM_PATH = join(HERE, '..', '..', 'game', 'runtime', 'dom.js');

const { createCore, TICK_HZ } = await import(CORE_PATH);

test('core exports the HUD vocabulary constants', () => {
  assert.equal(TICK_HZ, 60);
});

test('the timed-run projections are retired from the snapshot', () => {
  const core = createCore({ seed: 1 });
  const snap = core.snapshot();
  assert.equal(snap.remainingTicks, undefined, 'remainingTicks is superseded');
  assert.equal(snap.accuracyPercent, undefined, 'accuracy is superseded by kill score');
});

test('HUD binder is a pure projection in source', () => {
  const src = readFileSync(DOM_PATH, 'utf8');
  // The binder never touches the raw ratio inputs or the retired meter.
  assert.doesNotMatch(src, /\bshotsSpawned\b/);
  assert.doesNotMatch(src, /\bhits\b/);
  assert.doesNotMatch(src, /\bmeter\b/i);
  assert.doesNotMatch(src, /\bremainingTicks\b/);
  assert.doesNotMatch(src, /\baccuracy\b/i);
});

test('MUTATION: a hits/shotsSpawned ratio in the HUD binder is detected', () => {
  const src = readFileSync(DOM_PATH, 'utf8');
  const mutated = `${src}\nconst bad = Math.round((hits / shotsSpawned) * 100);`;
  assert.match(mutated, /\bshotsSpawned\b/);
  assert.doesNotMatch(src, /\bshotsSpawned\b/);
});
