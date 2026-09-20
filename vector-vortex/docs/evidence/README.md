<!--
---
title: "Evidence Captures"
description: "Committed review captures for the Vector Vortex shell and MVP run"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-19"
version: "1.1"
status: "Active"
tags:
  - type: directory-readme
  - domain: evidence
  - tech: [playwright, png]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Game README](../../README.md)"
  - "[GameUI Consumer Report](../game-ui-consumer-report.md)"
---
-->

# Evidence Captures

Committed screenshots produced by `scripts/capture-state.mjs` from tracked
source. Every capture here is an **unapproved candidate**: it records what
the run built so the maintainer can review it in the pull request. Nothing
in this directory presumes acceptance.

## Captures (all 1280x720, all unapproved candidates)

| File | State | Status |
|---|---|---|
| `capture-title-1280x720.png` | Title shell | Unapproved candidate |
| `capture-running-1280x720.png` | Running HUD with live shots and a kill | Unapproved candidate |
| `capture-paused-1280x720.png` | Pause dialog | Unapproved candidate |
| `capture-settings-audio-1280x720.png` | Settings, Audio tab | Unapproved candidate |
| `capture-settings-display-1280x720.png` | Settings, Display tab | Unapproved candidate |
| `capture-settings-controls-1280x720.png` | Settings, Controls tab | Unapproved candidate |
| `capture-ended-survived-1280x720.png` | Run ended, survived cash-out | Unapproved candidate |
| `capture-ended-lost-1280x720.png` | Run ended, lost | Unapproved candidate |

Regenerate with `node scripts/capture-state.mjs <state> [WxH]` from
`vector-vortex/`. The geometry-probe screenshots written by the Playwright
suite land under `test-results/` and are not tracked.
