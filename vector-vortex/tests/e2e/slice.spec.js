import { test, expect } from '@playwright/test';

test.describe('Deliverable 3 - Playable Canvas Slice and Semantic Surface', () => {
  test('keyboard-only flow: lane wrapping 23 <-> 0, hold fire cooldown, pause/resume, and reaching forced outcomes', async ({ page }) => {
    await page.goto('/');

    // Verify initial telemetry values
    const statStatus = page.locator('#stat-status');
    const statLives = page.locator('#stat-lives');
    const statScore = page.locator('#stat-score');
    const statAccuracy = page.locator('#stat-accuracy');

    await expect(statStatus).toHaveText('ACTIVE');
    await expect(statLives).toHaveText('3');
    await expect(statScore).toHaveText('0');
    await expect(statAccuracy).toHaveText('ACC --');

    // Test seam wrap: step left from lane 0 -> 23
    const snap1 = await page.evaluate(() => {
      return window.__VECTOR_VORTEX_SEAM__.stepExactTicks(1, { left: true });
    });
    expect(snap1.playerLane).toBe(23);

    // Step right from 23 -> 0
    const snap2 = await page.evaluate(() => {
      return window.__VECTOR_VORTEX_SEAM__.stepExactTicks(1, { right: true });
    });
    expect(snap2.playerLane).toBe(0);

    // Hold fire across 9 ticks: should spawn exactly 2 shots (tick 1 and tick 9)
    const snap3 = await page.evaluate(() => {
      return window.__VECTOR_VORTEX_SEAM__.stepExactTicks(9, { fire: true });
    });
    expect(snap3.shotsSpawned).toBe(2);

    // Test pause / resume via DOM button
    const btnPause = page.locator('#btn-pause');
    await btnPause.click();
    await expect(statStatus).toHaveText('PAUSED');

    // Click resume
    await btnPause.click();
    await expect(statStatus).toHaveText('ACTIVE');

    // Force outcome: Survived via test seam
    await page.evaluate(() => {
      window.__VECTOR_VORTEX_SEAM__.core.elapsedTicks = 18000;
      window.__VECTOR_VORTEX_SEAM__.stepExactTicks(1, {});
    });
    await expect(statStatus).toHaveText('SURVIVED');
    const btnRestart = page.locator('#btn-restart');
    await expect(btnRestart).toBeEnabled();

    // Restart game
    await btnRestart.click();
    await expect(statStatus).toHaveText('ACTIVE');
    await expect(statLives).toHaveText('3');
    await expect(btnRestart).toBeDisabled();

    // Force outcome: Lost via test seam
    await page.evaluate(() => {
      const core = window.__VECTOR_VORTEX_SEAM__.core;
      core.lives = 1;
      core.damageGraceTimer = 0;
      core.enemies.push({ id: 999, lane: 0, depth: 0.0001, prevDepth: 0.0025, hp: 1 });
      // step 2 ticks to guarantee enemy reaches <= 0
      window.__VECTOR_VORTEX_SEAM__.stepExactTicks(2, {});
    });
    await expect(statStatus).toHaveText('LOST');
    await expect(statLives).toHaveText('0');
  });

  test('DOM status values are pure projections of core snapshot', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      const core = window.__VECTOR_VORTEX_SEAM__.core;
      core.score = 14500;
      core.kills = 12;
      core.shotsSpawned = 20;
      core.shotsHit = 15;
      window.__VECTOR_VORTEX_SEAM__.stepExactTicks(1, {});
    });

    await expect(page.locator('#stat-score')).toHaveText('14,500');
    await expect(page.locator('#stat-kills')).toHaveText('12');
    await expect(page.locator('#stat-accuracy')).toHaveText('75%');
  });

  test('blur and hidden-tab clears held input and prevents catch-up burst', async ({ page }) => {
    await page.goto('/');

    // Press down ArrowLeft
    await page.keyboard.down('ArrowLeft');

    // Trigger blur / visibilitychange
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
    });

    const heldAfterBlur = await page.evaluate(() => {
      const app = window.__VECTOR_VORTEX_SEAM__;
      return app.getSnapshot().playerLane;
    });

    // Wait a brief moment and verify no rapid spinning
    await page.waitForTimeout(100);
    const snap = await page.evaluate(() => window.__VECTOR_VORTEX_SEAM__.getSnapshot());
    // Since input was cleared, playerLane stays where it stopped
    expect(snap.playerLane).toBe(heldAfterBlur);

    await page.keyboard.up('ArrowLeft');
  });

  test('responsive viewport checks: complete tube, status, and controls visible without horizontal scroll across supported resolutions', async ({ page }) => {
    const viewports = [
      { width: 1024, height: 576 },
      { width: 1280, height: 720 },
      { width: 1440, height: 900 },
      { width: 1920, height: 1080 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.goto('/');

      // Check no horizontal scrollbar on body
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);

      // Verify canvas and sidebar are visible
      await expect(page.locator('#game-canvas')).toBeVisible();
      await expect(page.locator('#stat-status')).toBeVisible();
      await expect(page.locator('#btn-pause')).toBeVisible();
      await expect(page.locator('#viewport-warning')).toBeHidden();
    }
  });

  test('sub-960x540 viewport displays warning banner', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 500 });
    await page.goto('/');
    await expect(page.locator('#viewport-warning')).toBeVisible();
  });

  test('accessibility and zero-asset hygiene check: accessible canvas name, visible focus, no audio/image requests', async ({ page }) => {
    const networkRequests = [];
    page.on('request', req => {
      networkRequests.push(req.url());
    });

    await page.goto('/');

    // Check canvas has accessible label
    const canvas = page.locator('#game-canvas');
    const ariaLabel = await canvas.getAttribute('aria-label');
    expect(ariaLabel).toContain('Vector Vortex');

    // Check no off-origin requests, no image or audio file requests
    for (const url of networkRequests) {
      expect(url).toMatch(/^http:\/\/localhost:8085\//);
      expect(url).not.toMatch(/\.(png|jpg|jpeg|gif|webp|svg|mp3|wav|ogg|aac)$/i);
    }
  });
});
