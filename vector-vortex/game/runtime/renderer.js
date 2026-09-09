// Vector Vortex Canvas 2D renderer.
// One outer save/restore per frame, plus one save/restore per lane rail.
// Composed transform must be identical on frame 1 and frame 30 at DPR 2.

const LANE_COUNT = 24;

function laneToAngle(lane) {
  // Lane 0 is top, increasing clockwise. Angle 0 is the top (-y) direction.
  return (lane / LANE_COUNT) * Math.PI * 2 - Math.PI / 2;
}

function polar(cx, cy, radius, angle) {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius
  };
}

export function createRenderer({ canvas }) {
  const ctx = canvas.getContext('2d');
  let cssWidth = 0;
  let cssHeight = 0;
  let dpr = 1;
  const lastCounters = { saveCount: 0, restoreCount: 0 };

  function resize() {
    const rect = canvas.getBoundingClientRect();
    cssWidth = Math.max(1, Math.floor(rect.width));
    cssHeight = Math.max(1, Math.floor(rect.height));
    dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function getKeyCounters() {
    return { ...lastCounters };
  }

  function render(snapshot) {
    let saveCount = 0;
    let restoreCount = 0;
    let dropOneRestore = false;
    if (typeof window !== 'undefined' && window.__vv && window.__vv.skipOneRestore === true) {
      dropOneRestore = true;
    }

    // One outer save/restore: DPR + clear
    ctx.save();
    saveCount++;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    const cx = cssWidth / 2;
    const cy = cssHeight / 2;
    const padding = 12;
    const maxR = Math.max(8, Math.min(cssWidth, cssHeight) / 2 - padding);
    const rimR = maxR;
    const farR = maxR * 0.45;

    // Tube rings
    ctx.strokeStyle = '#3a6ea5';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rimR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, farR, 0, Math.PI * 2);
    ctx.stroke();

    // Lane rails — one save/restore per lane (so the test can prove balance).
    ctx.lineWidth = 1;
    let laneIndex = 0;
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      ctx.save();
      saveCount++;
      ctx.strokeStyle = lane === snapshot.lane ? '#ffd166' : '#1f3550';
      const angle = laneToAngle(lane);
      const inner = polar(cx, cy, rimR, angle);
      const outer = polar(cx, cy, farR, angle);
      ctx.beginPath();
      ctx.moveTo(inner.x, inner.y);
      ctx.lineTo(outer.x, outer.y);
      ctx.stroke();
      if (dropOneRestore && laneIndex === 0) {
        // Skip one matching restore on the first lane to unbalance the stack.
        dropOneRestore = false;
        laneIndex++;
        continue;
      }
      laneIndex++;
      ctx.restore();
      restoreCount++;
    }

    // Player marker on the rim at the current lane
    const pAngle = laneToAngle(snapshot.lane);
    const pOuter = polar(cx, cy, rimR + 4, pAngle);
    const pL = polar(cx, cy, rimR - 10, pAngle - 0.18);
    const pR = polar(cx, cy, rimR - 10, pAngle + 0.18);
    ctx.save();
    saveCount++;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(pOuter.x, pOuter.y);
    ctx.lineTo(pL.x, pL.y);
    ctx.lineTo(pR.x, pR.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    restoreCount++;

    // Shots: small inward-pointing arrows at (lane, depth)
    for (const sh of snapshot.shots || []) {
      const t = 1 - Math.max(0, Math.min(1, sh.depth));
      const r = farR + (rimR - farR) * t;
      const a = laneToAngle(sh.lane);
      const tip = polar(cx, cy, r - 6, a);
      const base1 = polar(cx, cy, r + 4, a - 0.05);
      const base2 = polar(cx, cy, r + 4, a + 0.05);
      ctx.save();
      saveCount++;
      ctx.strokeStyle = '#59c0ff';
      ctx.fillStyle = '#59c0ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(base1.x, base1.y);
      ctx.lineTo(base2.x, base2.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      restoreCount++;
    }

    // Enemies: outward-pointing chevrons at (lane, depth).
    // Depth contract: depth 1 is the far end (spawn), depth 0 is the player
    // rim (breach). The mapping must invert t so depth=1 renders at farR and
    // depth=0 renders at rimR. The previous code mapped depth=1 to rimR,
    // which is backwards.
    for (const en of snapshot.enemies || []) {
      const depthT = 1 - Math.max(0, Math.min(1, en.depth));
      const r = farR + (rimR - farR) * depthT;
      const a = laneToAngle(en.lane);
      const tip = polar(cx, cy, Math.max(2, r + 8), a);
      const b1 = polar(cx, cy, Math.max(2, r - 6), a - 0.18);
      const b2 = polar(cx, cy, Math.max(2, r - 6), a + 0.18);
      ctx.save();
      saveCount++;
      ctx.strokeStyle = '#ff5d6c';
      ctx.fillStyle = '#ff5d6c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(b1.x, b1.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      restoreCount++;
    }

    ctx.restore();
    restoreCount++;

    lastCounters.saveCount = saveCount;
    lastCounters.restoreCount = restoreCount;
  }

  return { render, resize, getKeyCounters };
}
