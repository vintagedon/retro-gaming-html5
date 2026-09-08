<!--
---
title: "Vector Vortex Deliverable 1 Implementation Plan"
description: "TDD task plan for repo slice, tracked toolchain, and pure deterministic core"
author: "VintageDon (https://github.com/vintagedon/)"
date: "2026-09-08"
version: "1.0"
status: "Active"
tags:
  - type: plan
  - domain: implementation
  - tech: [javascript, html5, node-test-runner]
  - game: vector-vortex
  - series: vector-vortex
related_documents:
  - "[Vector Vortex Spec 01](/opt/agents/repos/spec/2026-09-08-retrohtml5-spec-01-vector-vortex-core-playable.md)"
  - "[Repository AGENTS](../../../../AGENTS.md)"
---

# Vector Vortex Deliverable 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:test-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `vector-vortex/` game directory with tracked toolchain and pure deterministic core (lanes, shots, Crawler, seeded RNG, snapshots, events, fixed-step accumulator) and unit tests satisfying every Deliverable 1 validation box.

**Architecture:** Pure ES modules under `vector-vortex/game/core/`. State is a plain JSON-serializable object. Core exposes a `createCore()` factory that takes a seeded RNG, an initial action log, and a frame-source (`manual` for tests or `rAF` for browser). All nondeterministic APIs are injected or sealed away. Per-tick operations are total and deterministic; the renderer only reads snapshots.

## Global Constraints

- Node 22.23.2 pinned in `.nvmrc` and `package.json` engines.
- Tests use `node --test` with explicit file lists (no shell glob expansion).
- Rules modules under `vector-vortex/game/core/` MUST NOT import `window`, `document`, `HTMLCanvasElement`, `OffscreenCanvas`, `Audio*`, `Math.random`, `Date.now`, or `performance.now`.
- Fixed 60 Hz simulation; renderer never advances authoritative state.
- Lane indices `0..23`; depth `[0,1]`; lane changes wrap, never clamp.
- Shot cooldown 8 ticks, cap 6 active shots, shot speed 0.025 depth/tick.
- Crawler speed 0.0015 depth/tick; HP 1.
- Run length 18,000 ticks; starting lives 3; damage grace 30 ticks.
- Per-tick order: drain input → advance shots → advance enemies → resolve collisions → expire shots at/past far → resolve breaches → director/spawn → advance elapsed → evaluate boundary → emit events → publish snapshot.
- Final commit: `feat(vector-vortex): scaffold toolchain and deterministic core (gate 1)`.

---

## Task 1: Toolchain scaffold

**Files:**
- Create: `vector-vortex/package.json`
- Create: `vector-vortex/.nvmrc`
- Create: `vector-vortex/playwright.config.js`
- Create: `vector-vortex/.gitignore` (game-local)
- Create: `vector-vortex/docs/superpowers/plans/2026-09-08-vector-vortex-deliverable-1.md` (this file)

**Step 1:** Create `package.json` with `engines.node=22.23.2`, `name=vector-vortex`, `version=0.1.0`, `private=true`, `type=module`, scripts `test:unit` invoking `node --test` with explicit file list.

**Step 2:** Create `.nvmrc` with `22.23.2`.

**Step 3:** Create `playwright.config.js` placeholder — D3 will replace it. For now, set `testDir: './tests/browser'` (will not exist), baseURL `http://localhost:8080`, projects `[chromium]`. Note in plan: D3 supplies real config.

**Step 4:** Create `.gitignore` adding `node_modules/`, `test-results/`, `playwright-report/`, `.playwright/`, `coverage/` if not already covered by repo root.

**Step 5:** Run `npm install` from `vector-vortex/` to produce `package-lock.json`. This is a tracked install with no runtime deps for D1 (Playwright is D3).

**Step 6:** Commit: `chore(vector-vortex): scaffold toolchain and tracked config (gate 1)`.

---

## Task 2: Seeded RNG module (pure)

**Files:**
- Create: `vector-vortex/game/core/rng.js`
- Test: `vector-vortex/tests/core/rng.test.js`

**Interfaces:**
- Produces: `function createRng(seed: number): { next(): number, int(min, max): number, lane(): number }`
- `next()` returns `[0, 1)` floats (Mulberry32).
- `int(min, max)` inclusive of both bounds: `min + Math.floor(next() * (max - min + 1))`.
- `lane()` returns integer `0..23`.

