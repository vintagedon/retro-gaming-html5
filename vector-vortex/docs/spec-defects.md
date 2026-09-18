<!--
---
title: "Vector Vortex Spec Defects Observed"
description: "Spec defects observed while implementing Vector Vortex Spec 01 and its 01b and 01c amendments"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-18"
version: "0.5.0"
status: "Active"
tags:
  - type: defect-log
  - domain: documentation
  - tech: [markdown]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Spec 01: Deterministic Core Playable](../../docs/specs/spec-01-vector-vortex-core-playable.md)"
  - "[Game README](../README.md)"
  - "Central Spec Defect Register (in central spec queue)"
-->

# Vector Vortex Spec 01 and 01b: Spec Defects Observed

These items are observations made while implementing Deliverables 1 through 4 of Spec 01 and the Spec 01b and 01c amendments (01c pass 1 plus its continuation). The two Spec 01 defects corrected by 01b are also recorded in the central spec defect register with spec attribution, as is the 01c multi-drain strike below.

## Named multi-drain mutation requirement struck (Spec 01 v3.0/01b, struck by the 01c continuation)

The tracked spec's Drain-clause disposition states it is recorded here; this entry is that record, reconciling the register with the amendment. The Deliverable 1 requirement for a named "draining more than one input sample per tick" mutation is struck by Amendment 01c's continuation. Cross-rate digest equality cannot discriminate that mutation: every schedule replays the identical action log, so any per-tick input-evaluation mistake occurs identically at every rate and the digests still agree. The only mutation test written for the clause compared two different action schedules and passed for a reason unrelated to the mutation, which is why 01c pass 1 deleted it as hollow. The frame-delta cap mutation remains the clock's discriminating check. Positive evidence for correct input timing comes from the restored action-log fixture: a delivery record asserting every entry is dispatched once before its named simulation tick in order, plus expected movement and firing assertions against the resulting core. No replacement mutation wrapper is required. The central register carries the same record as SD-198.

## Director band 2 first-spawn index (Spec 01 v3.0, corrected by Spec 01b D1.1)

Spec 01 v3.0 stated the construction "A band's first spawn occurs after exactly one full interval of that band has been completed" and then pinned band 2's first spawn at 3,659 by an explicit `firstSpawn` table. The construction uniformly yields 3,647 for band 2. The construction is authoritative; band 2's first spawn is 3,647.

This defect was found by the executing occupant's own analysis (not by external review). The Spec 01b amendment adopts the corrected value and removes the per-band explicit `firstSpawn` field. The director computes the first spawn uniformly as `bandStart + (interval - 1)`.

## Unsatisfiable retirement rule (Spec 01 v3.0, corrected by Spec 01b D1)

Spec 01 v3.0's retirement rule required a `recycle-bin/` addition in the same commit as a deletion, and `recycle-bin/` is gitignored, so no such addition can appear in a commit. The rule also contradicts the target `AGENTS.md`, which states that a superseded spec is marked `deprecated` with a pointer to its replacement.

The corrected rule: specifications are the public record and are never moved to `recycle-bin/`. A superseded specification stays tracked at its existing path with frontmatter `status: deprecated` and a `superseded_by` pointer to its replacement. `recycle-bin/` remains correct for retired non-specification content.

## Floating-point accumulator slack at 144 Hz (Spec 01 v3.0, corrected by Spec 01b D1.4)

Spec 01 v3.0 required one identical authoritative digest across 30, 60, and 144 Hz schedules. Floating-point accumulator slack makes that false as written: 144 summed pushes of `1/144` round to slightly under one second, so a 144 Hz run drains 59 ticks where a 60 Hz run drains 60. The corrected requirement is digest equality after real-time alignment, with the alignment method stated in the test and the residual tick-count difference asserted as at most one.

This correction originated from the executing occupant's own analysis (not by external review) and is adopted by the Spec 01b amendment.

## Render-schedule test residual assertion

The 144 Hz test asserts `Math.abs(ticks - 60) <= 1`. The multi-schedule test asserts pairwise tick differences `<= 1` after a tail-push real-time alignment. Both are part of the corrected contract.

## Mutation-test integrity standard (Spec 01 v3.0, superseded by Spec 01b Test Integrity Standard)

Spec 01 v3.0 required every validation box to "name a mutation." The execution produced named mutations that did not discriminate: a rebind test that passed under its own rebind mutation, a buggy RNG twin misaligned by one draw, a canvas balance check that rendered nothing, a digest test that ignored three fields, and a denominator assertion comparing a pure call to itself. Spec 01b replaces "name a mutation" with "execute the mutation and observe failure." A mutation test that cannot be shown to fail is a failed gate.

## Mutation helpers and the purity check

The Spec 01 v3.0 implementation placed `rng-mutation.js` under `game/core/` and excluded `-mutation.js` files from the purity check by convention rather than by enforcement. Spec 01b relocates mutation helpers to `tests/_mutations/` and adds an explicit assertion that the purity check rejects any `-mutation.js` file under `game/core/`. The check and its documentation now agree.

## Buggy mutation helpers were considered and dropped

During D1 planning I created `game/core/clock-mutation.js` and `game/core/rng-mutation.js` helpers that implement the named mutations for comparison. The clock mutation helper was eventually removed because the test design moved to a side-by-side comparison in-test rather than a separate helper file. The RNG mutation helper now lives under `tests/_mutations/int-buggy.js`.

## Clock tick bound

The clock consumes the accumulator down by exactly `TICK_SECONDS` per drained tick. With FP slack this can leave a sub-tick remainder that does not drain until the next push. There is no upper bound on the number of ticks drained per push, which means a single very large (but clamped) frame could drain many ticks at once. The Spec 01 v3.0 mutation "drain more than one input sample per tick" was struck by the 01c continuation (see the disposition entry above); the frame-delta cap mutation is the surviving discriminating check for catch-up behavior.

## Replay test action placement was frame-indexed

The D1 replay test dispatched actions when the frame index `i` matched the action's tick index. At 60 Hz that aligns (frame 5 = tick 5), but at 30 Hz and 144 Hz the alignment breaks. D2 fixed the dispatch-by-elapsed-tick logic.

## Purity regex matches comments

The purity test regex `\bwindow\b` matches the substring "window" inside comments. Wording such as "grace window" or "run window" triggered the regex. The comments in `breach.js` and `director.js` were reworded to "grace period" and "run bounds" respectively.

## Spec text references a served `game/` tree but the Playwright config uses port 8123

The Deliverable 3 plan text mentions "a fixed port fallback `http://127.0.0.1:8123`" and the validation box requires the suite to start its own server. The implementation chose port 8123 for the `webServer` and `use.baseURL`. The plan's viewport list is the spec's playable desktop contract; the CSS additionally shows a warning below 960x540.

## Mutation harness uses `addInitScript` and `window.__vv` flag preservation

The plan text suggests either monkey-patching `window.__vv` from a separate `input.mutation.js` or using early-return guards. The implementation chose the early-return guard approach: each toggle is a small branch that the input adapter, frame runner, or renderer consults. The orchestrator (`main.js`) preserves any properties a test set via `addInitScript` by merging `window.__vv` with the seam object.