<!--
---
title: "CargoLander Vertical Slice"
description: "Wireframe-arc rung 2. A playable lander in retro-gaming-html5 that consumes the published h5gameui kit as an outside consumer, driving the full meter family from a deterministic simulation, with survivable impacts and a limited craft count."
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-18"
version: "1.2"
status: "draft"
series: "cargo-lander"
tags:
  - type: specification
  - domain: [game-design, implementation]
  - tech: [javascript, html5, css, canvas-2d, playwright]
  - game: cargo-lander
  - series: cargo-lander
related_documents:
  - "[Agent Instructions](../../AGENTS.md)"
  - "[Pinned framework](https://github.com/vintagedon/html5-game-ui-framework/tree/a678a2b0f135a991b4eacb8e62ea8d94f20c4505/src)"
  - "[Pinned Vector Vortex clock](https://github.com/vintagedon/retro-gaming-html5/blob/cae9b1cc443384da2897b0ce2de026d1ce0a9593/vector-vortex/game/core/clock.js)"
---
-->

# CargoLander Vertical Slice

## Task: Wireframe arc, rung 2

Mode: Code
Startup: Read the target repository's `AGENTS.md`, then run the ML01 `spec-startup` environment and tool checks. Reuse the prepared `task/cargo-lander-vertical-slice` branch in `/opt/agents/worktrees/retro-gaming-html5-cargo-lander`, verify a clean tree, and record its base in the PR. This spec explicitly authorizes that worktree path. Do not execute the skill's default new-branch step, switch the shared checkout, or create a worklog. The repository lifecycle governs; report any remaining conflict before implementation.

Gates: G1 through G6.

**Revision note.** v1.2 incorporates the operator's review dispositions: main-based branch preparation, pinned local references, destruction-only craft consumption, complete HUD ratios, vertical segmented thrust, explicit runner stop/start, and the modern-to-arcade check before the shipping theme. The six implementation gates are unchanged.

**Spec authority and numbering.** The execution copy is `docs/specs/spec-04-cargo-lander-vertical-slice.md`, committed on the working branch with `status: draft` before G1. Update its validation boxes in each gate commit. The central queue file is the dispatch copy, not a second gate record. The operator reserves `spec-03` for the queued Vector Vortex successor and assigns `spec-04` to CargoLander; do not infer another number from an incomplete index. G6 updates the existing spec's status and adds its index row.

## Objective

A lander you can play at `retro-gaming-html5/cargo-lander/`, with the h5gameui meter family driving its HUD from real simulation state at sixty ticks a second. The kit is consumed the way a stranger would consume it, from outside its repository, through published CSS only.

This is the ladder's rung 2, the Lunar Lander rung: continuous physics, fuel and thrust, telemetry HUD, landing evaluation.

## Why this exists

The kit has nine core specimens, zero modules, and no consumer. The vertical segmented meter shipped a cross-axis defect into approved baselines and survived two review passes, because nothing was rendering it under changing values. A game is the check the harness cannot be. From here the framework takes its requirements from a consumer rather than from its own charter.

## Reference material

Three references with distinct roles:

1. **Blastemoids template readme**, staged at `reference-files/blastemoids/readme.md` inside the CargoLander worktree, with its `license.txt`. Source: `/opt/agents/repos/libraries/game-asset-packs/asset-packs/game-templates/blastemoids-html-game-template-free/`. Stage only those two files. The readme documents the config surface, state machine, storage triad, behavior tables, and input model in prose.
2. **Vector Vortex**, pinned to `cae9b1cc443384da2897b0ce2de026d1ce0a9593`. Extract only `vector-vortex/game/core/clock.js` and `vector-vortex/tests/core/purity.test.js` from that Git revision into the same relative paths under the worktree's `reference-files/`. These files are on an unmerged branch, not on main. Read them from the shared Git object store during preparation without merging the branch or switching checkouts. Reuse the clock behavior and purity rule; G1's real-file mutation is stronger than the reference's regex-on-literal check.
3. **h5gameui** published `src/` and `harness/goldens/README.md` at `a678a2b0f135a991b4eacb8e62ea8d94f20c4505`. Preserve the published CSS entry point's complete relative import tree and framework license when vendoring; do not float to a newer revision.

