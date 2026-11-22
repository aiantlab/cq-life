import * as THREE from 'three';

function canvas(size = 512): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function noise(ctx: CanvasRenderingContext2D, size: number, alpha = 0.08) {
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() * 255) | 0;
    img.data[i] = n;
    img.data[i + 1] = n;
    img.data[i + 2] = n;
    img.data[i + 3] = (alpha * 255) | 0;
  }
  ctx.putImageData(img, 0, 0);
}

export function makeAsphalt(): THREE.MeshStandardMaterial {
  const [c, ctx] = canvas(512);
  ctx.fillStyle = '#2a2e33';
  ctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) {
    ctx.strokeStyle = 'rgba(220,220,220,0.18)';
    ctx.lineWidth = 3;
    ctx.setLineDash([28, 36]);
    ctx.beginPath();
    ctx.moveTo(0, y + 32);
    ctx.lineTo(512, y + 32);
    ctx.stroke();
  }
  noise(ctx, 512, 0.12);
  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(8, 8);
  return new THREE.MeshStandardMaterial({
    map,
    roughness: 0.55,
    metalness: 0.05,
    color: 0x8a9098,
  });
}

export function makeWetAsphalt(): THREE.MeshStandardMaterial {
  const mat = makeAsphalt();
  mat.roughness = 0.22;
  mat.metalness = 0.35;
  mat.envMapIntensity = 1.2;
  mat.color = new THREE.Color(0x6d747c);
  return mat;
}

export function makeConcrete(): THREE.MeshStandardMaterial {
  const [c, ctx] = canvas(256);
  ctx.fillStyle = '#b8b4ab';
  ctx.fillRect(0, 0, 256, 256);
  noise(ctx, 256, 0.15);
  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.9, metalness: 0.02, color: 0xd4d0c7 });
}

export function makeBrick(tint = '#8a5a45'): THREE.MeshStandardMaterial {
  const [c, ctx] = canvas(256);
  ctx.fillStyle = '#6e4a3b';
  ctx.fillRect(0, 0, 256, 256);
  const bw = 42;
  const bh = 18;
  for (let y = 0, row = 0; y < 256; y += bh + 3, row++) {
    const ox = row % 2 ? bw / 2 : 0;
    for (let x = -bw; x < 256; x += bw + 3) {
      ctx.fillStyle = tint;
      ctx.fillRect(x + ox, y, bw, bh);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x + ox, y, bw, 3);
    }
  }
  noise(ctx, 256, 0.08);
  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(3, 4);
  return new THREE.MeshStandardMaterial({ map, roughness: 0.85, metalness: 0.0 });
}

export function makePlaster(color = '#d9d2c5'): THREE.MeshStandardMaterial {
  const [c, ctx] = canvas(128);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);
  noise(ctx, 128, 0.1);
  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.78, metalness: 0.0 });
}

export function makeGrass(): THREE.MeshStandardMaterial {
  const [c, ctx] = canvas(256);
  ctx.fillStyle = '#2f5a2c';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = `rgba(${40 + Math.random() * 60},${90 + Math.random() * 80},${30 + Math.random() * 40},0.55)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 4);
  }
  const map = new THREE.CanvasTexture(c);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(6, 6);
  return new THREE.MeshStandardMaterial({ map, roughness: 0.95, metalness: 0.0 });
}

export function makeWood(): THREE.MeshStandardMaterial {
  const [c, ctx] = canvas(256);
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, '#6b4423');
  g.addColorStop(0.5, '#8a5a32');
  g.addColorStop(1, '#5c3a1e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 18) {
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 4, 256);
    ctx.stroke();
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.7, metalness: 0.0 });
}

export function makeGlass(emissive = 0x000000, intensity = 0): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: 0x88aacc,
    metalness: 0.05,
    roughness: 0.08,
    transmission: 0.55,
    thickness: 0.4,
    transparent: true,
    opacity: 0.75,
    emissive: new THREE.Color(emissive),
    emissiveIntensity: intensity,
  });
}
