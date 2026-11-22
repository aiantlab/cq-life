import * as THREE from 'three';
import { makeWetAsphalt, makeConcrete, makeMosaic, makePlaster, makeBrick } from './textures';

export interface BeibinExtract {
  roads: Array<{ id: string; name?: string; highway: string; width: number; coords: number[][] }>;
  buildings: Array<{
    id: string;
    levels: number;
    height?: number;
    use: string;
    footprint: number[][];
    name?: string;
  }>;
  water: Array<{ id: string; name?: string; ring: number[][] }>;
  pois: Array<{ id: string; name: string; kind: string; x: number; z: number }>;
  attribution?: string;
  worldfolk_notes?: string;
  version?: number;
}

export interface MapMeshResult {
  group: THREE.Group;
  roadMats: THREE.MeshStandardMaterial[];
  lamps: THREE.PointLight[];
  neonMats: THREE.MeshStandardMaterial[];
  windowMats: THREE.MeshStandardMaterial[];
  colliders: THREE.Box3[];
  sidewalkPaths: Array<{ x: number; z: number }[]>;
  roadPaths: Array<{ x: number; z: number }[]>;
  attribution: string;
  roads: BeibinExtract['roads'];
  waterRing?: number[][];
}

/** Worldfolk roadStrip-style ribbon: centerline → left/right edge via segment normals. */
function ribbonGeometry(coords: number[][], width: number, y = 0.03): THREE.BufferGeometry {
  const half = width / 2;
  const left: THREE.Vector3[] = [];
  const right: THREE.Vector3[] = [];
  for (let i = 0; i < coords.length; i++) {
    const [x, z] = coords[i];
    let dx = 0;
    let dz = 1;
    if (i < coords.length - 1) {
      dx = coords[i + 1][0] - x;
      dz = coords[i + 1][1] - z;
    } else if (i > 0) {
      dx = x - coords[i - 1][0];
      dz = z - coords[i - 1][1];
    }
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    left.push(new THREE.Vector3(x + nx * half, 0, z + nz * half));
    right.push(new THREE.Vector3(x - nx * half, 0, z - nz * half));
  }
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let dist = 0;
  for (let i = 0; i < left.length; i++) {
    if (i > 0) dist += left[i].distanceTo(left[i - 1]);
    const u = dist * 0.15;
    positions.push(left[i].x, y, left[i].z, right[i].x, y, right[i].z);
    uvs.push(0, u, 1, u);
    if (i > 0) {
      const a = (i - 1) * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Offset a centerline laterally by metres (Worldfolk offsetMetres role). */
function offsetCoords(coords: number[][], lateral: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < coords.length; i++) {
    const [x, z] = coords[i];
    let dx = 0;
    let dz = 1;
    if (i < coords.length - 1) {
      dx = coords[i + 1][0] - x;
      dz = coords[i + 1][1] - z;
    } else if (i > 0) {
      dx = x - coords[i - 1][0];
      dz = z - coords[i - 1][1];
    }
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len;
    const nz = dx / len;
    out.push([x + nx * lateral, z + nz * lateral]);
  }
  return out;
}

function footprintMesh(
  fp: number[][],
  height: number,
  mat: THREE.Material,
  colliders: THREE.Box3[],
): THREE.Mesh {
  const shape = new THREE.Shape();
  fp.forEach(([x, z], i) => {
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, steps: 1 });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  geo.computeBoundingBox();
  if (geo.boundingBox) colliders.push(geo.boundingBox.clone());
  return mesh;
}

function addWindows(
  parent: THREE.Object3D,
  mats: THREE.MeshStandardMaterial[],
  cx: number,
  cz: number,
  w: number,
  d: number,
  floors: number,
) {
  const glass = new THREE.MeshStandardMaterial({
    color: 0x9ec5e8,
    roughness: 0.12,
    metalness: 0.28,
    emissive: 0xffd2a0,
    emissiveIntensity: 0,
  });
  mats.push(glass);
  const faces: Array<['z+' | 'z-' | 'x+' | 'x-', number]> = [
    ['z-', w],
    ['z+', w],
    ['x-', d],
    ['x+', d],
  ];
  for (const [facing, span] of faces) {
    const per = Math.max(2, Math.floor(span / 3.0));
    for (let f = 0; f < Math.min(floors, 14); f++) {
      for (let i = 0; i < per; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.35), glass);
        const y = 1.5 + f * 3.05;
        let x = cx;
        let z = cz;
        if (facing === 'z-' || facing === 'z+') {
          x = cx - span / 2 + 1.5 + i * ((span - 3) / Math.max(1, per - 1));
          z = facing === 'z+' ? cz + d / 2 + 0.04 : cz - d / 2 - 0.04;
          m.rotation.y = facing === 'z-' ? 0 : Math.PI;
        } else {
          z = cz - span / 2 + 1.5 + i * ((span - 3) / Math.max(1, per - 1));
          x = facing === 'x+' ? cx + w / 2 + 0.04 : cx - w / 2 - 0.04;
          m.rotation.y = facing === 'x+' ? Math.PI / 2 : -Math.PI / 2;
        }
        m.position.set(x, y, z);
        parent.add(m);
      }
    }
  }
}

