import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const VENDOR_DIR = resolve(HERE, '..', '..', 'game', 'vendor', 'h5gameui');
const manifest = JSON.parse(readFileSync(join(VENDOR_DIR, 'MANIFEST.json'), 'utf8'));

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

test('every vendored file matches its recorded SHA-256', () => {
  for (const entry of manifest.files) {
    const file = join(VENDOR_DIR, entry.path);
    assert.ok(existsSync(file), `manifest lists a missing file: ${entry.path}`);
    assert.equal(
      sha256(file),
      entry.sha256,
      `vendored file drifted from the pinned manifest: ${entry.path}`
    );
  }
});

test('the manifest covers the complete import tree of the published entry point', () => {
  const entry = readFileSync(join(VENDOR_DIR, 'src', 'gc.css'), 'utf8');
  const imports = [...entry.matchAll(/@import\s+["']([^"']+)["']/g)].map((m) =>
    m[1].replace('./', 'src/')
  );
  assert.ok(imports.length >= 9, 'the published entry imports the full token, core, and theme tree');
  const listed = new Set(manifest.files.map((f) => f.path));
  for (const imported of imports) {
    assert.ok(listed.has(imported), `import tree file is missing from the manifest: ${imported}`);
    assert.ok(existsSync(join(VENDOR_DIR, imported)), `import tree file is not vendored: ${imported}`);
  }
});

test('the kit license is vendored beside the source', () => {
  const license = manifest.files.find((f) => f.path === 'LICENSE');
  assert.ok(license, 'LICENSE must be vendored');
  const text = readFileSync(join(VENDOR_DIR, 'LICENSE'), 'utf8');
  assert.ok(text.length > 0, 'the license file is not empty');
});

test('the manifest records the pinned source commit', () => {
  assert.match(manifest.source_commit, /^[0-9a-f]{40}$/, 'a full commit hash pins the revision');
  assert.equal(manifest.source_commit, 'a678a2b0f135a991b4eacb8e62ea8d94f20c4505');
});
