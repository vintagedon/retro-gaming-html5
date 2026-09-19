<!--
---
title: "GameUI Vendor Manifest"
description: "Provenance and integrity record for the vendored html5-game-ui-framework snapshot"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-19"
version: "1.0"
status: "Active"
tags:
  - type: manifest
  - domain: foundations
  - tech: [css, javascript]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Game README](../../README.md)"
  - "[Upstream Repository](https://github.com/vintagedon/html5-game-ui-framework)"
---
-->

# GameUI Vendor Manifest

This directory carries a pinned, byte-identical snapshot of the published
foundations of `html5-game-ui-framework`, vendored by Vector Vortex Spec 02
(wireframe shell and MVP). Every file below is consumed by the page through
the import graph rooted at `gc.css` and `gc.js`. No file has been modified.

## Pin

| Field | Value |
|---|---|
| Upstream repository | `https://github.com/vintagedon/html5-game-ui-framework` |
| Upstream source path | `src/` at the pinned commit |
| Pinned commit (full SHA) | `a678a2b0f135a991b4eacb8e62ea8d94f20c4505` |
| Reachability | The pinned commit is the head of upstream `main` at vendoring time and is reachable from `main` |
| License | MIT, at upstream `LICENSE` (`https://github.com/vintagedon/html5-game-ui-framework/blob/main/LICENSE`) |
| Vendored | 2026-09-19 |

## Files and SHA-256

| Path | SHA-256 |
|---|---|
| `gc.css` | `042c17d3e45b7935047d681be23b71d5a85d2b33caca99919aff9fa29372bdee` |
| `gc.js` | `a3ceb70838eb53fe0aa7596b5a93f82a2a2a6cb44381469362c4982c6d6d1344` |
| `tokens/components.css` | `b224744a7d032a50ce0082e3aff68bc1bb8610e4d934c6583b4ebb46031bb102` |
| `tokens/primitives.css` | `d00adc277037ea85db47e9e9a4c3fc2cfd7515c094591375bdf5849745756663` |
| `tokens/semantic.css` | `bc6ce235064ebb303a4a974b8acaa3746e26517637a966dfa7ae81e22894476e` |
| `core/base.css` | `caa4c4bd01816be54413fc52fec7b7f64a43bf5864069917e802719143844409` |
| `core/components.css` | `434e540ff5fdded1f56b6e0ab02f1d90634c4e586969bedf63c48b23bd4d2502` |
| `themes/arcade.css` | `cd15f2307efac29628d67ac6aff8012702d759d1bde8c71711dd6b6367914dcb` |
| `themes/fantasy.css` | `2c86915e0307e3e7d9d370990ca9f18e5df3b62428820795383c5075e02caadf` |
| `themes/modern.css` | `82053c6bbc0af8bf86e3d6a83d64bfad419b1c5bfc6891a313bb58ab3b25c448` |
| `themes/scifi.css` | `934545070542145278e12a32b7a6fc9d32ffea69c9e37da5228fac688fe126fc` |

## Scope Notes

- The four shipped theme files (`themes/*.css`) are vendored because `gc.css`
  imports them; preserving that relative import graph byte-for-byte is a
  requirement of the vendoring contract. This game does not select any of
  them: `data-gc-theme="vector-vortex"` matches no shipped theme attribute,
  so the semantic fallback plus the game's own `vector-vortex-theme.css`
  overrides layer define the rendered theme.
- No framework module, dialog, tab, settings, focus, or stage controller is
  vendored, because upstream publishes none. Reference-harness helpers are
  not public runtime APIs and are not vendored.
- Verification: `node --test tests/core/vendor-manifest.test.js` re-hashes
  every file against this manifest. When the upstream clone is present at
  `/opt/agents/repos/html5-game-ui-framework`, the same test byte-compares
  each file and checks pin reachability from upstream `main`.
