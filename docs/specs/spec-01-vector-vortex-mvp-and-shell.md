<!--
---
title: "Vector Vortex Spec 01: MVP and Wireframe Shell"
description: "First playable Vector Vortex: a 24-lane Canvas 2D tube shooter with a fixed-step deterministic lane and depth core, a five-minute director, three lives, a DOM wireframe HUD, and a full app shell themed by a game-owned wireframe layer on the shared UI framework, with synthesized UI sound and tracked tests. Zero image and zero audio files. The topology-shift twist and combat polish are Spec 02."
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-08-14"
version: "1.1"
status: "Draft"
tags:
  - type: specification
  - domain: [game-design, implementation]
  - tech: [javascript, html5, css, canvas-2d, playwright]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Agent Instructions](../../AGENTS.md)"
  - "[Project README](../../README.md)"
  - "[Spec 02: Topology Shift and Polish](spec-02-vector-vortex-topology-shift-and-polish.md)"
---
-->

# Vector Vortex Spec 01: MVP and Wireframe Shell

**Series: Vector Vortex, spec 1 of 2. Spec 02 does not begin until this spec's pull request is merged.**

## Objective

The repository gains a self-contained game directory, `vector-vortex/`, holding a playable five-minute survival run rendered in Canvas 2D. The player rides the rim of a fixed 24-lane wireframe tube, fires inward along the current lane, and destroys outward-advancing enemies before they reach the rim. A fixed-step deterministic simulation, decoupled from render, governs movement, shots, and collision by lane and depth. A single Crawler enemy and an elapsed-time director drive escalating pressure across a run capped at five minutes. The player has three lives; the run ends in a survival cash-out at 5:00 or a loss at zero lives. A wireframe HUD, built as screen-space DOM on the shared UI framework's tokens and real primitives, reports score, best, a five-minute countdown, lives, kills, and accuracy. A full app shell surrounds the run as DOM and CSS: title, run-ended, pause, and a three-tab settings surface that persists preferences and the best score. A UI sound layer synthesizes menu feedback at runtime. The game ships zero image and zero audio files, and the whole interface is themed by a game-owned wireframe theme that never reads as the earlier Materialoids look. The tests that prove the validations are tracked so a clone reproduces them. The build publishes to `retrogaming.donfather.site/vector-vortex/`. The topology-shift twist and combat polish are Spec 02. The unit ends at the maintainer's review of the playable MVP.

## Why This Exists

This is rung one of the wireframe arc and the skeleton layer of the three-layer formula. It stops before the twist so the base tube shooter is a shippable classic on its own. It is also the first public spec in this repository, written to read cleanly to an outside contributor and to demonstrate the method with reproducible validations.

Four things are load-bearing and an implementer cannot infer them.

First, the twist is Spec 02. This spec renders one stable tube and never morphs it.

Second, the game ships no image files and no audio files. Geometry is procedural Canvas, chrome is CSS and inline SVG on the framework tokens, and audio is synthesized with the Web Audio API.

Third, the visual identity is game-owned and must escape the earlier Materialoids green. The framework's stock arcade theme is green-accented, so the game does not use it. Vector Vortex ships its own `vector-vortex` theme: a near-black void, cyan primary vectors, magenta reserved for the Spec 02 topology-shift energy, amber warnings, off-white text, and no decorative green. Every visual review answers: does any part read as Materialoids? A yes is a defect.

Fourth, the reference packs are shapes, not source. The settings and UI-sound outcomes are described here. An implementer may study `tiny-save-settings-menu-starter` and `tiny-ui-sfx-pack` for the shape of a settings surface and a sound-to-event map, then builds the described outcome. No pack file is copied.

## Execution Environment

Repo-mode. The repository `AGENTS.md` carries branch, commit, and pull-request conventions; this section carries deltas.

| Field | Value |
|-------|-------|
| Renderer | Canvas 2D, vanilla JavaScript ES modules, no bundler, no runtime build step. No Phaser. |
| Toolchain | `package.json`, lockfile, and `playwright.config` are created in Gate 1 and tracked. Node's built-in test runner for the core, Playwright (Chromium headless only) for the page. |
| Tests | Test source, fixed seeds, and fixtures are tracked. Only dependencies, browser binaries, and generated results are gitignored. The pull request records the exact command set. |
| Existing code | The `vector-vortex/` directory does not exist yet; Gate 1 creates it. |
| Framework | The shared UI framework's published `src/` is vendored into the game at a pinned commit with a manifest (Gate 1). |
| Attended | The maintainer reviews the pull request and captures. The run does not pause for review. |

