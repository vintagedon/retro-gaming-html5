<!--
---
title: "Vector Vortex"
description: "A deterministic 24-lane Canvas tube shooter with vector wireframe aesthetics"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-16"
version: "0.1.0"
status: "Active"
tags:
  - type: game-readme
  - domain: game-design
  - tech: [javascript, html5, canvas-2d, playwright]
  - game: vector-vortex
---
-->

# Vector Vortex

> A 24-lane tube shooter inspired by classic wireframe vector arcade games, featuring a deterministic simulation core and procedural vector aesthetics.

## Status: Spec 01 (Mechanics Slice)

This directory currently holds the **Spec 01 Deterministic Core Playable** mechanics slice. It proves the pure 60-tick/s simulation core, 24-lane circular geometry, swept collision, director spawning bands, accuracy scoring, and minimal semantic controls prior to full GameUI shell integration (Spec 02) and topology shifts (Spec 03).

## Objective & Rules

- **Objective:** Survive the 5-minute (300 seconds / 18,000 ticks) vortex descent.
- **Enemies:** Crawlers spawn at the vortex center (depth 1.0) and crawl toward the rim (depth 0.0).
- **Lives:** 3 starting lives. An enemy reaching the rim costs 1 life and grants 30 ticks of damage grace.
- **Scoring:** 100 pts per Crawler. Surviving the full 5 minutes awards a +5,000 survival bonus plus up to +2,000 accuracy bonus.

## Action Map & Controls

| Action | Controls | Rule |
|---|---|---|
| Move Left | `←` or `A` | Decrements lane with wrap `0 -> 23` |
| Move Right | `→` or `D` | Increments lane with wrap `23 -> 0` |
| Fire | `Space` | Fires inward (`0 -> 1`), 8-tick cooldown, max 6 active shots |
| Pause / Resume | `Escape` or `P` / DOM button | Pauses simulation and timer |
| Restart | DOM button | Enabled on run end (Lost or Survived) |

## Development & Test Commands

From `vector-vortex/`:

```bash
# Clean install dependencies (Playwright)
npm install

# Run Node unit tests for deterministic core and balance table
npm test

# Run Playwright browser tests (Chromium headless)
npm run test:e2e

# Serve locally
python3 -m http.server 8085 --directory game
```

## Zero-Asset Policy

In accordance with the Wireframe Arc policy, Vector Vortex contains **zero image files** and **zero audio files**. All geometry is rendered procedurally on HTML5 Canvas 2D.
