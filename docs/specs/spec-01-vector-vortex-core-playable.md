<!--
---
title: "Vector Vortex Spec 01: Deterministic Core Playable"
description: "Build the first playable Vector Vortex mechanics slice: a deterministic 24-lane Canvas tube shooter with one Crawler enemy, a five-minute director, three lives, fixed scoring, exact controls, a minimal semantic status surface, and tracked reproducible tests that a fresh clone can run. Supersedes the 2026-08-16 spec and its 01a amendment, which are folded in. GameUI integration, publishing, topology shifts, and polish are later specs."
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-08"
version: "3.0"
status: "under-review"
tags:
  - type: specification
  - domain: [game-design, implementation]
  - tech: [javascript, html5, canvas-2d, playwright]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Superseded Spec 01 (deprecated)](spec-01-vector-vortex-mvp-and-shell.md)"
  - "[Superseded Spec 02 (deprecated)](spec-02-vector-vortex-topology-shift-and-polish.md)"
  - "[Repository AGENTS](../../AGENTS.md)"
  - "[Specifications Index](README.md)"
---
-->

# Vector Vortex Spec 01: Deterministic Core Playable

**Series: Vector Vortex, spec 1 of 3. Spec 02 does not dispatch until this spec's pull request is merged.**

This spec supersedes `2026-08/2026-08-16-retrohtml5-spec-01-vector-vortex-core-playable.md` and its amendment `2026-08/2026-08-17-retrohtml5-spec-01a-vector-vortex-core-amendment.md`. Both are archived and write-once; the amendment's corrections are folded into the contract below rather than layered on top of it. A prior execution of the superseded pair reached a pull request and was closed unmerged. Do not read, fetch, or reuse that branch, its pull request, or its review comments. Build from this spec against a clean `main`.

## Startup and Lifecycle

Invoke the `spec-startup` skill before touching a deliverable. This is an operator-selected central-queue run targeting this Git repository. The authoritative spec remains in the central spec queue.

This repository runs a public pull-request lifecycle, defined in its own `AGENTS.md`. Create `task/vector-vortex-core-playable` from a clean `main`. Work the gates in order. Each gate ends in exactly one commit whose message carries the gate number and the game as scope, for example `feat(vector-vortex): add lane and depth core (gate 1)`. Check this spec's validation boxes in the commit that completes the gate whose validations they are. Push the branch and open one pull request against the default branch carrying the completed checklist and the exact reproduction commands. The maintainer merges. The executor never merges and never force-pushes.

Read the target `AGENTS.md`, then the target `README.md`, then the browser gaming workload guidance for the timing, determinism, rendering, input, accessibility, testing, and publishing conventions. If either authority contradicts this spec, stop and report the conflict rather than reconstructing it.

Worklog and registry: this repository holds no in-repo worklog files. The worklog and the `work-registry.csv` row for this run are written to the central worklog directory at closeout. No validation in this spec may reference an in-repo worklog location.

## Objective

The target repository gains a self-contained `vector-vortex/` mechanics slice that is playable in Chromium from tracked source. The player moves around a fixed 24-lane circular wireframe tube, fires inward along the current lane, and destroys outward-moving Crawlers before they reach the rim. A pure, seeded, fixed-step core owns input, time, movement, collision, scoring, lives, and outcomes; Canvas renders snapshots and never owns rules. The run lasts at most five minutes, uses three lives, and has exact controls, balance constants, tie ordering, and deterministic validations. A minimal semantic DOM status and control surface makes the slice operable and accessible without pre-implementing the GameUI consumer work owned by Spec 02.

This spec does not vendor GameUI, publish a preview, add topology shifts, add another enemy type, or add presentation polish.

## Execution Environment

