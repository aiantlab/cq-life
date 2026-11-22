/**
 * Worldfolk-method helpers for Beibin:
 * - manifest / streets / places JSON (same roles as Worldfolk Accra map bundles)
 * - 3D place + street name labels over real local geography
 * - canvas minimap (MapLibre-radar equivalent: roads, water, places, YOU)
 * Keep © OpenStreetMap attribution visible.
 */
import * as THREE from 'three';

export interface WorldfolkManifest {
  version: number;
  id: string;
  name: string;
  bounds: number[];
  origin: { lon: number; lat: number; game?: string };
  attribution: string;
  method?: string;
  layers?: Record<string, number>;
}

export interface StreetRecord {
  name: string;
  type?: string;
  detail?: string;
  lng: number;
  lat: number;
  class?: string;
}

export interface PlaceRecord {
  name: string;
  type: string;
  detail?: string;
  lng: number;
  lat: number;
  kind?: string;
  x?: number;
  z?: number;
}

export interface WorldfolkBundle {
  manifest: WorldfolkManifest;
  streets: StreetRecord[];
  places: PlaceRecord[];
}

const ORIGIN_LON = 106.5482;
const ORIGIN_LAT = 29.5648;
const M_LON = 111320 * Math.cos((ORIGIN_LAT * Math.PI) / 180);
const M_LAT = 111320;

export function llToXz(lon: number, lat: number): { x: number; z: number } {
  return {
    x: (lon - ORIGIN_LON) * M_LON,
    z: -(lat - ORIGIN_LAT) * M_LAT,
  };
}

export async function loadWorldfolkBundle(): Promise<WorldfolkBundle> {
  const base = './maps/beibin-v1';
  const [manifest, streets, places] = await Promise.all([
    fetch(`${base}/manifest.json`).then((r) => {
      if (!r.ok) throw new Error('beibin-v1 manifest missing');
      return r.json();
    }),
    fetch(`${base}/streets.json`).then((r) => (r.ok ? r.json() : [])),
    fetch(`${base}/places.json`).then((r) => (r.ok ? r.json() : [])),
  ]);
  return { manifest, streets, places };
}

function makeLabelTexture(text: string, opts?: { fill?: string; stroke?: string; fontPx?: number }) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const fontPx = opts?.fontPx ?? 28;
  ctx.font = `700 ${fontPx}px "Noto Sans SC", system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + 28;
  canvas.width = w;
  canvas.height = fontPx + 22;
  ctx.font = `700 ${fontPx}px "Noto Sans SC", system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 5;
  ctx.strokeStyle = opts?.stroke ?? 'rgba(8,12,18,0.85)';
  ctx.fillStyle = opts?.fill ?? '#f4f7fb';
  ctx.strokeText(text, 14, canvas.height / 2);
  ctx.fillText(text, 14, canvas.height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, aspect: canvas.width / canvas.height };
}

/** Billboard place / street names in 3D — Worldfolk places.json / streets.json role. */
export function addPlaceLabels(
  parent: THREE.Object3D,
  places: PlaceRecord[],
  streets: StreetRecord[],
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'worldfolkLabels';
  parent.add(group);

  for (const p of places) {
    if (p.type === 'water') continue;
    const pos =
      p.x != null && p.z != null ? { x: p.x, z: p.z } : llToXz(p.lng, p.lat);
    const { tex, aspect } = makeLabelTexture(p.name, {
      fill: p.type === 'neighbourhood' ? '#ffe7c2' : '#e8f6ff',
      fontPx: p.type === 'neighbourhood' ? 32 : 26,
    });
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      opacity: 0.92,
    });
    const spr = new THREE.Sprite(mat);
    const h = p.type === 'neighbourhood' ? 2.4 : 1.7;
    spr.scale.set(h * aspect, h, 1);
    spr.position.set(pos.x, p.type === 'neighbourhood' ? 6.5 : 3.4, pos.z);
    group.add(spr);
  }

  for (const s of streets) {
    const pos = llToXz(s.lng, s.lat);
    const { tex, aspect } = makeLabelTexture(s.name, {
      fill: '#b8f0c8',
      fontPx: 24,
    });
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      opacity: 0.88,
    });
    const spr = new THREE.Sprite(mat);
    const h = 1.55;
    spr.scale.set(h * aspect, h, 1);
    // lift street names above road
    spr.position.set(pos.x, 4.2, pos.z);
    group.add(spr);
  }

  return group;
}

export interface MiniMapHandle {
  root: HTMLElement;
  update: (playerX: number, playerZ: number, headingRad: number) => void;
  setAttribution: (text: string) => void;
}

