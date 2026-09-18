import { CONFIG, TICK_SECONDS } from './config.js';
import { createRng, seedToState } from './rng.js';
import { generateTerrain, terrainHeightAt } from './terrain.js';

const TWO_PI = Math.PI * 2;

function normalizeAngle(angle) {
  let r = (angle + Math.PI) % TWO_PI;
  if (r < 0) r += TWO_PI;
  return r - Math.PI;
}

function clamp(value, low, high) {
  return Math.min(Math.max(value, low), high);
}

function pct(ratio) {
  return clamp(ratio, 0, 1) * 100;
}

function freshRunState(config, seed, rng) {
  const start = config.start;
  return {
    seed,
    rngState: rng.getState(),
    elapsedTicks: 0,
    paused: false,
    outcome: null,
    craftState: 'flying',
    x: start.x,
    y: start.y,
    vx: start.vx,
    vy: start.vy,
    angle: start.angle,
    fuel: config.fuel.capacity,
    hullSegments: config.hull.segments,
    hullPrevSegments: config.hull.segments,
    thrustNotch: 0,
    rotate: 0,
    craftRemaining: config.craft.starting,
    lastImpact: null,
    inContact: false,
    terrain: generateTerrain(config, rng),
    recentEvents: [{ tick: 0, kind: 'run-start' }]
  };
}

const CONTINUATION_KEYS = [
  'seed',
  'rngState',
  'elapsedTicks',
  'paused',
  'outcome',
  'craftState',
  'x',
  'y',
  'vx',
  'vy',
  'angle',
  'fuel',
  'hullSegments',
  'hullPrevSegments',
  'thrustNotch',
  'rotate',
  'craftRemaining',
  'lastImpact',
  'inContact',
  'terrain',
  'recentEvents'
];

