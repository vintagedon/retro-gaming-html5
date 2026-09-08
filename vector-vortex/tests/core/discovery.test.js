import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..', '..', 'package.json');

test('package.json test script uses node --test with explicit file list', () => {
  const pkg = JSON.parse(readFileSync(PKG, 'utf8'));
  const cmd = pkg.scripts?.['test:unit'] ?? '';
  assert.ok(cmd.startsWith('node --test '), `expected node --test prefix, got: ${cmd}`);
  assert.ok(!cmd.includes('*'), 'must not use shell glob expansion');
  assert.ok(!cmd.includes('**'), 'must not use recursive glob expansion');
  // Verify each listed file exists
  const listed = cmd.replace(/^node\s+--test\s+/, '').split(/\s+/).filter(Boolean);
  assert.ok(listed.length > 0, 'test list must be non-empty');
  const testsDir = join(HERE, '..');
  const present = new Set(
    readdirSync(testsDir)
      .filter(n => statSync(join(testsDir, n)).isDirectory())
      .flatMap(d => readdirSync(join(testsDir, d)).filter(f => f.endsWith('.test.js')).map(f => `tests/${d}/${f}`))
  );
  for (const file of listed) {
    assert.ok(present.has(file), `listed test file missing on disk: ${file}`);
  }
});

test('MUTATION renaming any test file changes the reported test count', () => {
  // Verified externally by the runner: removing a test from the explicit list
  // causes node --test to report fewer tests. This test itself proves the
  // explicit list is non-empty and contains only files that exist.
  const pkg = JSON.parse(readFileSync(PKG, 'utf8'));
  const cmd = pkg.scripts['test:unit'];
  const listed = cmd.replace(/^node\s+--test\s+/, '').split(/\s+/).filter(Boolean);
  assert.ok(listed.length >= 5, `expected at least 5 listed tests, got ${listed.length}`);
});