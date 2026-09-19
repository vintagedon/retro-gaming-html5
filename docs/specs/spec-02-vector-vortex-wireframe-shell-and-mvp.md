<!--
---
title: "Vector Vortex Spec 02: Wireframe Shell and MVP"
description: "Turn the accepted Vector Vortex mechanics slice into the published MVP by building a game-owned wireframe shell on the current vendored GameUI tokens and primitives, then record its theme, shell, settings, focus, and audio surfaces as evidence-backed candidates for a later separate framework backport."
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-18"
version: "3.0"
status: "draft"
tags:
  - type: specification
  - domain: [game-design, implementation]
  - tech: [javascript, html5, css, canvas-2d, playwright]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Repository AGENTS](../../AGENTS.md)"
  - "[Accepted Spec 01 contract](spec-01-vector-vortex-core-playable.md)"
  - "[Specifications Index](README.md)"
  - "[Game Agent Context](../../vector-vortex/AGENTS.md)"
---
-->

# Vector Vortex Spec 02: Wireframe Shell and MVP

**Series: Vector Vortex, spec 2 of 3. Dispatched only after Spec 01 was accepted and landed on the default branch. Spec 03 does not dispatch until this MVP has been accepted and landed.**

Authored 2026-08-16 and revised to v3.0 on 2026-09-18 for dispatch. This is the tracked in-repository copy of the central spec `2026-09-18-retrohtml5-spec-02-vector-vortex-wireframe-shell.md`; the central copy remains authoritative while the run is in the queue. The accepted Spec 01 contract is the tracked copy at `docs/specs/spec-01-vector-vortex-core-playable.md`, which folds amendments 01b and 01c.

## Startup and Lifecycle

Invoke the `spec-startup` skill before touching a deliverable. This is an operator-selected central-queue run targeting this Git repository. Startup requires a clean tree and creates the spec branch from the default branch.

Each deliverable ends in exactly one commit whose message carries the deliverable number and the game as scope. This repository exposes its spec layer publicly, so the copy of this spec in `docs/specs/`, its linked index row, and the completion records for a deliverable land inside the commit that completes it, never in a step after the final commit. `spec-closeout` then writes the central worklog and registry row, archives the central spec, pushes the branch, and opens or updates one pull request for review. The executor never merges and never force-pushes.

At startup, verify the one predecessor condition: the accepted Spec 01 game is on the target default branch. If it is not, stop. This spec vendors the framework's then-current published foundations, tokens, and Core primitives from the framework's default branch, and builds Vector Vortex's own wireframe theme layer and shell surfaces on top of them. It does not require the framework to ship a wireframe theme, tabs, settings, or pause module, and it writes no framework code. Every new surface remains visibly game-owned under `vv-` naming; backporting the proven candidates into framework-neutral `gc-` APIs is later, separate work against that repository. This is a single-repo run: every commit lands in the target game repository. Record the exact full framework commit selected for vendoring; it must be reachable from the framework default branch. The head verified at dispatch is `a678a2b0f135a991b4eacb8e62ea8d94f20c4505`; it is recorded in `vector-vortex/game/vendor/gameui/MANIFEST.md` and stays fixed for the whole run.

Worklog and registry: this repository holds no in-repo worklog files. The worklog and the `work-registry.csv` row for this run are written to the central worklog directory at closeout. No validation in this spec references an in-repo worklog location.

## Objective

The accepted mechanics slice becomes a complete, published MVP without changing its authoritative rules. The Canvas playfield remains game-owned, and the game builds the screen-space DOM shell on the vendored framework tokens and Core primitives: a responsive HUD, title, pause, three-tab settings, and run-ended flow under a game-owned `vector-vortex` wireframe theme. The theme layer and shell surfaces establish Vector Vortex's exact palette and layout on top of the framework foundations without modifying or restyling framework internals. UI sound is synthesized after a deliberate gesture. Preferences and best score persist defensively under one versioned local key. The framework snapshot is vendored with provenance, the preview publishes only the servable game subtree to `retrogaming.donfather.site/vector-vortex/`, and the consumer report records a path-level backport map that separates reusable behavior from game rules and visual identity. Acceptance of this MVP is the gate for Spec 03; any GameUI backport remains a separately approved specification.

