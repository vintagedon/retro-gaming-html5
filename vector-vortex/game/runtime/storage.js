// Vector Vortex defensive persistence adapter (Spec 02 deliverable 3).
// One versioned local key. Validate types and ranges, ignore unknown
// fields, fall back to defaults on missing, malformed, wrong-shape,
// out-of-range, quota, or security failures. A new best writes only after
// run-ended (the shell owns that rule); this module only reads, merges,
// and writes the owned shape.

const KEY = 'retrohtml5.vector-vortex.v1';
const VERSION = 1;
const MOTIONS = ['system', 'reduced', 'full'];

export const DEFAULT_PREFERENCES = Object.freeze({
  muted: false,
  volume: 80,
  motion: 'system'
});

export const STORAGE_KEY = KEY;

function defaultState() {
  return {
    version: VERSION,
    preferences: { ...DEFAULT_PREFERENCES },
    bestScore: 0
  };
}

function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFiniteIntegerInRange(v, min, max) {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

// Field-level sanitization: a bad field falls back to its default; unknown
// fields are dropped by picking only the owned keys.
function sanitizePreferences(raw) {
  const src = isPlainObject(raw) ? raw : {};
  return {
    muted: typeof src.muted === 'boolean' ? src.muted : DEFAULT_PREFERENCES.muted,
    volume: isFiniteIntegerInRange(src.volume, 0, 100) ? src.volume : DEFAULT_PREFERENCES.volume,
    motion: MOTIONS.includes(src.motion) ? src.motion : DEFAULT_PREFERENCES.motion
  };
}

function sanitizeRoot(raw) {
  if (!isPlainObject(raw)) return defaultState();
  if (raw.version !== VERSION) return defaultState();
  const best = raw.bestScore;
  return {
    version: VERSION,
    preferences: sanitizePreferences(raw.preferences),
    bestScore: isFiniteIntegerInRange(best, 0, Number.MAX_SAFE_INTEGER) ? best : 0
  };
}

function readRaw() {
  // SecurityError or unavailability surfaces as a thrown error or as
  // getItem being absent; every path falls back to defaults.
  let raw;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (raw === null || typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeRaw(state) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    // Quota or security failure: persistence silently degrades; the game
    // stays fully operable without it.
    return false;
  }
}

export function loadPersistence() {
  const parsed = sanitizeRoot(readRaw());
  return {
    preferences: parsed.preferences,
    bestScore: parsed.bestScore
  };
}

// Merge-write: fields omitted from the patch keep their stored (validated)
// values, so a best-score write never clobbers preferences and vice versa.
export function persistPatch(patch) {
  const current = sanitizeRoot(readRaw());
  const next = {
    version: VERSION,
    preferences: patch.preferences ? sanitizePreferences(patch.preferences) : current.preferences,
    bestScore: isFiniteIntegerInRange(patch.bestScore, 0, Number.MAX_SAFE_INTEGER)
      ? patch.bestScore
      : current.bestScore
  };
  return writeRaw(next);
}