| Field | Value |
|---|---|
| Target | This Git repository (the retro-gaming-html5 clone) |
| Renderer | Canvas 2D with vanilla JavaScript ES modules; no bundler, Phaser, WebGL, or runtime build step |
| Tests | Node built-in test runner for pure rules; Playwright with Chromium headless for the served page |
| Node runtime | Pin the supported runtime in `package.json` `engines` and in `.nvmrc`. Test scripts must run on the pinned version in a fresh clone without relying on shell or runtime glob expansion |
| Toolchain | Track `package.json`, lockfile, Playwright configuration, tests, fixtures, and fixed input logs; ignore only dependencies, browser binaries, and generated results |
| Runtime requests | Relative local files only; no CDN, analytics, fonts, or off-origin request |
| Assets | Zero image files and zero audio files |
| Review | The pull request is the review surface. Execution does not presume acceptance |

## Scope

### Pre-existing: do not create

- The target Git repository, its root `AGENTS.md`, `README.md`, and `docs/documentation-standards/`.
- The preview umbrella and sibling games. They are not used by this spec.

### Modify

- `vector-vortex/`, new: game `AGENTS.md`, `README.md`, `package.json`, lockfile, `.nvmrc`, Playwright configuration, tracked tests and fixtures, and the servable `game/` tree.
- `vector-vortex/game/`: the mechanics-slice page, game-owned CSS, pure core modules, Canvas renderer, input adapter, and minimal semantic DOM status and controls.
- `docs/specs/`: add this spec as `spec-01-vector-vortex-core-playable.md` and give it a row in the index. Retire superseded in-repo spec copies per the retirement rule below.
- The target repository `README.md` only as needed to mark Spec 01's mechanics-slice status; preserve unrelated staged or authored content.

### Retirement rule

Specifications are the public record and are never moved to `recycle-bin/`. A superseded specification stays tracked at its existing path with frontmatter `status: deprecated` and a `superseded_by` pointer to its replacement. `recycle-bin/` remains correct for retired non-specification content, per the target `AGENTS.md`.

### Do not touch

- The shared browser-game UI framework repository and all vendored or purchased reference packs.
- Any existing game directory, the preview web root, nginx, or a public deployment.
- Settings, persistence, synthesized audio, title/pause/end screens, framework vendoring, topology morphs, stun, Sprinter, Splitter, particles, shake, hitstop, or score popups.

## Frozen Game Contract

### Coordinate and timing model

- The simulation advances at exactly 60 ticks per second. `requestAnimationFrame` presents snapshots and may interpolate; it never advances authoritative state.
- Lane indices are integers `0..23`, increasing clockwise. Left decrements with wrap; right increments with wrap.
- Normalized depth is `0` at the player rim and `1` at the far end. Crawlers spawn at depth `1` and move toward `0`; shots spawn at `0` and move toward `1`.
- The authoritative per-tick order is total: drain input; advance shots; advance enemies; resolve shot-enemy collisions; expire shots at or past the far depth; resolve rim breaches and life loss; update director and spawn; advance elapsed ticks; evaluate the run boundary; emit semantic events; publish a serializable snapshot.
- A shot that reaches or passes the far depth is expired only after collision resolution for that tick. Its final swept interval participates in collision like any other.
- A bounded frame delta prevents unbounded catch-up. Pause and hidden-tab time do not advance the accumulator or simulation.

### Run boundary and outcome

The run simulates all 18,000 ticks, indices 0 through 17,999. Tick 17,999 is the final tick. Rim breach and life loss resolve on every tick, including the final one.

- If the player holds at least one life once tick 17,999 has fully resolved, the run ends `survived` and applies the survival and accuracy cash-out.
- If a rim breach empties the last life on the final tick, or on any earlier tick, the run ends `lost`.

There is no pre-movement survival grant and no pre-boundary outcome branch. A breach on the final tick is lethal like a breach on any other tick. Any code path that can set an outcome before the final tick's breach resolution is a defect.

### Input action map

| Action | Keyboard | Rule |
|---|---|---|
| Move left | Left Arrow or `A` | At most one lane step per simulation tick while held |
| Move right | Right Arrow or `D` | At most one lane step per simulation tick while held; simultaneous left and right cancel |
| Fire | Space | Hold-to-fire; press and hold use the same cooldown |
| Pause/resume | `Escape` or `P`, plus a DOM button | Mechanics-slice pause only; Spec 02 owns the final pause surface |
| Restart | DOM button | Available only after an outcome; returns to the initial seed/configuration |

