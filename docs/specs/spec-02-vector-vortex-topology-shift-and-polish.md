<!--
---
title: "Vector Vortex Spec 02: Topology Shift and Polish"
description: "The Vector Vortex twist and polish on the merged Spec 01 MVP: a schedule anchored to 30-second shock marks; a procedural shape library with a chaos shape pinned to the 4:30 shift; a two-second stun that freezes and damage-gates all enemies including those at the rim; one-hit Sprinter and Splitter enemies; a director re-tuned so the final minute requires phase-aware play; and a game-owned, renderer-only vector-FX polish layer with synthesized combat audio. Still zero image and zero audio files."
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
  - "[Spec 01: MVP and Wireframe Shell](spec-01-vector-vortex-mvp-and-shell.md)"
---
-->

# Vector Vortex Spec 02: Topology Shift and Polish

**Series: Vector Vortex, spec 2 of 2. This spec does not begin until Spec 01's pull request is merged.**

## Objective

Vector Vortex gains its defining twist and polish on the merged Spec 01 MVP. A shift scheduler anchored to absolute 30-second shock marks morphs the tube through a fixed phase sequence: a five-second warning with a klaxon, rim pulse, and ghost preview; a one-second morph that interpolates rim coordinates; an instant shock at the mark; and a two-second stun. A procedural shape library supplies the profiles, all preserving the 24-lane count so collision, enemy paths, and in-flight shots keep their lane and depth through every morph. During the stun every enemy freezes, including any at the rim, deals no damage, and stays shootable. A procedural chaos shape is pinned to the 4:30 shift. Two one-hit enemy types join the Crawler: a faster Sprinter and a Splitter that spawns two weaker adjacent-lane children on death. The director is re-tuned so the final minute cannot be cleared by phase-unaware play, and a stun-clear count is surfaced. A game-owned vector-FX layer gives the combat feel, driven by semantic events and honoring reduced motion, and it is strictly renderer-only: no effect touches the deterministic simulation. Combat audio is synthesized. The game still ships zero image and zero audio files, and the shift energy renders in the theme's reserved magenta. The build republishes and the unit ends at a maintainer review of the complete game.

## Why This Exists

Spec 01 delivered a shippable but static tube shooter. The scheduled shift and the two-second stun it releases are the difficulty engine and the reason the game exists under the twist rule. This spec is the twist and polish tiers and rung one's contribution to the ladder's vector-FX vocabulary.

Three things are load-bearing and an implementer cannot infer them from the MVP.

First, a morph changes only projected rim coordinates, never collision. Enemies and shots keep their lane and depth across every morph. This is what lets the shift be a presentation transform over the fixed-step simulation.

Second, the stun is a balance resource, not a flourish. It freezes all enemies including rim-contact ones, they deal no damage while frozen, and they stay shootable. The director is tuned against the assumption that the player exploits these windows.

Third, polish is strictly renderer-only. This is the subtle trap: hitstop, shake, and flashes must never advance or pause the authoritative simulation. Reduced motion removes them, so if any of them touched the core, an accessibility setting would change score, spawn timing, collision, and survival, and the replay digest would diverge. The deterministic core, director, clocks, digest, and outcome must be identical with reduced motion on or off.

## Execution Environment

Repo-mode. Deltas only; the repository `AGENTS.md` and the Spec 01 build carry the rest.

| Field | Value |
|-------|-------|
| Existing code | The `vector-vortex/` game exists from Spec 01: the fixed-step core and its per-tick order, the Crawler, the director, the DOM HUD, the wireframe shell, and the UI sound layer. Verify the core read surface and event names before wiring. |
| Browser verification | Playwright, Chromium headless only. The Spec 01 test tick-advance seam reaches late-run and final-minute states without real time. |
| Tests | Tracked, as in Spec 01. Node test runner for the shape library, scheduler, stun, and enemy types; Playwright for the integrated shift and polish. |
| Reference | The `impact-juice-combat-polish-bundle`, studied for the shape of hitstop and shake timing values. Studied, not copied. |
| Attended | The maintainer reviews the complete game and captures. |