## Scope

### Modify

- `vector-vortex/`, new: game `AGENTS.md`, `README.md`, interior READMEs, `publish.sh`, `package.json`, lockfile, `playwright.config`, the servable `game/` tree, the tracked test tree, and `docs/game-ui-consumer-report.md`.
- `game/`: `index.html`, ES modules for the core, director, HUD, shell, and UI sound; the game-owned `vector-vortex-theme.css`; and a vendored pinned framework snapshot under `game/vendor/gameui/` with its MIT license, a `MANIFEST.md`, and byte-identical files.
- The repository `README.md` and `docs/specs/README.md` status lines for Vector Vortex.

### Reference

The repository `AGENTS.md`; the framework's consuming-page contract; and `tiny-save-settings-menu-starter` and `tiny-ui-sfx-pack`, studied as shapes. Consult, do not copy.

### Do not touch

- The shared UI framework repository and the reference packs. The framework `src/` is vendored read-only with provenance; pack source is never copied.
- Any morph, shift, stun, second tube shape, or additional enemy type. Those are Spec 02.
- The preview umbrella root and any sibling game.

## Gates

Each gate ends in one commit referencing its number, with the tests that prove its validations.

### Gate 1: Scaffold, toolchain, framework vendor, and deterministic core

Create the `vector-vortex/` directory in the repository's game shape and the tracked toolchain (`package.json`, lockfile, `playwright.config`). Vendor a pinned snapshot of the framework's published `src/` into `game/vendor/gameui/`: record the exact 40-character upstream commit and a `MANIFEST.md` listing the upstream URL, the vendored runtime paths, and a content hash per file, and keep the files byte-identical to upstream so the import graph resolves locally with no external runtime dependency. Establish the theme contract: the page loads the framework stylesheet, then `vector-vortex-theme.css`, and sets `data-gc-theme="vector-vortex"` on `<html>`; game layout overrides live outside the vendor tree. Build the Canvas host rendering one stable wireframe tube (the onboarding circle) as rim segments, depth lines, and 24 projected lane rails.

Implement the deterministic simulation as pure ES modules importable by the browser and the test runner, to this contract:

- A fixed 60 Hz simulation step, decoupled from the render frame. Render interpolates; it never advances state.
- An input queue drained at the start of each tick. Held input is cleared on window `blur` and `visibilitychange`, and the simulation pauses while the document is hidden.
- A seeded RNG; the seed is fixed in tests.
- Per-tick update order, fixed and total: drain input, advance shots, advance enemies, resolve collisions, resolve rim breach and life loss, advance the clock.
- Swept collision: shots and enemies test their full lane-and-depth interval swept across the tick, so a fast shot or enemy cannot tunnel past a target between ticks.
- Collision is identical lane plus overlapping swept depth. On simultaneous candidates, resolve in ascending stable entity-ID order; a projectile is consumed on its first hit.
- A test-only seam advances the simulation by an exact tick count without real time, so browser tests reach late-run states without waiting.

The lane and depth model has 24 fixed lanes; the player moves lane by lane around the rim with wraparound; shots travel inward on a fire cooldown with hold-to-fire and a cap on simultaneous active shots.

Decisions already made: 24 lanes; fixed 60 Hz decoupled from render; the per-tick order above; swept collision; hold-to-fire with cooldown and cap; one stable tube for this spec.

**Validation:**

- [ ] A unit test asserts collision discriminates: a shot at lane L hits an enemy at lane L with overlapping depth and misses lane L+1 or non-overlapping depth. Mutation: widening the lane test to a distance of one makes L+1 pass and the test fails.
- [ ] A unit test asserts swept collision: a shot whose per-tick step exceeds an enemy's depth extent still registers the hit. Mutation: point-sampling instead of sweeping tunnels through and the test fails.
- [ ] A unit test asserts rim wraparound: left from lane 0 is lane 23, right from lane 23 is lane 0. A clamp fails.
- [ ] A unit test asserts the cooldown and active-shot cap; removing the cap exceeds it and the test fails.
- [ ] A replay-digest test runs the same seed and input log at two render frame rates and asserts an identical end-state digest. A render-coupled simulation diverges and fails.
- [ ] The served page renders the tube with the `vector-vortex` theme active and the vendored framework loaded by relative path with no external request; the vendor `MANIFEST.md` hashes match the vendored files.

