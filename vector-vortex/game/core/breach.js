export const DAMAGE_GRACE_TICKS = 30;

// Per spec: grace ticks down at the start of every tick. A breach is
// "eligible" (i.e. costs a life) only when grace has just reached zero at
// the top of the tick — i.e. the pre-decrement grace was 1. After a life
// is taken, grace restarts at 30 (and does NOT decrement on the same tick).
// Breaches during grace (pre-decrement grace > 1) clear breachers but cost
// no life and grace still ticks down at the top of the tick.
export function resolveBreaches(state) {
  const preGrace = state.damageGraceRemaining;
  const allBreaching = state.enemies
    .filter(e => e.depth <= 0)
    .slice()
    .sort((a, b) => a.id - b.id);

  let lives = state.lives;
  let grace = preGrace;
  let lifeLost = false;
  let graceStarted = false;

  if (allBreaching.length > 0) {
    if (preGrace <= 1) {
      // The breach happens on the tick where grace reaches zero (or grace is
      // already zero). Take a life and restart grace at 30. Do NOT decrement
      // on this same tick (the grace window begins on this tick).
      lives = Math.max(0, lives - 1);
      grace = DAMAGE_GRACE_TICKS;
      lifeLost = true;
      graceStarted = true;
    } else {
      // Breach inside grace: no life lost. Grace ticks down normally.
      grace = preGrace - 1;
    }
  } else if (preGrace > 0) {
    grace = preGrace - 1;
  }

  const remainingEnemies = allBreaching.length > 0
    ? state.enemies.filter(e => e.depth > 0)
    : state.enemies;

  return {
    state: {
      ...state,
      lives,
      damageGraceRemaining: grace,
      enemies: remainingEnemies
    },
    breaches: allBreaching,
    lifeLost,
    graceStarted
  };
}