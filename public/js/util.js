import * as THREE from 'three';

let ROOT = null;
export const setRoot = r => { ROOT = r; };

const cache = {};
export function mat(key, color, o = {}) {
  return cache[key] ??= new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
}

export function mesh(geo, material, x = 0, y = 0, z = 0, parent = ROOT, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  parent.add(m);
  return m;
}
export const box = (w, h, d, m, x, y, z, p, s) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, p, s);
export const cyl = (rt, rb, h, m, x, y, z, p, seg = 16, s) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, p, s);

export function canvasTex(w, h, draw, repeat = [1, 1], srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
export function texClone(t, rx, ry) { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; }

export function softDot(color, size = 64) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

// Random có seed: mọi người chơi thấy cùng một bố cục cây, núi…
export function rng(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function textPlate(text, w, h, x, y, z, parent, ry = 0, opts = {}) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w);
  const g = c.getContext('2d');
  g.fillStyle = opts.bg || '#6e140c'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#e8b65a'; g.lineWidth = 14; g.strokeRect(12, 12, c.width - 24, c.height - 24);
  g.lineWidth = 4; g.strokeRect(30, 30, c.width - 60, c.height - 60);
  g.fillStyle = '#ffd77a';
  g.font = `700 ${Math.round(c.height * 0.46)}px "Playfair Display", Georgia, serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height * 0.54);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.3, roughness: 0.5 }));
  m.position.set(x, y, z); m.rotation.y = ry; parent.add(m);
  return m;
}

export const lerpAngle = (a, b, t) => { const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };
