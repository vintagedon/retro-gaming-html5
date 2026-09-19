<!--
---
title: "Vector Vortex Deliverable 3 Implementation Plan"
description: "TDD task plan for playable Canvas slice, semantic DOM surface, input adapter, and Playwright suite"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-08"
version: "1.0"
status: "Active"
tags:
  - type: plan
  - domain: implementation
  - tech: [javascript, html5, canvas-2d, playwright]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Vector Vortex Spec 01](../../../../docs/specs/spec-01-vector-vortex-core-playable.md)"
  - "[Deliverable 1 Plan](2026-09-08-vector-vortex-deliverable-1.md)"
  - "[Deliverable 2 Plan](2026-09-08-vector-vortex-deliverable-2.md)"
  - "[Repository AGENTS](../../../../AGENTS.md)"
---
-->

# Vector Vortex Deliverable 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:test-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a playable Canvas slice in Chromium that renders one stable 24-lane tube, projects semantic DOM status from the D1/D2 core, drives the core with focus-aware keyboard input, exposes a deterministic test seam, and proves every D3 validation box with a Playwright test whose named mutation must make it fail.

**Architecture:** Renderer, input adapter, DOM surface, and frame runner live under `vector-vortex/game/runtime/` as plain ES modules loaded from `vector-vortex/game/index.html`. The runtime consumes `game/core/core.js` only through `createCore`. A `window.__vv` seam gives Playwright deterministic tick advancement and core rebinding. Playwright config launches a Node static server via `webServer`; a tracked `devDependencies` entry pulls `@playwright/test` and the test list lives in `tests/browser/`.

**Tech Stack:** Node 22.23.2, ES modules, vanilla JS for runtime, `@playwright/test` for browser tests, no bundler, no runtime build step.

## Global Constraints

- Renderer never mutates core state. Core is the only writer of lane/cooldown/lives/score/enemies/shots.
- DOM status values are projections of the core snapshot. The DOM layer never recomputes score, accuracy, time, lives, or outcome.
- Canvas state balance: every `ctx.save()` per frame has a matching `ctx.restore()`. The renderer uses a fixed transform stack per frame.
- Input handler is attached to `window` only for keys; `preventDefault` is called only while the game surface (canvas root or pause/restart) has focus AND the key is a handled game key. Space is never prevented at the window level — only inside the input adapter scope, and only when the canvas root is focused. When focus is on the pause or restart button, Space activates that button (default behavior).
- Pause semantics: mechanics-slice pause only. Pause button or Esc/P. Pause suspends simulation AND clears held input. Window blur and `visibilitychange` to hidden also pause + clear.
- The exact-tick test seam: `window.__vv.advanceTicks(n)` calls `core.advance(n)` deterministically and then publishes a snapshot to the DOM. `window.__vv.reset(seed)` rebinds the core AND replaces the frame runner's core reference AND replaces the DOM project's source. Removing the rebind must fail a test.
- Supported CSS viewports: 1024x576, 1280x720, 1440x900, 1920x1080. Below 960x540, retain readable controls and show a non-blocking "larger play area recommended" message. No horizontal scroll.
- Accessibility: the canvas has an `aria-label`. Objective and current critical status sit adjacent to the canvas. Pause and restart are real `<button>` elements with visible focus styles.
- Off-origin policy: zero network requests at runtime. The served tree is local files only. No image, no audio.
- Playwright config resolves its own navigation targets: `webServer` launches `npx http-server game -p 0 --silent` and `baseURL` is `http://127.0.0.1:${port}`. The port is captured via `use.baseURL` derivation in a small wrapper or via a fixed port fallback `http://127.0.0.1:8123` referenced from `baseURL` with `webServer.port: 8123, reuseExistingServer: !CI`. Either way: removing the `baseURL` key must make the suite fail, not skip.

---

## Task 1: Static file wiring — page, CSS, ESM entry

