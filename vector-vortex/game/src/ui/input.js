/**
 * Input Adapter for Vector Vortex.
 *
 * Normalizes Keyboard events to authoritative action flags:
 * - left: ArrowLeft or 'a' / 'A'
 * - right: ArrowRight or 'd' / 'D'
 * - fire: ' ' (Space)
 * - pause: Escape or 'p' / 'P'
 *
 * Clears held state on blur, visibilitychange, pause, restart, and outcome.
 * Prevents default only for handled game keys while the game surface is active;
 * never traps Tab or browser shortcuts.
 */
export class InputAdapter {
  constructor(options = {}) {
    this.onPauseToggle = options.onPauseToggle || (() => {});
    this.held = {
      left: false,
      right: false,
      fire: false,
    };
    this.isActive = true;

    this.bindEvents();
  }

  bindEvents() {
    this.handleKeyDown = (e) => {
      // Never trap Tab or system keys (Ctrl, Alt, Meta)
      if (e.key === 'Tab' || e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.held.left = true;
        e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.held.right = true;
        e.preventDefault();
      } else if (e.key === ' ') {
        this.held.fire = true;
        e.preventDefault();
      } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        this.onPauseToggle();
      }
    };

    this.handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.held.left = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.held.right = false;
      } else if (e.key === ' ') {
        this.held.fire = false;
      }
    };

    this.handleBlur = () => {
      this.clearHeld();
    };

    this.handleVisibilityChange = () => {
      if (document.hidden) {
        this.clearHeld();
      }
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  clearHeld() {
    this.held.left = false;
    this.held.right = false;
    this.held.fire = false;
  }

  poll() {
    return {
      left: this.held.left,
      right: this.held.right,
      fire: this.held.fire,
    };
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}