`reference-files/` is gitignored and local to this worktree; ignored files in another checkout are not shared. Preparation records source paths, the Vector Vortex commit and SHA-256 hashes in `reference-files/provenance.json`. References are authoring inputs only. A fresh public clone runs all validations from committed game files and fixtures without local references, a sibling framework checkout, or another game's source.

Two rules on the first of these, and they are separate rules.

**Do not open the template's `index.html`.** Its rendering technique and its aesthetic are the same thing, including in its HUD markup, where the lives indicator is built as an inline SVG string with a hardcoded phosphor color and a glow filter. Every previous attempt to work from that file produced a worse copy of it.

**Copy no pack source.** `AGENTS.md` requires that licensed packs are studied as shapes and that the implementer builds the described outcome. Shapes come from the readme's prose and get written fresh. Credit the template in the game's README regardless.

Do not read other games' source beyond the two Vector Vortex files named above.

## Execution Environment

| Item | Value |
|------|-------|
| Repo | `retro-gaming-html5`, new subfolder `cargo-lander/` |
| Branch | Existing `task/cargo-lander-vertical-slice`, based on main `c7f2d50ab3c6a0eb8b04bec1d89dcb8825d41c9c`; no unmerged Vector Vortex commits |
| Worktree | `/opt/agents/worktrees/retro-gaming-html5-cargo-lander`; reuse it so Vector Vortex work proceeds independently |
| Commits | One per gate, `feat(cargo-lander): <summary> (gate N)` |
| Record | The pull request and its per-gate commits. No work-log files; that is this repository's rule |
| Build | None. Plain ES modules and a static `index.html`. No bundler, no runtime dependency |
| Kit | Vendored under `cargo-lander/game/vendor/h5gameui/`, inside the published tree, with the source commit recorded beside it. `publish.sh` copies only `game/`, so a vendor directory outside it would never ship |
| Tests | Tracked Node and Chromium-headless Playwright development toolchain with lockfile; no global installs or dependencies on other checkouts |
| Reversal | `repo` |

## Scope

Create `cargo-lander/**`, including its own `AGENTS.md`, `README.md`, `publish.sh`, `consumer-report.md`, and `game/` tree. The report records the pinned kit revision, consumer checks, theme results, and any kit findings. Preparing a publisher does not authorize publishing or changing the preview server.

Outside that folder, tracked changes are limited to the prepared `.gitignore` entry for `reference-files/`, the public spec tracked before G1 and updated per gate, and one row each in the root README and `docs/specs/README.md` at G6. Local-only preparation may write the named files and provenance manifest under the worktree's ignored `reference-files/`. The sole additional closeout write is one row in `/opt/agents/repos/work-logs/work-registry.csv`; there is no separate worklog. Do not duplicate the already committed ignore entry. Shared documentation may need a small merge resolution if Vector Vortex lands first; game code remains independent.

Never modify the `html5-game-ui-framework` repository. A kit defect found here is reported in the pull request, not patched across the boundary.

## Deliverables

### G1 Simulation core

A pure lander simulation under `cargo-lander/game/core/`. No `window`, no `document`, no `Date.now`, no `performance.now`, no `Math.random`. Randomness comes from a seeded RNG whose state serializes with the snapshot.

Model: constant gravity, player rotation, thrust applying acceleration along the craft's facing and burning fuel, no thrust authority at empty. A landing site of declared width.

**Contact resolves three ways.** Within all tolerances over the site, the craft lands and sets `outcome: landed`. An unsafe contact below the configured hard-impact threshold loses one hull segment; at or above the threshold it sets hull to zero. Hull starts at three segments, so a pilot absorbs one or two gentle knocks before the third destroys that craft. Resolve each contact episode once; contact must cease before another impact can charge damage. A survivor remains playable and can take off again.

`craftRemaining` includes the current craft. Reaching zero hull sets `craftState: destroyed` and decrements the count exactly once. With craft remaining, the run's outcome stays null while waiting for an explicit retry. Retry restores initial pose, hull and fuel, clears control input and impact presentation, and preserves craft count, elapsed ticks, seed and current RNG state. Exhausting craft sets `outcome: run-over` immediately and rejects retry. Restart after either terminal outcome starts a fresh run.