## Execution Environment

| Field | Value |
|---|---|
| Target | This Git repository with the accepted Spec 01 game |
| Framework source | The `html5-game-ui-framework` repository, read-only; vendor a commit reachable from its default branch, recorded in the vendored MANIFEST |
| Renderer boundary | Existing Canvas playfield; game shell DOM and CSS outside the Canvas, on vendored framework tokens |
| Tests | Existing Node suite plus Chromium-headless Playwright for modules, focus, storage, responsive layout, and publishing |
| Assets | Zero image and zero audio files; inline SVG is allowed only for simple game-owned glyphs |
| Preview | `retrogaming.donfather.site/vector-vortex/`, published through the scoped publish script |

## Scope

### Pre-existing: do not create

- The accepted Spec 01 `vector-vortex/` game and its tracked test seam.
- The framework's published foundations (tokens and Core primitives), vendored read-only. The framework is not expected to ship a wireframe theme or screen modules; the game builds those itself.
- The preview umbrella root. This spec creates or replaces only its `vector-vortex/` child through the scoped publish script.

### Modify

- `vector-vortex/game/`: DOM shell and HUD bindings, the game-owned `vector-vortex` wireframe theme and shell surfaces, UI audio adapter, storage adapter, and a pinned framework snapshot under `game/vendor/gameui/`.
- `vector-vortex/`: tests, documentation, `publish.sh`, and `docs/game-ui-consumer-report.md`, including the required backport-candidate map.
- Target repository README and specification index status lines for the published MVP.

### Reference

- GameUI consuming-page contract and the framework default branch.
- `tiny-save-settings-menu-starter` and `tiny-ui-sfx-pack` as optional read-only examples of surface and event-map shape; copy no file, markup, style, sound, or code.

### Do not touch

- Authoritative lane/depth rules, tick order, director table, scoring, lives, collision, and outcomes from Spec 01.
- The framework repository, purchased/reference packs, sibling games, preview umbrella root, nginx, or public deployment.
- Topology shifts, shock/stun, Sprinter, Splitter, combat particles, screen shake, hitstop, or combat audio.

## Frozen Presentation Contract

### Framework and theme

Vendor only the published framework files needed by the import graph, byte-identical to the selected commit. `src/gc.css` imports three token files, two core files, and four theme files; preserve that complete relative import graph byte-for-byte, including theme files this game does not select. `src/gc.js` exports `ensureFrameworkDefs` and injects shared hidden SVG definitions; vendor it as published. The published runtime supplies no dialog, tab, settings, focus, or stage controller, and reference-harness helpers are not public runtime APIs. The published components are `.gc-panel`, `.gc-button`, `.gc-input`, and `.gc-meter`, the meter supporting its documented shapes, orientations, and `--gc-meter-value`. `MANIFEST.md` records upstream URL, full commit SHA, MIT license location, every path, and SHA-256 per file.

Load the vendored framework CSS and JavaScript by relative path, then the game-owned `vector-vortex-theme.css`; set `data-gc-theme="vector-vortex"` on `<html>`. Place game theme overrides in the framework's documented `@layer overrides` cascade layer and map the frozen palette onto real published tokens such as `--gc-surface-canvas`, `--gc-text-primary`, `--gc-text-muted`, `--gc-accent`, `--gc-status-warning`, and the public meter tokens. Verify the computed result on rendered elements rather than asserting the declaration.

Consume documented GameUI classes, attributes, and tokens unchanged; `data-gc-theme` is documented public consumption and is required. New game-owned APIs use a `vv-` prefix or an equally explicit Vector Vortex namespace recorded in the consumer report. The game does not invent new generic `gc-` selectors, data attributes, custom events, or JavaScript APIs, and does not restyle framework component internals. The theme uses no `!important` and no copied framework selector.

Freeze these game-owned roles:

