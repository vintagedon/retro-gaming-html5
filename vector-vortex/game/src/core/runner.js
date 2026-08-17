import { CONSTANTS } from './constants.js';

/**
 * Fixed-step simulation accumulator runner.
 * Used by both production runtime loop and deterministic multi-frequency tests.
 *
 * Drives simulation ticks at 60 Hz (16.666 ms / tick) from arbitrary frame deltas,
 * with a bounded max frame delta to prevent unbounded catch-up bursts.
 */
export class FixedStepRunner {
  /**
   * @param {Object} options
   * @param {import('./core.js').VectorVortexCore} options.core
   * @param {number} [options.maxFrameDeltaMs=250]
   */
  constructor(options) {
    this.core = options.core;
    this.tickDurationMs = 1000 / CONSTANTS.TICKS_PER_SECOND; // 16.6666... ms
    this.maxFrameDeltaMs = options.maxFrameDeltaMs ?? 250;
    this.accumulatorMs = 0;
  }

  /**
   * Process an incoming frame delta in milliseconds.
   * Drains input once per tick step.
   *
   * @param {number} deltaMs Frame duration in ms
   * @param {() => Object | Object} inputSource Input provider function or static object
   * @returns {number} Number of ticks executed in this frame
   */
  processFrame(deltaMs, inputSource) {
    let effectiveDelta = deltaMs;
    if (effectiveDelta > this.maxFrameDeltaMs) {
      effectiveDelta = this.maxFrameDeltaMs;
    }

    this.accumulatorMs += effectiveDelta;
    let ticksRan = 0;

    while (this.accumulatorMs >= this.tickDurationMs) {
      const input = typeof inputSource === 'function' ? inputSource() : inputSource;
      this.core.step(input);
      this.accumulatorMs -= this.tickDurationMs;
      ticksRan++;
    }

    return ticksRan;
  }

  reset() {
    this.accumulatorMs = 0;
  }
}
