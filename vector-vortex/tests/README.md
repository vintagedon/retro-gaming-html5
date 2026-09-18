<!--
---
title: "Vector Vortex Tracked Tests"
description: "Tracked unit and browser tests proving the Spec 01 validation boxes, including the 01c interaction journeys and smoke flow"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-09"
version: "0.5.0"
status: "Active"
tags:
  - type: directory
  - domain: testing
  - tech: [javascript, node-test-runner, playwright]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Game AGENTS](../AGENTS.md)"
  - "[Project README](../README.md)"
  - "[Spec 01: Deterministic Core Playable](../../docs/specs/spec-01-vector-vortex-core-playable.md)"
---

# Vector Vortex `tests/`

Tracked unit and browser tests. Unit tests run with `npm test` from the game directory; the browser suite runs with `npm run test:e2e` and requires the one-time `npm run test:e2e:install` Chromium download.

The unit-test script invokes `node --test` with an explicit file list. No shell glob expansion is used; renaming a test file changes the reported count, which is a named mutation for the unit-test discovery validation. Mutation toggles for the browser suite are set via `addInitScript` on the Playwright page object.

## Unit tests (`tests/core/`)

| File | Validates |
|---|---|
| `rng.test.js` | Seeded RNG pinned sequence; lane inclusive bounds (mutation: `max - min`) |
| `lanes.test.js` | 24-lane wrap; simultaneous opposite cancel; clamp mutation |
| `shots.test.js` | Cooldown 8 ticks; cap 6; advance and expire; blocked-fire denominator (mutation: counting blocked fires) |
| `enemies.test.js` | Crawler spawn, advance, ascending-ID breach order |
| `core.test.js` | Snapshot, lane wrap, fire-on-tick, cooldown bypass, shot cap, JSON round-trip, mutation tests |
| `clock.test.js` | 30/60/144 Hz digest equality with real-time alignment (residual ≤1); frame-delta cap (positive catch-up-cap check and its mutation); pause; paused/hidden suppression (D2.1); blur stops tick advancement (D2.5); gameplay ev.repeat guard for all gameplay keys (D2.9, closing) |
| `purity.test.js` | No DOM/Canvas/Audio/clock APIs in `game/core/`; no `-mutation.js` test helpers in `game/core/` (D3.1) |
| `replay.test.js` | Restored by the 01c continuation: action-log delivery record (every entry dispatched once before its named tick, same-tick order kept), held movement and firing produce the expected lane steps and shots, and one authoritative digest at the same completed tick across 30/60/144 Hz and an uneven fractional schedule, aligned without skipping inputs |
| `discovery.test.js` | Explicit test list, no globs; mutation: renaming a file changes the count |
| `director.test.js` | Band table, `shouldSpawnOnTick`, `nextSpawnTickAfter`, `firstSpawnForBand` (D1.1); director first-spawn indices 59, 3647, 10835, 14426 |
| `collision.test.js` | Swept-interval collision, ascending-id tie, first-hit consumption |
| `scoring.test.js` | Accuracy percent display, accuracy bonus, survival bonus |
| `breach.test.js` | Rim breach with grace and ascending-id ordering |
| `integration.test.js` | Director integration with the core tick path; off-by-one mutations; lane-sequence reproducibility |
| `links.test.js` | Every internal Markdown link in scope resolves from a fresh clone (D1.3); mutation: links to recycle-bin/ or /opt/agents/ fail |
| `input-focus-contract.test.js` | Source contract: input adapter gates movement/fire/pause dispatch on the game surface (D2.4); mutation: removing the gate breaks the contract |
| `render-depth.test.js` | Crawler depth maps to radius: depth 1 = far radius, depth 0 = rim (D2.2); mutation: inverted mapping fails |
| `rng-serialize.test.js` | Director RNG position is serialized in state; round-trip and restart preserve lane sequence (D2.3); mutation: dropping `rngState` diverges |
| `dom-no-arithmetic.test.js` | DOM projector, renderer, and input adapter contain no scoring/accuracy/timing arithmetic (D2.8); mutation: adding hits/shotsSpawned arithmetic is detected |

## Browser tests (`tests/browser/`)

| File | Validates |
|---|---|
| `a11y.spec.js` | Canvas accessible name, adjacent status, focus rings, no off-origin request |
| `blur.spec.js` | Window blur and visibilitychange clear held input and stop tick advancement via the real rAF path (D2.5, D3.6); mutations: disabling the input adapter or the frame runner |
| `canvas-balance.spec.js` | Save/restore balance at DPR 2; saveCount > 0; composed transform identical across frames (D3.6); mutation: skipOneRestore unbalances the counter |
| `config.spec.js` | Playwright config: explicit baseURL, webServer boots its own http-server |
| `focus.spec.js` | Space on focused pause button activates it; arrow keys on restart do not change the player lane; Space on pause does not spawn a shot (D2.4); mutations: focus gate disabled spawns shots, preventSpaceAtWindow breaks activation |
| `keyboard.spec.js` | Physical keydown path drives movement; mutation: disabling keydown prevents lane change; full keyboard flow covers lane wrap 23→0, hold-fire through cooldown, and pause/resume (D3.8) |
| `seam.spec.js` | Test seam reset rebinds every consumer; mutation: skipFrameRunnerRebind leaves an orphaned core; DOM status values are projections |
| `smoke.spec.js` | Page loads, run loop ticks, status fields update |
| `play-flow.spec.js` | 01c smoke flow: real keyboard play, pause segment through the real frame loop (blur/refocus and hide/restore while paused, guarded resume), hidden→visible without a focus event; fails on errors and on failed stylesheet/module loads; discriminators prove icon failures are optional |
| `interaction.spec.js` | 01c interaction journeys: guarded resumes after blur/refocus and hide/restore while paused, no replay of suspended-hidden time, restart from a paused outcome, keyboard pause clearing for P and Escape, button focus return to the canvas, 1024x576 control bounds |
| `viewport.spec.js` | All four supported viewports keep the tube, status, and controls visible; DPR 1 probe asserts no overlap and no off-screen placement; sub-960 warning shown by the stylesheet media query, hidden above 960 (D2.7) |

The fixtures directory is intentionally empty; fixed input logs and replay fixtures live inline in the test files that consume them.