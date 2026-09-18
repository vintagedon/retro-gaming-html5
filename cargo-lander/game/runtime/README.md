<!--
---
title: "Runtime Spine"
description: "Fixed-step clock and frame runner that hand whole ticks to the core"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-18"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [implementation]
  - tech: [javascript]
  - game: cargo-lander
---
-->

# Runtime Spine

The pacing layer between the browser's animation frames and the pure core.
It produces whole 1/60 s ticks from wall-clock deltas and exposes the
deterministic seam tests use to own the simulation.

---

## 1. Contents

```text
runtime/
├── clock.js   # Passive accumulator: clamps frame deltas at 250 ms, refuses paused and hidden time
├── runner.js  # Frame runner: bounded drain loop, timestamp rebasing, stop/start lifecycle
└── README.md  # This file
```

---

## 2. Ownership

`window.__cl` (wired in `../main.js`) exposes `stop()`, `start()`,
`advanceTicks(n)`, `reset(seed)`, `getSnapshot()`, and input dispatch.
`stop()` cancels the scheduled frame and relinquishes automatic
advancement; it never sets the core's gameplay pause flag. `advanceTicks`
is rejected while the runner is running. `start()` resumes with a fresh
time origin. Pause and visibility restoration rebase the runner timestamp
so hidden and paused wall-clock time is never replayed. The frame loop
contains no branch that reads a test flag.

---

## 3. Related

| Document | Relationship |
|----------|--------------|
| [Game tree](../README.md) | Parent |
| [Core](../core/README.md) | The ticks this spine hands over |
