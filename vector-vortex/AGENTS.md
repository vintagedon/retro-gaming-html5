<!--
---
title: "Vector Vortex Agent Context"
description: "Game-specific agent instructions for Vector Vortex"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-20"
version: "1.4"
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
  - "[Vector Vortex Spec 03](../docs/specs/spec-03-vector-vortex-tempest-identity-slice.md)"
  - "[Asset Attribution](game/assets/ATTRIBUTION.md)"
  - "[GameUI Consumer Report](docs/game-ui-consumer-report.md)"
  - "[Vendor Manifest](game/vendor/gameui/MANIFEST.md)"
  - "[Deliverable 1 Plan](docs/superpowers/plans/2026-09-08-vector-vortex-deliverable-1.md)"
  - "[Deliverable 2 Plan](docs/superpowers/plans/2026-09-08-vector-vortex-deliverable-2.md)"
---

# Vector Vortex Agent Context

Vector Vortex is rung 1 of the wireframe arc: a Tempest-style 24-lane Canvas 2D tube shooter with a fixed-step deterministic core. Spec 01 (with its 01b and 01c amendments, merged as pull request #3) delivered the core, the playable slice, and the tracked test suite. Spec 02 (merged as pull request #5) delivered the published MVP: the vendored GameUI foundations, the game-owned wireframe theme, the shell lifecycle, UI sound, defensive persistence, the scoped preview publish, and the GameUI consumer report. Spec 03 (the Tempest identity slice) rebuilt the presentation and the rules on top of that foundation: converging perspective with per-entity colour, tap-and-repeat movement, an enemy that fires back, line-fragment destruction, a single wave replacing the timed run, five full-screen presentation states with an arcade HUD in a shipped pixel font, and shipped assets with attribution.

## Architecture

The simulation is authoritative. The renderer reads snapshots and never advances state; fragments, effect sprites, and the hit flash are renderer-only cosmetics that never touch it.

| Layer | Path | Responsibility |
|---|---|---|
| Pure core | `game/core/*.js` | State, RNG, shape wrap rule, tap-and-repeat movement, shots, Crawlers, enemy fire, wave director, fixed-step tick, outcomes, JSON round-trip, swept collision, breach, events |
| Shape library | `game/core/shapes.js` | Locked five-shape library with `wraps` flags (Circle and Star wrap; Line, True V, Stepped V do not); player movement routes through it |
| Accumulators | `game/core/clock.js` | Fixed 60 Hz accumulator with frame-delta cap, pause, hidden-tab suppression |
| Vendored GameUI | `game/vendor/gameui/` | Pinned upstream foundations, byte-identical; provenance in `MANIFEST.md`. Never edit; move the pin through a new vendoring pass |
| Theme | `game/vector-vortex-theme.css` | Game-owned theme: frozen palette on public tokens, `overrides` layer, `html[data-gc-theme="vector-vortex"]` only |
| Page | `game/index.html` | Playfield canvas, arcade HUD, shell surfaces; `data-gc-theme="vector-vortex"` |
| Assets | `game/assets/` | Shipped Owlish Pixel font, Kenney effect sprites, music loop; licences and provenance in `ATTRIBUTION.md` |
| Styles | `game/styles.css` | Game layout (`.vv-*` classes), pixel font, state surfaces; consumes public tokens; selects no framework internals |
| Renderer | `game/runtime/renderer.js` | Canvas 2D draw: converging perspective, per-entity palette, size/stroke floors, fragments, sprites, hit flash |
| Input | `game/runtime/input.js` | Canvas-only focus gate, keyboard/mouse movement and fire, blur/visibility clearing, `ev.repeat` guard; pause keys route to the shell |
| Frame runner | `game/runtime/frame-runner.js` | rAF loop, fixed-step clock, shell-owned clock gate (`clockGate`), guarded resumes, `replaceCore`, test seam |
| HUD binder | `game/runtime/dom.js` | Binds the HUD from snapshots; presentation formatting only |
| Shell | `game/runtime/shell.js` | Presentation states (title/running/paused/settings/wave-complete/game-over), central clock discipline, focus containment, tabs, settings commands, results screens |
| Game audio | `game/runtime/audio.js` | Synthesized cues + shipped music loop after first gesture; one context, one bus; mute/volume; bounded nodes; state-free |
| Persistence | `game/runtime/storage.js` | `retrohtml5.vector-vortex.v1`; field-level validation; merge writes; silent degradation |
| Orchestrator | `game/runtime/main.js` | Wires everything; exposes `window.__vv` |
| Unit tests | `tests/core/*.test.js` | Node suite incl. shapes, enemy fire, wave director, manifest integrity, source boundaries, asset attribution, publish scope |
| Browser tests | `tests/browser/*.spec.js` | Playwright suite: perspective, colour, presentation states, lifecycle, combat, audio, storage, preview |

### Shell lifecycle

Boot lands on `title` with a fresh core and a paused clock. Real time ticks only while the shell is `running`: every state transition re-asserts the clock centrally, and the runner's clock gate consults the shell on every focus or visibility transition, so nothing ticks behind the title, settings, or a results screen. Start, pause (button, P/Escape on canvas, or window blur while running), settings (from title or paused), resume, Play Again, and return to title are shell transitions. Outcomes observed on a publish while running open the matching results screen (`wave-complete` or `game-over`), which persists a new best. The pause keys ignore auto-repeat: a held Escape or P produces exactly one pause and never resumes on its own. `paused`, `heldInput`, and related lifecycle fields are excluded from cross-run gameplay comparisons.

### Per-tick order (frozen by spec)

1. drain input → tap-and-repeat movement → fire attempt (`shot-fired` event after commit)
2. advance player shots (carries prev/next for swept collision)
3. advance enemies (carries prev/next)
   3b. enemy fire: due enemies spawn shots along their own lane under the active-shot cap (`enemy-shot-fired` event)
   3c. advance enemy shots (carries prev/next)
4. resolve swept collisions, player shots vs enemies (ascending stable enemy ID; first-hit projectile consumption; `enemy-destroyed` event after commit, carrying lane and depth)
5. expire player shots at/past far depth (after collision so the final sweep participates; `shot-expired-at-far` event)
6. resolve rim breaches and life loss (ascending ID; grace handling; `breach` and `life-lost` events)
   6b. enemy-shot hits on the player, AFTER breach resolution so a breach plus a shot on the same tick costs at most one life (swept-interval rule against the player's lane)
   6c. expire enemy shots at the rim, after hit resolution
7. wave director/spawn (deterministic lane via injected seeded RNG, capped by the budget; `director-spawn` event)
8. outcomes: game-over (lives exhausted) resolves before the wave-clear grant; a clear discards in-flight enemy shots (`run-ended` event)
9. advance elapsed
10. emit tick event and flush

### The wave

Fixed budget and interval for the single wave; the four elapsed-time bands of Spec 01 are superseded. The wave clears when the budget is exhausted and no enemies remain: resolved enemies count, not kills, so a survivable breach never strands the player. Player damage and death resolve before any clear grant.

### Scoring

- Kill score only in this slice: 100 per Crawler.
- The Spec 01 survival bonus and accuracy bonus are superseded and retired; the HUD shows score, best, lives, and wave only.
- A cooldown-blocked fire request is NOT a shot.

### Outcome semantics

- `wave-complete`: budget exhausted, roster empty, at least one life → in-flight enemy shots are discarded, gameplay freezes.
- `game-over`: lives reach 0, resolved before the clear check on the same tick, so death on the final enemy is death rather than a clear.

## Action Map

| Action | Keyboard | Notes |
|---|---|---|
| Move left | Left Arrow or A | One lane step per press; hold repeats after 12 ticks, then every 5; Circle wraps |
| Move right | Right Arrow or D | Same repeat rule; cancels simultaneous left |
| Fire | Space | Hold-to-fire; 8 tick cooldown, max 6 active shots |
| Pause / resume | Escape or P | Pause from the canvas opens the pause surface; auto-repeat is ignored on the pause keys |
| Shell navigation | Tab, Enter, arrows | Every surface contains focus; tabs use roving tabindex with Home/End |
| Play Again / Return to Title | Results screens | Play Again starts a fresh running run; Return to Title resets to title |

## Commands

```bash
cd vector-vortex
npm install
npm test                 # unit tests (node --test with explicit file list)
npm run test:e2e         # Playwright browser suite (boots its own http-server)
npm run test:e2e:install # one-time Chromium headless install
npm run serve            # serve game/ on port 8123 for manual play
./publish.sh             # publish game/ to /opt/agents/www/retrogaming/vector-vortex/
VV_PUBLISH_ROOT=<dir> ./publish.sh   # publish to an alternate root (suite isolation)
node scripts/capture-state.mjs <state> [WxH]   # evidence capture
```

The test script invokes `node --test` with an explicit file list. No shell glob expansion. The Playwright suite launches `npx --no-install http-server game -p 8123 --silent` via the config's `webServer` and reads `use.baseURL = 'http://127.0.0.1:8123'`. Removing `use.baseURL` fails the suite rather than skipping it; that is the named mutation for the config validation box. `tests/core/publish.test.js` and `tests/browser/preview.spec.js` publish through the `VV_PUBLISH_ROOT` override into an isolated destination inside the checkout (`test-results/`) and never require the production preview directory.

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
- Spec 02 (wireframe shell and MVP): complete and merged (pull request #5).
- Spec 03 (Tempest identity slice): complete; pull request open for review.

## Scope Boundaries

- One shape (Circle, which wraps), one wave, one enemy type. No shape cycle, no roster, no topology morph, no level progression, no high-score table: those are sized against this slice by a later specification.
- The vendored GameUI tree is read-only. Never edit `game/vendor/gameui/`; a pin moves through a new vendoring pass recorded in its manifest.
- Game CSS selects `vv-` classes and game elements only and never restyles framework internals; `tests/core/source-boundaries.test.js` enforces the namespace and consumption boundaries.
- `publish.sh` wipes and repopulates only its `vector-vortex/` subfolder under its destination root (production default `/opt/agents/www/retrogaming/`; `VV_PUBLISH_ROOT` overrides it for suite isolation); never touch the umbrella root or a sibling game.
- The rules modules under `game/core/` MUST NOT import `window`, `document`, `HTMLCanvasElement`, `OffscreenCanvas`, `Audio*`, `Math.random`, `Date.now`, or `performance.now`. The purity check enforces this and excludes the `-mutation.js` test helper files.
- Persistence never stores in-progress run state, seeds, replays, or analytics; the only key is `retrohtml5.vector-vortex.v1`.
- Every shipped asset under `game/assets/` carries its licence and attribution in `game/assets/ATTRIBUTION.md`, and every listed licence permits redistribution of the file itself in a public repository. Nothing ships from a pack whose terms do not clearly permit that (see the reported conflicts in the attribution file).
