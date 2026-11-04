import * as THREE from 'three';
import { mat, mesh, box, cyl, canvasTex, texClone, rng, textPlate, setRoot } from './util.js';

/* ============ BỐ CỤC ============
   z dương  = phía cổng Tam Quan (sân dưới, cao độ 0)
   z âm     = đại bậc thang lên sân trên (cao độ UP) → Đại Hùng Bảo Điện trên nền đá (POD)
   x âm     = hồ lớn + núi đá vôi (kiểu Tam Chúc), x dương = bảo tháp, hồ sen   */
export const UP = 5;
export const POD = 6.2;
export const BANYAN = { x: -25, z: 37 };
export const PILE = { x: -16, z: 27 };
export const LIHUONG = { x: 0, z: -6 };
export const BELL = { x: 22, z: -6 };
export const DRUM = { x: -22, z: -6 };
export const POND = { x: 22, z: 20, r: 6 };
export const MO_PLAYER = { x: 7, z: -22.5 };
export const MO_MONK = { x: -7, z: -22.5 };
export const LAKE_SPOT = { x: -37, z: 16 };

export function heightAt(x, z) {
  if (z <= 0) {
    if (Math.abs(x) < 20 && z > -38 && z < -14) return POD;
    if (Math.abs(x) < 8 && z >= -14 && z < -10.5) return UP + (POD - UP) * (-10.5 - z) / 3.5;
    if (Math.abs(x - BELL.x) < 4 && Math.abs(z - BELL.z) < 4) return UP + 0.5;
    if (Math.abs(x - DRUM.x) < 4 && Math.abs(z - DRUM.z) < 4) return UP + 0.5;
    return UP;
  }
  if (z < 10 && Math.abs(x) < 7) return UP * (10 - z) / 10;
  return 0;
}

const boxes = [], circles = [];
const block = (x1, x2, z1, z2) => boxes.push({ x1, x2, z1, z2 });
const blockC = (x, z, r) => circles.push({ x, z, r });
export function blocked(x, z, fromH) {
  if (x < -38.3 || x > 38.3 || z < -55 || z > 54) return true;
  for (const b of boxes) if (x > b.x1 - 0.35 && x < b.x2 + 0.35 && z > b.z1 - 0.35 && z < b.z2 + 0.35) return true;
  for (const c of circles) if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.35) ** 2) return true;
  return Math.abs(heightAt(x, z) - fromH) > 0.7;
}

/* ============ VẬT LIỆU ============ */
const R = rng(2026);

const roofTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#5b2216'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) {
    const gr = g.createLinearGradient(0, y, 0, y + 32);
    gr.addColorStop(0, '#7a3322'); gr.addColorStop(0.75, '#5a2015'); gr.addColorStop(1, '#2a0c07');
    g.fillStyle = gr; g.fillRect(0, y, w, 32);
    for (let x = 0; x < w; x += 16) {
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y, 3, 32);
      g.fillStyle = 'rgba(255,190,140,.08)'; g.fillRect(x + 4, y, 4, 30);
    }
  }
}, [1, 1]);

const stoneTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#9b9384'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const off = r % 2 ? 32 : 0, v = 150 + R() * 40 | 0;
    g.fillStyle = `rgb(${v},${v - 6},${v - 18})`;
    g.fillRect(c * 64 + off + 2 - (off && c === 3 ? 64 : 0), r * 64 + 2, 60, 60);
    if (off && c === 0) g.fillRect(0, r * 64 + 2, 30, 60);
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(0,0,0,${R() * 0.08})`; g.fillRect(R() * w, R() * h, 2, 2); }
}, [1, 1]);

const tileTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#7f7666'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const v = 178 + R() * 34 | 0; g.fillStyle = `rgb(${v},${v - 10},${v - 30})`;
    g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
    for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(80,60,40,${R() * 0.12})`; g.fillRect(i * 64 + 2 + R() * 58, j * 64 + 2 + R() * 58, 2, 2); }
  }
}, [1, 1]);

const brickTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#5e3a26'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 16; r++) for (let c = 0; c < 5; c++) {
    const v = 140 + R() * 40 | 0; g.fillStyle = `rgb(${v},${v * 0.55 | 0},${v * 0.38 | 0})`;
    g.fillRect(c * 56 + (r % 2) * 28 - 28, r * 16 + 1, 54, 14);
  }
}, [1, 1]);

const grassTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#4f7234'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 5000; i++) {
    const v = R(); g.fillStyle = v > .5 ? `rgba(120,160,70,${R() * .35})` : `rgba(30,60,25,${R() * .35})`;
    g.fillRect(R() * w, R() * h, 2, 3);
  }
}, [120, 120]);

const latticeTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#e3bd6c'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#7a1a10'; g.fillRect(40, 50, 176, 150);
  g.strokeStyle = '#d9a24a'; g.lineWidth = 6;
  for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(40 + i * 22, 50); g.lineTo(40 + i * 22, 200); g.stroke(); }
  for (let i = 0; i <= 6; i++) { g.beginPath(); g.moveTo(40, 50 + i * 25); g.lineTo(216, 50 + i * 25); g.stroke(); }
  g.strokeStyle = '#b8862e'; g.lineWidth = 10; g.strokeRect(36, 46, 184, 158);
}, [1, 1]);

const ROOF_C = 0xffffff;
const RED = mat('red', 0x8e1a10, { roughness: 0.42 });
const WOOD = mat('wood', 0x4a2617, { roughness: 0.7 });
const WALL = mat('wall', 0xe6c06e);
const STONE = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.92 });
const DARK = mat('dstone', 0x5f584e);
const GOLD = mat('gold', 0xe2aa3c, { metalness: 0.9, roughness: 0.26, emissive: 0x2a1800 });
const BRONZE = mat('bronze', 0x6e4a2c, { metalness: 0.85, roughness: 0.32 });
const DAO = mat('dao', 0x6b2a1a, { roughness: 0.5 });
const JADE = mat('jade', 0x3f8a6a, { metalness: 0.4, roughness: 0.35 });
const WHITE = mat('whitestone', 0xf1ece2, { roughness: 0.55 });

const stoneMat = (rx, ry) => new THREE.MeshStandardMaterial({ map: texClone(stoneTex, rx, ry), roughness: 0.92 });

/* ============ CẤU KIỆN KIẾN TRÚC ============ */
const roofGeo = (() => { const g = new THREE.CylinderGeometry(0.2, Math.SQRT1_2, 1, 4, 1); g.rotateY(Math.PI / 4); return g; })();

