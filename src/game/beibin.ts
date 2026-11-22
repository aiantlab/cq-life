import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { makeConcrete } from './textures';
import { BEIBIN } from './ground';
import { loadBeibinExtract, buildMapFromExtract } from './mapmesh';
import { createAgentSystem, type AgentSystem } from './agents';
import {
  loadWorldfolkBundle,
  addPlaceLabels,
  createBeibinMiniMap,
  type MiniMapHandle,
} from './worldfolk';
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
  agents: AgentSystem;
  attribution: string;
  minimap: MiniMapHandle;
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
 * Worldfolk-method Beibin city building (not Accra skin-swap):
 * OSM-grounded extract + beibin-v1 manifest/streets/places → 3D ribbons/footprints,
 * named labels, canvas minimap, river, gameplay POIs, inhabited agents.
 */
export async function buildBeibinRoad(
  parent: THREE.Object3D,
  onRent: () => void,
  onReturn: () => void,
): Promise<BeibinExtras> {
  const [extract, bundle] = await Promise.all([loadBeibinExtract(), loadWorldfolkBundle()]);
  const map = buildMapFromExtract(extract, parent);
  addPlaceLabels(parent, bundle.places, bundle.streets);

  const attribution =
    bundle.manifest.attribution || map.attribution || '© OpenStreetMap contributors · ODbL 1.0';

  const minimap = createBeibinMiniMap(map.roads, bundle.places, map.waterRing);
  minimap.setAttribution(attribution);

  const interactables: Interactable[] = [];
  const concrete = makeConcrete();
  const rail = new THREE.MeshStandardMaterial({ color: 0xb8c0c8, metalness: 0.55, roughness: 0.4 });

  const promo = new THREE.Mesh(
    new THREE.PlaneGeometry(190, 9),
    new THREE.MeshStandardMaterial({ color: 0x8a9098, roughness: 0.28, metalness: 0.25 }),
  );
  promo.rotation.x = -Math.PI / 2;
  promo.position.set(0, 0.045, 58);
  promo.receiveShadow = true;
  parent.add(promo);
  const railMesh = new THREE.Mesh(new THREE.BoxGeometry(190, 1.05, 0.22), rail);
  railMesh.position.set(0, 0.65, 62.2);
  parent.add(railMesh);
  map.colliders.push(
    new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(0, 0.65, 62.2), new THREE.Vector3(190, 1.05, 0.22)),
  );

  const waterGeo = new THREE.PlaneGeometry(210, BEIBIN.riverHalfDepth * 2);
  const waterReflector = new Reflector(waterGeo, {
    clipBias: 0.003,
    textureWidth: 768,
    textureHeight: 384,
    color: 0x1a3348,
  });
  waterReflector.rotation.x = -Math.PI / 2;
  waterReflector.position.set(0, -1.32, BEIBIN.riverZ);
  parent.add(waterReflector);

  const waterTint = new THREE.Mesh(
    new THREE.PlaneGeometry(210, BEIBIN.riverHalfDepth * 2),
    new THREE.MeshPhysicalMaterial({
      color: 0x0c2a3a,
      metalness: 0.2,
      roughness: 0.12,
      transmission: 0.4,
      thickness: 1.4,
      transparent: true,
      opacity: 0.42,
    }),
  );
  waterTint.rotation.x = -Math.PI / 2;
  waterTint.position.set(0, -1.25, BEIBIN.riverZ);
  parent.add(waterTint);

  for (const z of [BEIBIN.riverZ - BEIBIN.riverHalfDepth + 1.5, BEIBIN.riverZ + BEIBIN.riverHalfDepth - 1.5]) {
    for (const x of [-56, 56]) {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(88, 2.5, 3.2), concrete);
      bank.position.set(x, 0.25, z);
      bank.castShadow = true;
      parent.add(bank);
      map.colliders.push(
        new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 0.25, z), new THREE.Vector3(88, 2.5, 3.2)),
      );
    }
  }

  const bikeRack = new THREE.Group();
  bikeRack.position.set(-18, 0, 57.5);
  parent.add(bikeRack);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(8, 0.15, 1.6), concrete);
  pad.position.y = 0.08;
  bikeRack.add(pad);
  const signMat = new THREE.MeshStandardMaterial({
    color: 0x1a9b6c,
    emissive: 0x14a56f,
    emissiveIntensity: 0.55,
  });
  map.neonMats.push(signMat);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.7, 0.12), signMat);
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

  interactables.push(
    {
      id: 'bike-rent',
      label: '按 E 租共享单车 ¥5',
      position: { x: -18, y: 0, z: 57.5 },
      radius: 3.2,
      action: onRent,
    },
    {
      id: 'bike-return',
      label: '按 E 归还单车',
      position: { x: -18, y: 0, z: 57.5 },
      radius: 3.2,
      action: onReturn,
    },
    {
      id: 'beibin-hint',
      label: '北滨路 · OSM 道路网 + 地名 · 行人车流 · 可骑行',
      position: { x: 8, y: 0, z: 48 },
      radius: 8,
      action: () => {},
    },
    {
      id: 'bench',
      label: '按 E 坐下休息（恢复精力）',
      position: { x: 14, y: 0, z: 58.5 },
      radius: 2.2,
      action: () => {},
    },
  );

  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.45, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.8 }),
  );
  bench.position.set(14, 0.35, 58.5);
  parent.add(bench);

  const agents = createAgentSystem(parent, map.sidewalkPaths, map.roadPaths);

  return {
    roadMats: map.roadMats,
    lamps: map.lamps,
    neonMats: map.neonMats,
    windowMats: map.windowMats,
    waterReflector,
    colliders: map.colliders,
    bikeRack,
    bikes,
    interactables,
    agents,
    attribution,
    minimap,
  };
}
