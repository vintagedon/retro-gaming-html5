import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanTreeForForbidden } from '../helpers/purity-scan.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORE_DIR = join(HERE, '..', '..', 'game', 'core');

test('simulation core rejects forbidden DOM, clock, and random APIs', () => {
  const offenders = scanTreeForForbidden(CORE_DIR);
  assert.deepEqual(offenders, [], `forbidden APIs found: ${offenders.join(', ')}`);
});

test('mutation gate: a real core copy containing Math.random fails the scan', () => {
  const mutated = mkdtempSync(join(tmpdir(), 'cargo-lander-purity-'));
  try {
    cpSync(CORE_DIR, mutated, { recursive: true });
    writeFileSync(
      join(mutated, 'injected-mutation.js'),
      'export function jitter() {\n  return Math.random();\n}\n',
      'utf8'
    );
    const offenders = scanTreeForForbidden(mutated);
    assert.notEqual(offenders.length, 0, 'scan must fail on a real mutated tree');
    assert.ok(
      offenders.some((entry) => entry.includes('Math.random')),
      `scan must name Math.random as the offender, got: ${offenders.join(', ')}`
    );
  } finally {
    rmSync(mutated, { recursive: true, force: true });
  }
});

test('mutation gate: the unmutated copy passes so the failure is real', () => {
  const control = mkdtempSync(join(tmpdir(), 'cargo-lander-purity-control-'));
  try {
    cpSync(CORE_DIR, control, { recursive: true });
    const offenders = scanTreeForForbidden(control);
    assert.deepEqual(offenders, [], 'clean copy must pass the same scan');
  } finally {
    rmSync(control, { recursive: true, force: true });
  }
});
