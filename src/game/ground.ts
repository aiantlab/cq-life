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
};

export function onBridgeDeck(x: number, z: number): boolean {
  return Math.abs(x) <= BRIDGE.halfWidth + 0.4 && z >= BRIDGE.northRampStart && z <= BRIDGE.southRampEnd;
}

export function overRiver(x: number, z: number): boolean {
  // Yangtze channel under / beside bridge
  return z > 76 && z < 122 && Math.abs(x) > BRIDGE.halfWidth + 0.6;
}

export function sampleGround(x: number, z: number): number {
  if (Math.abs(x) > BRIDGE.halfWidth) return 0;
  const { northRampStart, northRampEnd, deckStart, deckEnd, southRampStart, southRampEnd, deckHeight } = BRIDGE;
  if (z >= northRampStart && z < northRampEnd) {
    return THREE.MathUtils.mapLinear(z, northRampStart, northRampEnd, 0, deckHeight);
  }
  if (z >= deckStart && z <= deckEnd) return deckHeight;
  if (z > southRampStart && z <= southRampEnd) {
    return THREE.MathUtils.mapLinear(z, southRampStart, southRampEnd, deckHeight, 0);
  }
  return 0;
}

export const WORLD_BOUNDS = {
  minX: -95,
  maxX: 95,
  minZ: -55,
  maxZ: 195,
};
