import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildWorld, heightAt, blocked, LANTERN, BANYAN, BELL, DRUM, POND, UP } from './world.js';
import { createLife, makeLabel } from './life.js';
import { makeHuman } from './human.js';
import { createWeather, PRESETS } from './weather.js';
import { sfx } from './audio.js';
import { softDot, lerpAngle } from './util.js';

const $ = s => document.querySelector(s);
const isTouch = matchMedia('(pointer:coarse)').matches;

/* ====================== RENDERER ====================== */
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.3 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc9dce6, 70, 380);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1000);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.55, 0.86);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const hemi = new THREE.HemisphereLight(0xffffff, 0x3b4a2a, 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -72, right: 72, top: 72, bottom: -72, near: 1, far: 260 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

/* ====================== THẾ GIỚI ====================== */
const W = buildWorld(scene);
const weather = createWeather(scene, renderer, sun, hemi);
weather.onThunder = (delay, vol) => sfx.thunder(delay, vol);
const life = createLife(scene, W, sfx);

// Mặt hồ phản chiếu bầu trời + gợn sóng
const waterNormal = (() => {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); const img = g.createImageData(S, S);
  const waves = Array.from({ length: 14 }, () => [(Math.random() * 8 | 0) - 4, (Math.random() * 8 | 0) + 1, 0.3 + Math.random(), Math.random() * 6.28]);
  const H = (x, y) => waves.reduce((h, [fx, fy, a, p]) => h + a * Math.sin(2 * Math.PI * (fx * x + fy * y) / S + p), 0);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = H(x + 1, y) - H(x - 1, y), dy = H(x, y + 1) - H(x, y - 1);
    const n = new THREE.Vector3(-dx * 3, -dy * 3, 1).normalize(), i = (y * S + x) * 4;
    img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255; img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(90, 90); return t;
})();
W.water.material = new THREE.MeshStandardMaterial({ color: 0x24525a, roughness: 0.06, metalness: 0.65, normalMap: waterNormal, normalScale: new THREE.Vector2(0.35, 0.35) });

/* Hiệu ứng hạt: đom đóm, cánh mai, khói nhang */
const FF = 160, ffGeo = new THREE.BufferGeometry(), ffPos = new Float32Array(FF * 3), ffSeed = [];
for (let i = 0; i < FF; i++) { ffPos.set([(Math.random() - .5) * 76, 0.6 + Math.random() * 6, -50 + Math.random() * 105], i * 3); ffSeed.push(Math.random() * 100); }
ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
const fireflies = new THREE.Points(ffGeo, new THREE.PointsMaterial({ size: 0.4, map: softDot('rgba(255,230,140,1)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffd38a, opacity: 0 }));
scene.add(fireflies);
for (let i = 0; i < FF; i++) ffPos[i * 3 + 1] += heightAt(ffPos[i * 3], ffPos[i * 3 + 2]);

const PT = 180, ptGeo = new THREE.BufferGeometry(), ptPos = new Float32Array(PT * 3);
for (let i = 0; i < PT; i++) ptPos.set([(Math.random() - .5) * 70, Math.random() * 16, -40 + Math.random() * 90], i * 3);
ptGeo.setAttribute('position', new THREE.BufferAttribute(ptPos, 3));
const petals = new THREE.Points(ptGeo, new THREE.PointsMaterial({ size: 0.24, color: 0xffd23f, map: softDot('rgba(255,230,120,1)'), transparent: true, depthWrite: false }));
scene.add(petals);

const smokeTex = softDot('rgba(235,230,225,.55)');
const smoke = Array.from({ length: 40 }, () => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 }));
  s.userData.life = Math.random() * 5; scene.add(s); return s;
});
let burstSmoke = 0;

const stickGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.4, 5);
const stickMat = new THREE.MeshStandardMaterial({ color: 0xa83a24 });
const emberMat = new THREE.MeshBasicMaterial({ color: 0xff6a2a });
const sticks = new Map();
function addIncense(s) {
  if (sticks.has(s.id)) return;
  const g = new THREE.Group(); g.position.set(s.x, 0, s.z); g.rotation.set((Math.random() - .5) * 0.15, 0, (Math.random() - .5) * 0.15);
  const st = new THREE.Mesh(stickGeo, stickMat); st.position.y = 0.7; g.add(st);
  const em = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), emberMat); em.position.y = 1.41; g.add(em);
  W.incense.add(g); sticks.set(s.id, g);
  while (sticks.size > 80) { const [k, v] = sticks.entries().next().value; W.incense.remove(v); sticks.delete(k); }
}

