# Agent Instructions

## Repository Identity

A monorepo of browser games, each rebuilding a classic from the wireframe and early-graphics era with one modern mechanical twist and visual polish the original hardware could not support. Every game is a self-contained static site: its own `AGENTS.md`, `README.md`, `publish.sh`, and servable `game/` tree, with no cross-game code dependency.

This repository is also a worked example of spec-driven development in the open. Each game is authored as a specification with matched, executable validations, implemented by a coding agent against that spec, and reviewed in a pull request before merge. The specs, the tests that prove them, the games, and the review history are the public record. A reader should be able to clone the repository and reproduce every validation.

Repository: `https://github.com/vintagedon/retro-gaming-html5`

## The Ladder

Games are sequenced as a deliberate complexity ladder in two arcs, each rung introducing one new capability so engine techniques accumulate rather than restart. The next rung is chosen after the current game ships and its review shows what the method exposed. The ladder is a roadmap, not a contract.

**Wireframe arc.** Vector and wireframe games. Contained Canvas 2D, sized to two or three specs, shipping zero image and zero audio files.

| Rung | Candidate | New capability |
|------|-----------|----------------|
| 1 | Vector Vortex | Fixed-step simulation, procedural geometry, scheduled topology change, first vector-FX vocabulary |
| 2 | Lunar Lander | Continuous physics, fuel and thrust, telemetry HUD, landing evaluation |
| 3 | Missile Command | Pointer targeting, limited resources, branching threats, chain reactions |
| 4 | Armor Attack / Black Widow | Navigation and obstacles, or twin-stick control and denser enemy behavior |
| 5 | Battlezone | 3D wireframes, radar, spatial enemies, cover |

**Sprite arc.** NES and 8-bit-inspired games. Sprites, tiles, animation, scrolling, asset manifests, and richer audio. These games commit curated finished-game assets and introduce an asset pipeline.

A custom 3D wireframe game is the eventual capstone and graduates out of this Canvas monorepo to a Three.js or WebGPU home.

## How Work Is Organized

Work is repo-mode and spec-driven. A unit of work is a specification under `docs/specs/`, implemented on a branch as gated commits, and closed by one pull request. The specification is the durable artifact; the pull request and its per-gate commits are the record. There are no separate work-log files.

### Executing a Work Spec

1. **Branch.** Create `task/<spec-slug>` from `main`. A tracking issue is optional; the branch and pull request are required.
2. **Implement by gate.** Work the gates in order. Each gate ends in one commit whose message carries the gate number and, for game work, the game as scope, for example `feat(vector-vortex): add lane and depth core (gate 1)`.
3. **Prove.** Write and run the tests that satisfy the gate's validations. Check the spec's validation boxes as each gate's tests pass, in the commit that completes the gate.
4. **Status.** The spec's frontmatter `status` moves `draft` while unimplemented, `under-review` when its pull request is open, and `active` when merged. A superseded spec is marked `deprecated` with a pointer to its replacement.
5. **Pull request.** Open one pull request per spec. It carries the diff, the completed validation checklist, the exact commands that reproduce the validations, and links to the evidence captures. Review happens in the open.
6. **Acceptance.** The maintainer's merge is acceptance. Agents commit and open pull requests; they never merge. Retained evidence is whatever the pull request references plus the committed consumer report.

## Specifications

- Live under `docs/specs/`, tracked and public. Each new tracked directory carries an interior README.
- Named `spec-NN-<slug>.md`, where `NN` is a running per-repository counter that does not reset. A `series` field in the frontmatter groups the specs of one game so the queue reads as a series rather than a run of orphaned numbers.
- Carry their validations as a checklist. A validation must fail on a subtly wrong result, not only a missing one; where the discriminating check is non-obvious, the spec names a mutation that must make it fail.
- End at a stop condition: a maintainer decision, an irreversible action, or a verifiably complete deliverable.

## Tests

Validations are the public contract in the spec, and the tests that prove them are tracked so a fresh clone can reproduce them: test source, fixed seeds, fixtures, `playwright.config`, `package.json`, and the lockfile are committed. Dependencies, downloaded browser binaries, traces, videos, reports, coverage, and caches are gitignored. Browser tests target Chromium headless only, since other browsers are not available on the host. A game's `publish.sh` copies only its `game/` tree, so the development test toolchain never ships to the served site. A development-only toolchain does not violate the no-build-step runtime rule.

## Architectural Constraints

- Games serve as static files with no server-side rendering, no dynamic backend, and no runtime build step. Relative asset paths only. Azure Static Web Apps compatible.
- Each game is self-contained. Shared code is extracted only when duplication becomes a maintenance burden, never speculatively.
- Canvas 2D is the default renderer. Phaser 4 enters only when a game needs physics, input abstraction, or scene management, and Three.js or WebGPU only for 3D work. Do not add an engine unless the spec asks for one.
- Games consume the shared browser-game UI framework for their screen-space chrome so the games serve as real consumer evidence for that framework. A game builds its own theme layer on the framework's tokens and uses the framework's real primitives rather than reinventing them.
- Licensed reference packs are studied as shapes, never redistributed. A spec may point an implementer at a pack for the shape of a surface or a recipe; the implementer builds the described outcome and copies no pack source.
- Each game's `publish.sh` is idempotent and wipes only its own subfolder before copying `game/` to the preview umbrella at `retrogaming.donfather.site/<game>/`. It never touches the umbrella root or a sibling.
- Single-player only. No multiplayer, networking, or server-side logic.

### Assets

Asset policy follows the arc.

- **Wireframe arc:** zero image and zero audio files. Geometry is drawn procedurally on Canvas, chrome is CSS and inline SVG on the framework tokens, and audio is synthesized at runtime. The absence of an asset pipeline is a feature.
- **Sprite arc:** curated, license-cleared finished-game assets are committed under the game's own `game/assets/`. Each asset-backed game carries `game/assets/MANIFEST.md` recording, per asset or pack, the source, a content hash, the transformation applied, the applicable license, and the required attribution. Raw purchased packs, receipts, templates, and unused source assets are never committed; they stay in the ML01 library and in ignored staging.

## Documentation Conventions

- All Markdown files carry YAML frontmatter per `docs/documentation-standards/tagging-strategy.md`. Standard repository furniture and licenses are exempt.
- New tracked directories carry an interior README per `docs/documentation-standards/interior-readme-template.md`.
- Follow the writing style guide. Do not use em dashes.
- Never delete a file. Move retired files to `recycle-bin/` with a one-line reason. `recycle-bin/` is gitignored.

## Session Pattern

1. Load this file, then `README.md`, then the game's own `AGENTS.md` when working inside a game directory, then the assigned specification.
2. Work on a `task/<slug>` branch within the spec's scope.
3. Prove each gate's validations with tracked tests locally.
4. Commit per gate and open one pull request. Never merge.
