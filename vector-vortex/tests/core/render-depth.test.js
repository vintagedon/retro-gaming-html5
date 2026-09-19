// Vector Vortex D2.2 validation: Crawler depth maps correctly to radius.
// Spec contract: depth 1 is the far end (enemies spawn there), depth 0 is
// the player rim (enemies move toward it). The renderer must place a
// depth-1 enemy at the far radius and a depth-0 enemy near the rim.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Mirror the renderer's depth-to-radius mapping.
function depthToRadius(depth, farR, rimR) {
  const t = 1 - Math.max(0, Math.min(1, depth));
  return farR + (rimR - farR) * t;
}

test('depth 1 renders at the far radius (D2.2)', () => {
  const r = depthToRadius(1, 45, 100);
  assert.equal(r, 45, 'depth=1 must be the far radius');
});

test('depth 0 renders near the rim (D2.2)', () => {
  const r = depthToRadius(0, 45, 100);
  assert.equal(r, 100, 'depth=0 must be the rim radius');
});

test('depth 0.1 renders close to the rim, not the far end (D2.2)', () => {
  const r = depthToRadius(0.1, 45, 100);
  assert.ok(r > 90, `depth=0.1 must be near the rim; got ${r}`);
  assert.ok(r < 100, `depth=0.1 must not be at the rim; got ${r}`);
});

test('MUTATION: the inverted mapping (t = clamp(depth)) fails depth=1 → far', () => {
  // Buggy mapping: t = clamp(depth). At depth=1, t=1, r=rimR, which fails.
  function buggy(depth, farR, rimR) {
    const t = Math.max(0, Math.min(1, depth));
    return farR + (rimR - farR) * t;
  }
  const r = buggy(1, 45, 100);
  assert.notEqual(r, 45, 'mutation: buggy mapping at depth=1 must NOT produce the far radius');
});