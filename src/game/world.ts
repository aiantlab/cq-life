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
    const b = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(w, h, d),
    );
    colliders.push(b);
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
  const ww = 1.2;
  const wh = 1.4;
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < perFloor; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), glass);
      const y = 1.4 + f * 3.0;
      let x = x0;
      let z = z0;
      if (facing === 'z+' || facing === 'z-') {
        x = x0 - width / 2 + 2 + i * ((width - 4) / Math.max(1, perFloor - 1));
        z = facing === 'z+' ? z0 + depth / 2 + 0.03 : z0 - depth / 2 - 0.03;
        m.rotation.y = facing === 'z-' ? Math.PI : 0;
      } else {
        z = z0 - depth / 2 + 2 + i * ((depth - 4) / Math.max(1, perFloor - 1));
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
    new THREE.CylinderGeometry(0.18, 0.25, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x5b3a22, roughness: 0.9 }),
  );
  trunk.position.set(x, 1.1, z);
  trunk.castShadow = true;
  parent.add(trunk);
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x2f6b34, roughness: 0.85 }),
  );
  canopy.position.set(x, 3.1, z);
  canopy.castShadow = true;
  parent.add(canopy);
  colliders.push(
    new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 1.5, z), new THREE.Vector3(1.2, 3, 1.2)),
  );
}

