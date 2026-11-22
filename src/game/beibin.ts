import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { makeWetAsphalt, makeConcrete, makePlaster } from './textures';
import { BEIBIN, BRIDGE } from './ground';
import type { Interactable } from './types';

export interface BeibinExtras {
  roadMats: THREE.MeshStandardMaterial[];
  lamps: THREE.PointLight[];
  neonMats: THREE.MeshStandardMaterial[];
  windowMats: THREE.MeshStandardMaterial[];
  waterReflector: Reflector;
  colliders: THREE.Box3[];
  bikeRack: THREE.Group;
  bikes: THREE.Group[];
  interactables: Interactable[];
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
  dist = 24,
) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, metalness: 0.65, roughness: 0.35 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.4, 8), poleMat);
  pole.position.set(x, y + 3.2, z);
  parent.add(pole);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: color, emissiveIntensity: 0.55 }),
  );
  head.position.set(x, y + 6.5, z);
  parent.add(head);
  const light = new THREE.PointLight(color, 0, dist, 2);
  light.position.set(x, y + 6.3, z);
  parent.add(light);
  lamps.push(light);
}

export function makeBicycle(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'bike';
  const frame = new THREE.MeshStandardMaterial({ color: 0x2f6fed, metalness: 0.45, roughness: 0.35 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.05, 8), frame);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 0.72, 0.05);
  g.add(bar);
  const down = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), frame);
  down.position.set(0, 0.45, 0.15);
  down.rotation.x = 0.4;
  g.add(down);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.32), black);
  seat.position.set(0, 0.92, -0.15);
  g.add(seat);
  for (const z of [0.55, -0.55]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 8, 16), black);
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(0, 0.32, z);
    g.add(wheel);
  }
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8), black);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0, 0.95, 0.45);
  g.add(handle);
  return g;
}

/**
 * 江北北滨路 — primary riverside arterial outside the compound gate.
 * River = 嘉陵江 side. Bike rental on the promenade.
 */
