export const SURVIVAL_BONUS = 5000;

export function computeAccuracyPercent(hits, shotsSpawned) {
  if (shotsSpawned === 0) return { percent: null, display: 'ACC --' };
  const percent = Math.round((100 * hits) / shotsSpawned);
  return { percent, display: `${percent}%` };
}

export function computeAccuracyBonus(hits, shotsSpawned) {
  if (shotsSpawned === 0) return 0;
  return Math.round((2000 * hits) / shotsSpawned);
}