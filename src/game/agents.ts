import * as THREE from 'three';
import { createHumanoid, animateHumanoid } from './character';

export interface AgentSystem {
  group: THREE.Group;
  update: (dt: number, playerX: number, playerZ: number) => void;
}

function makeCarMesh(color: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.85, 0.5, 4.1),
    new THREE.MeshStandardMaterial({ color, metalness: 0.45, roughness: 0.35 }),
  );
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.5, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x1b2430, roughness: 0.45 }),
  );
  cabin.position.set(0, 1.0, -0.1);
  cabin.castShadow = true;
  g.add(cabin);
  return g;
}

type Ped = {
  root: THREE.Group;
  path: { x: number; z: number }[];
  i: number;
  speed: number;
  dir: number;
};

type Car = {
  root: THREE.Group;
  path: { x: number; z: number }[];
  i: number;
  speed: number;
  t: number;
  lane: number;
};

/** Ambient pedestrians + limited traffic for GTA-like inhabited streets. */
export function createAgentSystem(
  parent: THREE.Object3D,
  sidewalkPaths: Array<{ x: number; z: number }[]>,
  roadPaths: Array<{ x: number; z: number }[]>,
): AgentSystem {
  const group = new THREE.Group();
  group.name = 'agents';
  parent.add(group);

  const shirtColors = [0x3b82f6, 0xef4444, 0x22c55e, 0xf59e0b, 0xa855f7, 0x06b6d4, 0xf472b6, 0xe5e7eb];
  const skinTones = [0xe8c4a8, 0xd4a574, 0xc68642, 0x8d5524, 0xf1c27d];
  const peds: Ped[] = [];
  const cars: Car[] = [];

  const walks = sidewalkPaths.length ? sidewalkPaths : [[{ x: -40, z: 58 }, { x: 40, z: 58 }]];
  const roads = roadPaths.length ? roadPaths : [[{ x: -40, z: 48 }, { x: 40, z: 48 }]];

  // ~36 pedestrians
  for (let n = 0; n < 36; n++) {
    const path = walks[n % walks.length].map((p) => ({ ...p }));
    if (path.length < 2) continue;
    const human = createHumanoid({
      skin: skinTones[n % skinTones.length],
      shirt: shirtColors[n % shirtColors.length],
      pants: n % 2 ? 0x1f2937 : 0x374151,
      scale: 0.95 + (n % 5) * 0.02,
    });
    const i = n % Math.max(1, path.length - 1);
    human.position.set(path[i].x, 0, path[i].z);
    group.add(human);
    peds.push({
      root: human,
      path,
      i,
      speed: 1.1 + (n % 7) * 0.15,
      dir: n % 2 === 0 ? 1 : -1,
    });
  }

  // Limited traffic ~12 cars on Beibin
  const carColors = [0xc45c26, 0xe5e7eb, 0x1e3a8a, 0x111827, 0xb91c1c, 0x365314];
  const mainRoad = roads[0];
  for (let n = 0; n < 12; n++) {
    if (mainRoad.length < 2) break;
    const car = makeCarMesh(carColors[n % carColors.length]);
    const lane = n % 2 === 0 ? -3.2 : 3.2;
    const t = (n / 12) * (mainRoad.length - 1.01);
    const i = Math.floor(t);
    car.position.set(mainRoad[i].x, 0, mainRoad[i].z + lane);
    group.add(car);
    cars.push({
      root: car,
      path: mainRoad,
      i,
      speed: 9 + (n % 4) * 1.5,
      t,
      lane,
    });
  }

  // Gate / bike-rack crowd so spawn exit always shows people
  for (let n = 0; n < 10; n++) {
    const human = createHumanoid({
      skin: skinTones[(n + 1) % skinTones.length],
      shirt: shirtColors[(n + 4) % shirtColors.length],
    });
    const path = [
      { x: -12 + n * 1.4, z: 34 },
      { x: -10 + n * 1.2, z: 46 },
      { x: -8 + n * 1.1, z: 56 },
      { x: -10 + n * 1.2, z: 46 },
    ];
    human.position.set(path[0].x, 0, path[0].z);
    group.add(human);
    peds.push({ root: human, path, i: 0, speed: 1.15 + (n % 3) * 0.1, dir: 1 });
  }

  // Crossing clusters near bike rack / mid Beibin
  for (let n = 0; n < 8; n++) {
    const human = createHumanoid({
      skin: skinTones[(n + 2) % skinTones.length],
      shirt: shirtColors[(n + 3) % shirtColors.length],
    });
    const path = [
      { x: -6 + n * 0.8, z: 58 },
      { x: -6 + n * 0.8, z: 48 },
      { x: -6 + n * 0.8, z: 38 },
      { x: -6 + n * 0.8, z: 48 },
    ];
    human.position.set(path[0].x, 0, path[0].z);
    group.add(human);
    peds.push({ root: human, path, i: 0, speed: 1.3, dir: 1 });
  }

  function update(dt: number, playerX: number, playerZ: number) {
    for (const ped of peds) {
      const target = ped.path[ped.i];
      const dx = target.x - ped.root.position.x;
      const dz = target.z - ped.root.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.4) {
        ped.i += ped.dir;
        if (ped.i >= ped.path.length) {
          ped.i = ped.path.length - 2;
          ped.dir = -1;
        } else if (ped.i < 0) {
          ped.i = 1;
          ped.dir = 1;
        }
      } else {
        const vx = (dx / dist) * ped.speed;
        const vz = (dz / dist) * ped.speed;
        ped.root.position.x += vx * dt;
        ped.root.position.z += vz * dt;
        ped.root.rotation.y = Math.atan2(vx, vz);
        animateHumanoid(ped.root, ped.speed, dt, false);
      }
      // Cheap LOD: hide far peds
      const dPlayer = Math.hypot(ped.root.position.x - playerX, ped.root.position.z - playerZ);
      ped.root.visible = dPlayer < 85;
    }

    for (const car of cars) {
      car.t += (dt * car.speed) / 8;
      if (car.t >= car.path.length - 1) car.t = 0;
      const i = Math.floor(car.t);
      const f = car.t - i;
      const a = car.path[i];
      const b = car.path[Math.min(i + 1, car.path.length - 1)];
      const x = a.x + (b.x - a.x) * f;
      const z = a.z + (b.z - a.z) * f + car.lane;
      car.root.position.set(x, 0, z);
      car.root.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      const dPlayer = Math.hypot(x - playerX, z - playerZ);
      car.root.visible = dPlayer < 110;
    }
  }

  return { group, update };
}
