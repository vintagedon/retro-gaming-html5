// Vector Vortex frame runner.
// requestAnimationFrame loop. Fixed-step ticks via createClock.
// replaceCore rebinds both the runner and the clock. reset(seed) calls
// replaceCore(createCore({ seed })) UNLESS the runtime mutation
// window.__vv.skipFrameRunnerRebind is set, in which case the runner keeps
// the old core reference and only the DOM seam swaps (so the orphaned core
// continues to advance).

import { createCore } from '../core/core.js';
import { createClock } from '../core/clock.js';

export function createFrameRunner({ renderer, dom, onSnapshot, initialSeed = 1 }) {
  let core = createCore({ seed: initialSeed });
  const clock = createClock();
  let running = false;
  let lastTs = 0;
  let rafId = 0;

  function publish() {
    if (typeof onSnapshot === 'function') onSnapshot(core.snapshot());
  }

  function loop(ts) {
    if (!running) return;
    rafId = requestAnimationFrame(loop);
    if (lastTs === 0) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (document.visibilityState === 'hidden') return;
    if (window.__vv && window.__vv.pauseRaf === true) return;
    clock.pushDelta(dt);
    let safety = 8;
    while (clock.run(core) && safety-- > 0) { /* drain fixed steps */ }
    publish();
    renderer.render(core.snapshot());
  }

  function start() {
    if (running) return;
    running = true;
    lastTs = 0;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function replaceCore(newCore) {
    core = newCore;
    // The clock is a passive accumulator; it holds no core reference, so
    // replacing the variable above rebinds every consumer.
  }

  function reset(seed = initialSeed) {
    const newCore = createCore({ seed });
    if (!(window.__vv && window.__vv.skipFrameRunnerRebind === true)) {
      replaceCore(newCore);
    }
    clock.resume();
    publish();
    return core.snapshot();
  }

  function advanceTicks(n) {
    core.advance(n);
    publish();
    return core.snapshot();
  }

  function getSnapshot() {
    return core.snapshot();
  }

  function dispatch(action) {
    core.dispatch(action);
  }

  function setState(next) {
    core.setState(next);
  }

  return { start, stop, replaceCore, reset, advanceTicks, getSnapshot, dispatch, setState };
}
