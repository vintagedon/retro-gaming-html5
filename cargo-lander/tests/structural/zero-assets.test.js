import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GAME_DIR = join(HERE, '..', '..', 'game');

const IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.ico', '.bmp'
]);
const AUDIO_EXTENSIONS = new Set([
  '.mp3', '.wav', '.ogg', '.oga', '.flac', '.m4a', '.opus', '.aac'
]);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

test('the game directory contains zero image and zero audio files', () => {
  const files = walk(GAME_DIR);
  assert.ok(files.length > 20, 'the scan must cover the real game tree');
  const offenders = files.filter((f) => {
    const ext = extname(f).toLowerCase();
    return IMAGE_EXTENSIONS.has(ext) || AUDIO_EXTENSIONS.has(ext);
  });
  assert.deepEqual(
    offenders,
    [],
    `wireframe-arc rule violated by: ${offenders.join(', ')}`
  );
});