On an unsafe contact, `hullPrevSegments` records the pre-impact hull, and `lastImpact` records gentle or hard. Retain this last-impact band until the next impact; retry/reset makes previous hull equal restored hull and clears `lastImpact`. The core owns that lifecycle. Any contact or control state required for exact continuation must serialize with the snapshot.

This is deliberate. Later work adds space weather and cargo types with sway, and a model where one mistake ends everything makes those additions unplayable rather than interesting.

Tuning lives in one `CONFIG` object with nested blocks: gravity, thrust acceleration and integer notch count of at least two, rotation rate, fuel capacity and burn rate, landing tolerances, hard-impact threshold, hull segments, starting craft. Define the impact measure and threshold units in the core; classify every unsafe contact without a gap between gentle and hard. Thrust is selectable in discrete notches, including off, at least one intermediate level and full; the selected level drives both acceleration and fuel burn. Empty fuel or a destroyed craft produces zero thrust. Retuning the feel must not require touching simulation code.

The snapshot is the only thing any adapter sees, and the core computes every value an adapter displays, including ratios, so no adapter divides:

```js
{
  seed, rngState, elapsedTicks, paused,
  outcome,                                    // null | 'landed' | 'run-over'
  craftState,                                 // 'flying' | 'landed' | 'destroyed'
  x, y, vx, vy, angle,
  fuel, fuelMax, fuelRatio,                   // 0..1, continuous meter
  hullSegments, hullSegmentsMax, hullRatio,   // segmented meter
  hullPrevSegments, hullPrevRatio,             // previous hull and its 0..1 ratio
  thrustLevel, thrustNotchesMax,               // 0..1 notch fraction; count at least two
  craftRemaining, craftMax, craftRatio,        // pips and their 0..1 ratio
  lastImpact,                                 // null | 'gentle' | 'hard'
  altitudeDisplay, velocityDisplay, fuelDisplay,
  recentEvents                                // bounded ring, newest last
}
```

All ratios, including `thrustLevel`, are bounded 0..1 values computed by the core. The listed fields are required; any additional continuation state needed by the chosen integrator, controls, or contact handling must also round-trip through JSON. Adapters do not inspect that continuation state. Matching CSS units is presentation formatting, not permission to recompute game ratios in the projector.

**Validation:**

- [x] A source scan over `game/core/` rejects the forbidden APIs. Its mutation gate writes a real file containing `Math.random` into a temporary copy of the core directory and asserts the scan fails on it. A regex asserted against a string literal does not satisfy this
- [x] Same seed and same action script produce identical snapshots after 5,000 ticks
- [x] A snapshot serialized to JSON after the RNG has advanced continues with identical subsequent draws and snapshots; repeat continuation across a contact/retry boundary so omitted contact or control state cannot pass unnoticed
- [x] Each landing tolerance is proven separately: four runs violating exactly one of vertical speed, horizontal speed, tilt, and site position each fail to land, and the run inside all four lands
- [x] The three contact outcomes are proven distinctly: a gentle impact leaves the craft flying with one fewer hull segment, a hard impact destroys the craft, and a third gentle impact on a three-segment hull destroys it
- [x] Destruction sets hull to zero and decrements `craftRemaining` exactly once; retry restores pose, hull and fuel while preserving the resulting count, elapsed ticks and RNG state, and resetting control input and the impact trail
- [x] Remaining in one contact episode causes no repeated hull or craft charge; a survivor can take off and a later distinct contact can cause another impact
- [x] Exhausting the craft count sets `outcome` to `run-over`, and no further retry is accepted
- [x] A run burns to empty without negative fuel; requesting full thrust then produces zero `thrustLevel` and the same next-tick velocity as coasting from the identical empty-fuel state

### G2 Runtime spine

A fixed-step clock and frame runner under `cargo-lander/game/runtime/`, taking Vector Vortex's clock behavior: a passive accumulator that clamps any frame delta above 250ms, refuses to accumulate while paused or while the tab is hidden, and hands whole ticks to the core under a bounded drain loop. At sixty ticks a second the clamp admits fifteen ticks from one frame, which is the ceiling the drain loop must tolerate without falling behind or looping unbounded.

A deterministic seam on `window.__cl` exposes `stop()`, `start()`, `advanceTicks(n)`, `reset(seed)`, `getSnapshot()`, and input dispatch. `stop()` cancels the runner's scheduled animation frame and relinquishes automatic advancement; it does not set the core's gameplay pause flag. Tests stop the runner before resetting or advancing manually. `advanceTicks(n)` rejects use while the runner is running. `reset(seed)` preserves the runner's stopped/running mode.

