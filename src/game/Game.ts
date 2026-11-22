import * as THREE from 'three';
import { buildWorld, type WorldHandles } from './world';
import { PlayerController } from './player';
import { createState, advanceTime, applyDayNight } from './systems';
import { HUD } from './ui';
import type { GameState, Interactable } from './types';
import { BEIBIN } from './ground';
import { createHumanoid, animateHumanoid } from './character';

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
  private homeGroup!: THREE.Object3D;
  private storeGroup!: THREE.Object3D;
  private playerMesh!: THREE.Group;
  private nanbinArrived = false;
  private beibinToast = false;
  private bridgeToast = false;
  private dayNightAcc = 0;
  private starveToastAcc = 0;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.12, 400);
    window.addEventListener('resize', () => this.onResize());
  }

  async init() {
    this.hemi = new THREE.HemisphereLight(0xb1d0ff, 0x3a2a1c, 0.4);
    this.scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xfff2dd, 1.4);
    this.sun.position.set(30, 50, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 2;
    this.sun.shadow.camera.far = 220;
    this.sun.shadow.camera.left = -70;
    this.sun.shadow.camera.right = 70;
    this.sun.shadow.camera.top = 100;
    this.sun.shadow.camera.bottom = -60;
    this.sun.shadow.bias = -0.00025;
    this.scene.add(this.sun);

    this.world = await buildWorld(this.scene, {
      enterHome: () => this.enterHome(),
      exitHome: () => this.exitHome(),
      enterStore: () => this.enterStore(),
      exitStore: () => this.exitStore(),
      eat: () => this.eat(),
      sleep: () => this.sleep(),
      changeClothes: () => this.changeClothes(),
      buyFood: () => this.buyFood(),
      buyDrink: () => this.buyDrink(),
      rentBike: () => this.rentBike(),
      returnBike: () => this.returnBike(),
      shower: () => this.shower(),
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
    return createHumanoid({ skin: 0xe8c4a8, shirt: 0x3b82f6, pants: 0x1f2937, scale: 1 });
  }

  start() {
    this.running = true;
    this.hud.hideTitle();
    this.canvas.requestPointerLock();
    this.last = performance.now();
    this.hud.showToast('角色已就位 — 第三人称可见 · 北滨路行人/车流已加载', 4);
    requestAnimationFrame((t) => this.frame(t));
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  private frame(t: number) {
    if (!this.running) return;
    const dt = Math.min(0.033, (t - this.last) / 1000);
    this.last = t;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame((nt) => this.frame(nt));
  }

  private update(dt: number) {
    advanceTime(this.state, dt);

    this.dayNightAcc += dt;
    if (this.dayNightAcc >= 0.1) {
      applyDayNight(this.state.gameHour, this.sun, this.hemi, this.ambient, this.scene, this.world);
      this.dayNightAcc = 0;
    }

    if (this.world.waterReflector) {
      const dz = Math.abs(this.player.position.z - BEIBIN.riverZ);
      this.world.waterReflector.visible = dz < 100;
    }

    if (this.player.consumeKey('KeyF')) this.toggleVehicleOrBike();

    const ePressed = this.player.consumeKey('KeyE');

    // HARD GATE: visible third-person body in walk/run/bike/drive (never freecam-only)
    if (this.player.mode === 'drive') {
      this.player.updateDrive(dt, this.world.car, this.world.colliders);
      this.world.bikeVisual.visible = false;
      this.playerMesh.visible = true;
      // Sit pose inside car cabin
      this.playerMesh.position.set(
        this.player.position.x,
        this.player.groundY + 0.35,
        this.player.position.z,
      );
      this.playerMesh.rotation.y = this.player.carYaw;
      this.playerMesh.scale.setScalar(0.92);
      animateHumanoid(this.playerMesh, 0, dt, false);
    } else if (this.player.mode === 'bike') {
      this.player.updateBike(dt, this.world.bikeVisual, this.world.colliders);
      this.world.bikeVisual.visible = true;
      this.playerMesh.visible = true;
      // Rider on bike
      this.playerMesh.position.set(
        this.player.position.x,
        this.player.groundY + 0.55,
        this.player.position.z,
      );
      this.playerMesh.rotation.y = this.player.carYaw;
      this.playerMesh.scale.setScalar(0.95);
      const spd = Math.hypot(this.player.velocity.x, this.player.velocity.z);
      animateHumanoid(this.playerMesh, Math.min(spd, 4), dt, false);
    } else {
      this.player.updateWalk(dt, this.activeColliders());
      this.state.mode = this.player.mode;
      this.playerMesh.visible = true;
      this.playerMesh.scale.setScalar(1);
      this.playerMesh.position.set(this.player.position.x, this.player.groundY, this.player.position.z);
      this.playerMesh.rotation.y = this.player.yaw;
      const spd = Math.hypot(this.player.velocity.x, this.player.velocity.z);
      animateHumanoid(this.playerMesh, spd, dt, this.player.mode === 'run');
      this.world.bikeVisual.visible = false;
    }

    if (this.world.agents) {
      this.world.agents.update(dt, this.player.position.x, this.player.position.z);
    }

    this.state.mode = this.player.mode;
    this.player.applyCamera(this.camera, dt);

    const nearby = this.findInteractable();
    const vehiclePrompt = this.vehiclePrompt();
    this.hud.setPrompt(
      this.player.mode === 'walk' || this.player.mode === 'run'
        ? nearby?.label ?? vehiclePrompt
        : vehiclePrompt,
    );
    this.hud.setMode(this.player.mode);

    if (ePressed) {
      if (this.player.mode === 'drive' || this.player.mode === 'bike') {
        this.hud.showToast(this.player.mode === 'bike' ? '先按 F 下车再互动' : '下车后才能互动（按 F）', 1.6);
      } else if (nearby) {
        if (nearby.id === 'beibin-hint') {
          this.hud.showToast('北滨路：行人车流氛围中骑行；向南上桥可到南滨（可选）');
        } else if (nearby.id === 'bench') {
          this.state.needs.energy = Math.min(100, this.state.needs.energy + 18);
          this.state.needs.fun = Math.min(100, this.state.needs.fun + 22);
          this.state.gameHour = Math.min(23.9, this.state.gameHour + 0.15);
          this.hud.showToast('江畔休息（精力+ 心情+）', 2);
        } else if (nearby.id === 'bike-rent' && this.state.hasBike) {
          // prefer return when already have bike
          this.returnBike();
        } else if (nearby.id === 'bike-return' && !this.state.hasBike) {
          this.rentBike();
        } else {
          nearby.action();
        }
      } else {
        this.hud.showToast('附近没有可互动的对象', 1.4);
      }
    }

    if (this.state.needs.hunger <= 0) {
      this.state.needs.energy = Math.max(0, this.state.needs.energy - dt * 2.2);
      this.starveToastAcc += dt;
      if (this.starveToastAcc > 2.5) {
        this.hud.showToast('你太饿了，精力在下降…', 1.5);
        this.starveToastAcc = 0;
      }
    }

    // Running costs a bit of energy
    if (this.player.mode === 'run' && this.player.velocity.lengthSq() > 8) {
      this.state.needs.energy = Math.max(0, this.state.needs.energy - dt * 1.1);
    }

    const pz = this.player.position.z;
    if (!this.beibinToast && pz > 40 && pz < 56) {
      this.beibinToast = true;
      this.hud.showToast('江北北滨路', 2.2);
    }
    if (!this.bridgeToast && pz > 70 && Math.abs(this.player.position.x) < 8) {
      this.bridgeToast = true;
      this.hud.showToast('东水门方向大桥（可选过江）', 2.2);
    }
    if (!this.nanbinArrived && pz > 145) {
      this.nanbinArrived = true;
      this.hud.showToast('抵达南滨路（可选目的地）', 3);
    }

    if (this.state.dayComplete) {
      this.hud.showToast('已过完一天！生活循环达成。', 4);
      this.state.dayComplete = false;
    }

    this.hud.update(this.state, dt);
  }

  private vehiclePrompt(): string | null {
    if (this.state.inside !== 'outside') return null;
    if (this.player.mode === 'drive') return '按 F 下车';
    if (this.player.mode === 'bike') return '按 F 下车（可在租车站按 E 还车）';

    const carPos = this.world.car.position;
    const dCar = Math.hypot(this.player.position.x - carPos.x, this.player.position.z - carPos.z);
    if (dCar < 3.4) return '按 F 上车';
    return null;
  }

  private toggleVehicleOrBike() {
    if (this.state.inside !== 'outside') {
      this.hud.showToast('室内不能骑车/开车', 1.6);
      return;
    }

    // Dismount bike
    if (this.player.mode === 'bike') {
      this.player.mode = 'walk';
      this.state.mode = 'walk';
      this.world.bikeVisual.visible = false;
      this.player.snapTo(this.player.position.x + 0.9, this.player.position.z);
      this.hud.showToast('已下车 — 单车仍租用中，回租车站按 E 还车', 2.4);
      return;
    }

    // Exit car
    if (this.player.mode === 'drive') {
      this.player.mode = 'walk';
      this.state.mode = 'walk';
      const carPos = this.world.car.position;
      this.player.snapTo(carPos.x + 1.7, carPos.z);
      this.hud.showToast('已下车', 1.6);
      return;
    }

    // Enter car if close
    const carPos = this.world.car.position;
    const dCar = Math.hypot(this.player.position.x - carPos.x, this.player.position.z - carPos.z);
    if (dCar < 3.4) {
      if (this.state.hasBike) {
        this.hud.showToast('请先还单车再开车', 1.8);
        return;
      }
      this.player.mode = 'drive';
      this.state.mode = 'drive';
      this.player.snapTo(carPos.x, carPos.z, this.world.car.rotation.y);
      this.player.carYaw = this.world.car.rotation.y;
      this.player.position.y = 0.9 + this.player.groundY;
      this.hud.showToast('已上车 — WASD 驾驶', 2);
      return;
    }

    // Remount rented bike anywhere outside
    if (this.state.hasBike) {
      this.player.mode = 'bike';
      this.state.mode = 'bike';
      this.player.carYaw = this.player.yaw;
      this.player.snapTo(this.player.position.x, this.player.position.z, this.player.yaw);
      this.hud.showToast('继续骑行 — WASD，Shift 无效', 2);
      return;
    }

    this.hud.showToast('靠近车辆按 F，或去北滨路租车站租车', 2);
  }

  private rentBike() {
    if (this.state.inside !== 'outside') return;
    if (this.state.hasBike) {
      this.hud.showToast('你已经租了车', 1.5);
      return;
    }
    if (this.state.needs.cash < 5) {
      this.hud.showToast('现金不足（租车 ¥5）', 1.8);
      return;
    }
    this.state.needs.cash -= 5;
    this.state.hasBike = true;
    this.state.bikeDepositPaid = true;
    this.player.mode = 'bike';
    this.state.mode = 'bike';
    this.player.carYaw = Math.PI / 2; // face along Beibin roughly east
    this.player.snapTo(-16, 57.5, this.player.carYaw);
    // hide one rack bike
    if (this.world.rackBikes[0]) this.world.rackBikes[0].visible = false;
    this.hud.showToast('已租车 ¥5 — WASD 骑行北滨路，F 下车，回租车站 E 还车', 3.2);
  }

  private returnBike() {
    if (!this.state.hasBike) {
      this.hud.showToast('你没有租用中的单车', 1.5);
      return;
    }
    if (this.player.mode === 'bike') {
      this.player.mode = 'walk';
      this.world.bikeVisual.visible = false;
    }
    this.state.hasBike = false;
    this.state.mode = 'walk';
    this.player.mode = 'walk';
    if (this.world.rackBikes[0]) this.world.rackBikes[0].visible = true;
    this.player.snapTo(-16, 56.5);
    this.hud.showToast('单车已归还', 1.8);
  }

  private activeColliders() {
    if (this.state.inside !== 'outside') return [];
    return this.world.colliders;
  }

  private findInteractable(): Interactable | null {
    if (this.player.mode !== 'walk' && this.player.mode !== 'run') return null;
    let best: Interactable | null = null;
    let bestD = Infinity;
    for (const it of this.world.interactables) {
      if (!this.interactableAllowed(it.id)) continue;
      const d = Math.hypot(this.player.position.x - it.position.x, this.player.position.z - it.position.z);
      if (d <= it.radius && d < bestD) {
        best = it;
        bestD = d;
      }
    }
    return best;
  }

  private interactableAllowed(id: string) {
    const inside = this.state.inside;
    if (inside === 'outside') {
      if (id === 'bike-rent') return !this.state.hasBike;
      if (id === 'bike-return') return this.state.hasBike;
      return id === 'home-enter' || id === 'store-enter' || id === 'beibin-hint' || id === 'bench';
    }
    if (inside === 'home') return ['home-exit', 'eat', 'sleep', 'clothes', 'shower'].includes(id);
    if (inside === 'store') return ['store-exit', 'buy-food', 'buy-drink'].includes(id);
    return false;
  }

  private enterHome() {
    if (this.player.mode === 'drive' || this.player.mode === 'bike') {
      this.hud.showToast('请先下车再进屋', 1.6);
      return;
    }
    this.state.inside = 'home';
    this.homeGroup.visible = true;
    this.player.snapTo(-18, -1.5);
    this.hud.showToast('回到家了', 1.8);
  }

  private exitHome() {
    this.state.inside = 'outside';
    this.homeGroup.visible = false;
    this.player.snapTo(-18, 1.0);
    this.hud.showToast('出门 — 向南即北滨路', 1.6);
  }

  private enterStore() {
    if (this.player.mode === 'drive' || this.player.mode === 'bike') {
      this.hud.showToast('请先下车再进店', 1.6);
      return;
    }
    this.state.inside = 'store';
    this.storeGroup.visible = true;
    this.player.snapTo(16, 32.5);
    this.hud.showToast('进入便利店', 1.6);
  }

  private exitStore() {
    this.state.inside = 'outside';
    this.storeGroup.visible = false;
    this.player.snapTo(16, 30.5);
    this.hud.showToast('离开便利店', 1.4);
  }

  private eat() {
    if (this.state.inside !== 'home') return;
    this.state.needs.hunger = Math.min(100, this.state.needs.hunger + 45);
    this.state.gameHour = Math.min(23.9, this.state.gameHour + 0.35);
    this.hud.showToast('吃了一顿热饭（饥饿恢复）', 2);
  }

  private sleep() {
    if (this.state.inside !== 'home') return;
    this.state.needs.energy = Math.min(100, this.state.needs.energy + 70);
    this.state.gameHour = (this.state.gameHour + 7) % 24;
    if (this.state.gameHour < 7) this.state.dayComplete = true;
    applyDayNight(this.state.gameHour, this.sun, this.hemi, this.ambient, this.scene, this.world);
    this.hud.showToast('睡了一觉 — 时间快进，精力恢复', 2.4);
  }

  private changeClothes() {
    if (this.state.inside !== 'home') return;
    const order = ['casual', 'home', 'jacket'] as const;
    const i = order.indexOf(this.state.outfit);
    this.state.outfit = order[(i + 1) % order.length];
    const colors: Record<string, number> = { casual: 0x3b82f6, home: 0x94a3b8, jacket: 0x1f2937 };
    const torso = this.playerMesh.getObjectByName('torso') as THREE.Mesh | undefined;
    if (torso && torso.material) {
      (torso.material as THREE.MeshStandardMaterial).color.setHex(colors[this.state.outfit]);
    }
    this.hud.showToast(
      `已换成：${this.state.outfit === 'casual' ? '日常便装' : this.state.outfit === 'home' ? '居家服' : '外套'}`,
      1.8,
    );
  }

  private shower() {
    if (this.state.inside !== 'home') return;
    this.state.needs.hygiene = Math.min(100, this.state.needs.hygiene + 55);
    this.state.gameHour = Math.min(23.9, this.state.gameHour + 0.2);
    this.hud.showToast('洗了个澡（清洁恢复）', 2);
  }

  private buyFood() {
    if (this.state.inside !== 'store') return;
    if (this.state.needs.cash < 18) {
      this.hud.showToast('现金不足', 1.6);
      return;
    }
    this.state.needs.cash -= 18;
    this.state.needs.hunger = Math.min(100, this.state.needs.hunger + 35);
    this.hud.showToast('买了盒饭（-¥18）', 2);
  }

  private buyDrink() {
    if (this.state.inside !== 'store') return;
    if (this.state.needs.cash < 6) {
      this.hud.showToast('现金不足', 1.6);
      return;
    }
    this.state.needs.cash -= 6;
    this.state.needs.energy = Math.min(100, this.state.needs.energy + 12);
    this.hud.showToast('买了饮料（-¥6）', 2);
  }
}