function dao(parent, x, y, z, dx, dz, s, m = DAO) {
  const d = new THREE.Vector2(dx, dz).normalize();
  const pts = [];
  for (let i = 0; i <= 4; i++) { const k = i / 4; pts.push(new THREE.Vector3(x + d.x * k * 1.3 * s, y + k * k * 1.3 * s, z + d.y * k * 1.3 * s)); }
  pts.push(new THREE.Vector3(x + d.x * 1.05 * s, y + 1.75 * s, z + d.y * 1.05 * s));
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.12 * s, 6), m, 0, 0, 0, parent);
}

function dragon(parent, x, y, z, dir, s) {
  const pts = [];
  for (let i = 0; i <= 14; i++) { const k = i / 14; pts.push(new THREE.Vector3(x + dir * k * 3.2 * s, y + 0.55 * s + Math.sin(k * Math.PI * 2.5) * 0.4 * s + k * k * 0.6 * s, z + Math.sin(k * 9) * 0.06 * s)); }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.17 * s, 8), JADE, 0, 0, 0, parent);
  const head = mesh(new THREE.SphereGeometry(0.3 * s, 12, 10), JADE, x - dir * 0.15 * s, y + 0.75 * s, z, parent); head.scale.set(1.5, 1, 1);
  for (const sz of [-1, 1]) {
    const horn = mesh(new THREE.ConeGeometry(0.06 * s, 0.5 * s, 6), GOLD, x + dir * 0.05 * s, y + 1.05 * s, z + sz * 0.13 * s, parent);
    horn.rotation.z = dir * 0.6;
  }
  for (let i = 1; i < 6; i++) { const p = pts[i * 2]; const f = mesh(new THREE.ConeGeometry(0.07 * s, 0.35 * s, 5), GOLD, p.x, p.y + 0.2 * s, p.z, parent); f.castShadow = false; }
}

function roof(parent, { w, d, h, x = 0, y = 0, z = 0, dragons = false, s = 1, pearl = true }) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const m = new THREE.MeshStandardMaterial({ map: texClone(roofTex, Math.max(2, w / 1.6), Math.max(1, h / 0.9)), color: ROOF_C, roughness: 0.62 });
  const body = mesh(roofGeo, m, 0, h / 2, 0, g); body.scale.set(w, h, d);
  box(w * 0.94, 0.28, d * 0.94, RED, 0, 0.04, 0, g);
  box(w * 0.97, 0.12, d * 0.97, GOLD, 0, -0.12, 0, g, false);
  const rl = w * 0.283 + 0.6;
  box(rl, 0.42 * s, 0.42 * s, DAO, 0, h + 0.15 * s, 0, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) dao(g, sx * w / 2 * 0.97, 0.05, sz * d / 2 * 0.97, sx, sz, s);
  for (const sx of [-1, 1]) dao(g, sx * rl / 2, h + 0.15 * s, 0, sx, 0, s * 0.8);
  if (dragons) {
    dragon(g, 0.85 * s, h + 0.2 * s, 0, 1, s); dragon(g, -0.85 * s, h + 0.2 * s, 0, -1, s);
    if (pearl) {
      const p = mesh(new THREE.SphereGeometry(0.42 * s, 20, 14), new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xff8a20, emissiveIntensity: 1.8 }), 0, h + 1.3 * s, 0, g, false);
      const ring = mesh(new THREE.TorusGeometry(0.62 * s, 0.06 * s, 8, 32), GOLD, 0, h + 1.3 * s, 0, g, false);
      p.userData.glow = true; void ring;
    }
  }
  return g;
}

function column(parent, x, y, z, h, r = 0.42) {
  cyl(r * 1.45, r * 1.6, 0.45, DARK, x, y + 0.22, z, parent, 12);
  cyl(r, r * 1.05, h, RED, x, y + h / 2 + 0.4, z, parent, 18);
  cyl(r * 1.12, r * 1.12, 0.18, GOLD, x, y + h - 0.1, z, parent, 18, false);
  cyl(r * 1.12, r * 1.12, 0.12, GOLD, x, y + 1.2, z, parent, 18, false);
}

function balustrade(parent, x1, z1, x2, z2, y, step = 2.2) {
  const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(len / step));
  const ang = Math.atan2(x2 - x1, z2 - z1);
  for (let i = 0; i <= n; i++) {
    const k = i / n, px = x1 + (x2 - x1) * k, pz = z1 + (z2 - z1) * k;
    box(0.32, 1.05, 0.32, WHITE, px, y + 0.52, pz, parent);
    mesh(new THREE.SphereGeometry(0.2, 10, 8), WHITE, px, y + 1.15, pz, parent, false);
  }
  const rail = box(0.22, 0.16, len, WHITE, (x1 + x2) / 2, y + 0.95, (z1 + z2) / 2, parent); rail.rotation.y = ang;
  const rail2 = box(0.16, 0.12, len, WHITE, (x1 + x2) / 2, y + 0.35, (z1 + z2) / 2, parent); rail2.rotation.y = ang;
}

function hangingLantern(parent, x, y, z, s = 1, list) {
  cyl(0.02, 0.02, 0.8 * s, WOOD, x, y + 0.4 * s, z, parent, 4, false);
  const l = mesh(new THREE.SphereGeometry(0.42 * s, 16, 12), LANTERN, x, y - 0.25 * s, z, parent, false); l.scale.y = 1.25;
  cyl(0.22 * s, 0.22 * s, 0.12 * s, GOLD, x, y + 0.25 * s, z, parent, 10, false);
  cyl(0.22 * s, 0.22 * s, 0.12 * s, GOLD, x, y - 0.78 * s, z, parent, 10, false);
  l.userData.sway = R() * 6; list?.push(l);
  return l;
}
export const LANTERN = new THREE.MeshStandardMaterial({ color: 0xd8321c, emissive: 0xff3a10, emissiveIntensity: 1.2, roughness: 0.6 });