export function buildBeibinRoad(
  parent: THREE.Object3D,
  onRent: () => void,
  onReturn: () => void,
): BeibinExtras {
  const roadMats: THREE.MeshStandardMaterial[] = [];
  const lamps: THREE.PointLight[] = [];
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const windowMats: THREE.MeshStandardMaterial[] = [];
  const colliders: THREE.Box3[] = [];
  const interactables: Interactable[] = [];

  const roadMat = makeWetAsphalt();
  roadMat.map!.repeat.set(18, 3);
  roadMats.push(roadMat);
  const concrete = makeConcrete();
  const plaster = makePlaster('#d9d3c8');
  const rail = new THREE.MeshStandardMaterial({ color: 0xb8c0c8, metalness: 0.55, roughness: 0.4 });

  const zRoad = BEIBIN.roadZ;

  // Arterial — realistic width (~22m)
  const arterial = new THREE.Mesh(new THREE.PlaneGeometry(190, 22), roadMat);
  arterial.rotation.x = -Math.PI / 2;
  arterial.position.set(0, 0.03, zRoad);
  arterial.receiveShadow = true;
  parent.add(arterial);

  // Lane divider
  box(170, 0.12, 0.9, new THREE.MeshStandardMaterial({ color: 0x3a6b45, roughness: 0.85 }), 0, 0.1, zRoad, parent);

  // Sidewalks
  for (const zz of [zRoad - 12.2, zRoad + 12.2]) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(190, 3.2), concrete);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(0, 0.045, zz);
    walk.receiveShadow = true;
    parent.add(walk);
  }

  // Connector from compound gate to Beibin
  const connector = new THREE.Mesh(new THREE.PlaneGeometry(14, 18), roadMat);
  connector.rotation.x = -Math.PI / 2;
  connector.position.set(0, 0.028, 36);
  connector.receiveShadow = true;
  parent.add(connector);

  // Riverside promenade (between road and river)
  const promo = new THREE.Mesh(
    new THREE.PlaneGeometry(190, 9),
    new THREE.MeshStandardMaterial({ color: 0x8a9098, roughness: 0.32, metalness: 0.22 }),
  );
  promo.rotation.x = -Math.PI / 2;
  promo.position.set(0, 0.04, 58);
  promo.receiveShadow = true;
  parent.add(promo);
  box(190, 1.05, 0.22, rail, 0, 0.65, 62.2, parent, colliders);

  // Street lamps along Beibin
  for (let x = -85; x <= 85; x += 12) {
    lamp(parent, lamps, x, zRoad - 9, 0, 0xffd9a0, 26);
    lamp(parent, lamps, x, zRoad + 9, 0, 0xffd9a0, 26);
    lamp(parent, lamps, x, 59, 0, 0xc8e4ff, 18);
  }

  // —— 嘉陵江 reflections ——
  const waterGeo = new THREE.PlaneGeometry(210, BEIBIN.riverHalfDepth * 2, 1, 1);
  const waterReflector = new Reflector(waterGeo, {
    clipBias: 0.003,
    textureWidth: 512,
    textureHeight: 256,
    color: 0x1a3348,
  });
  waterReflector.rotation.x = -Math.PI / 2;
  waterReflector.position.set(0, -1.35, BEIBIN.riverZ);
  parent.add(waterReflector);

  const waterTint = new THREE.Mesh(
    new THREE.PlaneGeometry(210, BEIBIN.riverHalfDepth * 2),
    new THREE.MeshPhysicalMaterial({
      color: 0x0c2a3a,
      metalness: 0.15,
      roughness: 0.18,
      transmission: 0.35,
      thickness: 1.2,
      transparent: true,
      opacity: 0.45,
    }),
  );
  waterTint.rotation.x = -Math.PI / 2;
  waterTint.position.set(0, -1.28, BEIBIN.riverZ);
  parent.add(waterTint);

  // Embankments left/right of bridge gap (bridge corridor stays open)
  const bankZNorth = BEIBIN.riverZ - BEIBIN.riverHalfDepth + 1.5;
  const bankZSouth = BEIBIN.riverZ + BEIBIN.riverHalfDepth - 1.5;
  for (const z of [bankZNorth, bankZSouth]) {
    box(88, 2.5, 3.2, concrete, -56, 0.25, z, parent, colliders);
    box(88, 2.5, 3.2, concrete, 56, 0.25, z, parent, colliders);
  }

  // North-bank fill buildings along Beibin (inland / east-west density, not tourist landmarks)
  for (let x = -80; x <= 80; x += 15) {
    if (Math.abs(x) < 10) continue; // leave gate sightline
    const w = 11 + (Math.abs(x) % 4);
    const floors = 9 + (Math.abs(x) % 5);
    const h = floors * 3.1;
    const z = 28 + (Math.abs(x) % 3);
    // only east/west of compound walls
    if (Math.abs(x) < 52) continue;
    box(w, h, 10, plaster, x, h / 2, z, parent, colliders);
    const neon = new THREE.MeshStandardMaterial({
      color: x % 2 === 0 ? 0xff6b8a : 0x5ec8ff,
      emissive: x % 2 === 0 ? 0xff2d55 : 0x2db7ff,
      emissiveIntensity: 0.65,
      roughness: 0.4,
    });
    neonMats.push(neon);
    box(w * 0.8, 1.4, 0.2, neon, x, 1.3, z - 5.1, parent);
  }

  // —— Bike rental rack on promenade ——
  const bikeRack = new THREE.Group();
  bikeRack.position.set(-18, 0, 57.5);
  parent.add(bikeRack);
  box(8, 0.15, 1.6, concrete, 0, 0.08, 0, bikeRack);
  box(8, 1.1, 0.12, rail, 0, 0.7, -0.7, bikeRack, colliders);
  const signMat = new THREE.MeshStandardMaterial({
    color: 0x1a9b6c,
    emissive: 0x14a56f,
    emissiveIntensity: 0.55,
  });
  neonMats.push(signMat);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.12), signMat);
  sign.position.set(0, 1.6, -0.7);
  bikeRack.add(sign);

  const bikes: THREE.Group[] = [];
  for (let i = 0; i < 5; i++) {
    const b = makeBicycle();
    b.position.set(-2.8 + i * 1.35, 0, 0.15);
    b.rotation.y = Math.PI / 2;
    bikeRack.add(b);
    bikes.push(b);
  }

  interactables.push({
    id: 'bike-rent',
    label: '按 E 租共享单车 ¥5（再按 F 下车/还车点还车）',
    position: { x: -18, y: 0, z: 57.5 },
    radius: 3.2,
    action: onRent,
  });
  interactables.push({
    id: 'bike-return',
    label: '按 E 归还单车',
    position: { x: -18, y: 0, z: 57.5 },
    radius: 3.2,
    action: onReturn,
  });
  interactables.push({
    id: 'beibin-hint',
    label: '北滨路 · 向东可继续骑行 / 向南过桥可达南滨（可选）',
    position: { x: 8, y: 0, z: 48 },
    radius: 7,
    action: () => {},
  });

  // Keep bridge approach stub south of river for optional Nanbin trip
  void BRIDGE;

  return {
    roadMats,
    lamps,
    neonMats,
    windowMats,
    waterReflector,
    colliders,
    bikeRack,
    bikes,
    interactables,
  };
}
