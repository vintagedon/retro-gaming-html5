export const TICK_HZ = 60;
export const TICK_SECONDS = 1 / TICK_HZ;

// One tuning surface for the whole simulation. Retuning the flight feel
// happens here and nowhere else; simulation code never carries constants.
export const CONFIG = Object.freeze({
  // Gravity is constant and downward (world +y is up).
  gravity: 1.62,
  thrust: Object.freeze({
    acceleration: 5.2,
    notches: 4
  }),
  rotation: Object.freeze({
    rate: Math.PI / 2
  }),
  fuel: Object.freeze({
    capacity: 100,
    burnRate: 8
  }),
  landing: Object.freeze({
    siteX: 960,
    siteWidth: 140,
    maxVerticalSpeed: 5,
    maxHorizontalSpeed: 3,
    maxTilt: (8 * Math.PI) / 180
  }),
  impact: Object.freeze({
    // Contact speed magnitude at or above this is a hard impact that
    // destroys the craft. Below it, an unsafe contact is gentle and
    // costs one hull segment. There is no gap between the bands.
    hardThreshold: 12
  }),
  hull: Object.freeze({ segments: 3 }),
  craft: Object.freeze({ starting: 3 }),
  start: Object.freeze({
    x: 260,
    y: 620,
    vx: 26,
    vy: 0,
    angle: 0
  }),
  terrain: Object.freeze({
    points: 65,
    ridgeHeight: 26,
    padFlatMargin: 30
  }),
  world: Object.freeze({ width: 1920 }),
  contact: Object.freeze({
    // Contact only ceases once the craft clears the ground by this
    // margin, so a resting survivor cannot recharge damage by skimming.
    takeoffClearance: 0.5
  }),
  events: Object.freeze({ ringCapacity: 8 })
});
