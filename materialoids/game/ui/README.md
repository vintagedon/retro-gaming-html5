<!--
---
title: "Vendored GameUI (Neon Preset)"
description: "Pinned, pruned copy of the GameUI framework ui/ tree used by the Materialoids neon shell"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-06-25"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [design-system, vendor]
  - tech: [css, javascript, es-modules]
  - game: materialoids
related_documents:
  - "[Materialoids AGENTS](../AGENTS.md)"
  - "[GameUI Framework Source](https://github.com/vintagedon/gameui-browser-gaming-framework)"
---

# Vendored GameUI (Neon Preset)

A **pinned, file-copied** snapshot of the GameUI framework `ui/` tree, vendored
into Materialoids so the game loads it over relative paths with no runtime
dependency on the framework repo and no build step. Materialoids is the neon
showcase, so only the neon preset and the component families this game actually
uses are copied; the dark-fantasy preset, its fonts/assets, the gallery, the
Playwright harness, and unused families are intentionally omitted.

## Provenance

| Field | Value |
|-------|-------|
| Source repo | `/opt/agents/repos/gameui-browser-gaming-framework/ui/` |
| Source VCS | Not a git checkout at this path; pinned by content hash |
| Pinned content SHA-256 | `969a93843b37d0b7275c54c9127928b3c6e3cb43c27417769c29db9e7f127b50` |
| Copy date | 2026-06-25 |

The content hash is the SHA-256 of the concatenated source files Materialoids
consumes (tokens, neon preset, and the seven component families below), taken
from the framework tree at copy time. Re-deriving it against the source tree
confirms the vendored copy is byte-identical to the pinned snapshot.

## What is included

```
ui/
├── tokens/tokens.css                        # Token contract (structure)
├── themes/neon.css                          # Neon preset (skin); image-free, system fonts
└── components/
    ├── layout/{layout.css,layout.js}        # createShell (sidebar + main), createDrawer
    ├── panels/panels.css                    # Panel chrome (sidebar frames)
    ├── metrics/{metrics.css,metrics.js}     # createStatRows (sidebar readouts)
    ├── stat-displays/stat-displays.css      # Static stat bars (structure-only)
    ├── modals/{modals.css,modals.js}        # createModal (settings + game-over)
    ├── settings/{settings.css,settings.js}  # createSelect / createSwitch (settings modal)
    └── buttons/{buttons.css,buttons.js}     # createButton + modal footer buttons
```

## What is excluded (not used under the neon preset)

`themes/dark-fantasy.css`, `themes/dark-fantasy-assets/`, `themes/fonts/`
(OFL Cinzel/MedievalSharp are dark-fantasy-only), `gallery/`, `tests/`, and the
`tabs`, `cards`, `loading`, `toasts`, and `sfx` component families.

## Network posture

The neon preset is image-free and uses only the OS UI font stack. This tree
contains **no** `@font-face`, **no** `@import`, **no** `url()` asset references,
and **no** external host (`fonts.googleapis.com`, `esm.sh`, `rosebud.ai`, CDN).
Loading it introduces zero non-origin runtime requests. (The only occurrences of
the strings `url(`, `@font-face`, and `https` in this tree are inside CSS
comment prose.)

## Consumption

`index.html` links, in order, `ui/tokens/tokens.css`, `ui/themes/neon.css`, then
the component CSS for the families above. The interactive factories are loaded
as ES modules from `./ui/components/.../...js` by the neon-shell module script.
See `../AGENTS.md` for the engine section map.
