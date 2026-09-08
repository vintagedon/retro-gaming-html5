<!--
---
title: "Vector Vortex"
description: "Browser-based 24-lane wireframe tube shooter with a deterministic fixed-step core"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-08"
version: "0.1.0"
status: "Active"
tags:
  - type: project-root
  - domain: game-design
  - tech: [javascript, html5, canvas-2d, es-modules]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Agent Instructions](AGENTS.md)"
  - "[Spec 01: Deterministic Core Playable](/opt/agents/repos/spec/2026-09-08-retrohtml5-spec-01-vector-vortex-core-playable.md)"
  - "[Deliverable 1 Plan](docs/superpowers/plans/2026-09-08-vector-vortex-deliverable-1.md)"
---

# Vector Vortex

Rung 1 of the wireframe arc: a 24-lane wireframe tube shooter built on a fixed-step, deterministic core. The player rides the rim of a fixed circular tube, fires inward along the current lane, and destroys outward-advancing Crawlers before they reach the rim. A run lasts five minutes with three lives and a survival cash-out.

This directory currently implements Deliverable 1 of Spec 01: the toolchain and the pure deterministic core. The playable Canvas slice, director, scoring, and pull request closeout arrive in Deliverables 2, 3, and 4.

## Status

| Deliverable | Status |
|---|---|
| 1. Toolchain + pure deterministic core | Complete |
| 2. Director, collision, scoring, lives, outcomes | Pending |
| 3. Playable Canvas slice + minimal semantic DOM | Pending |
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
├── lanes.js        24-lane wrap, opposite-direction cancel
├── shots.js        cooldown, cap, advance, expire-at-far
├── enemies.js      Crawler spawn, advance, rim breach (ascending stable ID)
├── clock.js        fixed-step accumulator with frame-delta cap
└── core.js         state factory, tick(), snapshot(), JSON round-trip
```

## Commands

| Command | Purpose |
|---|---|
| `npm install` | Install tracked toolchain (no runtime deps for D1) |
| `npm test` | Run all unit tests via `node --test` with explicit file list |
| `node --test tests/core/<file>.test.js` | Run one test file |
| `python3 -m http.server 8080 --directory game` | Serve the placeholder page (D1 ships no playable yet) |

## Constraints

- Node 22.23.2 is pinned in `.nvmrc` and `package.json` `engines`.
- Rules modules under `game/core/` MUST NOT import `window`, `document`, `HTMLCanvasElement`, `OffscreenCanvas`, `Audio*`, `Math.random`, `Date.now`, or `performance.now`. A source purity check enforces this.
- 24 lanes wrap; clamping is rejected. Cooldown is 8 ticks; cap is 6 active shots.
- 18,000-tick run length, three lives, 30-tick damage grace, 5,000 survival bonus.
- Per-tick order is total and frozen.

## License

Code: MIT. Original content: CC-BY-4.0.