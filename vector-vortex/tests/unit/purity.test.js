import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

describe('Deliverable 1 - Rules Module Purity Check', () => {
  it('rejects Math.random, Date.now, performance.now, window, document, Canvas, and Audio in core rules modules', () => {
    const coreDir = join(process.cwd(), 'game/src/core');
    const files = readdirSync(coreDir).filter(f => f.endsWith('.js'));

    const forbiddenPatterns = [
      /\bMath\.random\b/,
      /\bDate\.now\b/,
      /\bperformance\.now\b/,
      /\bwindow\b/,
      /\bdocument\b/,
      /\bHTMLCanvasElement\b/,
      /\bCanvasRenderingContext2D\b/,
      /\bAudioContext\b/,
      /\bwebkitAudioContext\b/,
      /\brequestAnimationFrame\b/,
      /\bsetTimeout\b/,
      /\bsetInterval\b/,
    ];

    for (const file of files) {
      const content = readFileSync(join(coreDir, file), 'utf8');
      for (const pattern of forbiddenPatterns) {
        const match = content.match(pattern);
        assert.equal(
          match,
          null,
          `Forbidden pattern ${pattern} found in core file ${file}: "${match?.[0]}"`
        );
      }
    }
  });
});
