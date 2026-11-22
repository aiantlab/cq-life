import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { buildWorld, type WorldHandles } from './world';
import { PlayerController } from './player';
import { createState, advanceTime, applyDayNight } from './systems';
import { HUD } from './ui';
import type { GameState, Interactable } from './types';
import { sampleGround } from './ground';

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private sun!: THREE.DirectionalLight;
  private hemi!: THREE.HemisphereLight;
  private ambient!: THREE.AmbientLight;
  private world!: WorldHandles;
  private player!: PlayerController;
  private state: GameState = createState();
  private hud = new HUD();
  private running = false;
  private last = 0;
  private rapierReady = false;
  private physicsWorld: RAPIER.World | null = null;
  private homeGroup!: THREE.Object3D;
  private storeGroup!: THREE.Object3D;
  private playerMesh!: THREE.Group;
  private nanbinArrived = false;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 420);
    window.addEventListener('resize', () => this.onResize());
  }

  async init() {
    await RAPIER.init();
    this.rapierReady = true;
    this.physicsWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    // Static ground collider (also keep AABB colliders for simple player move)
    const ground = RAPIER.ColliderDesc.cuboid(80, 0.1, 70).setTranslation(0, -0.1, 0);
    this.physicsWorld.createCollider(ground);

    this.hemi = new THREE.HemisphereLight(0xb1d0ff, 0x3a2a1c, 0.4);
    this.scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xfff2dd, 1.4);
    this.sun.position.set(30, 50, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 260;
    this.sun.shadow.camera.left = -90;
    this.sun.shadow.camera.right = 90;
    this.sun.shadow.camera.top = 120;
    this.sun.shadow.camera.bottom = -80;
    this.scene.add(this.sun);

    this.world = buildWorld(this.scene, {
      enterHome: () => this.enterHome(),
      exitHome: () => this.exitHome(),
      enterStore: () => this.enterStore(),
      exitStore: () => this.exitStore(),
      eat: () => this.eat(),
      sleep: () => this.sleep(),
      changeClothes: () => this.changeClothes(),
      buyFood: () => this.buyFood(),
      buyDrink: () => this.buyDrink(),
    });

    this.homeGroup = this.scene.getObjectByName('homeInterior')!;
    this.storeGroup = this.scene.getObjectByName('storeInterior')!;

    this.player = new PlayerController(this.canvas, this.world.spawn);
    this.playerMesh = this.makePlayerAvatar();
    this.scene.add(this.playerMesh);

    applyDayNight(this.state.gameHour, this.sun, this.hemi, this.ambient, this.scene, this.world);
    this.hud.update(this.state, 0);
  }

  private makePlayerAvatar() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.9, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.65, metalness: 0.1 }),
    );
    body.position.y = 0.95;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xe8c4a8, roughness: 0.7 }),
    );
    head.position.y = 1.7;
    head.castShadow = true;
    g.add(head);
    return g;
  }

  start() {
    this.running = true;
    this.hud.hideTitle();
    this.canvas.requestPointerLock();
    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  private frame(t: number) {
    if (!this.running) return;
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame((nt) => this.frame(nt));
  }

  private update(dt: number) {
    advanceTime(this.state, dt);
    applyDayNight(this.state.gameHour, this.sun, this.hemi, this.ambient, this.scene, this.world);

    if (this.player.consumeKey('KeyF')) this.toggleVehicle();

    if (this.player.mode === 'drive') {
      this.player.updateDrive(dt, this.world.car, this.world.colliders);
      this.playerMesh.visible = false;
    } else {
      this.player.updateWalk(dt, this.activeColliders());
      this.playerMesh.visible = this.state.inside === 'outside';
      this.playerMesh.position.set(this.player.position.x, sampleGround(this.player.position.x, this.player.position.z), this.player.position.z);
      this.playerMesh.rotation.y = this.player.yaw;
    }

    this.player.applyCamera(this.camera);
    if (this.physicsWorld) this.physicsWorld.step();

    const nearby = this.findInteractable();
    this.hud.setPrompt(nearby && this.player.mode === 'walk' ? nearby.label : this.vehiclePrompt());
    if (nearby && this.player.mode === 'walk' && this.player.consumeKey('KeyE')) {
      if (nearby.id === 'nanbin-hint') {
        this.hud.showToast('向南沿路开上东水门大桥，过江即到南滨路夜景段');
      } else {
        nearby.action();
      }
    }

    if (this.state.needs.hunger <= 0) {
      this.state.needs.energy = Math.max(0, this.state.needs.energy - dt * 2);
      this.hud.showToast('你太饿了，精力在下降…', 1.2);
    }
    const pz = this.player.position.z;
    if (!this.nanbinArrived && pz > 140) {
      this.nanbinArrived = true;
      this.hud.showToast('抵达南滨路滨江段', 3.2);
    }

    if (this.state.dayComplete) {
      this.hud.showToast('已过完一天！切片1验收循环达成。', 4);
      this.state.dayComplete = false;
    }

    this.hud.update(this.state, dt);
  }

  private vehiclePrompt(): string | null {
    if (this.state.inside !== 'outside') return null;
    const carPos = this.world.car.position;
    const d = this.player.position.distanceTo(new THREE.Vector3(carPos.x, this.player.position.y, carPos.z));
    if (this.player.mode === 'drive') return '按 F 下车';
    if (d < 3.2) return '按 F 上车';
    return null;
  }

  private toggleVehicle() {
    if (this.state.inside !== 'outside') {
      this.hud.showToast('室内不能开车');
      return;
    }
    const carPos = this.world.car.position;
    const d = this.player.position.distanceTo(new THREE.Vector3(carPos.x, this.player.position.y, carPos.z));
    if (this.player.mode === 'walk') {
      if (d > 3.2) {
        this.hud.showToast('靠近车辆再按 F');
        return;
      }
      this.player.mode = 'drive';
      this.state.mode = 'drive';
      this.player.position.set(carPos.x, 0.9, carPos.z);
      this.player.carYaw = this.world.car.rotation.y;
      this.hud.showToast('已上车');
    } else {
      this.player.mode = 'walk';
      this.state.mode = 'walk';
      this.player.position.set(carPos.x + 1.6, this.player.height, carPos.z);
      this.hud.showToast('已下车');
    }
  }

  private activeColliders() {
    // When inside, disable outdoor building colliders for free room movement
    if (this.state.inside !== 'outside') return [];
    return this.world.colliders;
  }

  private findInteractable(): Interactable | null {
    if (this.player.mode !== 'walk') return null;
    let best: Interactable | null = null;
    let bestD = Infinity;
    for (const it of this.world.interactables) {
      if (!this.interactableAllowed(it.id)) continue;
      const d = this.player.position.distanceTo(new THREE.Vector3(it.position.x, this.player.position.y, it.position.z));
      if (d <= it.radius && d < bestD) {
        best = it;
        bestD = d;
      }
    }
    return best;
  }

  private interactableAllowed(id: string) {
    const inside = this.state.inside;
    if (inside === 'outside') return id === 'home-enter' || id === 'store-enter' || id === 'nanbin-hint';
    if (inside === 'home') return ['home-exit', 'eat', 'sleep', 'clothes'].includes(id);
    if (inside === 'store') return ['store-exit', 'buy-food', 'buy-drink'].includes(id);
    return false;
  }

  private enterHome() {
    if (this.player.mode === 'drive') return;
    this.state.inside = 'home';
    this.homeGroup.visible = true;
    this.player.position.set(-18, this.player.height, -1.5);
    this.hud.showToast('回到家了');
  }

  private exitHome() {
    this.state.inside = 'outside';
    this.homeGroup.visible = false;
    this.player.position.set(-18, this.player.height, 1.0);
    this.hud.showToast('出门');
  }

  private enterStore() {
    if (this.player.mode === 'drive') return;
    this.state.inside = 'store';
    this.storeGroup.visible = true;
    this.player.position.set(14, this.player.height, 42.5);
    this.hud.showToast('进入便利店');
  }

  private exitStore() {
    this.state.inside = 'outside';
    this.storeGroup.visible = false;
    this.player.position.set(14, this.player.height, 39.5);
    this.hud.showToast('离开便利店');
  }

  private eat() {
    if (this.state.inside !== 'home') return;
    this.state.needs.hunger = Math.min(100, this.state.needs.hunger + 45);
    this.state.gameHour = Math.min(23.9, this.state.gameHour + 0.35);
    this.hud.showToast('吃了一顿热饭');
  }

  private sleep() {
    if (this.state.inside !== 'home') return;
    this.state.needs.energy = Math.min(100, this.state.needs.energy + 70);
    this.state.gameHour = (this.state.gameHour + 7) % 24;
    if (this.state.gameHour < 7) this.state.dayComplete = true;
    this.hud.showToast('睡了一觉，精神好多了');
  }

  private changeClothes() {
    if (this.state.inside !== 'home') return;
    const order = ['casual', 'home', 'jacket'] as const;
    const i = order.indexOf(this.state.outfit);
    this.state.outfit = order[(i + 1) % order.length];
    const colors: Record<string, number> = { casual: 0x3b82f6, home: 0x94a3b8, jacket: 0x1f2937 };
    const body = this.playerMesh.children[0] as THREE.Mesh;
    (body.material as THREE.MeshStandardMaterial).color.setHex(colors[this.state.outfit]);
    this.hud.showToast(`已换成：${this.state.outfit === 'casual' ? '日常便装' : this.state.outfit === 'home' ? '居家服' : '外套'}`);
  }

  private buyFood() {
    if (this.state.inside !== 'store') return;
    if (this.state.needs.cash < 18) {
      this.hud.showToast('现金不足');
      return;
    }
    this.state.needs.cash -= 18;
    this.state.needs.hunger = Math.min(100, this.state.needs.hunger + 35);
    this.hud.showToast('买了盒饭并吃了一口');
  }

  private buyDrink() {
    if (this.state.inside !== 'store') return;
    if (this.state.needs.cash < 6) {
      this.hud.showToast('现金不足');
      return;
    }
    this.state.needs.cash -= 6;
    this.state.needs.energy = Math.min(100, this.state.needs.energy + 12);
    this.hud.showToast('买了饮料');
  }
}