/* ====================== NGƯỜI CHƠI ====================== */
const players = new Map();
let selfId = null, me = null;
function createPlayer(p) {
  if (players.has(p.id)) return players.get(p.id);
  let hash = 0; for (const ch of p.name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const h = makeHuman({ robe: p.color, hair: hash & 1 ? 'bun' : 'short', skinTone: Math.abs(hash) % 4 });
  h.root.position.set(p.x, heightAt(p.x, p.z), p.z); h.root.rotation.y = p.ry;
  const label = makeLabel(p.name); label.position.y = 2.08; h.root.add(label);
  scene.add(h.root);
  const o = { ...h, id: p.id, name: p.name, color: p.color, target: new THREE.Vector3(p.x, 0, p.z), targetRy: p.ry, moving: !!p.moving, walk: 0, bow: 0, bubble: null, bubbleT: 0 };
  players.set(p.id, o); return o;
}
function removePlayer(id) { const o = players.get(id); if (o) { scene.remove(o.root); players.delete(id); } }
function showBubble(o, text) {
  if (o.bubble) o.root.remove(o.bubble);
  o.bubble = makeLabel(text.length > 42 ? text.slice(0, 40) + '…' : text, { bubble: true });
  o.bubble.position.y = 2.5; o.root.add(o.bubble); o.bubbleT = 6;
}

/* ====================== UI ====================== */
const ROBES = [['#c9772b', 'Nghệ'], ['#7a4a2a', 'Nâu'], ['#6b6f78', 'Lam xám'], ['#d9a227', 'Vàng'], ['#e9e2d0', 'Trắng'], ['#b4495c', 'Hồng sen']];
let robe = ROBES[0][0];
ROBES.forEach(([c, n], i) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'robe' + (i ? '' : ' on');
  b.innerHTML = `<i style="background:${c}"></i>${n}`;
  b.addEventListener('click', () => { robe = c; document.querySelectorAll('.robe').forEach(x => x.classList.remove('on')); b.classList.add('on'); });
  $('#robes').appendChild(b);
});
try { $('#name').value = localStorage.getItem('chua-name') || ''; } catch { }

function toast(html) {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html; $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 3200);
  while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
}
function addMsg(name, text, color) {
  const d = document.createElement('div');
  if (name) { d.className = 'msg'; const b = document.createElement('b'); b.textContent = name; b.style.color = color === '#e9e2d0' ? '#f5e9cf' : color; d.append(b, text); }
  else { d.className = 'msg sys'; d.textContent = text; }
  $('#messages').appendChild(d); $('#messages').scrollTop = 1e6;
  while ($('#messages').children.length > 60) $('#messages').firstChild.remove();
}
function setMerit(n) { $('#merit').textContent = n.toLocaleString('vi-VN'); const m = $('.merit'); m.classList.remove('bump'); void m.offsetWidth; m.classList.add('bump'); }
function setWeatherUI() { $('#weatherLabel').textContent = weather.label; document.querySelectorAll('.wopt').forEach(b => b.classList.toggle('on', b.dataset.k === weather.key)); }

Object.entries(PRESETS).forEach(([k, p]) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'wopt'; b.dataset.k = k; b.textContent = p.label;
  b.addEventListener('click', () => { socket.emit('weather:set', k); $('#weatherMenu').hidden = true; });
  $('#weatherMenu').appendChild(b);
});
$('#weatherBtn').addEventListener('click', () => { $('#weatherMenu').hidden = !$('#weatherMenu').hidden; });
$('#soundBtn').addEventListener('click', () => { $('#soundBtn').textContent = sfx.toggle() ? '🔊' : '🔇'; });

/* ====================== MẠNG ====================== */
const socket = io();
let joined = false, timeOffset = 0;
const sNow = () => (Date.now() + timeOffset) / 1000;

