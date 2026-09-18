<!--
---
title: "Vendored h5gameui Kit"
description: "Byte-pinned published kit revision consumed by the CargoLander HUD"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-18"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: [implementation]
  - tech: [css]
  - game: cargo-lander
---
-->

# Vendored h5gameui Kit

The published h5gameui CSS tree, vendored inside `game/` so
`publish.sh` ships it and the game consumes the kit the way a stranger
would: from outside its repository, through published CSS only.

---

## 1. Contents

```text
h5gameui/
├── src/          # The published kit: gc.css entry plus its complete import tree
├── LICENSE       # Framework license, preserved verbatim
├── MANIFEST.json # Pinned source commit and per-file SHA-256
└── README.md     # This file
```

---

## 2. Rules

The files here are byte-pinned to the source commit recorded in
`MANIFEST.json`; the entry point's complete relative import tree
(tokens, core, themes) and the license are preserved. Never edit them.
A kit defect found from inside this game is reported in
`cargo-lander/consumer-report.md` and the pull request, never patched
here or in the framework repository.

---

## 3. Related

| Document | Relationship |
|----------|--------------|
| [Game tree](../../README.md) | Parent |
| [Consumer report](../../../consumer-report.md) | Where kit findings go |
