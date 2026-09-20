<!--
---
title: "Vector Vortex"
description: "A Tempest-style 24-lane wireframe tube shooter: converging perspective, per-entity colour, tap-and-repeat movement, an enemy that shoots back, wave-based play, and a game-owned shell with shipped pixel font and audio"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-20"
version: "0.7.0"
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
  - "[Spec 02: Wireframe Shell and MVP](../docs/specs/spec-02-vector-vortex-wireframe-shell-and-mvp.md)"
  - "[Spec 03: Tempest Identity Slice](../docs/specs/spec-03-vector-vortex-tempest-identity-slice.md)"
  - "[GameUI Consumer Report](docs/game-ui-consumer-report.md)"
  - "[Vendor Manifest](game/vendor/gameui/MANIFEST.md)"
  - "[Asset Attribution](game/assets/ATTRIBUTION.md)"
  - "[Evidence Captures](docs/evidence/README.md)"
  - "[Spec Defects (local)](docs/spec-defects.md)"
  - "[Game README](game/README.md)"
  - "[Tests README](tests/README.md)"
  - "[Plans README](docs/superpowers/plans/README.md)"
---

# Vector Vortex

Rung 1 of the wireframe arc: a Tempest-style shooter on a 24-lane tube. The playfield is a tube seen from one end, a near rim at the viewer and a far rim converging toward a vanishing point above centre, drawn in per-entity colour on a black interior. The player rides the rim in a yellow chevron claw, fires green dashes inward, and destroys magenta Crawlers before they reach the rim while the Crawlers fire back. The slice plays one wave: a fixed spawn budget and interval, ending in a wave-complete or game-over screen. The screen-space shell (title, pause, settings, results, HUD) is game-owned DOM on vendored GameUI foundations, with the HUD and menu in a shipped pixel font and a shipped music loop.

This directory implements Spec 01 and its 01b/01c amendments (the toolchain, the pure deterministic core, the director, collision and scoring, the playable Canvas slice, the Playwright suite), Spec 02 (the pinned GameUI vendoring, the wireframe theme, the shell with UI sound and defensive persistence, the scoped preview publish, and the GameUI consumer report), and Spec 03, the Tempest identity slice: test isolation for the publish suites, the converging perspective projection with per-entity colour, the shape `wraps` flag, tap-and-repeat movement, an enemy that fires back, line-fragment destruction, the single-wave core, the five presentation states, the arcade HUD, and shipped assets with attribution.

## Status

