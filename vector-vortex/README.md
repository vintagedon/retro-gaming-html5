<!--
---
title: "Vector Vortex"
description: "Browser-based 24-lane wireframe tube shooter with a deterministic fixed-step core"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-08"
version: "0.3.0"
status: "Active"
tags:
  - type: project-root
  - domain: game-design
  - tech: [javascript, html5, canvas-2d, es-modules, playwright]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Agent Instructions](AGENTS.md)"
  - "[Spec 01: Deterministic Core Playable](../docs/specs/spec-01-vector-vortex-core-playable.md)"
  - "[Deliverable 1 Plan](docs/superpowers/plans/2026-09-08-vector-vortex-deliverable-1.md)"
  - "[Deliverable 2 Plan](docs/superpowers/plans/2026-09-08-vector-vortex-deliverable-2.md)"
  - "[Deliverable 3 Plan](docs/superpowers/plans/2026-09-08-vector-vortex-deliverable-3.md)"
---

# Vector Vortex

Rung 1 of the wireframe arc: a 24-lane wireframe tube shooter built on a fixed-step, deterministic core. The player rides the rim of a fixed circular tube, fires inward along the current lane, and destroys outward-advancing Crawlers before they reach the rim. A run lasts five minutes with three lives and a survival cash-out.

This directory implements Deliverables 1, 2, and 3 of Spec 01: the toolchain, the pure deterministic core, the director and scoring, and the playable Canvas slice with semantic DOM controls and a Playwright suite. Deliverable 4 owns documentation, the pull request, and closeout.

## Status

| Deliverable | Status |
|---|---|
| 1. Toolchain + pure deterministic core | Complete |
| 2. Director, collision, scoring, lives, outcomes | Complete |
| 3. Playable Canvas slice + minimal semantic DOM | Complete |
| 4. Documentation, pull request, closeout | Pending |

## Quick Start

```bash
cd vector-vortex
npm install
npm test
```

The unit-test suite invokes `node --test` with an explicit file list. No shell glob expansion is used; renaming a test file changes the reported count, which is a named mutation for the unit-test discovery validation.

## Architecture

The simulation is authoritative. The renderer reads snapshots and never advances state.

```
game/core/
├── rng.js          seeded RNG (Mulberry32) with pinned sequence
├── rng-mutation.js test-only mutation harness for the inclusive-bounds test
├── lanes.js        24-lane wrap, opposite-direction cancel
├── shots.js        cooldown, cap, advance, expire-at-far, prev/next, shot-fired event
├── enemies.js      Crawler spawn, advance, rim breach (ascending stable ID), prev/next
├── director.js     band table, shouldSpawnOnTick, spawn lane from injected RNG
├── collision.js    swept-interval overlap, ascending-id tie, first-hit consumption
├── breach.js       rim breach with grace and ascending-id ordering
├── scoring.js      accuracy percent display, accuracy bonus
├── clock.js        fixed-step accumulator with frame-delta cap
└── core.js         state factory, per-tick order, JSON round-trip, semantic events
```

## Runtime (Deliverable 3)

```
game/
├── index.html            canvas + semantic DOM (status grid, objective, controls, pause/restart)
├── styles.css            grid layout, focus rings, "larger play area" message below 960x540
└── runtime/
    ├── renderer.js       Canvas 2D: two rings, 24 lane rails, player marker, shots, Crawlers
    ├── input.js          focus-aware keydown/keyup, blur and visibilitychange clearing
    ├── frame-runner.js   rAF loop, fixed-step clock, core rebind, exact-tick test seam
    ├── dom.js            pure projection of core snapshot to semantic DOM
    └── main.js           wires everything; exposes window.__vv for Playwright
```

### Supported viewports

`1024x576`, `1280x720`, `1440x900`, `1920x1080`. Below `960x540` the controls remain readable and a non-blocking "larger play area recommended" message appears.

### Test seam: `window.__vv`

| Method | Purpose |
|---|---|
| `advanceTicks(n)` | Advance the core by `n` fixed-step ticks and re-publish the snapshot |
| `reset(seed)` | Rebind every consumer of the core to a fresh `createCore({ seed })` |
| `getSnapshot()` | Return the current core snapshot |
| `getKeyCounters()` | Return `{ saveCount, restoreCount }` for the most recent frame |
| `setLeft/Right/Fire(boolean)` | Drive the core's held input directly (test-only) |
| `setState(next)` | Replace the core's state (test-only) |

Mutation toggles the runtime honors (all default to falsy, never enabled in production):

- `window.__vv.disableKeydown` — input adapter no-ops on `keydown`/`keyup`
- `window.__vv.preventSpaceAtWindow` — input adapter calls `preventDefault` on Space at the window level
- `window.__vv.skipFrameRunnerRebind` — `reset(seed)` does NOT rebind the frame runner
- `window.__vv.skipOneRestore` — renderer drops one matching `restore()` on the first lane rail
- `window.__vv.pauseRaf` — frame runner's rAF loop skips the clock push (used by tests that drive ticks via the seam)

## Director Bands

| Band | Elapsed ticks | Interval | First spawn tick | Second spawn tick |
|---|---|---:|---:|---:|
| 1 | 0..3,599 | 60 | 59 | 119 |
| 2 | 3,600..10,799 | 48 | 3,659 | 3,707 |
| 3 | 10,800..14,399 | 36 | 10,835 | 10,871 |
| 4 | 14,400..17,999 | 27 | 14,426 | 14,453 |

A band's first spawn = `bandStart + (interval - 1)`. The director uses the injected seeded RNG to draw lanes, so the same seed reproduces the same lane sequence across runs and frame rates.

## Scoring

- Base kill = 100.
- Survival bonus = 5,000.
- Accuracy bonus = `round(2000 * hits / shotsSpawned)`, zero when no shot spawned.
- Accuracy display: `ACC --` until first shot spawns, then nearest whole percent.
- A cooldown-blocked fire request is NOT a shot; the denominator never changes for blocked requests.

## Outcome

The run simulates all 18,000 ticks (indices 0 through 17,999). After all ticks fully resolve:
- `lives >= 1` → `survived`, plus survival and accuracy cash-out.
- `lives <= 0` at any point (including the final tick) → `lost`.

A breach on the final tick is lethal like any other tick.

## Commands

| Command | Purpose |
|---|---|
| `npm install` | Install tracked toolchain (unit + Playwright) |
| `npm test` | Run all unit tests via `node --test` with explicit file list |
| `npm run test:e2e` | Run the Playwright browser suite (boots its own `http-server` on port 8123) |
| `npm run test:e2e:install` | One-time install of the Chromium headless binary |
| `npm run serve` | Serve `game/` on port 8123 for manual play |
| `node --test tests/core/<file>.test.js` | Run one unit test file |

## Constraints

- Node 22.23.2 is pinned in `.nvmrc` and `package.json` `engines`.
- Rules modules under `game/core/` MUST NOT import `window`, `document`, `HTMLCanvasElement`, `OffscreenCanvas`, `Audio*`, `Math.random`, `Date.now`, or `performance.now`. A source purity check enforces this and excludes the `-mutation.js` test helpers.
- 24 lanes wrap; clamping is rejected. Cooldown is 8 ticks; cap is 6 active shots.
- 18,000-tick run length, three lives, 30-tick damage grace, 5,000 survival bonus.
- Per-tick order is total and frozen by spec.

## License

Code: MIT. Original content: CC-BY-4.0.