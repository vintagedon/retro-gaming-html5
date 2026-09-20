<!--
---
title: "Vector Vortex Servable Game Tree"
description: "The static files served by the Vector Vortex MVP"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-19"
version: "0.4.0"
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
  - "[Vendor Manifest](vendor/gameui/MANIFEST.md)"
---

# Vector Vortex `game/`

This directory is the entire servable game: the published copy at
`retrogaming.donfather.site/vector-vortex/` is exactly this tree. It holds
the deterministic simulation, the Canvas renderer, the frozen DOM HUD, the
shell surfaces, and the pinned vendored GameUI snapshot. Relative paths
only; no build step.

## Layout

| Path | Purpose |
|---|---|
| `index.html` | Frozen HUD, shell surfaces, canvas with `role="img"` and `aria-label`; `data-gc-theme="vector-vortex"` on `<html>` |
| `styles.css` | Game-owned `.vv-*` layout in the overrides layer, consuming public tokens |
| `vector-vortex-theme.css` | The wireframe theme: frozen palette roles mapped to public tokens |
| `vendor/gameui/` | Pinned, byte-identical html5-game-ui-framework foundations; provenance and SHA-256 in `MANIFEST.md`. Read-only |
| `core/*.js` | Pure ES modules: authoritative simulation, director, scoring, breach, RNG, clock, collision, shots, enemies, lanes |
| `runtime/renderer.js` | Canvas 2D draw in the frozen palette, balanced `save`/`restore`, DPR scaling |
| `runtime/input.js` | Focus-aware keyboard adapter, blur/visibility clearing, `ev.repeat` guard; pause keys route to the shell |
| `runtime/frame-runner.js` | rAF loop, fixed-step clock, shell clock handles, visibility rebase |
| `runtime/dom.js` | HUD binder: pure projection of the snapshot, no arithmetic |
| `runtime/shell.js` | Shell states, dialog focus containment, tabs, settings commands, ended breakdown |
| `runtime/audio.js` | Synthesized UI cues: one context, one bus, bounded nodes |
| `runtime/storage.js` | Defensive persistence for `retrohtml5.vector-vortex.v1` |
| `runtime/main.js` | Wires everything; exposes `window.__vv` for Playwright |

Publishing goes through `../publish.sh`, which copies only this tree to the
preview umbrella. Serve locally with `npm run serve` from the parent
directory.
