import { loadManifest } from './assets.js';
import { DUNGEON_MAP, isWalkable } from './map-data.js';
import { createPlayer, movePlayer, turnPlayer } from './grid-movement.js';
import { DungeonViewport } from './viewport-renderer.js';
import { DebugMinimap } from './minimap.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    loadManifest(this);
  }

  create() {
    this.player = createPlayer(DUNGEON_MAP.spawn);
    this.nextInputAt = 0;
    this.minimapVisible = true;

    this.viewport = new DungeonViewport(this, DUNGEON_MAP);
    this.minimap = new DebugMinimap(this, DUNGEON_MAP);

    this.keys = this.input.keyboard.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      q: Phaser.Input.Keyboard.KeyCodes.Q,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      m: Phaser.Input.Keyboard.KeyCodes.M,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    });

    this.redraw();
  }

  update(time) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.m)) {
      this.minimapVisible = !this.minimapVisible;
      this.minimap.setVisible(this.minimapVisible);
    }

    if (time < this.nextInputAt) {
      return;
    }

    const action = this.readAction();
    if (!action) {
      return;
    }

    if (action.kind === 'turn') {
      this.player = turnPlayer(this.player, action.direction);
      this.nextInputAt = time + 160;
      this.redraw();
      return;
    }

    const result = movePlayer(DUNGEON_MAP, this.player, action.direction, time, isWalkable);
    this.player = result.player;
    this.nextInputAt = result.nextAvailableAt;
    this.redraw();
  }

  readAction() {
    if (this.keys.q.isDown) {
      return { kind: 'turn', direction: 'left' };
    }
    if (this.keys.e.isDown) {
      return { kind: 'turn', direction: 'right' };
    }
    if (this.keys.w.isDown || this.keys.up.isDown) {
      return { kind: 'move', direction: 'forward' };
    }
    if (this.keys.s.isDown || this.keys.down.isDown) {
      return { kind: 'move', direction: 'back' };
    }
    if (this.keys.a.isDown || this.keys.left.isDown) {
      return { kind: 'move', direction: 'strafeLeft' };
    }
    if (this.keys.d.isDown || this.keys.right.isDown) {
      return { kind: 'move', direction: 'strafeRight' };
    }

    return null;
  }

  redraw() {
    this.viewport.render(this.player);
    this.minimap.render(this.player);
  }
}
