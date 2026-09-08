<!--
---
title: "Vector Vortex Tracked Tests"
description: "Tracked unit tests proving every Deliverable 1 validation box"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-08"
version: "0.1.0"
status: "Active"
tags:
  - type: directory
  - domain: testing
  - tech: [javascript, node-test-runner]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Game AGENTS](../AGENTS.md)"
---

# Vector Vortex `tests/`

Tracked unit tests. Run with `npm test` from the game directory. The test command resolves files explicitly via `node --test` and does not rely on shell glob expansion.

| File | Validates |
|---|---|
| `core/rng.test.js` | Seeded RNG pinned sequence; lane inclusive bounds (mutation: `max - min`) |
| `core/lanes.test.js` | 24-lane wrap; simultaneous opposite cancel; clamp mutation |
| `core/shots.test.js` | Cooldown 8 ticks; cap 6; advance and expire |
| `core/enemies.test.js` | Crawler spawn, advance, ascending-ID breach order |
| `core/core.test.js` | Snapshot, lane wrap, fire-on-tick, cooldown bypass, shot cap, JSON round-trip, mutation tests |
| `core/clock.test.js` | 30/60/144 Hz digest equality; frame-delta cap; pause; multi-sample drain mutation |
| `core/purity.test.js` | No DOM/Canvas/Audio/clock APIs in `game/core/` |
| `core/replay.test.js` | Cross-rate digest equality; uneven deltas; JSON round-trip |
| `core/discovery.test.js` | Explicit test list, no globs; mutation: renaming a file changes the count |

The fixtures directory is intentionally empty in D1; it is reserved for D3 Playwright fixtures and fixed input logs.