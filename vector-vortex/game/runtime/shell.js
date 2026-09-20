// Vector Vortex shell (Spec 02 deliverable 3).
// Game-owned screen-space state machine on the vendored framework
// primitives: title, running, paused, settings, ended. The core remains
// authoritative; the shell owns only lifecycle, focus, preferences, and UI
// sound. Every game-owned name here carries the vv- namespace.
//
// Clock discipline: the frame-runner's clock runs only in the running
// state. Title keeps a fresh unpaused core with a paused clock, so the
// tracked seam's advanceTicks still drives deterministic tests from any
// state, and no tick advances by real time outside running.

import { DEFAULT_PREFERENCES } from './storage.js';

const STATES = ['title', 'running', 'paused', 'settings', 'ended'];
const CUE_FOR_STATE_ENTRY = {
  title: 'transition',
  running: null,
  paused: 'pause',
  settings: 'transition',
  ended: 'transition'
};

function focusables(within) {
  return Array.from(within.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])'))
    .filter(el => !el.disabled && el.offsetParent !== null);
}

export function createShell({
  shell, surfaces, actions, settings, ended, howto, currentStatus, canvas,
  runner: runnerArg, audio, persistence, onBestChange
}) {
  let state = 'title';
  let settingsOrigin = 'title';
  let invoker = null;
  let howtoOpen = false;
  let persistedBest = persistence.bestScore;
  let runner = runnerArg;
  const log = [];

  function rebindRunner(next) {
    runner = next;
    // Clock discipline starts at bind time: the boot state is title, and
    // no real time may tick outside the running state.
    if (state !== 'running') runner.pauseClock();
  }

  function logPush(entry) {
    log.push(entry);
  }

  function label(text) {
    if (currentStatus.textContent !== text) currentStatus.textContent = text;
  }

  function render() {
    shell.setAttribute('data-vv-state', state);
    shell.setAttribute('data-vv-howto', howtoOpen ? 'open' : 'closed');
    label(state);
    // Action bar belongs to the running state only; dialogs own the
    // keyboard everywhere else.
    const barVisible = state === 'running';
    actions.bar.setAttribute('data-vv-bar', barVisible ? 'visible' : 'hidden');
    const surfaceFor = state === 'title'
      ? (howtoOpen ? surfaces.howto : surfaces.title)
      : state === 'paused' ? surfaces.paused
        : state === 'settings' ? surfaces.settings
          : state === 'ended' ? surfaces.ended
            : null;
    setActiveSurface(surfaceFor);
  }

  function setState(next, { cueName = CUE_FOR_STATE_ENTRY[next] } = {}) {
    state = next;
    render();
    if (cueName) cue(cueName);
  }

  function focusFirstControl(surface) {
    const items = focusables(surface);
    if (items.length > 0) items[0].focus();
  }

  function cue(name) {
    audio.play(name);
  }

  function setActiveSurface(surface) {
    for (const el of Object.values(surfaces)) {
      el.setAttribute('data-vv-active', el === surface ? 'true' : 'false');
    }
  }

  // --- Lifecycle transitions ---

  function startRun() {
    if (state !== 'title') return;
    logPush('start');
    invoker = null;
    runner.resumeClock();
    setState('running', { cueName: 'activate' });
    canvas.focus();
  }

  function pause({ source } = {}) {
    // Blur or an explicit pause request while running enters paused once.
    if (state !== 'running') return;
    logPush('pause');
    invoker = source instanceof Element ? source : (document.activeElement instanceof Element ? document.activeElement : canvas);
    runner.dispatch({ type: 'left-up' });
    runner.dispatch({ type: 'right-up' });
    runner.dispatch({ type: 'fire-up' });
    runner.dispatch({ type: 'pause' });
    runner.pauseClock();
    setState('paused');
    focusFirstControl(surfaces.paused);
  }

  function resume({ via } = {}) {
    if (state !== 'paused') return;
    logPush(via === 'escape' ? 'resume-escape' : 'resume');
    runner.dispatch({ type: 'pause' });
    runner.resumeClock();
    setState('running', { cueName: 'resume' });
    if (invoker instanceof Element && document.contains(invoker)) invoker.focus();
    else canvas.focus();
    invoker = null;
  }

  function openSettings(from) {
    if (state !== 'title' && state !== 'paused') return;
    logPush('settings-open');
    settingsOrigin = state;
    invoker = document.activeElement instanceof Element ? document.activeElement : null;
    setState('settings');
    focusFirstControl(surfaces.settings);
  }

  function closeSettings({ viaEscape = false } = {}) {
    if (state !== 'settings') return;
    logPush(viaEscape ? 'settings-close-escape' : 'settings-close');
    setState(settingsOrigin);
    if (invoker instanceof Element && document.contains(invoker)) invoker.focus();
    invoker = null;
  }

  function newRun(from) {
    if (state !== 'ended' && state !== 'paused') return;
    logPush(from === 'ended' ? 'new-run' : 'restart-from-pause');
    runner.reset(1);
    runner.resumeClock();
    setState('running', { cueName: 'confirm' });
    canvas.focus();
  }

  function returnToTitle() {
    if (state !== 'ended' && state !== 'paused') return;
    logPush('return-to-title');
    runner.reset(1);
    runner.pauseClock();
    setState('title');
    focusFirstControl(surfaces.title);
  }

  function openHowto() {
    if (state !== 'title' || howtoOpen) return;
    logPush('howto-open');
    howtoOpen = true;
    invoker = document.activeElement instanceof Element ? document.activeElement : null;
    render();
    cue('transition');
    focusFirstControl(surfaces.howto);
  }

  function closeHowto({ viaEscape = false } = {}) {
    if (!howtoOpen) return;
    logPush(viaEscape ? 'howto-close-escape' : 'howto-close');
    howtoOpen = false;
    render();
    cue(viaEscape ? 'cancel' : 'confirm');
    if (invoker instanceof Element && document.contains(invoker)) invoker.focus();
    invoker = null;
  }

  function enterEnded(snapshot) {
    if (state !== 'running') return;
    logPush(`run-ended:${snapshot.outcome}`);
    runner.pauseClock();
    if (snapshot.score > persistedBest) {
      persistedBest = snapshot.score;
      persistence.persistPatch({ bestScore: persistedBest });
      if (typeof onBestChange === 'function') onBestChange(persistedBest);
    }
    ended.outcome.textContent = snapshot.outcome === 'wave-complete' ? 'Wave Complete' : 'Game Over';
    ended.score.textContent = String(snapshot.score);
    ended.kills.textContent = String(snapshot.kills);
    setState('ended');
    focusFirstControl(surfaces.ended);
  }

  // --- Settings model ---

  function applyMotionPreference(motion) {
    if (motion === 'system') document.documentElement.removeAttribute('data-vv-motion');
    else document.documentElement.setAttribute('data-vv-motion', motion);
    for (const key of Object.keys(settings.motion)) {
      const btn = settings.motion[key];
      btn.setAttribute('aria-pressed', prefs.motion === key ? 'true' : 'false');
    }
  }

  const prefs = { ...persistence.preferences };
  let motionInitialized = false;

  function refreshSettingsControls() {
    settings.mute.setAttribute('aria-pressed', prefs.muted ? 'true' : 'false');
    settings.volume.value = String(prefs.volume);
    settings.volumeValue.textContent = String(prefs.volume);
    applyMotionPreference(prefs.motion);
  }

  function activateTab(name) {
    for (const key of Object.keys(settings.tabs)) {
      const tab = settings.tabs[key];
      const selected = key === name;
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.setAttribute('tabindex', selected ? '0' : '-1');
      settings.panels[key].setAttribute('data-vv-panel', selected ? 'active' : 'hidden');
    }
  }

  function selectTab(name) {
    logPush(`tab:${name}`);
    cue('toggle');
    activateTab(name);
    settings.tabs[name].focus();
  }

  function setMuted(next) {
    prefs.muted = next;
    audio.setMuted(next);
    persistence.persistPatch({ preferences: prefs });
    settings.mute.setAttribute('aria-pressed', next ? 'true' : 'false');
    logPush(next ? 'mute' : 'unmute');
    cue('toggle');
  }

  function setVolume(value) {
    const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
    prefs.volume = v;
    audio.setVolume(v);
    persistence.persistPatch({ preferences: prefs });
    settings.volumeValue.textContent = String(v);
    logPush(`volume:${v}`);
    cue('toggle');
  }

  function setMotion(key) {
    if (!['system', 'reduced', 'full'].includes(key)) return;
    prefs.motion = key;
    applyMotionPreference(key);
    persistence.persistPatch({ preferences: prefs });
    logPush(`motion:${key}`);
    cue('toggle');
  }

  function resetDefaults() {
    prefs.muted = DEFAULT_PREFERENCES.muted;
    prefs.volume = DEFAULT_PREFERENCES.volume;
    prefs.motion = DEFAULT_PREFERENCES.motion;
    audio.setMuted(prefs.muted);
    audio.setVolume(prefs.volume);
    applyMotionPreference(prefs.motion);
    refreshSettingsControls();
    persistence.persistPatch({ preferences: prefs });
    logPush('reset-defaults');
    cue('confirm');
  }

  // --- Keyboard: containment and Escape safety ---

  function onShellKeydown(ev) {
    const active = shell.getAttribute('data-vv-state');
    if (active === '' || active === 'running') return;

    if (ev.key === 'Tab') {
      const surface = state === 'settings'
        ? surfaces.settings
        : state === 'paused' ? surfaces.paused
          : state === 'ended' ? surfaces.ended
            : howtoOpen ? surfaces.howto : surfaces.title;
      const items = focusables(surface);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (ev.shiftKey && document.activeElement === first) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && document.activeElement === last) {
        ev.preventDefault();
        first.focus();
      } else if (!document.activeElement || !surface.contains(document.activeElement)) {
        ev.preventDefault();
        first.focus();
      }
      return;
    }

    if (ev.key === 'Escape') {
      if (state === 'settings') {
        ev.preventDefault();
        // Stop the consumed key from reaching the window input adapter,
        // which would otherwise see the freshly restored canvas focus and
        // act on the same event.
        ev.stopPropagation();
        closeSettings({ viaEscape: true });
      } else if (howtoOpen) {
        ev.preventDefault();
        ev.stopPropagation();
        closeHowto({ viaEscape: true });
      } else if (state === 'paused') {
        ev.preventDefault();
        ev.stopPropagation();
        resume({ via: 'escape' });
      }
      return;
    }

    if ((ev.key === 'p' || ev.key === 'P') && state === 'paused' && !howtoOpen) {
      ev.preventDefault();
      ev.stopPropagation();
      resume({ via: 'key' });
    }
  }

  // --- Snapshot observation (called on every publish) ---

  function observeSnapshot(snapshot) {
    if (snapshot.outcome && state === 'running') {
      enterEnded(snapshot);
    }
  }

  // --- Wiring ---

  actions.pause.addEventListener('click', () => pause({ source: actions.pause }));
  actions.restart.addEventListener('click', () => {
    if (state !== 'running') return;
    logPush('restart');
    runner.reset(1);
    runner.resumeClock();
    cue('confirm');
    canvas.focus();
  });

  actions.title.start.addEventListener('click', startRun);
  actions.title.settings.addEventListener('click', () => openSettings(state));
  actions.title.howto.addEventListener('click', openHowto);

  actions.paused.resume.addEventListener('click', () => resume({ via: 'button' }));
  actions.paused.settings.addEventListener('click', () => openSettings(state));
  actions.paused.restart.addEventListener('click', () => newRun('paused'));
  actions.paused.returnTitle.addEventListener('click', returnToTitle);

  actions.ended.newRun.addEventListener('click', () => newRun('ended'));
  actions.ended.returnTitle.addEventListener('click', returnToTitle);

  howto.close.addEventListener('click', () => closeHowto({ viaEscape: false }));

  settings.close.addEventListener('click', () => closeSettings({ viaEscape: false }));
  settings.reset.addEventListener('click', resetDefaults);
  settings.mute.addEventListener('click', () => setMuted(!prefs.muted));
  settings.volume.addEventListener('change', () => setVolume(settings.volume.value));
  settings.volume.addEventListener('input', () => {
    settings.volumeValue.textContent = settings.volume.value;
  });
  for (const key of Object.keys(settings.motion)) {
    settings.motion[key].addEventListener('click', () => setMotion(key));
  }
  for (const key of Object.keys(settings.tabs)) {
    const tab = settings.tabs[key];
    tab.addEventListener('click', () => selectTab(key));
    tab.addEventListener('keydown', (ev) => {
      const order = Object.keys(settings.tabs);
      const at = order.indexOf(key);
      let next = null;
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') next = order[(at + 1) % order.length];
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') next = order[(at - 1 + order.length) % order.length];
      else if (ev.key === 'Home') next = order[0];
      else if (ev.key === 'End') next = order[order.length - 1];
      if (next) {
        ev.preventDefault();
        selectTab(next);
      }
    });
  }

  shell.addEventListener('keydown', onShellKeydown);

  // --- Init ---
  audio.setMuted(prefs.muted);
  audio.setVolume(prefs.volume);
  applyMotionPreference(prefs.motion);
  activateTab('audio');
  refreshSettingsControls();
  render();

  return {
    observeSnapshot,
    pause,
    resume,
    rebindRunner,
    getState: () => state,
    getLog: () => log.slice(),
    getBest: () => persistedBest,
    isHowtoOpen: () => howtoOpen
  };
}
