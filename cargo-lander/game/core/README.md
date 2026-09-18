<!--
---
title: "Simulation Core"
description: "Pure lander simulation: deterministic physics, seeded terrain, three-way contact resolution"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-18"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [game-design, implementation]
  - tech: [javascript]
  - game: cargo-lander
---
-->

# Simulation Core

The lander simulation, pure of every browser API. It runs identically in
Node tests and in the browser runtime; the frame runner is the only thing
that decides when to push ticks into it.

---

## 1. Contents

```text
core/
├── config.js   # CONFIG: every tuning value, nested by concern
├── rng.js      # mulberry32 seeded RNG with serializable uint32 state
├── terrain.js  # Seeded terrain polyline and height lookup
├── lander.js   # createLanderCore: tick, snapshot, controls, retry, restart
└── README.md   # This file
```

---

## 2. Contract

`createLanderCore({ config, seed, snapshot })` returns a core with `tick()`,
`snapshot()`, control setters, `retry()`, and `restartRun()`. The snapshot
carries every required display field (ratios included) plus continuation
state (RNG state, controls, contact flag, terrain) that must round-trip
through JSON for exact continuation. Contact resolves three ways: a landing
inside all tolerances, a gentle impact that costs one hull segment, or a
hard impact that destroys the craft. Damage is charged once per contact
episode; only destruction consumes a craft.

---

## 3. Related

| Document | Relationship |
|----------|--------------|
| [Game tree](../README.md) | Parent |
| [Spec, gate 1](../../../docs/specs/spec-04-cargo-lander-vertical-slice.md) | The validation contract |
