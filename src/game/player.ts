import * as THREE from 'three';
import type { Mode } from './types';

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

  private keys = new Set<string>();
  private canvas: HTMLCanvasElement;
  private pointerLocked = false;

  constructor(canvas: HTMLCanvasElement, spawn: THREE.Vector3) {
    this.canvas = canvas;
    this.position.copy(spawn);
    this.position.y = this.height;

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
      this.yaw -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.0020;
      this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch));
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
    return new THREE.Vector3(-Math.sin(this.yaw) * c, Math.sin(this.pitch), -Math.cos(this.yaw) * c);
  }

  get forwardFlat(): THREE.Vector3 {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
  }

  get rightFlat(): THREE.Vector3 {
    return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
  }

  updateWalk(dt: number, colliders: THREE.Box3[]) {
    const run = this.isDown('ShiftLeft') || this.isDown('ShiftRight');
    const speed = run ? 6.2 : 3.6;
    const wish = new THREE.Vector3();
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) wish.add(this.forwardFlat);
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) wish.sub(this.forwardFlat);
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) wish.sub(this.rightFlat);
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) wish.add(this.rightFlat);
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, wish.x, 12, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, wish.z, 12, dt);
    this.velocity.y = 0;

    this.moveWithColliders(dt, colliders, this.radius);
    this.position.y = this.height;
  }

  updateDrive(dt: number, car: THREE.Group, colliders: THREE.Box3[]) {
    let throttle = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) throttle += 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) throttle -= 1;
    let steer = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) steer += 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) steer -= 1;

    const maxSpeed = 14;
    const accel = 10;
    const target = throttle * maxSpeed;
    const forwardSpeed = this.velocity.dot(
      new THREE.Vector3(-Math.sin(this.carYaw), 0, -Math.cos(this.carYaw)),
    );
    const newSpeed = THREE.MathUtils.damp(forwardSpeed, target, accel * 0.35, dt);
    if (Math.abs(newSpeed) > 0.4) {
      this.carYaw += steer * dt * 1.5 * Math.sign(newSpeed);
    }
    const dir = new THREE.Vector3(-Math.sin(this.carYaw), 0, -Math.cos(this.carYaw));
    this.velocity.copy(dir.multiplyScalar(newSpeed));
    // friction when no input
    if (throttle === 0) {
      this.velocity.multiplyScalar(Math.max(0, 1 - dt * 1.8));
    }

    this.moveWithColliders(dt, colliders, 1.1);
    this.position.y = 0.9;
    car.position.set(this.position.x, 0, this.position.z);
    car.rotation.y = this.carYaw;
    this.yaw = this.carYaw;
  }

  private moveWithColliders(dt: number, colliders: THREE.Box3[], radius: number) {
    const next = this.position.clone().addScaledVector(this.velocity, dt);
    // X then Z sweep
    const tryX = this.position.clone();
    tryX.x = next.x;
    if (!this.hits(tryX, colliders, radius)) this.position.x = tryX.x;
    else this.velocity.x = 0;

    const tryZ = this.position.clone();
    tryZ.z = next.z;
    if (!this.hits(tryZ, colliders, radius)) this.position.z = tryZ.z;
    else this.velocity.z = 0;

    // soft world bounds
    this.position.x = THREE.MathUtils.clamp(this.position.x, -48, 48);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -50, 55);
  }

  private hits(pos: THREE.Vector3, colliders: THREE.Box3[], radius: number) {
    const body = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(pos.x, 1.0, pos.z),
      new THREE.Vector3(radius * 2, 1.8, radius * 2),
    );
    for (const c of colliders) {
      if (body.intersectsBox(c)) return true;
    }
    return false;
  }

  applyCamera(camera: THREE.PerspectiveCamera) {
    if (this.mode === 'walk') {
      camera.position.copy(this.position);
      const target = this.position.clone().add(this.lookDir);
      camera.lookAt(target);
    } else {
      const back = new THREE.Vector3(Math.sin(this.carYaw), 0, Math.cos(this.carYaw));
      camera.position.set(
        this.position.x + back.x * 7.5,
        3.8,
        this.position.z + back.z * 7.5,
      );
      camera.lookAt(this.position.x, 1.2, this.position.z);
    }
  }
}