/**
 * Canvas radar minimap — same job as Worldfolk minimap.js:
 * nearby roads + water + place dots + YOU arrow, no second MapLibre instance required.
 */
export function createBeibinMiniMap(
  roads: Array<{ name?: string; coords: number[][]; width: number; highway?: string }>,
  places: PlaceRecord[],
  waterRing?: number[][],
): MiniMapHandle {
  const root = document.createElement('section');
  root.id = 'minimap';
  root.setAttribute('aria-label', '北滨路小地图');
  root.innerHTML = `
    <canvas width="220" height="220" role="img" aria-label="北滨路道路与地点"></canvas>
    <div class="mm-cap">⌖ 江北北滨</div>
    <div class="mm-attr" id="mm-attr">© OpenStreetMap</div>
  `;
  document.getElementById('hud')?.appendChild(root);

  const canvas = root.querySelector('canvas')!;
  const ctx = canvas.getContext('2d')!;
  const cap = root.querySelector('.mm-cap') as HTMLElement;
  const attrEl = root.querySelector('#mm-attr') as HTMLElement;
  const size = 220;
  const mid = size / 2;
  const scale = 1.15; // px per meter

  function worldToCanvas(x: number, z: number, px: number, pz: number, heading: number) {
    const dx = x - px;
    const dz = z - pz;
    const c = Math.cos(-heading);
    const s = Math.sin(-heading);
    const rx = dx * c - dz * s;
    const rz = dx * s + dz * c;
    return [mid + rx * scale, mid + rz * scale] as const;
  }

  function update(playerX: number, playerZ: number, headingRad: number) {
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(mid, mid, 104, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#d7dbd0';
    ctx.fillRect(0, 0, size, size);

    // water
    if (waterRing && waterRing.length >= 3) {
      ctx.beginPath();
      waterRing.forEach(([x, z], i) => {
        const [cx, cy] = worldToCanvas(x, z, playerX, playerZ, headingRad);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.closePath();
      ctx.fillStyle = '#6aa0b8';
      ctx.fill();
    }

    // roads
    for (const road of roads) {
      if (road.coords.length < 2) continue;
      const primary = road.highway === 'primary';
      ctx.beginPath();
      road.coords.forEach(([x, z], i) => {
        const [cx, cy] = worldToCanvas(x, z, playerX, playerZ, headingRad);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#8f968f';
      ctx.lineWidth = (primary ? 9 : 5) + 2;
      ctx.stroke();
      ctx.strokeStyle = primary ? '#3a3d40' : '#4a4e52';
      ctx.lineWidth = primary ? 9 : 5;
      ctx.stroke();
    }

    // places
    const labeled: Array<[number, number]> = [];
    ctx.font = '600 11px "Noto Sans SC", sans-serif';
    for (const p of places) {
      if (p.type === 'water') continue;
      const pos =
        p.x != null && p.z != null ? { x: p.x, z: p.z } : llToXz(p.lng, p.lat);
      const [cx, cy] = worldToCanvas(pos.x, pos.z, playerX, playerZ, headingRad);
      if (Math.hypot(cx - mid, cy - mid) > 96) continue;
      ctx.fillStyle = '#25665e';
      ctx.beginPath();
      ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
      ctx.fill();
      if (
        labeled.length < 3 &&
        !labeled.some(([lx, ly]) => Math.hypot(lx - cx, ly - cy) < 36) &&
        Math.hypot(cx - mid, cy - mid) > 28
      ) {
        labeled.push([cx, cy]);
        const label = p.name.slice(0, 8);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#f5f6ee';
        ctx.fillStyle = '#153e35';
        ctx.strokeText(label, cx + 5, cy - 6);
        ctx.fillText(label, cx + 5, cy - 6);
      }
    }

    // YOU
    ctx.beginPath();
    ctx.arc(mid, mid, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffffdf';
    ctx.fill();
    ctx.strokeStyle = '#1278bd';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.translate(mid, mid);
    // canvas already rotated by -heading in projection; draw facing up
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 9);
    ctx.lineTo(0, 4);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fillStyle = '#1278bd';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // N marker
    ctx.fillStyle = '#153e35';
    ctx.beginPath();
    ctx.arc(mid, 18, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', mid, 22);
    ctx.textAlign = 'start';
    ctx.restore();

    cap.textContent = '⌖ 江北北滨路';
  }

  return {
    root,
    update,
    setAttribution(text: string) {
      attrEl.textContent = text;
    },
  };
}
