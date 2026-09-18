import { createLanderCore } from './core/lander.js';
import { createClock } from './runtime/clock.js';
import { createRunner } from './runtime/runner.js';

const core = createLanderCore({ seed: 20260918 });
const clock = createClock();
const runner = createRunner({
  core,
  clock,
  requestFrame: (cb) => window.requestAnimationFrame(cb),
  cancelFrame: (id) => window.cancelAnimationFrame(id)
});

function rebaseAfterRestore() {
  runner.markRebase();
}

document.addEventListener('visibilitychange', () => {
  clock.setHidden(document.hidden);
  if (!document.hidden) rebaseAfterRestore();
});

// The deterministic seam tests use to own the simulation. Lifecycle
// methods control the runner; input dispatch mirrors the core's API.
window.__cl = {
  stop: () => runner.stop(),
  start: () => runner.start(),
  advanceTicks: (n) => runner.advanceTicks(n),
  reset: (seed) => core.restartRun({ seed: seed >>> 0 }),
  getSnapshot: () => core.snapshot(),
  input: {
    setRotate: (dir) => core.setRotate(dir),
    nudgeThrust: (delta) => core.nudgeThrust(delta),
    setThrustNotch: (notch) => core.setThrustNotch(notch),
    retry: () => core.retry(),
    restart: () => core.restartRun(),
    setPaused: (paused) => {
      core.setPaused(paused);
      if (paused) clock.pause();
      else clock.resume();
      rebaseAfterRestore();
    }
  },
  lifecycle: {
    isRunning: () => runner.isRunning()
  }
};

runner.start();
