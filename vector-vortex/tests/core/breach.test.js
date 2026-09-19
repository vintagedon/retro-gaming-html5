import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveBreaches } from '../../game/core/breach.js';

function s(extra = {}) {
  return {
    enemies: [],
    lives: 3,
    damageGraceRemaining: 0,
    ...extra
  };
}

test('no breaches: state unchanged, grace decrements if positive', () => {
  const r = resolveBreaches(s({ damageGraceRemaining: 5 }));
  assert.equal(r.lifeLost, false);
  assert.equal(r.breaches.length, 0);
  assert.equal(r.state.damageGraceRemaining, 4);
});

test('first eligible breach removes one life and starts 30-tick grace', () => {
  const r = resolveBreaches(s({
    enemies: [{ id: 1, lane: 0, depth: -0.1, hp: 1 }],
    lives: 3
  }));
  assert.equal(r.lifeLost, true);
  assert.equal(r.state.lives, 2);
  assert.equal(r.state.damageGraceRemaining, 30);
  assert.equal(r.breaches.length, 1);
  assert.equal(r.state.enemies.length, 0);
});

test('two same-tick breaches: cost one life, all breachers clear', () => {
  const r = resolveBreaches(s({
    enemies: [
      { id: 2, lane: 0, depth: -0.1, hp: 1 },
      { id: 1, lane: 1, depth: -0.2, hp: 1 }
    ],
    lives: 3
  }));
  assert.equal(r.state.lives, 2);
  assert.equal(r.state.enemies.length, 0);
  assert.equal(r.breaches.length, 2);
  assert.deepEqual(r.breaches.map(b => b.id), [1, 2], 'ascending stable ID');
});

test('breach inside 30-tick grace costs no life but still clears breachers', () => {
  const r = resolveBreaches(s({
    enemies: [{ id: 5, lane: 0, depth: -0.1, hp: 1 }],
    lives: 2,
    damageGraceRemaining: 15
  }));
  assert.equal(r.lifeLost, false);
  assert.equal(r.state.lives, 2);
  assert.equal(r.state.enemies.length, 0);
  assert.equal(r.state.damageGraceRemaining, 14);
});

test('breach on tick where grace timer reaches zero costs a life', () => {
  // grace=1 at start of tick; breach on this tick costs one life and
  // RESTARTS grace to 30 (spec: "first eligible breach removes one life
  // and starts 30 ticks of damage grace").
  const r = resolveBreaches(s({
    enemies: [{ id: 7, lane: 0, depth: -0.1, hp: 1 }],
    lives: 2,
    damageGraceRemaining: 1
  }));
  assert.equal(r.lifeLost, true);
  assert.equal(r.state.lives, 1);
  assert.equal(r.state.damageGraceRemaining, 30);
});

test('breach on the immediately preceding tick (grace=2) costs none', () => {
  const r = resolveBreaches(s({
    enemies: [{ id: 8, lane: 0, depth: -0.1, hp: 1 }],
    lives: 2,
    damageGraceRemaining: 2
  }));
  assert.equal(r.lifeLost, false);
  assert.equal(r.state.lives, 2);
  assert.equal(r.state.damageGraceRemaining, 1);
});

test('immunity window statement: ticks where damageGraceRemaining >= 2 at breach time are immune; grace=1 is the boundary tick that costs a life', () => {
  const lost = resolveBreaches(s({ enemies: [{ id: 1, lane: 0, depth: -0.1, hp: 1 }], lives: 2, damageGraceRemaining: 0 }));
  assert.equal(lost.lifeLost, true);
  const boundary = resolveBreaches(s({ enemies: [{ id: 1, lane: 0, depth: -0.1, hp: 1 }], lives: 2, damageGraceRemaining: 1 }));
  assert.equal(boundary.lifeLost, true, 'grace=1 is the tick where grace reaches zero -> life lost');
  const immune = resolveBreaches(s({ enemies: [{ id: 1, lane: 0, depth: -0.1, hp: 1 }], lives: 2, damageGraceRemaining: 2 }));
  assert.equal(immune.lifeLost, false, 'grace>=2 -> inside grace -> immune');
});

test('ascending-id tie: first eligible breach with the lower id is the one that costs a life', () => {
  const r = resolveBreaches(s({
    enemies: [
      { id: 5, lane: 0, depth: -0.1, hp: 1 },
      { id: 3, lane: 1, depth: -0.2, hp: 1 }
    ],
    lives: 3,
    damageGraceRemaining: 0
  }));
  assert.deepEqual(r.breaches.map(b => b.id), [3, 5]);
  assert.equal(r.lifeLost, true);
  assert.equal(r.state.lives, 2);
});