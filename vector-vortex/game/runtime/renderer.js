// Vector Vortex Canvas 2D renderer (Spec 03 Tempest identity slice).
// One outer save/restore per frame, plus one save/restore per lane rail and
// per entity. Composed transform must be identical on frame 1 and frame 30
// at DPR 2.
//
// Perspective (Spec 03 Frozen Presentation Contract): the playfield is a
// tube seen from one end. The rim is projected twice, a near rim at the
// viewer and a far rim, smaller and offset toward a vanishing point that
// sits above centre, with one lane rail drawn between corresponding lane
// vertices. An entity at normalized depth d interpolates between its
// near-rim and far-rim lane position: depth 0 is the player rim, depth 1 is
// the far end.
//
// Colour (Spec 03): per-entity colour, not one accent. The playfield
// interior stays black; every entity kind carries its own hue. Web and
// inactive-rail tints are mixes of the single web hue toward black, so the
// web remains one hue.

const LANE_COUNT = 24;

// Per-entity palette. Exported so validations assert rendered pixels
// against the same values the renderer uses, never against copies.
export const PALETTE = {
  field: '#000000',      // playfield interior: black
  web: '#2f47ff',        // the web: one hue (rims, active rail)
  webDim: '#141d59',     // inactive rails: the web hue sunk toward black
  player: '#ffd21f',     // the player claw
  enemy: '#ff3bd4',      // the basic enemy
  playerShot: '#3cff6e', // player shots
  enemyShot: '#f0f0f0'   // enemy shots
};

// Rendered-size floors (Spec 03): enemies and shots at the far end stay
// trackable rather than vanishing into the vanishing point.
export const MIN_ENTITY_RADIUS_PX = 4;
export const MIN_SHOT_LENGTH_PX = 4;
export const MIN_STROKE_PX = 1;

// Entity scale at depth 1 before floors apply.
const FAR_SCALE = 0.24;
// Unscaled entity geometry at depth 0, in pixels.
const ENEMY_RADIUS_PX = 11;
const SHOT_LENGTH_PX = 16;
const ENEMY_SHOT_LENGTH_PX = 12;
const SHOT_WIDTH_PX = 3;

export function laneAngle(lane) {
  // Lane 0 is top, increasing clockwise. Angle 0 is the top (-y) direction.
  return (lane / LANE_COUNT) * Math.PI * 2 - Math.PI / 2;
}

// Pure projection layout for a canvas of width x height. The near rim
// fills the viewport; the far rim sits near the web's centre, smaller and
// offset toward a vanishing point above screen centre, so the web reads as
// a tube the player looks down into. The vanishing point stays strictly
// inside the near rim: distance(vanishing, nearCenter) + farRadius <=
// nearRadius at every supported viewport.
export function projectionLayout(width, height) {
  const nearRadius = Math.max(24, Math.min(width * 0.44, height * 0.4));
  const nearCenter = { x: width / 2, y: height * 0.55 };
  const vanishing = { x: width / 2, y: height * 0.4 };
  const farRadius = Math.max(8, nearRadius * 0.18);
  return { width, height, nearCenter, nearRadius, vanishing, farRadius };
}

// A lane vertex on the near or far rim.
export function rimVertex(layout, lane, rim) {
  const a = laneAngle(lane);
  const center = rim === 'near' ? layout.nearCenter : layout.vanishing;
  const radius = rim === 'near' ? layout.nearRadius : layout.farRadius;
  return { x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius };
}

// An entity at normalized depth d renders by interpolating between its
// near-rim and far-rim lane position. Depth 1 is the far rim, depth 0 the
// player rim.
export function projectLanePoint(layout, lane, depth) {
  const d = Math.max(0, Math.min(1, depth));
  const near = rimVertex(layout, lane, 'near');
  const far = rimVertex(layout, lane, 'far');
  return { x: near.x + (far.x - near.x) * d, y: near.y + (far.y - near.y) * d };
}

// Linear depth scale toward the far end. Floors are applied by the
// per-entity helpers below, never by this function.
export function scaleAtDepth(depth) {
  const d = Math.max(0, Math.min(1, depth));
  return 1 + (FAR_SCALE - 1) * d;
}

export function entityRadiusAt(depth) {
  return Math.max(MIN_ENTITY_RADIUS_PX, ENEMY_RADIUS_PX * scaleAtDepth(depth));
}

export function shotLengthAt(depth) {
  return Math.max(MIN_SHOT_LENGTH_PX, SHOT_LENGTH_PX * scaleAtDepth(depth));
}

export function enemyShotLengthAt(depth) {
  return Math.max(MIN_SHOT_LENGTH_PX, ENEMY_SHOT_LENGTH_PX * scaleAtDepth(depth));
}

export function strokeWidthAt(basePx, depth) {
  return Math.max(MIN_STROKE_PX, basePx * scaleAtDepth(depth));
}

