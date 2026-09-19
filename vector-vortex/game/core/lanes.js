export const LANE_COUNT = 24;

export function stepLeft(lane) {
  return ((lane - 1) + LANE_COUNT) % LANE_COUNT;
}

export function stepRight(lane) {
  return (lane + 1) % LANE_COUNT;
}

export function applyOppositeCancel(lane, left, right) {
  if (left && right) return lane;
  if (left) return stepLeft(lane);
  if (right) return stepRight(lane);
  return lane;
}

export function applyMovement(state) {
  const { left, right } = state.heldInput;
  return { ...state, lane: applyOppositeCancel(state.lane, left, right) };
}