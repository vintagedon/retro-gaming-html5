export const SHOT_SPEED = 0.025;
export const SHOT_COOLDOWN_TICKS = 8;
export const MAX_ACTIVE_SHOTS = 6;
export const FAR_DEPTH = 1;

export function tryFireShot(state) {
  if (state.cooldown > 0) return state;
  if (state.shots.length >= MAX_ACTIVE_SHOTS) return state;
  const shot = { id: state.nextShotId, lane: state.lane, depth: 0 };
  return {
    ...state,
    shots: [...state.shots, shot],
    cooldown: SHOT_COOLDOWN_TICKS,
    nextShotId: state.nextShotId + 1
  };
}

export function advanceShots(state) {
  return {
    ...state,
    shots: state.shots.map(s => ({ ...s, depth: s.depth + SHOT_SPEED }))
  };
}

export function expireShotsAtFar(state) {
  return { ...state, shots: state.shots.filter(s => s.depth < FAR_DEPTH) };
}

export function tickCooldown(state) {
  return state.cooldown > 0 ? { ...state, cooldown: state.cooldown - 1 } : state;
}