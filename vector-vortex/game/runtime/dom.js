// Vector Vortex DOM projector.
// Pure projection of the core snapshot to the semantic DOM surface.
// NO computation of score, time, accuracy, or outcome.

function pad2(n) { return n < 10 ? '0' + n : String(n); }

function formatTime(elapsedTicks) {
  const totalSeconds = Math.floor(elapsedTicks / 60);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${pad2(mm)}:${pad2(ss)}`;
}

function formatAccuracy(hits, shotsSpawned) {
  if (!shotsSpawned || shotsSpawned === 0) return 'ACC --';
  const pct = Math.round((hits / shotsSpawned) * 100);
  return `${pct}%`;
}

function formatStatus(snapshot) {
  if (snapshot.paused) return 'paused';
  if (snapshot.outcome === 'survived') return 'survived';
  if (snapshot.outcome === 'lost') return 'lost';
  return 'running';
}

export function createDom({ root, status, score, lives, time, kills, accuracy, currentStatus, pauseButton, restartButton, viewportWarning }) {
  let lastProjectedKills = null;

  function project(snapshot) {
    score.textContent = String(snapshot.score);
    lives.textContent = String(snapshot.lives);
    time.textContent = formatTime(snapshot.elapsedTicks);
    if (snapshot.kills === undefined || snapshot.kills === null) {
      // Projection of the snapshot's kills counter. The core is the writer;
      // if a mutation removed kills from the snapshot, the DOM projects 0.
      kills.textContent = '0';
    } else {
      kills.textContent = String(snapshot.kills);
    }
    lastProjectedKills = kills.textContent;
    accuracy.textContent = formatAccuracy(snapshot.hits, snapshot.shotsSpawned);
    currentStatus.textContent = formatStatus(snapshot);

    if (pauseButton) {
      pauseButton.textContent = snapshot.paused ? 'Resume' : 'Pause';
    }
    if (restartButton) {
      restartButton.disabled = snapshot.outcome == null;
    }
  }

  function setVisibleMessage(text) {
    if (viewportWarning) {
      if (text) {
        viewportWarning.hidden = false;
        viewportWarning.textContent = text;
      } else {
        viewportWarning.hidden = true;
      }
    }
  }

  function getLastProjectedKills() {
    return lastProjectedKills;
  }

  return { project, setVisibleMessage, getLastProjectedKills };
}
