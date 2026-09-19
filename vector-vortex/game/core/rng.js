export function createRng(seed) {
  let state = (seed >>> 0) || 1;
  return {
    next() {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(min, max) {
      return min + Math.floor(this.next() * (max - min + 1));
    },
    lane() {
      return this.int(0, 23);
    },
    getState() {
      return state >>> 0;
    },
    setState(s) {
      // 01c gate 1: a zero argument is a valid restored RNG position, not
      // an uninitialized seed. Normalizing it to 1 changes the stream on
      // the next draw. The initial-seed normalization lives in createRng.
      state = s >>> 0;
    }
  };
}