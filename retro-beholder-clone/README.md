<!--
---
title: "Retro Beholder Clone"
description: "Static Phaser 4 dungeon-walking proof of concept"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-05-25"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: implementation
  - tech: [javascript, html5, phaser]
  - game: retro-beholder-clone
related_documents:
  - "[Repository README](../README.md)"
  - "[Spec](../spec/2026-05-25-spec-retro-eye-of-the-beholder-clone-walking-sim.md)"
---
-->

# Retro Beholder Clone

Retro Beholder Clone is a static Phaser 4 proof of concept for first-person, grid-based dungeon walking. It uses a hardcoded map, panel-composited wall views, crisp 64x64 pixel-art textures, data-driven room props, a throne-room backdrop trigger, and a debug minimap.

---

## 1. Contents

```markdown
retro-beholder-clone/
├── AGENTS.md             # Game-specific agent context
├── README.md             # This overview
├── publish.sh            # Copies game/ into /opt/agents/www/eobclone/
└── game/
    ├── assets/           # Copied tile, prop, and backdrop PNGs
    ├── index.html        # Static Phaser entrypoint
    ├── js/               # Game source modules
    ├── package.json      # Marks JS modules as ESM for Node tests
    ├── style.css         # Page shell styling
    └── tests/            # Node tests for pure movement and map logic
```

---

## 2. Controls

| Input | Action |
|-------|--------|
| W / Up Arrow | Move forward one grid cell |
| S / Down Arrow | Move backward one grid cell |
| A / Left Arrow | Strafe left one grid cell |
| D / Right Arrow | Strafe right one grid cell |
| Q | Turn left 90 degrees |
| E | Turn right 90 degrees |
| M | Toggle debug minimap |

---

## 3. Implementation Notes

The renderer is a panel compositor, not a raycaster. `game/js/map-data.js` owns the dungeon rows, spawn, backdrop trigger, and prop placements. `game/js/viewport-renderer.js` samples nearby cells relative to the player's facing direction and draws a small set of wall, floor, ceiling, prop, and frame panels.

Run the local behavior check with:

```bash
node retro-beholder-clone/game/tests/core.test.mjs
```

Publish to nginx with:

```bash
cd retro-beholder-clone
./publish.sh
```

---

## 4. Known Limitations

- No combat, inventory, enemies, save/load, audio, or procedural generation.
- Wall panels use simple scaled sprites and frame geometry rather than full perspective-correct texture warping.
- Props are visible through a compact view-space rule; they are not occlusion-tested against every possible wall segment.
- The minimap is a debug overlay and intentionally unpolished.
