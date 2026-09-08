# Vector Vortex Spec 01 — Spec Defects Observed in Deliverable 1

These items are observations made while implementing Deliverable 1. They are not yet incorporated into the spec; the formal defect-register writeup arrives in Deliverable 4.

## Floating-point accumulator slack

The fixed-step accumulator accumulates floating-point deltas across many frames. At 144 Hz with 144 pushes of `1/144`, IEEE-754 summation rounds to slightly under 1.0 s, so the accumulator drains 59 ticks instead of 60. The same input at 60 Hz drains 60 ticks exactly. The 60 Hz/30 Hz/144 Hz digest-equality test therefore requires either (a) padding the higher-rate run with a trailing delta to align tick counts, or (b) testing equality of authoritative state fields that ignore FP slack in the tick count.

**Status:** Mitigated in test code by explicit padding. The spec's "identical authoritative digest" language requires careful interpretation: identical after real-time alignment, not necessarily identical tick index.

## No author-visible test for "renaming any single test file changes the reported count"

The spec names this as a mutation but does not require an automated test for it; it is validated by external inspection. The `tests/core/discovery.test.js` file proves that the explicit file list is non-empty and that each listed file exists on disk, which is the closest automated check.

## Buggy mutation helpers were considered and dropped

During planning I created `game/core/clock-mutation.js` and `game/core/rng-mutation.js` helpers that implement the named mutations for comparison. The clock mutation helper was eventually removed because the test design moved to a side-by-side comparison in-test rather than a separate helper file. The RNG mutation helper remains in `game/core/rng-mutation.js` and is excluded from production imports; the source-purity test does not flag it (it is not a rules module — it is a test-only mutation harness).

If D2/D3 want a permanent mutation helper directory, it should live under `tests/_mutations/` rather than `game/core/` to keep the rules purity check clean.

## Clock tick bound

The current clock consumes accumulator down by exactly `TICK_SECONDS` per drained tick. With FP slack this can leave a sub-tick remainder that does not drain until the next push. There is no upper bound on the number of ticks drained per push, which means a single very large (but clamped) frame could drain many ticks at once. The spec asks the clock to drain "more than one input sample per tick" as a mutation — which we read as: a single input action should not be drained multiple times per tick. Our model uses held input (no per-action queue), so this mutation manifests only as: "actions queued between ticks are not batched into one tick." The test verifies that batching changes the digest.

The spec's stricter "drain at most one input sample per tick" wording, if applied to a queue-based input adapter that D3 will introduce, must be enforced there.