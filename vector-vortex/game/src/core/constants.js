export const CONSTANTS = {
  TICKS_PER_SECOND: 60,
  RUN_LENGTH_TICKS: 18000, // 300 seconds * 60 ticks
  STARTING_LIVES: 3,
  DAMAGE_GRACE_TICKS: 30,
  SHOT_SPEED: 0.025,
  FIRE_COOLDOWN_TICKS: 8,
  MAX_ACTIVE_SHOTS: 6,
  CRAWLER_SPEED: 0.0015,
  CRAWLER_HP: 1,
  CRAWLER_SCORE: 100,
  SURVIVAL_BONUS: 5000,
  ACCURACY_BONUS_MAX: 2000,
  LANE_COUNT: 24,
  DEPTH_RIM: 0,
  DEPTH_FAR: 1,
};

export const DIRECTOR_BANDS = [
  { startTick: 0, endTick: 3599, interval: 60 },      // 0:00 - 0:59.999
  { startTick: 3600, endTick: 10799, interval: 48 },  // 1:00 - 2:59.999
  { startTick: 10800, endTick: 14399, interval: 36 }, // 3:00 - 3:59.999
  { startTick: 14400, endTick: 17999, interval: 27 }, // 4:00 - 4:59.999
];
