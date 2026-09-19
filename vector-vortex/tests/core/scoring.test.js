import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAccuracyPercent, computeAccuracyBonus, SURVIVAL_BONUS } from '../../game/core/scoring.js';

test('SURVIVAL_BONUS is 5000', () => assert.equal(SURVIVAL_BONUS, 5000));

test('zero shots spawned reports ACC --', () => {
  const r = computeAccuracyPercent(0, 0);
  assert.equal(r.display, 'ACC --');
  assert.equal(r.percent, null);
});

test('10 shots spawned and 7 hits reports 70%', () => {
  const r = computeAccuracyPercent(7, 10);
  assert.equal(r.display, '70%');
  assert.equal(r.percent, 70);
});

test('rounds to nearest whole percent', () => {
  const r = computeAccuracyPercent(7, 11);
  assert.equal(r.percent, 64);
  const r2 = computeAccuracyPercent(8, 11);
  assert.equal(r2.percent, 73);
});

test('accuracy bonus: round(2000 * hits / shotsSpawned), zero when no shots', () => {
  assert.equal(computeAccuracyBonus(7, 10), Math.round(2000 * 7 / 10));
  assert.equal(computeAccuracyBonus(0, 0), 0);
  assert.equal(computeAccuracyBonus(3, 5), Math.round(2000 * 3 / 5));
});