// Vector Vortex DOM projector.
// Pure projection of the core snapshot to the semantic DOM surface.
// NO computation of score, time, accuracy, outcome, or any rules value.
// The core computes accuracyDisplay and the projector copies it verbatim.

function formatTime(elapsedTicks) {
  // The core owns the elapsed-tick model; the projector only formats the
  // already-elapsed integer for display. This is presentation, not rules.
  const totalSeconds = Math.floor(elapsedTicks / 60);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  const pad = n => n < 10 ? '0' + n : String(n);
  return `${pad(mm)}:${pad(ss)}`;
}

function formatStatus(snapshot) {
  if (snapshot.paused) return 'paused';
  if (snapshot.outcome === 'survived') return 'survived';
  if (snapshot.outcome === 'lost') return 'lost';
  return 'running';
}

export function createDom({ root, status, score, lives, time, kills, accuracy, currentStatus, pauseButton, restartButton, viewportWarning }) {
  let lastProjectedKills = null;
  let lastProjectedAccuracy = null;
  let lastProjectedTime = null;
  let lastProjectedStatus = null;
  let lastProjectedCurrentStatus = null;
  let lastProjectedScore = null;
  let lastProjectedLives = null;

  function project(snapshot) {
    if (String(snapshot.score) !== lastProjectedScore) {
      score.textContent = String(snapshot.score);
      lastProjectedScore = String(snapshot.score);
    }
    if (String(snapshot.lives) !== lastProjectedLives) {
      lives.textContent = String(snapshot.lives);
      lastProjectedLives = String(snapshot.lives);
    }
    const timeStr = formatTime(snapshot.elapsedTicks);
    if (timeStr !== lastProjectedTime) {
      time.textContent = timeStr;
      lastProjectedTime = timeStr;
    }
    const killsStr = String(snapshot.kills ?? 0);
    if (killsStr !== lastProjectedKills) {
      kills.textContent = killsStr;
      lastProjectedKills = killsStr;
    }
    if (snapshot.accuracyDisplay !== undefined && snapshot.accuracyDisplay !== lastProjectedAccuracy) {
      accuracy.textContent = snapshot.accuracyDisplay;
      lastProjectedAccuracy = snapshot.accuracyDisplay;
    }
    const statusStr = formatStatus(snapshot);
    if (statusStr !== lastProjectedCurrentStatus) {
      currentStatus.textContent = statusStr;
      lastProjectedCurrentStatus = statusStr;
    }

    if (pauseButton) {
      const label = snapshot.paused ? 'Resume' : 'Pause';
      if (pauseButton.textContent !== label) pauseButton.textContent = label;
    }
    if (restartButton) {
      const disabled = snapshot.outcome == null;
      if (restartButton.disabled !== disabled) restartButton.disabled = disabled;
    }
  }

  function setVisibleMessage(text) {
    if (viewportWarning) {
      // D2.7: toggle a class rather than the [hidden] attribute, because
      // the sub-960 media rule sets `display: block` which the user-agent
      // `[hidden] { display: none }` rule overrides regardless of class.
      if (text) {
        viewportWarning.classList.add('visible');
        viewportWarning.textContent = text;
      } else {
        viewportWarning.classList.remove('visible');
      }
    }
  }

  function getLastProjectedKills() {
    return lastProjectedKills;
  }

  return { project, setVisibleMessage, getLastProjectedKills };
}