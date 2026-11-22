import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { makeWetAsphalt, makeConcrete, makePlaster, makeBrick } from './textures';
import { BRIDGE } from './ground';
import type { Interactable } from './types';

export interface NanbinExtras {
  roadMats: THREE.MeshStandardMaterial[];
  lamps: THREE.PointLight[];
  neonMats: THREE.MeshStandardMaterial[];
  windowMats: THREE.MeshStandardMaterial[];
  waterReflector: Reflector;
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
  for (let f = 0; f < floors; f++) {
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
 * Connector from 双钢路 gate → 东水门大桥 → 南滨路 riverside arterial.
 * Prototype layout (not 1:1 brands). Real-world scale meters.
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

  // —— Approach from compound gate toward bridge (south) ——
  const approach = new THREE.Mesh(new THREE.PlaneGeometry(16, 28), roadMat);
  approach.rotation.x = -Math.PI / 2;
  approach.position.set(0, 0.025, 58);
  approach.receiveShadow = true;
  parent.add(approach);
  // widen to arterial feel before ramp
  const approachWide = new THREE.Mesh(new THREE.PlaneGeometry(22, 18), roadMat);
  approachWide.rotation.x = -Math.PI / 2;
  approachWide.position.set(0, 0.026, 68);
  approachWide.receiveShadow = true;
  parent.add(approachWide);

  for (const z of [52, 58, 64, 70]) {
    lamp(parent, lamps, -8, z);
    lamp(parent, lamps, 8, z);
  }

  // —— River (长江) with realtime reflections ——
  const waterGeo = new THREE.PlaneGeometry(210, 48, 1, 1);
  const waterReflector = new Reflector(waterGeo, {
    clipBias: 0.003,
    // Feel/FPS: half-res reflection is enough for wet river read at night
    textureWidth: 512,
    textureHeight: 256,
    color: 0x1a3348,
  });
  waterReflector.rotation.x = -Math.PI / 2;
  waterReflector.position.set(0, -1.35, 99);
  parent.add(waterReflector);

  // tint / wave-ish dark glass overlay for wet body feel
  const waterTint = new THREE.Mesh(
    new THREE.PlaneGeometry(210, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0x0c2a3a,
      metalness: 0.15,
      roughness: 0.18,
      transmission: 0.35,
      thickness: 1.2,
      transparent: true,
      opacity: 0.45,
      envMapIntensity: 1.2,
    }),
  );
  waterTint.rotation.x = -Math.PI / 2;
  waterTint.position.set(0, -1.28, 99);
  parent.add(waterTint);

  // Embankments left/right of bridge gap (visual + collision)
  for (const z of [76.5, 121.5]) {
    box(90, 2.6, 3.5, concrete, -58, 0.3, z, parent, colliders);
    box(90, 2.6, 3.5, concrete, 58, 0.3, z, parent, colliders);
    // visual continuum closer to water
    box(90, 1.6, 2.2, concrete, -58, -0.2, z + (z < 100 ? 1.2 : -1.2), parent);
    box(90, 1.6, 2.2, concrete, 58, -0.2, z + (z < 100 ? 1.2 : -1.2), parent);
  }