**Files:**
- Modify: `vector-vortex/game/index.html` (replace placeholder with the playable page)
- Create: `vector-vortex/game/styles.css` (game-owned chrome: layout, status grid, button focus)
- Create: `vector-vortex/game/runtime/main.js` (entry that wires core + renderer + input + frame runner)
- Modify: `vector-vortex/package.json` (add `@playwright/test` devDependency, `test:e2e` script, `serve` script)
- Modify: `vector-vortex/.gitignore` (already covers node_modules and test-results)

**Interfaces:**
- `index.html` defines a `#vv-root` with: a canvas `#vv-canvas` (with `role="img"` and `aria-label`), a status region `#vv-status` with `data-testid` attributes for each field, a `#vv-controls` section with objective text, controls text, a pause `<button id="vv-pause">` and a restart `<button id="vv-restart">`. The page loads `styles.css` then `runtime/main.js` as `<script type="module">`.
- `styles.css` uses CSS grid for the status region; the four supported viewports are expressed as a default layout (no media query required for the four sizes since the layout scales with `clamp()` and grid `auto-fit`).
- `runtime/main.js` creates a core, builds the renderer, builds the input adapter, builds the frame runner, registers the test seam on `window.__vv`, and starts the `requestAnimationFrame` loop.

**Steps:**
- [ ] **Step 1: Rewrite `game/index.html` to host the canvas + semantic DOM.** Include `aria-label`, `data-testid` attributes, status grid, controls.
- [ ] **Step 2: Author `game/styles.css`.** Status grid, button focus, viewport scaling, "larger play area" message.
- [ ] **Step 3: Author `game/runtime/main.js`** as the orchestrator entry point (empty stubs at first; details come in Task 4).
- [ ] **Step 4: Add `@playwright/test` to devDependencies in `package.json` and add scripts: `test:e2e` (`playwright test`), `serve` (`http-server game -p 8080 --silent`).**
- [ ] **Step 5: Run `npm install`** from `vector-vortex/` and confirm lockfile updates. Verify `npx playwright --version` works.
- [ ] **Step 6: Commit: `feat(vector-vortex): add page, CSS, runtime entry, and playwright devDeps (gate 3 prep)`.**

---

## Task 2: Renderer with save/restore balance + DPR

**Files:**
- Create: `vector-vortex/game/runtime/renderer.js`

**Interfaces:**
- `createRenderer({ canvas }) -> { render(snapshot), resize() }`.
- `render(snapshot)` projects one frame from a core snapshot. Does NOT mutate state. Uses a fixed transform stack: one `save()` to set DPR scale and rotation, one nested `save()` per "lane" group, with explicit `restore()` per layer. The "save/restore balance" test asserts the composed transform is identical on frame 1 and frame 30 at DPR 2.
- `resize()` updates canvas backing-store size to `cssWidth * dpr` x `cssHeight * dpr`, then sets `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`.
- Tube geometry: two concentric circles for the rim and the far end, plus 24 lane rails as straight lines from the inner rim to the far ring.
- Player marker: a small triangle on the rim at the current lane.
- Shots: small inward-pointing arrows at `(lane, depth)`.
- Enemies: small outward-pointing chevrons at `(lane, depth)`.
- No chrome on canvas — no HUD text drawn on the canvas itself.

**Steps:**
- [ ] **Step 1: Write `renderer.js` with explicit `save`/`restore` pairs.** Use a single outer `save()`/`restore()` for DPR+rotation. Inside, draw the two rings with `beginPath`/`stroke` (no inner save). For each lane rail (24 lanes), wrap the rail draw in a matched `save()`/`restore()`. Track an internal counter so the assertion in Task 6 can verify save==restore per frame.
- [ ] **Step 2: Export the renderer module.** No state mutation beyond canvas drawing.
- [ ] **Step 3: Commit: `feat(vector-vortex): add Canvas renderer with balanced save/restore (gate 3)`.** This commit is part of the gate 3 work but does not include the final closing commit.

---

## Task 3: Input adapter (focus-aware, space-safe)

**Files:**
- Create: `vector-vortex/game/runtime/input.js`

