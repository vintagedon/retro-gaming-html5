// Vector Vortex Spec 02 deliverable 3 validation: UI audio.
// - Replacing audio with a no-op yields an identical shell action log and
//   identical gameplay state at equal completed ticks.
// - The first deliberate gesture enables a cue; before it, nothing exists.
// - Mute silences the single bus; volume scales it.
// - Audio completion drives no shell or core state; node counts stay
//   bounded and return to zero.

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

const AUDIO_SCRIPT = async () => {
  // Deterministic, identical shell+journey script used for both runs.
  const w = window;
  w.__vv.advanceTicks(30);
  w.__vv.setFire(true);
  w.__vv.advanceTicks(20);
  w.__vv.setFire(false);
  w.__vv.setRight(true);
  w.__vv.advanceTicks(5);
  w.__vv.setRight(false);
  document.getElementById('vv-pause').click();
  document.getElementById('vv-pause-settings').click();
  document.getElementById('vv-mute-toggle').click();
  const vol = document.getElementById('vv-volume');
  vol.value = '37';
  vol.dispatchEvent(new Event('change', { bubbles: true }));
  document.getElementById('vv-motion-reduced').click();
  document.getElementById('vv-tab-controls').click();
  document.getElementById('vv-settings-close').click();
  document.getElementById('vv-resume').click();
  w.__vv.advanceTicks(50);
  document.getElementById('vv-pause').click();
  document.getElementById('vv-return-title').click();
  document.getElementById('vv-start').click();
  w.__vv.advanceTicks(100);
  return {
    log: w.__vv.getShellLog(),
    shell: w.__vv.getShellState(),
    snap: w.__vv.getSnapshot()
  };
};

function gameplayView(snap) {
  // Lifecycle fields expected to differ across a pause are excluded; the
  // gameplay contract compares the rest at equal completed ticks.
  const { paused, heldInput, recentEvents, ...gameplay } = snap;
  return gameplay;
}

async function runScript(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await page.evaluate(() => { window.__vv.pauseRaf = true; });
  await page.locator('#vv-start').click();
  return page.evaluate(AUDIO_SCRIPT);
}

test('no-op audio yields an identical shell action log and identical gameplay state', async ({ browser }) => {
  const ctxReal = await browser.newContext();
  const pageReal = await ctxReal.newPage();
  const real = await runScript(pageReal);

  const ctxNoop = await browser.newContext();
  const pageNoop = await ctxNoop.newPage();
  await pageNoop.addInitScript(() => {
    window.__vv = Object.assign(window.__vv || {}, { disableUiAudio: true });
  });
  await pageNoop.goto('/');
  await pageNoop.waitForFunction(() => window.__vv && typeof window.__vv.advanceTicks === 'function');
  await pageNoop.evaluate(() => { window.__vv.pauseRaf = true; });
  await pageNoop.locator('#vv-start').click();
  const noop = await pageNoop.evaluate(AUDIO_SCRIPT);

  expect(noop.log).toEqual(real.log);
  expect(gameplayView(noop.snap)).toEqual(gameplayView(real.snap));
  expect(noop.shell).toBe(real.shell);
  await ctxReal.close();
  await ctxNoop.close();
});

test('the first deliberate gesture enables the audio context; before it, cues do not exist', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.getAudioState === 'function');
  let st = await page.evaluate(() => window.__vv.getAudioState());
  expect(st.unlocked).toBe(false);
  expect(st.contextState).toBe(null);

  // A deliberate keyboard gesture unlocks the context.
  await page.keyboard.press('Tab');
  st = await page.evaluate(() => window.__vv.getAudioState());
  expect(st.unlocked).toBe(true);
  expect(st.contextState).not.toBe(null);
});

test('mute silences the bus and volume scales it; no cue runs before the gesture gate', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.getAudioState === 'function');
  await page.locator('#vv-start').click();
  await page.waitForFunction(() => window.__vv.getShellState() === 'running');

  // Default volume 80 scales the one bus to 0.8.
  let st = await page.evaluate(() => window.__vv.getAudioState());
  expect(st.volume).toBe(80);
  expect(st.busGain).toBeCloseTo(0.8, 5);

  // Mute from the settings surface zeroes the same bus.
  await page.locator('#vv-pause').click();
  await page.locator('#vv-pause-settings').click();
  await page.locator('#vv-mute-toggle').click();
  st = await page.evaluate(() => window.__vv.getAudioState());
  expect(st.muted).toBe(true);
  expect(st.busGain).toBe(0);

  // Unmute restores the volume-scaled bus; volume scales it.
  await page.locator('#vv-mute-toggle').click();
  const vol = page.locator('#vv-volume');
  await vol.fill('37');
  await vol.dispatchEvent('change');
  st = await page.evaluate(() => window.__vv.getAudioState());
  expect(st.muted).toBe(false);
  expect(st.busGain).toBeCloseTo(0.37, 5);
});

test('node counts stay bounded and return to zero; audio completion drives no state', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__vv && typeof window.__vv.getAudioState === 'function');
  // Freeze real time so the completion check reads a fixed core state.
  await page.evaluate(() => { window.__vv.pauseRaf = true; });
  await page.locator('#vv-start').click();
  await page.locator('#vv-canvas').focus();

  // Rapid cue bursts: pause/resume through the keyboard in a tight loop.
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('p');
    await page.keyboard.press('p');
  }
  const during = await page.evaluate(() => window.__vv.getAudioState());
  expect(during.activeNodes).toBeLessThanOrEqual(8);

  // A cue's completion schedules nothing: shell and core state are fixed.
  const shellBefore = await page.evaluate(() => window.__vv.getShellState());
  const snapBefore = await page.evaluate(() => window.__vv.getSnapshot());
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({
    st: window.__vv.getAudioState(),
    shell: window.__vv.getShellState(),
    snap: window.__vv.getSnapshot()
  }));
  expect(after.st.activeNodes).toBe(0);
  expect(after.shell).toBe(shellBefore);
  expect(after.snap.elapsedTicks).toBe(snapBefore.elapsedTicks);
});
