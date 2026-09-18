<!--
---
title: "CargoLander Game Tree"
description: "The servable static game: pure core, runtime spine, HUD consumer, and the vendored kit"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-18"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [game-design, implementation]
  - tech: [javascript, html5, css, canvas-2d]
  - game: cargo-lander
---
-->

# CargoLander Game Tree

Everything under `game/` ships to the served site: plain ES modules and a
static `index.html`, relative paths only, no build step. The development
test toolchain lives one level up and never publishes.

---

## 1. Contents

```text
game/
├── core/       # Pure lander simulation: config, seeded RNG, terrain, core
├── runtime/    # Fixed-step clock, frame runner, and the __cl test seam
├── ui/         # HUD projector over the vendored kit CSS; stage fitter
├── vendor/     # h5gameui pinned revision (never edited)
├── render.js   # Procedural canvas playfield drawing
├── hud.css     # Consumer HUD composition on kit tokens
├── theme.css   # The game's own shipping token theme
├── main.js     # Wiring: core, runner, HUD, stage, input, seam
├── index.html  # Entry page
└── README.md   # This file
```

---

## 2. Rules

- `core/` is pure: no `window`, `document`, `Date.now`, `performance.now`, or
  `Math.random`. The snapshot is the only thing any adapter sees, and it
  already contains every displayed value, including ratios.
- `vendor/` files are byte-pinned to a published kit revision recorded in
  `vendor/h5gameui/MANIFEST.json`. Kit defects are reported, never patched
  here.

---

## 3. Related

| Document | Relationship |
|----------|--------------|
| [CargoLander](../README.md) | Game overview and commands |
| [Core](core/README.md) | Simulation contract |