/* ============ XÂY DỰNG ============ */
export function buildWorld(scene) {
  setRoot(scene);
  const W = { lanterns: [], lights: [], glows: [], anim: {}, spots: [] };

  /* --- Mặt đất, hồ, núi --- */
  const grass = mesh(new THREE.PlaneGeometry(440, 800), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }), 180.5, -0.05, 0, scene, false);
  grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true;

  const court = mesh(new THREE.PlaneGeometry(77, 45), new THREE.MeshStandardMaterial({ map: texClone(tileTex, 20, 12), roughness: 0.9 }), 0, 0.02, 32.5, scene, false);
  court.rotation.x = -Math.PI / 2;
  const road = mesh(new THREE.PlaneGeometry(8, 45), new THREE.MeshStandardMaterial({ map: texClone(brickTex, 2, 12), roughness: 0.85 }), 0, 0.035, 32.5, scene, false);
  road.rotation.x = -Math.PI / 2;

  // Hồ lớn (kiểu hồ Tam Chúc)
  const water = mesh(new THREE.PlaneGeometry(760, 900), new THREE.MeshStandardMaterial({ color: 0x2a5d66 }), -419.6, -0.45, 0, scene, false);
  water.rotation.x = -Math.PI / 2; W.water = water;
  box(0.8, 1.6, 120, stoneMat(60, 1), -39.6, -0.6, 0);
  balustrade(scene, -39.3, 10.5, -39.3, 54, 0.2);
  box(0.6, 0.2, 44, WHITE, -39.3, 0.1, 32.25);

  // Núi đá vôi
  const karstGeo = (seed, h, r) => {
    const rr = rng(seed);
    const g = new THREE.IcosahedronGeometry(1, 3); const p = g.attributes.position; const col = [];
    const o = [rr() * 10, rr() * 10, rr() * 10];
    const cG = new THREE.Color(0x3d6a34), cG2 = new THREE.Color(0x56803c), cS = new THREE.Color(0x8d8e82), tmp = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = Math.sin(x * 3.1 + o[0]) * Math.cos(z * 2.7 + o[1]) * 0.5 + Math.sin(y * 4.3 + o[2] + x * 2) * 0.35;
      const k = (y + 1) / 2;
      const rad = r * (1 - 0.45 * Math.pow(k, 1.5)) * (1 + n * 0.28);
      p.setXYZ(i, x * rad, Math.pow(k, 0.85) * h - 3, z * rad);
      const steep = Math.abs(n) > 0.35 || (k > 0.2 && k < 0.6 && n > 0.1);
      tmp.copy(steep ? cS : (n > 0 ? cG : cG2)); col.push(tmp.r, tmp.g, tmp.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  };
  const karstMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
  const peaks = [];
  for (let i = 0; i < 18; i++) { // trong hồ – chừa khoảng trống quanh tượng Quan Âm
    const x = -105 - R() * 190, z = -170 + R() * 340;
    if (Math.hypot(x + 82, z - 6) < 40) continue;
    peaks.push([x, z, 30 + R() * 50, 14 + R() * 18]);
  }
  for (let i = 0; i < 26; i++) { const a = -Math.PI * 0.45 + R() * Math.PI * 1.25; const d = 160 + R() * 140; peaks.push([Math.sin(a) * d + 40, -Math.cos(a) * d, 30 + R() * 60, 20 + R() * 25]); }
  for (let i = 0; i < 10; i++) peaks.push([60 + R() * 200, 120 + R() * 150, 25 + R() * 40, 18 + R() * 20]);
  peaks.forEach(([x, z, h, r], i) => {
    const m = mesh(karstGeo(i * 13 + 7, h, r), karstMat, x, 0, z, scene, false);
    m.rotation.y = R() * 6; m.receiveShadow = false;
  });

  // Rừng cây bao quanh (instanced)
  {
    const N = 260, trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 4, 6), canGeo = new THREE.IcosahedronGeometry(1, 1);
    const trunks = new THREE.InstancedMesh(trunkGeo, mat('trunk', 0x4e3322), N);
    const cans = new THREE.InstancedMesh(canGeo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), N);
    const d = new THREE.Object3D(), c = new THREE.Color();
    let i = 0;
    while (i < N) {
      const x = -36 + R() * 170, z = -120 + R() * 260;
      if (x > -44 && x < 44 && z > -60 && z < 60) continue;
      if (x < -38) continue;
      const s = 1 + R() * 1.4;
      d.position.set(x, 2 * s, z); d.scale.set(s, s, s); d.rotation.set(0, R() * 6, 0); d.updateMatrix(); trunks.setMatrixAt(i, d.matrix);
      d.position.set(x, 5.2 * s, z); d.scale.set(2.6 * s, 3 * s, 2.6 * s); d.updateMatrix(); cans.setMatrixAt(i, d.matrix);
      c.setHSL(0.25 + R() * 0.08, 0.45, 0.22 + R() * 0.1); cans.setColorAt(i, c);
      i++;
    }
    trunks.castShadow = cans.castShadow = true;
    scene.add(trunks, cans);
  }

  /* --- Tường bao & Cổng Tam Quan --- */
  const wallCap = (w, d, x, y, z) => { box(w + 0.5, 0.3, d + 0.6, DAO, x, y, z); };
  for (const [w, d, x, z] of [[0.8, 46, 39.2, 33]]) { box(w, 2.6, d, WALL, x, 1.3, z); wallCap(w, d, x, 2.7, z); }
  for (const sx of [-1, 1]) { box(26, 2.6, 0.8, WALL, sx * 26, 1.3, 56.2); wallCap(26, 0.8, sx * 26, 2.7, 56.2); }
  {
    const g = new THREE.Group(); g.position.set(0, 0, 56); scene.add(g);
    box(14.5, 0.5, 4, STONE, 0, 0.25, 0, g);
    for (const x of [-6.6, -2.6, 2.6, 6.6]) for (const z of [-1.2, 1.2]) column(g, x, 0.5, z, 6.2, 0.38);
    for (const sx of [-1, 1]) { box(1.6, 5.5, 2.2, WALL, sx * 4.6, 3.25, 0, g); box(1.2, 4.2, 2.2, WALL, sx * 7.6, 2.6, 0, g); }
    box(15, 0.5, 3.4, RED, 0, 7, 0, g);
    roof(g, { w: 11, d: 6, h: 2.4, y: 7.2, dragons: true, s: 0.9 });
    box(6, 1.6, 3.6, WALL, 0, 10.3, 0, g);
    roof(g, { w: 8.5, d: 5, h: 2.2, y: 11.1, dragons: true, s: 0.8 });
    roof(g, { w: 7, d: 4.4, h: 1.7, x: -7.4, y: 5.6 });
    roof(g, { w: 7, d: 4.4, h: 1.7, x: 7.4, y: 5.6 });
    textPlate('CHÙA ONLINE', 4.6, 1.15, 0, 10.3, -1.82, g, Math.PI);
    textPlate('CHÙA ONLINE', 4.6, 1.15, 0, 10.3, 1.82, g);
    block(-8.5, -3.5, 55, 57.5); block(3.5, 8.5, 55, 57.5);
  }

  /* --- Sân dưới: đèn, cờ, cây cảnh --- */
  const roadLights = [];
  for (let z = 14, i = 0; z <= 50; z += 6, i++) for (const sx of [-1, 1]) {
    const x = sx * 5.3;
    box(0.7, 0.4, 0.7, WHITE, x, 0.2, z); cyl(0.12, 0.16, 3.4, DARK, x, 2, z, scene, 8);
    box(1.4, 0.12, 0.14, WOOD, x - sx * 0.55, 3.55, z);
    hangingLantern(scene, x - sx * 1.05, 3.1, z, 0.75, W.lanterns);
    blockC(x, z, 0.4);
    if (sx > 0 && i % 2 === 0 && roadLights.length < 3) roadLights.push(z);
  }
  roadLights.forEach(z => { const l = new THREE.PointLight(0xff8a40, 0, 16, 1.6); l.position.set(0, 3, z); l.userData.base = 9; scene.add(l); W.lights.push(l); });

  W.flagSpots = [];
  for (const z of [17, 29, 41]) for (const sx of [-1, 1]) W.flagSpots.push({ x: sx * 9, z, y: 0 });

  // Chậu cây cảnh & mai vàng
  const potMat = mat('pot', 0x2f5c7a, { roughness: 0.35, metalness: 0.2 });
  for (let z = 17; z <= 47; z += 10) for (const sx of [-1, 1]) {
    const x = sx * 12.5;
    cyl(0.75, 0.55, 0.9, potMat, x, 0.45, z, scene, 14);
    cyl(0.1, 0.16, 1.4, mat('trunk', 0x4e3322), x, 1.5, z, scene, 6);
    const lm = mat('mai', 0xf3c02a, { flatShading: true, emissive: 0x3a2400 });
    for (let k = 0; k < 6; k++) { const b = mesh(new THREE.IcosahedronGeometry(0.5, 0), lm, x + (R() - .5) * 1.4, 2.3 + R() * 0.9, z + (R() - .5) * 1.4); b.scale.setScalar(0.8 + R() * 0.6); }
    blockC(x, z, 0.8);
  }

  /* --- Cây đa cổ thụ --- */
  {
    const g = new THREE.Group(); g.position.set(BANYAN.x, 0, BANYAN.z); scene.add(g);
    const bark = mat('bark', 0x5a4636, { roughness: 1 });
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, t = cyl(0.55, 0.9, 9, bark, Math.cos(a) * 0.7, 4.3, Math.sin(a) * 0.7, g, 8);
      t.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
    }
    for (let i = 0; i < 8; i++) { const a = R() * 6.28, b = cyl(0.25, 0.45, 6, bark, Math.cos(a) * 3, 8.2, Math.sin(a) * 3, g, 6); b.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); }
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28, r = mesh(new THREE.SphereGeometry(0.8, 8, 6), bark, Math.cos(a) * 1.8, 0.05, Math.sin(a) * 1.8, g); r.scale.set(1.6, 0.35, 0.6); r.rotation.y = -a; }
    for (let i = 0; i < 46; i++) { const a = R() * 6.28, d = 2.5 + R() * 7, hh = 4 + R() * 5; const r = cyl(0.04, 0.07, hh, bark, Math.cos(a) * d, 9.5 - hh / 2, Math.sin(a) * d, g, 4, false); r.rotation.z = (R() - 0.5) * 0.1; }
    const leafM = [0x2e5e2a, 0x3a6d30, 0x47793a].map(c => mat('banyan' + c, c, { flatShading: true }));
    for (let i = 0; i < 34; i++) {
      const a = R() * 6.28, d = R() * 8.5, b = mesh(new THREE.IcosahedronGeometry(1, 1), leafM[i % 3], Math.cos(a) * d, 10 + R() * 4.5 - d * 0.25, Math.sin(a) * d, g);
      b.scale.set(2.6 + R() * 1.4, 1.6 + R() * 0.8, 2.6 + R() * 1.4);
    }
    // ban thờ nhỏ gốc đa
    box(1.6, 1, 1, STONE, 2.6, 0.5, -1.4, g); box(1.2, 0.8, 0.8, RED, 2.6, 1.4, -1.4, g);
    cyl(1.6, 1.8, 0.4, STONE, 0, 0.2, 0, g, 16);
    blockC(BANYAN.x, BANYAN.z, 2);
  }

  /* --- Hồ sen nhỏ --- */
  {
    const bottom = mesh(new THREE.CircleGeometry(POND.r, 40), mat('pondbot', 0x1f3a33), POND.x, 0.04, POND.z, scene, false); bottom.rotation.x = -Math.PI / 2;
    const wsurf = mesh(new THREE.CircleGeometry(POND.r, 40), new THREE.MeshStandardMaterial({ color: 0x3f8f99, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.3 }), POND.x, 0.2, POND.z, scene, false);
    wsurf.rotation.x = -Math.PI / 2;
    const rim = mesh(new THREE.TorusGeometry(POND.r, 0.38, 10, 64), WHITE, POND.x, 0.24, POND.z); rim.rotation.x = Math.PI / 2;
    const pad = new THREE.CircleGeometry(0.6, 16, 0.3, Math.PI * 1.8); pad.rotateX(-Math.PI / 2);
    const padM = mat('pad', 0x3f7d33), pink = mat('pink', 0xf3a6bd, { emissive: 0x5a1a2a, emissiveIntensity: 0.3 });
    const petalG = new THREE.SphereGeometry(0.22, 8, 6);
    for (let i = 0; i < 18; i++) {
      const a = R() * 6.28, r = 1.2 + R() * (POND.r - 2), x = POND.x + Math.cos(a) * r, z = POND.z + Math.sin(a) * r;
      mesh(pad, padM, x, 0.22, z, scene, false).rotation.y = R() * 6;
      if (i % 3 === 0) {
        const f = new THREE.Group(); f.position.set(x, 0.26, z); scene.add(f);
        for (let k = 0; k < 8; k++) { const p = mesh(petalG, pink, Math.cos(k * .785) * 0.13, 0.15, Math.sin(k * .785) * 0.13, f, false); p.scale.set(0.6, 1.3, 0.45); p.rotation.set(Math.sin(k * .785) * 0.5, 0, -Math.cos(k * .785) * 0.5); }
      }
    }
    blockC(POND.x, POND.z, POND.r + 0.2);
  }

  /* --- Bảo tháp 9 tầng --- */
  {
    const g = new THREE.Group(); g.position.set(27, 0, 39); scene.add(g);
    box(9, 0.8, 9, STONE, 0, 0.4, 0, g); balustrade(g, -4.4, 4.4, 4.4, 4.4, 0.8, 2.2);
    let y = 0.8;
    for (let i = 0; i < 9; i++) {
      const s = 5 - i * 0.38, h = 2.1 - i * 0.1;
      box(s, h, s, i % 2 ? WALL : mat('wall2', 0xf0d494), 0, y + h / 2, 0, g);
      for (const r of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        const dm = mesh(new THREE.PlaneGeometry(0.7, h * 0.62), mat('niche', 0x4a120a), Math.sin(r) * (s / 2 + 0.01), y + h * 0.45, Math.cos(r) * (s / 2 + 0.01), g, false);
        dm.rotation.y = r;
        const bud = mesh(new THREE.SphereGeometry(0.16, 10, 8), GOLD, Math.sin(r) * (s / 2 + 0.05), y + h * 0.42, Math.cos(r) * (s / 2 + 0.05), g, false); void bud;
      }
      roof(g, { w: s + 2.2, d: s + 2.2, h: 0.8, y: y + h, s: 0.55 });
      y += h + 0.62;
    }
    cyl(0.06, 0.14, 3, GOLD, 0, y + 1.3, 0, g);
    for (let i = 0; i < 5; i++) mesh(new THREE.SphereGeometry(0.3 - i * 0.04, 14, 10), GOLD, 0, y + 0.3 + i * 0.5, 0, g);
    blockC(27, 39, 4.8);
  }

  /* --- Nền sân trên & đại bậc thang --- */
  {
    box(77, UP, 56, stoneMat(30, 2), 0, UP / 2, -28);
    const top = mesh(new THREE.PlaneGeometry(76.6, 55.6), new THREE.MeshStandardMaterial({ map: texClone(tileTex, 22, 16), roughness: 0.88 }), 0, UP + 0.01, -27.8, scene, false);
    top.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 20; i++) box(14, 0.25 * (i + 1), 0.5, STONE, 0, 0.125 * (i + 1), 9.75 - i * 0.5);
    const slope = Math.atan(UP / 10);
    for (const sx of [-1, 1]) {
      const r = box(0.9, 1.2, 11.2, WHITE, sx * 7.4, UP / 2 + 0.55, 5); r.rotation.x = slope;
      // đầu rồng đá chân bậc
      const hd = mesh(new THREE.SphereGeometry(0.55, 14, 10), WHITE, sx * 7.4, 1.0, 10.4); hd.scale.set(0.8, 1, 1.4);
      mesh(new THREE.ConeGeometry(0.12, 0.7, 6), WHITE, sx * 7.4, 1.6, 10.2).rotation.x = -0.5;
      block(sx * 7.4 - 0.5, sx * 7.4 + 0.5, 0, 11);
    }
    // rồng đá giữa thềm
    const cs = box(2.4, 0.4, 11.2, mat('carve', 0xcfc6b6), 0, UP / 2 + 0.05, 5); cs.rotation.x = slope;
    const dp = [];
    for (let i = 0; i <= 20; i++) { const k = i / 20, z = 10.3 - k * 10.6, y = UP * (10 - z) / 10; dp.push(new THREE.Vector3(Math.sin(k * Math.PI * 4) * 0.6, Math.max(0.3, y) + 0.4, z)); }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(dp), 80, 0.2, 8), mat('carve2', 0xbdb3a1), 0, 0, 0);
    block(-1.2, 1.2, 0, 10.5);
    balustrade(scene, -38.2, -0.3, -7.9, -0.3, UP);
    balustrade(scene, 7.9, -0.3, 38.2, -0.3, UP);
  }

  /* --- Lư hương đại --- */
  {
    const g = new THREE.Group(); g.position.set(LIHUONG.x, UP, LIHUONG.z); scene.add(g);
    cyl(2.8, 3, 0.5, STONE, 0, 0.25, 0, g, 8); cyl(2.2, 2.4, 0.6, WHITE, 0, 0.8, 0, g, 8);
    for (let i = 0; i < 3; i++) { const a = i / 3 * 6.28; const leg = cyl(0.18, 0.28, 1.3, BRONZE, Math.cos(a) * 1.3, 1.6, Math.sin(a) * 1.3, g, 8); leg.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); }
    const prof = [[0, 2], [1.4, 2], [1.9, 2.3], [2.05, 2.9], [1.85, 3.4], [1.55, 3.6], [1.75, 3.75], [1.6, 3.85]].map(p => new THREE.Vector2(...p));
    mesh(new THREE.LatheGeometry(prof, 40), BRONZE, 0, 0, 0, g).material.side = THREE.DoubleSide;
    mesh(new THREE.CircleGeometry(1.55, 32), mat('ash', 0x9c958a), 0, 3.55, 0, g).rotation.x = -Math.PI / 2;
    for (const sx of [-1, 1]) { const ear = mesh(new THREE.TorusGeometry(0.5, 0.12, 8, 20, Math.PI), BRONZE, sx * 1.9, 3.9, 0, g); ear.rotation.y = Math.PI / 2; }
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + 0.78; cyl(0.06, 0.06, 1.6, BRONZE, Math.cos(a) * 1.4, 4.5, Math.sin(a) * 1.4, g, 6); }
    roof(g, { w: 3.6, d: 3.6, h: 1.1, y: 5.3, s: 0.4 });
    W.incense = new THREE.Group(); W.incense.position.y = 3.55; g.add(W.incense);
    W.smokeOrigin = new THREE.Vector3(LIHUONG.x, UP + 4.6, LIHUONG.z);
    const l = new THREE.PointLight(0xffa050, 0, 12, 1.8); l.position.set(0, 5, 0); l.userData.base = 6; g.add(l); W.lights.push(l);
    blockC(LIHUONG.x, LIHUONG.z, 2.6);
  }

  /* --- Gác chuông & gác trống --- */
  const pavilion = (cx, cz) => {
    const g = new THREE.Group(); g.position.set(cx, UP, cz); scene.add(g);
    box(8, 0.5, 8, STONE, 0, 0.25, 0, g);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { column(g, sx * 3, 0.5, sz * 3, 6.4, 0.3); blockC(cx + sx * 3, cz + sz * 3, 0.4); }
    box(7, 0.4, 7, RED, 0, 7.1, 0, g);
    roof(g, { w: 10.5, d: 10.5, h: 2.4, y: 7.3, s: 0.75 });
    box(4.4, 2.2, 4.4, WALL, 0, 9.8, 0, g);
    roof(g, { w: 7.2, d: 7.2, h: 2.2, y: 10.8, s: 0.65, dragons: true });
    balustrade(g, -3.6, 3.6, -1.2, 3.6, 0.5, 1.2); balustrade(g, 1.2, 3.6, 3.6, 3.6, 0.5, 1.2);
    return g;
  };
  {
    const g = pavilion(BELL.x, BELL.z);
    const pivot = new THREE.Group(); pivot.position.set(0, 6.9, 0); g.add(pivot);
    const prof = [[1.35, -3.1], [1.3, -2.9], [1.05, -2.2], [0.92, -1.2], [0.9, -0.5], [0.72, -0.15], [0, 0]].map(p => new THREE.Vector2(...p));
    const bellM = mat('bell', 0x56704c, { metalness: 0.8, roughness: 0.38 });
    mesh(new THREE.LatheGeometry(prof, 40), bellM, 0, 0, 0, pivot).material.side = THREE.DoubleSide;
    for (const y of [-0.7, -1.6, -2.6]) { const t = mesh(new THREE.TorusGeometry(y < -2 ? 1.18 : 0.95, 0.05, 6, 40), bellM, 0, y, 0, pivot); t.rotation.x = Math.PI / 2; }
    mesh(new THREE.TorusGeometry(0.3, 0.1, 8, 16), bellM, 0, 0.2, 0, pivot);
    const striker = new THREE.Group(); striker.position.set(1.8, 5.4, 0); g.add(striker);
    for (const sz of [-0.5, 0.5]) cyl(0.02, 0.02, 1.6, mat('rope', 0xc9b48a), 0.8, 0.8, sz, striker, 4, false);
    const log = cyl(0.22, 0.22, 2.4, WOOD, 0.8, 0, 0, striker, 10); log.rotation.z = Math.PI / 2;
    W.anim.bellPivot = pivot; W.anim.bellStriker = striker;
  }
  {
    const g = pavilion(DRUM.x, DRUM.z);
    const stand = new THREE.Group(); stand.position.set(0, 0.5, 0); g.add(stand);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const leg = cyl(0.08, 0.08, 2.4, WOOD, sx * 0.9, 1.2, sz * 1.2, stand, 6); leg.rotation.x = sz * 0.15; }
    const drum = new THREE.Group(); drum.position.set(0, 2.6, 0); g.add(drum);
    const prof = [[1.25, -0.9], [1.45, -0.45], [1.5, 0], [1.45, 0.45], [1.25, 0.9]].map(p => new THREE.Vector2(...p));
    const body = mesh(new THREE.LatheGeometry(prof, 32), RED, 0, 0, 0, drum); body.rotation.x = Math.PI / 2; body.material.side = THREE.DoubleSide;
    for (const sz of [-1, 1]) {
      const face = mesh(new THREE.CircleGeometry(1.25, 32), mat('skin', 0xe8d3a8), 0, 0, sz * 0.9, drum); face.rotation.y = sz > 0 ? 0 : Math.PI;
      const ring = mesh(new THREE.TorusGeometry(1.25, 0.06, 6, 40), GOLD, 0, 0, sz * 0.9, drum); void ring;
    }
    W.anim.drum = drum;
  }

  /* --- Dãy nhà tả vu / hữu vu --- */
  for (const sx of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(sx * 34.5, UP, -29); scene.add(g);
    box(7.5, 0.6, 46, STONE, 0, 0.3, 0, g);
    box(0.5, 5, 45, WALL, sx * 3.4, 3, 0, g);
    const wallSide = mesh(new THREE.PlaneGeometry(44, 4), new THREE.MeshStandardMaterial({ map: texClone(latticeTex, 11, 1), roughness: 0.8 }), -sx * 0.9, 2.8, 0, g, false);
    wallSide.rotation.y = -sx * Math.PI / 2;
    box(0.3, 4.4, 44.5, WALL, -sx * 1.05, 2.8, 0, g);
    for (let z = -21; z <= 21; z += 4.2) column(g, -sx * 3.2, 0.6, z, 4.4, 0.26);
    roof(g, { w: 10, d: 49, h: 2.6, y: 5.4, s: 0.7 });
    for (let z = -19; z <= 19; z += 8.4) hangingLantern(g, -sx * 3.2, 4.4, z + 2.1, 0.6, W.lanterns);
    block(sx > 0 ? 31.2 : -39, sx > 0 ? 39 : -31.2, -52, -6);
  }

  /* --- ĐẠI HÙNG BẢO ĐIỆN --- */
  {
    const g = new THREE.Group(); g.position.set(0, 0, -26); scene.add(g);
    const H = 8; // chiều cao cột
    box(40, POD - UP, 24, stoneMat(16, 1), 0, UP + (POD - UP) / 2, 0, g);
    box(40.6, 0.15, 24.6, WHITE, 0, POD, 0, g);
    for (let i = 0; i < 5; i++) box(16 - i * 0.2, 0.24 * (i + 1), 0.7, STONE, 0, UP + 0.12 * (i + 1), 15.6 - i * 0.7, g);
    balustrade(g, -19.8, 11.9, -8.4, 11.9, POD); balustrade(g, 8.4, 11.9, 19.8, 11.9, POD);
    balustrade(g, -19.8, 11.9, -19.8, -11.8, POD); balustrade(g, 19.8, 11.9, 19.8, -11.8, POD);

    const floor = mesh(new THREE.PlaneGeometry(35.6, 19.2), new THREE.MeshStandardMaterial({ color: 0x6b2a1c, roughness: 0.25, metalness: 0.15 }), 0, POD + 0.09, -0.2, g, false);
    floor.rotation.x = -Math.PI / 2;
    const xs = [-16.5, -11, -5.5, 5.5, 11, 16.5];
    for (const x of xs) { column(g, x, POD, 9, H, 0.46); blockC(x, -17, 0.55); }
    for (const x of [-11, 11]) for (const z of [3, -3]) { column(g, x, POD, z, H, 0.46); blockC(x, -26 + z, 0.55); }
    for (const x of [-16.5, 16.5]) for (const z of [11.2]) { column(g, x, POD, z, H - 1.2, 0.36); blockC(x, -26 + z, 0.45); }

    // tường
    const sideM = new THREE.MeshStandardMaterial({ map: texClone(latticeTex, 4, 1), roughness: 0.8 });
    box(36, H + 0.4, 0.6, WALL, 0, POD + H / 2 + 0.2, -10, g);
    for (const sx of [-1, 1]) {
      box(0.6, H + 0.4, 19.4, WALL, sx * 18, POD + H / 2 + 0.2, -0.4, g);
      const p = mesh(new THREE.PlaneGeometry(18, 5), sideM, sx * 18.32, POD + 3.4, -0.4, g, false); p.rotation.y = sx * Math.PI / 2;
      const p2 = mesh(new THREE.PlaneGeometry(18, 5), sideM, sx * 17.68, POD + 3.4, -0.4, g, false); p2.rotation.y = -sx * Math.PI / 2;
    }
    block(-18.5, 18.5, -36.5, -35.5); block(17.5, 18.6, -36.4, -16.8); block(-18.6, -17.5, -36.4, -16.8);

    // trần + xà ngang + hoành phi
    box(36.6, 0.35, 21, WOOD, 0, POD + H + 0.6, -0.5, g);
    box(36.6, 0.7, 0.6, RED, 0, POD + H + 0.2, 9, g);
    box(36.6, 0.14, 0.65, GOLD, 0, POD + H - 0.2, 9, g, false);
    for (let i = 0; i < 5; i++) box(5, 0.5, 0.12, mat('carvedgold', 0xc8902e, { metalness: 0.7, roughness: 0.35 }), -14 + i * 7, POD + H - 0.55, 9.32, g, false);
    textPlate('ĐẠI HÙNG BẢO ĐIỆN', 7.5, 1.4, 0, POD + H - 1.0, 9.35, g);

    // mái 2 tầng (trùng thiềm điệp ốc)
    roof(g, { w: 46, d: 30, h: 3.6, y: POD + H + 0.8, s: 1.4 });
    box(26, 5, 14, WALL, 0, POD + H + 3.3, -0.5, g);
    for (const x of [-10.5, -7, 7, 10.5]) { const win = mesh(new THREE.PlaneGeometry(2, 1.6), sideM, x, POD + H + 4.2, 6.52, g, false); void win; }
    roof(g, { w: 34, d: 21, h: 4.2, y: POD + H + 5.8, s: 1.6, dragons: true });
    textPlate('ĐẠI HÙNG BẢO ĐIỆN', 8, 1.5, 0, POD + H + 4.3, 6.53, g);

    for (let x = -14; x <= 14; x += 4.66) hangingLantern(g, x, POD + H - 1.2, 10.4, 1, W.lanterns);
    for (let x = -12; x <= 12; x += 6) for (const z of [4, -2]) hangingLantern(g, x, POD + H - 0.4, z, 1.2, W.lanterns);

    // ban thờ Tam Thế Phật
    const ALT = -7;
    box(24, 1.2, 4.8, RED, 0, POD + 0.6, ALT, g); box(24.4, 0.12, 5.1, GOLD, 0, POD + 1.25, ALT, g, false);
    box(20, 1.2, 3.4, RED, 0, POD + 1.8, ALT - 0.7, g); box(20.4, 0.12, 3.7, GOLD, 0, POD + 2.45, ALT - 0.7, g, false);
    box(26, 8, 0.4, mat('backdrop', 0x7a1a10, { roughness: 0.5 }), 0, POD + 4, -9.6, g);
    const glowM = new THREE.MeshStandardMaterial({ color: 0xffd47a, emissive: 0xffb040, emissiveIntensity: 1.6 });
    [[-7, 2.1], [0, 2.5], [7, 2.1]].forEach(([x, s]) => {
      const b = buddha(s, glowM); b.position.set(x, POD + 2.5, ALT - 0.9); g.add(b);
      W.glows.push(glowM);
    });
    for (const x of [-10, -3.5, 3.5, 10]) {
      cyl(0.18, 0.18, 1.1, mat('candle', 0xf7ecd2), x, POD + 1.85, ALT + 1.6, g, 10);
      const f = mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd28a }), x, POD + 2.55, ALT + 1.6, g, false);
      f.scale.y = 1.8; f.userData.flame = true; W.anim.flames ??= []; W.anim.flames.push(f);
    }
    const fruitC = [0xe0482a, 0xf2c12e, 0x6aa83a, 0xe88a2a, 0x9a3fa0];
    for (const x of [-6.5, 6.5]) {
      cyl(0.9, 0.6, 0.2, GOLD, x, POD + 1.35, ALT + 1.5, g, 16);
      for (let k = 0; k < 9; k++) mesh(new THREE.SphereGeometry(0.22, 10, 8), mat('fruit' + k % 5, fruitC[k % 5], { roughness: 0.4 }), x + (R() - .5) * 1, POD + 1.6 + (k > 5 ? 0.3 : 0), ALT + 1.5 + (R() - .5) * 0.8, g, false);
    }
    for (const x of [-1.6, 1.6]) {
      cyl(0.3, 0.2, 0.8, potMat, x, POD + 1.65, ALT + 1.7, g, 12);
      for (let k = 0; k < 3; k++) { const fl = mesh(new THREE.SphereGeometry(0.22, 8, 6), mat('pink', 0xf3a6bd), x + (k - 1) * 0.25, POD + 2.4 + (k % 2) * 0.3, ALT + 1.7, g, false); fl.scale.y = 1.3; }
    }
    block(-12.2, 12.2, -36, -30.6);

    // bồ đoàn
    for (let r = 0; r < 3; r++) for (let c = -2; c <= 2; c++) { const cu = cyl(0.55, 0.6, 0.24, mat('cushion', 0xb5452a), c * 2.4, POD + 0.12, 1 - r * 2.2, g, 18); cu.castShadow = false; }

    // mõ cho người chơi + mõ của sư thầy
    {
      const p = MO_PLAYER;
      box(1.6, 0.6, 1.2, WOOD, p.x, POD + 0.3, p.z + 26, g);
      const mo = mesh(new THREE.SphereGeometry(0.48, 20, 14), mat('mo', 0x8a2f17, { roughness: 0.35 }), p.x, POD + 0.95, p.z + 26, g);
      mo.scale.set(1.1, 0.8, 0.9); W.anim.mo = mo;
      block(p.x - 0.9, p.x + 0.9, p.z - 0.7, p.z + 0.7);
    }
    {
      const p = MO_MONK; // mõ nhỏ đặt trên nệm thấp trước mặt thầy
      box(0.7, 0.06, 0.6, mat('cushion', 0xb5452a), p.x, POD + 0.03, p.z + 26, g);
      const mo = mesh(new THREE.SphereGeometry(0.25, 20, 14), mat('mo', 0x8a2f17, { roughness: 0.35 }), p.x, POD + 0.27, p.z + 26, g);
      mo.scale.set(1.1, 0.8, 0.9); W.anim.monkMo = mo;
      block(p.x - 0.5, p.x + 0.5, p.z - 0.4, p.z + 1.4);
    }

    const hl = new THREE.PointLight(0xffb060, 0, 30, 1.4); hl.position.set(0, POD + 6, -2); hl.userData.base = 40; hl.userData.always = 18; g.add(hl); W.lights.push(hl);
  }

  /* --- Tượng Quan Âm trên hồ --- */
  {
    const g = new THREE.Group(); g.position.set(-82, -0.5, 6); g.rotation.y = Math.PI / 2; scene.add(g);
    cyl(9, 10, 2, WHITE, 0, 1, 0, g, 24);
    const pink = mat('qaPetal', 0xf6d2d8, { roughness: 0.5 });
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28, p = mesh(new THREE.SphereGeometry(2.2, 12, 8), pink, Math.cos(a) * 4.2, 3, Math.sin(a) * 4.2, g); p.scale.set(0.7, 0.6, 1.4); p.rotation.y = -a; p.rotation.z = 0.5; }
    const prof = [[0, 0], [2.6, 0], [2.4, 3], [1.9, 8], [2.1, 11], [1.5, 13], [0.9, 14], [0, 14.3]].map(p => new THREE.Vector2(...p));
    mesh(new THREE.LatheGeometry(prof, 32), WHITE, 0, 3.4, 0, g);
    const hd = mesh(new THREE.SphereGeometry(1.15, 24, 18), WHITE, 0, 18.6, 0, g); hd.scale.y = 1.15;
    const hood = mesh(new THREE.SphereGeometry(1.35, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.6), WHITE, 0, 18.9, -0.15, g); void hood;
    for (const sx of [-1, 1]) { const arm = mesh(new THREE.CapsuleGeometry(0.45, 4, 6, 12), WHITE, sx * 1.9, 13.2, 0.6, g); arm.rotation.set(-0.5, 0, sx * 0.25); }
    mesh(new THREE.CylinderGeometry(0.25, 0.4, 1.6, 12), mat('vase', 0xe9f0f2, { roughness: 0.2 }), 0.9, 11.5, 2.1, g);
    const halo = mesh(new THREE.TorusGeometry(2.4, 0.18, 8, 48), new THREE.MeshStandardMaterial({ color: 0xffe2a0, emissive: 0xffc060, emissiveIntensity: 1.4 }), 0, 19, -1.4, g, false);
    W.glows.push(halo.material);
  }

  /* --- Tường sau & cổng phụ --- */
  box(77, 3, 0.8, WALL, 0, UP + 1.5, -56.2); box(77.5, 0.3, 1.4, DAO, 0, UP + 3.1, -56.2);
  box(0.8, 3, 56, WALL, 38.9, UP + 1.5, -28); box(1.4, 0.3, 56.5, DAO, 38.9, UP + 3.1, -28);
  balustrade(scene, -38.8, -0.2, -38.8, -55.8, UP, 2.6);

  // Đèn lồng trước điện + thêm cờ trên sân trên
  for (const sx of [-1, 1]) W.flagSpots.push({ x: sx * 12, z: -9, y: UP });

  W.spots = [
    { type: 'incense', x: LIHUONG.x, z: LIHUONG.z, r: 4.6, text: 'thắp nhang' },
    { type: 'bell', x: BELL.x, z: BELL.z, r: 5, text: 'thỉnh chuông' },
    { type: 'drum', x: DRUM.x, z: DRUM.z, r: 5, text: 'đánh trống' },
    { type: 'mo', x: MO_PLAYER.x, z: MO_PLAYER.z, r: 2.6, text: 'gõ mõ' },
    { type: 'lantern', x: LAKE_SPOT.x, z: LAKE_SPOT.z, r: 4.5, text: 'thả hoa đăng' }
  ];
  return W;
}

