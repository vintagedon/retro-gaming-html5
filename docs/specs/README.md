<!--
---
title: "Specifications"
description: "Public specifications for the retro gaming monorepo, the unit of spec-driven work"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-19"
version: "1.2"
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
| [spec-01-vector-vortex-core-playable](spec-01-vector-vortex-core-playable.md) | vector-vortex | Under review | Deterministic core playable: fixed-step 60-tick/s simulation, 24-lane tube shooter, Crawler enemy, five-minute director, three lives, swept collision, accuracy bonus, semantic DOM controls. Supersedes the deprecated spec-01-vector-vortex-mvp-and-shell and spec-02-vector-vortex-topology-shift-and-polish pair. The Spec 01b amendment (in the central spec queue) corrects three contract defects and rebuilds the mutation test suite. The Spec 01c amendment (pass 1 plus its continuation, central spec queue) repairs playability and test truth and is folded into this spec as the Amendment 01c section. |
| [spec-02-vector-vortex-wireframe-shell-and-mvp](spec-02-vector-vortex-wireframe-shell-and-mvp.md) | vector-vortex | Under review | Wireframe shell and MVP: vendored GameUI foundations with provenance, game-owned `vector-vortex` wireframe theme on the framework's public tokens, responsive DOM HUD, shell/focus/settings lifecycle, synthesized UI audio, defensive persistence, scoped preview publish, and the GameUI consumer report with the `VV-CAND-*` backport map. Executes the central spec of the same date and name. |
| [spec-01-vector-vortex-mvp-and-shell](spec-01-vector-vortex-mvp-and-shell.md) | vector-vortex | Deprecated | Earlier MVP-and-shell scope (full app shell, shared UI framework, synthesized UI sound). Superseded by spec-01-vector-vortex-core-playable. |
| [spec-02-vector-vortex-topology-shift-and-polish](spec-02-vector-vortex-topology-shift-and-polish.md) | vector-vortex | Deprecated | Earlier topology-shift scope. Superseded by the global-counter version in the central spec archive. |

---

## Related

| Document | Relationship |
|----------|--------------|
| [Repository Root](../../README.md) | Parent |
| [AGENTS.md](../../AGENTS.md) | The working model these specs are executed under |
