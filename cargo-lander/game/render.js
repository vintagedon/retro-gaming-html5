// Canvas playfield drawing. All art is procedural: geometry from the
// snapshot, decorative variation derived deterministically from the run
// seed and elapsed ticks. No assets, no random, no time reads.
const WORLD_WIDTH = 1920;
const BOTTOM_MARGIN = 30;

const PALETTE = {
  space: '#04070d',
  star: '#9fb8dd',
  ground: '#58f5c8',
  groundFill: 'rgba(88, 245, 200, 0.06)',
  pad: '#ffd166',
  craft: '#d7e6ff',
  flame: '#ffb347',
  wreck: '#ff5d5d',
  ring: '#58f5c8'
};

function seedHash(seed, index) {
  let h = (seed ^ (index * 0x9e3779b9)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

function drawStars(ctx, snapshot, logicalW, logicalH) {
  const count = 90;
  for (let i = 0; i < count; i += 1) {
    const h = seedHash(snapshot.seed, i);
    const x = ((h & 0xffff) / 0xffff) * logicalW;
    const y = (((h >>> 16) & 0x0fff) / 0x0fff) * (logicalH * 0.86);
    const size = 1 + ((h >>> 28) & 1);
    const twinkle = ((h >>> 12) + snapshot.elapsedTicks) % 97 < 90 ? 1 : 0.35;
    ctx.globalAlpha = 0.25 + 0.6 * (((h >>> 8) & 0xff) / 255) * twinkle;
    ctx.fillStyle = PALETTE.star;
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;
}

function drawTerrain(ctx, snapshot, ppm, logicalW, logicalH) {
  const terrain = snapshot.terrain;
  const spacing = terrain.width / (terrain.points - 1);

  ctx.beginPath();
  ctx.moveTo(0, logicalH);
  for (let i = 0; i < terrain.points; i += 1) {
    const x = i * spacing * ppm;
    const y = logicalH - BOTTOM_MARGIN - terrain.heights[i] * ppm;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(logicalW, logicalH);
  ctx.closePath();
  ctx.fillStyle = PALETTE.groundFill;
  ctx.fill();
  ctx.strokeStyle = PALETTE.ground;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawPad(ctx, config, ppm, logicalH, elapsedTicks) {
  const half = config.landing.siteWidth / 2;
  const x0 = (config.landing.siteX - half) * ppm;
  const x1 = (config.landing.siteX + half) * ppm;
  const y = logicalH - BOTTOM_MARGIN;
  ctx.strokeStyle = PALETTE.pad;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();

  const blinkOn = Math.floor(elapsedTicks / 30) % 2 === 0;
  ctx.fillStyle = blinkOn ? PALETTE.pad : 'rgba(255, 209, 102, 0.25)';
  ctx.fillRect(x0 - 2, y - 10, 4, 10);
  ctx.fillRect(x1 - 2, y - 10, 4, 10);
}

function drawCraft(ctx, snapshot, ppm, toLogicalY) {
  const x = snapshot.x * ppm;
  const y = toLogicalY(snapshot.y);
  const scale = ppm * 14;

  ctx.save();
  ctx.translate(x, y);

  if (snapshot.craftState === 'destroyed') {
    const seed = seedHash(snapshot.seed, snapshot.elapsedTicks | 0);
    ctx.strokeStyle = PALETTE.wreck;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      const h = seedHash(seed, i);
      const a = ((h & 0xff) / 255) * Math.PI * 2;
      const len = scale * (0.4 + ((h >>> 8) & 0xff) / 255);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * len * 0.5, Math.sin(a) * len * 0.5);
      ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  ctx.rotate(-snapshot.angle);

  if (snapshot.thrustLevel > 0) {
    const flicker = 0.85 + 0.3 * ((snapshot.elapsedTicks % 4) / 3);
    const flame = scale * 0.9 * snapshot.thrustLevel * flicker;
    ctx.strokeStyle = PALETTE.flame;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-scale * 0.3, -scale * 0.55);
    ctx.lineTo(0, -scale * 0.55 - flame);
    ctx.lineTo(scale * 0.3, -scale * 0.55);
    ctx.stroke();
  }

  ctx.strokeStyle = PALETTE.craft;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, scale * 0.6);
  ctx.lineTo(-scale * 0.5, -scale * 0.5);
  ctx.lineTo(scale * 0.5, -scale * 0.5);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-scale * 0.4, -scale * 0.5);
  ctx.lineTo(-scale * 0.6, -scale * 0.9);
  ctx.moveTo(scale * 0.4, -scale * 0.5);
  ctx.lineTo(scale * 0.6, -scale * 0.9);
  ctx.stroke();

  ctx.restore();

  if (snapshot.craftState === 'landed') {
    const pulse = 1 + 0.12 * Math.sin(snapshot.elapsedTicks / 8);
    ctx.strokeStyle = PALETTE.ring;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, scale * 1.4 * pulse, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function createRenderer(canvas, config) {
  const ctx = canvas.getContext('2d');

  function draw(snapshot) {
    const backingW = canvas.width;
    const backingH = canvas.height;
    const logicalW = canvas.offsetWidth || backingW;
    const logicalH = canvas.offsetHeight || backingH;
    const k = backingW / logicalW;
    const ppm = logicalW / WORLD_WIDTH;
    const toLogicalY = (worldY) => logicalH - BOTTOM_MARGIN - worldY * ppm;

    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.fillStyle = PALETTE.space;
    ctx.fillRect(0, 0, logicalW, logicalH);

    drawStars(ctx, snapshot, logicalW, logicalH);
    drawTerrain(ctx, snapshot, ppm, logicalW, logicalH);
    drawPad(ctx, config, ppm, logicalH, snapshot.elapsedTicks);
    drawCraft(ctx, snapshot, ppm, toLogicalY);
  }

  return { draw };
}
