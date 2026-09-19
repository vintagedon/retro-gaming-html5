// Vector Vortex Spec 02 deliverable 1 validation: source-level namespace and
// consumption boundaries. The game composes the framework's documented
// public surface (published primitive classes, data-gc-theme, public tokens)
// and never invents generic gc- selectors, data attributes, custom events,
// JavaScript APIs, restyles framework component internals, or uses
// !important. Every game-owned class, id, test id, and file name in the
// shell carries the recorded Vector Vortex namespace: vv-.
//
// Mutation: adding a `.gc-panel { padding: 0 }` rule, a data-gc-foo
// attribute, a !important declaration, or an unnamespaced class to any game
// source file fails this check. The documented consumption (gc-panel and
// gc-button in markup, data-gc-theme="vector-vortex" on <html>, var(--gc-*)
// tokens in game CSS) passes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = join(HERE, '..', '..', 'game');

// Published framework component classes (core/components.css). This is the
// complete published set; anything else gc- is an invented generic API.
const PUBLISHED_GC_CLASSES = new Set([
  'gc-panel',
  'gc-button',
  'gc-input',
  'gc-meter',
  'gc-meter__fill',
  'gc-meter__trail'
]);

// The single documented public data attribute the game is allowed to set,
// with the value required by the frozen presentation contract.
const ALLOWED_GC_ATTR = 'data-gc-theme="vector-vortex"';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'vendor') continue; // vendored framework bytes are upstream's
      walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

const files = walk(GAME_DIR);
const cssFiles = files.filter(f => extname(f) === '.css');
const jsFiles = files.filter(f => extname(f) === '.js');
const htmlFiles = files.filter(f => extname(f) === '.html');

// Boundary scans judge executable code, so CSS comments (which document the
// rules, including the reserved-role rule) are stripped before matching.
function stripCssComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

test('game tree has css, js, and html sources to check (non-empty scope)', () => {
  assert.ok(cssFiles.length >= 2, 'styles.css and vector-vortex-theme.css exist');
  assert.ok(jsFiles.length > 0, 'runtime modules exist');
  assert.ok(htmlFiles.length >= 1, 'index.html exists');
});

test('game CSS uses no !important and selects no framework internals', () => {
  const offenders = [];
  for (const f of cssFiles) {
    const src = stripCssComments(readFileSync(f, 'utf8'));
    if (/!important/.test(src)) offenders.push(`${relative(GAME_DIR, f)}: !important`);
    // Any .gc- class selector in game CSS is either an invented generic
    // selector or a restyle of framework component internals.
    if (/\.gc-[a-z]/.test(src)) offenders.push(`${relative(GAME_DIR, f)}: .gc- selector`);
  }
  assert.deepEqual(offenders, [], `game CSS boundary violations: ${offenders.join('; ')}`);
});

test('game CSS sets only the documented theme attribute selector', () => {
  const offenders = [];
  for (const f of cssFiles) {
    const src = stripCssComments(readFileSync(f, 'utf8'));
    const matches = src.match(/data-gc-[a-z-]+(?:="[^"]*")?/g) || [];
    for (const m of matches) {
      if (m !== ALLOWED_GC_ATTR && m !== 'data-gc-theme="vector-vortex"') {
        offenders.push(`${relative(GAME_DIR, f)}: ${m}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `invented data-gc- usage in CSS: ${offenders.join('; ')}`);
});

test('game HTML uses only published primitive classes and the documented theme attribute', () => {
  const offenders = [];
  const CLASS_RE = /class="([^"]*)"/g;
  for (const f of htmlFiles) {
    const src = readFileSync(f, 'utf8');
    let m;
    while ((m = CLASS_RE.exec(src)) !== null) {
      for (const cls of m[1].split(/\s+/).filter(Boolean)) {
        if (cls.startsWith('vv-')) continue;
        if (PUBLISHED_GC_CLASSES.has(cls)) continue;
        offenders.push(`${relative(GAME_DIR, f)}: unrecognized class ${cls}`);
      }
    }
    const attrMatches = src.match(/data-gc-[a-z-]+(?:="[^"]*")?/g) || [];
    for (const a of attrMatches) {
      if (a !== ALLOWED_GC_ATTR) offenders.push(`${relative(GAME_DIR, f)}: ${a}`);
    }
  }
  assert.deepEqual(offenders, [], `HTML boundary violations: ${offenders.join('; ')}`);
});

test('html element carries data-gc-theme="vector-vortex"', () => {
  const src = readFileSync(join(GAME_DIR, 'index.html'), 'utf8');
  assert.match(src, /<html[^>]*data-gc-theme="vector-vortex"/);
});

test('game JavaScript invents no gc- string API, event, or selector', () => {
  const offenders = [];
  for (const f of jsFiles) {
    const src = readFileSync(f, 'utf8');
    // Quote-delimited gc- strings: event names, storage keys, selectors.
    if (/['"`]gc-/.test(src)) offenders.push(`${relative(GAME_DIR, f)}: gc- string literal`);
    if (/['"`]\.gc-/.test(src)) offenders.push(`${relative(GAME_DIR, f)}: gc- selector`);
  }
  assert.deepEqual(offenders, [], `JS boundary violations: ${offenders.join('; ')}`);
});

test('every game-owned class and test id in HTML and CSS is vv- namespaced', () => {
  const offenders = [];
  for (const f of cssFiles) {
    const src = stripCssComments(readFileSync(f, 'utf8'));
    // Class selectors in game CSS must all be vv- namespaced.
    const classSelectors = src.match(/\.[a-z][a-z0-9_-]*/g) || [];
    for (const c of classSelectors) {
      if (!c.startsWith('.vv-')) offenders.push(`${relative(GAME_DIR, f)}: non-vv class selector ${c}`);
    }
  }
  for (const f of htmlFiles) {
    const src = readFileSync(f, 'utf8');
    const testIds = src.match(/data-testid="([^"]*)"/g) || [];
    for (const t of testIds) {
      if (!/^data-testid="vv-/.test(t)) offenders.push(`${relative(GAME_DIR, f)}: ${t}`);
    }
    const ids = src.match(/id="([^"]*)"/g) || [];
    for (const i of ids) {
      const v = i.slice(4, -1);
      if (!v.startsWith('vv-')) offenders.push(`${relative(GAME_DIR, f)}: id="${v}"`);
    }
  }
  assert.deepEqual(offenders, [], `namespace violations: ${offenders.join('; ')}`);
});

test('the frozen reserved shift-energy magenta appears nowhere in game source', () => {
  const offenders = [];
  for (const f of files) {
    const ext = extname(f);
    if (!['.css', '.js', '.html'].includes(ext)) continue;
    // CSS is scanned without comments: the theme header documents the
    // reservation itself, which is exactly why the role must stay unused.
    const src = ext === '.css' ? stripCssComments(readFileSync(f, 'utf8')) : readFileSync(f, 'utf8');
    if (/ff4fd8/i.test(src)) offenders.push(relative(GAME_DIR, f));
    if (/255,\s*79,\s*216/.test(src)) offenders.push(relative(GAME_DIR, f));
  }
  assert.deepEqual(offenders, [], `reserved magenta referenced in: ${offenders.join('; ')}`);
});
