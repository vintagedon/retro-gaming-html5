import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const FORBIDDEN = [
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

export function walkJsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkJsFiles(p));
    else if (name.endsWith('.js') || name.endsWith('.mjs')) out.push(p);
  }
  return out;
}

// Scans a real directory tree for forbidden DOM/clock/random APIs and
// returns one offender string per hit.
export function scanTreeForForbidden(dir) {
  const offenders = [];
  for (const file of walkJsFiles(dir)) {
    const src = readFileSync(file, 'utf8');
    for (const [name, re] of FORBIDDEN) {
      if (re.test(src)) offenders.push(`${file}: ${name}`);
    }
  }
  return offenders;
}
