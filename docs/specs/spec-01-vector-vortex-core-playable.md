<!--
---
title: "Vector Vortex Spec 01: Deterministic Core Playable"
description: "Build the first playable Vector Vortex mechanics slice: a deterministic 24-lane Canvas tube shooter with one Crawler enemy, a five-minute director, three lives, fixed scoring, exact controls, a minimal semantic status surface, and tracked reproducible tests. GameUI integration, publishing, topology shifts, and polish are later specs."
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-16"
version: "2.2"
status: "Under Review"
tags:
  - type: specification
  - domain: [game-design, implementation]
  - tech: [javascript, html5, canvas-2d, playwright]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Target Agent Instructions](../retro-gaming-html5/AGENTS.md)"
  - "[Browser Gaming Workload Guidance](../docs/workload-guidance/browser-gaming.md)"
  - "[Spec 02: Wireframe Shell and MVP](2026-08-16-retrohtml5-spec-02-vector-vortex-wireframe-shell.md)"
  - "[Spec 03: Topology Shift and Combat Polish](2026-08-16-retrohtml5-spec-03-vector-vortex-topology-shift-and-polish.md)"
---
-->

# Vector Vortex Spec 01: Deterministic Core Playable

**Series: Vector Vortex, spec 1 of 3. Spec 02 does not dispatch until this spec has been accepted and landed on the target repository's default branch.**

## Startup and Lifecycle

Work is repo-mode and spec-driven. A unit of work is a specification implemented on a branch as gated commits and closed by one pull request per `AGENTS.md`.

Read the target `AGENTS.md` and the browser gaming workload guidance for scope, timing and determinism, rendering, input, accessibility, testing, documentation, and publishing.

## Objective

The target repository gains a self-contained `vector-vortex/` mechanics slice that is playable in Chromium from tracked source. The player moves around a fixed 24-lane circular wireframe tube, fires inward along the current lane, and destroys outward-moving Crawlers before they reach the rim. A pure, seeded, fixed-step core owns input, time, movement, collision, scoring, lives, and outcomes; Canvas renders snapshots and never owns rules. The run lasts at most five minutes, uses three lives, and has exact controls, balance constants, tie ordering, and deterministic validations. A minimal semantic DOM status and control surface makes the slice operable and accessible without pre-implementing the GameUI consumer work owned by Spec 02. Spec 02 will pin the then-current GameUI foundations and build Vector Vortex's own wireframe theme and shell as game-local candidates for a later, separate framework backport. This spec does not vendor GameUI, publish a preview, add topology shifts, add another enemy type, or add presentation polish.

## Execution Environment

| Field | Value |
|---|---|
| Target | `/opt/agents/repos/retro-gaming-html5` |
| Renderer | Canvas 2D with vanilla JavaScript ES modules; no bundler, Phaser, WebGL, or runtime build step |
| Tests | Node built-in test runner for pure rules; Playwright with Chromium headless for the served page |
| Toolchain | Track `package.json`, lockfile, Playwright configuration, tests, fixtures, and fixed input logs; ignore only dependencies and generated results |
| Runtime requests | Relative local files only; no CDN, analytics, fonts, or off-origin request |
| Assets | Zero image files and zero audio files |
| Review | Maintainer reviews the pull request; execution does not presume acceptance |

## Scope

### Pre-existing: do not create

- The clean target Git repository, its root `AGENTS.md`, and `docs/workload-guidance/browser-gaming.md`.
- The preview umbrella and sibling games. They are not used by this spec.

### Modify

- `vector-vortex/`, new: game `AGENTS.md`, `README.md`, `package.json`, lockfile, Playwright configuration, tracked tests and fixtures, and the servable `game/` tree.
- `vector-vortex/game/`: the mechanics-slice page, game-owned CSS, pure core modules, Canvas renderer, input adapter, and minimal semantic DOM status and controls.
- The target repository `README.md` and specification index only as needed to mark Spec 01's mechanics-slice status; preserve unrelated staged or authored content.

### Reference

- Target repository instructions and browser gaming workload guidance.
- The two later Vector Vortex specs for ownership boundaries only; do not implement them early.

### Do not touch

