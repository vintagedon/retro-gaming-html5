<!--
---
title: "Materialoids Agent Context"
description: "Game-specific agent instructions for Materialoids"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-06-24"
version: "1.0"
status: "Active"
tags:
  - type: guide
  - domain: implementation
  - tech: [javascript, html5, canvas]
  - game: materialoids
related_documents:
  - "[Repository AGENTS](../AGENTS.md)"
  - "[Game README](README.md)"
  - "[Blastemoids Template Readme](../asset-game/materialoids/blastemoids-html-game-template-free/readme.md)"
---
-->

# Materialoids Agent Context

Materialoids is a wireframe asteroids game built on the adopted Blastemoids single-file HTML5 template. The engine is vanilla Canvas 2D in one self-contained `game/index.html`: no Phaser, no bundler, no npm packages, no build step, no external assets. Web Audio and versioned localStorage are the only browser APIs beyond canvas and input.

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

## Scope

- Keep the game static and single-file. No build step, no server runtime, no multiplayer, no external dependencies.
- Vanilla Canvas 2D only. Do not introduce Phaser, a bundler, or npm packages.
- Storage keys are namespaced `materialoids_*` (`materialoids_settings_v1`, `materialoids_stats_v1`, `materialoids_highscores_v1`). Keep them namespaced so saves do not collide with other games.
- The twist layer (materials, clouds, illumination) is implemented in spec-02 and lives in `CONFIG.asteroid.materials`, `CONFIG.clouds`, and `CONFIG.illumination`. `Asteroid` (Section 12) carries a per-instance `material` and `color`; `Clouds` and `Illumination` are Section 9B IIFEs wired into `Game.update`/`Game.render`. Core template mechanics (ship, scoring tiers, lives, extra-life threshold, wave formula, enemy roster, hyperspace) are unchanged.
- Do not edit the template source in `asset-game/`. Copy from it.

## Validation

Open `game/index.html` directly in a browser, or serve the `game/` folder over HTTP:

```bash
cd materialoids/game && python -m http.server 8000
```

Publish to the preview root:

```bash
cd materialoids
./publish.sh
```

The preview root is `/opt/agents/www/retrogaming/materialoids/` and the URL is `https://retrogaming.donfather.site/materialoids/`.
