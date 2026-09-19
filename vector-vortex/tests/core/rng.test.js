import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../../game/core/rng.js';

test('RNG next() produces floats in [0, 1) for many draws', () => {
  const rng = createRng(42);
  for (let i = 0; i < 5000; i++) {
    const v = rng.next();
    assert.ok(v >= 0, `negative draw: ${v}`);
    assert.ok(v < 1, `draw >= 1: ${v}`);
  }
});

test('RNG int(min,max) is integer in inclusive bounds', () => {
  const rng = createRng(7);
  for (let i = 0; i < 10000; i++) {
    const v = rng.int(3, 9);
    assert.ok(Number.isInteger(v), `non-integer: ${v}`);
    assert.ok(v >= 3 && v <= 9, `out of [3,9]: ${v}`);
  }
});

test('RNG int(0,23) (lane) hits both bounds within a reasonable sample', () => {
  const rng = createRng(2024);
  const seen = new Set();
  for (let i = 0; i < 10000; i++) seen.add(rng.lane());
  assert.ok(seen.has(0), 'lower bound 0 missing');
  assert.ok(seen.has(23), 'upper bound 23 missing');
  for (const v of seen) {
    assert.ok(Number.isInteger(v), `non-integer lane: ${v}`);
    assert.ok(v >= 0 && v <= 23, `lane out of [0,23]: ${v}`);
  }
});

test('RNG integer sequence is pinned for seed 0xC0FFEE', () => {
  const rng = createRng(0xC0FFEE);
  const seq = Array.from({ length: 12 }, () => rng.int(0, 9));
  assert.deepEqual(seq, [0, 6, 7, 7, 1, 5, 1, 3, 7, 2, 3, 0]);
});

test('MUTATION int(0,5) can reach the upper bound 5 (off-by-one in max-min vs max-min+1 reverts)', () => {
  // The mutation: replacing (max - min + 1) with (max - min) makes
  // the upper bound unreachable because the formula max=5,min=0
  // produces values in [0, 4] instead of [0, 5]. The discriminating
  // assertion is observing both 0 and 5 within a reasonable sample.
  const rng = createRng(0xC0FFEE);
  const seen = new Set();
  for (let i = 0; i < 10000; i++) seen.add(rng.int(0, 5));
  assert.ok(seen.has(5), 'upper bound 5 must be reachable under inclusive bounds');
});