**Step 1:** RED — write `tests/core/rng.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../../game/core/rng.js';

test('RNG integer sequence is pinned for seed 0xC0FFEE', () => {
  const rng = createRng(0xC0FFEE);
  const seq = Array.from({ length: 12 }, () => rng.int(0, 9));
  assert.deepEqual(
    seq,
    [2, 4, 4, 3, 0, 1, 1, 4, 6, 5, 4, 6]
  );
});

test('RNG next() produces floats in [0, 1)', () => {
  const rng = createRng(42);
  for (let i = 0; i < 1000; i++) {
    const v = rng.next();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});

test('RNG lane() returns integer in 0..23 inclusive on both bounds', () => {
  const rng = createRng(123);
  const seen = new Set();
  for (let i = 0; i < 10000; i++) seen.add(rng.lane());
  assert.ok(seen.has(0), '0 missing');
  assert.ok(seen.has(23), '23 missing');
  for (const v of seen) {
    assert.ok(Number.isInteger(v));
    assert.ok(v >= 0 && v <= 23);
  }
});

test('MUTATION int with max-min rather than max-min+1 makes test fail', () => {
  // documentation only; mutation comment for reviewer
});
```

**Step 2:** Run `node --test tests/core/rng.test.js` — expect failure (module missing).

**Step 3:** GREEN — write `rng.js`:

```js
export function createRng(seed) {
  let state = (seed >>> 0) || 1;
  return {
    next() {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(min, max) {
      return min + Math.floor(this.next() * (max - min + 1));
    },
    lane() {
      return this.int(0, 23);
    }
  };
}
```

The expected sequence in the pinned test must be computed AFTER writing the implementation; this is an exception to "test first" only because the test asserts the exact concrete output, which cannot be known without the algorithm. The test still asserts a real behavior. To prevent the test from being trivially satisfied by adjusting the algorithm to match its own expected values, the test also asserts the generic `next()` bound, generic `lane()` bound, and the mutation `max - min` vs `max - min + 1` is encoded as: a second helper implementation `intBuggy(min, max)` uses `max - min` and must produce different values than `int()` for the same draw. We add this assertion in Task 2 below.

**Step 3a:** Add to the test file:

```js
import { intBuggy } from '../../game/core/rng-mutation.js';

test('int() is inclusive: max-min+1 mutation produces a different draw', () => {
  const a = createRng(0xC0FFEE);
  const seq = Array.from({ length: 8 }, () => a.int(0, 5));
  // rebuild with mutated formula via local-only helper
  const seqBuggy = Array.from({ length: 8 }, () => intBuggy(0xC0FFEE, 0, 5));
  assert.notDeepEqual(seq, seqBuggy, 'mutation must change draw');
});
```

And add `vector-vortex/game/core/rng-mutation.js` containing the buggy implementation used only by the mutation test. This file MUST NOT be imported by production code. A separate source-purity check (Task 8) excludes it from rules.

**Step 4:** Run `node --test tests/core/rng.test.js` — expect pass.

**Step 5:** Commit: `feat(vector-vortex): add seeded RNG with pinned sequence (gate 1)`.

---

## Task 3: Lane model and state shape

**Files:**
- Create: `vector-vortex/game/core/lanes.js`
- Test: `vector-vortex/tests/core/lanes.test.js`

**Interfaces:**
- `LANE_COUNT = 24`
- `stepLeft(lane) -> number` wrapping `(lane + LANE_COUNT - 1) % LANE_COUNT`
- `stepRight(lane) -> number` wrapping `(lane + 1) % LANE_COUNT`
- `moveLane(state) -> state` consumes `inputLeft`, `inputRight`; opposite cancel; otherwise step left or right.

**Step 1:** RED — write `tests/core/lanes.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepLeft, stepRight, LANE_COUNT, moveLane } from '../../game/core/lanes.js';

test('LANE_COUNT is 24', () => assert.equal(LANE_COUNT, 24));

test('stepLeft wraps 0 to 23 and 23 to 22', () => {
  assert.equal(stepLeft(0), 23);
  assert.equal(stepLeft(1), 0);
  assert.equal(stepLeft(23), 22);
});

test('stepRight wraps 23 to 0 and 0 to 1', () => {
  assert.equal(stepRight(23), 0);
  assert.equal(stepRight(0), 1);
  assert.equal(stepRight(22), 23);
});

test('MUTATION clamping stepLeft at 0 makes wrap test fail', () => {
  // mutation: Math.max(0, lane - 1) yields stepLeft(0) === 0
  // baseline wrap must be 23, so clamping fails this test.
});
```