| Role | Value | Use |
|---|---|---|
| Field | `#05080d` | Page and playfield background |
| Geometry | `#5ee7ff` | Player, tube, live shots, primary focus |
| Shift energy | `#ff4fd8` | Reserved for Spec 03; not used decoratively in this MVP |
| Warning | `#ffbf47` | Final-minute timer and danger state |
| Text | `#e8f1f7` | Primary labels and values |
| Muted text | `#7f93a3` | Secondary guidance |

Typography uses the local system monospace stack `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`; no font request is permitted. The visual identity is a restrained technical instrument: thin crisp rails, open negative space, bounded glow, compact uppercase labels, and no decorative idle motion.

### HUD

The HUD is DOM, reads the core snapshot, and owns no rule. Presentation formatting is allowed: converting elapsed ticks into display text or a meter fraction, rounding for display, and calling core-owned scoring helpers and constants. What the HUD must not do is reimplement an authoritative scoring, accuracy, collision, timing, or outcome rule. Where a display value would otherwise force the HUD to recompute core arithmetic, add a read-only projection to the core snapshot derived from values the core already owns; a projection introduces no new rule and does not change simulation behavior.

The HUD carries:

- `SCORE` top-left, primary numeric readout.
- `BEST` top-right from defensive persistence.
- A top-edge five-minute depletion meter with accessible text; it uses Geometry until 60 seconds remain, then Warning.
- Three life glyphs and `KILLS` bottom-left.
- `ACC --` or `ACC nn%` bottom-right.
- A visible paused/status label that mirrors shell state without replacing the pause dialog.

At `1024x576`, `1280x720`, `1440x900`, and `1920x1080`, the HUD stays within edge safe areas and does not cover the tube's playable rim. Below `960x540`, keep title/settings/end surfaces operable and show the Spec 01 larger-area recommendation; touch controls remain out of scope.

This MVP retains Vector Vortex's existing responsive viewport contract. The GameUI charter has since adopted a single 1920x1080 logical stage, uniformly fitted and centered, and states that the shared stage host is not implemented and that consumers adopt it through their own migration decisions. Migrating Vector Vortex to that stage is deliberately deferred: importing the framework's CSS and JavaScript does not implement a stage host, building one here would be framework work inside a game spec, and the responsive contract is the area Spec 01 spent three amendments stabilizing. Do not add a fit host, and do not change the viewport list to the charter's acceptance resolutions. Record the deferral in the consumer report as a named candidate so the migration is tracked rather than forgotten.

### Shell, focus, and lifecycle

The shell states are `title`, `running`, `paused`, `settings`, and `ended`. Title offers Start, Settings, and How to Play using framework primitives. Pause is a game-built surface on framework primitives and offers Resume, Settings, Restart, and Return to Title. Settings is a game-built surface on framework primitives with exactly three tabs:

- Audio: mute and integer volume `0..100`.
- Display: motion preference `system`, `reduced`, or `full`.
- Controls: read-only action map from Spec 01; no rebinding.

The run-ended surface displays outcome, final score, kills, accuracy, and the survival and accuracy bonus components, reusing the core's scoring helpers and constants rather than restating their arithmetic, plus New Run/Return to Title actions. Dialogs contain focus, close on Escape where safe, and restore focus to the invoking control. Window blur while running clears held actions and enters paused once; blur on any other state changes nothing. Hidden documents do not advance the core.

Shell, settings, and display preferences do not change gameplay outcomes. Compare gameplay state at equal completed simulation ticks for the same gameplay actions; `paused`, `heldInput`, and other lifecycle fields are expected to differ across a pause and are excluded from that comparison rather than asserted equal.

### Audio and persistence

Create or resume one AudioContext only after the first deliberate gesture. Synthesize bounded cues for activate, confirm, cancel, toggle, pause, resume, and screen transition. Audio callbacks and time never advance shell or core state. Mute silences all cues and volume scales one centralized UI bus.

Use exactly one key, `retrohtml5.vector-vortex.v1`, with this owned shape:

```json
{
  "version": 1,
  "preferences": { "muted": false, "volume": 80, "motion": "system" },
  "bestScore": 0
}
```

Validate types and ranges, ignore unknown fields, and fall back to defaults on missing, malformed, wrong-shape, out-of-range, quota, or security failures. A new best writes only after `run-ended`. Do not persist an in-progress run, seed, replay, save slot, analytics identifier, or unrelated browser data.

