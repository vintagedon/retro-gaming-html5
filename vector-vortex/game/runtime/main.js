// Vector Vortex runtime entry. Wires core + renderer + input + frame runner
// + shell + game audio + persistence (Spec 03).

import { createRenderer } from './renderer.js';
import { createInputAdapter } from './input.js';
import { createFrameRunner } from './frame-runner.js';
import { createDom } from './dom.js';
import { createShell } from './shell.js';
import { loadPersistence, persistPatch } from './storage.js';
import { createUiAudio, createNoopUiAudio } from './audio.js';

function q(sel) {
  const el = document.querySelector(sel);
  if (!el) throw new Error(`missing shell element: ${sel}`);
  return el;
}

function start() {
  const canvas = document.getElementById('vv-canvas');
  const root = document.getElementById('vv-root');
  const score = q('[data-testid="vv-score"]');
  const best = q('[data-testid="vv-best"]');
  const lives = document.getElementById('vv-lives');
  const currentStatus = q('[data-testid="vv-current-status"]');
  const pauseButton = document.getElementById('vv-pause');
  const restartButton = document.getElementById('vv-restart');

  const shellEl = document.getElementById('vv-shell');
  const surfaces = {
    title: q('[data-vv-surface="title"]'),
    paused: q('[data-vv-surface="paused"]'),
    settings: q('[data-vv-surface="settings"]'),
    'wave-complete': q('[data-vv-surface="wave-complete"]'),
    'game-over': q('[data-vv-surface="game-over"]')
  };
  const actions = {
    bar: document.getElementById('vv-controls-buttons'),
    pause: pauseButton,
    restart: restartButton,
    title: {
      start: document.getElementById('vv-start'),
      settings: document.getElementById('vv-title-settings')
    },
    paused: {
      resume: document.getElementById('vv-resume'),
      settings: document.getElementById('vv-pause-settings'),
      restart: document.getElementById('vv-pause-restart'),
      returnTitle: document.getElementById('vv-return-title')
    },
    waveComplete: {
      playAgain: document.getElementById('vv-play-again'),
      returnTitle: document.getElementById('vv-wc-return-title')
    },
    gameOver: {
      playAgain: document.getElementById('vv-new-run'),
      returnTitle: document.getElementById('vv-end-return-title')
    }
  };
  const settings = {
    tabs: {
      audio: document.getElementById('vv-tab-audio'),
      display: document.getElementById('vv-tab-display'),
      controls: document.getElementById('vv-tab-controls')
    },
    panels: {
      audio: document.getElementById('vv-panel-audio'),
      display: document.getElementById('vv-panel-display'),
      controls: document.getElementById('vv-panel-controls')
    },
    mute: document.getElementById('vv-mute-toggle'),
    volume: document.getElementById('vv-volume'),
    volumeValue: document.getElementById('vv-volume-value'),
    motion: {
      system: document.getElementById('vv-motion-system'),
      reduced: document.getElementById('vv-motion-reduced'),
      full: document.getElementById('vv-motion-full')
    },
    reset: document.getElementById('vv-reset-defaults'),
    close: document.getElementById('vv-settings-close')
  };
  const results = {
    wcScore: q('[data-testid="vv-wc-score"]'),
    goScore: q('[data-testid="vv-go-score"]'),
    goWave: q('[data-testid="vv-go-wave"]'),
    goBest: q('[data-testid="vv-go-best"]')
  };

  // Persistence (Spec 02 deliverable 3): one defensive load at boot; writes
  // only through persistPatch from the shell's preference and outcome paths.
  const persisted = loadPersistence();
  let bestValue = persisted.bestScore;

  // Game audio (Spec 03 gate 3): synthesized cues plus the one shipped
  // music loop after the first deliberate gesture. The no-op replacement
  // exists for the audio-equivalence validation and is selected only
  // through the tracked seam toggle.
  const audio = (typeof window.__vv !== 'undefined' && window.__vv.disableUiAudio === true)
    ? createNoopUiAudio()
    : createUiAudio({ musicUrl: 'assets/music/chrome-hamster.ogg' });

  const bestProvider = (typeof window.__vv !== 'undefined' && typeof window.__vv.bestProvider === 'function')
    ? window.__vv.bestProvider
    : () => bestValue;

  const renderer = createRenderer({ canvas });
  renderer.resize();
  window.addEventListener('resize', () => renderer.resize());

  // Shipped effect sprites (attribution in game/assets/ATTRIBUTION.md):
  // fire on the player shot, hit and destruction on the enemy.
  function sprite(name) {
    const img = new Image();
    img.src = `assets/effects/${name}`;
    return img;
  }
  renderer.setSprites({
    fire: sprite('muzzle-01.png'),
    hit: sprite('flame-01.png'),
    destruction: sprite('flame-03.png')
  });

  // Decorative title web: the same renderer draws one static frame on the
  // title canvas. Purely decorative and independent of any run.
  const titleCanvas = document.getElementById('vv-title-web');
  const titleRenderer = createRenderer({ canvas: titleCanvas });
  const drawTitleWeb = () => {
    titleRenderer.resize();
    titleRenderer.render({ lane: 0, shots: [], enemies: [] });
  };
  drawTitleWeb();
  window.addEventListener('resize', drawTitleWeb);

  const dom = createDom({
    score, best, lives,
    pauseButton, restartButton, bestProvider
  });

  let runner = null;

  const shell = createShell({
    shell: shellEl,
    surfaces,
    actions,
    settings,
    results,
    currentStatus,
    canvas,
    root,
    runner: null, // rebound below once the runner exists
    audio,
    persistence: { preferences: persisted.preferences, bestScore: persisted.bestScore, persistPatch },
    onBestChange: (v) => { bestValue = v; }
  });

  // Destruction fragments, effect sprites, combat sounds, and the hit
  // flash are cosmetics. The seen-sets deduplicate events, which the
  // snapshot re-carries for up to 200 ticks, and are pruned as they grow.
  const seenEvents = new Set();
  function remember(key) {
    if (seenEvents.has(key)) return false;
    seenEvents.add(key);
    if (seenEvents.size > 800) {
      for (const k of seenEvents) { seenEvents.delete(k); if (seenEvents.size <= 400) break; }
    }
    return true;
  }

  function publish(snapshot) {
    for (const ev of snapshot.recentEvents) {
      if (ev.type === 'enemy-destroyed' && remember(`destroyed:${ev.enemyId}:${ev.tick}`)) {
        renderer.spawnFragments(ev.lane, ev.depth);
        renderer.spawnSprite('hit', ev.lane, ev.depth);
        renderer.spawnSprite('destruction', ev.lane, ev.depth);
        audio.play('hit');
        audio.play('destroyed');
      } else if (ev.type === 'shot-fired' && remember(`fired:${ev.shotId}`)) {
        renderer.spawnSprite('fire', ev.lane, 0);
        audio.play('fire');
      } else if (ev.type === 'life-lost' && remember(`lost:${ev.tick}:${ev.cause}`)) {
        renderer.flashPlayer();
      }
    }
    dom.project(snapshot);
    shell.observeSnapshot(snapshot);
  }

  // The shell owns real time: the runner's clock gate consults the shell
  // state on every focus or visibility transition.
  runner = createFrameRunner({
    renderer,
    dom,
    onSnapshot: publish,
    initialSeed: 1,
    clockGate: () => shell.getState() === 'running'
  });
  shell.rebindRunner(runner);
  runner.start();

  // Initial projection so DOM is in sync before the first frame.
  publish(runner.getSnapshot());

  const input = createInputAdapter({
    // The adapter's gameSurface is the Canvas, not the game root. The
    // focus gate accepts only the canvas, and the shell returns focus
    // here after a keyboard pause, so keyboard control works after
    // resume without another click.
    gameSurface: canvas,
    dispatch: (a) => runner.dispatch(a),
    onBlur: () => shell.pause({ source: canvas }),
    onVisibility: () => runner.dispatch({ type: 'visibility' }),
    onPauseKey: () => shell.pause({ source: canvas })
  });

  // First deliberate gesture unlocks the audio context. The calls are
  // idempotent; nothing plays before a real gesture happened.
  const unlock = () => audio.unlock();
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);

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
      // Tap-and-repeat: one tap is one lane step. Each tap is a press
      // tick followed by a release tick, so the core observes the
      // release and the next tap is a fresh press.
      for (let i = 0; i < lane; i++) {
        runner.dispatch({ type: 'right-down' });
        runner.advanceTicks(1);
        runner.dispatch({ type: 'right-up' });
        runner.advanceTicks(1);
      }
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
    },
    getShellState() {
      return shell.getState();
    },
    getShellLog() {
      return shell.getLog();
    },
    getAudioState() {
      return audio.getState();
    },
    getBest() {
      return shell.getBest();
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
