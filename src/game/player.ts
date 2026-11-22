import * as THREE from 'three';
import type { Mode } from './types';
import { sampleGround, sampleSlopePitch, overRiver, onBridgeDeck, WORLD_BOUNDS } from './ground';

const _wish = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _look = new THREE.Vector3();
const _back = new THREE.Vector3();

export class PlayerController {
  mode: Mode = 'walk';
  position = new THREE.Vector3();
  velocity = new THREE.Vector3();
  yaw = 0;
  pitch = -0.12;
  height = 1.7;
  radius = 0.35;
  onGround = true;
  carYaw = Math.PI;
  groundY = 0;
  private camPos = new THREE.Vector3();
  private camTarget = new THREE.Vector3();
  private camInitialized = false;
  private vehiclePitch = 0;

  private keys = new Set<string>();
  private canvas: HTMLCanvasElement;
  private pointerLocked = false;
  private bodyBox = new THREE.Box3();
  private bodyCenter = new THREE.Vector3();
  private bodySize = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, spawn: THREE.Vector3) {
    this.canvas = canvas;
    this.position.copy(spawn);
    this.groundY = sampleGround(spawn.x, spawn.z);
    this.position.y = this.height + this.groundY;

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    canvas.addEventListener('click', () => {
      if (!this.pointerLocked) canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      if (this.mode === 'drive' || this.mode === 'bike') return;
      this.yaw -= e.movementX * 0.0020;
      this.pitch -= e.movementY * 0.0018;
      this.pitch = Math.max(-1.15, Math.min(1.15, this.pitch));
    });
  }

  consumeKey(code: string): boolean {
    if (!this.keys.has(code)) return false;
    this.keys.delete(code);
    return true;
  }

  isDown(code: string) {
    return this.keys.has(code);
  }

  get lookDir(): THREE.Vector3 {
    const c = Math.cos(this.pitch);
    return _look.set(-Math.sin(this.yaw) * c, Math.sin(this.pitch), -Math.cos(this.yaw) * c);
  }

  get forwardFlat(): THREE.Vector3 {
    return _fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  get rightFlat(): THREE.Vector3 {
    return _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  /** Foot modes: walk / run (Shift). */
  updateWalk(dt: number, colliders: THREE.Box3[]) {
    const wantRun = this.isDown('ShiftLeft') || this.isDown('ShiftRight');
    if (this.mode === 'walk' || this.mode === 'run') {
      this.mode = wantRun ? 'run' : 'walk';
    }
    const maxSpeed = this.mode === 'run' ? 7.4 : 3.9;
    _wish.set(0, 0, 0);
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) _wish.add(this.forwardFlat);
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) _wish.sub(this.forwardFlat);
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) _wish.sub(this.rightFlat);
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) _wish.add(this.rightFlat);
    const hasWish = _wish.lengthSq() > 0;
    if (hasWish) _wish.normalize().multiplyScalar(maxSpeed);

    const resp = hasWish ? (this.mode === 'run' ? 14 : 16) : 22;
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, _wish.x, resp, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, _wish.z, resp, dt);
    this.velocity.y = 0;

    this.moveSubsteps(dt, colliders, this.radius, 3);
    this.smoothGround(dt, 18);
    this.position.y = this.height + this.groundY;
  }

  /** Shared bike — light, snappy, lean into turns. */
  updateBike(dt: number, bike: THREE.Group, colliders: THREE.Box3[]) {
    let throttle = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) throttle += 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) throttle -= 0.55;
    let steer = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) steer += 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) steer -= 1;

    const maxSpeed = 12.5;
    _fwd.set(-Math.sin(this.carYaw), 0, -Math.cos(this.carYaw));
    const forwardSpeed = this.velocity.dot(_fwd);
    const target = throttle * maxSpeed;
    const rate = throttle > 0 ? 7.5 : throttle < 0 ? 9 : 6;
    const newSpeed = THREE.MathUtils.damp(forwardSpeed, target, rate, dt);

    const speedFactor = THREE.MathUtils.clamp(Math.abs(newSpeed) / maxSpeed, 0.12, 1);
    if (Math.abs(newSpeed) > 0.2) {
      this.carYaw += steer * dt * (2.35 - 0.9 * speedFactor) * Math.sign(newSpeed || 1);
    }

    _fwd.set(-Math.sin(this.carYaw), 0, -Math.cos(this.carYaw));
    this.velocity.copy(_fwd.multiplyScalar(newSpeed));

    this.moveSubsteps(dt, colliders, 0.55, 3);
    this.smoothGround(dt, 20);
    this.position.y = 0.95 + this.groundY;

    const slope = sampleSlopePitch(this.position.x, this.position.z);
    this.vehiclePitch = THREE.MathUtils.damp(this.vehiclePitch, slope, 12, dt);
    const lean = THREE.MathUtils.damp(bike.rotation.z, -steer * 0.28 * speedFactor, 10, dt);

    bike.visible = true;
    bike.position.set(this.position.x, this.groundY, this.position.z);
    bike.rotation.order = 'YXZ';
    bike.rotation.y = this.carYaw;
    bike.rotation.x = this.vehiclePitch;
    bike.rotation.z = lean;
    this.yaw = this.carYaw;
  }

  updateDrive(dt: number, car: THREE.Group, colliders: THREE.Box3[]) {
    let throttle = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) throttle += 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) throttle -= 0.7;
    let steer = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) steer += 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) steer -= 1;

    const maxSpeed = 18;
    _fwd.set(-Math.sin(this.carYaw), 0, -Math.cos(this.carYaw));
    const forwardSpeed = this.velocity.dot(_fwd);
    const target = throttle * maxSpeed;
    const rate = throttle !== 0 ? 5.5 : 7.5;
    const newSpeed = THREE.MathUtils.damp(forwardSpeed, target, rate, dt);

    const speedFactor = THREE.MathUtils.clamp(Math.abs(newSpeed) / maxSpeed, 0.15, 1);
    if (Math.abs(newSpeed) > 0.25) {
      this.carYaw += steer * dt * (1.85 - 0.7 * speedFactor) * Math.sign(newSpeed || 1);
    }

    _fwd.set(-Math.sin(this.carYaw), 0, -Math.cos(this.carYaw));
    this.velocity.copy(_fwd.multiplyScalar(newSpeed));

    this.moveSubsteps(dt, colliders, 1.05, 4);
    this.smoothGround(dt, 20);
    this.position.y = 0.9 + this.groundY;

    const slope = sampleSlopePitch(this.position.x, this.position.z);
    this.vehiclePitch = THREE.MathUtils.damp(this.vehiclePitch, slope, 10, dt);

    car.position.set(this.position.x, this.groundY, this.position.z);
    car.rotation.order = 'YXZ';
    car.rotation.y = this.carYaw;
    car.rotation.x = this.vehiclePitch;
    this.yaw = this.carYaw;
  }

  private smoothGround(dt: number, lambda: number) {
    const target = sampleGround(this.position.x, this.position.z);
    if (Math.abs(target - this.groundY) > 2.5) {
      this.groundY = THREE.MathUtils.damp(this.groundY, target, lambda * 2.2, dt);
    } else {
      this.groundY = THREE.MathUtils.damp(this.groundY, target, lambda, dt);
    }
  }

  private moveSubsteps(dt: number, colliders: THREE.Box3[], radius: number, steps: number) {
    const stepDt = dt / steps;
    for (let i = 0; i < steps; i++) this.moveWithColliders(stepDt, colliders, radius);
  }

  private moveWithColliders(dt: number, colliders: THREE.Box3[], radius: number) {
    const nextX = this.position.x + this.velocity.x * dt;
    const nextZ = this.position.z + this.velocity.z * dt;

    if (this.canOccupy(nextX, this.position.z, colliders, radius)) this.position.x = nextX;
    else this.velocity.x = 0;

    if (this.canOccupy(this.position.x, nextZ, colliders, radius)) this.position.z = nextZ;
    else this.velocity.z = 0;

    this.position.x = THREE.MathUtils.clamp(this.position.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX);
    this.position.z = THREE.MathUtils.clamp(this.position.z, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ);
  }

  private canOccupy(x: number, z: number, colliders: THREE.Box3[], radius: number) {
    if (overRiver(x, z) && !onBridgeDeck(x, z)) return false;
    return !this.hits(x, z, colliders, radius);
  }

  private hits(x: number, z: number, colliders: THREE.Box3[], radius: number) {
    const g = sampleGround(x, z);
    this.bodyCenter.set(x, g + 1.0, z);
    this.bodySize.set(radius * 2, 1.75, radius * 2);
    this.bodyBox.setFromCenterAndSize(this.bodyCenter, this.bodySize);
    for (let i = 0; i < colliders.length; i++) {
      if (this.bodyBox.intersectsBox(colliders[i])) return true;
    }
    return false;
  }

  applyCamera(camera: THREE.PerspectiveCamera, dt: number) {
    if (this.mode === 'walk' || this.mode === 'run') {
      _camPos.copy(this.position);
      // slight bob hint when running (very soft)
      if (this.mode === 'run' && this.velocity.lengthSq() > 4) {
        _camPos.y += Math.sin(performance.now() * 0.012) * 0.03;
      }
      _camTarget.copy(this.position).add(this.lookDir);
    } else if (this.mode === 'bike') {
      _back.set(Math.sin(this.carYaw), 0, Math.cos(this.carYaw));
      _camPos.set(
        this.position.x + _back.x * 5.2,
        this.groundY + 2.6,
        this.position.z + _back.z * 5.2,
      );
      _camTarget.set(this.position.x, this.groundY + 1.15, this.position.z);
    } else {
      _back.set(Math.sin(this.carYaw), 0, Math.cos(this.carYaw));
      _camPos.set(
        this.position.x + _back.x * 8.8,
        this.groundY + 4.0,
        this.position.z + _back.z * 8.8,
      );
      _camTarget.set(this.position.x, this.groundY + 1.35, this.position.z);
    }

    if (!this.camInitialized) {
      this.camPos.copy(_camPos);
      this.camTarget.copy(_camTarget);
      this.camInitialized = true;
    } else {
      this.camPos.x = THREE.MathUtils.damp(this.camPos.x, _camPos.x, 14, dt);
      this.camPos.z = THREE.MathUtils.damp(this.camPos.z, _camPos.z, 14, dt);
      this.camPos.y = THREE.MathUtils.damp(this.camPos.y, _camPos.y, 10, dt);
      this.camTarget.x = THREE.MathUtils.damp(this.camTarget.x, _camTarget.x, 16, dt);
      this.camTarget.z = THREE.MathUtils.damp(this.camTarget.z, _camTarget.z, 16, dt);
      this.camTarget.y = THREE.MathUtils.damp(this.camTarget.y, _camTarget.y, 12, dt);
    }

    camera.position.copy(this.camPos);
    camera.lookAt(this.camTarget);
  }

  snapTo(x: number, z: number, yaw?: number) {
    this.position.x = x;
    this.position.z = z;
    this.groundY = sampleGround(x, z);
    this.position.y = this.height + this.groundY;
    this.velocity.set(0, 0, 0);
    if (yaw !== undefined) this.yaw = yaw;
    this.camInitialized = false;
  }
}