function lampPost(parent: THREE.Object3D, x: number, z: number, lamps: THREE.PointLight[]) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 5.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x333840, metalness: 0.6, roughness: 0.4 }),
  );
  pole.position.set(x, 2.6, z);
  parent.add(pole);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: 0xffc978, emissiveIntensity: 0.4 }),
  );
  head.position.set(x, 5.2, z);
  parent.add(head);
  const light = new THREE.PointLight(0xffc978, 0, 18, 2);
  light.position.set(x, 5.0, z);
  light.castShadow = false;
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
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.28, 16), wheelMat);
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
  const dryRoad = makeAsphalt();
  void dryRoad;
  const concrete = makeConcrete();
  const brickA = makeBrick('#8b5a43');
  const brickB = makeBrick('#6d5548');
  const plaster = makePlaster('#d8d0c2');
  const plasterWarm = makePlaster('#e4d5bf');
  const grass = makeGrass();
  const wood = makeWood();

  // Ground plane / compound footprint ~ 90 x 70
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 110), concrete);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  // Internal roads
  const roadH = new THREE.Mesh(new THREE.PlaneGeometry(70, 8), roadMat);
  roadH.rotation.x = -Math.PI / 2;
  roadH.position.set(0, 0.02, 0);
  roadH.receiveShadow = true;
  group.add(roadH);
  const roadV = new THREE.Mesh(new THREE.PlaneGeometry(8, 55), roadMat);
  roadV.rotation.x = -Math.PI / 2;
  roadV.position.set(0, 0.021, -8);
  roadV.receiveShadow = true;
  group.add(roadV);
  // Outside road past gate
  const outerRoad = new THREE.Mesh(new THREE.PlaneGeometry(14, 40), roadMat);
  outerRoad.rotation.x = -Math.PI / 2;
  outerRoad.position.set(0, 0.022, 38);
  outerRoad.receiveShadow = true;
  group.add(outerRoad);

  // Courtyard grass beds
  for (const [x, z, w, d] of [
    [-18, -12, 16, 10],
    [18, -12, 16, 10],
    [-18, 12, 14, 8],
    [18, 12, 14, 8],
    [-22, -28, 10, 8],
    [22, -28, 10, 8],
  ] as const) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w, d), grass);
    g.rotation.x = -Math.PI / 2;
    g.position.set(x, 0.03, z);
    g.receiveShadow = true;
    group.add(g);
  }

  // Residential shells — Nan'an style mid-rise
  const buildings: Array<[number, number, number, number, number, THREE.Material, number]> = [
    // x, z, w, d, floors, mat, windowsPerFloor
    [-24, -22, 18, 12, 6, plaster, 5],
    [24, -22, 18, 12, 6, plasterWarm, 5],
    [-26, 8, 16, 12, 7, brickA, 4],
    [26, 8, 16, 12, 7, brickB, 4],
    [-22, -36, 14, 10, 5, plaster, 4],
    [22, -36, 14, 10, 5, plasterWarm, 4],
  ];

  buildings.forEach(([x, z, w, d, floors, mat, wpf], idx) => {
    const h = floors * 3.0 + 0.5;
    box(w, h, d, mat, x, h / 2, z, group, colliders);
    // roof parapet
    box(w + 0.4, 0.5, d + 0.4, concrete, x, h + 0.25, z, group);
    windowStrip(group, windowMats, x, z, 'z+', floors, wpf, w, d);
    windowStrip(group, windowMats, x, z, 'z-', floors, wpf, w, d);
    windowStrip(group, windowMats, x, z, 'x+', floors, Math.max(3, wpf - 1), w, d);
    windowStrip(group, windowMats, x, z, 'x-', floors, Math.max(3, wpf - 1), w, d);
    // balcony hints on first building (home)
    if (idx === 0) {
      for (let f = 0; f < floors; f++) {
        box(2.4, 0.12, 1.0, concrete, x + 4, 1.0 + f * 3.0, z + d / 2 + 0.5, group);
      }
    }
  });

  // Gatehouse
  box(10, 3.2, 4.5, plaster, -7, 1.6, 26, group, colliders);
  box(3.5, 3.2, 4.5, plaster, 7, 1.6, 26, group, colliders);
  box(18, 0.4, 1.2, concrete, 0, 3.4, 26, group);
  const gateSign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x0f3d66, emissive: 0x1d4f82, emissiveIntensity: 0.25 }),
  );
  gateSign.position.set(0, 3.6, 26.7);
  group.add(gateSign);

  // Perimeter walls (open at gate)
  for (const [x, z, w, d] of [
    [-40, 0, 1.2, 70],
    [40, 0, 1.2, 70],
    [0, -42, 82, 1.2],
    [-22, 26, 28, 1.0],
    [22, 26, 28, 1.0],
  ] as const) {
    box(w, 2.4, d, brickB, x, 1.2, z, group, colliders);
  }

  // Trees & lamps
  for (const [x, z] of [
    [-12, -8],
    [-8, 10],
    [10, -10],
    [14, 10],
    [-16, -28],
    [16, -28],
    [-6, -18],
    [6, 16],
  ] as const) {
    tree(group, x, z, colliders);
  }
  for (const [x, z] of [
    [-5, -4],
    [5, -4],
    [-5, 14],
    [5, 14],
    [-5, 22],
    [5, 22],
    [0, 34],
    [-10, 34],
    [10, 34],
    [-12, -30],
    [12, -30],
  ] as const) {
    lampPost(group, x, z, lamps);
  }

  // Convenience store outside gate
  const storeX = 12;
  const storeZ = 40;
  box(10, 4.2, 8, plasterWarm, storeX, 2.1, storeZ, group, colliders);
  box(10.4, 0.35, 8.4, concrete, storeX, 4.35, storeZ, group);
  const storeFront = new THREE.MeshStandardMaterial({
    color: 0xffefc2,
    emissive: 0xffc978,
    emissiveIntensity: 0.55,
    roughness: 0.4,
  });
  storeGlow.push(storeFront);
  const storeWindow = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 2.4), storeFront);
  storeWindow.position.set(storeX, 2.0, storeZ - 4.02);
  group.add(storeWindow);
  const signMat = new THREE.MeshStandardMaterial({
    color: 0xff3b5c,
    emissive: 0xff2d55,
    emissiveIntensity: 0.8,
  });
  storeGlow.push(signMat);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(6, 0.7, 0.2), signMat);
  sign.position.set(storeX, 3.7, storeZ - 4.1);
  group.add(sign);
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.12, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.7 }),
  );
  awning.position.set(storeX, 3.2, storeZ - 4.7);
  group.add(awning);

  // Store interior (simple room slightly overlapping entry)
  const storeInterior = new THREE.Group();
  storeInterior.visible = false;
  storeInterior.name = 'storeInterior';
  group.add(storeInterior);
  box(9, 3.2, 7, plaster, storeX, 1.6, storeZ, storeInterior);
  const floorStore = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 6.5), wood);
  floorStore.rotation.x = -Math.PI / 2;
  floorStore.position.set(storeX, 0.05, storeZ);
  storeInterior.add(floorStore);
  // shelves
  for (const ox of [-2.5, 0, 2.5]) {
    box(1.8, 2.2, 0.5, wood, storeX + ox, 1.2, storeZ + 1.8, storeInterior);
  }
  const fridge = box(
    1.4,
    2.4,
    0.8,
    new THREE.MeshStandardMaterial({ color: 0xdfe7ef, metalness: 0.4, roughness: 0.25, emissive: 0x9ad0ff, emissiveIntensity: 0.15 }),
    storeX + 3.2,
    1.2,
    storeZ - 1.5,
    storeInterior,
  );
  void fridge;

  // Home apartment interior (Building A ground floor proxy near -24,-22)
  const home = new THREE.Group();
  home.visible = false;
  home.name = 'homeInterior';
  home.position.set(-24, 0, -16);
  group.add(home);
  // room shell open toward +z
  box(8, 2.8, 0.25, plaster, 0, 1.4, -3.5, home);
  box(0.25, 2.8, 7, plaster, -4, 1.4, 0, home);
  box(0.25, 2.8, 7, plaster, 4, 1.4, 0, home);
  box(8, 2.8, 0.25, plaster, 0, 1.4, 3.5, home);
  const floorHome = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 6.8), wood);
  floorHome.rotation.x = -Math.PI / 2;
  floorHome.position.y = 0.04;
  home.add(floorHome);
  // bed
  box(2.0, 0.45, 2.4, new THREE.MeshStandardMaterial({ color: 0x4a6fa5, roughness: 0.85 }), -2.2, 0.35, -1.8, home);
  box(2.0, 0.2, 2.4, new THREE.MeshStandardMaterial({ color: 0xd9e6ff, roughness: 0.9 }), -2.2, 0.65, -1.8, home);
  // table / food
  box(1.4, 0.7, 1.0, wood, 2.0, 0.4, 0.5, home);
  // wardrobe
  box(1.2, 2.2, 0.6, wood, 2.5, 1.1, -2.4, home);
  const homeLight = new THREE.PointLight(0xffe0b8, 0.9, 12, 2);
  homeLight.position.set(0, 2.4, 0);
  home.add(homeLight);

  const car = makeCar();
  car.position.set(2.5, 0, 8);
  car.rotation.y = Math.PI;
  group.add(car);

  const spawn = new THREE.Vector3(-20, 0, -14);
  const carSpawn = new THREE.Vector3(2.5, 0, 8);

  // Invisible door markers
  const homeDoor = new THREE.Object3D();
  homeDoor.position.set(-24, 0, -15.2);
  group.add(homeDoor);
  const storeDoor = new THREE.Object3D();
  storeDoor.position.set(storeX, 0, storeZ - 4.2);
  group.add(storeDoor);

  interactables.push(
    {
      id: 'home-enter',
      label: '按 E 进入家中',
      position: { x: -24, y: 0, z: -15.2 },
      radius: 2.2,
      action: onInteract.enterHome,
    },
    {
      id: 'home-exit',
      label: '按 E 出门',
      position: { x: -24, y: 0, z: -12.5 },
      radius: 2.0,
      action: onInteract.exitHome,
    },
    {
      id: 'eat',
      label: '按 E 吃饭（恢复饥饿）',
      position: { x: -22, y: 0, z: -15.5 },
      radius: 1.8,
      action: onInteract.eat,
    },
    {
      id: 'sleep',
      label: '按 E 睡觉（恢复精力，推进时间）',
      position: { x: -26.2, y: 0, z: -17.8 },
      radius: 1.8,
      action: onInteract.sleep,
    },
    {
      id: 'clothes',
      label: '按 E 换衣服',
      position: { x: -21.5, y: 0, z: -18.4 },
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