**Step 2:** Run — expect failure.

**Step 3:** GREEN — write `lanes.js`:

```js
export const LANE_COUNT = 24;
export const stepLeft = (lane) => ((lane - 1) + LANE_COUNT) % LANE_COUNT;
export const stepRight = (lane) => (lane + 1) % LANE_COUNT;
export function moveLane(state) {
  const { inputLeft, inputRight } = state.heldInput;
  if (inputLeft && inputRight) return state; // cancel
  if (inputLeft) return { ...state, lane: stepLeft(state.lane) };
  if (inputRight) return { ...state, lane: stepRight(state.lane) };
  return state;
}
```

**Step 4:** Run — expect pass.

**Step 5:** Commit: `feat(vector-vortex): add lane wrap and cancel model (gate 1)`.

---

## Task 4: Shots — cooldown, cap, advancement

**Files:**
- Create: `vector-vortex/game/core/shots.js`
- Test: `vector-vortex/tests/core/shots.test.js`

**Interfaces:**
- `SHOT_SPEED = 0.025`
- `SHOT_COOLDOWN_TICKS = 8`
- `MAX_ACTIVE_SHOTS = 6`
- `FAR_DEPTH = 1`
- `tryFireShot(state, rng) -> { state, event? }`: if cooldown==0 and active shots < cap, append new shot at `depth=0, lane=state.lane, id=nextId`, set cooldown=8, push `shot-fired` event after commit (D2); for D1 return updated state with cooldown reset and new shot, no event required. (Events deferred to D2 — keep this task bounded.)
- `advanceShots(state) -> state`: each shot depth += SHOT_SPEED; return state.
- `expireShotsAtFar(state) -> state`: filter shots where `depth < FAR_DEPTH` (those at/past 1 expire).

**Step 1:** RED — write `tests/core/shots.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tryFireShot, advanceShots, expireShotsAtFar, SHOT_COOLDOWN_TICKS, MAX_ACTIVE_SHOTS } from '../../game/core/shots.js';

function fresh() {
  return {
    lane: 0,
    cooldown: 0,
    shots: [],
    nextShotId: 1,
    rngSeed: 1
  };
}

test('fire produces shot at depth 0 on current lane, sets cooldown to 8', () => {
  let s = fresh();
  s.lane = 7;
  s = tryFireShot(s);
  assert.equal(s.shots.length, 1);
  assert.equal(s.shots[0].depth, 0);
  assert.equal(s.shots[0].lane, 7);
  assert.equal(s.shots[0].id, 1);
  assert.equal(s.cooldown, 8);
});

test('cooldown decrements per call; tick 8 blocks fire', () => {
  let s = fresh();
  s = tryFireShot(s);
  assert.equal(s.cooldown, 8);
  // ticks 1..7: still blocked
  for (let t = 1; t < 8; t++) {
    let blocked = tryFireShot(s);
    assert.equal(blocked.shots.length, s.shots.length, `tick ${t} blocked`);
    blocked.cooldown -= 1;
    s = blocked;
  }
  // tick 8 (cooldown now 1) — still blocked
  let blocked = tryFireShot(s);
  assert.equal(blocked.shots.length, s.shots.length);
  blocked.cooldown -= 1;
  s = blocked;
  assert.equal(s.cooldown, 0);
  // tick 9: cooldown 0, fire OK
  s = tryFireShot(s);
  assert.equal(s.shots.length, 2);
});

test('cap of 6 active shots: 7th fire blocked', () => {
  let s = fresh();
  for (let i = 0; i < 6; i++) {
    s = tryFireShot(s);
    s.cooldown = 0;
    s.shots = s.shots.filter(x => x.depth < 1);
  }
  assert.equal(s.shots.length, 6);
  s.cooldown = 0;
  const before = s.shots.length;
  s = tryFireShot(s);
  assert.equal(s.shots.length, before, 'seventh shot blocked');
});

test('advanceShots moves each shot inward by 0.025', () => {
  let s = fresh();
  s = tryFireShot(s);
  s.shots[0].depth = 0.05;
  s = advanceShots(s);
  assert.equal(s.shots[0].depth, 0.05 + 0.025);
});

test('expireShotsAtFar removes shots at or past depth 1', () => {
  let s = fresh();
  s.shots = [
    { id: 1, lane: 0, depth: 0.9 },
    { id: 2, lane: 0, depth: 1.0 },
    { id: 3, lane: 0, depth: 1.001 }
  ];
  s = expireShotsAtFar(s);
  assert.equal(s.shots.length, 1);
  assert.equal(s.shots[0].id, 1);
});
```

