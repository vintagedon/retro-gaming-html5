<!--
---
title: "GameUI Consumer Report: Vector Vortex"
description: "Evidence-backed record of Vector Vortex's use of the vendored html5-game-ui-framework foundations, with the VV-CAND backport-candidate map and the MVP review surface"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-19"
version: "1.0"
status: "Active"
tags:
  - type: report
  - domain: [game-design, foundations]
  - tech: [css, javascript, html5, canvas-2d, playwright]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Repository AGENTS](../../AGENTS.md)"
  - "[Specifications Index](../../docs/specs/README.md)"
  - "[Spec 02: Wireframe Shell and MVP](../../docs/specs/spec-02-vector-vortex-wireframe-shell-and-mvp.md)"
  - "[Vendor Manifest](../game/vendor/gameui/MANIFEST.md)"
  - "[Evidence Captures](evidence/README.md)"
---
-->

# GameUI Consumer Report: Vector Vortex

Vector Vortex is the first full consumer of the published
`html5-game-ui-framework` foundations. This report is the handoff to one or
more later GameUI backport specifications. It separates three kinds of
content and never mixes them:

1. **Observed evidence** - what the vendored foundations did when a real
   game consumed them, with the tests and captures that prove it.
2. **Game-local decisions** - choices this game made inside its own
   namespace; they bind no other consumer and authorize no upstream edit.
3. **Upstream proposals** - bounded recommendations for the framework,
   offered for review. They do not authorize framework work by themselves;
   a later, separately approved GameUI specification owns any backport.

## 1. Pinned Revision

| Field | Value |
|---|---|
| Upstream | `https://github.com/vintagedon/html5-game-ui-framework` |
| Pinned commit | `a678a2b0f135a991b4eacb8e62ea8d94f20c4505` (head of upstream `main` at vendoring time; reachable from `main`) |
| Vendored paths | 11 files under `vector-vortex/game/vendor/gameui/`, byte-identical; provenance and SHA-256 per file in [MANIFEST](../game/vendor/gameui/MANIFEST.md) |
| Integrity test | `vector-vortex/tests/core/vendor-manifest.test.js` |

The pin never moved during this run. A game already in progress does not
repin mid-spec.

## 2. Observed Evidence: What the Game Consumed

### 2.1 Public surface actually used

| Consumed | Where | Notes |
|---|---|---|
| Cascade layer order (`@layer reset, tokens, core, modules, theme, overrides`) | `game/vendor/gameui/gc.css` | Consumed byte-for-byte; all game CSS lives in `overrides` |
| Semantic token tier | `vector-vortex-theme.css`, `styles.css` | The game maps its frozen palette onto public semantic tokens only |
| Component token tier | `vector-vortex-theme.css` | Public meter tokens (`--gc-meter-*`) and control tokens (`--gc-control-fill-selected`, `--gc-button-selected-text`) |
| `.gc-panel` | Title, paused, settings, how-to, and ended dialogs | Used as-is; no internal restyled |
| `.gc-button` | Every shell and HUD action | Consumed with `aria-pressed` state styling for mute and motion controls |
| `.gc-input` | Volume range input | Consumed as-published; `accent-color` set from `--gc-accent` by the game to keep the native range in palette |
| `.gc-meter` + `gc-meter__fill` | Top-edge depletion meter | Driven exclusively through the documented `--gc-meter-value` channel; Warning flip sets the public `--gc-meter-fill` token via a game class |
| `data-gc-theme="vector-vortex"` | `<html>` | Required documented consumption; matches no shipped theme, so the semantic fallback plus the game's overrides layer render the theme |
| `gc.js` (`ensureFrameworkDefs`) | Loaded as a module | Shared SVG defs inject on import; consumed unchanged |
| Spacing, radius, focus, z-index, motion, and status tokens | `styles.css`, `vector-vortex-theme.css` | `--gc-z-modal` hosts the shell; `--gc-focus-ring` verified rendering on a real control |

