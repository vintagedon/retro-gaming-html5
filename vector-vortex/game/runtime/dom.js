// Vector Vortex HUD binder (Spec 02 deliverable 2).
// Binds the frozen HUD to core snapshots through one adapter. Pure
// projection: NO computation of score, accuracy, collision, timing, or
// outcome. Values come from the snapshot (including the core's read-only
// remainingTicks projection) and from core-owned constants imported here
// for presentation normalization only (meter fraction, mm:ss text).

import { RUN_LENGTH_TICKS, FINAL_MINUTE_TICKS, TICK_HZ } from '../core/core.js';

function formatRemaining(remainingTicks) {
  // Presentation normalization of the core-owned tick budget into mm:ss.
  const totalSeconds = Math.floor(remainingTicks / TICK_HZ);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  const pad = n => n < 10 ? '0' + n : String(n);
  return `${pad(mm)}:${pad(ss)}`;
}

function formatAccuracy(snapshot) {
  // The core computes the percent (or null before the first shot); the HUD
  // only concatenates the frozen readout format.
  if (snapshot.accuracyPercent === null || snapshot.accuracyPercent === undefined) {
    return 'ACC --';
  }
  return `ACC ${snapshot.accuracyPercent}%`;
}

export function createDom({
  score, best, meter, meterText, lives, kills, accuracy,
  pauseButton, restartButton, bestProvider
}) {
  const last = {};
  const lifeGlyphs = lives ? Array.from(lives.querySelectorAll('.vv-life')) : [];

  if (meter) {
    meter.setAttribute('role', 'meter');
    meter.setAttribute('aria-valuemin', '0');
    meter.setAttribute('aria-valuemax', String(RUN_LENGTH_TICKS));
  }

  function setIfChanged(key, apply, value) {
    if (last[key] === value) return;
    last[key] = value;
    apply(value);
  }

  function project(snapshot) {
    setIfChanged('score', v => { score.textContent = v; }, String(snapshot.score));
    if (best) {
      setIfChanged('best', v => { best.textContent = v; }, String(bestProvider()));
    }
    if (meter) {
      // Meter fraction: presentation normalization of the core-owned
      // remainingTicks projection. Warning role at the core-owned final
      // minute threshold, inclusive.
      const fraction = snapshot.remainingTicks / RUN_LENGTH_TICKS;
      setIfChanged('meterValue', v => { meter.style.setProperty('--gc-meter-value', v); }, `${fraction * 100}%`);
      setIfChanged(
        'meterWarning',
        warn => { meter.classList.toggle('vv-meter--warning', warn); },
        snapshot.remainingTicks <= FINAL_MINUTE_TICKS
      );
      setIfChanged('meterNow', v => { meter.setAttribute('aria-valuenow', v); }, String(snapshot.remainingTicks));
      const text = `${formatRemaining(snapshot.remainingTicks)} remaining`;
      setIfChanged('meterText', v => {
        meterText.textContent = v;
        meter.setAttribute('aria-valuetext', v);
      }, text);
    }
    if (lives) {
      setIfChanged('lives', v => {
        lifeGlyphs.forEach((glyph, i) => {
          glyph.classList.toggle('vv-life--spent', i >= v);
        });
        lives.setAttribute('aria-label', `Lives: ${v}`);
      }, snapshot.lives);
    }
    setIfChanged('kills', v => { kills.textContent = v; }, String(snapshot.kills ?? 0));
    setIfChanged('accuracy', v => { accuracy.textContent = v; }, formatAccuracy(snapshot));
    // The paused/status label is the shell state mirror and is owned by the
    // shell (Spec 02 deliverable 3), not by the snapshot projection.

    if (pauseButton) {
      const label = snapshot.paused ? 'Resume' : 'Pause';
      setIfChanged('pauseLabel', v => { pauseButton.textContent = v; }, label);
    }
    if (restartButton) {
      const disabled = snapshot.outcome == null;
      setIfChanged('restartDisabled', v => { restartButton.disabled = v; }, disabled);
    }
  }

  return { project };
}
