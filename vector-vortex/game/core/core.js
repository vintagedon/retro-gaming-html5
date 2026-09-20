import { applyMovement } from './lanes.js';
import {
  tryFireShotWithEvent,
  advanceShotsWithDepth,
  expireShotsAtFarWithEvents,
  tickCooldown
} from './shots.js';
import { advanceEnemiesWithDepth } from './enemies.js';
import {
  tryEnemyFire,
  advanceEnemyShotsWithDepth,
  expireEnemyShotsAtRim,
  initialFireTick,
  ENEMY_SHOT_SPEED,
  ENEMY_FIRE_INTERVAL_TICKS
} from './enemy-shots.js';
import { resolveCollisions } from './collision.js';
import { resolveBreaches } from './breach.js';
import { createWaveDirector, waveCleared } from './director.js';
import { DAMAGE_GRACE_TICKS } from './breach.js';

export const TICK_HZ = 60;
export const STARTING_LIVES = 3;
export const CRAWLER_SCORE = 100;

export function initialState(seed) {
  return {
    seed,
    lane: 0,
    lives: STARTING_LIVES,
    score: 0,
    elapsedTicks: 0,
    cooldown: 0,
    shots: [],
    enemies: [],
    enemyShots: [],
    breaches: [],
    damageGraceRemaining: 0,
    shotsSpawned: 0,
    hits: 0,
    kills: 0,
    nextShotId: 1,
    nextEnemyId: 1,
    nextEnemyShotId: 1,
    waveSpawned: 0,
    moveDir: 0,
    moveHeldTicks: 0,
    moveCooldown: 0,
    heldInput: { left: false, right: false, fire: false },
    recentEvents: [],
    paused: false,
    outcome: null,
    rngState: null
  };
}

