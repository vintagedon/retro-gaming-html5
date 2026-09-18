import { test, expect } from '@playwright/test';

const TARGETS = [
  { name: '1080p', width: 1920, height: 1080 },
  { name: '1440p', width: 2560, height: 1440 },
  { name: '2160p', width: 3840, height: 2160 },
  { name: 'awkward', width: 1733, height: 891 }
];

for (const target of TARGETS) {
  test.describe(`stage at ${target.name} (${target.width}x${target.height})`, () => {
    test.use({ viewport: { width: target.width, height: target.height } });

    test('stage bounds match the fit formula and centering', async ({ page }) => {
      await page.goto('/game/index.html');
      await page.evaluate(() => window.__cl.stop());

      const fit = await page.evaluate(() => {
        const stage = document.getElementById('stage').getBoundingClientRect();
        const host = document.getElementById('stage-root').getBoundingClientRect();
        return {
          stageLeft: stage.left,
          stageTop: stage.top,
          stageWidth: stage.width,
          stageHeight: stage.height,
          hostWidth: host.width,
          hostHeight: host.height,
          scrollWidth: document.scrollingElement.scrollWidth,
          scrollHeight: document.scrollingElement.scrollHeight,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight
        };
      });

      const s = Math.min(fit.hostWidth / 1920, fit.hostHeight / 1080);
      const w = 1920 * s;
      const h = 1080 * s;
      const left = (fit.hostWidth - w) / 2;
      const top = (fit.hostHeight - h) / 2;

      expect(Math.abs(fit.stageWidth - w)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(fit.stageHeight - h)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(fit.stageLeft - left)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(fit.stageTop - top)).toBeLessThanOrEqual(1.5);

      expect(fit.scrollWidth).toBeLessThanOrEqual(fit.innerWidth + 1);
      expect(fit.scrollHeight).toBeLessThanOrEqual(fit.innerHeight + 1);
    });

    test('HUD keeps its logical position and nothing overflows', async ({ page }) => {
      await page.goto('/game/index.html');
      await page.evaluate(() => window.__cl.stop());

      const rel = await page.evaluate(() => {
        const stageEl = document.getElementById('stage');
        const stage = stageEl.getBoundingClientRect();
        const playfield = document.getElementById('playfield').getBoundingClientRect();
        const hudLeft = document.getElementById('hud-left').getBoundingClientRect();
        const hudRight = document.getElementById('hud-right').getBoundingClientRect();
        const scale = stage.width / 1920;
        return {
          scale,
          playfieldLeft: (playfield.left - stage.left) / scale,
          playfieldWidth: playfield.width / scale,
          hudLeftRight: (hudLeft.right - stage.left) / scale,
          hudRightLeft: (hudRight.left - stage.left) / scale,
          hudLeftTop: (hudLeft.top - stage.top) / scale,
          stageOverflowX: stageEl.scrollWidth,
          stageOverflowY: stageEl.scrollHeight
        };
      });

      expect(rel.scale).toBeGreaterThan(0);
      expect(Math.abs(rel.playfieldLeft - 420)).toBeLessThanOrEqual(2);
      expect(Math.abs(rel.playfieldWidth - (1920 - 420 - 260))).toBeLessThanOrEqual(2);
      expect(Math.abs(rel.hudLeftRight - 420)).toBeLessThanOrEqual(2);
      expect(Math.abs(rel.hudRightLeft - 1660)).toBeLessThanOrEqual(2);
      expect(Math.abs(rel.hudLeftTop - 0)).toBeLessThanOrEqual(2);
      expect(rel.stageOverflowX).toBeLessThanOrEqual(1920);
      expect(rel.stageOverflowY).toBeLessThanOrEqual(1080);
    });
  });
}

test.describe('canvas backing store at DPR 1', () => {
  test.use({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 1 });

  test('backing dimensions follow displayed size times DPR', async ({ page }) => {
    await page.goto('/game/index.html');
    await page.evaluate(() => window.__cl.stop());

    const info = await page.evaluate(() => window.__cl.stage());
    const rect = await page.evaluate(() => {
      const r = document.getElementById('playfield').getBoundingClientRect();
      return { width: r.width, height: r.height, dpr: window.devicePixelRatio };
    });

    expect(rect.dpr).toBe(1);
    const expectedW = Math.round(rect.width * rect.dpr);
    const expectedH = Math.round(rect.height * rect.dpr);
    expect(Math.abs(info.canvas.backingWidth - expectedW)).toBeLessThanOrEqual(1);
    expect(Math.abs(info.canvas.backingHeight - expectedH)).toBeLessThanOrEqual(1);

    const expectedLogicalW = Math.round(rect.width / info.scale);
    expect(Math.abs(info.canvas.logicalWidth - expectedLogicalW)).toBeLessThanOrEqual(2);
    const drawn = info.canvas.backingWidth / info.canvas.logicalWidth;
    expect(Math.abs(drawn - rect.dpr * info.scale)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(info.drawnScale - drawn)).toBeLessThanOrEqual(0.001);
  });
});

test.describe('canvas backing store at DPR 2', () => {
  test.use({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 2 });

  test('backing doubles and the drawing transform retains logical stage coordinates', async ({ page }) => {
    await page.goto('/game/index.html');
    await page.evaluate(() => window.__cl.stop());

    const info = await page.evaluate(() => window.__cl.stage());
    const rect = await page.evaluate(() => {
      const r = document.getElementById('playfield').getBoundingClientRect();
      return { width: r.width, height: r.height, dpr: window.devicePixelRatio };
    });

    expect(rect.dpr).toBe(2);
    const expectedW = Math.round(rect.width * 2);
    const expectedH = Math.round(rect.height * 2);
    expect(Math.abs(info.canvas.backingWidth - expectedW)).toBeLessThanOrEqual(1);
    expect(Math.abs(info.canvas.backingHeight - expectedH)).toBeLessThanOrEqual(1);

    expect(info.canvas.logicalWidth).toBe(1240);
    expect(info.canvas.logicalHeight).toBe(1080);
    const expected = 2 * info.scale;
    expect(Math.abs(info.drawnScale - expected)).toBeLessThanOrEqual(0.02);
  });
});
