<!--
---
title: "Vector Vortex Agent Context"
description: "Game-specific agent instructions for Vector Vortex"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-08"
version: "1.1"
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
  - "[Vector Vortex Spec 01](../docs/specs/spec-01-vector-vortex-core-playable.md)"
  - "[Deliverable 1 Plan](docs/superpowers/plans/2026-09-08-vector-vortex-deliverable-1.md)"
  - "[Deliverable 2 Plan](docs/superpowers/plans/2026-09-08-vector-vortex-deliverable-2.md)"
---

# Vector Vortex Agent Context

Vector Vortex is rung 1 of the wireframe arc: a 24-lane Canvas 2D tube shooter with a fixed-step deterministic core, three lives, one Crawler enemy, and a five-minute director. The twist (topology morph) ships in a later spec. This game directory currently implements Deliverables 1, 2, and 3 of Spec 01: the pure deterministic core, the director, swept collision, scoring, lives, and outcome semantics, the playable HTML slice, the focus-aware input adapter, the balanced Canvas renderer, and the Playwright suite that proves every Deliverable 3 validation box with a named mutation. Deliverable 4 closes the pull request and writes docs.

## Architecture

The simulation is authoritative. The renderer is presentation-only and never advances state.

| Layer | Path | Responsibility |
|---|---|---|
| Pure core | `game/core/*.js` | State, RNG, lane wrap, shots, Crawlers, fixed-step tick, snapshots, events, JSON round-trip, director bands, swept collision, scoring, breach, `kills` counter |
| Accumulators | `game/core/clock.js` | Fixed 60 Hz accumulator with frame-delta cap, pause, hidden-tab suppression |
| Page | `game/index.html` | Canvas with `aria-label` + `role="img"`, semantic DOM status grid, objective, controls, pause and restart buttons |
| Styles | `game/styles.css` | Grid layout, focus rings, viewport warning below 960x540 |
| Renderer | `game/runtime/renderer.js` | Canvas 2D draw, balanced `save`/`restore`, DPR scaling, tracked counters |
| Input | `game/runtime/input.js` | Focus-aware keyboard adapter, blur and visibilitychange clearing |
| Frame runner | `game/runtime/frame-runner.js` | rAF loop, fixed-step clock, `replaceCore`, deterministic test seam |
| DOM projector | `game/runtime/dom.js` | Pure projection of the snapshot to the semantic DOM (no computation) |
| Orchestrator | `game/runtime/main.js` | Wires core + renderer + input + runner; exposes `window.__vv` |
| Unit tests | `tests/core/*.test.js` | Unit and integration tests with named mutations |
| Browser tests | `tests/browser/*.spec.js` | Playwright suite, one test per Deliverable 3 validation box with named mutations |
| Plans | `docs/superpowers/plans/2026-09-08-vector-vortex-deliverable-*.md` | TDD task plans |

### Per-tick order (frozen by spec)

1. drain input → fire attempt (`shot-fired` event after commit)
2. advance shots (carries prev/next for swept collision)
3. advance enemies (carries prev/next)
4. resolve swept collisions (ascending stable enemy ID; first-hit projectile consumption; `enemy-destroyed` event after commit)
5. expire shots at/past far depth (after collision so the final sweep participates; `shot-expired-at-far` event after commit)
6. resolve rim breaches & life loss (ascending enemy ID; grace handling; `breach` and `life-lost` events after commit)
7. director/spawn (deterministic lane via injected seeded RNG; `director-spawn` event after commit)
8. evaluate run boundary (`run-ended` event after commit)
9. advance elapsed
10. emit tick event and flush

### Director bands

| Band | Elapsed ticks | Interval | First spawn tick | Second spawn tick |
|---|---|---:|---:|---:|
| 1 | 0..3,599 | 60 | 59 | 119 |
| 2 | 3,600..10,799 | 48 | 3,647 | 3,695 |
| 3 | 10,800..14,399 | 36 | 10,835 | 10,871 |
| 4 | 14,400..17,999 | 27 | 14,426 | 14,453 |

A band's first spawn = `bandStart + (interval - 1)` per the corrected Spec 01b construction. Band 2's first spawn is therefore 3,647 (not the 3,659 from the earlier spec draft); see `docs/spec-defects.md` for the amendment history.

### Scoring

- Base kill = 100.
- Survival bonus = 5,000.
- Accuracy bonus = `round(2000 * hits / shotsSpawned)`, zero when no shot spawned.
- Accuracy display: `ACC --` until first shot spawns, then nearest whole percent.
- A cooldown-blocked fire request is NOT a shot; the denominator never changes for blocked requests.

### Outcome semantics

- The run simulates all 18,000 ticks (indices 0 through 17,999).
- On every tick, breach and life loss are resolved first. If `lives <= 0`, the run ends `lost`.
- After all 18,000 ticks fully resolve and `lives >= 1`, the run ends `survived` and the survival and accuracy cash-out are applied.
- Breach on the final tick is lethal like any other tick. There is no pre-movement survival grant and no pre-boundary outcome branch.

## Action Map

| Action | Keyboard | Notes |
|---|---|---|
| Move left | Left Arrow or A | Hold; one lane step per tick with wrap |
| Move right | Right Arrow or D | Hold; one lane step per tick with wrap; cancels simultaneous left |
| Fire | Space | Hold-to-fire; 8 tick cooldown, max 6 active shots |
| Pause | Escape or P | Mechanics-slice pause only (D3 owns the final pause surface) |
| Restart | DOM button | Available after an outcome; restores initial seed |

## Commands

```bash
cd vector-vortex
npm install
npm test                 # unit tests (node --test with explicit file list)
npm run test:e2e         # Playwright browser suite (boots its own http-server)
npm run test:e2e:install # one-time Chromium headless install
npm run serve            # serve game/ on port 8123 for manual play
```

The test script invokes `node --test` with an explicit file list. No shell glob expansion. The Playwright suite launches `npx --no-install http-server game -p 8123 --silent` via the config's `webServer` and reads `use.baseURL = 'http://127.0.0.1:8123'`. Removing `use.baseURL` fails the suite rather than skipping it; that is the named mutation for the config validation box.

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
- Deliverable 2 (director, collision, scoring, lives, outcomes): complete.
- Deliverable 3 (Canvas slice + semantic DOM + Playwright suite): complete.
- Deliverable 4 (documentation + pull request): pending.

## Scope Boundaries

- Do not add topology morphs, additional enemy types, stun, particles, hitstop, score popups, persistence, publishing, raster, or sampled audio. Spec 02 and later specs own those.
- The shared browser-game UI framework is vendored in a later spec, not in this directory yet.
- `publish.sh` does not exist in this directory yet; Deliverable 4 introduces it.
- The rules modules under `game/core/` MUST NOT import `window`, `document`, `HTMLCanvasElement`, `OffscreenCanvas`, `Audio*`, `Math.random`, `Date.now`, or `performance.now`. The purity check enforces this and excludes the `-mutation.js` test helper files.