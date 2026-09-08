<!--
---
title: "Vector Vortex Agent Context"
description: "Game-specific agent instructions for Vector Vortex"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-08"
version: "1.0"
status: "Active"
tags:
  - type: guide
  - domain: implementation
  - tech: [javascript, html5, canvas-2d, es-modules]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Repository AGENTS](../AGENTS.md)"
  - "[Game README](README.md)"
  - "[Vector Vortex Spec 01](/opt/agents/repos/spec/2026-09-08-retrohtml5-spec-01-vector-vortex-core-playable.md)"
  - "[Deliverable 1 Plan](docs/superpowers/plans/2026-09-08-vector-vortex-deliverable-1.md)"
---

# Vector Vortex Agent Context

Vector Vortex is rung 1 of the wireframe arc: a 24-lane Canvas 2D tube shooter with a fixed-step deterministic core, three lives, one Crawler enemy, and a five-minute director. The twist (topology morph) ships in a later spec. This game directory currently implements Deliverable 1 of the Spec 01 mechanics slice: the pure deterministic core and tracked toolchain. Deliverable 2 adds the director, collision, scoring, and outcome; Deliverable 3 ships the playable HTML and minimal semantic DOM surface; Deliverable 4 closes the pull request and writes docs.

## Architecture

The simulation is authoritative. The renderer is presentation-only and never advances state.

| Layer | Path | Responsibility |
|---|---|---|
| Pure core | `game/core/*.js` | State, RNG, lane wrap, shots, Crawlers, fixed-step tick, snapshots, JSON round-trip |
| Accumulators | `game/core/clock.js` | Fixed 60 Hz accumulator with frame-delta cap, pause, hidden-tab suppression |
| Tests | `tests/core/*.test.js` | Unit tests with named mutations proving every Deliverable 1 validation box |
| Plan | `docs/superpowers/plans/2026-09-08-vector-vortex-deliverable-1.md` | TDD task plan for Deliverable 1 |

Per-tick order is total and frozen by spec: drain input → advance shots → advance enemies → resolve collisions → expire shots at/past far → resolve breaches → director/spawn → advance elapsed → evaluate boundary → emit events → publish snapshot.

## Action Map

| Action | Keyboard | Notes |
|---|---|---|
| Move left | Left Arrow or A | Hold; one lane step per tick with wrap |
| Move right | Right Arrow or D | Hold; one lane step per tick with wrap; cancels simultaneous left |
| Fire | Space | Hold-to-fire; 8 tick cooldown, max 6 active shots |
| Pause | Escape or P | Mechanics-slice pause only (D2 owns the final pause surface) |
| Restart | DOM button | Available after an outcome; restores initial seed |

## Commands

```bash
cd vector-vortex
npm install
npm test
```

The test script invokes `node --test` with an explicit file list. No shell glob expansion.

## Frozen Balance Constants

| Constant | Value |
|---|---:|
| Tick rate | 60 Hz |
| Lane count | 24 |
| Shot speed | 0.025 depth/tick |
| Fire cooldown | 8 ticks |
| Max active shots | 6 |
| Crawler speed | 0.0015 depth/tick |
| Crawler HP | 1 |
| Crawler score | 100 |
| Run length | 18,000 ticks (300 s) |
| Starting lives | 3 |
| Damage grace | 30 ticks |
| Survival bonus | 5,000 |
| Accuracy bonus | `round(2000 * hits / shotsSpawned)` |

## Current Spec Status

- Deliverable 1 (toolchain + deterministic core): complete.
- Deliverable 2 (director, collision, scoring, lives, outcomes): pending.
- Deliverable 3 (Canvas slice + semantic DOM): pending.
- Deliverable 4 (documentation + pull request): pending.

## Scope Boundaries

- Do not add topology morphs, additional enemy types, stun, particles, hitstop, score popups, persistence, publishing, raster, or sampled audio. Spec 02 and later specs own those.
- The shared browser-game UI framework is vendored in a later spec, not in this directory yet.
- `publish.sh` does not exist in this directory yet; Deliverable 4 introduces it.