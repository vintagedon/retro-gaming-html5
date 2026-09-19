import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RULES_DIR = join(HERE, '..', '..', 'game', 'core');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

const FORBIDDEN = [
  ['Math.random', /Math\.random\b/],
  ['Date.now', /\bDate\.now\b/],
  ['performance.now', /\bperformance\.now\b/],
  ['window', /\bwindow\b/],
  ['document', /\bdocument\b/],
  ['HTMLCanvasElement', /\bHTMLCanvasElement\b/],
  ['OffscreenCanvas', /\bOffscreenCanvas\b/],
  ['AudioContext', /\bAudioContext\b/],
  ['Audio', /\bnew\s+Audio\b/]
];

test('rules modules contain no DOM/Canvas/Audio/clock APIs', () => {
  const files = walk(RULES_DIR);
  const offenders = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const [name, re] of FORBIDDEN) {
      if (re.test(src)) offenders.push(`${f}: ${name}`);
    }
  }
  assert.deepEqual(offenders, [], `forbidden APIs found: ${offenders.join(', ')}`);
});

test('game/core/ contains no test-only or mutation module (D3.1)', () => {
  // Mutation helpers live under tests/_mutations/, never under game/core/.
  const files = walk(RULES_DIR);
  const offenders = files.filter(f => /-mutation\.js$|_mutation\.js$|_mutations\.js$/.test(f));
  assert.deepEqual(offenders, [], `mutation helpers found in game/core/: ${offenders.join(', ')}`);
});

test('MUTATION: a -mutation.js helper under game/core/ is detected', () => {
  // The check must reject any filename matching the mutation pattern.
  const re = /-mutation\.js$|_mutation\.js$|_mutations\.js$/;
  assert.ok(re.test('foo/bar/rng-mutation.js'), 'mutation: regex must detect rng-mutation.js');
  assert.ok(!re.test('foo/bar/core.js'), 'regex must NOT match core.js');
});

test('MUTATION injecting Math.random into a rules module is detected by the forbidden list', () => {
  // The forbidden list contains /Math\.random\b/. If a rules file imported or
  // called Math.random, the assertion above would report it. This is a
  // documentation test that the mutation is covered.
  const re = FORBIDDEN.find(([n]) => n === 'Math.random')[1];
  assert.ok(re.test('const r = Math.random();'),
    'mutation regex must match Math.random call');
});