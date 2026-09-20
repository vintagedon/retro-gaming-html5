// Closed-interval overlap: [a0, a1] ∩ [b0, b1] non-empty.
// Endpoint contact counts.
export function intervalsOverlap(a0, a1, b0, b1) {
  const lo = Math.min(a0, a1);
  const hi = Math.max(a0, a1);
  const lo2 = Math.min(b0, b1);
  const hi2 = Math.max(b0, b1);
  return lo <= hi2 && lo2 <= hi;
}

// Resolve shot-enemy collisions on a tick.
// Each shot has prev/next depth (depth before and after advanceShots).
// Each enemy has prev/next depth (depth before and after advanceEnemies).
// A candidate exists when same lane AND swept intervals overlap.
// Candidates sorted ascending by enemy ID, then ascending by shot ID.
// First hit on each enemy wins; each shot dies on its first hit.
export function resolveCollisions(state) {
  const { shots, enemies, score, hits } = state;
  const candidates = [];
  for (const sh of shots) {
    for (const en of enemies) {
      if (sh.lane !== en.lane) continue;
      if (!intervalsOverlap(sh.prev, sh.next, en.prev, en.next)) continue;
      candidates.push({ enemyId: en.id, shotId: sh.id, lane: en.lane, depth: en.depth });
    }
  }
  candidates.sort((a, b) => a.enemyId - b.enemyId || a.shotId - b.shotId);

  const deadEnemies = new Set();
  const deadShots = new Set();
  const kills = [];
  for (const c of candidates) {
    if (deadEnemies.has(c.enemyId)) continue;
    if (deadShots.has(c.shotId)) continue;
    deadEnemies.add(c.enemyId);
    deadShots.add(c.shotId);
    kills.push({ enemyId: c.enemyId, shotId: c.shotId, lane: c.lane, depth: c.depth });
  }

  const newEnemies = enemies.filter(e => !deadEnemies.has(e.id));
  const newShots = shots.filter(s => !deadShots.has(s.id));
  return {
    kills,
    newEnemies,
    newShots,
    score: score + kills.length * 100,
    hits: hits + kills.length
  };
}