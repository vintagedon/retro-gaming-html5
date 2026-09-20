<!--
---
title: "Vector Vortex Agent Context"
description: "Game-specific agent instructions for Vector Vortex"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-19"
version: "1.3"
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
  - "[Vector Vortex Spec 02](../docs/specs/spec-02-vector-vortex-wireframe-shell-and-mvp.md)"
  - "[GameUI Consumer Report](docs/game-ui-consumer-report.md)"
  - "[Vendor Manifest](game/vendor/gameui/MANIFEST.md)"
  - "[Deliverable 1 Plan](docs/superpowers/plans/2026-09-08-vector-vortex-deliverable-1.md)"
  - "[Deliverable 2 Plan](docs/superpowers/plans/2026-09-08-vector-vortex-deliverable-2.md)"
---

# Vector Vortex Agent Context

Vector Vortex is rung 1 of the wireframe arc: a 24-lane Canvas 2D tube shooter with a fixed-step deterministic core, three lives, one Crawler enemy, and a five-minute director. Spec 01 (with its 01b and 01c amendments, merged as pull request #3) delivered the core, the playable slice, and the tracked test suite. Spec 02 delivered the published MVP: the vendored GameUI foundations, the game-owned wireframe theme, the frozen DOM HUD, the shell lifecycle with synthesized UI sound and defensive persistence, the scoped preview publish, and the GameUI consumer report. The topology twist ships in Spec 03, which this MVP gates.

## Architecture

The simulation is authoritative. The renderer reads snapshots and never advances state. The shell owns screen-space DOM lifecycle; it never computes a rules value.

| Layer | Path | Responsibility |
|---|---|---|
| Pure core | `game/core/*.js` | State, RNG, lane wrap, shots, Crawlers, fixed-step tick, snapshots (incl. `remainingTicks` projection), events, JSON round-trip, director bands, swept collision, scoring, breach, `kills` counter |
| Accumulators | `game/core/clock.js` | Fixed 60 Hz accumulator with frame-delta cap, pause, hidden-tab suppression |
| Vendored GameUI | `game/vendor/gameui/` | Pinned upstream foundations, byte-identical; provenance in `MANIFEST.md`. Never edit; move the pin through a new vendoring pass |
| Theme | `game/vector-vortex-theme.css` | Game-owned theme: frozen palette on public tokens, `overrides` layer, `html[data-gc-theme="vector-vortex"]` only |
| Page | `game/index.html` | HUD, shell surfaces, canvas with `aria-label` + `role="img"`, objective and controls text |
| Styles | `game/styles.css` | Game layout (`.vv-*` classes) in the overrides layer; consumes public tokens; selects no framework internals |
| Renderer | `game/runtime/renderer.js` | Canvas 2D draw in the frozen palette, balanced `save`/`restore`, DPR scaling, tracked counters |
| Input | `game/runtime/input.js` | Canvas-only focus gate, keyboard/mouse movement and fire, blur/visibility clearing, `ev.repeat` guard; pause keys route to the shell |
| Frame runner | `game/runtime/frame-runner.js` | rAF loop, fixed-step clock, shell clock handles (`pauseClock`/`resumeClock`), guarded resumes, `replaceCore`, test seam |
| HUD binder | `game/runtime/dom.js` | Binds the frozen HUD from snapshots; presentation formatting only |
| Shell | `game/runtime/shell.js` | Lifecycle states (title/running/paused/settings/ended), dialog focus containment, Escape safety, invoker restoration, tabs, settings commands, run-ended breakdown |
| UI audio | `game/runtime/audio.js` | Synthesized cues after first gesture; one context, one bus; mute/volume; bounded nodes; state-free |
| Persistence | `game/runtime/storage.js` | `retrohtml5.vector-vortex.v1`; field-level validation; merge writes; silent degradation |
| Orchestrator | `game/runtime/main.js` | Wires everything; exposes `window.__vv` |
| Unit tests | `tests/core/*.test.js` | Node suite incl. manifest integrity, source boundaries, HUD projection, publish scope |
| Browser tests | `tests/browser/*.spec.js` | Playwright suite: shell journeys, HUD, audio equivalence, storage fixtures, theme, preview |

### Shell lifecycle

Boot lands on `title` with a fresh core and a paused clock; the clock runs only while `running`. Start, pause (button, P/Escape on canvas, or window blur while running), settings (from title or paused), resume, new run, and return to title are shell transitions. Outcomes observed on a publish while running open the ended surface, which persists a new best. `paused`, `heldInput`, and related lifecycle fields are excluded from cross-run gameplay comparisons.

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
| Pause / resume | Escape or P | Pause from the canvas opens the pause surface; Escape or P inside it resumes |
| Shell navigation | Tab, Enter, arrows | Dialogs contain focus; tabs use roving tabindex with Home/End |
| New Run / Return to Title | Ended surface | New Run starts a fresh running run; Return to Title resets to title |

## Commands

```bash
cd vector-vortex
npm install
npm test                 # unit tests (node --test with explicit file list)
npm run test:e2e         # Playwright browser suite (boots its own http-server)
npm run test:e2e:install # one-time Chromium headless install
npm run serve            # serve game/ on port 8123 for manual play
./publish.sh             # publish game/ to /opt/agents/www/retrogaming/vector-vortex/
node scripts/capture-state.mjs <state> [WxH]   # evidence capture
```

The test script invokes `node --test` with an explicit file list. No shell glob expansion. The Playwright suite launches `npx --no-install http-server game -p 8123 --silent` via the config's `webServer` and reads `use.baseURL = 'http://127.0.0.1:8123'`. Removing `use.baseURL` fails the suite rather than skipping it; that is the named mutation for the config validation box. `tests/browser/preview.spec.js` publishes first and serves the published tree on port 8125.

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
| Starting lives | 3 |
| Damage grace | 30 ticks |
| Move repeat delay (Spec 03) | 12 ticks |
| Move repeat interval (Spec 03) | 5 ticks |
| Wave spawn budget (Spec 03) | 12 enemies |
| Wave spawn interval (Spec 03) | 150 ticks |
| Wave first spawn tick (Spec 03) | 90 |
| Enemy fire interval (Spec 03) | 150 ticks per enemy |
| Enemy fire earliest tick (Spec 03) | 120 ticks since spawn |
| Enemy shot speed (Spec 03) | 0.010 depth/tick |
| Maximum active enemy shots (Spec 03) | 4 |

The timed-run rows of the Spec 01 v3.0 table (run length 18,000 ticks, survival bonus, accuracy bonus) are superseded by Spec 03's single-wave play with kill score only; see the supersession table in `docs/specs/spec-03-vector-vortex-tempest-identity-slice.md`.

## Current Spec Status

- Spec 01 (core playable) and amendments 01b/01c: complete and merged (pull request #3).
- Spec 02 deliverable 1 (pinned GameUI foundations + wireframe theme): complete.
- Spec 02 deliverable 2 (responsive frozen DOM HUD): complete.
- Spec 02 deliverable 3 (shell, UI sound, defensive storage): complete.
- Spec 02 deliverable 4 (scoped preview, captures, consumer report): complete.
- Spec 02 deliverable 5 (documentation and closeout): complete; pull request open for review.
- Spec 03 (topology shift and combat polish): gated on this MVP's acceptance.

## Scope Boundaries

- Do not add topology morphs, additional enemy types, stun, particles, hitstop, score popups, combat audio, or sampled audio. Spec 03 owns the twist.
- The vendored GameUI tree is read-only. Never edit `game/vendor/gameui/`; a pin moves through a new vendoring pass recorded in its manifest.
- Game CSS selects `vv-` classes and game elements only and never restyles framework internals; `tests/core/source-boundaries.test.js` enforces the namespace and consumption boundaries.
- `publish.sh` wipes and repopulates only `/opt/agents/www/retrogaming/vector-vortex/`; never touch the umbrella root or a sibling game.
- The rules modules under `game/core/` MUST NOT import `window`, `document`, `HTMLCanvasElement`, `OffscreenCanvas`, `Audio*`, `Math.random`, `Date.now`, or `performance.now`. The purity check enforces this and excludes the `-mutation.js` test helper files.
- Persistence never stores in-progress run state, seeds, replays, or analytics; the only key is `retrohtml5.vector-vortex.v1`.