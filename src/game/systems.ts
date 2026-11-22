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
  state.needs.hunger = Math.max(0, state.needs.hunger - dt * 0.55);
  state.needs.energy = Math.max(0, state.needs.energy - dt * 0.35);
}

export function formatClock(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function sunDirection(hour: number): THREE.Vector3 {
  const t = ((hour - 6) / 12) * Math.PI;
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
  sun.position.copy(dir.clone().multiplyScalar(90));
  const dayFactor = THREE.MathUtils.clamp(dir.y * 1.4, 0, 1);
  const dusk = hour > 17 && hour < 20 ? (20 - hour) / 3 : hour >= 5 && hour < 7 ? (hour - 5) / 2 : dayFactor;
  const night = hour >= 19.5 || hour < 5.8;

  sun.intensity = night ? 0.04 : 1.55 * dayFactor + 0.12;
  sun.color.set(night ? 0x8899bb : dusk < 0.55 ? 0xffb074 : 0xfff2dd);
  hemi.intensity = night ? 0.1 : 0.42 * dayFactor + 0.12;
  ambient.intensity = night ? 0.07 : 0.2 * dayFactor + 0.07;

  const skyDay = new THREE.Color(0x87b7e8);
  const skyDusk = new THREE.Color(0xc46b3a);
  const skyNight = new THREE.Color(0x050914);
  const sky = night ? skyNight : dayFactor < 0.35 ? skyDusk.clone().lerp(skyDay, dayFactor / 0.35) : skyDay;
  scene.background = sky;
  scene.fog = new THREE.Fog(sky.getHex(), 55, night ? 210 : 280);

  const lampI = night ? 2.6 : dayFactor < 0.25 ? 1.7 : 0.04;
  for (const l of world.lamps) l.intensity = lampI;

  for (const m of world.windowMats) {
    m.emissiveIntensity = night ? 0.6 : dayFactor < 0.2 ? 0.38 : 0.02;
  }
  for (const m of world.storeGlow) {
    m.emissiveIntensity = night ? 1.15 : 0.45;
  }
  for (const m of world.neonMats) {
    m.emissiveIntensity = night ? 1.35 : dayFactor < 0.25 ? 0.85 : 0.2;
  }

  const roads = world.roadMats?.length ? world.roadMats : [world.roadMat];
  for (const rm of roads) {
    rm.roughness = night ? 0.16 : 0.26;
    rm.metalness = night ? 0.42 : 0.28;
  }
}
