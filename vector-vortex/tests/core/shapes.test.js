// Vector Vortex shape library validation (Spec 03 gate 1).
// The shape definition carries a wraps flag; the property that matters is
// movement: wrapping shapes connect lane 23 to lane 0, non-wrapping shapes
// stop at the ends. Circle and Star wrap; Line, True V and Stepped V do
// not. No validation requires closure or enclosed area.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SHAPES, ACTIVE_SHAPE_ID, activeShape, laneStep } from '../../game/core/shapes.js';

test('the locked library carries the five shapes with their wrap flags', () => {
  assert.deepEqual(
    Object.keys(SHAPES).sort(),
    ['circle', 'line', 'star', 'stepped-v', 'true-v']
  );
  assert.equal(SHAPES.circle.wraps, true);
  assert.equal(SHAPES.star.wraps, true);
  assert.equal(SHAPES.line.wraps, false);
  assert.equal(SHAPES['true-v'].wraps, false);
  assert.equal(SHAPES['stepped-v'].wraps, false);
});

test('the active shape for this slice is Circle, which wraps', () => {
  assert.equal(ACTIVE_SHAPE_ID, 'circle');
  assert.equal(activeShape().id, 'circle');
  assert.equal(activeShape().wraps, true);
});

test('a wrapping shape steps from lane 23 to lane 0 and back', () => {
  assert.equal(laneStep(23, 1, SHAPES.circle), 0);
  assert.equal(laneStep(0, -1, SHAPES.circle), 23);
});

test('a non-wrapping shape stops at the leftmost and rightmost lanes', () => {
  assert.equal(laneStep(0, -1, SHAPES.line), 0);
  assert.equal(laneStep(23, 1, SHAPES['true-v']), 23);
  assert.equal(laneStep(10, -1, SHAPES.line), 9);
  assert.equal(laneStep(10, 1, SHAPES['stepped-v']), 11);
});

test('a zero step is the identity on every shape', () => {
  for (const shape of Object.values(SHAPES)) {
    assert.equal(laneStep(13, 0, shape), 13);
  }
});

test('MUTATION: a wrapping flag on Line fails the end-stop check', () => {
  const mutated = { ...SHAPES.line, wraps: true };
  assert.notEqual(laneStep(23, 1, mutated), 23, 'mutation: wrapped Line must not stop at the right end');
});

test('MUTATION: a dropped wrap flag on Circle fails the seam check', () => {
  const mutated = { ...SHAPES.circle, wraps: false };
  assert.notEqual(laneStep(23, 1, mutated), 0, 'mutation: unwrapped Circle must not cross the seam');
});
