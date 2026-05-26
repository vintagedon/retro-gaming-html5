<!--
---
title: "Retro Gaming Reborn"
description: "Browser-based classics rebuilt with modern twists"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-05-18"
version: "1.0"
status: "Active"
tags:
  - type: project-root
  - domain: game-design
  - tech: [javascript, html5, canvas-2d]
related_documents:
  - "[One-Pager](internal-files/one-pager-retro-gaming-html5.md)"
---
-->

# Retro Gaming Reborn

[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

![repo-banner](assets/repo-banner.jpg)

> A monorepo of browser-based games rebuilding classics from the wireframe and early-graphics era, each with one modern mechanical twist.

Every game in this collection takes a recognizable classic (Asteroids, Lunar Lander, BattleZone, and others from the Atari, CGA/EGA, and early arcade era), faithfully reconstructs its core loop, then adds one mechanical twist that couldn't have existed on the original hardware. The aesthetic stays within the wireframe/vector tradition, but uses modern rendering for visual polish: colored thrust flames, smooth fracture lines, particle effects, glow.

---

## Overview

The source material for this project spans decades of constrained hardware: Atari 2600, CGA/EGA PC games, BASIC type-in programs from magazines, early arcade cabinets. These games had clear, elegant designs that were held back by memory limits, CPU speed, and display resolution. The question each game here answers is: "what if this design had one more idea and a modern browser to run in?"

The project is built around the spec-driven development model. Classic games have known, documented mechanics, which means the "done" state is unambiguous and validation criteria write themselves. Each game is small enough for a single spec to cover the complete MVP, with a follow-up spec for the twist mechanic and polish layer. Development happens via agent dispatch on ML01.

The three-layer formula for each game: **skeleton** (faithfully reconstructed classic gameplay loop), **twist** (one mechanical addition that couldn't exist on original hardware), **polish** (visual touches within the retro aesthetic using modern rendering). The twist is always additive; a player who ignores it still has a playable classic.

---

## Project Status

| Area | Status | Description |
|------|--------|-------------|
| Repository scaffold | ✅ Complete | Monorepo structure, documentation standards, tagging strategy |
| Materialoids | ⬜ Planned | Asteroids with material properties (first game) |
| CargoLander | ⬜ Planned | Lunar Lander with cargo delivery and space storms |
| Tank Commander | ⬜ Planned | BattleZone with EMP weapon mechanic |

---

## Architecture

Each game is a self-contained directory with no cross-game dependencies. The monorepo provides shared documentation standards and infrastructure; game code is isolated.

| Component | Implementation | Purpose |
|-----------|----------------|---------|
| Rendering | HTML5 Canvas 2D / Phaser 4 (per game) | Canvas for simple games, Phaser when physics or input abstraction is needed |
| Deployment | Azure Static Web Apps | Static HTML + JS + assets, no server-side logic |
| Dev preview | `https://<game>.donfather.site` | Per-game nginx subdomain on ML01 |
| Asset strategy | Wireframe/vector, procedural geometry | No sprite pipeline; the aesthetic is a feature |

---

## Repository Structure

```markdown
retro-gaming-html5/
├── docs/                         # Documentation standards and templates
│   └── documentation-standards/
├── internal-files/               # One-pagers, design notes
├── spec/                         # Specifications for agent dispatch
├── work-logs/                    # Development history
├── materialoids/                 # Game: Asteroids + material properties (planned)
├── AGENTS.md                     # Agent context loading instructions
├── CLAUDE.md                     # Pointer to AGENTS.md for Claude Code
└── README.md                     # This file
```

Game directories follow a consistent internal structure:

```markdown
<game-name>/
├── AGENTS.md                     # Game-specific agent context
├── README.md                     # Game overview
├── game/                         # Servable game files
│   ├── index.html
│   ├── js/
│   └── assets/                   # Gitignored
└── publish.sh                    # Wipe + copy to nginx
```

---

## Games

| Game | Source Inspiration | Twist | Status |
|------|--------------------|-------|--------|
| [Materialoids](materialoids/) | Asteroids | Material properties affecting fracture, density, momentum | Planned |
| CargoLander | Lunar Lander | Cargo delivery to variable pads, space storms as wind vectors | Planned |
| Tank Commander | BattleZone | EMP weapon with charge-up vulnerability tradeoff | Planned |

---

## Getting Started

Each game is a static HTML + JS application. To run locally:

```bash
# Serve any game directory with a local HTTP server
cd materialoids/game
python -m http.server 8080
```

No build step, no bundler, no package manager required for playing. Development and agent dispatch require ML01 access.

---

## License

- **Code**: [MIT License](LICENSE)
- **Data/Content**: [CC-BY-4.0](LICENSE-DATA)

---

Last Updated: May 18, 2026 | Status: Active