### Candidate boundary and later backport

This game is the proving ground, not the framework release. New UI code stays game-local and may be shaped for extraction, but it must not claim generic framework ownership. The consumer report contains one backport table with a stable `VV-CAND-*` ID for each of seven named candidates and no more: the wireframe theme, HUD composition, contained dialog/focus flow, tabs behavior, settings model, the UI-audio event map, and the deferred fixed-stage migration. Do not enumerate beyond those seven. Each row records the game-owned source paths, public behavior, framework tokens/Core primitives consumed, game-rule dependencies, keyboard/focus/accessibility contract, tests and captures, suggested destination (`theme`, `core`, `module`, `reference-lab`, or `game-only`), required generalization, and recommended disposition (`backport-now`, `hold-for-another-consumer`, or `keep-game-only`).

The evidence decides the disposition; this spec does not pre-approve any candidate. A later GameUI spec owns neutral naming, rewriting or generalization, registered scenarios, framework tests, documentation, and nginx reference publication. If that work lands before another game starts, the next game consumes the new pinned framework revision. A game already in progress never repins mid-spec.

## Deliverables and Validation

#### Deliverable 1: Pinned GameUI foundations and Vector Vortex wireframe theme

Vendor the verified current framework commit with manifest/license, compose the page from the framework's real public tokens and Core primitives, and implement the game-owned, `vv-`-namespaced wireframe theme layer and responsive shell layout.

Validation:

- [x] Every vendored file matches its recorded SHA-256 and upstream byte content; the commit is reachable from framework `main`.
- [x] The page loads all runtime files relatively and makes no off-origin request, and the expected stylesheets and modules are observed loading successfully. The required rendered primitives exist and carry their expected computed theme roles; a check that passes over an empty element set does not satisfy this box.
- [x] Browser/source checks prove the shell is composed from the framework's public tokens and Core primitives, and the game restyles no framework component internals.
- [x] `data-gc-theme="vector-vortex"` is active; the theme layer sets only documented public tokens and game layout; no `!important` or framework-internal selector exists in game CSS.
- [x] Source checks reject newly invented generic `gc-` selectors, data attributes, custom events, and JavaScript APIs, and reject restyling of framework component internals. Documented public consumption, including `data-gc-theme`, passes. The recorded Vector Vortex namespace is confirmed on all game-owned candidates.
- [x] Automated palette checks and a human capture confirm every accent-bearing surface uses its frozen role and magenta remains reserved.

Completion record (2026-09-19): vendored snapshot at `vector-vortex/game/vendor/gameui/` with provenance in its `MANIFEST.md`, pinned at framework commit `a678a2b0f135a991b4eacb8e62ea8d94f20c4505`. Proven by `vector-vortex/tests/core/vendor-manifest.test.js`, `vector-vortex/tests/core/source-boundaries.test.js`, and `vector-vortex/tests/browser/theme.spec.js` (stylesheet and origin scan, rendered-primitive computed roles, focus ring, rendered stylesheet magenta scan, and a canvas pixel palette probe). The playfield renderer was retinted to the frozen roles in the same deliverable because the frozen palette governs every accent-bearing surface, canvas included. Human-review capture: `vector-vortex/docs/evidence/capture-title-1280x720.png` (unapproved candidate).

#### Deliverable 2: Responsive DOM HUD

Replace the mechanics slice's minimal status with the frozen HUD while retaining adjacent objective and controls text for accessibility. Bind through one adapter from snapshots/events; do not modify the core to accommodate layout.

Validation:

- [x] A scripted run checks every value against the same core snapshot after shots, hits, a life loss, final-minute entry, survival, and loss.
- [x] The depletion meter starts full, switches to Warning at exactly 3,600 remaining ticks, and reaches zero at elapsed tick 18,000, including a final-tick loss. A loss before the final tick freezes the remaining value rather than emptying it.
- [x] Zero shots shows `ACC --`; all three life glyphs and subsequent decrements match the snapshot.
- [x] Screenshot geometry probes at the four supported viewports find no HUD/playable-rim overlap, clipping, horizontal scroll, or hidden action, and confirm the required HUD, playfield, and actions each have nonzero bounds entirely inside the viewport. Required actions remain operable by keyboard and by pointer.
- [x] HUD bindings reuse core-owned scoring helpers and constants and duplicate no authoritative scoring, accuracy, collision, timing, or outcome rule. Presentation formatting and the normalization of elapsed ticks into display text or a meter fraction are permitted and are not findings.

