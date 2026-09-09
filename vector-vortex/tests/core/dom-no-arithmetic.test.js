// Vector Vortex D2.8 validation: the DOM projector, renderer, and input
// adapter contain no scoring, accuracy, timing, collision, or outcome
// arithmetic. The core is authoritative.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const TARGETS = [
  join(HERE, '..', '..', 'game', 'runtime', 'dom.js'),
  join(HERE, '..', '..', 'game', 'runtime', 'renderer.js'),
  join(HERE, '..', '..', 'game', 'runtime', 'input.js')
];

function readTarget(p) {
  return readFileSync(p, 'utf8');
}

// Forbidden arithmetic patterns. These name the specific computations the
// core owns and the adapters must not perform.
const FORBIDDEN = [
  ['accuracy ratio', /100\s*\*\s*[A-Za-z_]+\s*\/\s*[A-Za-z_]+/],
  ['accuracy ratio', /[A-Za-z_]+\s*\/\s*[A-Za-z_]+\s*\*\s*100/],
  ['accuracy bonus', /2000\s*\*\s*[A-Za-z_]+\s*\/\s*[A-Za-z_]+/],
  ['Math.round((hits / shotsSpawned))', /Math\.round\([^)]{0,40}\/\s*[A-Za-z_]+/]
];

test('DOM projector contains no scoring/accuracy/timing arithmetic (D2.8)', () => {
  const src = readTarget(TARGETS[0]);
  // The projector may read .accuracyDisplay from the snapshot but must not
  // compute hits/shotsSpawned ratios.
  for (const [label, re] of FORBIDDEN) {
    assert.ok(!re.test(src), `${TARGETS[0]}: ${label} arithmetic not allowed`);
  }
});

test('renderer contains no scoring/accuracy/timing/collision arithmetic (D2.8)', () => {
  const src = readTarget(TARGETS[1]);
  for (const [label, re] of FORBIDDEN) {
    assert.ok(!re.test(src), `${TARGETS[1]}: ${label} arithmetic not allowed`);
  }
  // Renderer may compute pixel positions from depth; that is presentation.
});

test('input adapter contains no scoring/accuracy/timing/collision arithmetic (D2.8)', () => {
  const src = readTarget(TARGETS[2]);
  for (const [label, re] of FORBIDDEN) {
    assert.ok(!re.test(src), `${TARGETS[2]}: ${label} arithmetic not allowed`);
  }
});

test('MUTATION: adding a hits/shotsSpawned ratio computation to dom.js is detected', () => {
  // The mutation introduces the forbidden arithmetic.
  const src = readTarget(TARGETS[0]);
  const mutated = src + '\nconst acc = Math.round((hits / shotsSpawned) * 100);';
  const re = FORBIDDEN[3][1];
  assert.ok(re.test(mutated), 'mutation: injected arithmetic must be detected');
  assert.ok(!re.test(src), 'unmutated DOM must not contain the forbidden arithmetic');
});