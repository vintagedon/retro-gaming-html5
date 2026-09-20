// Vector Vortex frame runner.
// requestAnimationFrame loop. Fixed-step ticks via createClock.
// replaceCore rebinds both the runner and the clock. reset(seed) calls
// replaceCore(createCore({ seed })) UNLESS the runtime mutation
// window.__vv.skipFrameRunnerRebind is set, in which case the runner keeps
// the old core reference and only the DOM seam swaps (so the orphaned core
// continues to advance).

import { createCore } from '../core/core.js';
import { createClock } from '../core/clock.js';

export function createFrameRunner({ renderer, dom, onSnapshot, initialSeed = 1, clockGate }) {
  let core = createCore({ seed: initialSeed });
  const clock = createClock();
  let running = false;
  let lastTs = 0;
  let rafId = 0;
  // Real time may tick only while the shell state allows it. The shell
  // owns the gate; core.paused alone is not the rule (Spec 03 gate 3:
  // a fresh title core is unpaused, and the clock must still not run).
  const clockAllowed = () => (typeof clockGate === 'function' ? clockGate() : true);

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
    if (clockAllowed()) clock.resume();
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
      // 01c continuation gate 1: rebase the frame timestamp at the
      // lifecycle transition itself. A hidden tab whose animation frames
      // were suspended delivers no callback, so the in-loop reset below
      // never runs and the first restored frame would replay hidden time
      // as a stale delta. Rebase on both transitions so hidden time is
      // discarded regardless of callback delivery.
      lastTs = 0;
      if (document.visibilityState === 'hidden') {
        clock.pause();
      } else if (clockAllowed() && !core.snapshot().paused) {
        // The visible transition resumes the clock only while the shell
        // allows real time AND the core is not manually paused. Resuming
        // unconditionally let pushDelta accumulate against a title-state
        // or paused core for the whole transition and burst on return.
        clock.resume();
      }
    } else if (action && action.type === 'resume-blur') {
      // 01c continuation gate 1: same guard as the visible transition.
      // A player who paused and then changed focus must not come back to
      // a clock that accumulated delta against the paused core.
      if (clockAllowed() && !core.snapshot().paused) clock.resume();
    }
    core.dispatch(action);
    // 01c gate 1: a pause action must pause the clock too, so the
    // accumulator does not build up during the pause interval and replay
    // on resume. Held input is cleared by the input adapter on the pause
    // button click and on the keyboard pause keys, so a fresh keydown is
    // required to act on resume.
    if (action && action.type === 'pause') {
      const s = core.snapshot();
      if (s.paused) clock.pause();
      else if (clockAllowed()) clock.resume();
    } else if (action && action.type === 'restart') {
      // 01c continuation gate 1: the reset state is always unpaused, so a
      // restart must re-sync the clock to running. Without this, restarting
      // from the outcome screen while paused left the fresh run frozen.
      if (clockAllowed()) clock.resume();
    }
  }

  function setState(next) {
    core.setState(next);
  }

  // Spec 02 shell clock handles: the shell owns when real time may tick.
  // pauseClock stops accumulation outright; resumeClock mirrors the 01c
  // guard by resuming only against an unpaused core.
  function pauseClock() {
    clock.pause();
  }

  function resumeClock() {
    if (!core.snapshot().paused) clock.resume();
  }

  return { start, stop, replaceCore, reset, advanceTicks, getSnapshot, dispatch, setState, pauseClock, resumeClock };
}
