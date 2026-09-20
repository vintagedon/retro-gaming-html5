// Vector Vortex shipped-asset validation (Spec 03 gate 3).
// ATTRIBUTION.md lists every shipped asset with pack, author, licence and
// source, and every listed licence permits redistribution in a public
// repository.
//
// MUTATION: an unlisted shipped file, a missing licence cell, or a licence
// that does not permit redistribution fails this check.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, '..', '..', 'game', 'assets');
const ATTRIBUTION_PATH = join(ASSETS, 'ATTRIBUTION.md');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function shippedFiles() {
  return walk(ASSETS)
    .map(p => p.slice(ASSETS.length + 1))
    .filter(rel => rel !== 'ATTRIBUTION.md');
}

// Parse the attribution table: | path | pack | author | licence | source | ... |
function attributionRows() {
  const src = readFileSync(ATTRIBUTION_PATH, 'utf8');
  const rows = [];
  for (const line of src.split('\n')) {
    if (!line.startsWith('| `')) continue;
    const cells = line.split('|').map(c => c.trim());
    // cells[0] is empty (leading pipe); cells[1] is the `path`.
    rows.push({
      path: cells[1].replaceAll('`', ''),
      pack: cells[2],
      author: cells[3],
      licence: cells[4],
      source: cells[5]
    });
  }
  return rows;
}

function unlistedFiles(rows, files) {
  const listed = new Set(rows.map(r => r.path));
  return files.filter(f => !listed.has(f));
}

test('every shipped asset file is listed in ATTRIBUTION.md', () => {
  const rows = attributionRows();
  const files = shippedFiles();
  assert.ok(files.length > 0, 'expected shipped assets to exist');
  assert.deepEqual(unlistedFiles(rows, files), [], 'every shipped file must have an attribution row');
});

test('every listed asset exists on disk and carries pack, author, licence, and source', () => {
  for (const row of attributionRows()) {
    const p = join(ASSETS, row.path);
    assert.ok(existsSync(p), `listed asset missing on disk: ${row.path}`);
    assert.ok(row.pack.length > 0, `${row.path}: pack missing`);
    assert.ok(row.author.length > 0, `${row.path}: author missing`);
    assert.ok(row.licence.length > 0, `${row.path}: licence missing`);
    assert.match(row.source, /^https:\/\//, `${row.path}: source must be a URL`);
  }
});

test('every listed licence permits redistribution in a public repository', () => {
  for (const row of attributionRows()) {
    assert.match(
      row.licence,
      /^(CC0|CC BY 4\.0)/,
      `${row.path}: licence "${row.licence}" is not a recognised redistributable licence`
    );
  }
});

test('the audio container and the font files ship in servable formats', () => {
  const files = shippedFiles();
  for (const f of files) {
    assert.ok(/\.(ttf|png|ogg)$/.test(f), `unexpected shipped format: ${f}`);
  }
  assert.ok(files.some(f => f.endsWith('.ogg')), 'one music loop expected');
  assert.ok(files.some(f => f.endsWith('.ttf')), 'the pixel font is expected');
});

test('MUTATION: dropping a row from ATTRIBUTION.md makes its file unlisted', () => {
  const rows = attributionRows();
  assert.ok(rows.length > 0, 'expected attribution rows');
  const reduced = rows.slice(1);
  const remaining = unlistedFiles(reduced, rows.map(r => r.path));
  assert.ok(remaining.includes(rows[0].path), 'mutation: the dropped row must be reported unlisted');
});

test('MUTATION: a non-redistributable licence cell is detected', () => {
  assert.equal(/^CC0/.test('Redistribution not permitted'), false);
  assert.equal(/^CC BY 4\.0/.test('CC BY 4.0'), true);
});