### Gate 2: Crawler, director, scoring, lives, and end state

Add one Crawler: a lane and depth entity spawning at the depth end and advancing outward, destroyed in one hit. Add the elapsed-time director raising spawn rate across the onboarding, rising, mixed, and near-overload bands, capped at five minutes. Add scoring, a kills counter, and accuracy as landed hits over spawned shots; a cooldown-blocked keypress is not a shot. Give the player three lives; an enemy reaching the rim costs one life and clears, with a damage-grace window of 30 ticks (0.5 s) during which no further life is lost, so one tick cannot drain multiple lives. Define the end states: at 5:00, on the win-versus-damage tie the 5:00 boundary resolves as a win before any same-tick breach, yielding a survival cash-out (survival bonus plus accuracy bonus); at zero lives, a loss. The core exposes score, best-candidate, lives, kills, hits, shots, elapsed, and outcome through a read surface.

Exact rules, tunable within these defaults: base kill score 100; survival bonus 5000; accuracy bonus 2000 times the hit fraction; accuracy displays `ACC --` until the first shot is fired, then a rounded percentage. There is no streak system in the MVP.

Decisions already made: three lives; a 30-tick damage-grace; one-hit enemies; accuracy over spawned shots; the 5:00 boundary resolves win-before-breach; the survival cash-out; no streak.

**Validation:**

- [ ] A unit test asserts the director rate is strictly greater at 180 s than at 0 s and monotonic non-decreasing across bands. A flat rate fails.
- [ ] A unit test asserts the life-loss rule and grace: one rim breach decrements exactly one life; two breaches within the 30-tick grace decrement only one. Removing the grace decrements two and fails.
- [ ] A unit test asserts accuracy: ten spawned shots with seven hits reports 70 percent, cooldown-blocked presses do not change the denominator, and zero shots displays `ACC --`. A wrong denominator fails.
- [ ] A unit test asserts the end states and the 5:00 tie: 300 s with lives remaining yields the survival outcome even when an enemy breaches on the same tick; zero lives before 300 s yields the loss. Mutation: resolving the tie as a breach flips the outcome and fails.

### Gate 3: Wireframe DOM HUD

Render the HUD as screen-space DOM on the `vector-vortex` theme, hugging the viewport edges and never over the tube: SCORE top-left as the primary readout; BEST top-right from persistence; a five-minute countdown as a thin top-edge depletion bar that shifts color through the final minute; three lives as glyphs bottom-left; KILLS bottom-left beneath lives; and accuracy as `ACC nn%` (or `ACC --`) bottom-right. All readouts bind to the Gate 2 read surface and compute nothing. The HUD is DOM, because exercising the framework's DOM chrome is a purpose of this game.

**Validation:**

- [ ] A Playwright assertion reads each element and confirms it reflects core state after a scripted sequence; binding ACC to shots fired instead of accuracy mismatches and fails.
- [ ] The countdown bar depletes and enters its final-minute color at the correct threshold; a static bar fails.
- [ ] Lives render as exactly three glyphs and decrement visibly on a life loss.
- [ ] The HUD is DOM, not on the canvas, and no element overlaps the tube at supported viewport sizes.

### Gate 4: UI sound layer

Add a UI sound layer synthesizing menu feedback at runtime with the Web Audio API, mapped to interface events by a sound-to-event map whose shape is studied from `tiny-ui-sfx-pack`: clicks, hovers, confirms, cancels, toggles, transitions. The AudioContext is created or resumed on the first deliberate user gesture, per browser autoplay rules. The layer honors mute and volume and ships no audio files.

**Validation:**

- [ ] A scripted sequence asserts each mapped event produces its distinct synthesized cue; swapping two mappings fails.
- [ ] The context resumes only after a user gesture; audio attempted before a gesture is deferred, not lost.
- [ ] Mute silences output and volume scales it; output while muted fails. No audio file exists in the build.

### Gate 5: Wireframe app shell, persistence, and screens

Compose the shell as DOM and CSS on the `vector-vortex` theme, using the framework's real primitives (panels, buttons, inputs, meters). A state machine governs title, running, paused, settings, and ended. The title screen starts a run. The run-ended screen shows the outcome and the core's final score, kills, and accuracy, and offers a restart that returns to the title with the core reset. The pause overlay suspends the simulation on demand and on window blur. The settings surface has three tabs, Audio (mute, volume), Display, and Controls (read-only keybinds), whose shape is studied from `tiny-save-settings-menu-starter`; audio settings drive the Gate 4 layer. Preferences and the best score persist to LocalStorage under a versioned schema, with a defined fallback when storage is corrupt or unavailable so the game still runs. Save slots and data import/export are excluded. Every surface is DOM and reads core state.