// `snapshot` is the public option name; it binds to `restoreFrom`
// locally because the snapshot() method declaration would otherwise
// shadow the parameter through hoisting.
export function createLanderCore({
  config = CONFIG,
  seed = 20260918,
  snapshot: restoreFrom = null
} = {}) {
  const cfg = config;
  const rng = createRng(0);

  let state;
  if (restoreFrom) {
    state = {};
    for (const key of CONTINUATION_KEYS) {
      state[key] = restoreFrom[key];
    }
    state.recentEvents = (restoreFrom.recentEvents || []).map((event) => ({ ...event }));
    state.terrain = { ...restoreFrom.terrain, heights: [...restoreFrom.terrain.heights] };
    rng.setState(state.rngState);
  } else {
    const runSeed = seed >>> 0;
    rng.setState(seedToState(runSeed));
    state = freshRunState(cfg, runSeed, rng);
    state.rngState = rng.getState();
  }

  function pushEvent(kind) {
    const ring = state.recentEvents;
    ring.push({ tick: state.elapsedTicks, kind });
    if (ring.length > cfg.events.ringCapacity) {
      ring.splice(0, ring.length - cfg.events.ringCapacity);
    }
  }

  function effectiveThrustNotch() {
    if (state.fuel <= 0) return 0;
    if (state.craftState !== 'flying') return 0;
    if (state.outcome !== null) return 0;
    return state.thrustNotch;
  }

  function resolveContact(impactSpeed, verticalSpeed, horizontalSpeed) {
    const tol = cfg.landing;
    const overSite = Math.abs(state.x - tol.siteX) <= tol.siteWidth / 2;
    const tilt = Math.abs(normalizeAngle(state.angle));
    const safe =
      overSite &&
      verticalSpeed <= tol.maxVerticalSpeed &&
      horizontalSpeed <= tol.maxHorizontalSpeed &&
      tilt <= tol.maxTilt;

    state.inContact = true;
    state.vx = 0;
    state.vy = 0;
    state.thrustNotch = 0;

    if (safe) {
      state.craftState = 'landed';
      state.outcome = 'landed';
      pushEvent('landed');
      return;
    }

    const hard = impactSpeed >= cfg.impact.hardThreshold;
    state.hullPrevSegments = state.hullSegments;
    state.lastImpact = hard ? 'hard' : 'gentle';
    state.hullSegments = hard ? 0 : Math.max(0, state.hullSegments - 1);
    pushEvent(hard ? 'impact-hard' : 'impact-gentle');

    if (state.hullSegments === 0) {
      state.craftState = 'destroyed';
      state.craftRemaining -= 1;
      pushEvent('craft-destroyed');
      if (state.craftRemaining <= 0) {
        state.craftRemaining = 0;
        state.outcome = 'run-over';
        pushEvent('run-over');
      }
    }
  }

  function tick() {
    if (state.paused) return;
    if (state.outcome !== null) return;
    if (state.craftState === 'destroyed') return;

    const dt = TICK_SECONDS;
    const notches = cfg.thrust.notches;
    const notch = effectiveThrustNotch();
    const fraction = notch / notches;

    state.angle = normalizeAngle(state.angle + state.rotate * cfg.rotation.rate * dt);

    const ax = Math.sin(state.angle) * cfg.thrust.acceleration * fraction;
    const ay = Math.cos(state.angle) * cfg.thrust.acceleration * fraction;
    state.vx += ax * dt;
    state.vy += (ay - cfg.gravity) * dt;

    if (notch > 0) {
      state.fuel = Math.max(0, state.fuel - cfg.fuel.burnRate * fraction * dt);
    }

    state.x += state.vx * dt;
    state.y += state.vy * dt;
    state.elapsedTicks += 1;

    if (state.x <= 0) {
      state.x = 0;
      if (state.vx < 0) state.vx = 0;
    } else if (state.x >= cfg.world.width) {
      state.x = cfg.world.width;
      if (state.vx > 0) state.vx = 0;
    }

    const ground = terrainHeightAt(state.terrain, state.x);
    if (state.y <= ground) {
      const impactSpeed = Math.hypot(state.vx, state.vy);
      const verticalSpeed = Math.abs(state.vy);
      const horizontalSpeed = Math.abs(state.vx);
      state.y = ground;
      if (!state.inContact) {
        resolveContact(impactSpeed, verticalSpeed, horizontalSpeed);
      } else {
        state.vx = 0;
        state.vy = 0;
      }
    } else if (state.inContact && state.y > ground + cfg.contact.takeoffClearance) {
      state.inContact = false;
      pushEvent('takeoff');
    }

    state.rngState = rng.getState();
  }

  function snapshot() {
    const fuelMax = cfg.fuel.capacity;
    const hullMax = cfg.hull.segments;
    const craftMax = cfg.craft.starting;
    const notches = cfg.thrust.notches;
    const notch = effectiveThrustNotch();
    const altitude = state.y - terrainHeightAt(state.terrain, state.x);
    const speed = Math.hypot(state.vx, state.vy);
    return {
      seed: state.seed,
      rngState: state.rngState,
      elapsedTicks: state.elapsedTicks,
      paused: state.paused,
      outcome: state.outcome,
      craftState: state.craftState,
      x: state.x,
      y: state.y,
      vx: state.vx,
      vy: state.vy,
      angle: state.angle,
      fuel: state.fuel,
      fuelMax,
      fuelRatio: clamp(state.fuel / fuelMax, 0, 1),
      hullSegments: state.hullSegments,
      hullSegmentsMax: hullMax,
      hullRatio: clamp(state.hullSegments / hullMax, 0, 1),
      hullPrevSegments: state.hullPrevSegments,
      hullPrevRatio: clamp(state.hullPrevSegments / hullMax, 0, 1),
      thrustLevel: notch / notches,
      thrustNotchesMax: notches,
      craftRemaining: state.craftRemaining,
      craftMax,
      craftRatio: clamp(state.craftRemaining / craftMax, 0, 1),
      lastImpact: state.lastImpact,
      altitudeDisplay: `${Math.max(0, altitude).toFixed(0)} m`,
      velocityDisplay: `${speed.toFixed(1)} m/s`,
      fuelDisplay: `${Math.round(pct(state.fuel / fuelMax))} %`,
      recentEvents: state.recentEvents.map((event) => ({ ...event })),
      rotate: state.rotate,
      thrustNotch: state.thrustNotch,
      inContact: state.inContact,
      terrain: { ...state.terrain, heights: [...state.terrain.heights] }
    };
  }

  function setRotate(dir) {
    const d = Math.round(dir);
    state.rotate = clamp(d, -1, 1);
  }

  function nudgeThrust(delta) {
    if (state.craftState !== 'flying' || state.outcome !== null) return;
    state.thrustNotch = clamp(state.thrustNotch + delta, 0, cfg.thrust.notches);
  }

  function setThrustNotch(notch) {
    if (state.craftState !== 'flying' || state.outcome !== null) return;
    state.thrustNotch = clamp(Math.round(notch), 0, cfg.thrust.notches);
  }

  function setPaused(paused) {
    state.paused = !!paused;
  }

  function retry() {
    if (state.craftState !== 'destroyed') return false;
    if (state.outcome !== null) return false;
    if (state.craftRemaining <= 0) return false;

    const start = cfg.start;
    state.x = start.x;
    state.y = start.y;
    state.vx = start.vx;
    state.vy = start.vy;
    state.angle = start.angle;
    state.fuel = cfg.fuel.capacity;
    state.hullSegments = cfg.hull.segments;
    state.hullPrevSegments = cfg.hull.segments;
    state.thrustNotch = 0;
    state.rotate = 0;
    state.lastImpact = null;
    state.inContact = false;
    state.craftState = 'flying';
    state.outcome = null;
    pushEvent('retry');
    return true;
  }

  function restartRun(options = {}) {
    let runSeed;
    if (Number.isInteger(options.seed)) {
      runSeed = options.seed >>> 0;
      rng.setState(seedToState(runSeed));
    } else {
      runSeed = Math.floor(rng.draw() * 2147483647) >>> 0;
      rng.setState(seedToState(runSeed));
    }
    state = freshRunState(cfg, runSeed, rng);
    state.rngState = rng.getState();
  }

  return {
    tick,
    snapshot,
    setRotate,
    nudgeThrust,
    setThrustNotch,
    setPaused,
    retry,
    restartRun
  };
}
