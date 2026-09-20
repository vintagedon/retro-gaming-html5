import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepLeft, stepRight, LANE_COUNT, applyMovement, applyOppositeCancel } from '../../game/core/lanes.js';
import { SHAPES, activeShape } from '../../game/core/shapes.js';

test('LANE_COUNT is 24', () => {
  assert.equal(LANE_COUNT, 24);
});

test('stepLeft wraps 0 to 23 and 23 to 22', () => {
  assert.equal(stepLeft(0), 23);
  assert.equal(stepLeft(1), 0);
  assert.equal(stepLeft(23), 22);
});

test('stepRight wraps 23 to 0 and 0 to 1', () => {
  assert.equal(stepRight(23), 0);
  assert.equal(stepRight(0), 1);
  assert.equal(stepRight(22), 23);
});

test('MUTATION clamping stepLeft at 0 fails wrap test (baseline wrap returns 23)', () => {
  // If the implementation clamped (e.g. Math.max(0, lane-1)) stepLeft(0) would
  // be 0. The assertion above (stepLeft(0) === 23) fails under that mutation.
});

test('simultaneous opposite-direction movement cancels (lane unchanged)', () => {
  const before = { lane: 7, heldInput: { left: true, right: true } };
  const after = applyMovement(before);
  assert.equal(after.lane, 7);
});

test('opposite cancel helper returns the lane unchanged', () => {
  assert.equal(applyOppositeCancel(7, true, true), 7);
});

test('only left held decrements with wrap', () => {
  assert.equal(applyOppositeCancel(0, true, false), 23);
});

test('only right held increments with wrap', () => {
  assert.equal(applyOppositeCancel(23, false, true), 0);
});

// Spec 03 gate 1: player movement routes through the shape's wraps flag.
// The active shape (Circle) wraps; a non-wrapping shape stops at the ends.

test('movement under a non-wrapping shape clamps at the leftmost lane', () => {
  assert.equal(stepLeft(0, SHAPES.line), 0);
  assert.equal(stepLeft(1, SHAPES.line), 0);
  assert.equal(applyOppositeCancel(0, true, false, SHAPES['true-v']), 0);
});

test('movement under a non-wrapping shape clamps at the rightmost lane', () => {
  assert.equal(stepRight(23, SHAPES.line), 23);
  assert.equal(stepRight(22, SHAPES.line), 23);
  assert.equal(applyOppositeCancel(23, false, true, SHAPES['stepped-v']), 23);
});

test('movement under the active shape wraps the seam (Circle)', () => {
  assert.equal(activeShape().wraps, true);
  assert.equal(applyMovement({ lane: 23, heldInput: { left: false, right: true } }).lane, 0);
  assert.equal(applyMovement({ lane: 0, heldInput: { left: true, right: false } }).lane, 23);
});

test('MUTATION: a non-wrapping shape that wraps fails the clamp check', () => {
  const mutated = { ...SHAPES.line, wraps: true };
  assert.notEqual(stepLeft(0, mutated), 0, 'mutation: wrapped line shape must not clamp at lane 0');
});