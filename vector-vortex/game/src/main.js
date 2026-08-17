import { VectorVortexCore } from './core/core.js';
import { VectorRenderer } from './render/renderer.js';
import { InputAdapter } from './ui/input.js';
import { FixedStepRunner } from './core/runner.js';
import { CONSTANTS } from './core/constants.js';

class VectorVortexApp {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new VectorRenderer(this.canvas);

    this.statStatus = document.getElementById('stat-status');
    this.statLives = document.getElementById('stat-lives');
    this.statScore = document.getElementById('stat-score');
    this.statTime = document.getElementById('stat-time');
    this.statKills = document.getElementById('stat-kills');
    this.statAccuracy = document.getElementById('stat-accuracy');
    this.liveAnnouncements = document.getElementById('live-announcements');

    this.btnPause = document.getElementById('btn-pause');
    this.btnRestart = document.getElementById('btn-restart');

    this.isPaused = false;
    this.initialSeed = 12345;
    this.core = new VectorVortexCore({ seed: this.initialSeed });
    this.runner = new FixedStepRunner({ core: this.core, maxFrameDeltaMs: 250 });

    this.inputAdapter = new InputAdapter({
      onPauseToggle: () => this.togglePause(),
    });

    this.lastFrameTime = performance.now();

    this.bindDOMEvents();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    // Expose test seam on window for Playwright exact-tick driving
    window.__VECTOR_VORTEX_SEAM__ = {
      core: this.core,
      stepExactTicks: (n, input = {}) => {
        let snap = null;
        for (let i = 0; i < n; i++) {
          snap = this.core.step(input);
        }
        this.updateUI(snap);
        this.renderer.render(snap);
        return snap;
      },
      getSnapshot: () => this.core.getSnapshot(),
      reset: (seed = 12345) => {
        this.initialSeed = seed;
        this.core = new VectorVortexCore({ seed });
        this.isPaused = false;
        this.updateUI(this.core.getSnapshot());
        this.renderer.render(this.core.getSnapshot());
      },
    };

    // Start render/simulation loop
    requestAnimationFrame((t) => this.loop(t));
  }

  bindDOMEvents() {
    this.btnPause.addEventListener('click', () => {
      this.togglePause();
    });

    this.btnRestart.addEventListener('click', () => {
      this.restart();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Pauses or freezes time advance during hidden tab
        this.lastFrameTime = performance.now();
        this.runner.reset();
        this.inputAdapter.clearHeld();
      } else {
        this.lastFrameTime = performance.now();
        this.runner.reset();
      }
    });
  }

  handleResize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const width = Math.floor(rect.width);
    const height = Math.floor(rect.height || (width * 9) / 16);
    this.renderer.resize(width, height, window.devicePixelRatio || 1);
  }

  togglePause() {
    const snap = this.core.getSnapshot();
    if (snap.status !== 'active') return;

    this.isPaused = !this.isPaused;
    this.btnPause.textContent = this.isPaused ? 'Resume' : 'Pause';
    this.inputAdapter.clearHeld();
    this.lastFrameTime = performance.now();
    this.runner.reset();
    this.updateUI(snap);
  }

  restart() {
    this.core = new VectorVortexCore({ seed: this.initialSeed });
    this.runner = new FixedStepRunner({ core: this.core, maxFrameDeltaMs: 250 });
    if (window.__VECTOR_VORTEX_SEAM__) {
      window.__VECTOR_VORTEX_SEAM__.core = this.core;
    }
    this.isPaused = false;
    this.btnPause.textContent = 'Pause';
    this.btnPause.disabled = false;
    this.btnRestart.disabled = true;
    this.inputAdapter.clearHeld();
    this.lastFrameTime = performance.now();
    const snap = this.core.getSnapshot();
    this.updateUI(snap);
    this.announce('Game restarted');
  }

  announce(text) {
    if (this.liveAnnouncements) {
      this.liveAnnouncements.textContent = text;
    }
  }

  updateUI(snap) {
    // Status text
    if (this.isPaused) {
      this.statStatus.textContent = 'PAUSED';
      this.statStatus.className = 'status-value status-alert';
    } else if (snap.status === 'active') {
      this.statStatus.textContent = 'ACTIVE';
      this.statStatus.className = 'status-value';
    } else if (snap.status === 'survived') {
      this.statStatus.textContent = 'SURVIVED';
      this.statStatus.className = 'status-value';
    } else if (snap.status === 'lost') {
      this.statStatus.textContent = 'LOST';
      this.statStatus.className = 'status-value status-alert';
    }

    // Telemetry values: pure projection of core snapshot
    this.statLives.textContent = snap.lives;
    this.statScore.textContent = snap.score.toLocaleString();
    this.statKills.textContent = snap.kills;
    this.statAccuracy.textContent = snap.accuracyText;

    // Remaining time countdown: 300s - (elapsedTicks / 60)
    const remainingTicks = Math.max(0, CONSTANTS.RUN_LENGTH_TICKS - snap.elapsedTicks);
    const remainingSeconds = Math.ceil(remainingTicks / CONSTANTS.TICKS_PER_SECOND);
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    this.statTime.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Enable restart only after outcome (lost or survived)
    if (snap.status !== 'active') {
      this.btnRestart.disabled = false;
      this.btnPause.disabled = true;
    }

    // Process events for announcements
    for (const evt of snap.events) {
      if (evt.type === 'life-lost') {
        this.announce(`Life lost! ${evt.remainingLives} remaining.`);
      } else if (evt.type === 'run-ended') {
        this.announce(`Run ended: ${evt.outcome.toUpperCase()}! Final Score: ${evt.finalScore}`);
      }
    }
  }

  loop(currentTime) {
    const delta = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    if (!this.isPaused && !document.hidden) {
      this.runner.processFrame(delta, () => this.inputAdapter.poll());
    }

    const snapshot = this.core.getSnapshot();
    this.updateUI(snapshot);
    this.renderer.render(snapshot);

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new VectorVortexApp();
});
