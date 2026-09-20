// Enemy fire (Spec 03 gate 2): the enemy fires back. An enemy fires along
// its own lane toward the rim; a shot damages the player only while the
// player occupies that lane, resolved by the swept-interval rule so a shot
// cannot pass through the player between ticks. Shots expire at the rim.
// All rows are balance-table values, tuned by feel.

export const ENEMY_SHOT_SPEED = 0.01;
export const MAX_ACTIVE_ENEMY_SHOTS = 4;
export const ENEMY_FIRE_INTERVAL_TICKS = 150;
// Earliest fire is measured from the firing enemy's spawn tick, which is
// itself within the wave, so no shot can precede the wave's own floor.
export const ENEMY_FIRE_EARLIEST_TICK = 120;

export function initialFireTick(elapsedTicks) {
  return elapsedTicks + ENEMY_FIRE_EARLIEST_TICK;
}

// Try to fire from one enemy. A fire attempt past the active-shot cap is
// not a shot; the caller retries on a later tick while nextFireTick stays
// due.
export function tryEnemyFire(state, enemy) {
  if (state.enemyShots.length >= MAX_ACTIVE_ENEMY_SHOTS) return null;
  const id = state.nextEnemyShotId;
  return {
    shot: { id, lane: enemy.lane, depth: enemy.depth },
    state: { ...state, nextEnemyShotId: id + 1 }
  };
}

export function advanceEnemyShotsWithDepth(state) {
  const enemyShots = state.enemyShots.map(s => {
    const next = s.depth - ENEMY_SHOT_SPEED;
    return { ...s, prev: s.depth, next, depth: next };
  });
  return { state: { ...state, enemyShots }, enemyShots };
}

// Enemy shots expire at the rim: anything at or past depth 0 is removed.
// Runs after hit resolution so a shot's final sweep participates.
export function expireEnemyShotsAtRim(state) {
  return { ...state, enemyShots: state.enemyShots.filter(s => s.depth > 0) };
}
