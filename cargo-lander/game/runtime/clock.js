import { TICK_HZ, TICK_SECONDS } from '../core/config.js';

export { TICK_HZ, TICK_SECONDS };
export const DEFAULT_MAX_FRAME_DELTA = 0.25;

// The clock is a passive accumulator. The frame runner is the integration
// point that decides when to push deltas; the clock is a backstop that
// refuses to accumulate while paused or while the host tab is hidden, so a
// resume or a tab restoration produces no catch-up burst.
export function createClock({ maxFrameDelta = DEFAULT_MAX_FRAME_DELTA, suppressWhileHidden = true } = {}) {
  let acc = 0;
  let paused = false;
  let hidden = false;
  return {
    pushDelta(seconds) {
      if (paused) return;
      if (suppressWhileHidden && hidden) return;
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
    setHidden(v) { hidden = !!v; },
    pending() { return acc; }
  };
}
