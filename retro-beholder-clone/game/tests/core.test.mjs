import assert from 'node:assert/strict';

import {
  DUNGEON_MAP,
  getCell,
  getDecorationsInView,
  isBackdropTriggered,
  isWalkable,
} from '../js/map-data.js';
import {
  createPlayer,
  directionVector,
  movePlayer,
  turnPlayer,
} from '../js/grid-movement.js';

const player = createPlayer(DUNGEON_MAP.spawn);

assert.deepEqual(player, { x: 4, y: 2, facing: 'S' });
assert.deepEqual(directionVector('S'), { x: 0, y: 1 });
assert.equal(isWalkable(DUNGEON_MAP, 4, 4), true);
assert.equal(isWalkable(DUNGEON_MAP, 4, 5), true);
assert.equal(isWalkable(DUNGEON_MAP, 0, 0), false);
assert.equal(isWalkable(DUNGEON_MAP, -1, 2), false);
assert.equal(getCell(DUNGEON_MAP, 4, 2), '.');

const movedForward = movePlayer(DUNGEON_MAP, player, 'forward', 0);
assert.deepEqual(movedForward.player, { x: 4, y: 3, facing: 'S' });
assert.equal(movedForward.moved, true);
assert.equal(movedForward.nextAvailableAt, 180);

const blocked = movePlayer(DUNGEON_MAP, { x: 1, y: 1, facing: 'N' }, 'forward', 200);
assert.deepEqual(blocked.player, { x: 1, y: 1, facing: 'N' });
assert.equal(blocked.moved, false);

const strafed = movePlayer(DUNGEON_MAP, { x: 4, y: 2, facing: 'S' }, 'strafeLeft', 200);
assert.deepEqual(strafed.player, { x: 5, y: 2, facing: 'S' });

assert.deepEqual(turnPlayer(player, 'left'), { x: 4, y: 2, facing: 'E' });
assert.deepEqual(turnPlayer(player, 'right'), { x: 4, y: 2, facing: 'W' });

const roomProps = getDecorationsInView(DUNGEON_MAP, { x: 4, y: 2, facing: 'N' });
assert.equal(roomProps.length >= 5, true);
assert.equal(roomProps.some((prop) => prop.asset === 'torchWall'), true);

assert.equal(
  isBackdropTriggered(DUNGEON_MAP, { x: 4, y: 13, facing: 'N' }),
  true,
);
assert.equal(
  isBackdropTriggered(DUNGEON_MAP, { x: 4, y: 13, facing: 'S' }),
  false,
);

console.log('core tests passed');
