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

/** Real seconds for one in-game hour. ~3.5 min real ≈ 24h game day. */
export const SEC_PER_GAME_HOUR = 9;

export function advanceTime(state: GameState, dt: number) {
  state.gameHour += dt / SEC_PER_GAME_HOUR;
  if (state.gameHour >= 24) {
    state.gameHour -= 24;
    state.dayComplete = true;
  }
  // needs drain
  state.needs.hunger = Math.max(0, state.needs.hunger - dt * 0.55);
  state.needs.energy = Math.max(0, state.needs.energy - dt * 0.35);
}

export function formatClock(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function sunDirection(hour: number): THREE.Vector3 {
  // 6=sunrise, 12=noon, 18=sunset
  const t = ((hour - 6) / 12) * Math.PI; // 0 at sunrise, pi at sunset
  const elev = Math.sin(t);
  const az = Math.cos(t);
  return new THREE.Vector3(az * 0.7, Math.max(0.05, elev), -0.35).normalize();
}

export function applyDayNight(
  hour: number,
  sun: THREE.DirectionalLight,
  hemi: THREE.HemisphereLight,
  ambient: THREE.AmbientLight,
  scene: THREE.Scene,
  world: WorldHandles,
) {
  const dir = sunDirection(hour);
  sun.position.copy(dir.clone().multiplyScalar(60));
  const dayFactor = THREE.MathUtils.clamp(dir.y * 1.4, 0, 1);
  const dusk = hour > 17 && hour < 20 ? (20 - hour) / 3 : hour >= 5 && hour < 7 ? (hour - 5) / 2 : dayFactor;
  const night = hour >= 19.5 || hour < 5.8;

  sun.intensity = night ? 0.05 : 1.6 * dayFactor + 0.15;
  sun.color.set(night ? 0x8899bb : dusk < 0.55 ? 0xffb074 : 0xfff2dd);
  hemi.intensity = night ? 0.12 : 0.45 * dayFactor + 0.15;
  ambient.intensity = night ? 0.08 : 0.22 * dayFactor + 0.08;

  const skyDay = new THREE.Color(0x87b7e8);
  const skyDusk = new THREE.Color(0xc46b3a);
  const skyNight = new THREE.Color(0x060a14);
  const sky = night ? skyNight : dayFactor < 0.35 ? skyDusk.clone().lerp(skyDay, dayFactor / 0.35) : skyDay;
  scene.background = sky;
  scene.fog = new THREE.Fog(sky.getHex(), 35, night ? 90 : 130);

  const lampI = night ? 2.4 : dayFactor < 0.25 ? 1.6 : 0.05;
  for (const l of world.lamps) l.intensity = lampI;

  for (const m of world.windowMats) {
    m.emissiveIntensity = night ? 0.55 + Math.random() * 0.05 : dayFactor < 0.2 ? 0.35 : 0.02;
  }
  for (const m of world.storeGlow) {
    m.emissiveIntensity = night ? 1.1 : 0.45;
  }

  // wet road more reflective at night / dusk
  world.roadMat.roughness = night ? 0.18 : 0.28;
  world.roadMat.metalness = night ? 0.4 : 0.28;
}