`start()` resumes the ordinary runner with a fresh time origin and no stopped-time backlog. Both lifecycle methods are idempotent: repeated start cannot create a second frame chain. Pause and visibility restoration also rebase the runner timestamp, with hidden/paused time excluded. Test toggles do not go in the frame loop; these are runner lifecycle operations, not a per-frame test-flag branch.

**Validation:**

- [x] The clock is tested directly with synthetic deltas, no browser: a 10-second gap contributes fifteen ticks, not 600
- [x] Time passed while hidden produces no ticks, and the first visible frame produces no burst
- [x] Pausing stops tick advancement, and resuming does not replay the paused interval
- [x] After `stop()`, manual advancement adds exactly the requested active ticks and browser animation-frame opportunities add none; `start()` resumes ordinary advancement without replaying stopped time, and repeated start/stop calls do not create duplicate runners
- [x] The frame loop contains no branch that reads a test flag

### G3 HUD as an outside consumer

The HUD is built from the vendored kit CSS only. No import from the framework's `harness/`, no copied specimen builder, no reach into the framework repo at runtime or build time. Per `AGENTS.md` the game builds its own theme layer on the framework's tokens and uses the framework's real primitives.

| Channel | Kit shape |
|---|---|
| Fuel | continuous meter |
| Hull integrity | segmented meter |
| Thrust output | vertical segmented meter driven by the actual discrete thrust notches |
| Craft remaining | pips |
| Last impact | damage trail on the hull meter |

A projector takes a snapshot and writes the DOM, holding a last value per field so it touches an element only when that value changed. It copies display strings verbatim and formats core ratios as the kit's percentage-valued `--gc-meter-value` and `--gc-meter-trail-value`; unit conversion is allowed, division of game quantities is not. Set `--gc-meter-segments` from `hullSegmentsMax` or `thrustNotchesMax` and `--gc-meter-pips` from `craftMax`, rather than relying on kit defaults. Do not import CONFIG into the HUD.

**Validation:**

- [x] Synthetic snapshots cover zero, an intermediate fraction and full for continuous values, and zero units, one unit and maximum for counted meters; segment/pip capacities match the snapshot
- [x] The actual vertical segmented thrust meter holds full track width at zero, an intermediate notch and full, with quantized height; a bounded consumer fixture exercises the same vertical segmented markup with both fill and trail so both repaired selectors are covered
- [x] Re-projecting an unchanged snapshot performs no DOM writes, asserted by counting mutations
- [x] A scan asserts the HUD imports nothing outside `cargo-lander/`; G3 vendoring compares CSS bytes with the pinned published revision and records per-file hashes and the license. Fresh-clone checks use the committed manifest and vendor files without a sibling framework checkout
- [x] A browser check serves only the isolated `game/` tree and loads all CSS imports successfully, with rendered kit appearance and no asset requests outside that tree

### G4 Stage

One 1920x1080 logical CSS-pixel stage, scaled uniformly by `min(hostWidth / 1920, hostHeight / 1080)` and centered with letterboxing, per the framework charter. Canvas playfield inside it, HUD chrome around it. No responsive game layout, no second breakpoint. Stage-internal geometry and typography use stage coordinates, not raw viewport units; needed composition overrides belong to the consumer, with vendor files unchanged.

**Validation:**

- [x] At 1920x1080, 2560x1440, 3840x2160, and one deliberately awkward window, stage bounds match the fit formula and centering, the HUD keeps its logical position relative to the playfield, and authored content has no unintended overflow
- [x] Assert `canvas.width` and `canvas.height` against its displayed CSS-pixel dimensions after stage scaling multiplied by emulated DPR, allowing integer rounding, at DPR 1 and 2; the drawing transform retains logical stage coordinates

### G5 Playable slice and theme layer

It plays. Rotate, choose thrust notches, land, take damage, lose a craft, retry, run out, and restart. Build on `modern`, then flip to `arcade` and prove the stock kit contract, then add the game's own token theme as the shipping appearance. Preserve that order.

