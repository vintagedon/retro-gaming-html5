import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Mulberry32 } from '../../game/src/core/rng.js';

describe('Mulberry32 seeded RNG', () => {
  it('generates deterministic float sequence for same seed', () => {
    const rng1 = new Mulberry32(12345);
    const rng2 = new Mulberry32(12345);
    const seq1 = [rng1.nextFloat(), rng1.nextFloat(), rng1.nextFloat()];
    const seq2 = [rng2.nextFloat(), rng2.nextFloat(), rng2.nextFloat()];
    assert.deepEqual(seq1, seq2);
  });

  it('generates integers in range [min, max]', () => {
    const rng = new Mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const val = rng.nextInt(0, 23);
      assert.ok(val >= 0 && val <= 23, `Value ${val} out of bounds`);
      assert.equal(Math.floor(val), val);
    }
  });

  it('supports state serialization and restoration', () => {
    const rng1 = new Mulberry32(999);
    rng1.nextFloat();
    const savedState = rng1.getState();
    const nextVal1 = rng1.nextFloat();

    const rng2 = new Mulberry32(0);
    rng2.setState(savedState);
    const nextVal2 = rng2.nextFloat();

    assert.equal(nextVal1, nextVal2);
  });
});
