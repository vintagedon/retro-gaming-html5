import { applyMovement } from './lanes.js';
import {
  tryFireShotWithEvent,
  advanceShotsWithDepth,
  expireShotsAtFarWithEvents,
  tickCooldown
} from './shots.js';
import { advanceEnemiesWithDepth } from './enemies.js';
import { resolveCollisions } from './collision.js';
import { resolveBreaches } from './breach.js';
import { createDirector, bandForTick, shouldSpawnOnTick } from './director.js';
import { computeAccuracyBonus, SURVIVAL_BONUS } from './scoring.js';

export const TICK_HZ = 60;
export const RUN_LENGTH_TICKS = 18000;
export const STARTING_LIVES = 3;
export const DAMAGE_GRACE_TICKS = 30;
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
    breaches: [],
    damageGraceRemaining: 0,
    shotsSpawned: 0,
    hits: 0,
    nextShotId: 1,
    nextEnemyId: 1,
    heldInput: { left: false, right: false, fire: false },
    recentEvents: [],
    paused: false,
    outcome: null,
    rngState: null
  };
}

export function createCore({ seed = 1, initialState: provided } = {}) {
  let state = provided ?? initialState(seed);
  const director = createDirector({ seed });

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
        state = initialState(state.seed);
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
    const enemyForCollision = enemyAdv.enemies;
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
      hits: coll.hits
    };
    for (const k of coll.kills) {
      emit({ type: 'enemy-destroyed', enemyId: k.enemyId, shotId: k.shotId, tick: state.elapsedTicks });
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
      emit({ type: 'life-lost', lives: state.lives, tick: state.elapsedTicks });
    }
    // 7. director/spawn (deterministic lane via injected seeded RNG)
    const band = bandForTick(state.elapsedTicks);
    if (shouldSpawnOnTick(state.elapsedTicks, band)) {
      const spawn = director.tickSpawned(state);
      if (spawn) {
        const id = state.nextEnemyId;
        const enemy = { id, lane: spawn.lane, depth: 1, hp: 1 };
        state = { ...state, enemies: [...state.enemies, enemy], nextEnemyId: id + 1 };
        emit({ type: 'director-spawn', enemyId: id, lane: spawn.lane, tick: state.elapsedTicks });
      }
    }
    // 8. evaluate run boundary.
    // The "lost" check fires immediately when breach empties lives (any tick).
    // The "survived" check fires after elapsedTicks is incremented to 17999,
    // which is the post-increment state of the final tick.
    if (state.outcome === null && state.lives <= 0) {
      state = { ...state, outcome: 'lost' };
      emit({ type: 'run-ended', outcome: 'lost', tick: state.elapsedTicks });
    }
    // 9. advance elapsed
    const finalTickIndex = state.elapsedTicks;
    state = { ...state, elapsedTicks: state.elapsedTicks + 1 };
    // After the final tick has been fully processed (elapsedTicks now equals
    // RUN_LENGTH_TICKS) and the player is still alive, the run survived.
    if (state.outcome === null && state.elapsedTicks === RUN_LENGTH_TICKS) {
      const bonus = computeAccuracyBonus(state.hits, state.shotsSpawned);
      state = {
        ...state,
        score: state.score + SURVIVAL_BONUS + bonus,
        outcome: 'survived'
      };
      emit({ type: 'run-ended', outcome: 'survived', tick: finalTickIndex });
    }
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
      cooldown: state.cooldown,
      paused: state.paused,
      outcome: state.outcome,
      heldInput: { ...state.heldInput },
      shots: state.shots.map(s => ({ id: s.id, lane: s.lane, depth: s.depth })),
      enemies: state.enemies.map(e => ({ id: e.id, lane: e.lane, depth: e.depth, hp: e.hp })),
      breaches: state.breaches.map(b => ({ id: b.id, lane: b.lane })),
      damageGraceRemaining: state.damageGraceRemaining,
      shotsSpawned: state.shotsSpawned,
      hits: state.hits,
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