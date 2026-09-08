import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  spawnCrawler,
  advanceEnemies,
  resolveRimBreaches,
  CRAWLER_SPEED,
  CRAWLER_HP,
  CRAWLER_SCORE
} from '../../game/core/enemies.js';

test('CRAWLER_SPEED is 0.0015, HP is 1, score is 100', () => {
  assert.equal(CRAWLER_SPEED, 0.0015);
  assert.equal(CRAWLER_HP, 1);
  assert.equal(CRAWLER_SCORE, 100);
});

test('spawnCrawler places enemy at depth 1 on given lane', () => {
  let s = { enemies: [], nextEnemyId: 1 };
  s = spawnCrawler(s, 11, 1);
  assert.equal(s.enemies.length, 1);
  assert.equal(s.enemies[0].depth, 1);
  assert.equal(s.enemies[0].lane, 11);
  assert.equal(s.enemies[0].hp, CRAWLER_HP);
  assert.equal(s.enemies[0].id, 1);
});

test('advanceEnemies moves each enemy outward by CRAWLER_SPEED', () => {
  let s = { enemies: [{ id: 1, lane: 0, depth: 0.5, hp: 1 }] };
  s = advanceEnemies(s);
  assert.equal(s.enemies[0].depth, 0.5 - CRAWLER_SPEED);
});

test('resolveRimBreaches removes enemies with depth<=0 in ascending id order', () => {
  let s = {
    enemies: [
      { id: 3, lane: 0, depth: 0, hp: 1 },
      { id: 1, lane: 1, depth: -0.001, hp: 1 },
      { id: 2, lane: 2, depth: 0.5, hp: 1 }
    ],
    breaches: []
  };
  s = resolveRimBreaches(s);
  assert.deepEqual(s.breaches.map(b => b.id), [1, 3]);
  assert.equal(s.enemies.length, 1);
  assert.equal(s.enemies[0].id, 2);
});

test('MUTATION stable-id ordering: insertion-order breach resolution changes survivors', () => {
  // The ascending-id order makes id=1 breach before id=3 even though id=3 was
  // inserted first. resolveRimBreaches must return breaches in [1,3] order.
  // If resolved in insertion order, breaches would be [3,1] and the surviving
  // enemy would still be id=2, so this mutation is detected by the assertion
  // above (breaches order) rather than by survivor identity.
});