const DIRECTIONS = ['N', 'E', 'S', 'W'];
const MOVE_COOLDOWN_MS = 180;

export function createPlayer(spawn) {
  return { x: spawn.x, y: spawn.y, facing: spawn.facing };
}

export function directionVector(facing) {
  switch (facing) {
    case 'N':
      return { x: 0, y: -1 };
    case 'E':
      return { x: 1, y: 0 };
    case 'S':
      return { x: 0, y: 1 };
    case 'W':
      return { x: -1, y: 0 };
    default:
      throw new Error(`Unknown facing: ${facing}`);
  }
}

export function turnPlayer(player, turn) {
  const current = DIRECTIONS.indexOf(player.facing);
  const delta = turn === 'left' ? -1 : 1;
  const facing = DIRECTIONS[(current + delta + DIRECTIONS.length) % DIRECTIONS.length];
  return { ...player, facing };
}

export function movePlayer(map, player, action, now, isWalkableFn = null) {
  const walkable = isWalkableFn ?? ((dungeonMap, x, y) => dungeonMap.rows[y]?.[x] === '.');
  const vector = movementVector(player.facing, action);
  const target = { x: player.x + vector.x, y: player.y + vector.y };

  if (!walkable(map, target.x, target.y)) {
    return { player, moved: false, nextAvailableAt: now + MOVE_COOLDOWN_MS };
  }

  return {
    player: { ...player, ...target },
    moved: true,
    nextAvailableAt: now + MOVE_COOLDOWN_MS,
  };
}

function movementVector(facing, action) {
  const forward = directionVector(facing);
  const right = { x: -forward.y, y: forward.x };

  switch (action) {
    case 'forward':
      return forward;
    case 'back':
      return { x: -forward.x, y: -forward.y };
    case 'strafeLeft':
      return { x: -right.x, y: -right.y };
    case 'strafeRight':
      return right;
    default:
      throw new Error(`Unknown movement action: ${action}`);
  }
}
