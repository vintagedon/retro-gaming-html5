<!--
---
title: "Vector Vortex"
description: "Browser-based 24-lane wireframe tube shooter with a deterministic fixed-step core and a game-owned wireframe shell on vendored GameUI foundations"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-19"
version: "0.6.0"
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
  - "[GameUI Consumer Report](docs/game-ui-consumer-report.md)"
  - "[Vendor Manifest](game/vendor/gameui/MANIFEST.md)"
  - "[Evidence Captures](docs/evidence/README.md)"
  - "[Spec Defects (local)](docs/spec-defects.md)"
  - "[Game README](game/README.md)"
  - "[Tests README](tests/README.md)"
  - "[Plans README](docs/superpowers/plans/README.md)"
---

# Vector Vortex

Rung 1 of the wireframe arc: a 24-lane wireframe tube shooter built on a fixed-step, deterministic core. The player rides the rim of a fixed circular tube, fires inward along the current lane, and destroys outward-advancing Crawlers before they reach the rim. A run lasts five minutes with three lives and a survival cash-out. The screen-space shell (title, pause, settings, run-ended, HUD) is game-owned DOM on vendored GameUI foundations; the Canvas playfield stays game-owned rendering.

This directory implements Spec 01 and its 01b/01c amendments (the toolchain, the pure deterministic core, the director and scoring, the playable Canvas slice, the Playwright suite) and Spec 02 (the pinned GameUI vendoring, the wireframe theme, the frozen HUD, the shell with UI sound and defensive persistence, the scoped preview publish, and the GameUI consumer report).

## Status

