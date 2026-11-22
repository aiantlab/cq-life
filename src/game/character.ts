import * as THREE from 'three';

/** Procedural humanoid (commercial-OK original). Real proportions ~1.7m. */
export function createHumanoid(opts: {
  skin?: number;
  shirt?: number;
  pants?: number;
  scale?: number;
}): THREE.Group {
  const skin = opts.skin ?? 0xe8c4a8;
  const shirt = opts.shirt ?? 0x3b82f6;
  const pants = opts.pants ?? 0x1f2937;
  const s = opts.scale ?? 1;
  const g = new THREE.Group();
  g.name = 'humanoid';

  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.72, metalness: 0.02 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.7, metalness: 0.05 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.75, metalness: 0.05 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });

  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.2), pantsMat);
  pelvis.position.y = 0.95;
  pelvis.castShadow = true;
  g.add(pelvis);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.22), shirtMat);
  torso.position.y = 1.28;
  torso.castShadow = true;
  torso.name = 'torso';
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), skinMat);
  head.position.y = 1.68;
  head.castShadow = true;
  g.add(head);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.135, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 }),
  );
  hair.position.y = 1.72;
  g.add(hair);

  function limb(
    name: string,
    mat: THREE.Material,
    len: number,
    thick: number,
    x: number,
    y: number,
    z: number,
  ) {
    const pivot = new THREE.Group();
    pivot.name = name;
    pivot.position.set(x, y, z);
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(thick, len, 3, 6), mat);
    mesh.position.y = -len / 2 - thick;
    mesh.castShadow = true;
    pivot.add(mesh);
    g.add(pivot);
    return pivot;
  }

  limb('armL', shirtMat, 0.38, 0.055, -0.24, 1.42, 0);
  limb('armR', shirtMat, 0.38, 0.055, 0.24, 1.42, 0);
  limb('legL', pantsMat, 0.48, 0.07, -0.11, 0.95, 0);
  limb('legR', pantsMat, 0.48, 0.07, 0.11, 0.95, 0);

  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.26), shoeMat);
  shoeL.position.set(-0.11, 0.05, 0.04);
  g.add(shoeL);
  const shoeR = shoeL.clone();
  shoeR.position.x = 0.11;
  g.add(shoeR);

  g.scale.setScalar(s);
  g.userData.phase = Math.random() * Math.PI * 2;
  return g;
}

/** Simple procedural walk/run/idle limb swing. */
export function animateHumanoid(root: THREE.Group, speed: number, dt: number, running = false) {
  const moving = speed > 0.35;
  const phaseSpeed = running ? 11 : 7.5;
  root.userData.phase = (root.userData.phase ?? 0) + dt * phaseSpeed * (moving ? Math.min(1.6, speed / 3) : 0.35);
  const p = root.userData.phase as number;
  const amp = moving ? (running ? 0.85 : 0.55) : 0.06;
  const arm = moving ? amp * 0.7 : 0.04;
  const legL = root.getObjectByName('legL');
  const legR = root.getObjectByName('legR');
  const armL = root.getObjectByName('armL');
  const armR = root.getObjectByName('armR');
  if (legL) legL.rotation.x = Math.sin(p) * amp;
  if (legR) legR.rotation.x = Math.sin(p + Math.PI) * amp;
  if (armL) armL.rotation.x = Math.sin(p + Math.PI) * arm;
  if (armR) armR.rotation.x = Math.sin(p) * arm;
  const torso = root.getObjectByName('torso');
  if (torso) torso.rotation.y = moving ? Math.sin(p * 0.5) * 0.06 : 0;
}
