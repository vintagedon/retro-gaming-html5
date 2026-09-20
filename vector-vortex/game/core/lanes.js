import { activeShape, laneStep } from './shapes.js';

export const LANE_COUNT = 24;

// Tap-and-repeat movement (Spec 03 gate 2). One lane step per keypress;
// holding a direction repeats the first step after the configured delay
// and then once per configured interval. Balance-table rows, tuned by feel.
export const MOVE_REPEAT_DELAY_TICKS = 12;
export const MOVE_REPEAT_INTERVAL_TICKS = 5;

export function stepLeft(lane, shape = activeShape()) {
  return laneStep(lane, -1, shape, LANE_COUNT);
}

export function stepRight(lane, shape = activeShape()) {
  return laneStep(lane, 1, shape, LANE_COUNT);
}

// Desired direction from held flags; simultaneous opposite input cancels.
function desiredDirection(left, right) {
  if (left && right) return 0;
  if (left) return -1;
  if (right) return 1;
  return 0;
}

// Tap-and-repeat resolution for one simulation tick. A fresh press (or a
// direction change) steps once immediately; a held direction repeats after
// MOVE_REPEAT_DELAY_TICKS and then every MOVE_REPEAT_INTERVAL_TICKS. The
// repeat state rides the serialized state, so replays and round-trips are
// deterministic.
export function applyMovement(state) {
  const shape = activeShape();
  const { left, right } = state.heldInput;
  const desired = desiredDirection(left, right);

  let lane = state.lane;
  let moveDir = state.moveDir ?? 0;
  let moveHeldTicks = state.moveHeldTicks ?? 0;
  let moveCooldown = state.moveCooldown ?? 0;

  if (desired !== moveDir) {
    moveDir = desired;
    if (desired !== 0) {
      lane = laneStep(lane, desired, shape, LANE_COUNT);
      moveHeldTicks = 1;
      moveCooldown = MOVE_REPEAT_DELAY_TICKS;
    } else {
      moveHeldTicks = 0;
      moveCooldown = 0;
    }
  } else if (desired !== 0) {
    moveHeldTicks += 1;
    moveCooldown -= 1;
    if (moveCooldown <= 0) {
      lane = laneStep(lane, desired, shape, LANE_COUNT);
      moveCooldown = MOVE_REPEAT_INTERVAL_TICKS;
    }
  }

  return { ...state, lane, moveDir, moveHeldTicks, moveCooldown };
}

export function applyOppositeCancel(lane, left, right, shape = activeShape()) {
  const desired = desiredDirection(left, right);
  if (desired === 0) return lane;
  return laneStep(lane, desired, shape, LANE_COUNT);
}
