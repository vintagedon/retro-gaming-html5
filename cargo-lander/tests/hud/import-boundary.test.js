import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = resolve(HERE, '..', '..', 'game');

function walkJs(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === 'vendor') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkJs(p));
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

function importSpecifiers(src) {
  const specs = [];
  const fromRe = /(?:^|\s)from\s*["']([^"']+)["']/g;
  const bareRe = /(?:^|\s)import\s*["']([^"']+)["']/g;
  let m;
  while ((m = fromRe.exec(src)) !== null) specs.push(m[1]);
  while ((m = bareRe.exec(src)) !== null) specs.push(m[1]);
  return specs;
}

test('game modules import nothing outside the game tree', () => {
  const files = walkJs(GAME_DIR);
  assert.ok(files.length >= 5, 'the scan must cover the real game modules');
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const spec of importSpecifiers(src)) {
      assert.ok(
        spec.startsWith('./') || spec.startsWith('../'),
        `${file} must use relative imports, found ${spec}`
      );
      assert.ok(!/^[a-z]+:\/\//i.test(spec), `${file} must not import URLs, found ${spec}`);
      const resolved = resolve(dirname(file), spec);
      assert.ok(
        resolved === GAME_DIR || resolved.startsWith(GAME_DIR + sep),
        `${file} import escapes the game tree: ${spec}`
      );
      assert.ok(existsSync(resolved), `${file} imports a missing module: ${spec}`);
    }
  }
});

test('the HUD consumes the vendored kit CSS only', () => {
  const html = readFileSync(join(GAME_DIR, 'index.html'), 'utf8');
  assert.ok(html.includes('vendor/h5gameui/src/gc.css'), 'the page loads the published CSS entry');
  assert.ok(!html.includes('harness/'), 'the HUD never reaches into the framework harness');
  const hudSrc = readFileSync(join(GAME_DIR, 'ui', 'hud.js'), 'utf8');
  assert.ok(!hudSrc.includes('config.js'), 'the HUD must not import CONFIG');
});
