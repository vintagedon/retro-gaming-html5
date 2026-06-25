<!--
---
title: "Materialoids"
description: "Wireframe asteroids game on the adopted Blastemoids Canvas template"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-06-24"
version: "1.0"
status: "Active"
tags:
  - type: directory-readme
  - domain: implementation
  - tech: [javascript, html5, canvas]
  - game: materialoids
related_documents:
  - "[Repository README](../README.md)"
  - "[Game AGENTS](AGENTS.md)"
  - "[Blastemoids Template Readme](../asset-game/materialoids/blastemoids-html-game-template-free/readme.md)"
---
-->

# Materialoids

Materialoids is a wireframe asteroids game. You pilot a vessel through a field of irregular rocks with inertia-based movement: thrust adds velocity, the void does not take it back, and planning your turns is the whole game. Hit a rock and it splits, large to medium to small. Clear the wave and the next one spawns, bringing hostile contacts with it.

The engine is the adopted Blastemoids single-file HTML5 template: vanilla Canvas 2D, Web Audio, versioned localStorage, all in one self-contained `index.html`. No build tools, no dependencies, no image or sound assets to ship.

---

## 1. Contents

```markdown
materialoids/
├── AGENTS.md             # Game-specific agent context
├── README.md             # This overview
├── publish.sh            # Copies game/ into /opt/agents/www/retrogaming/materialoids/
└── game/
    └── index.html        # The whole game (adopted Blastemoids template)
```

---

## 2. Controls

| Action | Keyboard | Gamepad | Mobile |
|--------|----------|---------|--------|
| Rotate | ← → / A D | Stick / D-pad | Tap < or > |
| Thrust | ↑ / W | Up D-pad / A | Hold ^ button |
| Fire | Space | RT / X | Tap F button |
| Hyperspace | Shift / H | LT / B | Tap H button |
| Pause | P / Esc | Start | Pause icon |

Hyperspace is a panic button: random teleport with brief invulnerability, but every use carries a 1-in-12 chance of instant death.

---

## 3. Gameplay

The ship drifts with momentum and a gentle exponential drag. Screen edges wrap, and collision accounts for the wrapped delta so a near-edge ship can be hit by an off-screen-but-wrapped asteroid. Asteroids split large into 2 medium into 2 small, four smalls per large.

Four enemy types unlock over waves:

| Enemy | First wave | Behavior | Points |
|-------|-----------|----------|--------|
| UFO | 1 | Drifts, jukes, fires aimed and spread patterns | 800 |
| Sniper | 3 | Charges, then fires fast precise shots | 1,200 |
| Spinner | 5 | Rotates and emits radial bullet patterns | 1,500 |
| Hunter | 8 | Chases you, fires rapid twin and cone shots | 1,800 |

Extra ships arrive every 10,000 points (cap 9). The top 8 high scores track both score and wave reached, and a stats screen records best score, best wave, runs, rocks destroyed by size, enemies killed, shots fired, deaths, and hyperspace use.

---

## 4. Local Run

Open `game/index.html` directly in any modern browser, or serve the folder over HTTP:

```bash
cd materialoids/game
python -m http.server 8000
```

Then visit `http://localhost:8000/`.

Publish to the nginx preview root with:

```bash
cd materialoids
./publish.sh
```

The deployed game lives at `https://retrogaming.donfather.site/materialoids/`.