### 2.2 What the foundations did well

- **The token tiers held.** Every frozen palette role the spec named
  resolved on rendered elements to the exact expected color
  (`tests/browser/theme.spec.js`, computed probes rather than declaration
  reads). The theme needed no `!important`, no specificity fights, and no
  framework-internal selector - the overrides layer and `:where()` defaults
  did all the work, exactly as the cascade contract advertises.
- **The meter is consumer-ready.** One custom property
  (`--gc-meter-value`) drove the whole depletion meter, including the
  final-minute Warning flip by setting one more public token. No game CSS
  touches a framework-internal selector anywhere in the game tree
  (`tests/core/source-boundaries.test.js`).
- **Byte-identical vendoring is a workable consumption model.** The import
  graph loaded unchanged over plain static hosting, and the manifest-plus-
  hash discipline made drift detectable in one command.

### 2.3 Accessibility findings (observed)

- `:focus-visible`-only ring styling means programmatic `focus()` carries
  no visible ring in Chromium; keyboard journeys show it correctly. Games
  should test focus with real keyboard events, and the framework could say
  so explicitly in its consuming contract.
- `role="meter"` is not a framework opinion: the game set role, min, max,
  `aria-valuenow`, and `aria-valuetext` itself. The published markup for a
  meter does not document an accessible-composition recipe.
- The range input consumes `.gc-input` styling but keeps its native
  track/thumb; palette alignment needed the game's `accent-color` set.
  Documented token support for form-control accents would remove a
  per-consumer shim.

### 2.4 Missing surfaces (game had to build them itself)

The published runtime supplies no dialog, tab, settings, focus, or stage
controller, and reference-harness helpers are not public runtime APIs. The
game built, in its own namespace: dialog surfaces with focus containment,
Escape-safety and invoker restoration (`game/runtime/shell.js`); roving-
tabindex tabs; a defensive persistence layer; and a synthesized UI-audio
adapter. Each is a backport candidate below. The fixed-stage host deferral
is candidate VV-CAND-7.

### 2.5 Rejected upstream ideas (game-local decisions)

- **Shipped themes.** None of the four `data-gc-theme` files reads as a
  wireframe instrument; the game activates none and ships its own theme
  layer. The import graph keeps them vendored byte-for-byte regardless.
- **Backdrop frost and ornament techniques.** `backdrop-filter` and the
  ornament/texture channels were left at defaults: the frozen identity is
  flat rails and open negative space, and compositing blur over live
  gameplay was judged decorative idle motion the spec forbids.
- **Fixed 1920x1080 stage.** Loading the CSS and ESM installs no stage
  host (upstream documents the host as pending); the game retained its
  stabilized responsive contract rather than building framework work inside
  a game spec. Tracked as VV-CAND-7.

## 3. Backport-Candidate Map (`VV-CAND-*`)

Exactly seven candidates. Dispositions are recommendations for a later
GameUI specification; none authorizes upstream edits. Destinations use the
framework's vocabulary: `theme`, `core`, `module`, `reference-lab`, or
`game-only`.