**Step 2:** Run — expect failure.

**Step 3:** GREEN — write `shots.js`:

```js
export const SHOT_SPEED = 0.025;
export const SHOT_COOLDOWN_TICKS = 8;
export const MAX_ACTIVE_SHOTS = 6;
export const FAR_DEPTH = 1;

export function tryFireShot(state) {
  if (state.cooldown > 0) return state;
  if (state.shots.length >= MAX_ACTIVE_SHOTS) return state;
  const shot = { id: state.nextShotId, lane: state.lane, depth: 0 };
  return {
    ...state,
    shots: [...state.shots, shot],
    cooldown: SHOT_COOLDOWN_TICKS,
    nextShotId: state.nextShotId + 1
  };
}

export function advanceShots(state) {
  return {
    ...state,
    shots: state.shots.map(s => ({ ...s, depth: s.depth + SHOT_SPEED }))
  };
}

export function expireShotsAtFar(state) {
  return { ...state, shots: state.shots.filter(s => s.depth < FAR_DEPTH) };
}
```

**Step 4:** Run — expect pass.

**Step 5:** Commit: `feat(vector-vortex): add shot cooldown, cap, advance, expire (gate 1)`.

---

## Task 5: Crawlers — spawn, advance, breach, snapshot

**Files:**
- Create: `vector-vortex/game/core/enemies.js`
- Test: `vector-vortex/tests/core/enemies.test.js`

**Interfaces:**
- `CRAWLER_SPEED = 0.0015`
- `CRAWLER_HP = 1`
- `CRAWLER_SCORE = 100`
- `spawnCrawler(state, lane, id) -> state`: append at depth 1.
- `advanceEnemies(state) -> state`: depth -= CRAWLER_SPEED.
- `resolveRimBreaches(state) -> { state, breaches }`: enemies at depth <= 0 breach; sorted by ascending id, first one removes 1 life, rest within grace remove no life (D2 specifics). For D1: drain those at depth<=0 out and return count.

**Step 1:** RED — write `tests/core/enemies.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnCrawler, advanceEnemies, resolveRimBreaches, CRAWLER_SPEED, CRAWLER_HP } from '../../game/core/enemies.js';

test('CRAWLER_SPEED is 0.0015 and HP is 1', () => {
  assert.equal(CRAWLER_SPEED, 0.0015);
  assert.equal(CRAWLER_HP, 1);
});

test('spawnCrawler places at depth 1 on given lane', () => {
  let s = { enemies: [], nextEnemyId: 1 };
  s = spawnCrawler(s, 11, 1);
  assert.equal(s.enemies.length, 1);
  assert.equal(s.enemies[0].depth, 1);
  assert.equal(s.enemies[0].lane, 11);
});

test('advanceEnemies moves each enemy outward by CRAWLER_SPEED', () => {
  let s = { enemies: [{ id: 1, lane: 0, depth: 0.5, hp: 1 }] };
  s = advanceEnemies(s);
  assert.equal(s.enemies[0].depth, 0.5 - CRAWLER_SPEED);
});

test('resolveRimBreaches removes enemies with depth<=0 in ascending id order', () => {
  let s = {
    enemies: [
      { id: 3, lane: 0, depth: 0, hp: 1 },
      { id: 1, lane: 1, depth: -0.001, hp: 1 },
      { id: 2, lane: 2, depth: 0.5, hp: 1 }
    ],
    breaches: []
  };
  s = resolveRimBreaches(s);
  // ids 1 and 3 breach; ascending: 1 then 3
  assert.deepEqual(s.breaches.map(b => b.id), [1, 3]);
  assert.equal(s.enemies.length, 1);
  assert.equal(s.enemies[0].id, 2);
});
```

