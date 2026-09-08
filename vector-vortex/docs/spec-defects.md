# Vector Vortex Spec 01 — Spec Defects Observed

These items are observations made while implementing Deliverables 1 and 2. They are not yet incorporated into the spec; the formal defect-register writeup arrives in Deliverable 4.

## Director band 2 first-spawn index (Deliverable 2)

The spec's frozen game contract states (lines 142–143 of the authoritative spec):

> A band's first spawn occurs after exactly one full interval of that band has been completed. Band 1's first spawn is on the tick with index 59, its second on index 119. Band 2 begins at index 3,600 and its first spawn is on index 3,659. The same construction applies to bands 3 and 4.

For band 1, interval 60 → first spawn 59 = `bandStart + (interval - 1)`. The construction applies uniformly to bands 1, 3, and 4:

| Band | Interval | `bandStart + (interval - 1)` | Spec explicit value |
|---|---:|---:|---:|
| 1 | 60 | 59 | 59 (matches) |
| 2 | 48 | 3,647 | **3,659** (spec pins; construction would yield 3,647) |
| 3 | 36 | 10,835 | 10,835 (matches) |
| 4 | 27 | 14,426 | 14,426 (matches) |

The validation box for Deliverable 2 explicitly references both "index 59 for band 1 and index 3,659 for band 2," so band 2's first spawn is authoritative at 3,659 rather than 3,647. The implementation in `vector-vortex/game/core/director.js` therefore carries an explicit `firstSpawn` per band (rather than computing uniformly), with a comment that flags this as a documented spec wording inconsistency. The validation box is satisfied against the explicit values.

**Status:** Implemented per the explicit spec values; flagged here for the maintainer. A future spec amendment should either (a) align band 2 to the construction (3,647) or (b) restate the construction in a way that yields 3,659 for band 2 specifically.

## Floating-point accumulator slack (Deliverable 1)

The fixed-step accumulator accumulates floating-point deltas across many frames. At 144 Hz with 144 pushes of `1/144`, IEEE-754 summation rounds to slightly under 1.0 s, so the accumulator drains 59 ticks instead of 60. The same input at 60 Hz drains 60 ticks exactly. The 60 Hz/30 Hz/144 Hz digest-equality test therefore requires either (a) padding the higher-rate run with a trailing delta to align tick counts, or (b) testing equality of authoritative state fields that ignore FP slack in the tick count.

**Status:** Mitigated in test code by explicit padding. The spec's "identical authoritative digest" language requires careful interpretation: identical after real-time alignment, not necessarily identical tick index.

## No author-visible test for "renaming any single test file changes the reported count" (Deliverable 1)

The spec names this as a mutation but does not require an automated test for it; it is validated by external inspection. The `tests/core/discovery.test.js` file proves that the explicit file list is non-empty and that each listed file exists on disk, which is the closest automated check.

## Buggy mutation helpers were considered and dropped (Deliverable 1)

During planning I created `game/core/clock-mutation.js` and `game/core/rng-mutation.js` helpers that implement the named mutations for comparison. The clock mutation helper was eventually removed because the test design moved to a side-by-side comparison in-test rather than a separate helper file. The RNG mutation helper remains in `game/core/rng-mutation.js` and is excluded from production imports; the source-purity test does not flag it (it is not a rules module — it is a test-only mutation harness). Deliverable 2's purity check continues to exclude `-mutation.js` files.

If D3/D4 want a permanent mutation helper directory, it should live under `tests/_mutations/` rather than `game/core/` to keep the rules purity check clean.

## Clock tick bound (Deliverable 1)

The current clock consumes accumulator down by exactly `TICK_SECONDS` per drained tick. With FP slack this can leave a sub-tick remainder that does not drain until the next push. There is no upper bound on the number of ticks drained per push, which means a single very large (but clamped) frame could drain many ticks at once. The spec asks the clock to drain "more than one input sample per tick" as a mutation — which we read as: a single input action should not be drained multiple times per tick. Our model uses held input (no per-action queue), so this mutation manifests only as: "actions queued between ticks are not batched into one tick." The test verifies that batching changes the digest.

The spec's stricter "drain at most one input sample per tick" wording, if applied to a queue-based input adapter that D3 will introduce, must be enforced there.

## Replay test action placement was frame-indexed (Deliverable 2 fix)

The D1 replay test dispatched actions when the frame index `i` matched the action's tick index. At 60 Hz that aligns (frame 5 = tick 5), but at 30 Hz and 144 Hz the alignment breaks: frame 5 corresponds to different simulation ticks at different frame rates. With D1 this divergence happened to produce identical snapshots because the action log only toggled held input flags. With D2 the divergence surfaced in shot timing and lane state.

**Status:** Fixed in `tests/core/replay.test.js`. The replay helper now dispatches each action when the simulation's elapsed tick index first reaches or exceeds the action's tick index. The 144 Hz padded run uses the same dispatch-by-elapsed-tick logic.

## Purity regex matches comments (Deliverable 2)

The purity test regex `\bwindow\b` matches the substring "window" inside comments. Deliverable 2's first draft of `breach.js` and `director.js` triggered the regex from comments that used the word "window" in a non-API sense (e.g., "grace window", "run window"). Reworded the comments to use "grace period" and "run bounds" respectively.