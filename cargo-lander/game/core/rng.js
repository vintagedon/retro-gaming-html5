// Deterministic RNG (mulberry32). The full generator state is one
// uint32 that serializes with the simulation snapshot, so a restored
// run continues the exact same draw sequence.
export function seedToState(seed) {
  let h = seed >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

export function createRng(initialState) {
  let state = initialState >>> 0;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    draw() {
      const value = next();
      return value;
    },
    getState() {
      return state >>> 0;
    },
    setState(nextState) {
      state = nextState >>> 0;
    }
  };
}
