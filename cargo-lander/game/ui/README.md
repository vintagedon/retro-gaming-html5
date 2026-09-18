<!--
---
title: "UI Layer"
description: "HUD projector over the vendored kit and the stage fitter"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-18"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [implementation]
  - tech: [javascript, css]
  - game: cargo-lander
---
-->

# UI Layer

The adapter layer: everything the DOM sees of the simulation.

---

## 1. Contents

```text
ui/
├── hud.js    # Snapshot projector: change-detected writes to kit primitives
├── stage.js  # 1920x1080 logical stage fitter with uniform scale and letterboxing
└── README.md # This file
```

---

## 2. Rules

The projector copies display strings verbatim, formats core ratios as
the kit's percentage-valued custom properties, sets segment and pip
capacities from the snapshot maxima, and never divides a game quantity
or imports `CONFIG`. Kit chrome is composed through the vendored CSS
only; consumer overrides live in the `overrides` cascade layer declared
by the kit entry point.

---

## 3. Related

| Document | Relationship |
|----------|--------------|
| [Game tree](../README.md) | Parent |
| [Vendored kit](../vendor/h5gameui/README.md) | The primitives being driven |
