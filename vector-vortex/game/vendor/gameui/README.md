<!--
---
title: "Vendored GameUI Snapshot"
description: "What this directory is, where it comes from, and the rules for touching it"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-19"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: foundations
  - tech: [css, javascript]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Vendor Manifest](MANIFEST.md)"
  - "[Game README](../../README.md)"
---
-->

# Vendored GameUI Snapshot

A byte-identical, pinned snapshot of the published `html5-game-ui-framework`
foundations (tokens, core primitives, themes, and the two public entries),
vendored so Vector Vortex's shell is composed from real framework primitives
with no runtime network dependency. Do not edit anything in this directory:
fixes belong upstream, and the pin moves only through a new vendoring pass
recorded in [MANIFEST.md](MANIFEST.md).

Game-owned theming lives outside this directory in
`../../vector-vortex-theme.css`, which places its rules in the framework's
documented `overrides` cascade layer and selects only
`html[data-gc-theme="vector-vortex"]`.

## Contents

| Path | Description |
|---|---|
| [MANIFEST.md](MANIFEST.md) | Pin, license, file list, SHA-256 per file |
| `gc.css` | Public CSS entry; declares the cascade layer order and imports the three token files, two core files, and four theme files |
| `gc.js` | Public ESM entry; injects shared SVG defs so CSS filter references resolve |
| `tokens/` | Primitive, semantic, and component token tiers |
| `core/` | Domain-neutral primitives: base behavior plus `.gc-panel`, `.gc-button`, `.gc-input`, `.gc-meter` |
| `themes/` | Shipped `data-gc-theme` files; none is selected by this game |

## Related

| Document | Relationship |
|----------|--------------|
| [Game README](../../README.md) | Parent orientation |
| [Vendor Manifest](MANIFEST.md) | Provenance and integrity record |