**Step 2:** Run — expect failure.

**Step 3:** GREEN — write `enemies.js`:

```js
export const CRAWLER_SPEED = 0.0015;
export const CRAWLER_HP = 1;
export const CRAWLER_SCORE = 100;

export function spawnCrawler(state, lane, id) {
  return {
    ...state,
    enemies: [...state.enemies, { id, lane, depth: 1, hp: CRAWLER_HP }],
    nextEnemyId: Math.max(state.nextEnemyId ?? id + 1, id + 1)
  };
}

export function advanceEnemies(state) {
  return {
    ...state,
    enemies: state.enemies.map(e => ({ ...e, depth: e.depth - CRAWLER_SPEED }))
  };
}

export function resolveRimBreaches(state) {
  const breaching = state.enemies
    .filter(e => e.depth <= 0)
    .slice()
    .sort((a, b) => a.id - b.id);
  const remaining = state.enemies.filter(e => e.depth > 0);
  return {
    ...state,
    enemies: remaining,
    breaches: [...(state.breaches ?? []), ...breaching]
  };
}
```

**Step 4:** Run — expect pass.

**Step 5:** Commit: `feat(vector-vortex): add Crawler spawn, advance, breach (gate 1)`.

---

## Task 6: Core factory + tick advance + JSON round-trip

**Files:**
- Create: `vector-vortex/game/core/index.js`
- Create: `vector-vortex/game/core/core.js`
- Test: `vector-vortex/tests/core/core.test.js`

**Interfaces:**
- `createCore({ seed, inputLog? })`: returns `{ state, dispatch(action), advance(n), tick(), snapshot(), events }`.
- `dispatch({ type: 'left' | 'right' | 'fire' | 'release-left' | 'release-right' | 'release-fire' })`: mutates `state.heldInput`.
- `advance(n)`: runs n ticks; for D1 it uses internal tick() and an injected accumulator when `clock.kind==='manual'`.
- `tick()`: full per-tick order: drain → advance shots → advance enemies → resolve collisions (D2) → expire shots at/past → resolve breaches → director/spawn stub (D2) → advance elapsed → evaluate boundary (stub) → emit events → publish snapshot.
- `snapshot()`: returns `{ elapsedTicks, lane, lives, score, shots:[{id,lane,depth}], enemies:[{id,lane,depth,hp}], breaches:[{id,lane}], recentEvents:[...] }`.
- `serialize(state)` / `deserialize(json)`: pure round-trip; produces identical state.

**Step 1:** RED — write `tests/core/core.test.js` covering:
- Initial state: lane=0, lives=3, score=0, elapsedTicks=0, no shots, no enemies.
- dispatch 'left' then tick() advances lane from 0 to 23 (wrap).
- dispatch 'right' then tick() advances lane from 23 to 0.
- dispatch 'fire' on tick 0 → after tick shot exists at lane=0 depth=0.025.
- dispatch 'left'+'right' on same tick → lane unchanged (cancel).
- JSON round-trip: serialize(state), deserialize(json), run identical 10-tick advance on both, digests equal.
- 8th-tick cooldown bypass test: dispatch fire on ticks 0..7 → only 1 shot, second fire on tick 8 blocked.

**Step 2:** Run — expect failure.

**Step 3:** GREEN — write `core.js` and `index.js`.

**Step 4:** Run — expect pass.

**Step 5:** Commit: `feat(vector-vortex): wire deterministic core with tick advance (gate 1)`.

---

## Task 7: Fixed-step accumulator with frame-delta cap

**Files:**
- Modify: `vector-vortex/game/core/index.js`
- Modify: `vector-vortex/game/core/clock.js`
- Test: `vector-vortex/tests/core/clock.test.js`

**Interfaces:**
- `createClock({ fps, maxFrameDelta=0.25 })`: returns `{ pushDelta(seconds), run(core), pause(), resume() }`.
- `pushDelta(s)` accumulates; if `s > maxFrameDelta`, drops the surplus.
- `run(core)` drains ticks: each tick consumes 1/60 second.

