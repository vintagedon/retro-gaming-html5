import { CONSTANTS } from '../core/constants.js';

/**
 * Procedural Vector Tube Renderer for Vector Vortex.
 * Renders circular 24-lane tube, player claw, shots, and crawling enemies.
 */
export class VectorRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.width = 0;
    this.height = 0;
  }

  /**
   * Resize canvas backing store with device pixel ratio.
   * @param {number} cssWidth
   * @param {number} cssHeight
   * @param {number} [dpr=1]
   */
  resize(cssWidth, cssHeight, dpr = window.devicePixelRatio || 1) {
    this.dpr = dpr;
    this.width = cssWidth;
    this.height = cssHeight;

    this.canvas.width = Math.floor(cssWidth * dpr);
    this.canvas.height = Math.floor(cssHeight * dpr);
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
  }

  /**
   * Converts (lane, depth) to screen (x, y) coordinates.
   * Normalized depth: 0 at rim, 1 at center.
   * @param {number} lane 0..23
   * @param {number} depth 0..1
   * @returns {{x: number, y: number, angle: number}}
   */
  getPoint(lane, depth) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const minDim = Math.min(this.width, this.height);

    const rimRadius = minDim * 0.42;
    const centerRadius = minDim * 0.06;

    // Linear radius interpolation from depth 0 (rim) to depth 1 (center)
    const r = rimRadius - depth * (rimRadius - centerRadius);

    // 24 lanes: angle for lane boundary i is i * (2*PI / 24) - PI/2 (starting from top)
    // Lane center is at lane + 0.5
    const angle = ((lane + 0.5) / CONSTANTS.LANE_COUNT) * Math.PI * 2 - Math.PI / 2;

    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;

    return { x, y, angle, r, cx, cy, rimRadius, centerRadius };
  }

  /**
   * Get the rail boundary angle for lane boundary index 0..24
   * @param {number} index
   * @returns {number}
   */
  getRailAngle(index) {
    return (index / CONSTANTS.LANE_COUNT) * Math.PI * 2 - Math.PI / 2;
  }

  /**
   * Renders a snapshot from the simulation core.
   * @param {Object} snapshot
   */
  render(snapshot) {
    const ctx = this.ctx;
    if (!ctx) return;

    // Save and apply DPR transform
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Clear background: deep near-black void (#050810)
    ctx.fillStyle = '#050810';
    ctx.fillRect(0, 0, this.width, this.height);

    const cx = this.width / 2;
    const cy = this.height / 2;
    const minDim = Math.min(this.width, this.height);
    const rimRadius = minDim * 0.42;
    const centerRadius = minDim * 0.06;

    // Draw Rails and Rings (Cyan wireframe: #00e5ff)
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.lineWidth = 1.5;

    // 1. Concentric Depth Rings (e.g. 5 rings)
    const ringSteps = 5;
    for (let i = 0; i <= ringSteps; i++) {
      const d = i / ringSteps;
      const r = rimRadius - d * (rimRadius - centerRadius);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. 24 Longitudinal Lane Rails
    for (let i = 0; i < CONSTANTS.LANE_COUNT; i++) {
      const angle = this.getRailAngle(i);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(cx + cosA * rimRadius, cy + sinA * rimRadius);
      ctx.lineTo(cx + cosA * centerRadius, cy + sinA * centerRadius);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Highlight Player Lane on Rim
    const playerLane = snapshot.playerLane;
    const a1 = this.getRailAngle(playerLane);
    const a2 = this.getRailAngle((playerLane + 1) % CONSTANTS.LANE_COUNT);

    ctx.save();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, rimRadius, a1, a2);
    ctx.stroke();

    // Draw Player Claw Marker at rim (depth 0)
    const pPt = this.getPoint(playerLane, 0);
    const clawAngle = pPt.angle;
    const clawWidth = (rimRadius * Math.PI * 2) / CONSTANTS.LANE_COUNT * 0.7;

    ctx.save();
    ctx.translate(pPt.x, pPt.y);
    ctx.rotate(clawAngle + Math.PI / 2);

    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#00e5ff';
    ctx.lineWidth = 2;

    // Draw V-shaped chevron / claw pointing inward toward center
    ctx.beginPath();
    ctx.moveTo(-clawWidth / 2, -6);
    ctx.lineTo(0, 10); // Pointing inward
    ctx.lineTo(clawWidth / 2, -6);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();

    // 4. Draw Shots (Amber/White pulses moving inward)
    ctx.save();
    ctx.fillStyle = '#ffea00';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    for (const shot of snapshot.shots) {
      const pt = this.getPoint(shot.lane, shot.depth);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // 5. Draw Enemies / Crawlers (Amber/Orange wireframe diamonds)
    ctx.save();
    ctx.strokeStyle = '#ff9100';
    ctx.fillStyle = '#ff3d00';
    ctx.lineWidth = 2;

    for (const enemy of snapshot.enemies) {
      const pt = this.getPoint(enemy.lane, enemy.depth);
      const sz = 6 + (1 - enemy.depth) * 8; // Grows larger as it approaches rim

      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.angle);

      // Diamond crawler geometry
      ctx.beginPath();
      ctx.moveTo(-sz, 0);
      ctx.lineTo(0, sz);
      ctx.lineTo(sz, 0);
      ctx.lineTo(0, -sz);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    // Restore root DPR context
    ctx.restore();
  }
}
