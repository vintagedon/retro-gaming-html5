<!--
---
title: "Tagging Strategy Guide"
description: "Controlled vocabulary for document classification"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-05-18"
version: "1.0"
tags:
  - type: guide
  - domain: documentation
related_documents:
  - "[Primary README Template](primary-readme-template.md)"
  - "[Interior README Template](interior-readme-template.md)"
  - "[General KB Template](general-kb-template.md)"
  - "[Worklog README Template](worklog-readme-template.md)"
  - "[One-Pager Template](one-pager-template.md)"
  - "[Project Charter Template](project-charter-template.md)"
---
-->

# Tagging Strategy Guide

## 1. Purpose

This guide defines the controlled tag vocabulary for the retro-gaming-html5 monorepo. Consistent tagging enables human navigation and RAG system retrieval across game directories and shared documentation.

---

## 2. Why Controlled Vocabulary

Uncontrolled tagging leads to synonyms fragmenting search (`game-design` vs `design` vs `mechanics`), inconsistent granularity (`phaser` vs `framework`), and tag proliferation that reduces signal. A controlled vocabulary defines allowed values upfront, ensuring consistency across contributors and time.

---

## 3. Tag Categories

Each category answers a different question about the document. Keep categories orthogonal; each captures a distinct dimension.

| Category | Question Answered | Required |
|----------|-------------------|----------|
| `type` | What kind of document is this? | Yes |
| `domain` | What subject area? | Yes |
| `status` | What's the lifecycle state? | Recommended |
| `tech` | What technologies involved? | When applicable |
| `game` | Which game in the monorepo? | When game-specific |

---

## 4. Domain Tags

```yaml
domain:
  - game-design       # Mechanics, balance, twist concepts, reference game analysis, level design
  - implementation    # Game code, framework usage, build process, rendering, physics
  - assets            # Art direction, sprite/vector assets, sound, visual design decisions
  - infrastructure    # Deployment, Azure Static Web Apps, nginx preview, CI/CD, publish scripts
  - documentation     # Templates, standards, meta-content, tagging, style guides
```

### Boundary Rules

- `game-design` covers the what and why of gameplay. `implementation` covers the how of code. A document about material fracture patterns as a design concept is `game-design`; a document about the Canvas rendering code for fracture effects is `implementation`.
- `assets` covers visual and audio design decisions and the assets themselves. Procedural generation code that produces assets is `implementation`.
- `infrastructure` covers everything between local development and a player's browser. Build tooling, deployment, preview environments, DNS.
- If a document spans two domains, use the primary one. Multi-value only when genuinely split.

---

## 5. Type Tags

| Tag | Use For |
|-----|---------|
| `project-root` | Repository root README |
| `directory-readme` | Interior README for any directory |
| `worklog` | Work log entries and milestone documentation |
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
| `draft` | In development, not yet complete |
| `active` | Current, maintained, approved |
| `under-review` | Scheduled or triggered review in progress |
| `deprecated` | Superseded, avoid for new work |
| `archived` | Historical reference only |

---

## 7. Tech Tags

```yaml
tech:
  - javascript
  - html5
  - canvas-2d
  - phaser
  - css
```

---

## 8. Game Tags

Game tags identify which game in the monorepo a document belongs to. Use only for game-specific content; omit for monorepo-level documents. Add new values as games are added to the collection.

```yaml
game:
  - materialoids      # Asteroids with material properties
```

New games are added to this list when their directory is created. The tag value matches the directory name.

---

## 9. Implementation

### Standard Frontmatter

```yaml
<!--
---
title: "Document Title"
description: "What this document covers"
author: "VintageDon (https://github.com/vintagedon/)"
date: "YYYY-MM-DD"
version: "1.0"
status: "Active"
tags:
  - type: guide
  - domain: game-design
  - game: materialoids
related_documents:
  - "[Related Doc](path/to/doc.md)"
---
-->
```

### Conventions

- Use lowercase, hyphenated values (`canvas-2d` not `Canvas2D`)
- Tech tags use canonical names
- One value per line for readability, or array syntax for multi-value
- `related_documents` links use relative paths within the repo

---

## 10. Maintaining the Vocabulary

### Adding New Tags

1. Check if an existing tag covers the concept
2. If not, add the new tag with a boundary definition to this document
3. Backfill existing documents if the new tag applies retroactively

### Adding New Games

When a new game directory is created in the monorepo, add the game name to the `game` tag list in §8 with a brief description.

### Governance

- This document is the authoritative source for allowed tag values
- Prefer broader tags over proliferating specific ones
- Review additions for overlap with existing tags

---

## 11. References

| Resource | Description |
|----------|-------------|
| [Primary README Template](primary-readme-template.md) | Shows tag usage in repository root READMEs |
| [Interior README Template](interior-readme-template.md) | Shows tag usage in directory READMEs |
| [General KB Template](general-kb-template.md) | Shows tag usage for standalone docs |
| [Worklog README Template](worklog-readme-template.md) | Shows tag usage for work log entries |
| [One-Pager Template](one-pager-template.md) | Shows tag usage for ideation documents |
| [Project Charter Template](project-charter-template.md) | Shows tag usage for project charters |
