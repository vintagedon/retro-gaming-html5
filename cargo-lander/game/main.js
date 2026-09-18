import { createLanderCore } from './core/lander.js';
import { createClock } from './runtime/clock.js';
import { createRunner } from './runtime/runner.js';
import { createHudProjector } from './ui/hud.js';

const core = createLanderCore({ seed: 20260918 });
const clock = createClock();
const projector = createHudProjector({
  fuelMeter: document.querySelector('[data-hud="fuel-meter"]'),
  hullMeter: document.querySelector('[data-hud="hull-meter"]'),
  thrustMeter: document.querySelector('[data-hud="thrust-meter"]'),
  craftMeter: document.querySelector('[data-hud="craft-meter"]'),
  altitudeValue: document.querySelector('[data-hud-field="altitude"]'),
  velocityValue: document.querySelector('[data-hud-field="velocity"]'),
  fuelValue: document.querySelector('[data-hud-field="fuel"]'),
  impactBadge: document.querySelector('[data-hud-field="impact"]')
});

function projectHud() {
  projector.project(core.snapshot());
}

const runner = createRunner({
  core,
  clock,
  requestFrame: (cb) => window.requestAnimationFrame(cb),
  cancelFrame: (id) => window.cancelAnimationFrame(id),
  onFrame: projectHud
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
  advanceTicks: (n) => {
    const advanced = runner.advanceTicks(n);
    projectHud();
    return advanced;
  },
  reset: (seed) => {
    core.restartRun({ seed: seed >>> 0 });
    projectHud();
  },
  getSnapshot: () => core.snapshot(),
  refreshHud: () => projectHud(),
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

projectHud();
runner.start();
