import * as THREE from 'three';
import { makeWetAsphalt, makeConcrete, makePlaster, makeBrick } from './textures';
import { BRIDGE } from './ground';

export interface NanbinExtras {
  roadMats: THREE.MeshStandardMaterial[];
  lamps: THREE.PointLight[];
  neonMats: THREE.MeshStandardMaterial[];
  windowMats: THREE.MeshStandardMaterial[];
  colliders: THREE.Box3[];
}

function box(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x: number,
  y: number,
  z: number,
  parent: THREE.Object3D,
  colliders?: THREE.Box3[],
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  if (colliders) {
    colliders.push(
      new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, y, z), new THREE.Vector3(w, h, d)),
    );
  }
  return mesh;
}

function lamp(
  parent: THREE.Object3D,
  lamps: THREE.PointLight[],
  x: number,
  z: number,
  y = 0,
  color = 0xffc978,
  dist = 22,
) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, metalness: 0.65, roughness: 0.35 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.2, 8), poleMat);
  pole.position.set(x, y + 3.1, z);
  parent.add(pole);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: color, emissiveIntensity: 0.55 }),
  );
  head.position.set(x, y + 6.3, z);
  parent.add(head);
  const light = new THREE.PointLight(color, 0, dist, 2);
  light.position.set(x, y + 6.1, z);
  parent.add(light);
  lamps.push(light);
}

function facadeWindows(
  parent: THREE.Object3D,
  mats: THREE.MeshStandardMaterial[],
  x: number,
  z: number,
  w: number,
  d: number,
  floors: number,
  facing: 'z-' | 'z+',
) {
  const glass = new THREE.MeshStandardMaterial({
    color: 0x8eb6d8,
    roughness: 0.12,
    metalness: 0.25,
    emissive: 0xffc878,
    emissiveIntensity: 0,
  });
  mats.push(glass);
  const per = Math.max(3, Math.floor(w / 3.2));
  for (let f = 0; f < Math.min(floors, 10); f++) {
    for (let i = 0; i < per; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.5), glass);
      const px = x - w / 2 + 2 + i * ((w - 4) / Math.max(1, per - 1));
      const pz = facing === 'z-' ? z - d / 2 - 0.04 : z + d / 2 + 0.04;
      m.position.set(px, 2.2 + f * 3.15, pz);
      if (facing === 'z+') m.rotation.y = Math.PI;
      parent.add(m);
    }
  }
}

/**
 * Optional later destination: 东水门桥 → 南滨路 (south of 嘉陵江 / 江北北滨).
 * River mesh lives in beibin.ts — this only builds bridge + Nanbin stretch.
 */
