// Vector Vortex publish validation (Spec 03 gate 1 isolation rewrite).
// A publish replaces only the vector-vortex/ child of its destination root
// with the servable game/ tree; a second publish is byte-identical; sibling
// folders in the destination root are untouched.
//
// Isolation contract (Spec 03 gate 1): this suite publishes into an
// isolated temporary root inside the repository tree through the
// VV_PUBLISH_ROOT override. It never writes to /opt/agents/www/ and never
// requires the production preview directory to exist.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, writeFileSync, chmodSync, unlinkSync, rmSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = join(HERE, '..', '..', 'game');
const SCRIPT = join(HERE, '..', '..', 'publish.sh');
const ISOLATION_BASE = join(HERE, '..', '..', 'test-results', 'publish-isolation');
const MARKER = 'vv-preview-marker.txt';

function freshRunRoot() {
  rmSync(ISOLATION_BASE, { recursive: true, force: true });
  const run = join(ISOLATION_BASE, `run-${process.pid}-${Date.now()}`);
  mkdirSync(run, { recursive: true });
  return run;
}

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

// A sibling game folder and a stray root file, so the scoped-publish check
// has real neighbors to defend.
function seedSiblings(umbrella) {
  const sibling = join(umbrella, 'sibling-game');
  mkdirSync(sibling, { recursive: true });
  writeFileSync(join(sibling, 'index.html'), '<title>sibling</title>\n');
  writeFileSync(join(umbrella, 'root-file.txt'), 'umbrella root file\n');
}

function siblingInventory(umbrella) {
  const out = {};
  for (const name of readdirSync(umbrella)) {
    if (name === 'vector-vortex') continue;
    const p = join(umbrella, name);
    const s = statSync(p);
    out[name] = s.isDirectory() ? inventory(p) : createHash('sha256').update(readFileSync(p)).digest('hex');
  }
  return out;
}

function publishTo(umbrella) {
  execFileSync(SCRIPT, {
    env: { ...process.env, VV_PUBLISH_ROOT: umbrella },
    stdio: 'pipe'
  });
}

test('publish copies only the servable game tree under the scoped destination', () => {
  const umbrella = join(freshRunRoot(), 'retrogaming');
  mkdirSync(umbrella, { recursive: true });
  seedSiblings(umbrella);
  const before = siblingInventory(umbrella);

  publishTo(umbrella);

  const DEST = join(umbrella, 'vector-vortex');
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
  assert.deepEqual(siblingInventory(umbrella), before, 'umbrella root and sibling folders unchanged');
  assert.ok(readFileSync(join(DEST, MARKER), 'utf8').startsWith('tree-sha256: '), 'marker written');
});

test('a second publish is byte-identical', () => {
  const umbrella = join(freshRunRoot(), 'retrogaming');
  mkdirSync(umbrella, { recursive: true });
  publishTo(umbrella);
  const DEST = join(umbrella, 'vector-vortex');
  const first = inventory(DEST);
  const marker = readFileSync(join(DEST, MARKER), 'utf8').trim();
  publishTo(umbrella);
  const second = inventory(DEST);
  const marker2 = readFileSync(join(DEST, MARKER), 'utf8').trim();
  assert.deepEqual(second, first, 'second publish produces the same file set and bytes');
  assert.equal(marker2, marker, 'preview marker is deterministic');
  assert.match(marker, /^tree-sha256: [0-9a-f]{64}$/);
});

test('guards refuse a destination that is not the vector-vortex subfolder', () => {
  // Read the script and mutate its destination assignment; the basename
  // guard must reject the mutated script without touching the destination root.
  const src = readFileSync(SCRIPT, 'utf8');
  const mutated = src.replace(
    'DESTINATION_DIR="${DEST_ROOT}/vector-vortex"',
    'DESTINATION_DIR="${DEST_ROOT}/retrogaming"'
  );
  assert.notEqual(mutated, src, 'mutation applied');

  const runRoot = freshRunRoot();
  const umbrella = join(runRoot, 'retrogaming');
  mkdirSync(umbrella, { recursive: true });
  seedSiblings(umbrella);
  const before = siblingInventory(umbrella);

  const tmp = join(runRoot, 'publish-mutation-tmp.sh');
  writeFileSync(tmp, mutated);
  chmodSync(tmp, 0o755);
  try {
    const run = spawnSync(tmp, {
      env: { ...process.env, VV_PUBLISH_ROOT: umbrella },
      stdio: 'pipe'
    });
    assert.notEqual(run.status, 0, 'mutated script must exit nonzero');
  } finally {
    try { unlinkSync(tmp); } catch { /* already removed */ }
  }
  assert.deepEqual(siblingInventory(umbrella), before, 'refused publish leaves the destination root untouched');
});

test('isolated publish never requires the production preview directory', () => {
  // The suite above ran entirely under VV_PUBLISH_ROOT inside the checkout.
  // This check pins the contract itself: the script's default destination
  // is the only path that mentions the production root, and the override
  // replaces it wholesale.
  const src = readFileSync(SCRIPT, 'utf8');
  assert.match(src, /VV_PUBLISH_ROOT:-\/opt\/agents\/www\/retrogaming/, 'production root is only the default');
  assert.ok(!/^\s*DEST_ROOT="\/opt\/agents\/www\/retrogaming"\s*$/m.test(src), 'no unconditional production destination');
});