- `/opt/agents/repos/html5-game-ui-framework` and all vendored or purchased reference packs.
- Any existing game directory, the preview web root, nginx, or a public deployment.
- Settings, persistence, synthesized audio, title/pause/end screens, framework vendoring, topology morphs, stun, Sprinter, Splitter, particles, shake, hitstop, or score popups.

## Frozen Game Contract

### Coordinate and timing model

- The simulation advances at exactly 60 ticks per second. `requestAnimationFrame` presents snapshots and may interpolate; it never advances authoritative state.
- Lane indices are integers `0..23`, increasing clockwise. Left decrements with wrap; right increments with wrap.
- Normalized depth is `0` at the player rim and `1` at the far end. Crawlers spawn at depth `1` and move toward `0`; shots spawn at `0` and move toward `1`.
- The authoritative per-tick order is total: drain input; advance shots; advance enemies; resolve shot-enemy collisions; resolve rim breaches and life loss; update director and spawn; advance elapsed ticks; resolve 300-second boundary; emit semantic events; publish a serializable snapshot.
- The 300-second boundary resolves after tick 17,999 has fully completed breach resolution. If the player holds at least one life once tick 17,999 has resolved, the run ends `survived`; a breach emptying the last life on the final tick ends the run in `lost`.
- A bounded frame delta prevents unbounded catch-up. Pause and hidden-tab time do not advance the accumulator or simulation.

### Input action map

| Action | Keyboard | Rule |
|---|---|---|
| Move left | Left Arrow or `A` | At most one lane step per simulation tick while held |
| Move right | Right Arrow or `D` | At most one lane step per simulation tick while held; simultaneous left and right cancel |
| Fire | Space | Hold-to-fire; press and hold use the same cooldown |
| Pause/resume | `Escape` or `P`, plus a DOM button | Mechanics-slice pause only; Spec 02 owns the final pause surface |
| Restart | DOM button | Available only after an outcome; returns to the initial seed/configuration |

Physical inputs map to actions in one adapter. Clear held input on blur, visibility change, pause, restart, and outcome. Prevent browser defaults only for handled game keys while the game surface is active; never trap Tab or browser shortcuts.

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

The director chooses lanes through the injected seeded RNG and uses these spawn intervals, with the first spawn one full interval after the band begins:

| Elapsed time | Spawn interval |
|---|---:|
| `0:00–0:59.999` | 60 ticks |
| `1:00–2:59.999` | 48 ticks |
| `3:00–3:59.999` | 36 ticks |
| `4:00–4:59.999` | 27 ticks |

Accuracy is `hits / shotsSpawned`. A cooldown-blocked request is not a shot. Display `ACC --` until the first shot spawns, then the nearest whole percent. There is no streak, multiplier, friendly fire, shield, bomb, alternate weapon, or endless mode.

### Collision and life loss

- Shot and enemy movement retain previous and next depth. Collision requires the same lane and overlapping swept depth intervals.
- Resolve simultaneous shot candidates by ascending stable enemy ID. A shot is consumed by its first resolved hit.
- Resolve simultaneous rim breaches by ascending enemy ID. The first eligible breach removes one life and starts 30 ticks of damage grace; all breaching enemies are removed, and further breaches during grace remove no life.
- Each Crawler dies in one hit. A destroyed enemy cannot breach later in the same tick.

## Deliverables and Validation

#### Deliverable 1: Repository slice, tracked toolchain, and pure deterministic core

Create the bounded game directory and tracked toolchain. Implement serializable core state, an injected seeded random source, exact tick advancement for tests, action input, shots, Crawlers, and snapshots/events. Rules modules contain no DOM, Canvas, Audio, `Math.random`, wall-clock API, or renderer object.

Validation:

- [x] A clean dependency install followed by the documented Node command runs tracked unit tests from the clone-visible source.
- [x] Fixed seed plus fixed action log produces the same digest in two independent core instances and after a JSON state round-trip.
- [x] The same input log presented through 30 Hz, 60 Hz, and 144 Hz render schedules produces one identical authoritative digest.
- [x] A source check rejects `Math.random`, `Date.now`, `performance.now`, DOM, Canvas, and Audio access in authoritative rules modules.
- [x] Unit tests reject lane clamping, render-coupled time, simultaneous opposite-direction movement, an eighth-tick cooldown bypass, and a seventh active shot.

#### Deliverable 2: Director, collision, scoring, lives, and outcomes