  // —— Dongshuimen-style bridge ——
  const deckW = BRIDGE.halfWidth * 2;
  const deckH = BRIDGE.deckHeight;
  // North ramp (mesh follows height via stepped segments)
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
    const len = z1 - z0;
    const pitch = Math.atan2(y1 - y0, len);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.45, len * 1.05), roadMat);
    seg.position.set(0, yMid, zMid);
    seg.rotation.x = -pitch;
    seg.receiveShadow = true;
    seg.castShadow = true;
    parent.add(seg);
  }
  // Main deck
  const deckLen = BRIDGE.deckEnd - BRIDGE.deckStart;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.5, deckLen), roadMat);
  deck.position.set(0, deckH, (BRIDGE.deckStart + BRIDGE.deckEnd) / 2);
  deck.receiveShadow = true;
  deck.castShadow = true;
  parent.add(deck);
  // Lane markings feel via thin emissive strip
  const centerLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.06, deckLen * 0.92),
    new THREE.MeshStandardMaterial({ color: 0xfff2a8, emissive: 0x886600, emissiveIntensity: 0.25 }),
  );
  centerLine.position.set(0, deckH + 0.28, (BRIDGE.deckStart + BRIDGE.deckEnd) / 2);
  parent.add(centerLine);

  // South ramp
  for (let i = 0; i < rampSegs; i++) {
    const t0 = i / rampSegs;
    const t1 = (i + 1) / rampSegs;
    const z0 = THREE.MathUtils.lerp(BRIDGE.southRampStart, BRIDGE.southRampEnd, t0);
    const z1 = THREE.MathUtils.lerp(BRIDGE.southRampStart, BRIDGE.southRampEnd, t1);
    const y0 = THREE.MathUtils.lerp(deckH, 0, t0);
    const y1 = THREE.MathUtils.lerp(deckH, 0, t1);
    const zMid = (z0 + z1) / 2;
    const yMid = (y0 + y1) / 2;
    const len = z1 - z0;
    const pitch = Math.atan2(y0 - y1, len);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.45, len * 1.05), roadMat);
    seg.position.set(0, yMid, zMid);
    seg.rotation.x = pitch;
    seg.receiveShadow = true;
    parent.add(seg);
  }

  // Bridge railings + barriers (colliders)
  for (const side of [-1, 1] as const) {
    const x = side * (BRIDGE.halfWidth - 0.15);
    box(0.35, 1.35, deckLen + 4, rail, x, deckH + 0.9, (BRIDGE.deckStart + BRIDGE.deckEnd) / 2, parent, colliders);
    // ramp rails approx
    box(0.35, 1.2, 26, rail, x, deckH * 0.55, 66, parent, colliders);
    box(0.35, 1.2, 22, rail, x, deckH * 0.55, 130, parent, colliders);
  }

  // Piers in river
  for (const z of [86, 99, 112]) {
    for (const x of [-4.2, 4.2]) {
      box(1.8, deckH + 2.5, 2.4, concrete, x, (deckH + 2.5) / 2 - 1.5, z, parent);
      box(3.2, 0.8, 3.6, concrete, x, -0.6, z, parent);
    }
  }
  // Arch / cable suggestion (steel towers)
  for (const z of [90, 108]) {
    box(1.2, 14, 1.2, steel, -BRIDGE.halfWidth - 0.8, deckH + 7, z, parent);
    box(1.2, 14, 1.2, steel, BRIDGE.halfWidth + 0.8, deckH + 7, z, parent);
    box(deckW + 2.5, 0.5, 0.5, steel, 0, deckH + 13.5, z, parent);
  }

  // Bridge lights
  for (let z = 80; z <= 118; z += 8) {
    lamp(parent, lamps, -BRIDGE.halfWidth + 0.6, z, deckH, 0xffe0a8, 18);
    lamp(parent, lamps, BRIDGE.halfWidth - 0.6, z, deckH, 0xffe0a8, 18);
  }

  // —— 南滨路 arterial ——
  const nanbinZ = 148;
  const arterial = new THREE.Mesh(new THREE.PlaneGeometry(180, 22), roadMat);
  arterial.rotation.x = -Math.PI / 2;
  arterial.position.set(0, 0.03, nanbinZ);
  arterial.receiveShadow = true;
  parent.add(arterial);
  // riverside promenade
  const promo = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 10),
    new THREE.MeshStandardMaterial({ color: 0x8a9098, roughness: 0.35, metalness: 0.2 }),
  );
  promo.rotation.x = -Math.PI / 2;
  promo.position.set(0, 0.04, 135);
  promo.receiveShadow = true;
  parent.add(promo);
  // railing along promenade
  box(180, 1.1, 0.25, rail, 0, 0.7, 130.2, parent, colliders);

  // median strip
  box(160, 0.15, 1.2, new THREE.MeshStandardMaterial({ color: 0x3a6b45, roughness: 0.85 }), 0, 0.12, nanbinZ, parent);

  // Street lamps along Nanbin (dense night feel)
  for (let x = -80; x <= 80; x += 14) {
    lamp(parent, lamps, x, nanbinZ - 9, 0, 0xffd9a0, 26);
    lamp(parent, lamps, x, nanbinZ + 9, 0, 0xffd9a0, 26);
    lamp(parent, lamps, x, 134, 0, 0xc8e4ff, 16); // cooler promenade lights
  }

  // Sidewalks
  const walkMat = makeConcrete();
  for (const zz of [nanbinZ - 12.5, nanbinZ + 12.5]) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(180, 3.5), walkMat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(0, 0.05, zz);
    walk.receiveShadow = true;
    parent.add(walk);
  }

  // —— Waterfront building density (generic, no real mall brands) ——
  const blockColors = [plaster, plasterDark, brick];
  let bi = 0;
  for (let x = -78; x <= 78; x += 14) {
    const w = 11 + (bi % 3) * 1.5;
    const d = 12 + (bi % 2) * 3;
    const floors = 8 + (bi % 6);
    const h = floors * 3.15 + 1;
    const z = 162 + (bi % 3) * 2;
    const mat = blockColors[bi % 3];
    box(w, h, d, mat, x, h / 2, z, parent, colliders);
    // commercial ground glow strip (anonymous)
    const neon = new THREE.MeshStandardMaterial({
      color: bi % 2 === 0 ? 0xff6b8a : 0x5ec8ff,
      emissive: bi % 2 === 0 ? 0xff2d55 : 0x2db7ff,
      emissiveIntensity: 0.7,
      roughness: 0.4,
    });
    neonMats.push(neon);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 1.6, 0.2), neon);
    strip.position.set(x, 1.4, z - d / 2 - 0.15);
    parent.add(strip);
    // canopy
    box(w * 0.9, 0.12, 1.8, new THREE.MeshStandardMaterial({ color: 0x222830, roughness: 0.7 }), x, 2.5, z - d / 2 - 0.9, parent);
    facadeWindows(parent, windowMats, x, z, w, d, floors, 'z-');
    // roof plant / parapet
    box(w + 0.3, 0.4, d + 0.3, concrete, x, h + 0.2, z, parent);
    bi++;
  }

  // Second row slightly taller towers for density (no castShadow — FPS)
  for (let x = -70; x <= 70; x += 18) {
    const floors = 14 + (Math.abs(x) % 5);
    const h = floors * 3.2;
    const z = 178;
    const tower = box(10, h, 10, plasterDark, x, h / 2, z, parent, colliders);
    tower.castShadow = false;
    facadeWindows(parent, windowMats, x, z, 10, 10, Math.min(floors, 12), 'z-');
    const neon = new THREE.MeshStandardMaterial({
      color: 0xffb454,
      emissive: 0xff8a1f,
      emissiveIntensity: 0.55,
      roughness: 0.45,
    });
    neonMats.push(neon);
    box(8, 1.2, 0.25, neon, x, 3.2, z - 5.2, parent);
  }

  // North-bank urban fillers near approach (Yuzhong side of river, not tourist mega-map)
  for (let x = -40; x <= 40; x += 16) {
    if (Math.abs(x) < 12) continue;
    const h = 18 + (x % 7) * 2;
    box(10, h, 10, plaster, x, h / 2, 62, parent, colliders);
  }

  return { roadMats, lamps, neonMats, windowMats, waterReflector, colliders };
}

export function nanbinHintInteractable(): Interactable {
  return {
    id: 'nanbin-hint',
    label: '沿路南行：东水门大桥 → 南滨路',
    position: { x: 0, y: 0, z: 50 },
    radius: 6,
    action: () => {},
  };
}
