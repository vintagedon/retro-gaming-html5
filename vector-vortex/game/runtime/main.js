// Vector Vortex runtime entry. Wires core + renderer + input + frame runner.

import { createRenderer } from './renderer.js';
import { createInputAdapter } from './input.js';
import { createFrameRunner } from './frame-runner.js';
import { createDom } from './dom.js';

function start() {
  const canvas = document.getElementById('vv-canvas');
  const root = document.getElementById('vv-root');
  const status = document.getElementById('vv-status');
  const score = document.querySelector('[data-testid="vv-score"]');
  const lives = document.querySelector('[data-testid="vv-lives"]');
  const time = document.querySelector('[data-testid="vv-time"]');
  const kills = document.querySelector('[data-testid="vv-kills"]');
  const accuracy = document.querySelector('[data-testid="vv-accuracy"]');
  const currentStatus = document.querySelector('[data-testid="vv-current-status"]');
  const pauseButton = document.getElementById('vv-pause');
  const restartButton = document.getElementById('vv-restart');
  const viewportWarning = document.querySelector('[data-testid="vv-viewport-warning"]');

  const renderer = createRenderer({ canvas });
  renderer.resize();
  window.addEventListener('resize', () => renderer.resize());

  const dom = createDom({
    root, status, score, lives, time, kills, accuracy, currentStatus,
    pauseButton, restartButton, viewportWarning
  });

  let runner = null;

  function publish(snapshot) {
    dom.project(snapshot);
  }

  runner = createFrameRunner({ renderer, dom, onSnapshot: publish, initialSeed: 1 });
  runner.start();

  // Initial projection so DOM is in sync before the first frame.
  publish(runner.getSnapshot());

  const input = createInputAdapter({
    gameSurface: root,
    pauseButton,
    restartButton,
    dispatch: (a) => runner.dispatch(a),
    onBlur: () => runner.dispatch({ type: 'blur' }),
    onVisibility: () => runner.dispatch({ type: 'visibility' })
  });

  // Test seam: window.__vv
  const seam = {
    advanceTicks(n) {
      return runner.advanceTicks(n);
    },
    reset(seed = 1) {
      return runner.reset(seed);
    },
    getSnapshot() {
      return runner.getSnapshot();
    },
    getKeyCounters() {
      return renderer.getKeyCounters();
    },
    setLane(lane) {
      // D2.6: the seam must not throw. Use advanceTicks(1) to step the
      // simulation by one lane per tick. The buggy version called
      // runner.tick(), which does not exist.
      runner.dispatch({ type: 'right-down' });
      for (let i = 0; i < lane; i++) runner.advanceTicks(1);
      runner.dispatch({ type: 'right-up' });
    },
    setFire(pressed) {
      runner.dispatch(pressed ? { type: 'fire-down' } : { type: 'fire-up' });
    },
    setLeft(pressed) {
      runner.dispatch(pressed ? { type: 'left-down' } : { type: 'left-up' });
    },
    setRight(pressed) {
      runner.dispatch(pressed ? { type: 'right-down' } : { type: 'right-up' });
    },
    getState() {
      return {
        pauseButtonDisabled: pauseButton.disabled,
        restartButtonDisabled: restartButton.disabled
      };
    },
    setState(next) {
      runner.setState(next);
    }
  };
  // Preserve any mutation toggles the test set via addInitScript.
  const preserved = { ...(window.__vv || {}) };
  window.__vv = Object.assign(seam, preserved);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
