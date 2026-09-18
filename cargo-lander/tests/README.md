<!--
---
title: "Tests"
description: "Tracked development toolchain: node unit tests and Chromium-headless Playwright validations"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-18"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [implementation]
  - tech: [javascript, playwright]
  - game: cargo-lander
---
-->

# Tests

The executable proof for the spec's validations. Test source, fixed seeds,
and fixtures are committed; a fresh clone reproduces every validation after
`npm install`. `node --test` discovers the `*.test.js` unit suites; Playwright
runs the `*.spec.js` browser suites against the tracked dev server.

---

## 1. Contents

```text
tests/
├── core/           # Simulation: purity, determinism, continuation, contacts
├── runtime/        # Clock and runner seam
├── hud/            # Projector, vendoring, and import-boundary checks
├── stage/          # Stage fit and canvas backing
├── e2e/            # Playwright play flows and theme checks
├── structural/     # Zero-asset and other tree-shape scans
├── helpers/        # Shared scanners and fixtures
├── dev-server.mjs  # Tracked static server used by Playwright
└── README.md       # This file
```

---

## 2. Related

| Document | Relationship |
|----------|--------------|
| [CargoLander](../README.md) | Parent |
| [Spec](../docs/specs/spec-04-cargo-lander-vertical-slice.md) | Validations these tests prove |