**Validation:**

- [ ] A Playwright flow drives title to run to survival-end and asserts the end screen shows the survival outcome and the core's final figures; restart resets the core. Forcing a loss state to render the survival label fails.
- [ ] A second flow asserts the loss end and restart, that pause suspends the simulation, and that window blur pauses it and clears held input.
- [ ] Mute survives reload and a beaten best persists as BEST; a corrupt or unavailable store falls back without crashing. A preference that does not survive reload fails.
- [ ] The settings surface has exactly the Audio, Display, and Controls tabs, and no Save-slots or Data surface; the shell uses framework primitives and is DOM, not Canvas.

### Gate 6: Publish, visual check, and review surface

Make `publish.sh` idempotent and subfolder-scoped, copying only `game/` so the test toolchain never ships. Publish the MVP. Capture the title, the playfield with HUD, the run-ended screen, and the settings surface as unapproved candidates. Write the consumer report at `vector-vortex/docs/game-ui-consumer-report.md` recording the framework revision, the components and tokens used, the local overrides, accessibility findings, any missing primitives, any rejected reference-pack surfaces, and proposed upstream improvements as proposals, not authorization. Assemble a review surface with, per surface, a stable ID, a statement, an evidence path, a closed question, and the standing question: does any part read as Materialoids? Present two outcomes: accept and begin Spec 02, or call another MVP pass. The pull request carries the completed checklists and the exact validation commands.

**Validation:**

- [ ] The served root carries the build marker and `publish.sh` left the umbrella root and every sibling untouched and copied only `game/`; a second run is idempotent.
- [ ] The captures are recorded as unapproved.
- [ ] The consumer report exists at the named path with the listed sections.
- [ ] The review surface has one entry per surface, includes the Materialoids question, and names both outcomes without presuming acceptance.

## Constraints

- **Never introduce a morph, shift, stun, second tube shape, or additional enemy type.** Those are Spec 02.
- **Never ship an image or audio file.** Visuals are procedural Canvas and CSS or SVG chrome; audio is synthesized.
- **Never use the stock arcade theme or decorative green.** The game ships its own `vector-vortex` theme; a visual that reads as Materialoids is a defect.
- **Never draw chrome on the canvas, and never compute a game rule in the HUD, shell, or sound layer.** They read the core; the canvas owns only the playfield.
- **Never let render, hitstop, or any visual timing advance the simulation.** The core is fixed-step and decoupled.
- **Never copy pack or framework source beyond the vendored, manifested snapshot.** Packs are shapes.
- **`publish.sh` copies only `game/` and wipes only `vector-vortex/`.** Commit per gate, open one pull request, never merge.

## What the Implementer May Choose

Module and file decomposition; helper naming; the Canvas rendering strategy; the exact `vector-vortex` theme token values within the stated palette; the sound-to-event detail and Web Audio synthesis; and test organization. Tuning values (score amounts, cooldown length) may be adjusted within the stated defaults. Frozen: the 24-lane count; the fixed-step contract, per-tick order, swept collision, and replay-digest property; the lane-and-depth collision identity; hold-to-fire with cooldown and cap; three lives with a 30-tick grace; one-hit enemies; accuracy over spawned shots; the win-before-breach 5:00 tie; the six DOM HUD elements; DOM ownership of all chrome; the three-tab settings; the zero-asset, no-green identity; the vendored-with-manifest framework and read-only packs; and the reversible subfolder publish.

## Execution Order

1. Gate 1: scaffold, toolchain, framework vendor, deterministic core.
2. Gate 2: Crawler, director, scoring, lives, end state.
3. Gate 3: wireframe DOM HUD.
4. Gate 4: UI sound layer.
5. Gate 5: shell, persistence, screens.
6. Gate 6: publish, visual check, consumer report, review surface.

**Stop condition:** the maintainer reviews the playable MVP and accepts it or calls another pass. Spec 02 does not begin until this pull request is merged.

## Notes

Spec 02 owns the shape library, the shift scheduler and phases, the stun, the procedural chaos shape, the Sprinter and Splitter types, and the combat polish. It inherits and does not change the fixed-step contract, the per-tick order, the 24-lane count, the three-lives rule, the one-hit model, and the zero-asset, no-green posture this spec freezes.