**Interfaces:**
- `createInputAdapter({ gameSurface, pauseButton, restartButton, dispatch }) -> { destroy(), clearHeldInput() }`.
- Listens on `window` for `keydown`/`keyup`. Maps: ArrowLeft/A → left-down/up, ArrowRight/D → right-down/up, Space → fire-down/up, Escape/P → pause toggle.
- `preventDefault` is called only when:
  - the focused element is the game surface (`gameSurface.contains(document.activeElement) && document.activeElement !== pauseButton && document.activeElement !== restartButton`), AND
  - the key is a handled game key (movement, fire, pause).
  - Space is NEVER prevented at the window level. When the canvas root is focused, Space is consumed by the fire action (and the keyup clears fire). When a `<button>` has focus, Space's default button activation is left alone.
- Blur and `visibilitychange` to hidden: clear held input and dispatch `blur`/`visibility` action to core.
- Pause and restart buttons fire their core actions on click.

**Steps:**
- [ ] **Step 1: Implement `input.js` with the focus guard.**
- [ ] **Step 2: Commit: `feat(vector-vortex): add focus-aware input adapter (gate 3)`.**

---

## Task 4: Frame runner + exact-tick test seam

**Files:**
- Create: `vector-vortex/game/runtime/frame-runner.js`

**Interfaces:**
- `createFrameRunner({ core, renderer, dom, onSnapshot }) -> { start(), stop(), replaceCore(newCore), advanceTicks(n), reset(seed) }`.
- The frame loop uses `requestAnimationFrame` to compute `dt = (now - last) / 1000`, push `dt` into the clock, and run `clock.run(core)`. The clock pauses on `state.paused` and on hidden tab. `replaceCore(newCore)` swaps the runner's core reference AND swaps the clock's core reference. `reset(seed)` calls `replaceCore(createCore({ seed }))`.
- `advanceTicks(n)` calls `core.advance(n)` synchronously and publishes the snapshot.
- The seam is exposed on `window.__vv = { advanceTicks(n), reset(seed), getSnapshot(), getKeyCounters() }`. `getKeyCounters()` returns an object with `saveCount` and `restoreCount` for the most recent frame so tests can assert balance.

**Steps:**
- [ ] **Step 1: Implement `frame-runner.js`.** The runner holds one core reference. `replaceCore(newCore)` is called by `reset()` to rebind.
- [ ] **Step 2: Commit: `feat(vector-vortex): add frame runner with deterministic test seam (gate 3)`.**

---

## Task 5: DOM projector (status projections)

**Files:**
- Create: `vector-vortex/game/runtime/dom.js`

**Interfaces:**
- `createDom({ root }) -> { project(snapshot), setVisibleMessage(text), reset() }`.
- `project(snapshot)` writes: score, lives, time (mm:ss from `elapsedTicks/60`), kills (count of `breaches` + score-100-derived kill count is NOT computed here — we project `snapshot.breaches.length` and a `kills` count we will add to the snapshot if not present; if absent, project `0`), accuracy (`ACC --` or `NN%`), current status (`running`/`paused`/`survived`/`lost`), objective text, controls text. The DOM layer does not recompute scoring, timing, collision, or outcome — every value is read directly from the snapshot.
- Note: we add `kills` to the core snapshot in Task 6 so the DOM can project it without recomputing. The mutation for the "no duplicate calculation" test removes a `kills`-on-snapshot path and asserts the DOM value matches the snapshot count.

**Steps:**
- [ ] **Step 1: Implement `dom.js`.** Pure projection. No scoring logic.
- [ ] **Step 2: Commit: `feat(vector-vortex): add semantic DOM projector (gate 3)`.**

---

## Task 6: Wire it all in main.js + add `kills` to snapshot

**Files:**
- Modify: `vector-vortex/game/core/core.js` (add `kills` counter to snapshot)
- Modify: `vector-vortex/game/runtime/main.js` (instantiate everything)

**Interfaces:**
- `core.snapshot()` includes `kills` (cumulative enemy-destroyed count).
- `main.js` creates core, renderer, input adapter, frame runner, DOM projector. Exposes `window.__vv`. Starts the rAF loop.

