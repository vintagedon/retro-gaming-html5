/**
 * 32-bit Mulberry32 seeded pseudo-random number generator.
 * Completely deterministic across JavaScript runtimes.
 */
export class Mulberry32 {
  /**
   * @param {number} seed 32-bit unsigned integer seed
   */
  constructor(seed = 0) {
    this.state = seed >>> 0;
  }

  /**
   * Returns a pseudo-random float in [0, 1)
   * @returns {number}
   */
  nextFloat() {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a pseudo-random integer in [min, max] inclusive
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  nextInt(min, max) {
    const range = max - min + 1;
    return min + Math.floor(this.nextFloat() * range);
  }

  getState() {
    return this.state;
  }

  setState(state) {
    this.state = state >>> 0;
  }
}
