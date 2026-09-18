import { DEFAULT_MAX_FRAME_DELTA } from './clock.js';
import { TICK_HZ } from '../core/config.js';

// One frame can carry at most the clamped 250 ms of accumulator, which is
// fifteen whole ticks at sixty ticks a second. The drain loop is bounded by
// that ceiling so a long frame cannot turn into an unbounded catch-up.
const MAX_TICKS_PER_FRAME = Math.ceil(DEFAULT_MAX_FRAME_DELTA * TICK_HZ);

// The frame runner owns animation-frame scheduling and timestamp rebasing.
// stop() relinquishes automatic advancement without touching gameplay
// pause; start() resumes with a fresh time origin and no backlog. Both are
// idempotent: repeated starts cannot create a second frame chain.
export function createRunner({ core, clock, requestFrame, cancelFrame }) {
  let running = false;
  let frameId = null;
  let lastTime = null;
  let rebaseNext = true;

  function loop(now) {
    if (!running) return;
    if (rebaseNext) {
      lastTime = now;
      rebaseNext = false;
    }
    const delta = Math.max(0, (now - lastTime) / 1000);
    lastTime = now;
    clock.pushDelta(delta);
    let drained = 0;
    while (drained < MAX_TICKS_PER_FRAME && clock.run(core)) {
      drained += 1;
    }
    frameId = requestFrame(loop);
  }

  return {
    start() {
      if (running) return;
      running = true;
      rebaseNext = true;
      frameId = requestFrame(loop);
    },
    stop() {
      if (!running) return;
      running = false;
      if (frameId !== null && cancelFrame) {
        cancelFrame(frameId);
      }
      frameId = null;
      rebaseNext = true;
    },
    isRunning() {
      return running;
    },
    // Manual stepping owns the simulation while the runner is stopped.
    advanceTicks(n) {
      if (running) {
        throw new Error('advanceTicks is rejected while the runner is running');
      }
      const count = Math.max(0, Math.floor(n));
      for (let i = 0; i < count; i += 1) {
        core.tick();
      }
      return count;
    },
    // Rebase so hidden, paused, or stopped wall-clock time is excluded
    // from the next frame's delta.
    markRebase() {
      rebaseNext = true;
    }
  };
}