export function buildNanbinCorridor(parent: THREE.Object3D): NanbinExtras {
  const roadMats: THREE.MeshStandardMaterial[] = [];
  const lamps: THREE.PointLight[] = [];
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const windowMats: THREE.MeshStandardMaterial[] = [];
  const colliders: THREE.Box3[] = [];

  const roadMat = makeWetAsphalt();
  roadMat.map!.repeat.set(14, 4);
  roadMats.push(roadMat);
  const concrete = makeConcrete();
  const plaster = makePlaster('#d8d2c8');
  const plasterDark = makePlaster('#c4b8a8');
  const brick = makeBrick('#6a5346');
  const steel = new THREE.MeshStandardMaterial({ color: 0x4a5562, metalness: 0.75, roughness: 0.35 });
  const rail = new THREE.MeshStandardMaterial({ color: 0xb8c0c8, metalness: 0.55, roughness: 0.4 });
  void brick;

  // Approach from south river bank to bridge
  const approach = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), roadMat);
  approach.rotation.x = -Math.PI / 2;
  approach.position.set(0, 0.025, BRIDGE.northRampStart - 6);
  approach.receiveShadow = true;
  parent.add(approach);

  const deckW = BRIDGE.halfWidth * 2;
  const deckH = BRIDGE.deckHeight;
  const rampSegs = 8;

  for (let i = 0; i < rampSegs; i++) {
    const t0 = i / rampSegs;
    const t1 = (i + 1) / rampSegs;
    const z0 = THREE.MathUtils.lerp(BRIDGE.northRampStart, BRIDGE.northRampEnd, t0);
    const z1 = THREE.MathUtils.lerp(BRIDGE.northRampStart, BRIDGE.northRampEnd, t1);
    const y0 = THREE.MathUtils.lerp(0, deckH, t0);
    const y1 = THREE.MathUtils.lerp(0, deckH, t1);
    const zMid = (z0 + z1) / 2;
    const yMid = (y0 + y1) / 2;
    const len = Math.max(0.2, z1 - z0);
    const pitch = Math.atan2(y1 - y0, len);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.45, len * 1.05), roadMat);
    seg.position.set(0, yMid, zMid);
    seg.rotation.x = -pitch;
    seg.receiveShadow = true;
    parent.add(seg);
  }

  const deckLen = BRIDGE.deckEnd - BRIDGE.deckStart;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.5, deckLen), roadMat);
  deck.position.set(0, deckH, (BRIDGE.deckStart + BRIDGE.deckEnd) / 2);
  deck.receiveShadow = true;
  parent.add(deck);

  for (let i = 0; i < rampSegs; i++) {
    const t0 = i / rampSegs;
    const t1 = (i + 1) / rampSegs;
    const z0 = THREE.MathUtils.lerp(BRIDGE.southRampStart, BRIDGE.southRampEnd, t0);
    const z1 = THREE.MathUtils.lerp(BRIDGE.southRampStart, BRIDGE.southRampEnd, t1);
    const y0 = THREE.MathUtils.lerp(deckH, 0, t0);
    const y1 = THREE.MathUtils.lerp(deckH, 0, t1);
    const zMid = (z0 + z1) / 2;
    const yMid = (y0 + y1) / 2;
    const len = Math.max(0.2, z1 - z0);
    const pitch = Math.atan2(y0 - y1, len);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.45, len * 1.05), roadMat);
    seg.position.set(0, yMid, zMid);
    seg.rotation.x = pitch;
    seg.receiveShadow = true;
    parent.add(seg);
  }

  for (const side of [-1, 1] as const) {
    const x = side * (BRIDGE.halfWidth - 0.15);
    box(0.35, 1.35, deckLen + 4, rail, x, deckH + 0.9, (BRIDGE.deckStart + BRIDGE.deckEnd) / 2, parent, colliders);
  }

  for (const z of [88, 98, 108]) {
    for (const x of [-4.2, 4.2]) {
      box(1.8, deckH + 2.5, 2.4, concrete, x, (deckH + 2.5) / 2 - 1.5, z, parent);
    }
  }
  for (const z of [92, 112]) {
    box(1.2, 14, 1.2, steel, -BRIDGE.halfWidth - 0.8, deckH + 7, z, parent);
    box(1.2, 14, 1.2, steel, BRIDGE.halfWidth + 0.8, deckH + 7, z, parent);
    box(deckW + 2.5, 0.5, 0.5, steel, 0, deckH + 13.5, z, parent);
  }

  for (let z = BRIDGE.deckStart + 4; z <= BRIDGE.deckEnd - 4; z += 10) {
    lamp(parent, lamps, -BRIDGE.halfWidth + 0.6, z, deckH, 0xffe0a8, 18);
    lamp(parent, lamps, BRIDGE.halfWidth - 0.6, z, deckH, 0xffe0a8, 18);
  }

  // 南滨路 (optional destination)
  const nanbinZ = 152;
  const arterial = new THREE.Mesh(new THREE.PlaneGeometry(160, 22), roadMat);
  arterial.rotation.x = -Math.PI / 2;
  arterial.position.set(0, 0.03, nanbinZ);
  arterial.receiveShadow = true;
  parent.add(arterial);
  box(140, 0.15, 1.2, new THREE.MeshStandardMaterial({ color: 0x3a6b45, roughness: 0.85 }), 0, 0.12, nanbinZ, parent);

  for (let x = -70; x <= 70; x += 14) {
    lamp(parent, lamps, x, nanbinZ - 9);
    lamp(parent, lamps, x, nanbinZ + 9);
  }

  let bi = 0;
  for (let x = -70; x <= 70; x += 14) {
    const w = 11 + (bi % 3);
    const d = 12;
    const floors = 8 + (bi % 5);
    const h = floors * 3.15 + 1;
    const z = 166;
    box(w, h, d, bi % 2 ? plaster : plasterDark, x, h / 2, z, parent, colliders);
    const neon = new THREE.MeshStandardMaterial({
      color: bi % 2 === 0 ? 0xff6b8a : 0x5ec8ff,
      emissive: bi % 2 === 0 ? 0xff2d55 : 0x2db7ff,
      emissiveIntensity: 0.7,
      roughness: 0.4,
    });
    neonMats.push(neon);
    box(w * 0.85, 1.6, 0.2, neon, x, 1.4, z - d / 2 - 0.15, parent);
    facadeWindows(parent, windowMats, x, z, w, d, floors, 'z-');
    bi++;
  }

  for (let x = -60; x <= 60; x += 20) {
    const floors = 14;
    const h = floors * 3.2;
    const z = 178;
    const tower = box(10, h, 10, plasterDark, x, h / 2, z, parent, colliders);
    tower.castShadow = false;
  }

  return { roadMats, lamps, neonMats, windowMats, colliders };
}
