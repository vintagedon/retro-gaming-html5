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
  // 01c gate 1: the focus gate must NOT accept DOM controls inside the
  // game container (pause/restart buttons). Only the canvas surface
  // itself — the element with the wireframe renderer — counts as the
  // game surface. Without this exclusion, holding Space on the Pause
  // button fires shots and arrow keys on Restart move the player.
  if (active.tagName !== 'CANVAS') return false;
  return true;
}

// D2.4: when focus is on the game surface, fire/move/pause dispatch normally.
// When focus is on a DOM control (e.g. pause/restart button), browser native
// activation handles the key, and our dispatch is gated so Space activates
// the button without firing and arrow keys on the button do not move the
// player. The mutation toggle window.__vv.disableFocusGate re-enables
// dispatch regardless of focus for the named mutation test.
function focusGateOpen() {
  if (typeof window !== 'undefined' && window.__vv && window.__vv.disableFocusGate === true) {
    return true;
  }
  return false;
}

export function createInputAdapter({ gameSurface, dispatch, onBlur, onVisibility, onPauseKey }) {
  let destroyed = false;

  function keydown(ev) {
    if (destroyed) return;
    if (window.__vv && window.__vv.disableInputAdapter === true) return;
    if (window.__vv && window.__vv.disableKeydown === true) return;
    // Closing correction (Spec 01 review): ignore key auto-repeat for
    // every gameplay key, not only pause. Held movement and fire persist
    // through the core's held flags, set once by the initial keydown, so
    // repeats add nothing while a key is legitimately held. But a pause
    // clears held input, and an auto-repeat keydown from a key still
    // physically down would re-set the flag after resume, restarting the
    // action without a fresh press and violating the 01c pause contract.
    if (ev.repeat) return;
    const key = ev.key;

    const isLeft = LEFT_KEYS.has(key);
    const isRight = RIGHT_KEYS.has(key);
    const isFire = FIRE_KEYS.has(key);
    const isPause = PAUSE_KEYS.has(key);

    if (!isLeft && !isRight && !isFire && !isPause) return;

    // D2.4: gate movement, fire, and pause dispatch on the game surface
    // holding focus, so Space on the pause button activates it without
    // firing and arrow keys on the restart button do not move the player.
    const focused = focusGateOpen() || isGameSurfaceFocused(gameSurface);

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

    if (isLeft) { if (focused) dispatch({ type: 'left-down' }); }
    else if (isRight) { if (focused) dispatch({ type: 'right-down' }); }
    else if (isFire) { if (focused) dispatch({ type: 'fire-down' }); }
    else if (isPause) {
      if (focused) {
        // Spec 02: the pause key routes through the shell, which clears
        // held input, pauses the core and clock, and opens the pause
        // surface with focus containment. The old direct pause dispatch
        // and canvas refocus are superseded by the shell's focus flow.
        if (typeof onPauseKey === 'function') onPauseKey();
      }
    }
  }

  function keyup(ev) {
    if (destroyed) return;
    if (window.__vv && window.__vv.disableInputAdapter === true) return;
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
    if (window.__vv && window.__vv.disableInputAdapter === true) return;
    clearHeldInput();
    if (typeof onBlur === 'function') onBlur();
  }

  function onWindowFocus() {
    if (window.__vv && window.__vv.disableInputAdapter === true) return;
    dispatch({ type: 'resume-blur' });
  }

  function onVisibilityChange() {
    if (window.__vv && window.__vv.disableInputAdapter === true) return;
    if (document.visibilityState === 'hidden') {
      clearHeldInput();
      if (typeof onVisibility === 'function') onVisibility({ type: 'visibility', hidden: true });
    } else {
      // 01c gate 1: on becoming visible, dispatch the visibility action so
      // the runner's clock resumes. Without this, after a hidden interval
      // the clock stays stopped until a separate window focus event.
      if (typeof onVisibility === 'function') onVisibility({ type: 'visibility', hidden: false });
    }
  }

  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', onWindowBlur);
  window.addEventListener('focus', onWindowFocus);
  document.addEventListener('visibilitychange', onVisibilityChange);

  function destroy() {
    destroyed = true;
    window.removeEventListener('keydown', keydown);
    window.removeEventListener('keyup', keyup);
    window.removeEventListener('blur', onWindowBlur);
    window.removeEventListener('focus', onWindowFocus);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }

  return { destroy, clearHeldInput };
}
