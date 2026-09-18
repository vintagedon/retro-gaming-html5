// Deterministic descent controllers for the stopped-runner flows.
// Each reads only snapshots and emits notch/rotate commands; the same
// logic flies the Node core and the browser seam identically. With the
// pad-centered start pose these are pure vertical profiles.
import { CONFIG } from '../../game/core/config.js';

const NET_UP = CONFIG.thrust.acceleration - CONFIG.gravity;

function altitudeOf(snapshot) {
  return Math.max(snapshot.y - 1.4, 0);
}

function safeSpeed(alt) {
  return Math.sqrt(2 * NET_UP * 0.95 * Math.max(alt - 2, 0));
}

// Flies a fuel-efficient suicide burn that touches down inside every
// landing tolerance. Verified to land with fuel to spare.
export function landingStep(snapshot, lastNotch) {
  const alt = altitudeOf(snapshot);
  const vSafe = safeSpeed(alt);
  let notch = lastNotch;
  if (-snapshot.vy > vSafe) notch = 4;
  else if (-snapshot.vy < vSafe * 0.6) notch = 0;
  if (alt < 8 && snapshot.vy > -2.6) notch = 0;
  return { rotate: 0, notch };
}

// Descends the same way but holds touchdown speed in the gentle band,
// so the contact violates the vertical tolerance and costs one hull
// segment without destroying the craft.
export function gentleImpactStep(snapshot, lastNotch) {
  const alt = altitudeOf(snapshot);
  if (alt < 45) {
    if (snapshot.vy < -8) return { rotate: 0, notch: 4 };
    if (snapshot.vy > -6) return { rotate: 0, notch: 0 };
    return { rotate: 0, notch: lastNotch };
  }
  const vSafe = safeSpeed(alt);
  let notch = lastNotch;
  if (-snapshot.vy > vSafe) notch = 4;
  else if (-snapshot.vy < vSafe * 0.6) notch = 0;
  return { rotate: 0, notch };
}

// True once the run is terminal or the craft is at rest; the flows'
// stopping condition.
export function settledOrResting(snapshot) {
  if (snapshot.outcome !== null) return true;
  if (snapshot.craftState !== 'flying') return true;
  return snapshot.inContact && snapshot.vx === 0 && snapshot.vy === 0 && snapshot.thrustNotch === 0;
}
