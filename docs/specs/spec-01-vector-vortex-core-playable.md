<!--
---
title: "Vector Vortex Spec 01: Deterministic Core Playable"
description: "Build the first playable Vector Vortex mechanics slice: a deterministic 24-lane Canvas tube shooter with one Crawler enemy, a five-minute director, three lives, fixed scoring, exact controls, a minimal semantic status surface, and tracked reproducible tests that a fresh clone can run. Supersedes the 2026-08-16 spec and its 01a amendment, which are folded in. Amendment 01c (2026-09-16, pass 1 plus its continuation) is folded in as a contract section: pause/clock lifecycle, Canvas-only focus and focus return, RNG zero preservation, layout fit, the browser smoke flow, and the struck drain mutation clause. GameUI integration, publishing, topology shifts, and polish are later specs."
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-08"
version: "3.1"
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

A band's first spawn occurs after exactly one full interval of that band has been completed. Band 1's first spawn is on the tick with index 59, its second on index 119. Band 2 begins at index 3,600 and its first spawn is on index 3,647 (corrected from the 3,659 of the first spec draft; the Spec 01b amendment fixed the construction). The same construction applies to bands 3 and 4. An implementation whose first spawn lands on index 60 is off by one and fails Deliverable 2.

Accuracy is `hits / shotsSpawned`. A cooldown-blocked request is not a shot. Display `ACC --` until the first shot spawns, then the nearest whole percent. There is no streak, multiplier, friendly fire, shield, bomb, alternate weapon, or endless mode.

### Collision and life loss

- Shot and enemy movement retain previous and next depth. Collision requires the same lane and overlapping swept depth intervals.
- Resolve simultaneous shot candidates by ascending stable enemy ID. A shot is consumed by its first resolved hit.
- Resolve simultaneous rim breaches by ascending enemy ID. The first eligible breach removes one life and starts 30 ticks of damage grace; all breaching enemies are removed, and further breaches during grace remove no life.
- Each Crawler dies in one hit. A destroyed enemy cannot breach later in the same tick.

## Validation Standard

This repository requires that a validation fail on a subtly wrong result, not only on a missing one. Every validation box below is satisfied only when the test that proves it also names, in the test file, the discriminating mutation that must make it fail. A test whose assertions still pass under its named mutation does not satisfy its validation, and the box stays unchecked.

Amendment 01c (2026-09-16, folded below) relaxes the blanket named-mutation requirement in one direction: a validation is satisfied by a behavior test that observes the correct behavior happen and that fails when the behavior is broken, even where no named mutation wrapper exists. Useful behavior tests are retained without manufacturing replacement mutation tests. Every mutation check that is retained must still be discriminating: the same behavior assertion passes with the mutation inactive and fails with it active, and a check that cannot demonstrate this cheaply is removed rather than kept.

Checking a box whose test does not execute, or does not execute in a fresh clone, is a failed gate rather than a completed one.

## Deliverables and Validation

#### Deliverable 1: Repository slice, tracked toolchain, and pure deterministic core

Create the bounded game directory and tracked toolchain. Implement serializable core state, an injected seeded random source, exact tick advancement for tests, action input, shots, Crawlers, and snapshots/events. Rules modules contain no DOM, Canvas, Audio, `Math.random`, wall-clock API, or renderer object.

Validation:

- [x] From a fresh clone on the pinned Node version, a clean dependency install followed by the documented unit-test command discovers and runs every tracked unit test. The command resolves test files without depending on shell recursive-glob expansion. Mutation: renaming any single test file must change the reported test count.
- [x] Fixed seed plus fixed action log produces the same digest in two independent core instances and after a JSON state round-trip. Mutation: dropping any field from the serialized state must change a digest.
- [x] The same input log driven through the fixed-step accumulator at 30 Hz, 60 Hz, and 144 Hz frame schedules, including uneven and fractional frame deltas and one delta above the catch-up cap, produces one identical authoritative digest. Mutation: removing the frame-delta cap must change a digest. (01c continuation, 2026-09-16: the named multi-drain mutation requirement is struck; see the drain-clause disposition in Amendment 01c below. Cross-rate digest equality alone cannot prove one movement and fire evaluation per simulation tick, so the restored action-log fixture's delivery record and its expected movement and firing assertions carry that evidence instead.)
- [x] A source check rejects `Math.random`, `Date.now`, `performance.now`, DOM, Canvas, and Audio access in authoritative rules modules. Mutation: introducing any one of those calls into a rules module must fail the check.
- [x] The seeded RNG's integer draw is pinned to an exact expected sequence for a fixed seed, and the lane draw is proven inclusive of both bounds. Mutation: computing the range as `max - min` rather than `max - min + 1` must fail.
- [x] Unit tests reject lane clamping, render-coupled time, simultaneous opposite-direction movement, an eighth-tick cooldown bypass, and a seventh active shot.

#### Deliverable 2: Director, collision, scoring, lives, and outcomes

Implement the frozen balance table, director bands, swept collision, stable tie ordering, scoring, accuracy, damage grace, the run boundary, and semantic events such as `shot-fired`, `enemy-destroyed`, `life-lost`, and `run-ended` after the corresponding fact has committed.

Validation:

- [x] A swept-collision test hits a same-lane Crawler crossed within one tick and misses an adjacent-lane or non-overlapping Crawler. Mutation: replacing the swept interval test with point sampling at either endpoint must fail.
- [x] A shot whose final sweep reaches or passes the far depth still resolves a same-lane overlapping Crawler on that tick. Mutation: expiring shots before collision resolution must fail this test.
- [x] A simultaneous-candidate fixture proves ascending stable-ID resolution and first-hit projectile consumption. Mutation: resolving candidates in insertion order must change the surviving enemy.
- [x] Director tests assert the exact spawn tick index for the first and second spawn of every band, at the fixed seed, including index 59 for band 1 and index 3,647 for band 2. Mutation: a one-tick offset in either direction must fail.
- [x] Director tests reproduce the same lane sequence for a fixed seed across two independent runs.
- [x] Two same-tick breaches cost one life, all breachers clear, and another breach inside the 30-tick grace costs no life.
- [x] A breach on the tick where the grace timer reaches zero costs a life, and a breach on the immediately preceding tick costs none. The intended immunity window is stated in the test.
- [x] Ten spawned shots and seven hits produce `70%`; blocked fire requests do not change the denominator; zero shots reports `ACC --`.
- [x] A test advances the core through the real tick path to the final tick, by stepping rather than by assigning `elapsedTicks`, with one life and an enemy that breaches on tick 17,999, and asserts `lost`. Mutation: evaluating the outcome before breach resolution on the final tick must flip this to `survived`.
- [x] The same construction with a surviving life asserts `survived` and a final score equal to kill points plus 5,000 plus the rounded accuracy bonus, with no streak or hidden multiplier.

#### Deliverable 3: Playable Canvas slice and minimal semantic controls

Render one stable circular tube with 24 lane rails and a visible player marker, shots, and Crawlers from core snapshots. Device-pixel-ratio and resize handling keep drawing and input coordinates aligned. Supply adjacent semantic DOM text for objective, controls, score, lives, time, kills, accuracy, current status, pause, and restart. This surface is deliberately minimal and game-owned; it is not the final HUD or an imitation of a missing framework module.

The playable desktop contract covers CSS viewports `1024x576`, `1280x720`, `1440x900`, and `1920x1080`. Below `960x540`, retain readable controls and present a non-blocking "larger play area recommended" message; touch controls are out of scope.

Validation:

- [x] From a fresh clone, the documented browser-test command starts the local server and runs the full Playwright suite to completion with every test executing its assertions. The Playwright configuration resolves the suite's navigation targets on its own, with no reliance on an operator-supplied base URL. Mutation: removing the configured base URL must fail the suite rather than skip it.
- [x] A Playwright flow presses and holds a real movement key and asserts the lane changes while the key is still held, before any blur, so the physical keydown path is proven rather than the test seam. Mutation: disabling the input adapter's keydown handler must fail this test.
- [x] A keyboard-only flow starts, moves across the `23↔0` wrap, holds fire through cooldown, pauses and resumes, and reaches both forced outcomes through the exact-tick test seam.
- [x] With focus on the pause or restart DOM control, pressing Space activates that control rather than firing. Mutation: preventing the default for Space at the window level regardless of focus must fail this test.
- [x] The test seam's reset rebinds every consumer of the core, so no orphaned core instance continues to advance and the visible run is the one that was reset. Mutation: replacing the core without rebinding the frame runner must fail.
- [x] Browser tests assert the DOM status values are projections of the core snapshot and contain no duplicate scoring, timing, collision, or outcome calculation.
- [x] Blur and hidden-tab tests clear held input and stop authoritative tick advancement; resuming produces no catch-up burst.
- [x] Canvas state is balanced: every `save` in a frame has its matching `restore`, proven by a test that renders repeated frames at a device pixel ratio above 1 and asserts the composed transform is identical on frame 1 and frame 30. Mutation: removing any one `restore` must fail.
- [x] DPR 1 and DPR 2 probes and all four supported viewports keep the complete tube, status, and controls visible without overlap or horizontal scrolling.
- [x] The page has a concise Canvas accessible name, adjacent objective/controls/current critical status, visible focus, keyboard pause/restart controls, no off-origin request, and no image or audio file.

#### Deliverable 4: Documentation, pull request, and closeout

Update the game `README.md` and game `AGENTS.md` with the frozen architecture, exact commands, action map, current specification status, and the ownership boundary for Specs 02 and 03. Add this spec to `docs/specs/` with an index row. Mark superseded in-repo spec copies as `deprecated` with a `superseded_by` pointer. Then push and open the pull request, and invoke `spec-closeout`.

Validation:

- [x] Documentation names the exact clean-install, unit, browser, and local-serve commands, and a reviewer following them from a fresh clone reproduces the checked validations.
- [x] Every internal link in the added in-repo spec and its index row resolves within the target repository. Mutation: any path copied from the authoring environment that does not exist in the clone fails this box.
- [x] No tracked Markdown file is deleted in this run. Retired specifications stay tracked with `status: deprecated` and a `superseded_by` pointer.
- [x] The branch is `task/`-prefixed, pushed, and carries one pull request against the default branch, unmerged, with per-gate commits whose messages carry the gate number and game scope.
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

## Amendment 01c (folded): playability repairs and test truth

Amendment 01c ran in two passes: pass 1 (commits `c6c707d`, `5c43226`) and its continuation (commits `069775b`, `ae1b9cc`, and the record commit that carries this fold). Pass 1 was returned unfinished; the continuation completed its gates and folded the contract below into this tracked spec so a fresh clone can read what the code implements. There is no 01d: Spec 01 closes at the merge of its pull request.

### Pause and clock lifecycle

The pause action pauses the core and the clock together, so the accumulator builds nothing during a pause. The clock's resume paths are guarded on the core's paused state: a player who pauses and then changes focus or tab comes back to a paused clock, not to a clock that accumulated delta against the paused core. The frame timestamp is rebased at the visibility lifecycle transition itself, so a hidden interval whose animation frames were suspended replays no hidden time on restoration; the in-loop reset remains as a backstop. The restart action re-syncs the clock to running, because the reset state is always unpaused. Keyboard pause (`P` and `Escape`) clears held input before dispatching, exactly as the pause button click path does, so a key held through the pause transition resumes nothing without a fresh press.

Validation:

- [x] Pause, blur and refocus the window, wait a real interval, resume, and assert the tick rate afterward is normal and that zero ticks elapsed during the pause.
- [x] Pause, hide and restore the document without a focus event, wait while still paused, resume, and assert the same.
- [x] From an unpaused running game, hide for a real interval with no animation callbacks delivered, then restore without a focus event. Assert zero hidden ticks, no replay of hidden time on restoration, and subsequent normal tick advancement. Callback delivery is controlled to the production runner; no test-only runner is used.
- [x] Reach an outcome, pause, restart, and assert the new run advances ticks from zero at the normal rate without any pause toggle.
- [x] Hold movement and fire, enter pause with `P` and with Escape, and assert held flags clear before any gameplay-key release. Resume without a fresh gameplay keydown and assert no lane change or shot spawn. Release and press again, and assert movement and firing resume.

### Canvas-only focus and focus return

The gameplay focus gate accepts only the Canvas element, never a DOM control inside the game container, so Space on a focused button activates that button instead of firing. The pause and restart click handlers return focus to the Canvas, so keyboard control works after a mouse click without clicking the canvas again.

Validation:

- [x] Click Pause then Resume with the mouse, then press an arrow key with no intervening click, and assert the player moves. After an outcome, activate enabled Restart with Space and assert both tick advancement and Canvas keyboard control return without another click.

### RNG zero preservation

The RNG's `setState` preserves a restored zero position; the zero-to-one normalization belongs to initial seeding only, so a JSON round-trip at any position, including exactly zero, replays the same stream.

Validation:

- [x] Round-trip a core through JSON at the triggering RNG position (seed `0x92d4860b`) and assert the next ten director lanes match the uninterrupted run.

### Layout

The Canvas sizes against available height as well as width, with a height reserve matching the measured non-canvas chrome, and the canvas wrap carries no minimum height. At `1024x576` and `1280x720` the status, canvas, and controls stay inside the viewport with the bottom edge of the lowest control above the fold.

Validation:

- [x] At 1024x576 assert the bottom edge of the lowest control is inside the viewport, and attach the screenshot to the run evidence.

### Smoke flow

One Playwright smoke flow loads the page, moves and fires through real keyboard input for several seconds, runs its pause segment through the real frame loop (pause; blur/refocus and hide/restore while paused; real waits still paused; resume; no `advanceTicks`, no `pauseRaf`, no direct core-state changes anywhere in the segment), and exercises a hidden then visible transition without a separate focus event. It fails on console errors, uncaught page errors, unhandled rejections, and failed stylesheet or module loads including HTTP errors. Optional icon and source-map load failures are ignored only when identified as such, consistently across request and console capture; application errors are never suppressed.

Validation:

- [x] The smoke flow's pause segment runs through the real frame loop and fails when the resume guard is removed.
- [x] A failed stylesheet or module request fails the smoke flow; a failed icon request does not.

### Drain-clause disposition

The Deliverable 1 requirement for a named multi-drain mutation is struck under this amendment's supersession of the blanket named-mutation rule. Cross-rate digest equality cannot prove one movement and fire evaluation per simulation tick, because every schedule could make the same mistake and the digests would still agree. The restored action-log fixture carries the positive evidence instead: a delivery record asserting every entry is dispatched once at its intended tick in order, and expected movement and firing assertions against the resulting core. No replacement mutation wrapper is required. The disposition is recorded in the spec defect register.

### Mutation verification record

Validation:

- [x] For each retained mutation check, the same behavior assertion passes with the mutation inactive and fails with it active. A wrapper that observes the expected failure may itself pass. The runs are recorded in the run evidence; no new mutation machinery was added.
- [x] The restored action-log replay test delivers each entry once at its intended tick, proves expected movement and firing, and produces one digest across the schedules at the same completed tick.

## Notes

This split deliberately proves the game before the framework-consumer shell. The minimal DOM surface exists for operation, accessibility, and browser validation; it is not a disposable copy of title, settings, pause, or HUD modules. Spec 02 replaces it with a shell built on the current GameUI tokens and Core primitives, keeps every new surface game-local under Vector Vortex naming, and records backport candidates for later work in the framework repository.

The validation standard in this revision is deliberately heavier than the superseded pair. A prior execution checked validations for a browser suite that could not navigate, and shipped two unit tests that passed under the mutation they were meant to catch. Named mutations and fresh-clone execution are the response to that, and they apply to every box rather than to the three the old amendment covered.