Physical inputs map to actions in one adapter. Clear held input on blur, visibility change, pause, restart, and outcome.

Prevent browser defaults only for handled game keys, and only while the game surface itself holds focus. When focus is on a DOM control such as pause or restart, the browser's native activation of that control is not suppressed. Never trap Tab or browser shortcuts.

### Shipped balance table

| Constant | Value |
|---|---:|
| Run length | 18,000 ticks / 300 seconds |
| Starting lives | 3 |
| Damage grace | 30 ticks |
| Shot speed | `0.025` depth per tick |
| Fire cooldown | 8 ticks |
| Maximum active shots | 6 |
| Crawler speed | `0.0015` depth per tick |
| Crawler hit points | 1 |
| Crawler score | 100 |
| Survival bonus | 5,000 |
| Accuracy bonus | `round(2000 * hits / shotsSpawned)`; zero when no shot spawned |

The director chooses lanes through the injected seeded RNG and uses these spawn intervals:

| Band | Elapsed ticks | Spawn interval |
|---|---|---:|
| 1 | `0–3,599` | 60 ticks |
| 2 | `3,600–10,799` | 48 ticks |
| 3 | `10,800–14,399` | 36 ticks |
| 4 | `14,400–17,999` | 27 ticks |

A band's first spawn occurs after exactly one full interval of that band has been completed. Band 1's first spawn is on the tick with index 59, its second on index 119. Band 2 begins at index 3,600 and its first spawn is on index 3,659. The same construction applies to bands 3 and 4. An implementation whose first spawn lands on index 60 is off by one and fails Deliverable 2.

Accuracy is `hits / shotsSpawned`. A cooldown-blocked request is not a shot. Display `ACC --` until the first shot spawns, then the nearest whole percent. There is no streak, multiplier, friendly fire, shield, bomb, alternate weapon, or endless mode.

### Collision and life loss

- Shot and enemy movement retain previous and next depth. Collision requires the same lane and overlapping swept depth intervals.
- Resolve simultaneous shot candidates by ascending stable enemy ID. A shot is consumed by its first resolved hit.
- Resolve simultaneous rim breaches by ascending enemy ID. The first eligible breach removes one life and starts 30 ticks of damage grace; all breaching enemies are removed, and further breaches during grace remove no life.
- Each Crawler dies in one hit. A destroyed enemy cannot breach later in the same tick.

## Validation Standard

This repository requires that a validation fail on a subtly wrong result, not only on a missing one. Every validation box below is satisfied only when the test that proves it also names, in the test file, the discriminating mutation that must make it fail. A test whose assertions still pass under its named mutation does not satisfy its validation, and the box stays unchecked.

Checking a box whose test does not execute, or does not execute in a fresh clone, is a failed gate rather than a completed one.

## Deliverables and Validation

#### Deliverable 1: Repository slice, tracked toolchain, and pure deterministic core

Create the bounded game directory and tracked toolchain. Implement serializable core state, an injected seeded random source, exact tick advancement for tests, action input, shots, Crawlers, and snapshots/events. Rules modules contain no DOM, Canvas, Audio, `Math.random`, wall-clock API, or renderer object.

Validation:

- [ ] From a fresh clone on the pinned Node version, a clean dependency install followed by the documented unit-test command discovers and runs every tracked unit test. The command resolves test files without depending on shell recursive-glob expansion. Mutation: renaming any single test file must change the reported test count.
- [ ] Fixed seed plus fixed action log produces the same digest in two independent core instances and after a JSON state round-trip. Mutation: dropping any field from the serialized state must change a digest.
- [ ] The same input log driven through the fixed-step accumulator at 30 Hz, 60 Hz, and 144 Hz frame schedules, including uneven and fractional frame deltas and one delta above the catch-up cap, produces one identical authoritative digest. Mutation: removing the frame-delta cap, or draining more than one input sample per tick, must change a digest.
- [ ] A source check rejects `Math.random`, `Date.now`, `performance.now`, DOM, Canvas, and Audio access in authoritative rules modules. Mutation: introducing any one of those calls into a rules module must fail the check.
- [ ] The seeded RNG's integer draw is pinned to an exact expected sequence for a fixed seed, and the lane draw is proven inclusive of both bounds. Mutation: computing the range as `max - min` rather than `max - min + 1` must fail.
- [ ] Unit tests reject lane clamping, render-coupled time, simultaneous opposite-direction movement, an eighth-tick cooldown bypass, and a seventh active shot.

#### Deliverable 2: Director, collision, scoring, lives, and outcomes

Implement the frozen balance table, director bands, swept collision, stable tie ordering, scoring, accuracy, damage grace, the run boundary, and semantic events such as `shot-fired`, `enemy-destroyed`, `life-lost`, and `run-ended` after the corresponding fact has committed.

Validation:

- [ ] A swept-collision test hits a same-lane Crawler crossed within one tick and misses an adjacent-lane or non-overlapping Crawler. Mutation: replacing the swept interval test with point sampling at either endpoint must fail.
- [ ] A shot whose final sweep reaches or passes the far depth still resolves a same-lane overlapping Crawler on that tick. Mutation: expiring shots before collision resolution must fail this test.
- [ ] A simultaneous-candidate fixture proves ascending stable-ID resolution and first-hit projectile consumption. Mutation: resolving candidates in insertion order must change the surviving enemy.
- [ ] Director tests assert the exact spawn tick index for the first and second spawn of every band, at the fixed seed, including index 59 for band 1 and index 3,659 for band 2. Mutation: a one-tick offset in either direction must fail.
- [ ] Director tests reproduce the same lane sequence for a fixed seed across two independent runs.
- [ ] Two same-tick breaches cost one life, all breachers clear, and another breach inside the 30-tick grace costs no life.
- [ ] A breach on the tick where the grace timer reaches zero costs a life, and a breach on the immediately preceding tick costs none. The intended immunity window is stated in the test.
- [ ] Ten spawned shots and seven hits produce `70%`; blocked fire requests do not change the denominator; zero shots reports `ACC --`.
- [ ] A test advances the core through the real tick path to the final tick, by stepping rather than by assigning `elapsedTicks`, with one life and an enemy that breaches on tick 17,999, and asserts `lost`. Mutation: evaluating the outcome before breach resolution on the final tick must flip this to `survived`.
- [ ] The same construction with a surviving life asserts `survived` and a final score equal to kill points plus 5,000 plus the rounded accuracy bonus, with no streak or hidden multiplier.

#### Deliverable 3: Playable Canvas slice and minimal semantic controls

Render one stable circular tube with 24 lane rails and a visible player marker, shots, and Crawlers from core snapshots. Device-pixel-ratio and resize handling keep drawing and input coordinates aligned. Supply adjacent semantic DOM text for objective, controls, score, lives, time, kills, accuracy, current status, pause, and restart. This surface is deliberately minimal and game-owned; it is not the final HUD or an imitation of a missing framework module.

The playable desktop contract covers CSS viewports `1024x576`, `1280x720`, `1440x900`, and `1920x1080`. Below `960x540`, retain readable controls and present a non-blocking "larger play area recommended" message; touch controls are out of scope.

Validation:

- [ ] From a fresh clone, the documented browser-test command starts the local server and runs the full Playwright suite to completion with every test executing its assertions. The Playwright configuration resolves the suite's navigation targets on its own, with no reliance on an operator-supplied base URL. Mutation: removing the configured base URL must fail the suite rather than skip it.
- [ ] A Playwright flow presses and holds a real movement key and asserts the lane changes while the key is still held, before any blur, so the physical keydown path is proven rather than the test seam. Mutation: disabling the input adapter's keydown handler must fail this test.
- [ ] A keyboard-only flow starts, moves across the `23↔0` wrap, holds fire through cooldown, pauses and resumes, and reaches both forced outcomes through the exact-tick test seam.
- [ ] With focus on the pause or restart DOM control, pressing Space activates that control rather than firing. Mutation: preventing the default for Space at the window level regardless of focus must fail this test.
- [ ] The test seam's reset rebinds every consumer of the core, so no orphaned core instance continues to advance and the visible run is the one that was reset. Mutation: replacing the core without rebinding the frame runner must fail.
- [ ] Browser tests assert the DOM status values are projections of the core snapshot and contain no duplicate scoring, timing, collision, or outcome calculation.
- [ ] Blur and hidden-tab tests clear held input and stop authoritative tick advancement; resuming produces no catch-up burst.
- [ ] Canvas state is balanced: every `save` in a frame has its matching `restore`, proven by a test that renders repeated frames at a device pixel ratio above 1 and asserts the composed transform is identical on frame 1 and frame 30. Mutation: removing any one `restore` must fail.
- [ ] DPR 1 and DPR 2 probes and all four supported viewports keep the complete tube, status, and controls visible without overlap or horizontal scrolling.
- [ ] The page has a concise Canvas accessible name, adjacent objective/controls/current critical status, visible focus, keyboard pause/restart controls, no off-origin request, and no image or audio file.

#### Deliverable 4: Documentation, pull request, and closeout

Update the game `README.md` and game `AGENTS.md` with the frozen architecture, exact commands, action map, current specification status, and the ownership boundary for Specs 02 and 03. Add this spec to `docs/specs/` with an index row. Mark superseded in-repo spec copies as `deprecated` with a `superseded_by` pointer. Then push and open the pull request, and invoke `spec-closeout`.

Validation:

- [ ] Documentation names the exact clean-install, unit, browser, and local-serve commands, and a reviewer following them from a fresh clone reproduces the checked validations.
- [ ] Every internal link in the added in-repo spec and its index row resolves within the target repository. Mutation: any path copied from the authoring environment that does not exist in the clone fails this box.
- [ ] No tracked Markdown file is deleted in this run. Retired specifications stay tracked with `status: deprecated` and a `superseded_by` pointer.
- [ ] The branch is `task/`-prefixed, pushed, and carries one pull request against the default branch, unmerged, with per-gate commits whose messages carry the gate number and game scope.
- [ ] The worklog at the central worklog directory records the base commit, per-gate validation results, and commit SHAs; the central registry has the matching row.
- [ ] This spec is archived to the central spec archive and no longer exists in the flat active queue.

## Constraints

- The core is authoritative; renderer, DOM, and input adapters cannot calculate or mutate rules except through named actions.
- Do not vendor or reimplement GameUI in this spec.
- Do not tune outside the shipped table without a spec amendment.
- Do not add topology shifts, additional enemy types, combat juice, persistence, publishing, raster, or sampled audio.
- Keep tests and their configuration tracked. A validation that relies on ignored local state, installed packages, an operator-supplied environment value, or an external service fails.
- Do not check a validation box on the strength of a test that was written but not observed to run.

## Execution Order

1. Pure deterministic core and toolchain.
2. Director, collision, scoring, lives, and outcomes.
3. Playable Canvas slice and minimal semantic controls.
4. Documentation, pull request, and closeout.

## Notes

This split deliberately proves the game before the framework-consumer shell. The minimal DOM surface exists for operation, accessibility, and browser validation; it is not a disposable copy of title, settings, pause, or HUD modules. Spec 02 replaces it with a shell built on the current GameUI tokens and Core primitives, keeps every new surface game-local under Vector Vortex naming, and records backport candidates for later work in the framework repository.

The validation standard in this revision is deliberately heavier than the superseded pair. A prior execution checked validations for a browser suite that could not navigate, and shipped two unit tests that passed under the mutation they were meant to catch. Named mutations and fresh-clone execution are the response to that, and they apply to every box rather than to the three the old amendment covered.