/* Tượng Phật ngồi */
function buddha(s, haloMat) {
  const b = new THREE.Group(); b.scale.setScalar(s);
  const petal = new THREE.SphereGeometry(0.5, 12, 8);
  const lotusM = mat('lotusGold', 0xd9a54a, { metalness: 0.7, roughness: 0.32 });
  for (let row = 0; row < 2; row++) for (let i = 0; i < 12; i++) {
    const a = (i + row * 0.5) / 12 * Math.PI * 2, r = 1 - row * 0.15;
    const p = mesh(petal, lotusM, Math.cos(a) * r, 0.12 + row * 0.18, Math.sin(a) * r, b, false);
    p.scale.set(0.42, 0.3, 0.75); p.rotation.y = -a; p.rotation.z = 0.55;
  }
  const legs = mesh(new THREE.SphereGeometry(1, 24, 12), GOLD, 0, 0.55, 0.1, b); legs.scale.set(1.1, 0.36, 0.72);
  mesh(new THREE.LatheGeometry([[0, 0], [0.68, 0], [0.72, 0.4], [0.6, 0.95], [0.44, 1.28], [0.2, 1.4], [0, 1.43]].map(p => new THREE.Vector2(...p)), 28), GOLD, 0, 0.62, 0, b);
  for (const sx of [-1, 1]) {
    const up = mesh(new THREE.CapsuleGeometry(0.13, 0.55, 4, 10), GOLD, sx * 0.62, 1.45, 0.05, b); up.rotation.set(-0.25, 0, sx * 0.25);
    const lo = mesh(new THREE.CapsuleGeometry(0.11, 0.5, 4, 10), GOLD, sx * 0.32, 1.0, 0.42, b); lo.rotation.set(Math.PI / 2 - 0.2, 0, sx * 1.1);
  }
  mesh(new THREE.SphereGeometry(0.2, 12, 10), GOLD, 0, 0.92, 0.55, b).scale.set(1.4, 0.6, 1);
  mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.2, 12), GOLD, 0, 2.08, 0, b);
  const head = mesh(new THREE.SphereGeometry(0.36, 24, 18), GOLD, 0, 2.38, 0, b); head.scale.set(1, 1.12, 1);
  for (const sx of [-1, 1]) { const ear = mesh(new THREE.CapsuleGeometry(0.05, 0.28, 4, 8), GOLD, sx * 0.36, 2.3, 0, b); ear.rotation.z = sx * 0.1; }
  mesh(new THREE.SphereGeometry(0.2, 16, 12), GOLD, 0, 2.78, -0.02, b);
  mesh(new THREE.ConeGeometry(0.08, 0.2, 10), GOLD, 0, 3.0, -0.02, b);
  mesh(new THREE.TorusGeometry(0.72, 0.045, 8, 48), haloMat, 0, 2.4, -0.4, b, false);
  mesh(new THREE.TorusGeometry(1.5, 0.04, 8, 64), haloMat, 0, 1.45, -0.5, b, false);
  const disc = mesh(new THREE.CircleGeometry(1.45, 48), new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0.12, depthWrite: false }), 0, 1.45, -0.52, b, false); void disc;
  return b;
}