**Steps:**
- [ ] **Step 1: Extend core to track `kills`.** Add to `initialState`, increment in the collision step, include in `snapshot()`.
- [ ] **Step 2: Extend `core.test.js` with a test asserting `snapshot.kills` increments after a collision.**
- [ ] **Step 3: Wire `main.js`.**
- [ ] **Step 4: Commit: `feat(vector-vortex): wire runtime, snapshot kills, expose test seam (gate 3)`.**

---

## Task 7: Playwright config (self-bootstrapping server)

**Files:**
- Modify: `vector-vortex/playwright.config.js`

**Interfaces:**
- `webServer.command = 'npx --no-install http-server game -p 8123 --silent'` (or fallback that uses the local `http-server` if installed). `webServer.port = 8123`, `webServer.reuseExistingServer = !process.env.CI`, `webServer.timeout = 30000`.
- `use.baseURL = 'http://127.0.0.1:8123'`.
- `testDir = './tests/browser'`. Project: chromium headless only. `retries: 0`. `workers: 1` (avoids port collisions).
- A small helper `tests/browser/_setup.js` provides `PORT` and a `BASE` constant if needed.

**Steps:**
- [ ] **Step 1: Rewrite `playwright.config.js`.** Pick a fixed port so removing `baseURL` fails (we'll guard against accidental removal in the mutation test).
- [ ] **Step 2: Install `http-server` as a tracked devDependency.** Use `npm install --save-dev http-server`.
- [ ] **Step 3: Add `npx playwright install chromium` notes in `package.json` via a `postinstall` or a `setup` script.** Use `postinstall: "playwright install --with-deps chromium || true"` or a dedicated `test:e2e:install` script. Simplest: separate `test:e2e:install` script.
- [ ] **Step 4: Commit: `chore(vector-vortex): playwright config + http-server devDep (gate 3)`.**

---

## Task 8: Playwright tests (one per D3 validation box)

**Files:**
- Create: `vector-vortex/tests/browser/smoke.spec.js`
- Create: `vector-vortex/tests/browser/keyboard.spec.js`
- Create: `vector-vortex/tests/browser/seam.spec.js`
- Create: `vector-vortex/tests/browser/focus.spec.js`
- Create: `vector-vortex/tests/browser/blur.spec.js`
- Create: `vector-vortex/tests/browser/canvas-balance.spec.js`
- Create: `vector-vortex/tests/browser/viewport.spec.js`
- Create: `vector-vortex/tests/browser/a11y.spec.js`
- Create: `vector-vortex/tests/browser/config.spec.js`

Each test names its mutation in a comment block at the top of the test. Mutations live in `vector-vortex/tests/browser/_mutations/` and are applied temporarily by mutating `window.__vv` flags (the runtime exposes `__vv.disableKeydown` for the keyboard mutation, `__vv.preventSpaceAtWindow` for the space mutation, etc.). The mutation harness wraps a code path so the test can flip the flag, reload, and assert the test fails.

**Validation mapping:**

| Spec validation box | Test file | Mutation name |
|---|---|---|
| Suite starts server, runs every test | `config.spec.js` | remove `baseURL` from config (assert config lacks `baseURL`) — separate test asserts the page fails to load when baseURL is missing |
| Keydown proves physical path | `keyboard.spec.js` | `__vv.disableKeydown = true` and assert lane does NOT change |
| Keyboard-only flow reaches both outcomes | `keyboard.spec.js` | n/a (uses seam + keys) |
| Space on focused button activates button | `focus.spec.js` | set `__vv.preventSpaceAtWindow = true` and assert Space no longer activates button |
| Test seam rebinds every consumer | `seam.spec.js` | `__vv.skipFrameRunnerRebind = true` and assert orphaned core advances |
| DOM values are projections, no duplicate calc | `seam.spec.js` | remove `snapshot.kills` and assert DOM kills equals 0 or mismatches |
| Blur and hidden-tab clear input + stop ticks | `blur.spec.js` | n/a |
| Canvas save/restore balanced | `canvas-balance.spec.js` | flip `__vv.skipOneRestore = true` |
| All four viewports + DPR probes | `viewport.spec.js` | n/a |
| A11y + no off-origin + no image/audio | `a11y.spec.js` + `smoke.spec.js` | assert page requests have all `url().startsWith('http://127.0.0.1')` |

**Steps:**
- [ ] **Step 1: Write `tests/browser/config.spec.js`** — verifies the served page loads, runs a smoke assertion, AND a sibling assertion that proves removing `baseURL` causes a failure (by directly asserting that `config.use.baseURL` is required and a probe test with `page.goto('about:blank')` followed by `page.goto(config.use.baseURL + '/index.html')` fails when baseURL is empty).
- [ ] **Step 2: Write `tests/browser/keyboard.spec.js`** — press ArrowRight and assert `data-lane` attribute changes while key is held.
- [ ] **Step 3: Write `tests/browser/seam.spec.js`** — `advanceTicks` to a forced lost outcome; `reset(seed)` and assert lane resets AND frame runner rebinds.
- [ ] **Step 4: Write `tests/browser/focus.spec.js`** — focus the pause button, press Space, assert pause activated (status = paused).
- [ ] **Step 5: Write `tests/browser/blur.spec.js`** — dispatch Event('blur') on window, then call seam, assert held input cleared and elapsedTicks unchanged.
- [ ] **Step 6: Write `tests/browser/canvas-balance.spec.js`** — set DPR 2 via `devicePixelRatio` emulation, render 30 frames, read `window.__vv.getKeyCounters()`, assert saveCount === restoreCount on frame 1 AND frame 30 AND composed transform (`ctx.getTransform()`) is identical on frame 1 and frame 30.
- [ ] **Step 7: Write `tests/browser/viewport.spec.js`** — set viewport to each of the four sizes and assert no horizontal scroll, status visible, canvas visible.
- [ ] **Step 8: Write `tests/browser/a11y.spec.js`** — assert canvas has `aria-label`, adjacent objective/status, focus-visible CSS exists, no `<img>` and no audio element, all requests are same-origin.
- [ ] **Step 9: Write `tests/browser/smoke.spec.js`** — `npm run test:e2e` smoke (page loads, status visible).
- [ ] **Step 10: Commit: `test(vector-vortex): add Playwright suite for all 10 D3 validation boxes (gate 3)`.**

---

## Task 9: Run full suite, fix until green

**Steps:**
- [ ] **Step 1: Run `npm test`** — confirm unit tests still pass after `kills` addition.
- [ ] **Step 2: Run `npx playwright install chromium`** — install Chromium headless binary.
- [ ] **Step 3: Run `npm run test:e2e`** — fix any failures iteratively.
- [ ] **Step 4: Run `npm test` again** — confirm green.

---

## Task 10: Final commit and docs

**Steps:**
- [ ] **Step 1: Update `vector-vortex/AGENTS.md`** to add renderer/input/frame-runner/dom/test-seam architecture notes and the Playwright commands.
- [ ] **Step 2: Update `vector-vortex/README.md`** to mark D3 complete and document `npm run test:e2e`, `npm run serve`, the seam API, and the supported viewports.
- [ ] **Step 3: Append any observed spec defects to `vector-vortex/docs/spec-defects.md`.**
- [ ] **Step 4: Single closing commit: `feat(vector-vortex): add playable Canvas slice and semantic controls (gate 3)`.**

---

## Notes on mutation harness

The runtime exposes a few `__vv` toggles that test code can flip before reloading the page:

- `__vv.disableKeydown`: when true, the input adapter no-ops on `keydown`/`keyup`. The keyboard test sets this in a copy of `game/runtime/input.js` via a tiny test-only patch script invoked by Playwright's `addInitScript`. Simpler: ship a `game/runtime/input.mutation.js` that the test loads via `addInitScript` before navigation and which monkey-patches `window.__vv` with a `disableKeydown` flag the input adapter honors via an early-return guard. The input adapter consults `window.__vv?.disableKeydown === true` at the top of its keydown handler. Same pattern for `preventSpaceAtWindow`, `skipFrameRunnerRebind`, `skipOneRestore`.

This is the cleanest way to keep mutations tracked and reproducible.
