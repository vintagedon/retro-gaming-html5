<!--
---
title: "Vector Vortex Game Instructions"
description: "Game-specific architectural boundaries, frozen simulation model, event schema, and test commands for Vector Vortex"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-16"
version: "1.0"
status: "Active"
tags:
  - type: instructions
  - domain: game-design
  - tech: [javascript, html5, canvas-2d, playwright]
  - game: vector-vortex
---
-->

# Vector Vortex Agent Instructions

## Scope & Architectural Boundaries

Vector Vortex is a 24-lane circular tube shooter inspired by classic wireframe vector games.

- **Spec 01 (Completed):** Pure deterministic mechanics slice. Fixed-step 60 ticks/s core, 24 lanes, Crawler enemy, 5-minute director, 3 lives, swept collision, minimal semantic DOM telemetry and controls. Zero image and audio files.
- **Spec 02 (Planned):** Wireframe shell and GameUI framework consumption (HUD, settings, menus, UI synthesized audio).
- **Spec 03 (Planned):** Topology shifts and combat polish (Splitters, Sprinters, particle effects, visual juice).

## Core Timing & Coordinate Contract

1. **Simulation Rate:** Authoritative fixed-step simulation advances at exactly 60 ticks per second (16.666 ms / tick).
2. **Lanes:** 24 lanes (`0..23` clockwise). Wrapping: `(lane - 1 + 24) % 24` on left, `(lane + 1) % 24` on right.
3. **Depth:** Normalized `0` at rim (player), `1` at vortex center (far end).
4. **Shots:** Travel inward `0 -> 1` at `+0.025` depth/tick. Max active shots = 6. Fire cooldown = 8 ticks.
5. **Crawlers:** Spawn at `1`, travel outward `1 -> 0` at `-0.0015` depth/tick. 1 HP. 100 points.
6. **Breaches:** Reaching depth `<= 0` removes 1 life and triggers 30 ticks of damage grace. All breaching enemies in the tick are removed.
7. **Survival:** Reaching 18,000 ticks (300 seconds) with `lives > 0` produces `survived` with a +5,000 survival bonus and `round(2000 * hits / shotsSpawned)` accuracy bonus.

## Pure Core Invariants

Authoritative simulation files under `src/core/` are pure JavaScript modules with zero side effects:
- No `Math.random` (use injected `Mulberry32` seeded RNG).
- No `Date.now`, `performance.now`, `requestAnimationFrame`, `setTimeout`, or `setInterval`.
- No DOM (`window`, `document`, `HTMLElement`).
- No Canvas context or Web Audio instances.

## Validation & Test Commands

Run all tracked unit tests (pure deterministic rules, seeded RNG, purity checks, collisions, director):
```bash
npm test
```

Run all Playwright browser tests (Chromium headless, viewport responsiveness, keyboard flow, test seam):
```bash
npm run test:e2e
```

Serve the mechanics slice locally:
```bash
python3 -m http.server 8085 --directory game
```