| Deliverable | Status |
|---|---|
| Spec 01: toolchain, core, director/collision/scoring, Canvas slice, docs | Complete (pull request #3, merged) |
| Spec 01b: contract corrections and mutation-test rebuild | Complete |
| Spec 01c: playability repairs and test truth (pass 1 + continuation) | Complete |
| Spec 02 deliverable 1: pinned GameUI foundations + wireframe theme | Complete |
| Spec 02 deliverable 2: responsive frozen DOM HUD | Complete |
| Spec 02 deliverable 3: shell, UI sound, defensive storage | Complete |
| Spec 02 deliverable 4: scoped preview, captures, consumer report | Complete |
| Spec 02 deliverable 5: documentation and closeout | Complete |

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

The unit-test suite invokes `node --test` with an explicit file list. No shell glob expansion is used; renaming a test file changes the reported count, which is a named mutation for the unit-test discovery validation. The browser suite boots its own `http-server` on port 8123 via the Playwright config; `tests/browser/preview.spec.js` publishes first and serves the published tree on port 8125.

## Preview

`./publish.sh` copies only `game/` to `/opt/agents/www/retrogaming/vector-vortex/` and writes a deterministic content-digest marker (`vv-preview-marker.txt`). The published URL is `https://retrogaming.donfather.site/vector-vortex/`. The script refuses any destination whose basename is not `vector-vortex` and never touches the umbrella root or a sibling game.

## Vendored GameUI

The published foundations of `html5-game-ui-framework` are vendored byte-identical under `game/vendor/gameui/` at upstream commit `a678a2b0f135a991b4eacb8e62ea8d94f20c4505`, with provenance, license location, and a SHA-256 per file in `game/vendor/gameui/MANIFEST.md`. The game composes `.gc-panel`, `.gc-button`, `.gc-input`, and `.gc-meter` and the public token tiers, activates `data-gc-theme="vector-vortex"`, and places its own theme in the documented `overrides` cascade layer. The upstream license is MIT (`upstream LICENSE`); this vendored snapshot redistributes the published CSS/ESM source unmodified. Never edit the vendored tree; move the pin through a new vendoring pass recorded in the manifest.

## Game-UI storage and audio

One storage key, `retrohtml5.vector-vortex.v1`, holds `{ version, preferences: { muted, volume, motion }, bestScore }` with field-level validation and silent degradation on quota or security failure. A new best writes only after a run ends. UI sound is synthesized after the first deliberate gesture: one AudioContext, one gain bus, mute silences it, volume scales it, active nodes are bounded.

## Architecture

The simulation is authoritative. The renderer reads snapshots and never advances state.

```
game/core/
├── rng.js          seeded RNG (Mulberry32) with serialized position
├── lanes.js        24-lane wrap, opposite-direction cancel
├── shots.js        cooldown, cap, advance, expire-at-far, prev/next, shot-fired event
├── enemies.js      Crawler spawn, advance, rim breach (ascending stable ID), prev/next
├── director.js     band table, shouldSpawnOnTick, spawn lane from injected RNG
├── collision.js    swept-interval overlap, ascending-id tie, first-hit consumption
├── breach.js       rim breach with grace and ascending-id ordering
├── scoring.js      accuracy percent display, accuracy bonus
├── clock.js        fixed-step accumulator with frame-delta cap, pause, hidden-tab suppression
└── core.js         state factory, per-tick order, JSON round-trip, semantic events
```

## Runtime

```
game/
├── index.html              HUD, shell surfaces, canvas; data-gc-theme="vector-vortex"
├── styles.css              game layout (.vv-*) in the overrides layer
├── vector-vortex-theme.css game-owned theme: frozen palette on public tokens
├── vendor/gameui/          pinned html5-game-ui-framework snapshot (see MANIFEST.md)
├── core/                   pure deterministic simulation (Spec 01, unchanged)
└── runtime/
    ├── renderer.js         Canvas 2D: rings, lane rails, player, shots, Crawlers (frozen palette)
    ├── input.js            focus-aware keydown/keyup, blur/visibility clearing, ev.repeat guard
    ├── frame-runner.js     rAF loop, fixed-step clock, shell clock handles, visibility rebase
    ├── dom.js              HUD binder: snapshot projection, no arithmetic
    ├── shell.js            shell states, focus containment, settings, storage+audio wiring
    ├── audio.js            synthesized UI cues: one context, one bus, bounded nodes
    ├── storage.js          defensive persistence for retrohtml5.vector-vortex.v1
    └── main.js             wires everything; exposes window.__vv for Playwright
```

### Shell states

`title` → `running` → (`paused` ⇄) → `settings` → `ended`. The frame clock runs only while running; the title holds a fresh unpaused core with a paused clock. Dialogs contain focus, close on Escape where safe, and restore focus to the invoking control. Settings carries exactly Audio (mute, volume 0..100), Display (motion: system/reduced/full), and Controls (read-only map) plus reset-to-defaults.

### Controls

| Action | Keys |
|---|---|
| Move left / right | Left Arrow / A, Right Arrow / D |
| Fire | Space (hold) |
| Pause / resume | Escape or P |
| Shell navigation | Tab, Enter, arrows in tabs |

### Supported viewports

`1024x576`, `1280x720`, `1440x900`, `1920x1080`. Below `960` wide the shell surfaces stay operable and a non-blocking "larger play area recommended" message appears, shown by the stylesheet's `@media (max-width: 960px)` rule (`display` toggling, no JavaScript and no markup class).

### Test seam: `window.__vv`

| Method | Purpose |
|---|---|
| `advanceTicks(n)` | Advance the core by `n` fixed-step ticks and re-publish the snapshot |
| `reset(seed)` | Rebind every consumer of the core to a fresh `createCore({ seed })` and reset the director RNG |
| `getSnapshot()` | Return the current core snapshot (includes `remainingTicks`, `accuracyDisplay`) |
| `getKeyCounters()` | Return `{ saveCount, restoreCount }` for the most recent frame |
| `setLeft/Right/Fire(boolean)` | Drive the core's held input directly (test-only) |
| `setState(next)` | Replace the core's state (test-only) |
| `setLane(n)` | Advance `n` lane steps via `advanceTicks(1)` |
| `getShellState()` | Return the shell lifecycle state |
| `getShellLog()` | Return the shell command log |
| `getAudioState()` | Return `{ unlocked, muted, volume, busGain, activeNodes, contextState }` |
| `getBest()` | Return the persisted best score |

Mutation toggles the runtime honors (all default to falsy, never enabled in production):

- `window.__vv.disableKeydown` — input adapter no-ops on `keydown`/`keyup`
- `window.__vv.disableInputAdapter` — entire input adapter is inert (blur/focus/visibility/key handlers all no-op)
- `window.__vv.disableFocusGate` — gameplay keys dispatch regardless of which surface holds focus
- `window.__vv.disableFrameRunner` — frame runner's rAF loop short-circuits to a no-op
- `window.__vv.disableUiAudio` — the shell runs the no-op audio adapter (audio-equivalence validation)
- `window.__vv.preventSpaceAtWindow` — input adapter calls `preventDefault` on Space at the window level
- `window.__vv.skipFrameRunnerRebind` — `reset(seed)` does NOT rebind the frame runner
- `window.__vv.skipOneRestore` — renderer drops one matching `restore()` on the first lane rail
- `window.__vv.pauseRaf` — frame runner's rAF loop skips the clock push (used by tests that drive ticks via the seam)
- `window.__vv.bestProvider` — a function overriding the HUD BEST source (test injection)

## Director Bands

| Band | Elapsed ticks | Interval | First spawn tick | Second spawn tick |
|---|---|---:|---:|---:|
| 1 | 0..3,599 | 60 | 59 | 119 |
| 2 | 3,600..10,799 | 48 | 3,647 | 3,695 |
| 3 | 10,800..14,399 | 36 | 10,835 | 10,871 |
| 4 | 14,400..17,999 | 27 | 14,426 | 14,453 |

A band's first spawn is computed uniformly as `bandStart + (interval - 1)`. The director uses the injected seeded RNG to draw lanes, and the RNG position is serialized into the core state so a JSON round-trip reproduces the same lane sequence.

## Scoring

- Base kill = 100.
- Survival bonus = 5,000.
- Accuracy bonus = `round(2000 * hits / shotsSpawned)`, zero when no shot spawned.
- Accuracy display: `ACC --` until first shot spawns, then nearest whole percent. The display string is computed by the core and projected verbatim by the DOM.
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
| `./publish.sh` | Publish `game/` to the preview umbrella (idempotent, scoped) |
| `node scripts/capture-state.mjs <state> [WxH]` | Capture a named state to `docs/evidence/` |
| `node --test tests/core/<file>.test.js` | Run one unit test file |

## Constraints

- Node 22.23.2 is pinned in `.nvmrc` and `package.json` `engines`.
- Rules modules under `game/core/` MUST NOT import `window`, `document`, `HTMLCanvasElement`, `OffscreenCanvas`, `Audio*`, `Math.random`, `Date.now`, or `performance.now`. A source purity check enforces this and rejects any `-mutation.js` test helper placed under `game/core/`.
- 24 lanes wrap; clamping is rejected. Cooldown is 8 ticks; cap is 6 active shots.
- 18,000-tick run length, three lives, 30-tick damage grace, 5,000 survival bonus.
- Per-tick order is total and frozen by spec.

## License

Code: MIT. Original content: CC-BY-4.0. The vendored GameUI snapshot under `game/vendor/gameui/` is MIT-licensed upstream (`html5-game-ui-framework`, see `game/vendor/gameui/MANIFEST.md` for the license location and pinned revision); it is redistributed unmodified.