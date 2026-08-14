<!--
---
title: "Specifications"
description: "Public specifications for the retro gaming monorepo, the unit of spec-driven work"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-14"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: documentation
---
-->

# Specifications

The unit of work in this repository. Each specification states a verifiable outcome and its matched validations, is implemented by a coding agent on a `task/<slug>` branch, and is closed by one pull request whose tests reproduce the validations. The specification is the durable artifact; the pull request and its per-gate commits are the record. See [AGENTS.md](../../AGENTS.md) for the full lifecycle.

---

## Naming and Numbering

Specs are named `spec-NN-<slug>.md`. `NN` is a running per-repository counter that does not reset. A `series` frontmatter field groups the specs of one game.

---

## Current Specs

| Spec | Series | Status | Description |
|------|--------|--------|-------------|
| [spec-01-vector-vortex-mvp-and-shell](spec-01-vector-vortex-mvp-and-shell.md) | vector-vortex | Draft | Playable MVP: fixed-step tube-shooter core, DOM wireframe HUD and shell |
| [spec-02-vector-vortex-topology-shift-and-polish](spec-02-vector-vortex-topology-shift-and-polish.md) | vector-vortex | Draft | The topology-shift twist, stun mechanic, enemy roster, and vector-FX polish |

---

## Related

| Document | Relationship |
|----------|--------------|
| [Repository Root](../../README.md) | Parent |
| [AGENTS.md](../../AGENTS.md) | The working model these specs are executed under |