**The stock flip is the kit experiment.** Hold snapshot, HUD markup, game rules and consumer composition fixed; changing only `html[data-gc-theme]` from `modern` to `arcade` must visibly change representative meter and chrome styles while preserving correct values and usable geometry. This checks the framework-backed DOM HUD, not a requirement to recolor canvas pixels through CSS.

After that passes, the custom theme changes the theme attribute and adds token overrides, with no meter reimplementation. Diagnose missing vendor files and consumer overrides before assigning a kit defect. A kit failure blocks the gate with reproduction evidence in `consumer-report.md` and the PR; recording failure does not make a validation pass or authorize a framework patch.

**Validation:**

- [ ] One stopped-runner Playwright flow drives a full run through the seam, deterministically, from launch to `landed`, asserting the HUD agrees with the snapshot at three checkpoints
- [ ] A second stopped-runner flow takes a gentle impact and then a hard one, verifies hull/trail/craft count, retries without another decrement, and reaches `run-over` only when the final craft is destroyed
- [ ] One flow uses ordinary keyboard input and the running frame loop, without manual tick advancement, proving rotation, intermediate/full thrust notches and retry/restart controls respond
- [ ] With the same snapshot and markup, the modern-to-arcade attribute-only flip changes computed styles on at least one meter and one chrome surface while preserving correct values and usable geometry; the custom token theme is applied only after this check passes and receives the same checks
- [ ] Zero console errors across all flows
- [ ] Zero image and zero audio files in the game directory, asserted by a scan

### G6 Closeout

Use `spec-closeout` for applicable ML01 verification, commit identity and publication checks, adapted to this repository's per-gate commits and PR record. Do not create a worklog or move the tracked public spec to an archive. Push the branch, open one pull request, and stop. The PR carries the diff, completed checklist, exact reproduction commands, links to evidence captures and `cargo-lander/consumer-report.md`. Agents never merge.

At closeout, set the already tracked `docs/specs/spec-04-cargo-lander-vertical-slice.md` to `status: under-review`, retaining `series: cargo-lander`; the maintainer's merge changes it to active. Add its specs-index row and the root README game line. Append one row to `/opt/agents/repos/work-logs/work-registry.csv` pointing to the spec and PR. The prepared ignore entry is already present. Keep the operator's spec-03 reservation and spec-04 assignment.

**Validation:**

- [ ] The repository diff outside `cargo-lander/` contains only the root README line, the prepared `.gitignore` entry, the specs index and the tracked spec; it includes no Vector Vortex implementation or ignored reference material
- [ ] The branch is pushed and one pull request is open, unmerged, with the checklist complete and the reproduce commands present
- [ ] A fresh clone can run every validation from the committed test source, seeds, fixtures, `playwright.config`, `package.json`, and lockfile

## Constraints

- **Do not open the template's `index.html`, and copy no pack source.** Two separate rules, both binding.
- **Do not modify the framework repository.** Kit defects are reported, not patched.
- **Respect the scope allowlist.** Outside `cargo-lander/`, only the four named repository files, the explicitly permitted ignored reference staging, and the one central registry row may change. Work remains in the authorized worktree.
- **No bundler and no runtime dependency.** Static files only, relative paths, Azure Static Web Apps compatible.
- **Zero image and zero audio files.** Wireframe arc rules apply: geometry drawn procedurally, chrome from CSS and inline SVG on the framework tokens, any audio synthesized at runtime.
- **Do not weaken a validation to pass a gate**, and do not satisfy a mutation requirement by asserting a regex against a string literal.
- **Never delete a file.** Retired files move to `recycle-bin/` with a one-line reason.

## What the executor chooses

Module decomposition, the physics integration method, the documented impact measure and tuning values, canvas drawing, the visual character of the playfield, terrain shape, input mapping details that expose thrust notches and retry/restart, and test organization.

Frozen: the purity rule, the required snapshot fields and complete continuation contract, the three-way contact model and destruction-only craft consumption, vertical segmented thrust and the other meter mappings, runner stop/start ownership, the single-stage display contract, the pinned vendored-kit boundary inside `game/`, and the modern-to-arcade-to-custom theme sequence.

## Out of scope

Space weather, cargo types and sway, the settings and stats and high-score persistence triad, audio, mobile controls, gamepad support, multiple landing sites, procedural terrain beyond one site, and any change to the framework's capture matrix. The storage triad is a strong candidate for the kit itself once a second game wants it.
