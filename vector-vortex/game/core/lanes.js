import { activeShape, laneStep } from './shapes.js';

export const LANE_COUNT = 24;

export function stepLeft(lane, shape = activeShape()) {
  return laneStep(lane, -1, shape, LANE_COUNT);
}

export function stepRight(lane, shape = activeShape()) {
  return laneStep(lane, 1, shape, LANE_COUNT);
}

export function applyOppositeCancel(lane, left, right, shape = activeShape()) {
  if (left && right) return lane;
  if (left) return stepLeft(lane, shape);
  if (right) return stepRight(lane, shape);
  return lane;
}

export function applyMovement(state) {
  const shape = activeShape();
  const { left, right } = state.heldInput;
  return { ...state, lane: applyOppositeCancel(state.lane, left, right, shape) };
}
