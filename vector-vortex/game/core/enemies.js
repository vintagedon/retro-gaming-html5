export const CRAWLER_SPEED = 0.0015;
export const CRAWLER_HP = 1;
export const CRAWLER_SCORE = 100;

export function spawnCrawler(state, lane, id) {
  return {
    ...state,
    enemies: [...state.enemies, { id, lane, depth: 1, hp: CRAWLER_HP }],
    nextEnemyId: Math.max(state.nextEnemyId ?? id + 1, id + 1)
  };
}

export function advanceEnemies(state) {
  return {
    ...state,
    enemies: state.enemies.map(e => ({ ...e, depth: e.depth - CRAWLER_SPEED }))
  };
}

export function advanceEnemiesWithDepth(state) {
  const enemies = state.enemies.map(e => {
    const next = e.depth - CRAWLER_SPEED;
    return { ...e, prev: e.depth, next, depth: next };
  });
  return { state: { ...state, enemies }, enemies };
}

export function resolveRimBreaches(state) {
  const breaching = state.enemies
    .filter(e => e.depth <= 0)
    .slice()
    .sort((a, b) => a.id - b.id);
  const remaining = state.enemies.filter(e => e.depth > 0);
  return {
    ...state,
    enemies: remaining,
    breaches: [...(state.breaches ?? []), ...breaching]
  };
}