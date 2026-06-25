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

The twist layer makes it Materialoids: every asteroid has a **material** readable from its wireframe colour, **molecular clouds** drift across the void as the only filled geometry, and an **illumination** system lights nearby cloud gas when your bullets pass through and when fractures occur. A player who ignores all three still has the full asteroids loop; a player who reads colour, drift, and fracture gains an edge.

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

## 4. The Twist: Materials, Clouds, Illumination

### Materials

Each asteroid picks one of four materials at construction (weighted random across all four, so no wave is single-material). Split children inherit the parent's material, so colour propagates down the fracture chain and stays readable. Material tunes stroke colour, drift speed, fracture behaviour, and density; it never changes the per-size score.

| Material | Wireframe colour | Density | Drift | Fracture |
|----------|------------------|---------|-------|----------|
| Rock | Grey/white | 1.0x | Medium | Standard split, 2 children, moderate spread |
| Ice | Light blue/cyan | 0.6x | Fast | 3 smaller, faster children, wide spread; shatters into fine debris on the smallest tier |
| Metal | Orange/amber | 1.8x | Slow | 2 children, tight spread, heavy momentum, brief split hesitation |
| Crystal | Magenta/pink | 1.0x | Medium | 2 angular children, visible fracture-line flash at split |

Density also scales the knockback an asteroid imparts on an invulnerable ship (metal shoves harder than ice), noticeable during the spawn-protection and hyperspace windows.

### Molecular clouds

Three to five semi-transparent nebula clouds drift across the playfield on slow constant vectors, far slower than the slowest asteroid, and wrap at the screen edges. Each is overlapping low-alpha filled blobs (radial gradients) in a muted deep blue/purple/teal palette, the only filled geometry in the game. They render between the background and the game objects, persist across wave transitions, and never affect collision. Asteroids overlapping a cloud render dimmer (a soft challenge, never invisible); the ship and bullets are never dimmed.

### Illumination

Player bullets travelling through a cloud brighten the gas around them (radius several times the bullet), leaving an additive glow trail that fades over a fraction of a second. Fractures inside or near a cloud flash a larger radius in the material's colour; crystal splits always flash regardless of clouds. The effect uses `globalCompositeOperation = 'lighter'` over the cloud layer, built on the template's existing glow approach, and is scoped to player bullets. Bullets outside clouds produce no cloud illumination.

---

## 5. Local Run

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
