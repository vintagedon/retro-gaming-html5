<!--
---
title: "Vector Vortex Spec 03: Tempest Identity Slice"
description: "Rebuild Vector Vortex as a recognizable Tempest clone: converging perspective web, per-entity colour, arcade HUD, tap-and-repeat movement, an enemy that shoots back, line-fragment destruction, a dedicated title screen, and game audio. One web shape, one wave. Supersedes the timed-survival design and replaces the superseded Spec 03."
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-20"
version: "1.0"
status: "draft"
tags:
  - type: specification
  - domain: [game-design, implementation]
  - tech: [javascript, html5, canvas-2d, playwright]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Superseded Spec 03: Topology Shift and Polish](spec-02-vector-vortex-topology-shift-and-polish.md)"
  - "[Spec 01 v3.0, superseded contract](spec-01-vector-vortex-core-playable.md)"
  - "[Spec 02: Wireframe Shell and MVP](spec-02-vector-vortex-wireframe-shell-and-mvp.md)"
  - "[Spec Defect Register](../../vector-vortex/docs/spec-defects.md)"
  - "[Specifications Index](README.md)"
---
-->

# Vector Vortex Spec 03: Tempest Identity Slice

**Series: Vector Vortex. Replaces the superseded `spec-02-vector-vortex-topology-shift-and-polish.md` (the earlier-numbered durable record of the central `2026-08-16-retrohtml5-spec-03-vector-vortex-topology-shift-and-polish.md`), which is retired in place. Dispatched after Spec 02 landed on the default branch (pull request #5).**

This is the tracked in-repository copy of the central spec `2026-09-20-retrohtml5-spec-03-vector-vortex-tempest-identity-slice.md`; the central copy remains authoritative while the run is in the queue. Gate completion records (checked validation boxes) ride the commit of the gate they describe.

Vector Vortex is a Tempest clone. No specification in this series ever said so. Specs 01 and 02 describe lanes, ticks, collision, scoring, shell states and storage in exact detail and never describe what the player should see, so the executor built precisely what was written and the result does not look like the game. This spec fixes the brief rather than the code.

It delivers one thing: a published slice the operator plays and either recognizes as Tempest or rejects. One web shape, one wave, one enemy. No shape cycle, no roster, no topology morph, no level progression. Those are sized against this slice once it exists.

## What this supersedes

The following frozen clauses of Spec 01 v3.0 are replaced. Record this supersession once in the tracked in-repo spec and the defect register; do not accumulate it as amendments.

| Superseded | Replacement |
|---|---|
| 300-second run, 18,000-tick boundary, final-tick outcome | Wave-based play. A wave ends when its spawn budget is exhausted and no enemies remain |
| Survival bonus (5,000) and accuracy bonus | Kill score only in this slice. Bonus structure is out of scope |
| Four elapsed-time director bands | Fixed spawn budget and interval for the single wave |
| Three lives per run | Three lives per game, carried across waves |
| One lane step per simulation tick while held | Tap-and-repeat movement, below |
| Frozen monochrome palette (Spec 02) | Per-entity colour, below |
| Head-on concentric rendering | Converging perspective projection, below |

Retained unchanged, and not to be reopened: 24 lanes with index 0..23 increasing clockwise, normalized depth with 0 at the player rim and 1 at the far end, the 60-tick fixed step with its accumulator and catch-up cap, the seeded RNG and serializable state, swept-interval collision with ascending stable-ID resolution, and the 30-tick damage grace.

The pause, blur, visibility, restart and focus lifecycle is a different case and must not be treated as inherited. The contract established by 01b and 01c is correct, and the Spec 02 shell at `ccd94c5` reintroduced three defects above it that were never repaired: the clock runs behind the title and title-origin settings after a focus or visibility transition, a held pause key resumes on its own repeat, and keyboard focus escapes behind dialogs including through inactive settings tabs. This specification replaces that shell, so the replacement demonstrates those behaviors rather than assuming them. See gate 3.

24 lanes is authoritative. The reference material shows 16 sectors because the original used 16. Do not change the lane count.

## Startup and Lifecycle

Invoke `spec-startup`. Operator-selected central-queue run targeting the repository. Verify the accepted Spec 02 MVP is on the default branch; if it is not, stop.

Four gates, one commit each, message format `feat(vector-vortex): <summary> (gate N)`. The public spec copy in `docs/specs/`, its index row, and the completion records ride the commit of the gate they describe. `spec-closeout` writes the worklog and registry row, archives the central spec, pushes the branch, and opens one pull request. The executor never merges.

Replace assertions for superseded behavior in the same gate that changes that behavior: presentation and palette in gate 1, timed-run and director rules in gate 2, and shell and zero-asset expectations in gate 3. Gate 2 establishes the wave outcome that gate 3 presents. Run the full unit and browser suites on the finished tree before the gate 4 publish.

## Reference material

`reference-files/tempest-vector-vortex/` in the target repository holds the visual reference: a generated level-geometry infographic, a gameplay screenshot of the original, and a cabinet advertisement. Read them.

That directory is gitignored and stays that way. It is Atari material studied as shapes, available in the authoring environment and absent from any clone. Copy nothing from it, publish nothing from it, and do not link to it from a tracked file. This is the same posture the repository already applies to licensed reference packs.

The infographic is a visual reference only. Its level numbers, score strings, sector counts and enemy names are not design decisions; this specification carries the authoritative values. Where it labels a geometry open or closed it is describing the outline, which is not the same property this specification uses; the wrap rule below governs.

## Frozen Presentation Contract

### Perspective

The playfield is a tube seen from one end, not a ring seen head-on. Project the rim twice: a near rim at the viewer and a far rim, smaller and offset toward a vanishing point, with a lane rail drawn between corresponding lane vertices. The lane rails converging toward that point are what make it read as depth, and they are the single largest difference between the current build and the target.

The vanishing point sits above centre rather than at centre, so the tube reads as something the player looks down into.

An entity at normalized depth `d` renders by interpolating between its near-rim and far-rim lane position. Every entity carries a minimum rendered size and every stroke a minimum width, so enemies and shots at the far end stay trackable rather than vanishing into the vanishing point. Both floors are tuned by eye.

The playfield fills the viewport. The instructional paragraph, the wide horizontal bar and the surrounding panel from the Spec 02 build are removed.

### Colour

Per-entity colour, not one accent. The web is one hue, the player claw another, the basic enemy a third, player shots a fourth, enemy shots a fifth. Each must be distinguishable from every other at far depth and against the background, which stays black inside the playfield. The reference screenshot shows the original's assignment and is a sound starting point.

Any background texture is confined to the area outside the web. The playfield interior stays black; contrast there is doing the work that makes the game readable.

### Shape

One shape for this slice: Circle, which wraps.

The shape definition carries a `wraps` flag rather than a geometric closure flag, because the property that matters is movement: on a wrapping shape lane 23 connects to lane 0 and the player passes between them freely; on a non-wrapping shape there is a leftmost and a rightmost lane and movement stops at the ends. Of the locked library, Circle and Star wrap; Line, True V and Stepped V do not. Build the flag now even though this slice ships only a wrapping shape, and route both player movement and any future lane-changing enemy through it.

Do not write a validation requiring every shape to close from lane 23 to lane 0 or to enclose area. Three of the five locked shapes fail both, and the superseded specification's polygon rules are void.

### Movement

One lane step per keypress. Holding a direction pauses for approximately twelve ticks, then steps once every five or six ticks. The current rule produces sixty lane steps a second on a twenty-four lane tube, which is two and a half rotations a second and is the reason the game cannot be aimed.

Auto-repeat keydown events do not restart a held action; the existing repeat guard applies. Exact delay and interval are balance-table rows tuned by feel, and the executor should adjust them until aiming works rather than treating the starting numbers as fixed.

### Combat feel

The player claw is a wide open chevron straddling its lane, opening toward the far end. The basic enemy is an angular closed form, clearly not a chevron, distinguishable from the claw in silhouette alone at far depth.

Player shots are a short bright dash aligned along the lane axis, scaled with depth and floored at a minimum length so they remain visible at range.

The enemy fires back in this slice, under this contract. An enemy fires along its own lane toward the rim. Its shot damages the player only while the player occupies that lane, resolved by the existing swept-interval rule so a shot cannot pass through the player between ticks. Enemy shots expire at the rim and are removed after collision resolution for that tick, matching the existing shot-expiry ordering. A shot whose firing enemy is destroyed remains in flight.

Damage from an enemy shot costs one life and starts the existing 30-tick damage grace, and does nothing during grace. Where a rim breach and an enemy shot resolve on the same tick, the breach resolves first and the shot then finds the player already in grace, so one tick costs at most one life.

These rows join the balance table and are tuned by feel:

| Constant | Starting value |
|---|---:|
| Move repeat delay | 12 ticks |
| Move repeat interval | 5 ticks |
| Enemy fire interval | 150 ticks per enemy |
| Enemy fire earliest tick | 120 ticks into the wave |
| Enemy shot speed | 0.010 depth per tick |
| Maximum active enemy shots | 4 |

Destruction is line fragments: the dying entity's own edges detach, each segment rotating on its own axis and drifting outward along its lane's depth vector, fading over roughly twenty ticks. The shapes are already vector paths, so this is per-segment transforms rather than a particle system. Fragments are renderer-only and never affect the simulation.

A hit produces immediate visible feedback on the frame it resolves.

### Presentation states

Five states, each owning the viewport. The Spec 02 pattern of dimming the whole gameplay page behind a generic dialog is replaced.

- **Title.** A dedicated composition. Game title in the pixel font, a decorative vector web, a clean vertical menu. Gameplay HUD and instructional text are hidden and their controls disabled; they need not be absent from the DOM. The simulation does not run behind it.
- **Playing.** The web fills the screen with compact score, lives and wave.
- **Paused.** A small overlay over the frozen game. Resume, Restart, Settings, Return to Title.
- **Wave complete.** Reached when the wave clears. Gameplay is frozen, any enemy shots still in flight are discarded, and the screen shows the wave number and score with Play Again and Return to Title. This is the slice's terminal success state; the fly-through transition and the next wave belong to the following specification.
- **Game over.** A composed results screen: score, wave reached, best score, and an obvious Play Again.

Any title-screen animation is decorative and independent of the run. Start begins fresh gameplay.

### HUD

Score large and plain at top left in the pixel font, best score smaller beside it, lives as small claw icons, wave number visible. This is an arcade HUD, not a dashboard.

## Assets

The zero-asset rule is relaxed for games and unchanged for the framework. `html5-game-ui-framework` stays zero-raster because its discipline is the product; a game is an end product and carries what it needs. Record that distinction in the repository `AGENTS.md`.

This slice ships: the Owlish Pixel font for HUD and menu type, a small set of effects for fire, hit and destruction, and one music loop. Source them from `libraries/game-asset-packs/asset-packs`. Keep the set small and coherent; auditioning and selection are the executor's, and the operator's ear is the acceptance test.

Every shipped asset carries its licence and attribution in a tracked `vector-vortex/game/assets/ATTRIBUTION.md`, recording the pack, the author, the licence, and the source URL. Owlish Pixel is CC BY 4.0.

Before shipping any asset, confirm its pack permits redistribution of the file itself in a public repository, not merely use in a compiled game. If a pack's terms do not clearly permit that, do not ship it and report the conflict. Audio volume routes through the existing settings bus.

## Deliverables and Validation

The acceptance test for this specification is the operator playing the published slice. The validations below exist to keep the build honest, not to substitute for that judgment. Do not add test machinery beyond them.

#### Gate 1: Test isolation, perspective, colour, and the playfield

First, make the suites safe to run. `vector-vortex/tests/core/publish.test.js` and `vector-vortex/tests/browser/preview.spec.js` both invoke the real publisher, so any ordinary test run replaces the live preview and depends on this host's directory layout. Both must publish into an isolated temporary destination and must not require the production directory to exist. This lands before any other validation in this specification runs.

Then replace the head-on renderer with the converging projection. Apply per-entity colour. Build the shape definition with its `wraps` flag. Remove the instructional paragraph, the horizontal bar and the surrounding panel, and let the playfield fill the viewport.

- [x] Neither suite writes to `/opt/agents/www/` or any path outside the repository tree, and both pass in a checkout where the production preview directory does not exist. Proven by `tests/core/publish.test.js` and `tests/browser/preview.spec.js` running entirely under the `VV_PUBLISH_ROOT` override inside `vector-vortex/test-results/`, with the production path present only as the script's default.
- [x] A rendered frame shows a near rim, a smaller offset far rim, and twenty-four lane rails between them. Asserted per-pixel by `tests/browser/presentation.spec.js`; capture attached to the run record: `vector-vortex/docs/evidence/capture-running-1280x720.png`.
- [x] An entity at depth 1 renders at the far rim and an entity at depth 0.1 near the player rim, matching the authoritative direction. `tests/core/render-depth.test.js`, with the inverted-mapping mutation shown to fail.
- [x] At the smallest supported viewport, an entity at depth 1 renders at or above the minimum size floor and every stroke at or above the minimum width. Floors pinned by `tests/core/render-depth.test.js` at 1024x576.
- [x] Web, player, basic enemy, player shot and enemy shot each render in a distinct colour, asserted from computed values rather than declarations. `tests/browser/theme.spec.js` renders all five kinds through the real renderer and counts palette-matched pixels on the frame.
- [x] At all four supported viewports the playfield and HUD have nonzero bounds entirely inside the viewport with no horizontal scroll. `tests/browser/viewport.spec.js`.

#### Gate 2: Controls, combat, and the single-wave core

Tap-and-repeat movement. Shot and enemy-shot visuals. Enemy fires back. Line-fragment destruction. Immediate hit feedback. Replace the timed survival director with a single wave's fixed spawn budget and interval; record the chosen budget and interval alongside the tunable balance values.

The wave clears when its spawn budget is exhausted and no enemies remain. A breach removes the enemy, so the clear condition counts resolved enemies rather than kills; a survivable breach must not strand the player. Resolve player damage and death before granting a clear. On clear, discard enemy shots still in flight and freeze gameplay with a wave-complete outcome. Gate 3 binds that outcome to the screen defined above.

- [x] A single keypress moves exactly one lane. Holding produces the first repeat only after the configured delay, then at the configured interval, verified through the real frame loop. `tests/browser/keyboard.spec.js` (real-loop tap and repeat timing) and `tests/core/core.test.js` (exact delay and interval ticks).
- [x] A synthetic auto-repeat keydown during a held key does not produce an extra step, and does not restart a held action across a pause. `tests/browser/keyboard.spec.js`.
- [x] The enemy fires along its own lane, its shot travels toward the rim, and it costs a life only while the player occupies that lane. A shot passing the player's lane between ticks still hits. `tests/core/enemy-shots.test.js`.
- [x] Starting outside damage grace, a breach and an enemy shot resolving on the same tick cost exactly one life; while protected by grace they cost none. `tests/core/enemy-shots.test.js`.
- [x] Destroying an enemy emits fragments that fade and leave no residual simulation state; a run with destructions produces the same gameplay state at equal completed ticks as one with fragments disabled. `tests/browser/combat.spec.js`.
- [x] Player and enemy shots are visible at depth 1 and at depth 0.1 at the smallest supported viewport, and the claw and the basic enemy are distinguishable from each other in silhouette at depth 1. `tests/browser/combat.spec.js` renders all five kinds at 1024x576 and measures their bounding shapes.
- [x] A wave with a fixed budget clears when the budget is exhausted and no enemies remain, including after a survivable breach. `tests/core/core.test.js` and `tests/core/director.test.js`.
- [x] Player death on the final enemy resolves as death rather than a clear. `tests/core/core.test.js`.
- [x] Clearing the wave discards enemy shots still in flight and freezes gameplay with a wave-complete outcome. `tests/core/core.test.js`.

#### Gate 3: Presentation states, HUD, and audio

Five full-screen states. Arcade HUD in the pixel font. Font, effects and one music loop with attribution.

The replacement shell demonstrates the lifecycle contract rather than inheriting it. Update the existing shell tests to exercise the replacement screens and preserve the repaired behavior. The wave-complete outcome already exists from gate 2.

- [ ] The title state hides and disables the gameplay HUD and instructional text, and the simulation advances zero ticks while it is shown.
- [ ] Returning focus, or restoring a hidden document, while on the title or on settings reached from the title advances zero ticks and never starts gameplay behind the menu.
- [ ] Holding the pause key past the operating system repeat delay produces exactly one pause and does not resume.
- [ ] Keyboard focus stays inside the active dialog, including Shift+Tab from the first control and traversal across settings tabs; controls in inactive tabs are not reachable.
- [ ] Start from title begins a fresh run at tick zero and wave one.
- [ ] Paused, wave complete, game over and title are each reachable and leavable by keyboard alone, with focus contained and restored.
- [ ] Score, best, lives and wave render in the shipped font and are legible at the smallest supported viewport. A capture of each state is attached.
- [ ] Audio plays after the first deliberate gesture, mute silences it, volume scales it, and replacing audio with a no-op leaves gameplay state identical at equal completed ticks.
- [ ] `ATTRIBUTION.md` lists every shipped asset with pack, author, licence and source, and every listed licence permits redistribution in a public repository.

#### Gate 4: Final validation, publish, and the record

Verify the integrated single-wave slice, including Start, wave completion, game over, Play Again, and Return to Title. Publish. Write `threatmodel.md`. Update the records.

`threatmodel.md` at the repository root records the deployed surface: nginx internal preview now, Azure Static Web Apps later. A static site with no backend and no server-side rendering; localStorage as the only persistence and a user-modifiable input surface that the game must tolerate as hostile, which the existing defensive storage validation already covers; third-party asset provenance and licensing; the publish path and its destination scoping; and toolchain supply chain. Keep it short and specific to what is actually deployed. If Codex Security Review is configured for this repository, set its threat-model path to this file; the filename alone does not register it.

Update `vector-vortex/README.md`, `vector-vortex/AGENTS.md`, the one-pager, and the repository `README.md` to the delivered state, including the superseded contract and the games-carry-assets distinction.

- [ ] The complete unit suite (`npm test`) and browser suite (`npm run test:e2e`) pass from `vector-vortex/` on the finished tree using the isolated publishing destinations established in gate 1.
- [ ] The slice is published and reachable at `https://retrogaming.donfather.site/vector-vortex/`, and the served files match the committed source.
- [ ] `threatmodel.md` exists and describes the deployed surface.
- [ ] Every internal link in every Markdown file this branch touches resolves from a fresh clone, and no tracked file links into `reference-files/`.
- [ ] The superseded Spec 03 is marked `deprecated` with a pointer to this specification and remains tracked.

## Constraints

- One shape, one wave, one enemy. No shape cycle, no roster, no topology morph, no level progression, no high-score table.
- No new validation standard, test framework, or proof apparatus. Reuse the existing harness and replace obsolete tests rather than layering new ones beside them.
- Renderer changes never alter authoritative simulation results.
- Copy nothing from `reference-files/`. Ship no asset whose licence does not permit redistribution in a public repository.
- Do not open a second pull request, do not force-push, do not merge.
- Do not check a box for a behavior that was not observed happening.

## Execution Order

1. Test isolation, perspective, colour, and the playfield.
2. Controls, combat, and the single-wave core.
3. Presentation states, HUD, and audio.
4. Final validation, publish, and the record.

## Notes

The superseded Spec 03 carried an eight-shape topology library, a thirty-second shock and stun schedule, a Chaos climax, a two-enemy roster expansion, and a fixed-seed policy simulation intended to prove that reading the warning cycle improves final-minute survival. None of that survives here. The timed morph mechanic is superseded rather than deferred, because changing webs between waves supplies the same variety, and the policy simulation is the kind of proof apparatus that has cost this series three amendments while proving something nobody asked about.

What the game needs is not more rules. It needs to look like Tempest, and nobody could tell whether it did until it was published and played. That is the checkpoint this specification exists to create.
