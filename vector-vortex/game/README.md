<!--
---
title: "Vector Vortex Servable Game Tree"
description: "The static files served by the Vector Vortex playable slice"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-09"
version: "0.3.0"
status: "Active"
tags:
  - type: directory
  - domain: game-design
  - tech: [javascript, html5, canvas-2d]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Game AGENTS](../AGENTS.md)"
  - "[Project README](../README.md)"
---

# Vector Vortex `game/`

This directory holds the static files served by the Vector Vortex playable. The runtime tree contains a Canvas 2D wireframe renderer, a focus-aware input layer, an rAF frame runner, a DOM projector, and an orchestrator. The core simulation modules live under `core/` next to the runtime and are tracked.

## Layout

| Path | Purpose |
|---|---|
| `index.html` | Canvas element, semantic DOM status grid, objective, controls, pause/restart buttons, sub-960 viewport warning |
| `styles.css` | Grid layout, focus rings, viewport warning (sub-960 by class) |
| `core/*.js` | Pure ES modules: authoritative simulation, director, scoring, breach, RNG, clock, collision, shots, enemies, lanes |
| `runtime/renderer.js` | Canvas 2D draw, balanced `save`/`restore`, DPR scaling |
| `runtime/input.js` | Focus-aware keyboard adapter, blur/visibility clearing, ev.repeat guard for all gameplay keys |
| `runtime/frame-runner.js` | rAF loop, fixed-step clock, deterministic test seam, first-visible-frame delta reset |
| `runtime/dom.js` | Pure projection of the snapshot to the semantic DOM (no arithmetic) |
| `runtime/main.js` | Wires core + renderer + input + runner; exposes `window.__vv` |

`publish.sh` is not introduced in this directory; the umbrella publish script in the repository root copies this tree to `retrogaming.donfather.site/vector-vortex/`.