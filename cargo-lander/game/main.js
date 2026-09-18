import { CONFIG } from './core/config.js';
import { createLanderCore } from './core/lander.js';
import { createClock } from './runtime/clock.js';
import { createRunner } from './runtime/runner.js';
import { createHudProjector } from './ui/hud.js';
import { createStage } from './ui/stage.js';
import { createRenderer } from './render.js';

const core = createLanderCore({ seed: 20260918 });
const clock = createClock();
const renderer = createRenderer(document.getElementById('playfield'), CONFIG);
const stage = createStage({
  root: document.getElementById('stage-root'),
  stage: document.getElementById('stage'),
  canvas: document.getElementById('playfield'),
  getDpr: () => window.devicePixelRatio || 1
});
const projector = createHudProjector({
  fuelMeter: document.querySelector('[data-hud="fuel-meter"]'),
  hullMeter: document.querySelector('[data-hud="hull-meter"]'),
  thrustMeter: document.querySelector('[data-hud="thrust-meter"]'),
  craftMeter: document.querySelector('[data-hud="craft-meter"]'),
  altitudeValue: document.querySelector('[data-hud-field="altitude"]'),
  velocityValue: document.querySelector('[data-hud-field="velocity"]'),
  fuelValue: document.querySelector('[data-hud-field="fuel"]'),
  impactBadge: document.querySelector('[data-hud-field="impact"]'),
  overlay: document.getElementById('overlay'),
  overlayTitle: document.getElementById('overlay-title'),
  overlayHint: document.getElementById('overlay-hint')
});

function presentFrame() {
  const snapshot = core.snapshot();
  projector.project(snapshot);
  renderer.draw(snapshot);
}

stage.fit();
window.addEventListener('resize', () => {
  stage.fit();
  presentFrame();
});

const runner = createRunner({
  core,
  clock,
  requestFrame: (cb) => window.requestAnimationFrame(cb),
  cancelFrame: (id) => window.cancelAnimationFrame(id),
  onFrame: presentFrame
});

function rebaseAfterRestore() {
  runner.markRebase();
}

document.addEventListener('visibilitychange', () => {
  clock.setHidden(document.hidden);
  if (!document.hidden) rebaseAfterRestore();
});

function setGameplayPause(paused) {
  core.setPaused(paused);
  if (paused) clock.pause();
  else clock.resume();
  rebaseAfterRestore();
}

const held = { left: false, right: false };

function compositeRotate() {
  core.setRotate((held.right ? 1 : 0) - (held.left ? 1 : 0));
}

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  switch (event.code) {
    case 'ArrowLeft':
    case 'KeyA':
      held.left = true;
      compositeRotate();
      event.preventDefault();
      break;
    case 'ArrowRight':
    case 'KeyD':
      held.right = true;
      compositeRotate();
      event.preventDefault();
      break;
    case 'ArrowUp':
    case 'KeyW':
      core.nudgeThrust(1);
      event.preventDefault();
      break;
    case 'ArrowDown':
    case 'KeyS':
      core.nudgeThrust(-1);
      event.preventDefault();
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      core.setThrustNotch(core.snapshot().thrustNotchesMax);
      break;
    case 'KeyX':
      core.setThrustNotch(0);
      break;
    case 'KeyR':
      core.retry();
      break;
    case 'Enter':
      core.restartRun();
      break;
    case 'KeyP':
      setGameplayPause(!core.snapshot().paused);
      break;
    default:
      break;
  }
});

window.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'ArrowLeft':
    case 'KeyA':
      held.left = false;
      compositeRotate();
      event.preventDefault();
      break;
    case 'ArrowRight':
    case 'KeyD':
      held.right = false;
      compositeRotate();
      event.preventDefault();
      break;
    default:
      break;
  }
});

// The deterministic seam tests use to own the simulation. Lifecycle
// methods control the runner; input dispatch mirrors the core's API.
window.__cl = {
  stop: () => runner.stop(),
  start: () => runner.start(),
  advanceTicks: (n) => {
    const advanced = runner.advanceTicks(n);
    presentFrame();
    return advanced;
  },
  reset: (seed) => {
    core.restartRun({ seed: seed >>> 0 });
    presentFrame();
  },
  getSnapshot: () => core.snapshot(),
  refreshHud: () => presentFrame(),
  input: {
    setRotate: (dir) => core.setRotate(dir),
    nudgeThrust: (delta) => core.nudgeThrust(delta),
    setThrustNotch: (notch) => core.setThrustNotch(notch),
    retry: () => core.retry(),
    restart: () => core.restartRun(),
    setPaused: (paused) => setGameplayPause(paused)
  },
  lifecycle: {
    isRunning: () => runner.isRunning()
  },
  stage: () => stage.info()
};

presentFrame();
runner.start();
