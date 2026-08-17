<!--
---
title: "Specifications"
description: "Public specifications for the retro gaming monorepo, the unit of spec-driven work"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-17"
version: "1.1"
status: "Active"
tags:
  - type: directory-readme
  - domain: documentation
---
-->

# Specifications

The unit of work in this repository. Each specification states a verifiable outcome and its matched validations, is implemented by a coding agent on a `task/<slug>` branch, and is closed by one pull request whose tests reproduce the validations. The specification is the durable artifact; the pull request and its per-gate commits are the record. See [AGENTS.md](../../AGENTS.md) for the full lifecycle.

A spec is authored with the maintainer, then lands here in the pull request that implements it. A row gains its file link when that pull request opens, so this index grows as the series is built in the open.

---

## Naming and Numbering

Specs are named `spec-NN-<slug>.md`. `NN` is a running per-repository counter that does not reset. A `series` frontmatter field groups the specs of one game.

---

## Vector Vortex

A Tempest-inspired tube shooter on the wireframe arc, authored as three specs.

| Spec | Status | Description |
|------|--------|-------------|
| [spec-01-vector-vortex-core-playable](spec-01-vector-vortex-core-playable.md) | In review | Deterministic 24-lane core: fixed-step simulation, one Crawler, a five-minute director, three lives, exact controls, and a minimal semantic surface |
| spec-02-vector-vortex-wireframe-shell | Queued | Game-owned wireframe shell and published MVP on the vendored GameUI tokens and primitives |
| spec-03-vector-vortex-topology-shift-and-polish | Queued | The topology-shift twist, global stun, full enemy roster, and vector-FX polish |

---

## Related

| Document | Relationship |
|----------|--------------|
| [Repository Root](../../README.md) | Parent |
| [AGENTS.md](../../AGENTS.md) | The working model these specs are executed under |
