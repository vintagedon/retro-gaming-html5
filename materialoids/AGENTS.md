<!--
---
title: "Materialoids Agent Context"
description: "Game-specific agent instructions for Materialoids"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-06-25"
version: "1.1"
status: "Active"
tags:
  - type: guide
  - domain: implementation
  - tech: [javascript, html5, canvas, css, es-modules]
  - game: materialoids
related_documents:
  - "[Repository AGENTS](../AGENTS.md)"
  - "[Game README](README.md)"
  - "[Vendored GameUI](game/ui/README.md)"
  - "[Blastemoids Template Readme](../asset-game/materialoids/blastemoids-html-game-template-free/readme.md)"
---
-->

# Materialoids Agent Context

Materialoids is a wireframe asteroids game built on the adopted Blastemoids single-file HTML5 template, wrapped in a vendored GameUI neon shell. The engine is vanilla Canvas 2D in one self-contained `game/index.html`: no Phaser, no bundler, no npm packages, no build step, no external assets. Web Audio and versioned localStorage are the only browser APIs beyond canvas and input. The GameUI shell layer is plain CSS plus ES-module factories vendored under `game/ui/`, loaded with `<link>` and `<script type="module">`.

## Engine and Architecture

The whole game lives in `game/index.html`, with the JavaScript divided into 16 numbered sections. The template readme holds the authoritative section map, CONFIG keys, and customization guidance:

`../asset-game/materialoids/blastemoids-html-game-template-free/readme.md`

Section reference (from the readme):

| # | Section | Purpose |
|---|---------|---------|
| 1 | `CONFIG` | World dims, entity defs, audio levels, storage keys, tipURL |
| 2 | Utilities | clamp, lerp, wrap, wrapDelta, glow helper |
| 3 | Audio | Procedural Web Audio with persistent thrust oscillator |
| 4 | Settings | Versioned localStorage |
| 5 | Stats | Versioned localStorage |
| 6 | High Scores | Top 8 with 3-letter initials |
| 7 | Input | Keyboard, gamepad, virtual-button hit testing |
| 8 | Pool + glow helper | Reusable particle pool, withGlow wrapper |
| 9 | Particles | Dot trails (engine) and line fragments (debris) |
| 9B | Molecular Clouds + Illumination | Drifting filled nebula gas; additive `lighter` glow for bullet trails and fracture flashes; `Clouds` and `Illumination` IIFEs |
| 10 | Bullet class | Position, velocity, lifetime, hostile flag |
| 11 | Ship class | Rotate, thrust, fire, hyperspace, draw |
| 12 | Asteroid class | Random vertex generation, split logic |
| 13 | Enemies + Firing Patterns | Enemy base, UFO/Sniper/Spinner/Hunter subclasses, FiringPatterns table, weighted spawner |
| 14 | VirtualControls | Renders the 5 mobile hit zones |
| 15 | Game class | State machine, collision, wave management |
| 16 | UI + bootstrap | Overlays, HS entry, button wiring, rAF loop |

Edit by section reference. Spec-02 and spec-03 extend the engine by targeting named sections, so preserve the 16-section structure.

Spec-03 (the GameUI neon shell) wraps the page without altering gameplay:

- A pinned, pruned copy of GameUI lives in `game/ui/` (neon preset + the component families used; provenance in `game/ui/README.md`). Vendor by file copy only; never edit the GameUI source repo from here, and never load it across the filesystem at runtime.
- The page is recomposed by a `<script type="module">` after the classic engine script: it builds the GameUI shell (`createShell`) with a left sidebar of `createStatRows` telemetry panels and the existing `#stage` (canvas) as the main region. `#stage` changed from `position: fixed` to `position: relative` so `resize()` measures the shell main region.
- A read-only bridge (`window.Materialoids`, defined at the end of Section 16) exposes `getState()` (score/wave/lives + live asteroid census by size and material), `getSettings`/`setSetting` against the existing Settings store, and `openSettings`/`openGameOver` hooks the module fills with GameUI modals. The sidebar only reads; it writes no gameplay state.
- `UI.showSettings` / `UI.showGameOver` (Section 16) delegate to the bridge when registered, falling back to the template overlays. The settings modal reuses `materialoids_settings_v1`; the game-over modal keeps the AAA high-score-entry flow.
- Because the shell loads ES modules, the game must be served over HTTP — `file://` no longer works.

## Scope

- The engine stays static and single-file. The GameUI shell is vendored CSS + ES-module factories under `game/ui/`; no build step, no server runtime, no multiplayer, no external dependencies.
- Vanilla Canvas 2D only for gameplay. The UI layer is plain CSS + ES-module factories (GameUI). Do not introduce Phaser, a bundler, or npm packages.
- Storage keys are namespaced `materialoids_*` (`materialoids_settings_v1`, `materialoids_stats_v1`, `materialoids_highscores_v1`). Keep them namespaced so saves do not collide with other games. The GameUI settings modal reuses `materialoids_settings_v1` — never create a parallel settings key.
- GameUI is vendored by file copy into `game/ui/`. Never edit the GameUI source repo from here, and never load it across the filesystem at runtime. A component never gets bespoke skin CSS here; every themeable value flows through the neon preset's tokens. (Layout integration glue for the shell lives in the game's own `<style>` and the `.mat-*` classes, token-driven, analogous to the framework gallery's `gallery.css`.)
- The sidebar is strictly read-only. It reads engine state through `window.Materialoids.getState()` and introduces no new tracked quantities beyond spec-01/spec-02 and the template's existing state.
- The twist layer (materials, clouds, illumination) is implemented in spec-02 and lives in `CONFIG.asteroid.materials`, `CONFIG.clouds`, and `CONFIG.illumination`. `Asteroid` (Section 12) carries a per-instance `material` and `color`; `Clouds` and `Illumination` are Section 9B IIFEs wired into `Game.update`/`Game.render`. Core template mechanics (ship, scoring tiers, lives, extra-life threshold, wave formula, enemy roster, hyperspace) are unchanged.
- Do not edit the template source in `asset-game/`. Copy from it.

## Validation

Serve the `game/` folder over HTTP (required — the GameUI shell loads ES modules, which browsers refuse over `file://`):

```bash
cd materialoids/game && python -m http.server 8000
```

Publish to the preview root:

```bash
cd materialoids
./publish.sh
```

The preview root is `/opt/agents/www/retrogaming/materialoids/` and the URL is `https://retrogaming.donfather.site/materialoids/`.