## Scope

### Modify

- `game/`: the shape library and shift scheduler, the stun and shockwave logic, the Sprinter and Splitter types, the director re-tune, the renderer-only vector-FX layer, and the reduced-motion setting added to the existing settings surface.
- The core read surface and event stream, extended with the shift phase, the stun state, the stun-clear count, and the combat events the polish layer subscribes to, without changing the lane and depth identity or the per-tick order except to add shock and stun resolution at the defined point.
- The DOM HUD, adding the stun-clear count.
- The tracked test tree; the repository status lines; the consumer report; the captures and review surface.

### Reference

The one-pager's shift phases, shape library, enemy roster, and difficulty ramp; Spec 01 for the frozen core; and the `impact-juice-combat-polish-bundle` for the shape of its timing values. Consult, do not copy.

### Do not touch

- The lane and depth identity, the 24-lane count, the collision model, and the fixed-step per-tick order frozen by Spec 01, except to insert shock and stun resolution at the defined point in the order.
- The three-lives rule, the survival cash-out, the one-hit model, and the zero-image, zero-audio-file posture.
- The framework repository and the reference packs. Study the pack; copy nothing.
- The Drifter enemy type; the roster here is Crawler, Sprinter, Splitter.

## Gates

Each gate ends in one commit referencing its number, with the tests that prove its validations.

### Gate 1: Shape library and shift scheduler

Build the shape library as a pure module: circle, square, wide and tall rectangles, triangle, hexagon, octagon, and a procedural chaos shape, each producing 24 projected rim points, never a different lane count. The chaos shape is a radial polygon from the seeded RNG with a clamped radius, a clamped adjacent-radius delta, closure from lane 23 back to lane 0, and an optional smoothing pass. Build the scheduler anchored to absolute shock marks at each 30-second multiple. Relative to each mark: the warning opens at the mark minus five seconds and exposes the incoming shape for the ghost preview, the morph runs the mark minus one second to the mark, the shock fires at the mark, and the stun runs the mark to the mark plus two seconds. Stable play fills the intervals, so the cadence is exact by construction. The morph interpolates rim coordinates only. A shift never selects the same shape twice in a row. The chaos shape is excluded from selection except at the 4:30 shift, where it is the selected shape; its warning opens cleanly at 4:25.

Extend the Spec 01 per-tick order: on a shock tick, shock activation and stun state resolve before enemy movement and rim-breach resolution.

Decisions already made: every shape preserves 24 lanes; the morph is rim-coordinate interpolation only; the schedule is anchored to 30-second marks so phase windows align by construction; no immediate shape repeats; the chaos shape is pinned to the 4:30 shift; shock and stun resolve before movement and breach on the shock tick.

**Validation:**

- [ ] A unit test asserts every shape, including a chaos sample, yields exactly 24 rim points and a closed polygon. A different count fails.
- [ ] A unit test asserts lane and depth invariance across a morph for an enemy and a shot before, during, and after. Recomputing lane from rendered position during morph fails.
- [ ] A unit test asserts the chaos constraints from a fixed seed: radius and adjacent-delta within clamps, no self-crossing, reproducible. A delta-clamp violation fails.
- [ ] A unit test asserts the schedule: a shock at each 30-second mark, warning before morph, and the chaos shape selected at the 4:30 shift and at no shift before 4:00. A repeated shape on consecutive shifts fails.
- [ ] A unit test asserts the shock-tick order: shock and stun resolve before movement and breach. Reordering movement first fails.

### Gate 2: Stun window, shockwave, enemy roster, and director re-tune

