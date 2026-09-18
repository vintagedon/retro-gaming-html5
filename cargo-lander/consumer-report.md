<!--
---
title: "CargoLander Consumer Report"
description: "How CargoLander consumed the published h5gameui kit, what was checked, and what was found"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-18"
version: "1.0"
status: "In Progress"
tags:
  - type: consumer-report
  - domain: [implementation]
  - tech: [css, playwright]
  - game: cargo-lander
  - series: cargo-lander
related_documents:
  - "[Specification](../docs/specs/spec-04-cargo-lander-vertical-slice.md)"
  - "[Kit repository](https://github.com/vintagedon/html5-game-ui-framework)"
---
-->

# CargoLander Consumer Report

CargoLander is the kit's first outside consumer: a real game driving the
meter family from a deterministic simulation at sixty ticks a second,
through published CSS only. This report records the pinned revision, the
consumer checks and their results, the theme experiment, and any kit
findings.

## 1. Pinned kit revision

| Item | Value |
|---|---|
| Source | `https://github.com/vintagedon/html5-game-ui-framework` |
| Commit | `a678a2b0f135a991b4eacb8e62ea8d94f20c4505` |
| Vendored surface | Published `src/` CSS entry point with its complete relative import tree, plus the framework `LICENSE` |
| Location | `game/vendor/h5gameui/` (inside the published `game/` tree) |
| Integrity | `game/vendor/h5gameui/MANIFEST.json` records per-file SHA-256; a tracked Node test verifies every vendored file against it |

At gate 3 intake, all eleven vendored files were byte-compared against
the pinned revision in the framework repository and matched exactly.
The vendored tree is never edited.

## 2. Meter family consumption

| Channel | Kit primitive | Result |
|---|---|---|
| Fuel | continuous meter, `--gc-meter-value` | Verified at zero, intermediate, and full; values are core-computed ratios formatted as percentages |
| Hull integrity | segmented meter with damage trail | Verified for zero, one, and maximum units; `--gc-meter-segments` set from `hullSegmentsMax` (3), not the kit default (8) |
| Thrust output | vertical segmented meter | Driven by the actual discrete notches (4); full track width verified on the cross axis at zero, intermediate, and full, with quantized height |
| Craft remaining | pips | `--gc-meter-pips` set from `craftMax` (3), not the kit default (10); zero, one, and maximum verified |
| Last impact | damage trail on the hull meter | Trail carries `hullPrevRatio`; the band label follows the core's `lastImpact` |

The projector holds a last value per field and touches the DOM only on
change; re-projecting an unchanged snapshot performs zero DOM writes,
asserted by counting mutations. A bounded consumer fixture exercises the
vertical segmented markup with both fill and trail, covering the
cross-axis geometry the static harness could not. The HUD imports
nothing outside the game tree and never imports `CONFIG`; a source scan
asserts the boundary.

## 3. Theme results

Recorded at gate 5.

## 4. Kit findings

None so far. The vertical segmented cross-axis behavior, the historical
defect that motivated this consumer, holds at zero, intermediate, and
full values for both fill and trail under continuously changing values
from the live simulation.
