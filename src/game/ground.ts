import * as THREE from 'three';

/** Bridge / ramp height field. Flat compound & Nanbin = 0. */
export const BRIDGE = {
  halfWidth: 7.2,
  northRampStart: 54,
  northRampEnd: 78,
  deckStart: 78,
  deckEnd: 120,
  southRampStart: 120,
  southRampEnd: 140,
  deckHeight: 9.2,
  /** Soft lateral falloff so leaving the deck doesn't cliff the height field. */
  edgeBlend: 1.25,
};

export function onBridgeDeck(x: number, z: number): boolean {
  return Math.abs(x) <= BRIDGE.halfWidth + 0.35 && z >= BRIDGE.northRampStart && z <= BRIDGE.southRampEnd;
}

export function overRiver(x: number, z: number): boolean {
  return z > 76 && z < 122 && Math.abs(x) > BRIDGE.halfWidth + 0.55;
}

/** Continuous height along bridge centerline (no seam at ramp/deck joints). */
function heightAlongZ(z: number): number {
  const { northRampStart, northRampEnd, deckStart, deckEnd, southRampStart, southRampEnd, deckHeight } = BRIDGE;
  if (z < northRampStart || z > southRampEnd) return 0;
  if (z < northRampEnd) {
    const t = THREE.MathUtils.smoothstep(northRampStart, northRampEnd, z);
    return t * deckHeight;
  }
  if (z <= deckEnd) return deckHeight;
  if (z <= southRampEnd) {
    const t = 1 - THREE.MathUtils.smoothstep(southRampStart, southRampEnd, z);
    return t * deckHeight;
  }
  return 0;
}

/**
 * Sample ground height in meters. Soft-blends at bridge edges to avoid
 * float/jitter when the player/car clips the rail laterally.
 */
export function sampleGround(x: number, z: number): number {
  const h = heightAlongZ(z);
  if (h <= 0) return 0;
  const ax = Math.abs(x);
  const edge = BRIDGE.halfWidth;
  if (ax <= edge) return h;
  if (ax >= edge + BRIDGE.edgeBlend) return 0;
  const u = 1 - (ax - edge) / BRIDGE.edgeBlend;
  // smoothstep falloff
  return h * (u * u * (3 - 2 * u));
}

/** Approximate slope pitch (radians) for car visual tilt. */
export function sampleSlopePitch(x: number, z: number): number {
  const dz = 0.6;
  const h0 = sampleGround(x, z - dz);
  const h1 = sampleGround(x, z + dz);
  return Math.atan2(h0 - h1, dz * 2);
}

export const WORLD_BOUNDS = {
  minX: -95,
  maxX: 95,
  minZ: -55,
  maxZ: 195,
};
