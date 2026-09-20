// Vector Vortex Spec 01b D1 validation: every internal link in every Markdown
// file added or modified by this branch resolves from a fresh clone.
// Mutation: a link to a gitignored or authoring-environment path fails this check.
//
// This test is intentionally a SOURCE-CODE validator rather than a runtime
// invariant. It walks the Markdown files in scope, extracts every
// `[text](target)` link whose target is a path (not a URL), and asserts that
// the target exists on disk relative to the source file. The mutation is the
// presence of a path pointing outside the source tree (a link to
// `recycle-bin/` or `/opt/agents/...`). The same assertion is run twice:
// once with the real source files (expected pass) and once with a synthetic
// source that contains a bad link (expected fail).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');

// Markdown files in scope: docs/specs/, vector-vortex/docs/, vector-vortex/*.md
const SCOPE = [
  join(REPO_ROOT, 'docs', 'specs'),
  join(REPO_ROOT, 'vector-vortex', 'docs'),
  join(REPO_ROOT, 'vector-vortex')
];

function walkMarkdown(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    // Generated and gitignored output is not part of a fresh clone; the
    // isolated publish destinations (Spec 03 gate 1) land under
    // test-results/ and must never enter the link scan.
    if (['test-results', 'playwright-report', '.playwright', 'recycle-bin'].includes(name)) continue;
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walkMarkdown(p));
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}

// Extract markdown links of the form [text](target). Targets starting with
// http:// or https://, anchors (#...), or mailto: are skipped.
const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

function extractLinks(src) {
  const out = [];
  let m;
  while ((m = LINK_RE.exec(src)) !== null) {
    out.push({ text: m[1], target: m[2] });
  }
  return out;
}

// A path target is one we resolve relative to the source file's directory.
function isPathTarget(t) {
  if (!t) return false;
  if (t.startsWith('http://') || t.startsWith('https://')) return false;
  if (t.startsWith('mailto:')) return false;
  if (t.startsWith('#')) return false;
  return true;
}

function stripAnchor(t) {
  const idx = t.indexOf('#');
  return idx >= 0 ? t.slice(0, idx) : t;
}

function validateLinks(sourceFile, content, brokenCollector) {
  const baseDir = dirname(sourceFile);
  for (const { text, target } of extractLinks(content)) {
    if (!isPathTarget(target)) continue;
    const cleaned = stripAnchor(target);
    if (!cleaned) continue;
    const abs = isAbsolute(cleaned) ? cleaned : resolve(baseDir, cleaned);
    if (!existsSync(abs)) {
      brokenCollector.push(`${sourceFile}: [${text}](${target}) -> ${abs}`);
    }
  }
}

test('every internal link in scope resolves from a fresh clone', () => {
  const files = SCOPE.flatMap(d => walkMarkdown(d));
  assert.ok(files.length > 0, 'expected Markdown files in scope');
  const broken = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    validateLinks(f, src, broken);
  }
  assert.deepEqual(broken, [], `broken links: ${broken.join('\n  ')}`);
});

test('MUTATION: a Markdown file containing a link to recycle-bin/ fails the validator', () => {
  const synthetic = `# Synthetic

See the archived spec at [recycle](../recycle-bin/spec-01.md).
`;
  const broken = [];
  // Pretend the synthetic file lives at docs/specs/synthetic.md (the directory
  // exists in scope; the recycled target does not because recycle-bin/ is
  // gitignored).
  const syntheticPath = join(REPO_ROOT, 'docs', 'specs', '__synthetic_link_test.md');
  validateLinks(syntheticPath, synthetic, broken);
  assert.ok(broken.length > 0, 'mutation: expected broken link to be reported');
  assert.ok(broken[0].includes('recycle-bin'), 'mutation: expected report to name the recycle-bin target');
});

test('MUTATION: a Markdown file containing a link to /opt/agents/... fails the validator', () => {
  const synthetic = `# Synthetic

See the authoring copy at [authoring copy](/opt/agents/repos/spec/spec-01.md).
`;
  const syntheticPath = join(REPO_ROOT, 'docs', 'specs', '__synthetic_link_test.md');
  const broken = [];
  validateLinks(syntheticPath, synthetic, broken);
  assert.ok(broken.length > 0, 'mutation: expected broken link to be reported');
  assert.ok(broken[0].includes('/opt/agents/'), 'mutation: expected report to name the authoring-environment target');
});