Implement the shockwave and the two-second stun. During stun every enemy freezes, including any at the rim, deals no damage, and stays shootable, and director spawns pause: missed spawn opportunities during the stun are discarded, never released as a burst afterward. Add the Sprinter, one-hit, faster than a Crawler, and differentiated by speed, size, and score rather than hit count. Add the Splitter, one-hit, that on death spawns exactly two weaker children in the immediately adjacent lanes (with rim wraparound at lanes 0 and 23), each at the Splitter's depth, at a defined lower speed, size, and score; children do not themselves split, and a Splitter killed during stun spawns children that are themselves stunned for the remaining window. Re-tune the director across the ramp bands so the final minute cannot be survived by phase-unaware play. Surface a stun-clear count in the HUD, where a stun clear is an enemy destroyed while the stun is active.

Decisions already made: the stun freezes and damage-gates rim-contact enemies; director spawns pause during stun with no post-stun burst; the roster is one-hit Crawler, Sprinter, Splitter, Drifter deferred; the Sprinter differs by speed, size, score; Splitter children are adjacent-lane, non-splitting, and inherit the active stun; a stun clear is a kill during stun.

**Validation:**

- [ ] A unit test asserts stun behavior: a frozen enemy does not advance, a rim-contact frozen enemy causes no life loss, and a shot still destroys it. Allowing a frozen rim enemy to decrement a life fails.
- [ ] A unit test asserts spawn freeze: no enemy spawns during the stun window and none are released as a burst at its end. A post-stun burst fails.
- [ ] A unit test asserts the Splitter: killing one spawns exactly two weaker, non-splitting children in adjacent lanes at the Splitter's depth, with wraparound at the rim ends; a Splitter killed during stun yields stunned children. Same-lane, splitting, or unstunned-during-stun children fail.
- [ ] A unit test asserts the Sprinter is one-hit, faster than a Crawler, and scores differently. A two-hit Sprinter fails.
- [ ] A director test on a fixed seed corpus with a fixed shot budget asserts the difficulty intent: a phase-unaware policy (nearest-rim targeting, no warning-based repositioning) reaches zero lives in the final minute, and a phase-aware policy (repositions on the warning and prioritizes the most dangerous lanes during the stun) survives on the same seeds above a stated survival threshold. A director on which the phase-unaware policy survives the final minute fails the intent. Fun is confirmed separately by human playtest, not this test.
- [ ] The stun state and stun-clear count are on the core read surface and the HUD reflects the count.

### Gate 3: Vector-FX polish and combat audio (renderer-only)

Add the polish layer as game-owned procedural Canvas effects driven by semantic events (enemy hit, enemy destroyed, topology shock, life lost): glow strokes, short shot trails, pooled line-fragment particles, shockwave rings, hit flashes, bounded screen shake, hitstop, and drifting score popups. Every effect is renderer-only: hitstop is a bounded hold on the render presentation and never advances or pauses the simulation; the core, director, clocks, replay digest, and outcome are identical with the polish and reduced motion in any combination. Read hitstop and shake magnitudes as starting points whose shape is studied from `impact-juice-combat-polish-bundle`; author the popup drift and the event map, which the pack does not supply. Render the shift energy in the theme's reserved magenta. Synthesize combat audio with the Web Audio API: a fire chirp, a hit blip, a klaxon on the warning, a bass snap on the shock, honoring the Spec 01 mute and volume. Add a reduced-motion setting that removes shake, hitstop, flicker, and long trails. Ship no raster VFX sheet and no audio file.

Decisions already made: effects are procedural Canvas, not sprite sheets; hitstop and all polish are renderer-only; combat audio is synthesized; the pack is studied for timing shape only; reduced motion is required.

**Validation:**

- [ ] A scripted sequence asserts each event triggers its effect: enemy-destroyed applies a hitstop hold and a drifting popup, topology-shock applies the large shake, enemy-hit applies the flash. Unbinding enemy-destroyed from hitstop leaves no hold and fails.
- [ ] A determinism test asserts the end-state replay digest is identical across the four combinations of polish on/off and reduced-motion on/off for the same seed and input log. Any divergence, especially from hitstop, fails.
- [ ] No raster VFX file and no audio file exists in the build; effects are procedural and audio synthesized.
- [ ] Reduced motion removes shake, hitstop, flicker, and long trails; a reduced-motion run that still shakes fails. Combat audio honors mute. Shift energy renders in magenta with no decorative green.

