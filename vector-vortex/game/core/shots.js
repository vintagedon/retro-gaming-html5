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

export function tryFireShotWithEvent(state) {
  if (state.cooldown > 0) return { state, event: null };
  if (state.shots.length >= MAX_ACTIVE_SHOTS) return { state, event: null };
  const id = state.nextShotId;
  const lane = state.lane;
  const tick = state.elapsedTicks ?? 0;
  const shot = { id, lane, depth: 0 };
  const next = {
    ...state,
    shots: [...state.shots, shot],
    cooldown: SHOT_COOLDOWN_TICKS,
    nextShotId: state.nextShotId + 1
  };
  return { state: next, event: { type: 'shot-fired', shotId: id, lane, tick } };
}

export function advanceShots(state) {
  return {
    ...state,
    shots: state.shots.map(s => ({ ...s, depth: s.depth + SHOT_SPEED }))
  };
}

export function advanceShotsWithDepth(state) {
  const shots = state.shots.map(s => ({ ...s, prev: s.depth, next: s.depth + SHOT_SPEED }));
  return {
    state: { ...state, shots: shots.map(s => ({ ...s, depth: s.next })) },
    shots
  };
}

export function expireShotsAtFar(state) {
  return { ...state, shots: state.shots.filter(s => s.depth < FAR_DEPTH) };
}

export function expireShotsAtFarWithEvents(state) {
  const expired = state.shots.filter(s => s.depth >= FAR_DEPTH);
  const surviving = state.shots.filter(s => s.depth < FAR_DEPTH);
  return {
    state: { ...state, shots: surviving },
    expired: expired.map(s => ({ id: s.id, lane: s.lane }))
  };
}

export function tickCooldown(state) {
  return state.cooldown > 0 ? { ...state, cooldown: state.cooldown - 1 } : state;
}