| Deliverable | Status |
|---|---|
| Spec 01: toolchain, core, director/collision/scoring, Canvas slice, docs | Complete (pull request #3, merged) |
| Spec 01b: contract corrections and mutation-test rebuild | Complete |
| Spec 01c: playability repairs and test truth (pass 1 + continuation) | Complete |
| Spec 02: shell, theme, HUD, storage, publish, consumer report | Complete (pull request #5, merged) |
| Spec 03 gate 1: test isolation, perspective, colour, playfield | Complete |
| Spec 03 gate 2: controls, combat, single-wave core | Complete |
| Spec 03 gate 3: presentation states, HUD, audio | Complete |
| Spec 03 gate 4: final validation, publish, record | Complete |

## Quick Start

```bash
cd vector-vortex
npm install
npm test
npm run test:e2e:install   # one-time Chromium download
npm run test:e2e
npm run serve              # play locally on http://127.0.0.1:8123
./publish.sh               # publish game/ to the preview umbrella
```

The unit-test suite invokes `node --test` with an explicit file list. No shell glob expansion is used; renaming a test file changes the reported count, which is a named mutation for the unit-test discovery validation. The browser suite boots its own `http-server` on port 8123 via the Playwright config; `tests/browser/preview.spec.js` publishes first and serves the published tree on port 8125. Both publisher-touching suites publish into an isolated destination inside the checkout through the `VV_PUBLISH_ROOT` override and never require the production preview directory to exist.

## Playing

Tap left or right to move one lane; hold to repeat after a short delay. Hold Space to fire inward along your lane. Crawlers advance from the far end; a Crawler that reaches the rim costs a life, and a Crawler shot that crosses your lane costs one too, both with a 30-tick grace between hits. Destroying a Crawler scores 100 and shatters it into line fragments. The wave ends when every Crawler has spawned and been resolved: clear it for the wave-complete screen, or lose three lives for game over.

## Preview

`./publish.sh` copies only `game/` (including `assets/`) to `/opt/agents/www/retrogaming/vector-vortex/` and writes a deterministic content-digest marker (`vv-preview-marker.txt`). The published URL is `https://retrogaming.donfather.site/vector-vortex/`. The script refuses any destination whose basename is not `vector-vortex` and never touches the umbrella root or a sibling game.

## Vendored GameUI

The published foundations of `html5-game-ui-framework` are vendored byte-identical under `game/vendor/gameui/` at upstream commit `a678a2b0f135a991b4eacb8e62ea8d94f20c4505`, with provenance, license location, and a SHA-256 per file in `game/vendor/gameui/MANIFEST.md`. The game composes `.gc-panel`, `.gc-button`, and `.gc-input` and the public token tiers, activates `data-gc-theme="vector-vortex"`, and places its own theme in the documented `overrides` cascade layer. The upstream license is MIT (`upstream LICENSE`); this vendored snapshot redistributes the published CSS/ESM source unmodified. Never edit the vendored tree; move the pin through a new vendoring pass recorded in the manifest.

## Game assets

Spec 03 relaxed the zero-asset rule for games while the framework itself stays zero-raster: a game is an end product and carries what it needs. `game/assets/` ships the Owlish Pixel font (CC BY 4.0), three CC0 effect sprites from the Kenney Particle Pack, and one CC BY 4.0 music loop converted to Ogg. `game/assets/ATTRIBUTION.md` records the pack, author, licence, source, and any transformation per asset; every listed licence permits redistribution of the file itself in a public repository. Combat sound (fire, hit, destruction) and UI cues are synthesized on one shared gain bus.

## Architecture

The simulation is authoritative. The renderer reads snapshots and never advances state.

```
game/core/
├── rng.js          seeded RNG (Mulberry32) with serialized position
├── shapes.js       shape library with wraps flags; lane stepping under the wrap rule
├── lanes.js        tap-and-repeat movement, opposite-direction cancel
├── shots.js        cooldown, cap, advance, expire-at-far, prev/next, shot-fired event
├── enemies.js      Crawler spawn, advance, rim breach (ascending stable ID), prev/next
├── enemy-shots.js  enemy fire schedule, advance, expire-at-rim, balance rows
├── director.js     single-wave budget, interval, first spawn, spawn lane from injected RNG
├── collision.js    swept-interval overlap, ascending-id tie, first-hit consumption
├── breach.js       rim breach with grace and ascending-id ordering
├── clock.js        fixed-step accumulator with frame-delta cap, pause, hidden-tab suppression
└── core.js         state factory, per-tick order, outcomes, JSON round-trip, semantic events
```

## Runtime

```
game/
├── index.html              playfield canvas, arcade HUD, shell surfaces; data-gc-theme="vector-vortex"
├── styles.css              game layout (.vv-*) in the overrides layer, pixel font, state surfaces
├── vector-vortex-theme.css game-owned theme: frozen palette on public tokens
├── assets/                 shipped font, effect sprites, music; see ATTRIBUTION.md
├── vendor/gameui/          pinned html5-game-ui-framework snapshot (see MANIFEST.md)
├── core/                   pure deterministic simulation (see above)
└── runtime/
    ├── renderer.js         Canvas 2D: converging perspective web, per-entity colour, fragments, sprites
    ├── input.js            focus-aware keydown/keyup, blur/visibility clearing, ev.repeat guard
    ├── frame-runner.js     rAF loop, fixed-step clock, shell-owned clock gate, visibility rebase
    ├── dom.js              HUD binder: snapshot projection, no arithmetic
    ├── shell.js            five presentation states, focus containment, settings, storage+audio wiring
    ├── audio.js            synthesized cues + shipped music loop: one context, one bus, bounded nodes
    ├── storage.js          defensive persistence for retrohtml5.vector-vortex.v1
    └── main.js             wires everything; exposes window.__vv for Playwright
```

### Presentation states

Five states, each owning the viewport: `title` (pixel-font composition over a decorative vector web), `running` (the web with the compact HUD), `paused` (small overlay: resume, restart, settings, return to title), `settings` (reached from title or paused), and the results screens `wave-complete` and `game-over`. The frame clock runs only while running: the shell re-asserts the clock on every transition and the runner consults the shell on focus and visibility, so nothing ever ticks behind the title or settings. Surfaces contain focus (Shift+Tab from the first control wraps to the last), settings tabs traverse by arrow keys, and the pause keys ignore auto-repeat so a held key cannot pause twice or resume on its own.

### Controls

| Action | Keys |
|---|---|
| Move left / right (one lane per press; hold repeats after 12 ticks, then every 5) | Left Arrow / A, Right Arrow / D |
| Fire | Space (hold) |
| Pause / resume | Escape or P |
| Shell navigation | Tab, Enter, arrows in tabs |

### Supported viewports

`1024x576`, `1280x720`, `1440x900`, `1920x1080`. The playfield fills the viewport at all four and the HUD stays inside it with no horizontal scroll.

### Test seam: `window.__vv`

| Method | Purpose |
|---|---|
| `advanceTicks(n)` | Advance the core by `n` fixed-step ticks and re-publish the snapshot |
| `reset(seed)` | Rebind every consumer of the core to a fresh `createCore({ seed })` and reset the wave director RNG |
| `getSnapshot()` | Return the current core snapshot (shots, enemies, enemy shots, wave budget, outcome) |
| `getKeyCounters()` | Return `{ saveCount, restoreCount }` for the most recent frame |
| `setLeft/Right/Fire(boolean)` | Drive the core's held input directly (test-only) |
| `setState(next)` | Replace the core's state (test-only) |
| `setLane(n)` | Tap right `n` times, two ticks per tap |
| `getShellState()` | Return the shell lifecycle state |
| `getShellLog()` | Return the shell command log |
| `getAudioState()` | Return `{ unlocked, muted, volume, busGain, activeNodes, contextState, musicLoaded, musicPlaying }` |
| `getBest()` | Return the persisted best score |

Mutation toggles the runtime honors (all default to falsy, never enabled in production):

- `window.__vv.disableKeydown` — input adapter no-ops on `keydown`/`keyup`
- `window.__vv.disableInputAdapter` — entire input adapter is inert (blur/focus/visibility/key handlers all no-op)
- `window.__vv.disableFocusGate` — gameplay keys dispatch regardless of which surface holds focus
- `window.__vv.disableFrameRunner` — frame runner's rAF loop short-circuits to a no-op
- `window.__vv.disableUiAudio` — the shell runs the no-op audio adapter (audio-equivalence validation)
- `window.__vv.disableFragments` — destruction fragments are not spawned (fragments-parity validation)
- `window.__vv.preventSpaceAtWindow` — input adapter calls `preventDefault` on Space at the window level
- `window.__vv.skipFrameRunnerRebind` — `reset(seed)` does NOT rebind the frame runner
- `window.__vv.skipOneRestore` — renderer drops one matching `restore()` on the first lane rail
- `window.__vv.pauseRaf` — frame runner's rAF loop skips the clock push (used by tests that drive ticks via the seam)
- `window.__vv.bestProvider` — a function overriding the HUD BEST source (test injection)

## The Wave

| Constant | Value |
|---|---:|
| Spawn budget | 12 enemies |
| Spawn interval | 150 ticks |
| First spawn tick | 90 |
| Enemy fire earliest tick | 120 ticks after spawn |
| Enemy fire interval | 150 ticks per enemy |
| Enemy shot speed | 0.010 depth/tick |
| Max active enemy shots | 4 |

Spawns draw lanes from the injected seeded RNG, and the RNG position is serialized into the core state so a JSON round-trip reproduces the same lane sequence. The wave clears when the budget is exhausted and no enemies remain; player death resolves before any clear.

## Scoring

Kill score only in this slice: 100 per Crawler. The Spec 01 survival and accuracy bonuses are superseded and retired. A cooldown-blocked fire request is not a shot.

## Outcome

- All 12 budget enemies resolved with at least one life left → `wave-complete`: in-flight enemy shots are discarded and gameplay freezes.
- Lives reach 0 at any point → `game-over`, resolved before any clear, so death on the final enemy is death, not a clear.

## Commands

| Command | Purpose |
|---|---|
| `npm install` | Install tracked toolchain (unit + Playwright) |
| `npm test` | Run all unit tests via `node --test` with explicit file list |
| `npm run test:e2e` | Run the Playwright browser suite (boots its own `http-server` on port 8123) |
| `npm run test:e2e:install` | One-time install of the Chromium headless binary |
| `npm run serve` | Serve `game/` on port 8123 for manual play |
| `./publish.sh` | Publish `game/` to the preview umbrella (idempotent, scoped) |
| `VV_PUBLISH_ROOT=<dir> ./publish.sh` | Publish to an alternate root (used by the suites for isolation) |
| `node scripts/capture-state.mjs <state> [WxH]` | Capture a named state to `docs/evidence/` |
| `node --test tests/core/<file>.test.js` | Run one unit test file |

## Constraints

- Node 22.23.2 is pinned in `.nvmrc` and `package.json` `engines`.
- Rules modules under `game/core/` MUST NOT import `window`, `document`, `HTMLCanvasElement`, `OffscreenCanvas`, `Audio*`, `Math.random`, `Date.now`, or `performance.now`. A source purity check enforces this and rejects any `-mutation.js` test helper placed under `game/core/`.
- 24 lanes; Circle wraps. Cooldown is 8 ticks; cap is 6 active player shots and 4 active enemy shots.
- Three lives per game, 30-tick damage grace; a breach and an enemy shot on the same tick cost at most one life.
- Per-tick order is total and frozen by spec; renderer and fragments never touch it.
- Every shipped asset carries its licence and attribution in `game/assets/ATTRIBUTION.md`, and every listed licence permits redistribution in a public repository.

## License

Code: MIT. Original content: CC-BY-4.0. The vendored GameUI snapshot under `game/vendor/gameui/` is MIT-licensed upstream (`html5-game-ui-framework`, see `game/vendor/gameui/MANIFEST.md` for the license location and pinned revision); it is redistributed unmodified. Shipped game assets under `game/assets/` carry their own licences and attribution as recorded in `game/assets/ATTRIBUTION.md`.