Completion record (2026-09-19): the frozen HUD replaced the mechanics-slice status grid. The core gained the sanctioned read-only `remainingTicks` projection and the `FINAL_MINUTE_TICKS` vocabulary constant; the HUD binder (`game/runtime/dom.js`) formats only. BEST renders through a provider hook that deliverable 3 wires to defensive persistence. Proven by `vector-vortex/tests/core/hud-projection.test.js` and `vector-vortex/tests/browser/hud.spec.js` (scripted deterministic run with a seed-verified hit at the tick-59 lane-15 spawn, staged outcomes through the tracked seam, meter threshold and freeze checks, four-viewport geometry probes with screenshots, and keyboard/pointer action operability). The 01c chrome reserve was re-measured for the HUD layout (296px worst viewport plus 16 margin). The title capture was refreshed for the new HUD.

#### Deliverable 3: Shell, UI sound, and defensive storage

Implement the frozen shell states, focus behavior, three-tab settings, blur/pause contract, run-ended breakdown, synthesized UI audio, storage schema, and reset-to-defaults path.

Validation:

- [x] Keyboard-only Playwright flows cover title → run → pause → settings → resume → both outcomes → new run/return to title, with visible focus and correct restoration.
- [x] Relabeling a shell item in a fixture does not alter the named command it invokes; each activation fires once.
- [x] Blur during running pauses once and clears held actions; blur elsewhere changes neither shell nor core. Elapsed ticks stay fixed across a real pause interval, and after resume the clock advances at the normal rate with no catch-up and fresh input acts.
- [x] Replacing audio with a no-op yields an identical shell action log and identical gameplay state at equal completed ticks. The first deliberate gesture enables a cue, mute yields zero output, volume scales the one common bus, audio completion drives no shell or core state, and node counts stay bounded.
- [x] Reload fixtures for missing, corrupt, wrong-shape, out-of-range, unavailable, and valid storage all reach an operable title. Start is actually activated, a run is completed, and that run's best score survives a reload; valid preferences survive; in-progress state never does.
- [x] The settings surface has exactly Audio, Display, and Controls. Each tab is activated by keyboard and by pointer, its content renders, and focus behaves correctly. No save, import/export, rebinding, account, telemetry, or progression surface appears.

Completion record (2026-09-19): the shell (`game/runtime/shell.js`) owns the five lifecycle states on framework primitives, with focus containment, Escape safety, and invoker restoration; the clock runs only in the running state, so real time never advances a title or ended run. The run-ended surface reuses `SURVIVAL_BONUS` and `computeAccuracyBonus` from the core's scoring module for its breakdown. Synthesized UI audio (`game/runtime/audio.js`) gates on the first deliberate gesture, scales one bus by volume, silences on mute, and bounds active nodes. Defensive persistence (`game/runtime/storage.js`) keeps the single `retrohtml5.vector-vortex.v1` key with field-level validation and silent degradation on quota or security failure. Proven by `vector-vortex/tests/browser/shell-flow.spec.js`, `shell-audio.spec.js`, and `shell-storage.spec.js`, with the blur contract exercised in the reworked `blur.spec.js` and `interaction.spec.js` journeys. The spec-01-era lifecycle tests were reworked onto the shell lifecycle with a shared `startRun` helper; the deterministic-seam and clock contracts are unchanged.

#### Deliverable 4: Scoped preview, evidence, and MVP review

