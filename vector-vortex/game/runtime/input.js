// Vector Vortex input adapter.
// Attaches to window; never calls preventDefault on Space at the window level.
// When focus is on the game surface (canvas root), handled game keys are consumed.
// When focus is on a button (pause/restart), Space's default button activation is left alone.

const LEFT_KEYS = new Set(['ArrowLeft', 'a', 'A']);
const RIGHT_KEYS = new Set(['ArrowRight', 'd', 'D']);
const FIRE_KEYS = new Set([' ', 'Space', 'Spacebar']);
const PAUSE_KEYS = new Set(['Escape', 'p', 'P']);

function isGameSurfaceFocused(gameSurface) {
  const active = document.activeElement;
  if (!active) return false;
  if (!gameSurface.contains(active)) return false;
  return true;
}

export function createInputAdapter({ gameSurface, pauseButton, restartButton, dispatch, onBlur, onVisibility }) {
  let destroyed = false;

  function keydown(ev) {
    if (destroyed) return;
    if (window.__vv && window.__vv.disableKeydown === true) return;
    const key = ev.key;

    const isLeft = LEFT_KEYS.has(key);
    const isRight = RIGHT_KEYS.has(key);
    const isFire = FIRE_KEYS.has(key);
    const isPause = PAUSE_KEYS.has(key);

    if (!isLeft && !isRight && !isFire && !isPause) return;

    // Space at window level is NEVER preventDefaulted in this adapter.
    // We use the explicit mutation toggle to opt into preventing it (the
    // space-on-button test sets this and expects button activation to fail).
    if (isFire && (window.__vv && window.__vv.preventSpaceAtWindow === true)) {
      ev.preventDefault();
    }

    // For non-space handled keys, prevent default only when the game surface
    // itself holds focus. This lets Tab, browser shortcuts, and other
    // unhandled keys flow through normally.
    if (!isFire && isGameSurfaceFocused(gameSurface)) {
      ev.preventDefault();
    }

    if (isLeft) dispatch({ type: 'left-down' });
    else if (isRight) dispatch({ type: 'right-down' });
    else if (isFire) dispatch({ type: 'fire-down' });
    else if (isPause) dispatch({ type: 'pause' });
  }

  function keyup(ev) {
    if (destroyed) return;
    if (window.__vv && window.__vv.disableKeydown === true) return;
    const key = ev.key;
    if (LEFT_KEYS.has(key)) dispatch({ type: 'left-up' });
    else if (RIGHT_KEYS.has(key)) dispatch({ type: 'right-up' });
    else if (FIRE_KEYS.has(key)) dispatch({ type: 'fire-up' });
  }

  function clearHeldInput() {
    dispatch({ type: 'left-up' });
    dispatch({ type: 'right-up' });
    dispatch({ type: 'fire-up' });
  }

  function onWindowBlur() {
    clearHeldInput();
    if (typeof onBlur === 'function') onBlur();
  }

  function onVisibility() {
    if (document.visibilityState === 'hidden') {
      clearHeldInput();
      if (typeof onVisibility === 'function') onVisibility();
    }
  }

  function onPauseClick(ev) {
    // When the test mutation is on, preventDefault was called on the keydown
    // event for Space, which would normally suppress the button's synthesized
    // click. However, a real mouse click on the button is still valid; this
    // handler dispatches the action either way. We deliberately do NOT gate
    // the click handler on preventSpaceAtWindow so a real mouse click still
    // pauses. The mutation test relies on the keydown default suppression
    // not producing a click in the first place (Chromium honors
    // preventDefault on Space for buttons).
    ev.preventDefault();
    dispatch({ type: 'pause' });
    if (gameSurface && typeof gameSurface.focus === 'function') {
      // Keep focus on the canvas so keyboard movement works post-pause.
      gameSurface.focus();
    }
  }

  function onRestartClick(ev) {
    ev.preventDefault();
    dispatch({ type: 'restart' });
    if (gameSurface && typeof gameSurface.focus === 'function') {
      gameSurface.focus();
    }
  }

  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', onWindowBlur);
  document.addEventListener('visibilitychange', onVisibility);
  if (pauseButton) pauseButton.addEventListener('click', onPauseClick);
  if (restartButton) restartButton.addEventListener('click', onRestartClick);

  function destroy() {
    destroyed = true;
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    window.removeEventListener('blur', onWindowBlur);
    document.removeEventListener('visibilitychange', onVisibility);
    if (pauseButton) pauseButton.removeEventListener('click', onPauseClick);
    if (restartButton) restartButton.removeEventListener('click', onRestartClick);
  }

  return { destroy, clearHeldInput };
}