export function createCore({ seed = 1, initialState: provided } = {}) {
  let state = provided ?? initialState(seed);
  const director = createWaveDirector({ seed });
  // If the provided state carries a persisted RNG position, restore it on
  // the director's RNG so a JSON round-trip yields identical lane draws.
  if (provided && provided.rngState != null) {
    director._rng.setState(provided.rngState);
  }

  const pendingEvents = [];
  function emit(event) { pendingEvents.push(event); }
  function flushEvents() {
    if (pendingEvents.length === 0) return state;
    const merged = [...state.recentEvents, ...pendingEvents];
    state = { ...state, recentEvents: merged.length > 200 ? merged.slice(-200) : merged };
    pendingEvents.length = 0;
  }

  function dispatch(action) {
    if (!action || typeof action !== 'object') return;
    switch (action.type) {
      case 'left-down':
        state = { ...state, heldInput: { ...state.heldInput, left: true } };
        break;
      case 'left-up':
        state = { ...state, heldInput: { ...state.heldInput, left: false } };
        break;
      case 'right-down':
        state = { ...state, heldInput: { ...state.heldInput, right: true } };
        break;
      case 'right-up':
        state = { ...state, heldInput: { ...state.heldInput, right: false } };
        break;
      case 'fire-down':
        state = { ...state, heldInput: { ...state.heldInput, fire: true } };
        break;
      case 'fire-up':
        state = { ...state, heldInput: { ...state.heldInput, fire: false } };
        break;
      case 'pause':
        state = { ...state, paused: !state.paused };
        break;
      case 'restart':
        const fresh = initialState(state.seed);
        // Reset the director's RNG too so a fresh run replays the same lane
        // sequence from the seed.
        director._rng.setState(((fresh.seed >>> 0) || 1));
        state = fresh;
        break;
      case 'blur':
      case 'visibility':
        state = {
          ...state,
          heldInput: { left: false, right: false, fire: false }
        };
        break;
      default:
        break;
    }
  }

  function tick() {
    if (state.paused || state.outcome) return;
    // 1. drain input + fire attempt
    state = applyMovement(state);
    if (state.heldInput.fire) {
      const r = tryFireShotWithEvent(state);
      state = r.state;
      if (r.event) {
        state = { ...state, shotsSpawned: state.shotsSpawned + 1 };
        emit(r.event);
      }
    }
    state = tickCooldown(state);
    // 2. advance shots (carries prev/next for swept collision)
    const shotAdv = advanceShotsWithDepth(state);
    state = shotAdv.state;
    const shotForCollision = shotAdv.shots;
    // 3. advance enemies (carries prev/next)
    const enemyAdv = advanceEnemiesWithDepth(state);
    state = enemyAdv.state;
    // 3b. enemy fire: each enemy fires along its own lane toward the rim
    // once its fire tick is due, under the active-shot cap. A fire past
    // the cap stays due and retries on the next tick.
    for (const enemy of state.enemies) {
      if (state.elapsedTicks < enemy.nextFireTick) continue;
      const r = tryEnemyFire(state, enemy);
      if (!r) continue;
      state = {
        ...r.state,
        enemyShots: [...r.state.enemyShots, { ...r.shot, prev: r.shot.depth, next: r.shot.depth }]
      };
      state = {
        ...state,
        enemies: state.enemies.map(e => e.id === enemy.id
          ? { ...e, nextFireTick: state.elapsedTicks + ENEMY_FIRE_INTERVAL_TICKS }
          : e)
      };
      emit({ type: 'enemy-shot-fired', shotId: r.shot.id, lane: r.shot.lane, tick: state.elapsedTicks });
    }
    // 3c. advance enemy shots (carries prev/next for swept resolution)
    const enemyShotAdv = advanceEnemyShotsWithDepth(state);
    state = enemyShotAdv.state;
    // Collision reads the enemy roster as of after fire scheduling, so the
    // nextFireTick updates above survive into the committed state.
    const enemyForCollision = state.enemies;
    // 4. resolve swept collisions (ascending stable enemy ID)
    const coll = resolveCollisions({
      shots: shotForCollision,
      enemies: enemyForCollision,
      score: state.score,
      hits: state.hits
    });
    state = {
      ...state,
      shots: coll.newShots,
      enemies: coll.newEnemies,
      score: coll.score,
      hits: coll.hits,
      kills: state.kills + coll.kills.length
    };
    for (const k of coll.kills) {
      emit({
        type: 'enemy-destroyed',
        enemyId: k.enemyId,
        shotId: k.shotId,
        lane: k.lane,
        depth: k.depth,
        kind: 'enemy',
        tick: state.elapsedTicks
      });
    }
    // 5. expire shots at/past far (AFTER collision so the final sweep participates)
    const exp = expireShotsAtFarWithEvents(state);
    state = exp.state;
    for (const e of exp.expired) {
      emit({ type: 'shot-expired-at-far', shotId: e.id, lane: e.lane, tick: state.elapsedTicks });
    }
    // 6. resolve rim breaches & life loss (ascending ID; grace handling)
    const br = resolveBreaches(state);
    state = br.state;
    if (br.breaches.length > 0) {
      state = { ...state, breaches: [...state.breaches, ...br.breaches] };
      for (const e of br.breaches) {
        emit({ type: 'breach', enemyId: e.id, lane: e.lane, tick: state.elapsedTicks });
      }
    }
    if (br.lifeLost) {
      emit({ type: 'life-lost', lives: state.lives, tick: state.elapsedTicks, cause: 'breach' });
    }
    // 6b. enemy-shot hits on the player, AFTER breach resolution so a
    // breach and a shot resolving on the same tick cost at most one life
    // (the shot finds the player already in grace). Ascending shot ID;
    // swept-interval rule: a shot that crossed depth 0 this tick hits the
    // player only while the player occupies its lane.
    {
      const ordered = [...state.enemyShots].sort((a, b) => a.id - b.id);
      let lives = state.lives;
      let grace = state.damageGraceRemaining;
      let shotLifeLost = false;
      for (const s of ordered) {
        const crossedRim = s.prev > 0 && s.next <= 0;
        if (crossedRim && s.lane === state.lane && lives > 0 && grace <= 0) {
          lives = Math.max(0, lives - 1);
          grace = DAMAGE_GRACE_TICKS;
          shotLifeLost = true;
        }
      }
      if (shotLifeLost) {
        state = { ...state, lives, damageGraceRemaining: grace };
        emit({ type: 'life-lost', lives: state.lives, tick: state.elapsedTicks, cause: 'enemy-shot' });
      }
    }
    // 6c. expire enemy shots at the rim, AFTER hit resolution so the
    // final sweep participates, matching the player-shot expiry ordering.
    state = expireEnemyShotsAtRim(state);
    // 7. director/spawn (deterministic lane via injected seeded RNG)
    const spawn = director.tickSpawned(state);
    if (spawn) {
      const id = state.nextEnemyId;
      const enemy = {
        id,
        lane: spawn.lane,
        depth: 1,
        hp: 1,
        spawnedTick: state.elapsedTicks,
        nextFireTick: initialFireTick(state.elapsedTicks)
      };
      state = {
        ...state,
        enemies: [...state.enemies, enemy],
        nextEnemyId: id + 1,
        waveSpawned: state.waveSpawned + 1,
        rngState: director._rng.getState()
      };
      emit({ type: 'director-spawn', enemyId: id, lane: spawn.lane, tick: state.elapsedTicks });
    }
    // 8. evaluate outcomes. Player damage and death resolve before any
    // wave-clear grant: death on the final enemy is death, not a clear.
    if (state.outcome === null && state.lives <= 0) {
      state = { ...state, outcome: 'game-over' };
      emit({ type: 'run-ended', outcome: 'game-over', tick: state.elapsedTicks });
    }
    if (state.outcome === null && waveCleared(state)) {
      // Clearing the wave discards enemy shots still in flight and
      // freezes gameplay with the wave-complete outcome.
      state = { ...state, outcome: 'wave-complete', enemyShots: [] };
      emit({ type: 'run-ended', outcome: 'wave-complete', tick: state.elapsedTicks });
    }
    // 9. advance elapsed
    state = { ...state, elapsedTicks: state.elapsedTicks + 1 };
    // 10. emit tick event and flush
    emit({ type: 'tick', index: state.elapsedTicks });
    flushEvents();
  }

  function advance(n) {
    for (let i = 0; i < n; i++) tick();
  }

  function snapshot() {
    return {
      seed: state.seed,
      lane: state.lane,
      lives: state.lives,
      score: state.score,
      elapsedTicks: state.elapsedTicks,
      waveSpawned: state.waveSpawned,
      cooldown: state.cooldown,
      paused: state.paused,
      outcome: state.outcome,
      heldInput: { ...state.heldInput },
      shots: state.shots.map(s => ({ id: s.id, lane: s.lane, depth: s.depth })),
      enemies: state.enemies.map(e => ({ id: e.id, lane: e.lane, depth: e.depth, hp: e.hp })),
      enemyShots: state.enemyShots.map(s => ({ id: s.id, lane: s.lane, depth: s.depth })),
      breaches: state.breaches.map(b => ({ id: b.id, lane: b.lane })),
      damageGraceRemaining: state.damageGraceRemaining,
      shotsSpawned: state.shotsSpawned,
      hits: state.hits,
      kills: state.kills,
      recentEvents: state.recentEvents.slice()
    };
  }

  function getState() { return state; }
  function setState(next) { state = next; }

  return { dispatch, tick, advance, snapshot, getState, setState };
}

export function serializeState(state) {
  return JSON.stringify(state);
}
export function deserializeState(json) {
  return JSON.parse(json);
}
