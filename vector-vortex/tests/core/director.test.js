import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bandForTick, shouldSpawnOnTick, nextSpawnTickAfter, createDirector, BANDS, firstSpawnForBand } from '../../game/core/director.js';

test('BANDS table carries window and interval only; first spawn is computed uniformly per the corrected construction', () => {
  for (const b of BANDS) {
    assert.ok(typeof b.start === 'number' && typeof b.end === 'number' && typeof b.interval === 'number');
    assert.equal(b.firstSpawn, undefined, 'per-band explicit firstSpawn removed; construction is authoritative');
  }
});

test('bandForTick maps every tick 0..17999 to its band', () => {
  for (let t = 0; t < 18000; t++) {
    const b = bandForTick(t);
    assert.ok(b.start <= t && t <= b.end, `tick ${t} not in band ${b.start}..${b.end}`);
  }
  assert.equal(bandForTick(0).interval, 60);
  assert.equal(bandForTick(3599).interval, 60);
  assert.equal(bandForTick(3600).interval, 48);
  assert.equal(bandForTick(10799).interval, 48);
  assert.equal(bandForTick(10800).interval, 36);
  assert.equal(bandForTick(14399).interval, 36);
  assert.equal(bandForTick(14400).interval, 27);
  assert.equal(bandForTick(17999).interval, 27);
});

test('shouldSpawnOnTick: exact band-1 spawn ticks 59 and 119', () => {
  const b1 = bandForTick(59);
  assert.equal(shouldSpawnOnTick(59, b1), true);
  assert.equal(shouldSpawnOnTick(119, b1), true);
  assert.equal(shouldSpawnOnTick(60, b1), false);
  assert.equal(shouldSpawnOnTick(0, b1), false);
  assert.equal(shouldSpawnOnTick(58, b1), false);
});

test('shouldSpawnOnTick: exact band-2 first spawn 3647, second 3695', () => {
  const b2 = bandForTick(3647);
  assert.equal(shouldSpawnOnTick(3647, b2), true);
  assert.equal(shouldSpawnOnTick(3695, b2), true);
  assert.equal(shouldSpawnOnTick(3646, b2), false);
  assert.equal(shouldSpawnOnTick(3648, b2), false);
  assert.equal(shouldSpawnOnTick(3659, b2), false, 'the erroneous 3659 explicit value must NOT spawn under the corrected construction');
});

test('shouldSpawnOnTick: exact band-3 first spawn 10835, second 10871', () => {
  const b3 = bandForTick(10835);
  assert.equal(shouldSpawnOnTick(10835, b3), true);
  assert.equal(shouldSpawnOnTick(10871, b3), true);
  assert.equal(shouldSpawnOnTick(10800, b3), false);
  assert.equal(shouldSpawnOnTick(10834, b3), false);
});

test('shouldSpawnOnTick: exact band-4 first spawn 14426, second 14453', () => {
  const b4 = bandForTick(14426);
  assert.equal(shouldSpawnOnTick(14426, b4), true);
  assert.equal(shouldSpawnOnTick(14453, b4), true);
  assert.equal(shouldSpawnOnTick(14400, b4), false);
  assert.equal(shouldSpawnOnTick(14425, b4), false);
});

test('MUTATION one-tick offset in either direction makes a band-1/band-2 spawn assertion fail', () => {
  const b1 = bandForTick(59);
  assert.notEqual(shouldSpawnOnTick(58, b1), true, 'tick 58 must NOT spawn (off-by-one)');
  assert.notEqual(shouldSpawnOnTick(60, b1), true, 'tick 60 must NOT spawn (off-by-one)');
  const b2 = bandForTick(3647);
  assert.notEqual(shouldSpawnOnTick(3646, b2), true);
  assert.notEqual(shouldSpawnOnTick(3648, b2), true);
});

test('director with fixed seed produces identical lane sequence across two runs', () => {
  function runSequence(seed) {
    const dir = createDirector({ seed });
    const lanes = [];
    for (let t = 0; t < 3660; t++) {
      const out = dir.tickSpawned({ elapsedTicks: t });
      if (out) lanes.push(out.lane);
    }
    return lanes;
  }
  const a = runSequence(0xC0FFEE);
  const b = runSequence(0xC0FFEE);
  assert.deepEqual(a, b);
  assert.ok(a.length > 0);
  for (const l of a) {
    assert.ok(Number.isInteger(l));
    assert.ok(l >= 0 && l <= 23);
  }
});

test('nextSpawnTickAfter returns the next spawn tick within the band', () => {
  const b1 = bandForTick(59);
  assert.equal(nextSpawnTickAfter(0, b1), 59);
  assert.equal(nextSpawnTickAfter(59, b1), 119);
  assert.equal(nextSpawnTickAfter(60, b1), 119);
});

test('firstSpawnForBand computes bandStart + interval - 1 uniformly for every band', () => {
  for (const b of BANDS) {
    const expected = b.start + (b.interval - 1);
    assert.equal(firstSpawnForBand(b), expected, `band ${b.start} expected first spawn ${expected}`);
  }
  const b1 = BANDS[0];
  const b2 = BANDS[1];
  const b3 = BANDS[2];
  const b4 = BANDS[3];
  assert.equal(firstSpawnForBand(b1), 59);
  assert.equal(firstSpawnForBand(b2), 3647);
  assert.equal(firstSpawnForBand(b3), 10835);
  assert.equal(firstSpawnForBand(b4), 14426);
});

test('MUTATION off-by-one in firstSpawnForBand construction fails the uniform-value assertion', () => {
  for (const b of BANDS) {
    const correct = b.start + (b.interval - 1);
    const minus1 = b.start + (b.interval - 2);
    const plus1 = b.start + b.interval;
    assert.notEqual(firstSpawnForBand(b), minus1, `band ${b.start}: minus1 must not equal correct`);
    assert.notEqual(firstSpawnForBand(b), plus1, `band ${b.start}: plus1 must not equal correct`);
    assert.equal(firstSpawnForBand(b), correct);
  }
});

test('D1 validation: director first-spawn indices 59, 3647, 10835, 14426 are produced at the fixed seed', () => {
  const dir = createDirector({ seed: 0xC0FFEE });
  const expectedFirsts = [59, 3647, 10835, 14426];
  const seenFirsts = new Set();
  const lanes = [];
  for (let t = 0; t < 18000; t++) {
    const out = dir.tickSpawned({ elapsedTicks: t });
    if (out) {
      if (expectedFirsts.includes(t)) seenFirsts.add(t);
      lanes.push({ tick: t, lane: out.lane });
    }
  }
  for (const f of expectedFirsts) {
    assert.ok(seenFirsts.has(f), `expected first-spawn tick ${f} to be produced; got firsts ${[...seenFirsts].sort((a,b)=>a-b)}`);
  }
});