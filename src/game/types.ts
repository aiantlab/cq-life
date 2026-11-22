export type Mode = 'walk' | 'run' | 'bike' | 'drive';

export interface Needs {
  hunger: number; // 0..100
  energy: number; // 0..100
  hygiene: number; // 0..100 — UK Life style
  fun: number; // 0..100
  cash: number;
}

export interface Interactable {
  id: string;
  label: string;
  position: { x: number; y: number; z: number };
  radius: number;
  action: () => void;
}

export interface GameState {
  mode: Mode;
  needs: Needs;
  gameHour: number; // 0..24
  outfit: 'casual' | 'home' | 'jacket';
  inside: 'outside' | 'home' | 'store';
  dayComplete: boolean;
  hasBike: boolean;
  bikeDepositPaid: boolean;
}
