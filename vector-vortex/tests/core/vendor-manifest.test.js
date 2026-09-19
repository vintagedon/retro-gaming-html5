// Vector Vortex Spec 02 deliverable 1 validation: the vendored GameUI
// snapshot is byte-identical to its recorded manifest, the manifest names
// the pinned upstream commit and license, and the gc.css import graph is
// intact. When the upstream clone is present on the host, each vendored
// file is also byte-compared against upstream and the pin is checked for
// reachability from upstream main. On a fresh clone without the upstream
// checkout the manifest-versus-bytes checks still run.
//
// Mutation: editing any byte of any vendored file fails the SHA-256 match;
// dropping a file from disk without updating the manifest fails the
// completeness check; swapping a vendored file for edited content fails the
// upstream byte-comparison when upstream is present.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = join(HERE, '..', '..', 'game');
const VENDOR_DIR = join(GAME_DIR, 'vendor', 'gameui');
const UPSTREAM_SRC = '/opt/agents/repos/html5-game-ui-framework/src';
const UPSTREAM_REPO = '/opt/agents/repos/html5-game-ui-framework';
const PINNED_SHA = 'a678a2b0f135a991b4eacb8e62ea8d94f20c4505';

// Documentation files are game-owned records about the snapshot, not
// vendored framework bytes; they are excluded from the hash set.
const GAME_OWNED_DOC_FILES = new Set(['MANIFEST.md', 'README.md']);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function parseManifestRows(text) {
  const rows = [];
  const re = /^\| `([^`]+)` \| `([0-9a-f]{64})` \|$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    rows.push({ path: m[1], sha256: m[2] });
  }
  return rows;
}

test('manifest lists every vendored file and nothing missing on disk', () => {
  const manifestPath = join(VENDOR_DIR, 'MANIFEST.md');
  assert.ok(existsSync(manifestPath), 'MANIFEST.md must exist in the vendored tree');
  const manifest = readFileSync(manifestPath, 'utf8');
  const rows = parseManifestRows(manifest);
  assert.ok(rows.length > 0, 'manifest hash table parsed at least one row');

  const onDisk = walk(VENDOR_DIR)
    .map(p => relative(VENDOR_DIR, p))
    .filter(p => !GAME_OWNED_DOC_FILES.has(p))
    .sort();
  const listed = rows.map(r => r.path).sort();
  assert.deepEqual(listed, onDisk, 'manifest rows and vendored files must match exactly');
});

test('every vendored file matches its recorded SHA-256', () => {
  const manifest = readFileSync(join(VENDOR_DIR, 'MANIFEST.md'), 'utf8');
  const rows = parseManifestRows(manifest);
  const offenders = [];
  for (const row of rows) {
    const bytes = readFileSync(join(VENDOR_DIR, row.path));
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== row.sha256) offenders.push(`${row.path}: manifest ${row.sha256} vs actual ${actual}`);
  }
  assert.deepEqual(offenders, [], `SHA-256 mismatches: ${offenders.join('; ')}`);
});

test('manifest records the pinned full commit SHA and the MIT license location', () => {
  const manifest = readFileSync(join(VENDOR_DIR, 'MANIFEST.md'), 'utf8');
  assert.ok(manifest.includes(PINNED_SHA), `manifest must record the pinned full SHA ${PINNED_SHA}`);
  assert.ok(/MIT/.test(manifest), 'manifest must record the MIT license location');
  assert.ok(/LICENSE/.test(manifest), 'manifest must point at the upstream LICENSE');
});

test('gc.css preserves the complete published import graph', () => {
  const gcCss = readFileSync(join(VENDOR_DIR, 'gc.css'), 'utf8');
  const expected = [
    './tokens/primitives.css',
    './tokens/semantic.css',
    './tokens/components.css',
    './core/base.css',
    './core/components.css',
    './themes/modern.css',
    './themes/arcade.css',
    './themes/scifi.css',
    './themes/fantasy.css'
  ];
  for (const rel of expected) {
    assert.ok(gcCss.includes(`@import "${rel}"`), `gc.css must import ${rel} byte-for-byte`);
  }
  assert.match(gcCss, /@layer reset, tokens, core, modules, theme, overrides;/);
});

test('when upstream is present, vendored files are byte-identical and the pin is reachable from main', () => {
  if (!existsSync(join(UPSTREAM_REPO, '.git'))) {
    // Fresh-clone mode: upstream is not checked out on this host; the
    // manifest hash checks above are the reproducible contract.
    return;
  }
  const manifest = readFileSync(join(VENDOR_DIR, 'MANIFEST.md'), 'utf8');
  const rows = parseManifestRows(manifest);
  const offenders = [];
  for (const row of rows) {
    const vendored = readFileSync(join(VENDOR_DIR, row.path));
    const upstream = readFileSync(join(UPSTREAM_SRC, row.path));
    if (!vendored.equals(upstream)) offenders.push(`${row.path} differs from upstream bytes`);
  }
  assert.deepEqual(offenders, [], `vendored drift: ${offenders.join('; ')}`);

  // Reachability: pin must be an ancestor of upstream main. The command
  // exits nonzero (throwing here) when it is not.
  execFileSync('git', ['-C', UPSTREAM_REPO, 'merge-base', '--is-ancestor', PINNED_SHA, 'main'], { stdio: 'ignore' });
});
