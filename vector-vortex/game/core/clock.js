export const TICK_HZ = 60;
export const TICK_SECONDS = 1 / TICK_HZ;
export const DEFAULT_MAX_FRAME_DELTA = 0.25;

export function createClock({ maxFrameDelta = DEFAULT_MAX_FRAME_DELTA } = {}) {
  let acc = 0;
  let paused = false;
  return {
    pushDelta(seconds) {
      if (paused) return;
      if (!Number.isFinite(seconds) || seconds < 0) return;
      if (seconds > maxFrameDelta) seconds = maxFrameDelta;
      acc += seconds;
    },
    run(core) {
      if (paused) return false;
      if (core.snapshot().paused) return false;
      if (acc < TICK_SECONDS) return false;
      acc -= TICK_SECONDS;
      core.tick();
      return true;
    },
    pause() { paused = true; },
    resume() { paused = false; },
    pending() { return acc; }
  };
}