function addLaneMarkings(group: THREE.Group, coords: number[][], roadWidth: number) {
  // Worldfolk markedClasses center line — dashed white on primary
  const markMat = new THREE.MeshStandardMaterial({
    color: 0xf2f4f0,
    emissive: 0xdde2d8,
    emissiveIntensity: 0.15,
    roughness: 0.7,
  });
  for (let i = 1; i < coords.length; i++) {
    const [x0, z0] = coords[i - 1];
    const [x1, z1] = coords[i];
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 2) continue;
    const segs = Math.max(1, Math.floor(len / 4.5));
    for (let s = 0; s < segs; s++) {
      if (s % 2 === 1) continue;
      const t0 = s / segs;
      const t1 = Math.min(1, (s + 0.45) / segs);
      const ax = x0 + (x1 - x0) * t0;
      const az = z0 + (z1 - z0) * t0;
      const bx = x0 + (x1 - x0) * t1;
      const bz = z0 + (z1 - z0) * t1;
      const dash = ribbonGeometry(
        [
          [ax, az],
          [bx, bz],
        ],
        0.18,
        0.045,
      );
      group.add(new THREE.Mesh(dash, markMat));
    }
  }
  // edge lines
  for (const side of [-1, 1]) {
    const edge = offsetCoords(coords, side * (roadWidth / 2 - 0.35));
    const edgeMesh = new THREE.Mesh(ribbonGeometry(edge, 0.14, 0.044), markMat);
    group.add(edgeMesh);
  }
}

export async function loadBeibinExtract(): Promise<BeibinExtract> {
  const res = await fetch('./map/beibin-extract.json');
  if (!res.ok) throw new Error('beibin-extract.json missing');
  return res.json();
}

/**
 * Worldfolk-method city mesh for Beibin:
 * GeoJSON-like roads → asphalt + pavement strips (class widths) + markings;
 * footprints → extrusions; sidewalks for agents.
 */
