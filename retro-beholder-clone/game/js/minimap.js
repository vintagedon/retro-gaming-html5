export class DebugMinimap {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(100);
  }

  setVisible(visible) {
    this.graphics.setVisible(visible);
  }

  render(player) {
    const cell = 12;
    const left = 1044;
    const top = 40;
    const width = this.map.width * cell;
    const height = this.map.height * cell;

    this.graphics.clear();
    this.graphics.fillStyle(0x000000, 0.72);
    this.graphics.fillRect(left - 10, top - 10, width + 20, height + 20);
    this.graphics.lineStyle(1, 0xd8c89a, 0.9);
    this.graphics.strokeRect(left - 10, top - 10, width + 20, height + 20);

    for (let y = 0; y < this.map.height; y += 1) {
      for (let x = 0; x < this.map.width; x += 1) {
        if (this.map.rows[y][x] === '#') {
          this.graphics.fillStyle(0x514632, 1);
          this.graphics.fillRect(left + x * cell, top + y * cell, cell, cell);
        } else {
          this.graphics.lineStyle(1, 0x665f50, 0.4);
          this.graphics.strokeRect(left + x * cell, top + y * cell, cell, cell);
        }
      }
    }

    const px = left + player.x * cell + cell / 2;
    const py = top + player.y * cell + cell / 2;
    this.graphics.fillStyle(0xffd46b, 1);
    this.graphics.fillCircle(px, py, 4);

    const tip = facingTip(player.facing, px, py, cell);
    this.graphics.lineStyle(3, 0xffd46b, 1);
    this.graphics.lineBetween(px, py, tip.x, tip.y);
  }
}

function facingTip(facing, x, y, cell) {
  switch (facing) {
    case 'N':
      return { x, y: y - cell };
    case 'E':
      return { x: x + cell, y };
    case 'S':
      return { x, y: y + cell };
    case 'W':
      return { x: x - cell, y };
    default:
      return { x, y };
  }
}
