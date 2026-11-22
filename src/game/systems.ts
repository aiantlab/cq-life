import * as THREE from 'three';
import type { GameState } from './types';
import type { WorldHandles } from './world';

export function createState(): GameState {
  return {
    mode: 'walk',
    needs: { hunger: 72, energy: 80, cash: 120 },
    gameHour: 7.5,
    outfit: 'casual',
    inside: 'outside',
    dayComplete: false,
  };
}

/**
 * Time / needs tuning (feel pass):
 * - SEC_PER_GAME_HOUR = 7 → ~2.8 min real ≈ 24h game day (noticeable sky shift while exploring)
 * - Hunger ~1.5%/s at drain 0.85 → empty from 72 in ~85s if ignored
 * - Energy drain slower; accelerates when starving
 */
export const SEC_PER_GAME_HOUR = 7;
export const HUNGER_DRAIN_PER_SEC = 0.85;
export const ENERGY_DRAIN_PER_SEC = 0.48;

export function advanceTime(state: GameState, dt: number) {
  state.gameHour += dt / SEC_PER_GAME_HOUR;
  if (state.gameHour >= 24) {
    state.gameHour -= 24;
    state.dayComplete = true;
  }
  state.needs.hunger = Math.max(0, state.needs.hunger - dt * HUNGER_DRAIN_PER_SEC);
  state.needs.energy = Math.max(0, state.needs.energy - dt * ENERGY_DRAIN_PER_SEC);
}

export function formatClock(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function dayPhaseLabel(hour: number): string {
  if (hour >= 5 && hour < 8) return '清晨';
  if (hour >= 8 && hour < 17) return '白天';
  if (hour >= 17 && hour < 19.5) return '黄昏';
  return '夜晚';
}

export function sunDirection(hour: number): THREE.Vector3 {
  const t = ((hour - 6) / 12) * Math.PI;
  const elev = Math.sin(t);
  const az = Math.cos(t);
  return new THREE.Vector3(az * 0.7, Math.max(0.05, elev), -0.35).normalize();
}

const _skyDay = new THREE.Color(0x87b7e8);
const _skyDusk = new THREE.Color(0xc46b3a);
const _skyNight = new THREE.Color(0x050914);
const _sky = new THREE.Color();
const _sunCol = new THREE.Color();
let _fog: THREE.Fog | null = null;

/** Visual day/night — call throttled (~8–12 Hz). No per-frame random (prevents flicker). */
export function applyDayNight(
  hour: number,
  sun: THREE.DirectionalLight,
  hemi: THREE.HemisphereLight,
  ambient: THREE.AmbientLight,
  scene: THREE.Scene,
  world: WorldHandles,
) {
  const dir = sunDirection(hour);
  sun.position.copy(dir).multiplyScalar(90);
  const dayFactor = THREE.MathUtils.clamp(dir.y * 1.4, 0, 1);
  const dusk =
    hour > 17 && hour < 20 ? (20 - hour) / 3 : hour >= 5 && hour < 7 ? (hour - 5) / 2 : dayFactor;
  const night = hour >= 19.5 || hour < 5.8;

  const sunI = night ? 0.04 : 1.55 * dayFactor + 0.12;
  sun.intensity = THREE.MathUtils.damp(sun.intensity, sunI, 3, 0.12);
  _sunCol.set(night ? 0x8899bb : dusk < 0.55 ? 0xffb074 : 0xfff2dd);
  sun.color.lerp(_sunCol, 0.35);

  hemi.intensity = THREE.MathUtils.damp(hemi.intensity, night ? 0.1 : 0.42 * dayFactor + 0.12, 3, 0.12);
  ambient.intensity = THREE.MathUtils.damp(ambient.intensity, night ? 0.07 : 0.2 * dayFactor + 0.07, 3, 0.12);

  if (night) _sky.copy(_skyNight);
  else if (dayFactor < 0.35) _sky.copy(_skyDusk).lerp(_skyDay, dayFactor / 0.35);
  else _sky.copy(_skyDay);
  if (!(scene.background instanceof THREE.Color)) scene.background = _sky.clone();
  else (scene.background as THREE.Color).lerp(_sky, 0.25);

  const fogFar = night ? 200 : 270;
  const fogNear = 50;
  const bg = scene.background as THREE.Color;
  if (!_fog) {
    _fog = new THREE.Fog(bg.getHex(), fogNear, fogFar);
    scene.fog = _fog;
  } else {
    _fog.color.copy(bg);
    _fog.near = fogNear;
    _fog.far = THREE.MathUtils.damp(_fog.far, fogFar, 2, 0.12);
    scene.fog = _fog;
  }

  const lampI = night ? 2.55 : dayFactor < 0.25 ? 1.65 : 0.04;
  for (const l of world.lamps) l.intensity = THREE.MathUtils.damp(l.intensity, lampI, 4, 0.12);

  const winI = night ? 0.62 : dayFactor < 0.2 ? 0.38 : 0.02;
  for (const m of world.windowMats) m.emissiveIntensity = winI;
  const storeI = night ? 1.15 : 0.45;
  for (const m of world.storeGlow) m.emissiveIntensity = storeI;
  const neonI = night ? 1.35 : dayFactor < 0.25 ? 0.85 : 0.2;
  for (const m of world.neonMats) m.emissiveIntensity = neonI;

  const roads = world.roadMats?.length ? world.roadMats : [world.roadMat];
  for (const rm of roads) {
    rm.roughness = night ? 0.16 : 0.26;
    rm.metalness = night ? 0.42 : 0.28;
  }
}
