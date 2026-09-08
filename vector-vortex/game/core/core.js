import { applyMovement } from './lanes.js';
import {
  tryFireShot,
  advanceShots,
  expireShotsAtFar,
  tickCooldown,
  SHOT_COOLDOWN_TICKS
} from './shots.js';
import { advanceEnemies, resolveRimBreaches, CRAWLER_SPEED } from './enemies.js';

export const TICK_HZ = 60;
export const RUN_LENGTH_TICKS = 18000;
export const STARTING_LIVES = 3;
export const DAMAGE_GRACE_TICKS = 30;

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
    nextShotId: 1,
    nextEnemyId: 1,
    heldInput: { left: false, right: false, fire: false },
    recentEvents: [],
    paused: false,
    outcome: null
  };
}

export function createCore({ seed = 1, initialState: provided } = {}) {
  let state = provided ?? initialState(seed);

  function emit(event) {
    state = { ...state, recentEvents: [...state.recentEvents, event] };
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
      case 'restart': {
        state = initialState(state.seed);
        break;
      }
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
    // 1. drain input
    state = applyMovement(state);
    if (state.heldInput.fire) {
      state = tryFireShot(state);
    }
    state = tickCooldown(state);
    // 2. advance shots
    state = advanceShots(state);
    // 3. advance enemies
    state = advanceEnemies(state);
    // 4. resolve shot-enemy collisions (D2 — placeholder; no-op for D1)
    // 5. expire shots at/past far depth
    state = expireShotsAtFar(state);
    // 6. resolve rim breaches & life loss (D2 — basic for D1: first life-cost)
    const breachResult = resolveRimBreaches(state);
    state = breachResult;
    if (breachResult.breaches.length > 0) {
      // D2 adds grace handling; D1 just costs one life per breach cluster.
      if (state.damageGraceRemaining <= 0 && state.lives > 0) {
        state = { ...state, lives: state.lives - 1 };
      }
    }
    if (state.damageGraceRemaining > 0) {
      state = { ...state, damageGraceRemaining: state.damageGraceRemaining - 1 };
    }
    // 7. director/spawn (D2)
    // 8. advance elapsed
    state = { ...state, elapsedTicks: state.elapsedTicks + 1 };
    // 9. evaluate run boundary
    if (state.lives <= 0 && state.outcome === null) {
      state = { ...state, outcome: 'lost' };
      emit({ type: 'run-ended', outcome: 'lost' });
    } else if (state.elapsedTicks >= RUN_LENGTH_TICKS && state.outcome === null) {
      state = { ...state, outcome: 'survived' };
      emit({ type: 'run-ended', outcome: 'survived' });
    }
    // 10. emit tick event
    emit({ type: 'tick', index: state.elapsedTicks });
    if (state.recentEvents.length > 200) {
      state = { ...state, recentEvents: state.recentEvents.slice(-200) };
    }
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
      recentEvents: state.recentEvents.slice()
    };
  }

  function getState() {
    return state;
  }

  function setState(next) {
    state = next;
  }

  return { dispatch, tick, advance, snapshot, getState, setState };
}

export function serializeState(state) {
  return JSON.stringify(state);
}

export function deserializeState(json) {
  return JSON.parse(json);
}