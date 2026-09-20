// Vector Vortex HUD validation (Spec 03 gate 1 rewrite).
// The core's read-only remainingTicks projection still behaves as the HUD
// contract requires (the timed-run contract itself is replaced in gate 2),
// and the HUD binder consumes core-owned values without restating any
// scoring, accuracy, timing, or outcome rule.
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

const { createCore, initialState, RUN_LENGTH_TICKS, TICK_HZ } = await import(CORE_PATH);

test('core exports the HUD vocabulary constants', () => {
  assert.equal(RUN_LENGTH_TICKS, 18000);
  assert.equal(TICK_HZ, 60);
});

test('snapshot projection: remainingTicks derives from elapsedTicks and clamps at zero', () => {
  const core = createCore({ seed: 1 });
  let snap = core.snapshot();
  assert.equal(snap.remainingTicks, RUN_LENGTH_TICKS);
  core.advance(10);
  snap = core.snapshot();
  assert.equal(snap.remainingTicks, RUN_LENGTH_TICKS - 10);
  assert.equal(snap.remainingTicks, RUN_LENGTH_TICKS - snap.elapsedTicks);
});

test('survived run projection: remainingTicks reaches exactly 0 at elapsed 18,000', () => {
  const provided = initialState(1);
  provided.elapsedTicks = 17999;
  const core = createCore({ initialState: provided });
  core.advance(2);
  const snap = core.snapshot();
  assert.equal(snap.outcome, 'survived');
  assert.equal(snap.elapsedTicks, RUN_LENGTH_TICKS);
  assert.equal(snap.remainingTicks, 0);
});

test('lost run projection: remainingTicks freezes at the loss tick, not zero', () => {
  const provided = initialState(1);
  provided.elapsedTicks = 5000;
  provided.lives = 1;
  provided.enemies = [{ id: 9001, lane: 3, depth: 0.0008, hp: 1 }];
  const core = createCore({ initialState: provided });
  core.advance(2);
  const snap = core.snapshot();
  assert.equal(snap.outcome, 'lost');
  assert.equal(snap.elapsedTicks, 5001);
  assert.equal(snap.remainingTicks, 12999);
});

test('HUD binder is a pure projection in source', () => {
  const src = readFileSync(DOM_PATH, 'utf8');
  // The binder formats the accuracy the core already computed; it never
  // touches the raw ratio inputs.
  assert.doesNotMatch(src, /\bshotsSpawned\b/);
  assert.doesNotMatch(src, /\bhits\b/);
  // The wide horizontal meter bar was removed in Spec 03 gate 1.
  assert.doesNotMatch(src, /\bmeter\b/i);
  assert.doesNotMatch(src, /\bremainingTicks\b/);
});

test('MUTATION: a hits/shotsSpawned ratio in the HUD binder is detected', () => {
  const src = readFileSync(DOM_PATH, 'utf8');
  const mutated = `${src}\nconst bad = Math.round((hits / shotsSpawned) * 100);`;
  assert.match(mutated, /\bshotsSpawned\b/);
  assert.doesNotMatch(src, /\bshotsSpawned\b/);
});