export function buildMapFromExtract(extract: BeibinExtract, parent: THREE.Object3D): MapMeshResult {
  const group = new THREE.Group();
  group.name = 'osmMap';
  parent.add(group);

  const roadMats: THREE.MeshStandardMaterial[] = [];
  const lamps: THREE.PointLight[] = [];
  const neonMats: THREE.MeshStandardMaterial[] = [];
  const windowMats: THREE.MeshStandardMaterial[] = [];
  const colliders: THREE.Box3[] = [];
  const sidewalkPaths: Array<{ x: number; z: number }[]> = [];
  const roadPaths: Array<{ x: number; z: number }[]> = [];

  const asphalt = makeWetAsphalt();
  if (asphalt.map) asphalt.map.anisotropy = 8;
  roadMats.push(asphalt);
  const concrete = makeConcrete();
  const mosaic = makeMosaic();
  const plaster = makePlaster('#d9d2c6');
  const plasterDark = makePlaster('#c2b8a8');
  const brick = makeBrick('#7a5648');
  const pavingMat = new THREE.MeshStandardMaterial({
    color: 0x969893,
    roughness: 0.92,
    metalness: 0.02,
  });

  for (const road of extract.roads) {
    const cls = road.highway || 'residential';
    const isPath = cls === 'path' || cls === 'pedestrian';
    const width = road.width;

    // asphalt (or path paving)
    const surface = new THREE.Mesh(
      ribbonGeometry(road.coords, width, isPath ? 0.04 : 0.03),
      isPath ? pavingMat : asphalt,
    );
    surface.receiveShadow = true;
    group.add(surface);
    roadPaths.push(road.coords.map(([x, z]) => ({ x, z })));

    // Worldfolk pavement strips: wider corridor around asphalt (not Accra skin — class-based)
    if (!isPath && cls !== 'service') {
      const paveWidth = width + 2.4;
      const pavement = new THREE.Mesh(ribbonGeometry(road.coords, paveWidth, 0.02), pavingMat);
      pavement.receiveShadow = true;
      group.add(pavement);
    }

    if (cls === 'primary' || cls === 'tertiary' || cls === 'secondary') {
      // dedicated sidewalk ribbons offset by normals (not crude z-only)
      const swOff = width / 2 + 2.0;
      for (const side of [-1, 1]) {
        const swCoords = offsetCoords(road.coords, side * swOff);
        const sw = new THREE.Mesh(ribbonGeometry(swCoords, 3.0, 0.05), concrete);
        sw.receiveShadow = true;
        group.add(sw);
        sidewalkPaths.push(swCoords.map(([x, z]) => ({ x, z })));
      }

      if (cls === 'primary') {
        addLaneMarkings(group, road.coords, width);

        const median = new THREE.Mesh(
          ribbonGeometry(road.coords, 1.1, 0.055),
          new THREE.MeshStandardMaterial({ color: 0x3a6b45, roughness: 0.85 }),
        );
        group.add(median);

        for (let i = 0; i < road.coords.length; i++) {
          const [x, z] = road.coords[i];
          for (const side of [-1, 1]) {
            const off = offsetCoords(
              [
                [x, z],
                [x + 0.01, z],
              ],
              side * (width / 2 + 1.2),
            )[0];
            const lx = off[0];
            const lz = off[1];
            const pole = new THREE.Mesh(
              new THREE.CylinderGeometry(0.08, 0.1, 6.5, 8),
              new THREE.MeshStandardMaterial({ color: 0x2a3038, metalness: 0.65, roughness: 0.35 }),
            );
            pole.position.set(lx, 3.25, lz);
            group.add(pole);
            const light = new THREE.PointLight(0xffd9a0, 0, 24, 2);
            light.position.set(lx, 6.4, lz);
            group.add(light);
            lamps.push(light);
          }
        }

        // Chinese road name plate
        if (road.name) {
          const sign = new THREE.Mesh(
            new THREE.BoxGeometry(Math.max(3.2, road.name.length * 0.55), 0.7, 0.12),
            new THREE.MeshStandardMaterial({
              color: 0x1f6b45,
              emissive: 0x2f8f5c,
              emissiveIntensity: 0.35,
            }),
          );
          const mid = road.coords[Math.floor(road.coords.length / 2)];
          const plate = offsetCoords(
            [
              mid,
              [mid[0] + 1, mid[1]],
            ],
            -(width / 2 + 3.5),
          )[0];
          sign.position.set(plate[0], 3.2, plate[1]);
          group.add(sign);
        }
      }
    } else {
      // residential / service — single sidewalk for peds
      const swCoords = offsetCoords(road.coords, road.width / 2 + 1.6);
      sidewalkPaths.push(swCoords.map(([x, z]) => ({ x, z })));
    }
  }

  for (const b of extract.buildings) {
    const h = b.height ?? b.levels * 3.1;
    const mat =
      b.use === 'commercial' ? (Math.random() > 0.5 ? plasterDark : brick) : Math.random() > 0.4 ? mosaic : plaster;
    const mesh = footprintMesh(b.footprint, h, mat, colliders);
    group.add(mesh);
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const [x, z] of b.footprint) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const w = maxX - minX;
    const d = maxZ - minZ;
    addWindows(group, windowMats, cx, cz, w, d, b.levels);

    if (b.use === 'commercial') {
      const neon = new THREE.MeshStandardMaterial({
        color: Math.random() > 0.5 ? 0xff6b8a : 0x5ec8ff,
        emissive: Math.random() > 0.5 ? 0xff2d55 : 0x2db7ff,
        emissiveIntensity: 0.7,
        roughness: 0.4,
      });
      neonMats.push(neon);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.85, 8), 1.5, 0.18), neon);
      strip.position.set(cx, 1.35, minZ - 0.2);
      group.add(strip);
      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(Math.min(w * 0.9, 9), 0.1, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x222830, roughness: 0.7 }),
      );
      canopy.position.set(cx, 2.4, minZ - 0.9);
      group.add(canopy);
    }
  }

  return {
    group,
    roadMats,
    lamps,
    neonMats,
    windowMats,
    colliders,
    sidewalkPaths,
    roadPaths,
    attribution: extract.attribution ?? '© OpenStreetMap contributors',
    roads: extract.roads,
    waterRing: extract.water?.[0]?.ring,
  };
}