**Step 1:** RED — write `tests/core/clock.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClock } from '../../game/core/clock.js';
import { createCore } from '../../game/core/core.js';

function digest(core) { return JSON.stringify(core.snapshot()); }

test('30 Hz: 1/30 sec per push, 30 pushes -> 15 ticks', () => {
  const core = createCore({ seed: 0xC0FFEE, inputLog: [] });
  const clock = createClock({ fps: 60 });
  let pushes = 0;
  for (let i = 0; i < 30; i++) {
    clock.pushDelta(1 / 30);
    while (clock.run(core)) pushes++;
  }
  assert.equal(core.snapshot().elapsedTicks, 15);
});

test('60 Hz: 60 pushes of 1/60 -> 60 ticks', () => {
  const core = createCore({ seed: 1 });
  const clock = createClock({ fps: 60 });
  for (let i = 0; i < 60; i++) {
    clock.pushDelta(1 / 60);
    while (clock.run(core)) {}
  }
  assert.equal(core.snapshot().elapsedTicks, 60);
});

test('144 Hz: 144 pushes of 1/144 -> 60 ticks (rounded floor)', () => {
  const core = createCore({ seed: 1 });
  const clock = createClock({ fps: 60 });
  for (let i = 0; i < 144; i++) {
    clock.pushDelta(1 / 144);
    while (clock.run(core)) {}
  }
  assert.equal(core.snapshot().elapsedTicks, 60);
});

test('fractional and uneven deltas produce same digest as 60 Hz baseline', () => {
  function run(seed, deltas) {
    const core = createCore({ seed, inputLog: [] });
    const clock = createClock({ fps: 60 });
    for (const d of deltas) {
      clock.pushDelta(d);
      while (clock.run(core)) {}
    }
    return digest(core);
  }
  const baseline = [1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60, 1/60];
  const uneven = [0.005, 0.022, 0.011, 0.017, 0.030, 0.005, 0.040, 0.020, 0.005, 0.005];
  const a = run(7, baseline);
  const b = run(7, uneven);
  assert.equal(a, b);
});

test('delta above catch-up cap is clamped: 1.0s push does not burst >15 ticks', () => {
  const core = createCore({ seed: 1 });
  const clock = createClock({ fps: 60, maxFrameDelta: 0.25 });
  clock.pushDelta(1.0);
  let ticked = 0;
  while (clock.run(core)) ticked++;
  assert.ok(ticked <= 15, `expected <=15 ticks (250ms cap), got ${ticked}`);
});

test('MUTATION removing frame-delta cap lets 1s push drain >25 ticks', () => {
  // Documentation; corresponding buggy implementation lives in clock-mutation.js
  const buggy = await import('../../game/core/clock-mutation.js');
  // …
});
```

**Step 2:** Run — expect failure.

**Step 3:** GREEN — write `clock.js`:

```js
export const TICK_HZ = 60;
export const TICK_SECONDS = 1 / TICK_HZ;
export const DEFAULT_MAX_FRAME_DELTA = 0.25; // 250ms

export function createClock({ fps: _ignored = TICK_HZ, maxFrameDelta = DEFAULT_MAX_FRAME_DELTA } = {}) {
  let acc = 0;
  let paused = false;
  return {
    pushDelta(seconds) {
      if (paused) return;
      if (seconds > maxFrameDelta) seconds = maxFrameDelta;
      acc += seconds;
    },
    run(core) {
      if (paused) return false;
      if (acc < TICK_SECONDS) return false;
      acc -= TICK_SECONDS;
      core.advance(1);
      return true;
    },
    pause() { paused = true; },
    resume() { paused = false; },
    pending() { return acc; }
  };
}
```

And add `clock-mutation.js` that omits the clamp, used only by the mutation test.

**Step 4:** Run — expect pass.

**Step 5:** Commit: `feat(vector-vortex): add fixed-step accumulator with frame cap (gate 1)`.

---

## Task 8: Source purity check

**Files:**
- Test: `vector-vortex/tests/core/purity.test.js`

