<!--
---
title: "Retro Beholder Clone Agent Context"
description: "Game-specific agent instructions for the Retro Beholder Clone PoC"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-05-25"
version: "1.0"
status: "Active"
tags:
  - type: guide
  - domain: implementation
  - game: retro-beholder-clone
related_documents:
  - "[Repository AGENTS](../AGENTS.md)"
  - "[Game README](README.md)"
---
-->

# Retro Beholder Clone Agent Context

This directory contains a static browser proof of concept for first-person, grid-based dungeon walking inspired by early panel-rendered dungeon crawlers. It is intentionally limited to movement, map rendering, debug minimap, room decorations, and a single throne-room backdrop trigger.

## Scope

- Keep the game static: no build step, server runtime, multiplayer, save system, inventory, combat, enemies, or procedural map generation.
- Keep source code under `game/js/`; avoid inline game logic in HTML.
- Keep asset paths centralized in `game/js/assets.js`.
- Keep map layout and decoration metadata in `game/js/map-data.js`.
- Use Phaser 4 through the CDN in `game/index.html`.
- Preserve `pixelArt: true` and fixed 16:9 `Phaser.Scale.FIT` rendering.

## Validation

Run the core behavior test after changing movement or map logic:

```bash
node retro-beholder-clone/game/tests/core.test.mjs
```

Publish with:

```bash
cd retro-beholder-clone
./publish.sh
```

The preview root is `/opt/agents/www/eobclone/` and the nginx hostname is `https://eobclone.donfather.site`.
