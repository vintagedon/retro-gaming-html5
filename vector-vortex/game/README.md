<!--
---
title: "Vector Vortex Servable Game Tree"
description: "The static files served by the Vector Vortex playable (placeholder for D1)"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-08"
version: "0.1.0"
status: "Active"
tags:
  - type: directory
  - domain: game-design
  - tech: [javascript, html5]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Game AGENTS](../AGENTS.md)"
---

# Vector Vortex `game/`

This directory holds the static files served for Vector Vortex. Deliverable 1 ships only the placeholder page plus the pure deterministic core modules. The full playable Canvas slice and minimal semantic DOM surface land in Deliverable 3.

## Layout

| Path | Purpose |
|---|---|
| `index.html` | Placeholder (D1 ships no Canvas yet) |
| `core/*.js` | Pure ES modules — authoritative simulation |

`publish.sh` (introduced in Deliverable 4) copies this tree to `retrogaming.donfather.site/vector-vortex/`.