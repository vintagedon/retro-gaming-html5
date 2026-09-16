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
    if (window.__vv && window.__vv.disableFrameRunner === true) return;
    rafId = requestAnimationFrame(loop);
    if (lastTs === 0) lastTs = ts;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (document.visibilityState === 'hidden') {
      // Reset lastTs on the next visible frame so the first visible frame
      // contributes no stale delta. The clock also refuses to accumulate
      // while hidden (suppressWhileHidden), so this is belt-and-braces.
      lastTs = 0;
      clock.setHidden(true);
      return;
    }
    clock.setHidden(false);
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
    if (action && action.type === 'blur') {
      // D2.5: window blur must stop authoritative tick advancement, not
      // only clear held input. Pause the clock; resume comes from the
      // focus-return handler or an explicit dispatch('resume-blur').
      clock.pause();
    } else if (action && action.type === 'visibility') {
      // Visibility hidden: the loop already gates dt, but pause as well so
      // any direct pushDelta from a test seam does not advance the sim.
      // The visibility handler must also resume the clock when the tab
      // becomes visible, otherwise the clock never restarts after a hidden
      // interval that had no animation frames (rAF was suspended).
      if (document.visibilityState === 'hidden') clock.pause();
      else clock.resume();
    } else if (action && action.type === 'resume-blur') {
      clock.resume();
    }
    core.dispatch(action);
    // 01c gate 1: a pause action must pause the clock too, so the
    // accumulator does not build up during the pause interval and replay
    // on resume. Held input is cleared by the input adapter on the pause
    // button click, so a fresh keydown is required to act on resume.
    if (action && action.type === 'pause') {
      const s = core.snapshot();
      if (s.paused) clock.pause();
      else clock.resume();
    }
  }

  function setState(next) {
    core.setState(next);
  }

  return { start, stop, replaceCore, reset, advanceTicks, getSnapshot, dispatch, setState };
}
