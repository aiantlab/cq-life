import * as THREE from 'three';
import {
  makeAsphalt,
  makeWetAsphalt,
  makeConcrete,
  makeBrick,
  makePlaster,
  makeGrass,
  makeWood,
  makeGlass,
  makeMosaic,
} from './textures';
import type { Interactable } from './types';

export interface WorldHandles {
  group: THREE.Group;
  colliders: THREE.Box3[];
  interactables: Interactable[];
  roadMat: THREE.MeshStandardMaterial;
  lamps: THREE.PointLight[];
  storeGlow: THREE.MeshStandardMaterial[];
  windowMats: THREE.MeshStandardMaterial[];
  car: THREE.Group;
  homeDoor: THREE.Object3D;
  storeDoor: THREE.Object3D;
  spawn: THREE.Vector3;
  carSpawn: THREE.Vector3;
}

function box(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material | THREE.Material[],
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

function windowStrip(
  parent: THREE.Object3D,
  mats: THREE.MeshStandardMaterial[],
  x0: number,
  z0: number,
  facing: 'x+' | 'x-' | 'z+' | 'z-',
  floors: number,
  perFloor: number,
  width: number,
  depth: number,
) {
  const glass = new THREE.MeshStandardMaterial({
    color: 0x9ec5e8,
    roughness: 0.15,
    metalness: 0.2,
    emissive: 0xffd7a0,
    emissiveIntensity: 0,
  });
  mats.push(glass);
  const ww = 1.05;
  const wh = 1.25;
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < perFloor; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), glass);
      const y = 1.35 + f * 2.9;
      let x = x0;
      let z = z0;
      if (facing === 'z+' || facing === 'z-') {
        x = x0 - width / 2 + 1.6 + i * ((width - 3.2) / Math.max(1, perFloor - 1));
        z = facing === 'z+' ? z0 + depth / 2 + 0.03 : z0 - depth / 2 - 0.03;
        m.rotation.y = facing === 'z-' ? Math.PI : 0;
      } else {
        z = z0 - depth / 2 + 1.6 + i * ((depth - 3.2) / Math.max(1, perFloor - 1));
        x = facing === 'x+' ? x0 + width / 2 + 0.03 : x0 - width / 2 - 0.03;
        m.rotation.y = facing === 'x+' ? Math.PI / 2 : -Math.PI / 2;
      }
      m.position.set(x, y, z);
      parent.add(m);
    }
  }
}

function tree(parent: THREE.Object3D, x: number, z: number, colliders: THREE.Box3[]) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.22, 2.0, 8),
    new THREE.MeshStandardMaterial({ color: 0x5b3a22, roughness: 0.9 }),
  );
  trunk.position.set(x, 1.0, z);
  trunk.castShadow = true;
  parent.add(trunk);
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(1.35, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x2f6b34, roughness: 0.85 }),
  );
  canopy.position.set(x, 2.85, z);
  canopy.castShadow = true;
  parent.add(canopy);
  colliders.push(
    new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 1.4, z), new THREE.Vector3(1.0, 2.8, 1.0)),
  );
}

function lampPost(parent: THREE.Object3D, x: number, z: number, lamps: THREE.PointLight[]) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 4.8, 8),
    new THREE.MeshStandardMaterial({ color: 0x333840, metalness: 0.6, roughness: 0.4 }),
  );
  pole.position.set(x, 2.4, z);
  parent.add(pole);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: 0xffc978, emissiveIntensity: 0.4 }),
  );
  head.position.set(x, 4.85, z);
  parent.add(head);
  const light = new THREE.PointLight(0xffc978, 0, 16, 2);
  light.position.set(x, 4.7, z);
  parent.add(light);
  lamps.push(light);
}

function makeCar(): THREE.Group {
  const car = new THREE.Group();
  car.name = 'playerCar';
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xc45c26, metalness: 0.45, roughness: 0.35 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1b2430, metalness: 0.2, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 4.2), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  car.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), cabinMat);
  cabin.position.set(0, 1.05, -0.15);
  cabin.castShadow = true;
  car.add(cabin);
  const glass = makeGlass(0x88cfff, 0.05);
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.45, 0.08), glass);
  windshield.position.set(0, 1.05, 0.95);
  car.add(windshield);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });
  for (const [wx, wz] of [
    [-0.85, 1.3],
    [0.85, 1.3],
    [-0.85, -1.3],
    [0.85, -1.3],
  ] as const) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.28, 14), wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.35, wz);
    car.add(w);
  }
  const headL = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.12, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffe08a, emissiveIntensity: 0.8 }),
  );
  headL.position.set(-0.55, 0.55, 2.12);
  car.add(headL);
  const headR = headL.clone();
  headR.position.x = 0.55;
  car.add(headR);
  return car;
}