socket.on('hello', d => {
  timeOffset = d.now - Date.now();
  weather.set(d.weather, true); setWeatherUI();
  d.lanterns.forEach(life.addLantern);
  $('#merit').textContent = d.merit.toLocaleString('vi-VN');
});
$('#joinForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#name').value.trim(); if (!name) return;
  try { localStorage.setItem('chua-name', name); } catch { }
  sfx.init(); sfx.chime(0.6);
  socket.emit('join', { name, color: robe });
  $('#join').classList.add('leaving'); setTimeout(() => $('#join').remove(), 900);
  $('#hud').hidden = false;
});
socket.on('init', d => {
  timeOffset = d.now - Date.now();
  selfId = d.selfId; d.players.forEach(createPlayer); me = players.get(selfId);
  d.incense.forEach(addIncense); $('#count').textContent = d.players.length;
  camYaw = 0; joined = true;
  addMsg(null, 'Nam mô A Di Đà Phật 🙏 Chúc bạn một ngày an lạc.');
  setTimeout(() => toast('Đi thẳng lên <b>đại bậc thang</b> để vào Chánh điện'), 1500);
});
socket.on('joined', createPlayer);
socket.on('left', removePlayer);
socket.on('count', n => $('#count').textContent = n);
socket.on('system', t => addMsg(null, t));
socket.on('moved', d => { const o = players.get(d.id); if (o) { o.target.set(d.x, 0, d.z); o.targetRy = d.ry; o.moving = d.moving; } });
socket.on('incense', addIncense);
socket.on('lantern', l => life.addLantern(l));
socket.on('chat', m => { addMsg(m.name, m.text, m.color); const o = players.get(m.id); if (o) showBubble(o, m.text); });
socket.on('weather', d => {
  weather.set(d.key); setWeatherUI();
  if (joined) toast(`Trời chuyển: <b>${PRESETS[d.key].label}</b>`);
});
const volAt = (x, z, range = 60) => me ? Math.max(0, 1 - Math.hypot(me.root.position.x - x, me.root.position.z - z) / range) : 0.3;
socket.on('action', d => {
  setMerit(d.merit);
  const o = players.get(d.id);
  if (d.type === 'bow' && o) o.bow = 1;
  if (d.type === 'bell') { anim.bell = 1; sfx.bell(volAt(BELL.x, BELL.z, 90)); }
  if (d.type === 'drum') { anim.drum = 1; sfx.drum(volAt(DRUM.x, DRUM.z, 70)); }
  if (d.type === 'mo') { anim.mo = 1; sfx.mo(volAt(7, -22.5, 30)); }
  if (d.type === 'incense') burstSmoke = 1;
  if (d.id === selfId) {
    const msg = { bow: '🙏 Thành tâm đảnh lễ', bell: '🔔 Tiếng chuông ngân xa…', drum: '🥁 Tùng! Trống vang khắp núi', mo: '🪵 Cốc! Tâm tịnh ý an', incense: '🪔 Nén nhang thơm dâng lên', lantern: '🏮 Hoa đăng trôi xa, gửi lời nguyện ước' }[d.type];
    toast(`${msg} · <b>+1 công đức</b>`);
  }
});
life.onAutoBell = () => {
  anim.bell = 1; sfx.bell(volAt(BELL.x, BELL.z, 120) * 0.9);
  if (joined) toast('🔔 Chú tiểu thỉnh chuông – hãy dừng lại, hít thở sâu');
};

/* ====================== ĐIỀU KHIỂN ====================== */
const keys = {};
const anim = { bell: 0, drum: 0, mo: 0 };
let camYaw = 0, camPitch = 0.3, camDist = 10;
let nearSpot = null;
function doAction(type) {
  if (!joined) return;
  if (type !== 'bow' && (!nearSpot || nearSpot.type !== type)) return toast('Hãy lại gần để ' + W.spots.find(s => s.type === type).text);
  socket.emit('action', { type });
}
document.querySelectorAll('.act').forEach(b => b.addEventListener('click', () => doAction(b.dataset.act)));

addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') { if (e.key === 'Escape') e.target.blur(); return; }
  if (!joined) return;
  const k = e.key.toLowerCase();
  if (e.key === 'Enter') { e.preventDefault(); $('#chatInput').focus(); return; }
  keys[k] = true;
  if (k === 'e' && !e.repeat) nearSpot ? doAction(nearSpot.type) : toast('Không có gì để tương tác ở đây');
  if (k === 'b' && !e.repeat) doAction('bow');
  if (k === 'h' && !e.repeat) document.body.classList.toggle('photo');
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

$('#chatForm').addEventListener('submit', e => {
  e.preventDefault(); const v = $('#chatInput').value.trim();
  if (v) socket.emit('chat', v);
  $('#chatInput').value = ''; $('#chatInput').blur();
});