| ID | Candidate | Game-owned source paths | Public behavior | Framework tokens/primitives consumed | Game-rule dependencies | Keyboard / focus / a11y contract | Tests and captures | Suggested destination | Required generalization | Recommended disposition |
|---|---|---|---|---|---|---|---|---|---|---|
| VV-CAND-1 | Wireframe theme | `game/vector-vortex-theme.css`, `game/styles.css` | A flat, thin-rail, high-negative-space dark theme on six frozen roles with a monospace system stack and uppercase micro-labels; activates via `data-gc-theme="vector-vortex"` | Sets public semantic and component tokens only (`--gc-surface-*`, `--gc-text-*`, `--gc-accent`, `--gc-status-*`, `--gc-meter-*`, focus, radius, typography tokens) | None; the theme is rule-free and reads no game state | n/a (non-interactive) | `tests/core/source-boundaries.test.js`, `tests/browser/theme.spec.js`; `docs/evidence/capture-title-1280x720.png`, `capture-running-1280x720.png` | `theme` | Rename to a neutral theme name, restate the six roles as token literals in an upstream voice, document the reserved-role pattern | `backport-now` |
| VV-CAND-2 | HUD composition | `game/runtime/dom.js`, HUD markup in `game/index.html`, `.vv-hud-*` layout in `game/styles.css` | Corner-anchored score/best readouts, one top-edge meter, glyph-based lives, kills, accuracy readout, and a shell-state label, all bound through one adapter | `.gc-meter`, `--gc-meter-value`, `--gc-meter-fill`, label typography tokens, `--gc-status-warning` | Reads snapshots including the core's `remainingTicks` projection and `accuracyPercent`; the meter fraction is presentation math over core-owned values | Meter exposes `role="meter"` with min/max/now/valuetext; lives are glyph rows with `aria-label`; accuracy is text | `tests/browser/hud.spec.js`, `tests/core/hud-projection.test.js`; `capture-running-1280x720.png` | `module` | Generalize the binder into slot descriptors (label, source, formatter) with consumer-supplied projections; keep game projections out of the module | `hold-for-another-consumer` |
| VV-CAND-3 | Contained dialog / focus flow | `game/runtime/shell.js` (focus trap, invoker restore, Escape safety), dialog markup in `game/index.html`, `.vv-dialog` in `game/styles.css` | Modal dialogs that contain Tab, wrap both directions, close on Escape where safe, and restore focus to the invoking control | `.gc-panel` dialog shells, `--gc-z-modal`, `--gc-scrim-fill`, focus tokens | None in the focus mechanics themselves; the shell's state machine decides which dialog exists | `role="dialog"` + `aria-modal` + labelled heading; Tab/Shift-Tab containment; Escape routing per surface | `tests/browser/shell-flow.spec.js`, `interaction.spec.js`; `capture-paused-1280x720.png` | `core` | Extract a focus-scope utility (open/surface/close/trap/restore) independent of any state machine; the shell stays the consumer | `backport-now` |
| VV-CAND-4 | Tabs behavior | `game/runtime/shell.js` (`activateTab`/`selectTab`), tab markup in `game/index.html`, `.vv-tab*` in `game/styles.css` | Roving-tabindex tab list; arrows and Home/End move and activate; click activates; panels toggle on selection | `.gc-button` with `aria-selected` fill via `--gc-control-fill-selected`; divider and label tokens | None | Full roving-tabindex contract with `aria-controls`/`aria-labelledby` panel linkage | `tests/browser/shell-storage.spec.js`; `capture-settings-audio-1280x720.png`, `capture-settings-display-1280x720.png`, `capture-settings-controls-1280x720.png` | `core` | Extract as a small `createTabs` primitive registering tab/panel pairs | `backport-now` |
| VV-CAND-5 | Settings model | `game/runtime/storage.js`, settings wiring in `game/runtime/shell.js`, settings markup in `game/index.html` | One versioned storage key; field-level validation with per-field defaults; merge-write patches; reset-to-defaults; mute toggle, bounded volume, motion preference | `.gc-button` pressed states, `.gc-input`, label tokens; motion applied through public `--gc-motion-*` tokens | None beyond the game's preference vocabulary; persistence never carries run state | Every control labelled; toggle exposes stable name with `aria-pressed`; range is natively keyboard-operable | `tests/browser/shell-storage.spec.js`; `capture-settings-audio-1280x720.png` | `module` | Describe the store as schema-driven (key, version, fields, validators) so consumers declare their own vocabularies | `hold-for-another-consumer` |
| VV-CAND-6 | UI-audio event map | `game/runtime/audio.js`, cue bindings in `game/runtime/shell.js` and `main.js` | Synthesized activate/confirm/cancel/toggle/pause/resume/transition cues after the first deliberate gesture; one context, one bus; mute silences; volume scales; bounded nodes | None (Web Audio, not CSS); deliberately token-free | The event map names shell intents; cues never carry or alter state, proven by no-op equivalence | No audio channel is required for any keyboard or focus path; audio is additive only | `tests/browser/shell-audio.spec.js` (no-op equivalence, gate, bus, bounds) | `module` | Keep the synth; externalize the intent-to-cue map as consumer configuration | `hold-for-another-consumer` |
| VV-CAND-7 | Deferred fixed-stage migration | Not implemented; responsive contract lives in `game/styles.css` (`.vv-*` layout, canvas sizing rule) | The game kept its Spec-01-stabilized responsive viewport contract instead of adopting the charter's single 1920x1080 stage | None; importing framework CSS/ESM installs no stage host today | Migration would touch only layout, never rules, but is deliberately not started | The responsive contract keeps controls operable below 960x540 (`shell-flow.spec.js` small-viewport test) | `tests/browser/viewport.spec.js`, `hud.spec.js` geometry probes | `reference-lab` | Wait for the framework's stage host to exist; then migrate under a spec that owns the letterbox/fit behavior | `hold-for-another-consumer` |