### Gate 4: Republish, visual check, and review surface

Republish the complete build by the idempotent, subfolder-scoped `publish.sh` copying only `game/`. Capture the warning phase, a mid-morph frame, the stun window, the 4:30 chaos shape, and a combat-polish frame as unapproved candidates. Update `vector-vortex/docs/game-ui-consumer-report.md` with what this spec's additions exposed, including a recommendation on promoting the wireframe theme to a framework theme. Assemble a review surface with, per surface, a stable ID, a statement, an evidence path, a closed question, and the Materialoids-regression question. Present two outcomes: accept the complete game, or call another pass. The pull request carries the completed checklists and the exact validation commands.

**Validation:**

- [ ] The served root carries the updated marker and `publish.sh` left the umbrella root and every sibling untouched and copied only `game/`; a second run is idempotent.
- [ ] The captures, including the 4:30 chaos shape, are recorded as unapproved.
- [ ] The consumer report is updated with the theme-promotion recommendation.
- [ ] The review surface has one entry per surface, includes the Materialoids question, and names both outcomes without presuming acceptance.

## Constraints

- **Never recompute a lane from geometry.** A morph transforms projected rim points only.
- **The stun gates damage and clearing and pauses spawns; it is not cosmetic and releases no burst.**
- **Never let a visual effect touch the simulation.** Hitstop and all polish are renderer-only; the replay digest is identical with reduced motion on or off. This is the determinism guarantee.
- **Never ship an image or audio file.** VFX are procedural Canvas; combat audio is synthesized. The pack's sheets and WAVs are not used.
- **All three enemy types are one-hit; Splitter children do not split.** Differentiate by speed, size, score, never hit count.
- **Never add the Drifter or a shape rule beyond chaos-at-4:30 and no-immediate-repeats.**
- **Never copy pack source, use the stock arcade theme, or use decorative green.** Shift energy is the theme's magenta.
- **`publish.sh` copies only `game/` and wipes only `vector-vortex/`.** Commit per gate, open one pull request, never merge.

## What the Implementer May Choose

Module and file decomposition; helper naming; rim interpolation and ghost-preview rendering; the chaos generator internals within its constraints; the procedural VFX rendering; the Web Audio synthesis; and the timing-value tuning from the pack's starting points. Frozen: the 24-lane invariant and morph-is-rendering-only rule; the shock-mark schedule and no-immediate-repeats; the chaos shape at 4:30; the stun freezing, damage-gating, and spawn-pausing; the one-hit Crawler, Sprinter, Splitter roster with non-splitting adjacent-lane children that inherit stun; the phase-unaware-fails, phase-aware-survives difficulty intent; renderer-only polish and the reduced-motion determinism guarantee; the magenta shift energy; and the zero-asset, no-green posture.

## Execution Order

1. Gate 1: shape library and shift scheduler.
2. Gate 2: stun, shockwave, enemy roster, director re-tune.
3. Gate 3: renderer-only vector-FX polish and combat audio.
4. Gate 4: republish, visual check, review surface.

**Stop condition:** the maintainer reviews the complete game and accepts it or calls another pass. On acceptance, Vector Vortex is a shippable rung-one game and the next ladder rung is chosen from what the review exposed.

## Notes

The one-pager left five open design questions. Spec 01 settled lives, the win state, and hold-to-fire. This spec settles the last two: the stun freezes and damage-gates rim-contact enemies, and the chaos shape is pinned to the 4:30 shift.

The difficulty intent is a discriminating check between two named deterministic policies rather than a number, because the stun is global and any firing player benefits from it; the real skill is phase-aware repositioning and prioritization, which is what the two policies isolate. Tune against the check; confirm fun by human playtest.

The vector-FX layer is game-owned. After a second ladder game uses the same vocabulary, extracting a shared vector-FX module becomes worth considering; extracting it now would be premature.
