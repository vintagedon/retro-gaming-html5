import {
  getDecorationsInView,
  getCell,
  isBackdropTriggered,
  toViewSpace,
} from './map-data.js';
import { directionVector } from './grid-movement.js';

const WIDTH = 1280;
const HEIGHT = 720;
const CENTER_X = WIDTH / 2;
const HORIZON_Y = 318;

const PANELS = {
  frontNear: { x: CENTER_X, y: 358, width: 690, height: 430, texture: 'wallPrimary' },
  frontFar: { x: CENTER_X, y: 332, width: 390, height: 250, texture: 'wallSecondary' },
  leftNear: { x: 150, y: 360, width: 300, height: 470, texture: 'sideWall', tint: 0x8d7a62 },
  rightNear: { x: 1130, y: 360, width: 300, height: 470, texture: 'sideWall', tint: 0x8d7a62 },
  leftFar: { x: 365, y: 344, width: 180, height: 270, texture: 'sideWall', tint: 0x6e6257 },
  rightFar: { x: 915, y: 344, width: 180, height: 270, texture: 'sideWall', tint: 0x6e6257 },
};

export class DungeonViewport {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.container = scene.add.container(0, 0);
  }

  render(player) {
    this.container.removeAll(true);

    if (isBackdropTriggered(this.map, player)) {
      this.drawBackdrop();
      return;
    }

    this.drawRoomShell();
    this.drawWallPanels(player);
    this.drawDecorations(player);
    this.drawFrame(player);
  }

  drawBackdrop() {
    const backdrop = this.scene.add.image(CENTER_X, HEIGHT / 2, 'throneRoom');
    backdrop.setDisplaySize(WIDTH, HEIGHT);
    this.container.add(backdrop);
  }

  drawRoomShell() {
    const graphics = this.scene.add.graphics();

    graphics.fillGradientStyle(0x141414, 0x17110d, 0x090a0b, 0x0b0b0c, 1);
    graphics.fillRect(0, 0, WIDTH, HORIZON_Y);

    graphics.fillGradientStyle(0x15100c, 0x15100c, 0x37302a, 0x25201b, 1);
    graphics.fillRect(0, HORIZON_Y, WIDTH, HEIGHT - HORIZON_Y);

    graphics.lineStyle(3, 0x514632, 1);
    graphics.lineBetween(0, HORIZON_Y, WIDTH, HORIZON_Y);
    graphics.lineStyle(1, 0x2b261f, 1);
    graphics.lineBetween(210, HEIGHT, 515, HORIZON_Y);
    graphics.lineBetween(1070, HEIGHT, 765, HORIZON_Y);
    graphics.lineBetween(0, HEIGHT, 400, HORIZON_Y);
    graphics.lineBetween(WIDTH, HEIGHT, 880, HORIZON_Y);

    this.container.add(graphics);
  }

  drawWallPanels(player) {
    const forwardOne = sampleRelative(this.map, player, 0, 1);
    const forwardTwo = sampleRelative(this.map, player, 0, 2);

    this.drawSidePanel(player, -1, 1, PANELS.leftNear);
    this.drawSidePanel(player, 1, 1, PANELS.rightNear);
    this.drawSidePanel(player, -1, 2, PANELS.leftFar);
    this.drawSidePanel(player, 1, 2, PANELS.rightFar);

    if (forwardOne === '#') {
      this.addPanel(PANELS.frontNear);
    } else if (forwardTwo === '#') {
      this.addPanel(PANELS.frontFar);
    } else {
      this.drawDepthGate();
    }
  }

  drawSidePanel(player, right, depth, panel) {
    if (sampleRelative(this.map, player, right, depth) !== '#') {
      return;
    }

    this.addPanel(panel);
  }

  addPanel(panel) {
    const image = this.scene.add.image(panel.x, panel.y, panel.texture);
    image.setDisplaySize(panel.width, panel.height);
    image.setTint(panel.tint ?? 0xffffff);
    this.container.add(image);

    const outline = this.scene.add.rectangle(panel.x, panel.y, panel.width, panel.height);
    outline.setStrokeStyle(2, 0x17110c, 0.65);
    this.container.add(outline);
  }

  drawDepthGate() {
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(2, 0x73684e, 0.75);
    graphics.strokeRect(455, 225, 370, 245);
    graphics.lineStyle(1, 0x2f2b24, 0.8);
    graphics.strokeRect(515, 270, 250, 155);
    this.container.add(graphics);
  }

  drawDecorations(player) {
    for (const decoration of getDecorationsInView(this.map, player)) {
      const sprite = this.createDecorationSprite(decoration);
      if (sprite) {
        this.container.add(sprite);
      }
    }
  }

  createDecorationSprite(decoration) {
    const depth = Math.max(1, decoration.view.forward + 1);
    const horizontal = decoration.view.right * (245 / depth);
    const size = decoration.mount === 'wall' ? 92 / depth : 124 / depth;
    const y = decoration.mount === 'wall' ? HORIZON_Y - 54 / depth : 555 - decoration.view.forward * 74;

    const sprite = this.scene.add.image(CENTER_X + horizontal, y, decoration.asset);
    sprite.setOrigin(0.5, decoration.mount === 'floor' ? 1 : 0.5);
    sprite.setDisplaySize(size, size);
    sprite.setDepth(20 - decoration.view.forward);
    return sprite;
  }

  drawFrame(player) {
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(10, 0x0a0806, 1);
    graphics.strokeRect(5, 5, WIDTH - 10, HEIGHT - 10);
    graphics.lineStyle(2, 0xc9a34d, 0.9);
    graphics.strokeRect(18, 18, WIDTH - 36, HEIGHT - 36);
    graphics.lineStyle(1, 0x745d35, 0.9);
    graphics.strokeRect(26, 26, WIDTH - 52, HEIGHT - 52);

    const label = this.scene.add.text(38, 34, `Grid ${player.x},${player.y}  Facing ${player.facing}`, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#d8c89a',
      backgroundColor: '#00000088',
      padding: { x: 6, y: 4 },
    });

    this.container.add([graphics, label]);
  }
}

function sampleRelative(map, player, right, forward) {
  const f = directionVector(player.facing);
  const r = { x: -f.y, y: f.x };
  return getCell(map, player.x + r.x * right + f.x * forward, player.y + r.y * right + f.y * forward);
}