## 4. Review Surface (MVP review)

The maintainer reviews this MVP in the open pull request. Two outcomes are
available: **accept the MVP and permit Spec 03**, or **call another MVP
pass** naming the surfaces to revisit. Backport dispositions above are
reviewed as recommendations only. One closed question per surface:

| Surface | Evidence | Closed question |
|---|---|---|
| Theme and palette | `capture-title-1280x720.png`, `capture-running-1280x720.png`, `theme.spec.js` | Does the shell read as one coherent technical instrument under the frozen six-role palette, with the reserved magenta visibly absent? |
| HUD | `capture-running-1280x720.png`, `hud.spec.js` geometry probes | Do score, meter, best, lives, kills, and accuracy stay inside the safe areas at all four viewports without covering the playable rim? |
| Dialogs and focus | `capture-paused-1280x720.png`, `shell-flow.spec.js` | Does every dialog hold focus, close safely on Escape where offered, and return focus to the invoking control? |
| Settings | `capture-settings-audio-1280x720.png`, `capture-settings-display-1280x720.png`, `capture-settings-controls-1280x720.png`, `shell-storage.spec.js` | Do the three tabs read clearly, operate by keyboard and pointer, and avoid every forbidden surface? |
| Run-ended | `capture-ended-survived-1280x720.png`, `capture-ended-lost-1280x720.png` | Does the outcome and bonus breakdown reuse the core's arithmetic visibly and correctly? |
| Legibility | All captures | Do label, value, and guidance text remain legible against the field at every capture? |
| Publishing | `preview.spec.js`, `publish.test.js`, `https://retrogaming.donfather.site/vector-vortex/` | Does the published preview match the branch and nothing else on the umbrella changed? |
| Backports | `VV-CAND-*` table | Do the dispositions match the evidence, with no candidate pre-approved by this run? |

## 5. Bounded Upstream Proposals (summary)

Carried in the candidate rows and restated here for the reviewer:

1. A sixth upstream theme file generalizing the wireframe theme
   (VV-CAND-1, `backport-now`).
2. A core focus-scope utility extracted from the dialog flow
   (VV-CAND-3, `backport-now`).
3. A core tabs primitive extracted from the settings surface
   (VV-CAND-4, `backport-now`).
4. Consumer-pressure notes for a HUD module, a schema-driven settings
   module, and an audio-event-map module, each waiting on a second
   consumer (VV-CAND-2/5/6, `hold-for-another-consumer`).
5. Stage-host migration deferred until the framework ships the host
   (VV-CAND-7, `hold-for-another-consumer`).

None of these authorizes framework work. If a later GameUI spec lands
them, this game consumes the new pinned revision in its own later spec; a
game already in progress never repins mid-spec.
