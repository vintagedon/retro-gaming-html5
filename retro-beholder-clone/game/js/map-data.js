export const DUNGEON_MAP = {
  width: 9,
  height: 16,
  rows: [
    '#########',
    '#.......#',
    '#.......#',
    '#.......#',
    '####.####',
    '####.####',
    '####.####',
    '##...####',
    '##.######',
    '##.######',
    '##.######',
    '##..#####',
    '#......##',
    '#......##',
    '#......##',
    '#########',
  ],
  spawn: { x: 4, y: 2, facing: 'S' },
  backdropTrigger: { x: 4, y: 13, facing: 'N', asset: 'throneRoom' },
  decorations: [
    { x: 2, y: 1, facing: 'S', asset: 'torchWall', mount: 'wall' },
    { x: 6, y: 1, facing: 'S', asset: 'chains', mount: 'wall' },
    { x: 3, y: 1, facing: 'S', asset: 'weaponRack', mount: 'wall' },
    { x: 5, y: 1, facing: 'S', asset: 'cobwebCorner', mount: 'wall' },
    { x: 2, y: 3, facing: 'N', asset: 'chest', mount: 'floor' },
    { x: 3, y: 3, facing: 'N', asset: 'barrelTall', mount: 'floor' },
    { x: 5, y: 3, facing: 'N', asset: 'crate', mount: 'floor' },
    { x: 6, y: 3, facing: 'N', asset: 'bonePile', mount: 'floor' },
    { x: 4, y: 1, facing: 'S', asset: 'brazier', mount: 'floor' },
    { x: 1, y: 3, facing: 'N', asset: 'barrel', mount: 'floor' },
  ],
};

export function getCell(map, x, y) {
  if (y < 0 || y >= map.height || x < 0 || x >= map.width) {
    return '#';
  }

  return map.rows[y][x];
}

export function isWalkable(map, x, y) {
  return getCell(map, x, y) === '.';
}

export function isBackdropTriggered(map, player) {
  const trigger = map.backdropTrigger;
  return player.x === trigger.x && player.y === trigger.y && player.facing === trigger.facing;
}

export function getDecorationsInView(map, player, maxDepth = 3) {
  return map.decorations
    .map((decoration) => ({
      ...decoration,
      view: toViewSpace(player, decoration),
    }))
    .filter((decoration) => {
      const { forward, right } = decoration.view;
      return forward >= 0 && forward <= maxDepth && Math.abs(right) <= 2;
    })
    .sort((a, b) => b.view.forward - a.view.forward);
}

export function toViewSpace(player, target) {
  const dx = target.x - player.x;
  const dy = target.y - player.y;

  switch (player.facing) {
    case 'N':
      return { forward: -dy, right: dx };
    case 'E':
      return { forward: dx, right: dy };
    case 'S':
      return { forward: dy, right: -dx };
    case 'W':
      return { forward: -dx, right: -dy };
    default:
      throw new Error(`Unknown facing: ${player.facing}`);
  }
}
