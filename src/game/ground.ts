import * as THREE from 'three';

/**
 * Layout — 江北北滨路 start:
 *   compound → Beibin arterial (z≈48) → promenade → 嘉陵江 (under bridge)
 *   → optional 东水门桥 → 南滨路
 */
export const BRIDGE = {
  halfWidth: 7.2,
  northRampStart: 58,
  northRampEnd: 78,
  deckStart: 78,
  deckEnd: 118,
  southRampStart: 118,
  southRampEnd: 138,
  deckHeight: 9.2,
  edgeBlend: 1.25,
};

export const BEIBIN = {
  roadZ: 48,
  roadHalfWidth: 11,
  /** River center; half-depth so water sits under the bridge deck. */
  riverZ: 90,
  riverHalfDepth: 26,
};

export function onBridgeDeck(x: number, z: number): boolean {
  return Math.abs(x) <= BRIDGE.halfWidth + 0.35 && z >= BRIDGE.northRampStart && z <= BRIDGE.southRampEnd;
}

export function overRiver(_x: number, z: number): boolean {
  const z0 = BEIBIN.riverZ - BEIBIN.riverHalfDepth;
  const z1 = BEIBIN.riverZ + BEIBIN.riverHalfDepth;
  if (z <= z0 || z >= z1) return false;
  // On bridge corridor = traversable
  if (onBridgeDeck(_x, z)) return false;
  return true;
}

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

export function sampleGround(x: number, z: number): number {
  const h = heightAlongZ(z);
  if (h <= 0) return 0;
  const ax = Math.abs(x);
  const edge = BRIDGE.halfWidth;
  if (ax <= edge) return h;
  if (ax >= edge + BRIDGE.edgeBlend) return 0;
  const u = 1 - (ax - edge) / BRIDGE.edgeBlend;
  return h * (u * u * (3 - 2 * u));
}

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
  maxZ: 220,
};
