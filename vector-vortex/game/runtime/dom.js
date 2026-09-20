// Vector Vortex HUD binder (Spec 02 deliverable 2, trimmed in Spec 03:
// gate 1 removed the wide horizontal time bar; gate 2 removed the hit-rate
// readout with the superseded bonus scoring). Binds the HUD to core
// snapshots through one adapter. Pure projection: NO computation of score,
// collision, timing, or outcome. Values come from the snapshot.

export function createDom({
  score, best, lives, kills,
  pauseButton, restartButton, bestProvider
}) {
  const last = {};
  const lifeGlyphs = lives ? Array.from(lives.querySelectorAll('.vv-life')) : [];

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
    if (lives) {
      setIfChanged('lives', v => {
        lifeGlyphs.forEach((glyph, i) => {
          glyph.classList.toggle('vv-life--spent', i >= v);
        });
        lives.setAttribute('aria-label', `Lives: ${v}`);
      }, snapshot.lives);
    }
    setIfChanged('kills', v => { kills.textContent = v; }, String(snapshot.kills ?? 0));
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
