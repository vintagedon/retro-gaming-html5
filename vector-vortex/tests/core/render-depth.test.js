// Vector Vortex perspective projection validation (Spec 03 gate 1).
// The renderer projects the rim twice: a near rim at the viewer and a far
// rim, smaller and offset toward a vanishing point above centre, with an
// entity at normalized depth d interpolating between its near-rim and
// far-rim lane position. Depth 1 is the far rim; depth 0 is the player rim.
//
// MUTATION: the inverted mapping (t = clamp(depth)) places a depth-1 entity
// at the player rim and fails these checks.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  projectionLayout,
  rimVertex,
  projectLanePoint,
  scaleAtDepth,
  entityRadiusAt,
  shotLengthAt,
  strokeWidthAt,
  MIN_ENTITY_RADIUS_PX,
  MIN_SHOT_LENGTH_PX,
  MIN_STROKE_PX
} from '../../game/runtime/renderer.js';

// The smallest supported viewport is the worst case for the floors.
const W = 1024;
const H = 576;

function layout() {
  return projectionLayout(W, H);
}

test('the far rim is smaller than the near rim and offset above centre', () => {
  const L = layout();
  assert.ok(L.farRadius < L.nearRadius, 'far rim must be smaller');
  assert.ok(L.vanishing.y < L.height / 2, 'vanishing point sits above centre');
  assert.notEqual(L.vanishing.y, L.nearCenter.y, 'far rim is offset toward the vanishing point');
});

test('depth 1 renders exactly at the far-rim lane vertex', () => {
  const L = layout();
  for (const lane of [0, 5, 12, 23]) {
    const p = projectLanePoint(L, lane, 1);
    const far = rimVertex(L, lane, 'far');
    assert.equal(p.x, far.x, `lane ${lane} depth 1 x is the far vertex`);
    assert.equal(p.y, far.y, `lane ${lane} depth 1 y is the far vertex`);
  }
});

test('depth 0 renders at the player rim and depth 0.1 near it', () => {
  const L = layout();
  const lane = 7;
  const near = rimVertex(L, lane, 'near');
  const far = rimVertex(L, lane, 'far');
  const p0 = projectLanePoint(L, lane, 0);
  assert.equal(p0.x, near.x);
  assert.equal(p0.y, near.y);
  const p01 = projectLanePoint(L, lane, 0.1);
  const span = Math.hypot(far.x - near.x, far.y - near.y);
  const dist = Math.hypot(p01.x - near.x, p01.y - near.y);
  assert.ok(dist > 0, 'depth 0.1 has left the rim');
  assert.ok(dist < span * 0.15, `depth 0.1 must be near the rim; got ${dist} of span ${span}`);
});

test('MUTATION: the inverted mapping puts depth 1 at the player rim', () => {
  const L = layout();
  function buggy(lane, depth) {
    const t = Math.max(0, Math.min(1, depth));
    const near = rimVertex(L, lane, 'near');
    const far = rimVertex(L, lane, 'far');
    // Inverted: depth 1 maps to the near vertex, depth 0 to the far vertex.
    return { x: far.x + (near.x - far.x) * t, y: far.y + (near.y - far.y) * t };
  }
  const far = rimVertex(L, 3, 'far');
  const near = rimVertex(L, 3, 'near');
  const p = buggy(3, 1);
  assert.notEqual(p.y, far.y, 'mutation: inverted mapping must not place depth 1 at the far rim');
  assert.equal(p.y, near.y, 'mutation: inverted mapping places depth 1 at the player rim');
});

test('at the smallest supported viewport an entity at depth 1 holds the size floor', () => {
  const r = entityRadiusAt(1);
  assert.ok(r >= MIN_ENTITY_RADIUS_PX, `enemy radius floor: ${r} < ${MIN_ENTITY_RADIUS_PX}`);
  const len = shotLengthAt(1);
  assert.ok(len >= MIN_SHOT_LENGTH_PX, `shot length floor: ${len} < ${MIN_SHOT_LENGTH_PX}`);
});

test('every stroke width stays at or above the minimum width at any depth', () => {
  for (const depth of [0, 0.25, 0.5, 0.75, 1]) {
    assert.ok(strokeWidthAt(2, depth) >= MIN_STROKE_PX, `stroke floor at depth ${depth}`);
    assert.ok(strokeWidthAt(3, depth) >= MIN_STROKE_PX, `stroke floor at depth ${depth}`);
  }
});

test('depth scale shrinks toward the far end without changing the depth values', () => {
  assert.equal(scaleAtDepth(0), 1);
  assert.ok(scaleAtDepth(1) < 1, 'far entities scale down');
  assert.ok(scaleAtDepth(1.5) === scaleAtDepth(1), 'scale clamps past depth 1');
});

test('the far rim sits strictly inside the near rim at every supported viewport', () => {
  for (const [w, h] of [[1024, 576], [1280, 720], [1440, 900], [1920, 1080]]) {
    const L = projectionLayout(w, h);
    const dist = Math.hypot(L.vanishing.x - L.nearCenter.x, L.vanishing.y - L.nearCenter.y);
    assert.ok(
      dist + L.farRadius <= L.nearRadius,
      `${w}x${h}: far rim must sit inside the near rim (dist ${dist} + far ${L.farRadius} vs near ${L.nearRadius})`
    );
    assert.ok(L.vanishing.y < h / 2, `${w}x${h}: vanishing point above screen centre`);
  }
});

test('the layout keeps the whole near rim inside the viewport', () => {
  const L = layout();
  assert.ok(L.nearCenter.x - L.nearRadius >= 0, 'near rim left edge inside');
  assert.ok(L.nearCenter.x + L.nearRadius <= L.width, 'near rim right edge inside');
  assert.ok(L.nearCenter.y + L.nearRadius <= L.height, 'near rim bottom edge inside');
  assert.ok(L.vanishing.y - L.farRadius >= 0, 'far rim top edge inside');
});