/** Yuzhong Daxigou — 双钢路 / 钢院 ordinary renovated compound (~30 mid-rises). */
export function buildWorld(
  scene: THREE.Scene,
  onInteract: {
    enterHome: () => void;
    exitHome: () => void;
    enterStore: () => void;
    exitStore: () => void;
    eat: () => void;
    sleep: () => void;
    changeClothes: () => void;
    buyFood: () => void;
    buyDrink: () => void;
  },
): WorldHandles {
  const group = new THREE.Group();
  scene.add(group);
  const colliders: THREE.Box3[] = [];
  const interactables: Interactable[] = [];
  const lamps: THREE.PointLight[] = [];
  const storeGlow: THREE.MeshStandardMaterial[] = [];
  const windowMats: THREE.MeshStandardMaterial[] = [];

  const roadMat = makeWetAsphalt();
  const concrete = makeConcrete();
  const brickEdge = makeBrick('#6d5548');
  const plasterTrim = makePlaster('#ece8e0');
  const grass = makeGrass();
  const wood = makeWood();
  const mosaicA = makeMosaic('#e6eee6', '#5f9e6e');
  const mosaicB = makeMosaic('#eef2ea', '#4f8f62');
  const mosaicC = makeMosaic('#e2ebe3', '#6aa978');

  // Flat urban ground — ordinary compound, not hillside
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 130), concrete);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Internal road grid (捍卫路/双钢路一侧进门后的小区路网感)
  const roadH = new THREE.Mesh(new THREE.PlaneGeometry(88, 7.5), roadMat);
  roadH.rotation.x = -Math.PI / 2;
  roadH.position.set(0, 0.02, 2);
  roadH.receiveShadow = true;
  group.add(roadH);
  const roadV = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 70), roadMat);
  roadV.rotation.x = -Math.PI / 2;
  roadV.position.set(0, 0.021, -8);
  roadV.receiveShadow = true;
  group.add(roadV);
  const roadV2 = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 55), roadMat);
  roadV2.rotation.x = -Math.PI / 2;
  roadV2.position.set(-28, 0.021, -6);
  roadV2.receiveShadow = true;
  group.add(roadV2);
  const roadV3 = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 55), roadMat);
  roadV3.rotation.x = -Math.PI / 2;
  roadV3.position.set(28, 0.021, -6);
  roadV3.receiveShadow = true;
  group.add(roadV3);
  // Outside Hanwei/Shuanggang approach
  const outerRoad = new THREE.Mesh(new THREE.PlaneGeometry(16, 36), roadMat);
  outerRoad.rotation.x = -Math.PI / 2;
  outerRoad.position.set(0, 0.022, 42);
  outerRoad.receiveShadow = true;
  group.add(outerRoad);

  // Community garden / plaza (中心花园)
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(9.5, 32), concrete);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.035, -6);
  plaza.receiveShadow = true;
  group.add(plaza);
  const plazaGrass = new THREE.Mesh(new THREE.RingGeometry(3.2, 8.2, 32), grass);
  plazaGrass.rotation.x = -Math.PI / 2;
  plazaGrass.position.set(0, 0.04, -6);
  group.add(plazaGrass);
  // simple pavilion / seating block
  box(3.2, 0.35, 3.2, plasterTrim, 0, 0.25, -6, group);
  box(0.25, 2.4, 0.25, plasterTrim, -1.3, 1.4, -7.3, group);
  box(0.25, 2.4, 0.25, plasterTrim, 1.3, 1.4, -7.3, group);
  box(0.25, 2.4, 0.25, plasterTrim, -1.3, 1.4, -4.7, group);
  box(0.25, 2.4, 0.25, plasterTrim, 1.3, 1.4, -4.7, group);
  box(3.4, 0.12, 3.4, plasterTrim, 0, 2.65, -6, group);

  // Courtyard greenery beds between building rows
  for (const [x, z, w, d] of [
    [-16, 14, 12, 6],
    [16, 14, 12, 6],
    [-16, -22, 12, 7],
    [16, -22, 12, 7],
    [-40, -8, 8, 18],
    [40, -8, 8, 18],
    [-16, -38, 10, 5],
    [16, -38, 10, 5],
  ] as const) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w, d), grass);
    g.rotation.x = -Math.PI / 2;
    g.position.set(x, 0.03, z);
    g.receiveShadow = true;
    group.add(g);
  }

  // ~30 renovated mid-rise shells — white-green mosaic, ordinary 钢院 density
  const mats = [mosaicA, mosaicB, mosaicC];
  type Bldg = { x: number; z: number; w: number; d: number; floors: number; mat: THREE.Material; wpf: number };
  const buildings: Bldg[] = [];
  // West block rows
  const westXs = [-46, -34];
  const eastXs = [34, 46];
  const rowZs = [18, 6, -8, -22, -36];
  let bi = 0;
  for (const x of westXs) {
    for (const z of rowZs) {
      buildings.push({
        x,
        z,
        w: 11 + (bi % 3),
        d: 9 + (bi % 2),
        floors: 7 + (bi % 4), // mid / mid-high
        mat: mats[bi % 3],
        wpf: 4,
      });
      bi++;
    }
  }
  for (const x of eastXs) {
    for (const z of rowZs) {
      buildings.push({
        x,
        z,
        w: 11 + (bi % 3),
        d: 9 + (bi % 2),
        floors: 6 + (bi % 5),
        mat: mats[bi % 3],
        wpf: 4,
      });
      bi++;
    }
  }
  // North & south filler rows near gate / back
  for (const [x, z, floors] of [
    [-18, 22, 8],
    [18, 22, 8],
    [-18, -42, 7],
    [18, -42, 9],
    [-8, -42, 8],
    [8, -42, 8],
    [-26, 22, 7],
    [26, 22, 7],
  ] as const) {
    buildings.push({
      x,
      z,
      w: 12,
      d: 9,
      floors,
      mat: mats[bi % 3],
      wpf: 4,
    });
    bi++;
  }
  // Player home building — west-inner near plaza
  const homeB: Bldg = {
    x: -18,
    z: -8,
    w: 14,
    d: 10,
    floors: 8,
    mat: mosaicA,
    wpf: 5,
  };
  buildings.push(homeB);

  // Cap/ensure count around 30
  while (buildings.length < 30) {
    const extraZ = -30 + (buildings.length % 5) * 8;
    buildings.push({
      x: buildings.length % 2 === 0 ? -40 : 40,
      z: extraZ,
      w: 10,
      d: 8,
      floors: 7,
      mat: mats[buildings.length % 3],
      wpf: 3,
    });
  }

  buildings.forEach((b, idx) => {
    const h = b.floors * 2.9 + 0.4;
    box(b.w, h, b.d, b.mat, b.x, h / 2, b.z, group, colliders);
    // green waistband trim
    box(b.w + 0.15, 0.35, b.d + 0.15, new THREE.MeshStandardMaterial({ color: 0x4f8f62, roughness: 0.7 }), b.x, 3.2, b.z, group);
    box(b.w + 0.3, 0.45, b.d + 0.3, plasterTrim, b.x, h + 0.2, b.z, group);
    // windows on long faces only (perf)
    windowStrip(group, windowMats, b.x, b.z, 'z+', b.floors, b.wpf, b.w, b.d);
    windowStrip(group, windowMats, b.x, b.z, 'z-', b.floors, b.wpf, b.w, b.d);
    if (idx === buildings.length - 1) {
      // home balconies
      for (let f = 0; f < Math.min(4, b.floors); f++) {
        box(2.2, 0.1, 0.9, plasterTrim, b.x + 3.5, 1.0 + f * 2.9, b.z + b.d / 2 + 0.45, group);
      }
    }
  });

  // Gatehouse — 双钢路小区 / 钢院
  box(11, 3.0, 4.2, plasterTrim, -8, 1.5, 28, group, colliders);
  box(4.0, 3.0, 4.2, plasterTrim, 8, 1.5, 28, group, colliders);
  box(20, 0.45, 1.1, concrete, 0, 3.25, 28, group);
  const gateSign = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 0.85),
    new THREE.MeshStandardMaterial({ color: 0x1f6b45, emissive: 0x2f8f5c, emissiveIntensity: 0.3 }),
  );
  gateSign.position.set(0, 3.45, 28.65);
  group.add(gateSign);
  // mosaic accent on gate pillars
  box(1.2, 2.6, 1.2, mosaicB, -3.2, 1.3, 28.2, group);
  box(1.2, 2.6, 1.2, mosaicB, 3.2, 1.3, 28.2, group);

  // Perimeter walls, open at south gate toward 双钢路/捍卫路
  for (const [x, z, w, d] of [
    [-52, -5, 1.1, 90],
    [52, -5, 1.1, 90],
    [0, -48, 105, 1.1],
    [-28, 28, 36, 1.0],
    [28, 28, 36, 1.0],
  ] as const) {
    box(w, 2.2, d, brickEdge, x, 1.1, z, group, colliders);
  }

  // Trees & lamps
  for (const [x, z] of [
    [-10, -4],
    [10, -4],
    [-8, -12],
    [8, -12],
    [-20, 10],
    [20, 10],
    [-6, 16],
    [6, 16],
    [-22, -28],
    [22, -28],
    [0, 8],
    [-12, -34],
    [12, -34],
  ] as const) {
    tree(group, x, z, colliders);
  }
  for (const [x, z] of [
    [-4, 2],
    [4, 2],
    [-4, 16],
    [4, 16],
    [-4, 24],
    [4, 24],
    [0, 36],
    [-12, 36],
    [12, 36],
    [-28, -6],
    [28, -6],
    [-14, -20],
    [14, -20],
  ] as const) {
    lampPost(group, x, z, lamps);
  }

  // Convenience store outside gate (双钢路侧)
  const storeX = 14;
  const storeZ = 44;
  box(10, 4.0, 8, plasterTrim, storeX, 2.0, storeZ, group, colliders);
  box(10.4, 0.35, 8.4, concrete, storeX, 4.2, storeZ, group);
  const storeFront = new THREE.MeshStandardMaterial({
    color: 0xffefc2,
    emissive: 0xffc978,
    emissiveIntensity: 0.55,
    roughness: 0.4,
  });
  storeGlow.push(storeFront);
  const storeWindow = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 2.3), storeFront);
  storeWindow.position.set(storeX, 1.95, storeZ - 4.02);
  group.add(storeWindow);
  const signMat = new THREE.MeshStandardMaterial({
    color: 0xff3b5c,
    emissive: 0xff2d55,
    emissiveIntensity: 0.8,
  });
  storeGlow.push(signMat);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(6, 0.7, 0.2), signMat);
  sign.position.set(storeX, 3.55, storeZ - 4.1);
  group.add(sign);
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.12, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.7 }),
  );
  awning.position.set(storeX, 3.05, storeZ - 4.7);
  group.add(awning);

  // Store interior
  const storeInterior = new THREE.Group();
  storeInterior.visible = false;
  storeInterior.name = 'storeInterior';
  group.add(storeInterior);
  box(9, 3.0, 7, plasterTrim, storeX, 1.5, storeZ, storeInterior);
  const floorStore = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 6.5), wood);
  floorStore.rotation.x = -Math.PI / 2;
  floorStore.position.set(storeX, 0.05, storeZ);
  storeInterior.add(floorStore);
  for (const ox of [-2.5, 0, 2.5]) {
    box(1.8, 2.1, 0.5, wood, storeX + ox, 1.15, storeZ + 1.8, storeInterior);
  }
  box(
    1.4,
    2.3,
    0.8,
    new THREE.MeshStandardMaterial({
      color: 0xdfe7ef,
      metalness: 0.4,
      roughness: 0.25,
      emissive: 0x9ad0ff,
      emissiveIntensity: 0.15,
    }),
    storeX + 3.2,
    1.15,
    storeZ - 1.5,
    storeInterior,
  );

  // Home apartment — ground floor of home building
  const home = new THREE.Group();
  home.visible = false;
  home.name = 'homeInterior';
  home.position.set(-18, 0, -2.5);
  group.add(home);
  box(8, 2.8, 0.25, plasterTrim, 0, 1.4, -3.5, home);
  box(0.25, 2.8, 7, plasterTrim, -4, 1.4, 0, home);
  box(0.25, 2.8, 7, plasterTrim, 4, 1.4, 0, home);
  box(8, 2.8, 0.25, plasterTrim, 0, 1.4, 3.5, home);
  const floorHome = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 6.8), wood);
  floorHome.rotation.x = -Math.PI / 2;
  floorHome.position.y = 0.04;
  home.add(floorHome);
  box(2.0, 0.45, 2.4, new THREE.MeshStandardMaterial({ color: 0x4a6fa5, roughness: 0.85 }), -2.2, 0.35, -1.8, home);
  box(2.0, 0.2, 2.4, new THREE.MeshStandardMaterial({ color: 0xd9e6ff, roughness: 0.9 }), -2.2, 0.65, -1.8, home);
  box(1.4, 0.7, 1.0, wood, 2.0, 0.4, 0.5, home);
  box(1.2, 2.2, 0.6, wood, 2.5, 1.1, -2.4, home);
  const homeLight = new THREE.PointLight(0xffe0b8, 0.9, 12, 2);
  homeLight.position.set(0, 2.4, 0);
  home.add(homeLight);

  // Distant skyline hints only (Jialing side silhouette) — far, non-colliding, not playable riverside
  const skyline = new THREE.Group();
  skyline.position.set(0, 0, -78);
  for (let i = 0; i < 12; i++) {
    const sw = 4 + (i % 3) * 2;
    const sh = 18 + (i * 7) % 35;
    const sx = -40 + i * 7.5;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(sw, sh, 4),
      new THREE.MeshStandardMaterial({ color: 0x6a7585, roughness: 0.9, transparent: true, opacity: 0.55 }),
    );
    m.position.set(sx, sh / 2, (i % 2) * -6);
    skyline.add(m);
  }
  group.add(skyline);

  const car = makeCar();
  car.position.set(3.0, 0, 10);
  car.rotation.y = Math.PI;
  group.add(car);

  const spawn = new THREE.Vector3(-16, 0, -1);
  const carSpawn = new THREE.Vector3(3.0, 0, 10);

  const homeDoor = new THREE.Object3D();
  homeDoor.position.set(-18, 0, -2.0);
  group.add(homeDoor);
  const storeDoor = new THREE.Object3D();
  storeDoor.position.set(storeX, 0, storeZ - 4.2);
  group.add(storeDoor);

  interactables.push(
    {
      id: 'home-enter',
      label: '按 E 进入家中（双钢路小区）',
      position: { x: -18, y: 0, z: -2.0 },
      radius: 2.2,
      action: onInteract.enterHome,
    },
    {
      id: 'home-exit',
      label: '按 E 出门',
      position: { x: -18, y: 0, z: 0.5 },
      radius: 2.0,
      action: onInteract.exitHome,
    },
    {
      id: 'eat',
      label: '按 E 吃饭（恢复饥饿）',
      position: { x: -16, y: 0, z: -2.0 },
      radius: 1.8,
      action: onInteract.eat,
    },
    {
      id: 'sleep',
      label: '按 E 睡觉（恢复精力，推进时间）',
      position: { x: -20.2, y: 0, z: -4.3 },
      radius: 1.8,
      action: onInteract.sleep,
    },
    {
      id: 'clothes',
      label: '按 E 换衣服',
      position: { x: -15.5, y: 0, z: -4.9 },
      radius: 1.6,
      action: onInteract.changeClothes,
    },
    {
      id: 'store-enter',
      label: '按 E 进入便利店',
      position: { x: storeX, y: 0, z: storeZ - 4.2 },
      radius: 2.4,
      action: onInteract.enterStore,
    },
    {
      id: 'store-exit',
      label: '按 E 离开便利店',
      position: { x: storeX, y: 0, z: storeZ - 2.5 },
      radius: 2.0,
      action: onInteract.exitStore,
    },
    {
      id: 'buy-food',
      label: '按 E 买盒饭 ¥18',
      position: { x: storeX - 2.5, y: 0, z: storeZ + 1.2 },
      radius: 1.8,
      action: onInteract.buyFood,
    },
    {
      id: 'buy-drink',
      label: '按 E 买饮料 ¥6',
      position: { x: storeX + 3.0, y: 0, z: storeZ - 1.2 },
      radius: 1.8,
      action: onInteract.buyDrink,
    },
  );

  return {
    group,
    colliders,
    interactables,
    roadMat,
    lamps,
    storeGlow,
    windowMats,
    car,
    homeDoor,
    storeDoor,
    spawn,
    carSpawn,
  };
}