let drag = null;
canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; canvas.setPointerCapture(e.pointerId); $('#weatherMenu').hidden = true; });
canvas.addEventListener('pointermove', e => {
  if (!drag || drag.id !== e.pointerId) return;
  camYaw -= (e.clientX - drag.x) * 0.006; camPitch = THREE.MathUtils.clamp(camPitch + (e.clientY - drag.y) * 0.004, 0.05, 1.2);
  drag.x = e.clientX; drag.y = e.clientY;
});
canvas.addEventListener('pointerup', () => drag = null);
canvas.addEventListener('pointercancel', () => drag = null);
canvas.addEventListener('wheel', e => { camDist = THREE.MathUtils.clamp(camDist + e.deltaY * 0.01, 4, 26); }, { passive: true });

const stick = $('#stick'), knob = stick.querySelector('.knob'); const joy = { x: 0, y: 0, id: null };
stick.addEventListener('pointerdown', e => { joy.id = e.pointerId; stick.setPointerCapture(e.pointerId); moveJoy(e); });
stick.addEventListener('pointermove', e => { if (e.pointerId === joy.id) moveJoy(e); });
const endJoy = () => { joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
stick.addEventListener('pointerup', endJoy); stick.addEventListener('pointercancel', endJoy);
function moveJoy(e) {
  const r = stick.getBoundingClientRect(); let dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
  const l = Math.hypot(dx, dy), m = 40; if (l > m) { dx *= m / l; dy *= m / l; }
  joy.x = dx / m; joy.y = dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`;
}

/* ====================== VÒNG LẶP ====================== */
const ZONES = [
  { test: (x, z) => Math.abs(x) < 18 && z < -16 && z > -36, name: 'Đại Hùng Bảo Điện', sub: 'Tam Thế Phật – giữ tâm thanh tịnh' },
  { test: (x, z) => Math.hypot(x - BELL.x, z - BELL.z) < 6, name: 'Gác chuông', sub: 'Một tiếng chuông, vạn điều an' },
  { test: (x, z) => Math.hypot(x - DRUM.x, z - DRUM.z) < 6, name: 'Gác trống', sub: 'Tiếng trống thức tỉnh tâm mê' },
  { test: (x, z) => z <= 0 && Math.abs(x) > 30, name: 'Hành lang', sub: 'Bước chậm, nghe gió qua mái ngói' },
  { test: (x, z) => z <= 0, name: 'Sân lư hương', sub: 'Chư Tăng đang kinh hành' },
  { test: (x, z) => z < 10.5 && Math.abs(x) < 7.5, name: 'Đại bậc thang', sub: 'Mỗi bậc một lần buông bỏ' },
  { test: (x, z) => Math.hypot(x - BANYAN.x, z - BANYAN.z) < 13, name: 'Gốc đa cổ thụ', sub: 'Chú tiểu đang quét lá' },
  { test: x => x < -31, name: 'Bờ hồ', sub: 'Thả hoa đăng, gửi lời nguyện' },
  { test: (x, z) => Math.hypot(x - 27, z - 39) < 8, name: 'Bảo tháp chín tầng', sub: 'Tĩnh lặng giữa trời mây' },
  { test: (x, z) => Math.hypot(x - POND.x, z - POND.z) < 9, name: 'Hồ sen', sub: 'Gần bùn mà chẳng hôi tanh' },
  { test: (x, z) => z > 48, name: 'Cổng Tam Quan', sub: 'Bước qua cổng, gác lại âu lo' },
  { test: () => true, name: 'Sân chùa', sub: 'Hít thở sâu, bước chậm' }
];
let zoneName = '', lastSend = 0, wasMoving = false, ambientT = 3;
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
const moRest = new THREE.Vector3(1.1, 0.8, 0.9);

function update(dt, t) {
  const st = sNow();
  const env = weather.cur;

  /* --- người chơi của mình --- */
  if (joined && me) {
    let f = 0, r = 0;
    if (keys.w || keys.arrowup) f++; if (keys.s || keys.arrowdown) f--;
    if (keys.d || keys.arrowright) r++; if (keys.a || keys.arrowleft) r--;
    if (joy.id !== null) { f -= joy.y; r += joy.x; }
    const mag = Math.min(1, Math.hypot(f, r)), moving = mag > 0.1;
    const p = me.root.position;
    if (moving) {
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
      let mx = fx * f + rx * r, mz = fz * f + rz * r; const l = Math.hypot(mx, mz); mx /= l; mz /= l;
      const speed = (keys.shift ? 9 : 5.4) * mag * dt;
      const h0 = heightAt(p.x, p.z);
      if (!blocked(p.x + mx * speed, p.z, h0)) p.x += mx * speed;
      const h1 = heightAt(p.x, p.z);
      if (!blocked(p.x, p.z + mz * speed, h1)) p.z += mz * speed;
      me.targetRy = Math.atan2(mx, mz);
    }
    me.root.rotation.y = lerpAngle(me.root.rotation.y, me.targetRy, Math.min(1, dt * 12));
    me.moving = moving;
    if ((moving || wasMoving) && t - lastSend > 0.05) {
      socket.emit('move', { x: p.x, z: p.z, ry: me.root.rotation.y, moving });
      lastSend = t; wasMoving = moving;
    }

    nearSpot = W.spots.find(s => Math.hypot(p.x - s.x, p.z - s.z) < s.r) || null;
    const pr = $('#prompt');
    if (nearSpot) { pr.innerHTML = `Nhấn <kbd>E</kbd> để ${nearSpot.text}`; pr.classList.add('show'); } else pr.classList.remove('show');
    const inHall = Math.abs(p.x) < 18 && p.z < -16 && p.z > -36;
    document.querySelectorAll('.act').forEach(b => {
      const a = b.dataset.act;
      b.classList.toggle('near', nearSpot?.type === a || (a === 'bow' && inHall));
      b.disabled = a !== 'bow' && nearSpot?.type !== a;
    });
    const z = ZONES.find(z => z.test(p.x, p.z));
    if (z.name !== zoneName) { zoneName = z.name; $('#zone').textContent = z.name; $('#zoneSub').textContent = z.sub; }

    // camera bám theo
    const ty = p.y + 1.5;
    tmp.set(p.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist, ty + Math.sin(camPitch) * camDist, p.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist);
    tmp.y = Math.max(tmp.y, heightAt(tmp.x, tmp.z) + 0.6);
    if (inHall) tmp.y = Math.min(tmp.y, 14.2);
    camera.position.lerp(tmp, 1 - Math.exp(-dt * 7));
    camera.lookAt(p.x, ty, p.z);
  } else {
    // màn hình chờ: camera bay vòng quanh chùa
    const a = t * 0.045 + 0.4;
    camera.position.set(Math.sin(a) * 62, 22 + Math.sin(t * 0.15) * 4, Math.cos(a) * 62 + 6);
    camera.lookAt(isTouch ? 0 : -10, 8, -10);
  }

  /* --- mọi người chơi --- */
  for (const o of players.values()) {
    if (o !== me) {
      o.root.position.x += (o.target.x - o.root.position.x) * Math.min(1, dt * 10);
      o.root.position.z += (o.target.z - o.root.position.z) * Math.min(1, dt * 10);
      o.root.rotation.y = lerpAngle(o.root.rotation.y, o.targetRy, Math.min(1, dt * 10));
    }
    const p = o.root.position;
    p.y += (heightAt(p.x, p.z) - p.y) * Math.min(1, dt * 14);
    o.walk = o.moving ? o.walk + dt * (keys.shift && o === me ? 13 : 9) : 0;
    o.body.position.y = o.moving ? Math.abs(Math.sin(o.walk)) * 0.025 : 0;
    if (o.moving) { o.step(o.walk); o.walkArms(o.walk); }
    else { o.step(0, 0); o.anjali(); }
    if (o.bow > 0) { o.bow = Math.max(0, o.bow - dt * 0.7); o.upper.rotation.x = Math.sin((1 - o.bow) * Math.PI) * 0.95; o.neckTop.rotation.x = Math.sin((1 - o.bow) * Math.PI) * 0.25; }
    else { o.upper.rotation.x = 0; o.neckTop.rotation.x = 0; }
    o.idle(dt, t);
    if (o.bubble) { o.bubbleT -= dt; o.bubble.material.opacity = Math.min(1, o.bubbleT); if (o.bubbleT <= 0) { o.root.remove(o.bubble); o.bubble = null; } }
  }

  /* --- hoạt cảnh & thời tiết --- */
  life.update(dt, st, t, env, me);
  weather.update(dt, t, camera.position);

  const night = env.night;
  LANTERN.emissiveIntensity = 0.5 + night * 2.8;
  W.lights.forEach(l => { l.intensity = l.userData.base * Math.max(0, night - 0.1) * 1.3 + (l.userData.always || 0) * (0.4 + night * 0.6); });
  W.glows.forEach((m, i) => { m.emissiveIntensity = 1.2 + night * 1.3 + Math.sin(t * 1.4 + i) * 0.25; });
  bloom.strength = 0.25 + night * 0.6 + env.storm * 0.1;
  W.water.material.normalScale.setScalar(0.3 + env.rain * 0.5 + env.wind * 0.15);
  waterNormal.offset.x += dt * (0.004 + env.wind * 0.006); waterNormal.offset.y += dt * 0.003;
  sfx.setRain(env.rain);

  // chuông / trống / mõ
  if (anim.bell > 0) {
    anim.bell = Math.max(0, anim.bell - dt * 0.3);
    W.anim.bellPivot.rotation.z = Math.sin(t * 5) * 0.08 * anim.bell;
    W.anim.bellStriker.rotation.z = Math.max(0, Math.sin((1 - anim.bell) * 25)) * 0.35 * anim.bell;
  }
  if (anim.drum > 0) { anim.drum = Math.max(0, anim.drum - dt * 3); W.anim.drum.scale.setScalar(1 + anim.drum * 0.05); }
  if (anim.mo > 0) { anim.mo = Math.max(0, anim.mo - dt * 4); W.anim.mo.scale.set(1.1 + anim.mo * 0.12, 0.8 - anim.mo * 0.1, 0.9); } else W.anim.mo.scale.copy(moRest);

  // đèn lồng lắc lư, nến lung linh
  const sway = 0.05 + env.wind * 0.08;
  W.lanterns.forEach(l => { l.rotation.z = Math.sin(t * (1.2 + env.wind) + l.userData.sway) * sway; });
  W.anim.flames?.forEach((f, i) => f.scale.set(1 + Math.sin(t * 17 + i) * 0.1, 1.8 + Math.sin(t * 13 + i) * 0.3, 1));

  // đom đóm (đêm)
  fireflies.material.opacity = night * (0.7 + Math.sin(t * 2) * 0.25) * (1 - env.rain);
  if (fireflies.material.opacity > 0.01) {
    const fp = ffGeo.attributes.position;
    for (let i = 0; i < FF; i++) { const s = ffSeed[i]; fp.array[i * 3] += Math.sin(t * 0.5 + s) * dt * 0.4; fp.array[i * 3 + 1] += Math.cos(t * 0.7 + s) * dt * 0.2; fp.array[i * 3 + 2] += Math.cos(t * 0.4 + s * 2) * dt * 0.4; }
    fp.needsUpdate = true;
  }
  // cánh mai bay
  petals.material.opacity = env.petals; petals.visible = env.petals > 0.05;
  if (petals.visible) {
    const pp = ptGeo.attributes.position;
    for (let i = 0; i < PT; i++) { pp.array[i * 3 + 1] -= dt * 0.7; pp.array[i * 3] += (Math.sin(t + i) * 0.5 + env.wind) * dt; if (pp.array[i * 3 + 1] < 0) { pp.array[i * 3 + 1] = 16; pp.array[i * 3] = (Math.random() - .5) * 70; } }
    pp.needsUpdate = true;
  }
  // khói nhang
  const active = Math.min(40, 8 + sticks.size * 2 + burstSmoke * 18); burstSmoke = Math.max(0, burstSmoke - dt * 0.3);
  smoke.forEach((s, i) => {
    s.userData.life += dt;
    if (s.userData.life > 5) { s.userData.life = 0; s.position.set(W.smokeOrigin.x + (Math.random() - .5) * 1.5, W.smokeOrigin.y - 1, W.smokeOrigin.z + (Math.random() - .5) * 1.5); }
    const L = s.userData.life / 5;
    s.position.y += dt * 1.0; s.position.x += (Math.sin(t + i) * 0.25 + env.wind * 0.8) * dt;
    s.scale.setScalar(0.6 + L * 3);
    s.material.opacity = i < active ? Math.sin(L * Math.PI) * 0.32 * (1 - env.rain * 0.6) : 0;
  });

  // âm thanh môi trường
  ambientT -= dt;
  if (ambientT <= 0 && sfx.ready()) {
    ambientT = 2 + Math.random() * 5;
    if (env.birds > 0.5 && env.rain < 0.2) sfx.chirp(0.4 + Math.random() * 0.4);
    else if (night > 0.7 && env.rain < 0.2) sfx.cricket(0.6);
  }
}

let frames = 0;
function loop() {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  update(dt, t);
  composer.render();
  if (++frames === 3) $('#loading').classList.add('done');
  requestAnimationFrame(loop);
}
loop();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});
void UP;
