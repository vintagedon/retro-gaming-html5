# Agent Instructions

## Repository Identity

A monorepo of browser-based games, each rebuilding a classic from the wireframe and early-graphics era with one modern mechanical twist and visual polish that original hardware couldn't support. Games are developed via spec-driven agent dispatch on ML01. Each game is self-contained within its own directory, with its own AGENTS.md, publish.sh, and servable game/ folder.

Repository: `https://github.com/vintagedon/retro-gaming-html5`

## Context Loading

Agents working on this repository should load context in this order:

1. This file (`AGENTS.md`), which covers repository identity, constraints, and conventions
2. `README.md` for project overview, game index, and current state
3. `docs/documentation-standards/` for templates and standards to follow
4. `internal-files/one-pager-retro-gaming-html5.md` for design philosophy and technical decisions
5. The specific game's `AGENTS.md` (e.g., `materialoids/AGENTS.md`) when working within a game directory

## Architectural Constraints

- All games must serve as static files compatible with Azure Static Web Apps. No server-side rendering, no dynamic backends, no build steps requiring server infrastructure. Relative asset paths only.
- Each game is a self-contained directory. No cross-game code dependencies. Shared code (in `shared/`) is opt-in and only extracted when duplication becomes a maintenance burden.
- Wireframe and vector aesthetics are the default. Games use Canvas 2D or Phaser 4 on a per-game basis. Phaser is only introduced when a game genuinely needs physics, input abstraction, or scene management.
- Game assets in `game/assets/` directories are gitignored. They come from the shared library at `/opt/agents/repos/libraries/game-asset-packs/` on ML01, from a game's own staging packs and base templates under `asset-game/`, or are generated procedurally.
- Each game's `publish.sh` is idempotent and publishes under the shared preview umbrella. Target: `/opt/agents/www/retrogaming/<game>/`, served at `https://retrogaming.donfather.site/<game>/`. The script wipes only the game's own subfolder before copying `game/` contents, never the `retrogaming/` root. Older games served from their own subdomain (for example `eobclone`) predate this convention and migrate to the umbrella over time.
- No multiplayer, no networking, no server-side logic. These are single-player browser games.
- Games that outgrow the "one or two specs" model graduate to their own repository.

## Documentation Conventions

- All Markdown files require YAML frontmatter (see `docs/documentation-standards/tagging-strategy.md`)
  - Exempt: standard repo furniture (CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, licenses) and source materials in `internal-files/`
- New directories require an interior README (see `docs/documentation-standards/interior-readme-template.md`)
- Script files require language-appropriate headers (see `docs/documentation-standards/script-header-*.md`)
- Follow dual-audience commenting (see `docs/documentation-standards/code-commenting-dual-audience.md`)
- Follow writing style conventions (see `docs/documentation-standards/writing-style-guide.md`)
- Agents never delete files; move unnecessary files to `recycle/` with documented justification
- Game-specific tags use the `game` category from the tagging strategy (e.g., `game: materialoids`)

## Commit Messages

- Present tense, imperative mood
- 72-character first line limit
- Reference issues after first line
- Use game name as scope when changes are game-specific (e.g., `feat(materialoids): add material fracture system`)

## Session Pattern

1. Load context (this file + README + game-specific AGENTS.md if applicable)
2. Work within defined scope
3. Document changes appropriately
4. Update work-logs if significant work completed