Implement the frozen balance table, director bands, swept collision, stable tie ordering, scoring, accuracy, damage grace, survival cash-out, loss at zero lives, and semantic events such as `shot-fired`, `enemy-destroyed`, `life-lost`, and `run-ended` after the corresponding fact has committed.

Validation:

- [x] A swept-collision test hits a same-lane Crawler crossed within one tick and misses an adjacent-lane or non-overlapping Crawler; point sampling fails the test.
- [x] A simultaneous-candidate fixture proves ascending stable-ID resolution and first-hit projectile consumption.
- [x] Director tests assert the exact interval at every band boundary and reproduce the same lane sequence for a fixed seed.
- [x] Two same-tick breaches cost one life, all breachers clear, and another breach inside the 30-tick grace costs no life.
- [x] Ten spawned shots and seven hits produce `70%`; blocked fire requests do not change the denominator; zero shots reports `ACC --`.
- [x] A 300-second boundary with a same-tick would-be breach yields `lost` if lives hit 0 on tick 17,999, and `survived` if at least 1 life remains.
- [x] Final score equals kill points plus 5,000 plus the rounded accuracy bonus on survival, and contains no streak or hidden multiplier.

#### Deliverable 3: Playable Canvas slice and minimal semantic controls

Render one stable circular tube with 24 lane rails and a visible player marker, shots, and Crawlers from core snapshots. Device-pixel-ratio and resize handling keep drawing and input coordinates aligned. Supply adjacent semantic DOM text for objective, controls, score, lives, time, kills, accuracy, current status, pause, and restart. This surface is deliberately minimal and game-owned; it is not the final HUD or an imitation of a missing framework module.

The playable desktop contract covers CSS viewports `1024x576`, `1280x720`, `1440x900`, and `1920x1080`. Below `960x540`, retain readable controls and present a non-blocking “larger play area recommended” message; touch controls are out of scope.

Validation:

- [x] A Playwright keyboard-only flow starts, moves across the `23↔0` wrap, holds fire through cooldown, pauses/resumes, and reaches both forced outcomes through the exact-tick test seam.
- [x] Browser tests assert the DOM status values are projections of the core snapshot and contain no duplicate scoring, timing, collision, or outcome calculation.
- [x] Blur and hidden-tab tests clear held input and stop authoritative tick advancement; resuming produces no catch-up burst.
- [x] DPR 1 and DPR 2 probes and all four supported viewports keep the complete tube, status, and controls visible without overlap or horizontal scrolling.
- [x] The page has a concise Canvas accessible name, adjacent objective/controls/current critical status, visible focus, keyboard pause/restart controls, no off-origin request, and no image or audio file.

#### Deliverable 4: Documentation and pull request

Update the game README and game `AGENTS.md` with the frozen architecture, exact commands, action map, current specification status, and the ownership boundary for Specs 02 and 03. Push the task branch and open one pull request.

Validation:

- [x] Documentation names the exact clean-install, unit, browser, and local-serve commands and accurately identifies this as an unpublished mechanics slice.
- [x] The branch is `task/`-prefixed, pushed, and carries one pull request against the default branch, unmerged.
- [x] The matching worklog records the starting branch/base, validation results, and commit SHAs; the central registry has the matching row.

## Constraints

- The core is authoritative; renderer, DOM, and input adapters cannot calculate or mutate rules except through named actions.
- Do not vendor or reimplement GameUI in this spec.
- Do not tune outside the shipped table without a spec amendment.
- Do not add topology shifts, additional enemy types, combat juice, persistence, publishing, raster, or sampled audio.
- Keep tests and their configuration tracked. A validation that relies on ignored local state, installed packages, or an external service fails.

## Execution Order

1. Pure deterministic core and toolchain.
2. Director, collision, scoring, lives, and outcomes.
3. Playable Canvas slice and minimal semantic controls.
4. Documentation, push branch, and pull request.

## Notes

This split deliberately proves the game before the framework-consumer shell. The minimal DOM surface exists for operation, accessibility, and browser validation; it is not a disposable copy of title, settings, pause, or HUD modules. Spec 02 replaces it with a shell built on the current GameUI tokens and Core primitives, keeps every new surface game-local under Vector Vortex naming, and records backport candidates for later work in the framework repository.
