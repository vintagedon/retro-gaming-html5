<!--
---
title: "Vector Vortex Asset Attribution"
description: "Licence and provenance record for every shipped asset in the Vector Vortex game tree"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-20"
version: "1.0"
status: "Active"
tags:
  - type: attribution
  - domain: [assets, licensing]
  - tech: [fonts, audio, png]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Game Agent Context](../../AGENTS.md)"
  - "[Game README](../../README.md)"
---

# Vector Vortex Asset Attribution

Every shipped asset records its pack, author, licence, and source. Each listed
licence permits redistribution of the file itself in a public repository, which
is the bar for shipping here; use inside a compiled game is not sufficient.

| Asset (shipped path) | Pack | Author | Licence | Source | Transformation |
|---|---|---|---|---|---|
| `fonts/opf-medium.ttf` | Owlish Pixel Fonts v0.1 | Roaming Owl | CC BY 4.0 | https://roamingowl.itch.io/opf | None; file shipped byte-identical |
| `effects/muzzle-01.png` | Kenney Particle Pack 1.1 | Kenney Vleugels (Kenney.nl) | CC0 1.0 | https://kenney.nl/assets/particle-pack | None; file shipped byte-identical |
| `effects/flame-01.png` | Kenney Particle Pack 1.1 | Kenney Vleugels (Kenney.nl) | CC0 1.0 | https://kenney.nl/assets/particle-pack | None; file shipped byte-identical |
| `effects/flame-03.png` | Kenney Particle Pack 1.1 | Kenney Vleugels (Kenney.nl) | CC0 1.0 | https://kenney.nl/assets/particle-pack | None; file shipped byte-identical |
| `music/chrome-hamster.ogg` | Chiptune Collection Vol 1 | Mulula VGM Loops | CC BY 4.0 | https://mululavgmloops.itch.io/ | WAV converted to Ogg Vorbis (ffmpeg, libvorbis q4); no other change |

## Licence texts

- **CC BY 4.0** (font and music): Creative Commons Attribution 4.0 International,
  https://creativecommons.org/licenses/by/4.0/ . Redistribution and adaptation
  are permitted with attribution; this file is that attribution.
- **CC0 1.0** (effect sprites): https://creativecommons.org/publicdomain/zero/1.0/ .
  The pack's own terms state credit "would be nice but is not mandatory";
  attribution is given here anyway.

## Reported conflicts

- The `pixel-fx-effects-5750` pack was auditioned as the effects source but its
  terms state "Redistribution of the raw pack files is not permitted", which
  fails this repository's bar. Nothing from that pack is shipped. The shipped
  effect sprites come from the CC0 Kenney Particle Pack instead.
