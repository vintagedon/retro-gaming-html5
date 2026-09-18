<!--
---
title: "CargoLander"
description: "Wireframe-arc lunar lander: continuous physics, thrust notches, survivable impacts, and an outside-consumer HUD on the h5gameui kit"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-18"
version: "0.1.0"
status: "Draft"
tags:
  - type: game-readme
  - domain: [game-design, implementation]
  - tech: [javascript, html5, css, canvas-2d, playwright]
  - game: cargo-lander
  - series: cargo-lander
related_documents:
  - "[Vertical slice spec](../docs/specs/spec-04-cargo-lander-vertical-slice.md)"
  - "[Consumer report](consumer-report.md)"
  - "[Agent instructions](AGENTS.md)"
---
-->

# CargoLander

A lander you can play: descend under constant gravity, rotate, choose thrust
notches, and set down inside the landing tolerances. Unsafe contacts are
survivable up to the hard-impact threshold, hull segments absorb gentle
knocks, and the run ends when the last craft is destroyed or one lands
cleanly.

The HUD is the point as much as the flight: every meter is a published
h5gameui primitive, themed by this game, driven at sixty ticks a second by a
deterministic simulation whose snapshot already contains every displayed
value. CargoLander exists to consume the kit the way a stranger would.

## Play

| Action | Keys |
|---|---|
| Rotate | Left/Right or A/D |
| Thrust notch up / down | Up/W, Down/S |
| Full thrust / cut | Shift, X |
| Retry after losing a craft | R |
| Restart after run end | Enter |
| Pause | P |

## Controls model

Thrust is sticky in discrete notches (off, two intermediates, full). The
selected notch drives both acceleration and fuel burn; empty fuel strips all
authority. Rotation is held-key. A contact inside every tolerance over the
pad lands the run. An unsafe contact below the hard-impact threshold costs
one hull segment; at or above it the craft is destroyed. Three segments per
craft, three craft per run.

## Development

```bash
npm install
npm test
```

Unit tests run under `node --test`; browser validations run under
Chromium-headless Playwright. The spec's validations and the exact commands
that reproduce them live in
[spec-04](../docs/specs/spec-04-cargo-lander-vertical-slice.md) and its pull
request. `publish.sh` copies only `game/` to the preview umbrella.

## Credits

The input model and behavior-table approach were informed by the Blastemoids
wireframe game template (MIT), studied as shapes from its readme only. No
template source is copied.

## Related

| Document | Relationship |
|----------|--------------|
| [Specification](../docs/specs/spec-04-cargo-lander-vertical-slice.md) | The contract this game implements |
| [Consumer report](consumer-report.md) | Kit consumption findings and theme results |
| [Repository README](../README.md) | Monorepo orientation |
