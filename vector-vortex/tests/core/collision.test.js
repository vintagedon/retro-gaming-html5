import { test } from 'node:test';
import assert from 'node:assert/strict';
import { intervalsOverlap, resolveCollisions } from '../../game/core/collision.js';

test('intervalsOverlap: closed intervals overlap when endpoints touch', () => {
  assert.equal(intervalsOverlap(0.0, 0.1, 0.1, 0.2), true);
  assert.equal(intervalsOverlap(0.0, 0.1, 0.2, 0.3), false);
  assert.equal(intervalsOverlap(0.5, 0.7, 0.6, 0.8), true);
});

test('MUTATION point-sampling at either endpoint misses an interval-cross collision', () => {
  // shot prev=0.0, next=0.05; enemy prev=0.06, next=0.0
  // Point sampling at 0.0 or 0.05 misses because the enemy interval is [0.0, 0.06].
  // The swept interval test correctly reports overlap because [0.0, 0.05] ∩ [0.0, 0.06] = [0.0, 0.05].
  const shot = { id: 1, lane: 5, prev: 0.0, next: 0.05 };
  const enemy = { id: 1, lane: 5, prev: 0.06, next: 0.0, hp: 1 };
  const r = resolveCollisions({
    shots: [shot],
    enemies: [enemy],
    score: 0,
    hits: 0
  });
  assert.equal(r.kills.length, 1, 'swept test must detect cross');
});

test('swept collision: same-lane crossed within one tick hits', () => {
  const shot = { id: 1, lane: 3, prev: 0.0, next: 0.05 };
  const enemy = { id: 1, lane: 3, prev: 0.06, next: 0.0, hp: 1 };
  const r = resolveCollisions({ shots: [shot], enemies: [enemy], score: 0, hits: 0 });
  assert.equal(r.kills.length, 1);
  assert.equal(r.kills[0].enemyId, 1);
  assert.equal(r.kills[0].shotId, 1);
});

test('swept collision: adjacent-lane miss', () => {
  const shot = { id: 1, lane: 3, prev: 0.0, next: 0.05 };
  const enemy = { id: 1, lane: 4, prev: 0.06, next: 0.0, hp: 1 };
  const r = resolveCollisions({ shots: [shot], enemies: [enemy], score: 0, hits: 0 });
  assert.equal(r.kills.length, 0);
});

test('swept collision: non-overlapping same-lane miss', () => {
  const shot = { id: 1, lane: 3, prev: 0.0, next: 0.02 };
  const enemy = { id: 1, lane: 3, prev: 0.5, next: 0.4, hp: 1 };
  const r = resolveCollisions({ shots: [shot], enemies: [enemy], score: 0, hits: 0 });
  assert.equal(r.kills.length, 0);
});

test('simultaneous candidates: ascending stable enemy ID wins', () => {
  // Two enemies and two shots both overlap. Enemy with lower ID survives first; second shot kills second enemy.
  const r = resolveCollisions({
    shots: [
      { id: 10, lane: 3, prev: 0.0, next: 0.5 },
      { id: 11, lane: 3, prev: 0.0, next: 0.5 }
    ],
    enemies: [
      { id: 2, lane: 3, prev: 0.1, next: 0.2, hp: 1 },
      { id: 1, lane: 3, prev: 0.1, next: 0.2, hp: 1 }
    ],
    score: 0,
    hits: 0
  });
  assert.equal(r.kills.length, 2);
  assert.equal(r.kills[0].enemyId, 1);
  assert.equal(r.kills[1].enemyId, 2);
  assert.equal(r.newEnemies.length, 0);
  assert.equal(r.newShots.length, 0);
});

test('MUTATION resolving candidates in insertion order changes the surviving enemy', () => {
  // Construct a fixture where enemy 2 should die FIRST under ascending-id
  // resolution but enemy 1 would die first under insertion order. Enemy 2 is
  // inserted first (precedes enemy 1). Ascending-id picks enemy 1 instead.
  const r = resolveCollisions({
    shots: [
      { id: 10, lane: 3, prev: 0.0, next: 0.5 }
    ],
    enemies: [
      { id: 2, lane: 3, prev: 0.1, next: 0.2, hp: 1 },
      { id: 1, lane: 3, prev: 0.1, next: 0.2, hp: 1 }
    ],
    score: 0,
    hits: 0
  });
  assert.equal(r.kills[0].enemyId, 1, 'ascending stable ID must pick enemy 1 first');
  assert.equal(r.newEnemies[0].id, 2);
});

test('first-hit projectile consumption: a shot with two enemy candidates dies after first', () => {
  const r = resolveCollisions({
    shots: [
      { id: 10, lane: 3, prev: 0.0, next: 0.5 }
    ],
    enemies: [
      { id: 1, lane: 3, prev: 0.1, next: 0.2, hp: 1 },
      { id: 2, lane: 3, prev: 0.1, next: 0.2, hp: 1 }
    ],
    score: 0,
    hits: 0
  });
  assert.equal(r.kills.length, 1);
  assert.equal(r.kills[0].enemyId, 1);
  assert.equal(r.newEnemies.length, 1);
  assert.equal(r.newEnemies[0].id, 2);
  assert.equal(r.newShots.length, 0);
});

test('final sweep at far depth still resolves a same-lane overlapping enemy', () => {
  const r = resolveCollisions({
    shots: [{ id: 10, lane: 7, prev: 0.95, next: 1.025 }],
    enemies: [{ id: 1, lane: 7, prev: 1.0, next: 0.9, hp: 1 }],
    score: 0,
    hits: 0
  });
  assert.equal(r.kills.length, 1);
});

test('score and hits accumulate per kill', () => {
  const r = resolveCollisions({
    shots: [
      { id: 1, lane: 0, prev: 0.0, next: 0.5 },
      { id: 2, lane: 0, prev: 0.0, next: 0.5 }
    ],
    enemies: [
      { id: 1, lane: 0, prev: 0.1, next: 0.2, hp: 1 },
      { id: 2, lane: 0, prev: 0.1, next: 0.2, hp: 1 }
    ],
    score: 50,
    hits: 0
  });
  assert.equal(r.score, 50 + 200);
  assert.equal(r.hits, 2);
});