// Unit vector along a lane axis pointing toward the far end.
function laneAxis(layout, lane) {
  const near = rimVertex(layout, lane, 'near');
  const far = rimVertex(layout, lane, 'far');
  const dx = far.x - near.x;
  const dy = far.y - near.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

export function createRenderer({ canvas }) {
  const ctx = canvas.getContext('2d');
  let cssWidth = 0;
  let cssHeight = 0;
  let dpr = 1;
  const lastCounters = { saveCount: 0, restoreCount: 0 };

  // Destruction fragments (Spec 03 gate 2): the dying entity's own edges
  // detach, each segment rotating on its own axis and drifting outward
  // along its lane's depth vector, fading over roughly twenty ticks.
  // Renderer-only: fragments never touch the simulation.
  const FRAGMENT_LIFE_MS = 20 * (1000 / 60);
  const fragments = [];
  let flashFrames = 0;
  let lastRenderTs = null;

  // Sprite effects (Spec 03 gate 3): shipped raster effect sprites drawn
  // additively for fire, hit, and destruction. Renderer-only cosmetics.
  const SPRITE_LIFE_MS = 220;
  const sprites = {};
  const spriteEffects = [];

  function setSprites(next) {
    Object.assign(sprites, next);
  }

  function spawnSprite(kind, lane, depth) {
    const img = sprites[kind];
    if (!img || !img.complete || !img.naturalWidth) return;
    const L = projectionLayout(cssWidth, cssHeight);
    const p = projectLanePoint(L, lane, depth);
    spriteEffects.push({
      img,
      x: p.x,
      y: p.y,
      size: kind === 'fire' ? L.nearRadius * 0.1 : L.nearRadius * 0.22,
      age: 0
    });
  }

  function stepSprites(dt) {
    for (let i = spriteEffects.length - 1; i >= 0; i--) {
      spriteEffects[i].age += dt;
      if (spriteEffects[i].age >= SPRITE_LIFE_MS) spriteEffects.splice(i, 1);
    }
  }

  function drawSprites() {
    if (spriteEffects.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of spriteEffects) {
      const alpha = Math.max(0, 1 - s.age / SPRITE_LIFE_MS);
      ctx.globalAlpha = alpha;
      ctx.drawImage(s.img, s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
    }
    ctx.restore();
  }

  function spawnFragments(lane, depth) {
    if (typeof window !== 'undefined' && window.__vv && window.__vv.disableFragments === true) return;
    const L = projectionLayout(cssWidth, cssHeight);
    const p = projectLanePoint(L, lane, depth);
    const axis = laneAxis(L, lane);
    const r = entityRadiusAt(depth);
    // The enemy diamond's four edges detach as individual segments.
    const corners = [
      { x: 0, y: -r }, { x: r, y: 0 }, { x: 0, y: r }, { x: -r, y: 0 }
    ];
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i];
      const b = corners[(i + 1) % corners.length];
      fragments.push({
        cx: p.x,
        cy: p.y,
        ax: a.x,
        ay: a.y,
        bx: b.x,
        by: b.y,
        rot: 0,
        rotVel: (Math.random() - 0.5) * 0.02,
        dist: 0,
        distVel: 0.5 + Math.random() * 0.5,
        dirX: -axis.x,
        dirY: -axis.y,
        age: 0
      });
    }
  }

  function flashPlayer() {
    flashFrames = 12;
  }

  function stepFragments(dt) {
    for (let i = fragments.length - 1; i >= 0; i--) {
      const f = fragments[i];
      f.age += dt;
      if (f.age >= FRAGMENT_LIFE_MS) { fragments.splice(i, 1); continue; }
      f.rot += f.rotVel * dt;
      f.dist += f.distVel * dt;
      f.cx += f.dirX * f.distVel * dt * 0.25;
      f.cy += f.dirY * f.distVel * dt * 0.25;
    }
  }

  function drawFragments() {
    if (fragments.length === 0) return;
    ctx.save();
    ctx.strokeStyle = PALETTE.enemy;
    ctx.lineCap = 'round';
    for (const f of fragments) {
      const alpha = Math.max(0, 1 - f.age / FRAGMENT_LIFE_MS);
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.5;
      const cos = Math.cos(f.rot);
      const sin = Math.sin(f.rot);
      const ax = f.cx + (f.ax * cos - f.ay * sin);
      const ay = f.cy + (f.ax * sin + f.ay * cos);
      const bx = f.cx + (f.bx * cos - f.by * sin);
      const by = f.cy + (f.bx * sin + f.by * cos);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    ctx.restore();
  }

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

  function drawShot(snapshotShot, layout, color, lengthAt) {
    const p = projectLanePoint(layout, snapshotShot.lane, snapshotShot.depth);
    const axis = laneAxis(layout, snapshotShot.lane);
    const len = lengthAt(snapshotShot.depth);
    const tail = { x: p.x - axis.x * len, y: p.y - axis.y * len };
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidthAt(SHOT_WIDTH_PX, snapshotShot.depth);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.restore();
  }

  function render(snapshot) {
    // Fragment lifetime runs on wall-clock frame deltas; the first frame
    // carries no delta. Cosmetics only: never touches the snapshot.
    const now = (typeof performance !== 'undefined') ? performance.now() : 0;
    const dt = lastRenderTs === null ? 0 : Math.min(100, now - lastRenderTs);
    lastRenderTs = now;
    stepFragments(dt);
    stepSprites(dt);
    if (flashFrames > 0) flashFrames -= 1;

    let saveCount = 0;
    let restoreCount = 0;
    let dropOneRestore = false;
    if (typeof window !== 'undefined' && window.__vv && window.__vv.skipOneRestore === true) {
      dropOneRestore = true;
    }

    const L = projectionLayout(cssWidth, cssHeight);

    // One outer save/restore: DPR + clear to the black playfield.
    ctx.save();
    saveCount++;
    ctx.fillStyle = PALETTE.field;
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    // Far rim: smaller, offset toward the vanishing point above centre.
    ctx.save();
    saveCount++;
    ctx.strokeStyle = PALETTE.web;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(L.vanishing.x, L.vanishing.y, L.farRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    restoreCount++;

    // Lane rails — one save/restore per lane (so the test can prove balance).
    for (let lane = 0; lane < LANE_COUNT; lane++) {
      ctx.save();
      saveCount++;
      const active = lane === snapshot.lane;
      ctx.strokeStyle = active ? PALETTE.web : PALETTE.webDim;
      ctx.lineWidth = active ? 1.5 : 1;
      const near = rimVertex(L, lane, 'near');
      const far = rimVertex(L, lane, 'far');
      ctx.beginPath();
      ctx.moveTo(near.x, near.y);
      ctx.lineTo(far.x, far.y);
      ctx.stroke();
      if (dropOneRestore && lane === 0) {
        // Skip one matching restore on the first lane to unbalance the stack.
        dropOneRestore = false;
        continue;
      }
      ctx.restore();
      restoreCount++;
    }

    // Near rim at the viewer.
    ctx.save();
    saveCount++;
    ctx.strokeStyle = PALETTE.web;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(L.nearCenter.x, L.nearCenter.y, L.nearRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    restoreCount++;

    // Enemy shots: dashes along the lane axis, travelling toward the rim.
    for (const s of snapshot.enemyShots || []) {
      ctx.save();
      saveCount++;
      drawShot(s, L, PALETTE.enemyShot, enemyShotLengthAt);
      ctx.restore();
      restoreCount++;
    }

    // Enemies: closed angular diamonds, scaled with depth and floored.
    for (const en of snapshot.enemies || []) {
      const p = projectLanePoint(L, en.lane, en.depth);
      const r = entityRadiusAt(en.depth);
      ctx.save();
      saveCount++;
      ctx.strokeStyle = PALETTE.enemy;
      ctx.lineWidth = strokeWidthAt(2, en.depth);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - r);
      ctx.lineTo(p.x + r, p.y);
      ctx.lineTo(p.x, p.y + r);
      ctx.lineTo(p.x - r, p.y);
      ctx.closePath();
      ctx.stroke();
      // Inner cross keeps the form angular and readable at far depth.
      ctx.beginPath();
      ctx.moveTo(p.x - r, p.y);
      ctx.lineTo(p.x + r, p.y);
      ctx.moveTo(p.x, p.y - r);
      ctx.lineTo(p.x, p.y + r);
      ctx.stroke();
      ctx.restore();
      restoreCount++;
    }

    // Player shots: short bright dashes along the lane axis.
    for (const sh of snapshot.shots || []) {
      ctx.save();
      saveCount++;
      drawShot(sh, L, PALETTE.playerShot, shotLengthAt);
      ctx.restore();
      restoreCount++;
    }

    // Player claw: a wide open chevron straddling its lane on the rim,
    // opening toward the far end. A player hit flashes it white on the
    // frames immediately after the resolving tick.
    ctx.save();
    saveCount++;
    {
      const near = rimVertex(L, snapshot.lane, 'near');
      const axis = laneAxis(L, snapshot.lane);
      const perp = { x: -axis.y, y: axis.x };
      const legLen = L.nearRadius * 0.16;
      const halfWidth = L.nearRadius * 0.09;
      const apex = { x: near.x - axis.x * 4, y: near.y - axis.y * 4 };
      const leg1 = {
        x: apex.x + axis.x * legLen + perp.x * halfWidth,
        y: apex.y + axis.y * legLen + perp.y * halfWidth
      };
      const leg2 = {
        x: apex.x + axis.x * legLen - perp.x * halfWidth,
        y: apex.y + axis.y * legLen - perp.y * halfWidth
      };
      ctx.strokeStyle = flashFrames > 0 ? PALETTE.enemyShot : PALETTE.player;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(leg1.x, leg1.y);
      ctx.lineTo(apex.x, apex.y);
      ctx.lineTo(leg2.x, leg2.y);
      ctx.stroke();
    }
    ctx.restore();
    restoreCount++;

    // Destruction fragments beneath the outer restore, so the balanced
    // save/restore contract holds.
    ctx.save();
    saveCount++;
    drawFragments();
    drawSprites();
    ctx.restore();
    restoreCount++;

    ctx.restore();
    restoreCount++;

    lastCounters.saveCount = saveCount;
    lastCounters.restoreCount = restoreCount;
  }

  return { render, resize, getKeyCounters, spawnFragments, flashPlayer, setSprites, spawnSprite };
}
