// Vector Vortex Spec 02 deliverable 4 validation: the scoped publish.
// A publish replaces only the vector-vortex/ child of the preview umbrella
// with the servable game/ tree; a second publish is byte-identical; the
// umbrella root and sibling game folders are untouched.
//
// Mutation: pointing the script at the umbrella root, or a sibling name,
// must be refused by its guards.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, writeFileSync, chmodSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = join(HERE, '..', '..', 'game');
const SCRIPT = join(HERE, '..', '..', 'publish.sh');
const UMBRELLA = '/opt/agents/www/retrogaming';
const DEST = join(UMBRELLA, 'vector-vortex');
const MARKER = 'vv-preview-marker.txt';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function inventory(dir) {
  if (!statSync(dir).isDirectory()) return null;
  const entries = {};
  for (const f of walk(dir)) {
    const rel = f.slice(dir.length + 1);
    if (rel === MARKER) continue;
    entries[rel] = createHash('sha256').update(readFileSync(f)).digest('hex');
  }
  return entries;
}

function siblingInventory() {
  const out = {};
  for (const name of readdirSync(UMBRELLA)) {
    const p = join(UMBRELLA, name);
    if (name === 'vector-vortex') continue;
    const s = statSync(p);
    out[name] = s.isDirectory() ? inventory(p) : createHash('sha256').update(readFileSync(p)).digest('hex');
  }
  return out;
}

test('publish copies only the servable game tree under the scoped destination', () => {
  const before = siblingInventory();
  execFileSync(SCRIPT, { stdio: 'pipe' });

  const entries = inventory(DEST);
  const names = Object.keys(entries);
  assert.ok(names.includes('index.html'), 'published entry index.html exists');
  assert.ok(names.includes('vendor/gameui/gc.css'), 'vendored foundations published');
  // Only servable game/ files were copied: nothing from tests, docs, or scripts.
  for (const n of names) {
    assert.ok(!/^(tests|docs|scripts|node_modules)\//.test(n), `no non-servable path published: ${n}`);
    assert.ok(!n.endsWith('.spec.js') && !n.endsWith('.test.js'), `no test file published: ${n}`);
  }
  // Every published file matches its source bytes in game/.
  for (const [rel, hash] of Object.entries(entries)) {
    const src = join(GAME_DIR, rel);
    const srcHash = createHash('sha256').update(readFileSync(src)).digest('hex');
    assert.equal(hash, srcHash, `published file matches source: ${rel}`);
  }
  assert.deepEqual(siblingInventory(), before, 'umbrella root and sibling folders unchanged');
});

test('a second publish is byte-identical', () => {
  execFileSync(SCRIPT, { stdio: 'pipe' });
  const first = inventory(DEST);
  const marker = readFileSync(join(DEST, MARKER), 'utf8').trim();
  execFileSync(SCRIPT, { stdio: 'pipe' });
  const second = inventory(DEST);
  const marker2 = readFileSync(join(DEST, MARKER), 'utf8').trim();
  assert.deepEqual(second, first, 'second publish produces the same file set and bytes');
  assert.equal(marker2, marker, 'preview marker is deterministic');
  assert.match(marker, /^tree-sha256: [0-9a-f]{64}$/);
});

test('guards refuse a destination that is not the vector-vortex subfolder', () => {
  // Read the script and mutate its destination assignment; the basename
  // guard must reject the mutated script without touching the umbrella.
  const src = readFileSync(SCRIPT, 'utf8');
  const mutated = src.replace(
    'DESTINATION_DIR="${DEST_ROOT}/vector-vortex"',
    'DESTINATION_DIR="${DEST_ROOT}/retrogaming"'
  );
  assert.notEqual(mutated, src, 'mutation applied');

  const tmp = join(HERE, '..', '..', 'publish-mutation-tmp.sh');
  writeFileSync(tmp, mutated);
  chmodSync(tmp, 0o755);
  try {
    const run = spawnSync(tmp, { stdio: 'pipe' });
    assert.notEqual(run.status, 0, 'mutated script must exit nonzero');
  } finally {
    try { unlinkSync(tmp); } catch { /* already removed */ }
  }
});
