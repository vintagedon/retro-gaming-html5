<!--
---
title: "Tagging Strategy Guide"
description: "Controlled vocabulary for document classification"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-14"
version: "1.1"
tags:
  - type: guide
  - domain: documentation
related_documents:
  - "[Primary README Template](primary-readme-template.md)"
  - "[Interior README Template](interior-readme-template.md)"
  - "[General KB Template](general-kb-template.md)"
  - "[One-Pager Template](one-pager-template.md)"
  - "[Project Charter Template](project-charter-template.md)"
---
-->

# Tagging Strategy Guide

## 1. Purpose

This guide defines the controlled tag vocabulary for the retro-gaming-html5 monorepo. Consistent tagging enables human navigation and RAG retrieval across game directories and shared documentation.

---

## 2. Why Controlled Vocabulary

Uncontrolled tagging fragments search through synonyms, inconsistent granularity, and tag proliferation. A controlled vocabulary defines allowed values upfront, ensuring consistency across contributors and time.

---

## 3. Tag Categories

| Category | Question Answered | Required |
|----------|-------------------|----------|
| `type` | What kind of document is this? | Yes |
| `domain` | What subject area? | Yes |
| `status` | What's the lifecycle state? | Recommended |
| `tech` | What technologies involved? | When applicable |
| `game` | Which game in the monorepo? | When game-specific |
| `series` | Which multi-spec game series? | When part of a series |

---

## 4. Domain Tags

```yaml
domain:
  - game-design       # Mechanics, balance, twist concepts, reference game analysis, level design
  - implementation    # Game code, framework usage, build process, rendering, physics, UI and shell code
  - assets            # Art direction, sprite/vector assets, sound, visual design decisions
  - infrastructure    # Deployment, Azure Static Web Apps, nginx preview, CI/CD, publish scripts
  - documentation     # Templates, standards, meta-content, tagging, style guides
```

### Boundary Rules

- `game-design` covers the what and why of gameplay; `implementation` covers the how of code, including the HUD, shell, and framework integration.
- `assets` covers visual and audio design decisions and the assets themselves. Procedural generation code is `implementation`.
- `infrastructure` covers everything between local development and a player's browser.
- If a document spans two domains, use the primary one. Multi-value only when genuinely split.

---

## 5. Type Tags

| Tag | Use For |
|-----|---------|
| `project-root` | Repository root README |
| `directory-readme` | Interior README for any directory |
| `charter` | Project charter (frozen scope and architectural commitments) |
| `one-pager` | Ideation capture (portable context unit for AI handoffs) |
| `guide` | Step-by-step procedures and how-to documents |
| `reference` | Lookup information: inventories, schemas, API docs |
| `specification` | Specs for agent dispatch, formal requirements |
| `report` | Analysis, findings, summaries |

---

## 6. Status Tags

| Tag | Description |
|-----|-------------|
| `draft` | In development, not yet implemented |
| `active` | Current, maintained, merged |
| `under-review` | Implementation pull request open |
| `deprecated` | Superseded, avoid for new work |
| `archived` | Historical reference only |

---

## 7. Tech Tags

```yaml
tech:
  - javascript
  - html5
  - canvas-2d
  - css
  - phaser
  - playwright        # Chromium-headless browser tests
```

---

## 8. Game Tags

Game tags identify which game a document belongs to. Use only for game-specific content. The tag value matches the directory name. Add new values as games are added.

```yaml
game:
  - materialoids      # Asteroids with material properties (earlier experiment)
  - vector-vortex     # Tempest-inspired tube shooter with scheduled topology shift
```

---

## 9. Series Tags

A series groups the specifications of one multi-spec game so the running-counter spec queue reads as a coherent series rather than a run of orphaned numbers. Use the game's slug as the value. Omit for single-spec work.

```yaml
series:
  - vector-vortex     # spec-01 (MVP), spec-02 (topology shift and polish)
```

---

## 10. Implementation

### Standard Frontmatter

```yaml
<!--
---
title: "Document Title"
description: "What this document covers"
author: "VintageDon (https://github.com/vintagedon/)"
date: "YYYY-MM-DD"
version: "1.0"
status: "Draft"
tags:
  - type: specification
  - domain: [game-design, implementation]
  - tech: [javascript, html5, canvas-2d, playwright]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Related Doc](path/to/doc.md)"
---
-->
```

### Conventions

- Lowercase, hyphenated values (`canvas-2d`, not `Canvas2D`).
- Tech tags use canonical names.
- `related_documents` links use relative paths within the repo.

---

## 11. Maintaining the Vocabulary

- This document is the authoritative source for allowed tag values.
- To add a tag, check for an existing cover, then add it with a boundary definition here.
- When a new game directory is created, add its slug to §8, and to §9 if the game spans multiple specs.
- Prefer broader tags over proliferating specific ones.