Create an idempotent `publish.sh` that resolves its own game root, validates the destination basename `vector-vortex`, replaces only `/opt/agents/www/retrogaming/vector-vortex/`, and copies only `game/`. Publish the candidate, capture the title, running HUD, pause, all three settings tabs, survived end, and lost end, and label captures unapproved. Write the GameUI consumer report with the pinned revision, primitives/modules/tokens used, overrides, accessibility findings, missing surfaces, rejected upstream ideas, bounded proposals, and the complete `VV-CAND-*` backport table. Assemble a review surface with stable IDs, evidence paths, one closed question per surface, and two outcomes: accept the MVP and permit Spec 03, or call another MVP pass. Backport recommendations are reviewed as recommendations and do not dispatch framework work.

Validation:

- [x] Preview marker and page load at the target URL; a second publish is byte-identical.
- [x] Before/after inventory proves the umbrella root and sibling folders are unchanged, and only servable `game/` files were copied.
- [x] Captures cover every named state/viewport and are explicitly unapproved candidates.
- [x] The consumer report separates observed evidence, game-local decisions, and upstream proposals; every required candidate has a complete `VV-CAND-*` row, source paths resolve, tests/captures are cited, and proposals do not authorize framework edits.
- [x] A reviewer check confirms each `VV-CAND-*` row's source paths resolve, its cited evidence exists, its game-rule dependencies are named, and its proposed generalization is stated. No report validator or negative fixture is built for this; an architectural recommendation is judged by a reader, not by a test.
- [x] Review entries ask whether the shell reads as one coherent technical instrument, remains legible, and preserves the palette roles without presuming acceptance.

Completion record (2026-09-19): `vector-vortex/publish.sh` resolves its own game root, guards the `vector-vortex` destination basename, wipes and repopulates only its own preview child, and writes a deterministic content-digest marker. The candidate is published at `retrogaming.donfather.site/vector-vortex/`. Eight named-state captures (title, running, paused, three settings tabs, survived end, lost end, all 1280x720) are committed under `vector-vortex/docs/evidence/` as unapproved candidates. The GameUI consumer report (`vector-vortex/docs/game-ui-consumer-report.md`) carries the pinned revision, the consumed public surface, accessibility findings, missing surfaces, rejected upstream ideas, the complete seven-row `VV-CAND-*` backport map, and the MVP review surface with one closed question per surface and the two review outcomes. Proven by `vector-vortex/tests/core/publish.test.js` (scoped copy, sibling invariance, byte-identical double publish, guard mutation) and `vector-vortex/tests/browser/preview.spec.js` (published tree serves, marker serves, live shell on the preview origin).

#### Deliverable 5: Documentation and closeout

Update the game README, game `AGENTS.md`, target README, and specification index with the exact local commands, preview command/URL, framework revision/manifest, asset and license posture, controls, and current MVP status. Invoke `spec-closeout`.

Validation:

- [ ] Documentation matches the implemented commands, ownership boundaries, preview path, and accepted-or-candidate state.
- [ ] Each deliverable carries exactly one commit containing only that deliverable's target changes and the required co-author trailer, the public spec copy and index row ride the commit of the deliverable they describe, and the branch is pushed with exactly one open pull request.
- [ ] The matching worklog and registry row record validations, starting base, framework SHA, and target commit SHA.
- [ ] This spec is archived under the central spec month folder and removed from the flat queue.

## Constraints

- The game shell owns screen-space DOM on vendored framework tokens and primitives; Canvas owns playfield rendering; the core remains authoritative.
- Do not edit the framework or copy its component internals; vendor only its published tokens and primitives. Game-authored candidates remain `vv-` namespaced, and backporting them upstream is separate later work.
- Do not change Spec 01 balance or rules and do not begin Spec 03 early.
- Ship no image, audio, font, CDN, analytics, or off-origin runtime dependency.
- Publishing is reversible preview validation, not a public release.

## Execution Order

1. Pinned framework consumer and theme.
2. Responsive DOM HUD.
3. Shell, UI audio, and defensive storage.
4. Scoped preview, evidence, and MVP review.
5. Documentation and closeout.

## Notes

This builds Vector Vortex's wireframe shell in the game, on the framework's current vendored tokens and primitives, over mechanics that already work. It intentionally produces extraction-shaped evidence without pretending the game-local implementation is already a framework module. The consumer report is the handoff to one or more later GameUI backport specifications; those specifications may rewrite, split, or reject candidates and this run never edits upstream itself.