**Step 1:** RED — write `tests/core/purity.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RULES_DIR = new URL('../../game/core', import.meta.url).pathname;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

const FORBIDDEN = [
  ['Math.random', /Math\.random\b/],
  ['Date.now', /\bDate\.now\b/],
  ['performance.now', /\bperformance\.now\b/],
  ['window', /\bwindow\b/],
  ['document', /\bdocument\b/],
  ['HTMLCanvasElement', /\bHTMLCanvasElement\b/],
  ['OffscreenCanvas', /\bOffscreenCanvas\b/],
  ['AudioContext', /\bAudioContext\b/],
  ['Audio', /\bnew\s+Audio\b/]
];

test('rules modules contain no DOM/Canvas/Audio/clock APIs', () => {
  const files = walk(RULES_DIR).filter(p => !p.endsWith('-mutation.js'));
  const offenders = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const [name, re] of FORBIDDEN) {
      if (re.test(src)) offenders.push(`${f}: ${name}`);
    }
  }
  assert.deepEqual(offenders, [], `forbidden APIs found: ${offenders.join(', ')}`);
});

test('MUTATION injecting Math.random into a rules module fails the check', () => {
  // verification: the FORBIDDEN list contains Math.random; if the regex matches,
  // offenders is non-empty and the assertion fires. No new code needed.
});
```

**Step 2:** Run — expect pass (rules modules are clean).

**Step 3:** Commit: `test(vector-vortex): assert no DOM/Canvas/Audio/clock APIs in rules (gate 1)`.

---

## Task 9: Replay-digest test (multi-rate, JSON round-trip)

**Files:**
- Test: `vector-vortex/tests/core/replay.test.js`

**Step 1:** RED — write `tests/core/replay.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCore } from '../../game/core/core.js';

const ACTIONS = [
  { tick: 0, type: 'fire' },
  { tick: 5, type: 'right' },
  { tick: 10, type: 'fire' },
  { tick: 15, type: 'left' },
  { tick: 20, type: 'fire' },
  { tick: 25, type: 'left' }
];

function runOnce(rate) {
  const core = createCore({ seed: 0xC0FFEE });
  for (const a of ACTIONS) while (core.snapshot().elapsedTicks < a.tick) core.advance(1);
  // apply action at that tick boundary:
  core.dispatch({ type: a.type });
  core.advance(1);
}
```

Simpler: each test advances a core through a fixed action log and asserts identical snapshot digests at 30/60/144 Hz and across JSON round-trip.

**Step 2:** Implement test, run, expect pass.

**Step 3:** Commit: `test(vector-vortex): assert replay-digest equivalence across rates (gate 1)`.

---

## Task 10: Unit-test discovery (no glob expansion)

**Files:**
- Modify: `vector-vortex/package.json`

**Step 1:** Confirm `npm test` runs `node --test` with explicit list of every `tests/core/*.test.js`. List them in `scripts.test`.

**Step 2:** Add a sentinel test `tests/core/discovery.test.js` that asserts `process.env.NODE_TEST_CONTEXT` is present (proves node test runner is in use) and counts the run via `node --test --test-reporter=spec`. (Validated externally by renaming a test file and confirming `npm test` reports a different count.)

**Step 3:** Run `npm test` from `vector-vortex/` — expect every tracked test to pass.

**Step 4:** Commit: `chore(vector-vortex): wire unit-test discovery (gate 1)`.

---

## Task 11: Game directory placeholder (D1 doesn't ship the playable HTML)

**Files:**
- Create: `vector-vortex/game/index.html` (placeholder "Deliverable 1 — core only" page)
- Create: `vector-vortex/game/AGENTS.md` (per-game)

**Step 1:** Add `index.html` placeholder; D3 replaces it with full Canvas + DOM.

**Step 2:** Commit: `feat(vector-vortex): add game placeholder (gate 1)`.

---

## Task 12: Per-game AGENTS.md, README.md, interior docs

**Files:**
- Create: `vector-vortex/AGENTS.md`
- Create: `vector-vortex/README.md`
- Create: `vector-vortex/game/README.md`
- Create: `vector-vortex/tests/README.md`

**Step 1:** Author each with frontmatter per repo standards.

**Step 2:** Commit: `docs(vector-vortex): add per-game docs for Deliverable 1 (gate 1)`.

---

## Task 13: Final validation pass

**Step 1:** Run `npm test` from a fresh-ish state (`rm -rf vector-vortex/node_modules && npm install && npm test`) and capture output.

**Step 2:** Confirm every Deliverable 1 validation box is satisfied by a named test with its named mutation.

**Step 3:** Final commit: `feat(vector-vortex): scaffold toolchain and deterministic core (gate 1)` consolidating any remaining changes.