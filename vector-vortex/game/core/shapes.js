// Shape library (Spec 03 Frozen Presentation Contract, Shape).
//
// The property that matters is movement: a wrapping shape connects its last
// lane to lane 0 and the player passes between them freely; a non-wrapping
// shape has a leftmost and a rightmost lane and movement stops at the ends.
// Of the locked library, Circle and Star wrap; Line, True V and Stepped V
// do not. This slice ships only Circle; the flags exist so player movement
// and any future lane-changing enemy route through one rule.
//
// A shape is data, not geometry: no closure or area property is defined,
// and no validation may require one (three of the five shapes fail both).

export const LANE_COUNT = 24;

export const SHAPES = {
  circle: { id: 'circle', label: 'Circle', wraps: true },
  star: { id: 'star', label: 'Star', wraps: true },
  line: { id: 'line', label: 'Line', wraps: false },
  'true-v': { id: 'true-v', label: 'True V', wraps: false },
  'stepped-v': { id: 'stepped-v', label: 'Stepped V', wraps: false }
};

export const ACTIVE_SHAPE_ID = 'circle';

export function activeShape() {
  return SHAPES[ACTIVE_SHAPE_ID];
}

// One lane step in a direction (-1, 0, +1) under the shape's wrap rule.
// Wrapping shapes modulo across the seam; non-wrapping shapes clamp at the
// leftmost and rightmost lanes.
export function laneStep(lane, direction, shape = activeShape(), laneCount = LANE_COUNT) {
  if (direction === 0) return lane;
  if (shape.wraps) {
    return (((lane + direction) % laneCount) + laneCount) % laneCount;
  }
  return Math.max(0, Math.min(laneCount - 1, lane + direction));
}
