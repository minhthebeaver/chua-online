import * as THREE from 'three';
import { mat, mesh, canvasTex, lerpAngle } from './util.js';
import { makeHuman, makeSeated } from './human.js';
export { makeHuman };
import { heightAt, BANYAN, PILE, LIHUONG, BELL, MO_MONK, POD, UP } from './world.js';

export function makeLabel(text, opts = {}) {
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  const font = opts.bubble ? '500 34px "Be Vietnam Pro", sans-serif' : '600 34px "Be Vietnam Pro", sans-serif';
  g.font = font; const w = Math.min(900, g.measureText(text).width + 56); c.width = w; c.height = 74;
  g.font = font;
  g.fillStyle = opts.bubble ? 'rgba(255,246,227,.95)' : (opts.npc ? 'rgba(60,40,10,.6)' : 'rgba(30,10,8,.72)');
  g.beginPath(); g.roundRect(2, 2, w - 4, 70, 35); g.fill();
  if (!opts.bubble) { g.strokeStyle = 'rgba(240,194,107,.7)'; g.lineWidth = 3; g.stroke(); }
  g.fillStyle = opts.bubble ? '#3a1604' : '#ffe3a8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 39);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(w / 74 * 0.42, 0.42, 1); s.renderOrder = 10;
  return s;
}

/* ============ HOẠT CẢNH ============ */
export function createLife(scene, W, sfx) {
  const L = {};
  const tmpV = new THREE.Vector3();

  /* ---- Chú tiểu quét lá đa ---- */
  const tieu = makeHuman({ robe: '#7b5a3c', shaved: true, tuft: true, child: true, skinTone: 2 });
  scene.add(tieu.root);
  const lbl = makeLabel('Chú tiểu Minh Tâm', { npc: true }); lbl.position.y = 1.55; lbl.scale.multiplyScalar(0.8); tieu.root.add(lbl);
  // chổi tre: cán + bó chổi (đặt trong hệ toạ độ thân)
  const broom = new THREE.Group(); tieu.body.add(broom);
  const handle = mesh(new THREE.CylinderGeometry(0.022, 0.026, 1, 8), mat('bamboo', 0xc9a85a, { roughness: 0.55 }), 0, 0, 0, broom);
  const head = new THREE.Group(); broom.add(head);
  const strawM = mat('straw', 0xa7834a, { side: THREE.DoubleSide, roughness: 0.9 });
  for (let k = 0; k < 9; k++) {
    const s = mesh(new THREE.ConeGeometry(0.05, 0.55, 5, 1, true), strawM, (k - 4) * 0.045, -0.24, 0, head, false);
    s.rotation.set(Math.PI, 0, (k - 4) * 0.09);
  }
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8), mat('rope', 0xc9b48a), 0, 0.02, 0, head, false);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), D = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const hp = new THREE.Vector3(), inv = new THREE.Matrix4(), tipW = new THREE.Vector3();
  function placeBroom(sw) {
    A.set(0.12 + sw * 0.08, 1.22, 0.24);
    B.set(sw * 0.5, 0.06, 0.82);
    D.subVectors(A, B); const len = D.length(); D.normalize();
    handle.position.copy(A).add(B).multiplyScalar(0.5); handle.quaternion.setFromUnitVectors(up, D); handle.scale.y = len;
    head.position.copy(B); head.quaternion.setFromUnitVectors(up, D); head.rotateY(sw * 0.4);
    tieu.upper.updateMatrix(); inv.copy(tieu.upper.matrix).invert();
    hp.copy(A).lerp(B, 0.03).applyMatrix4(inv); tieu.reach(1, hp.x, hp.y, hp.z, new THREE.Vector3(1, -0.3, -0.6).normalize());
    hp.copy(A).lerp(B, 0.22).applyMatrix4(inv); tieu.reach(-1, hp.x, hp.y, hp.z, new THREE.Vector3(-1, -0.6, -0.4).normalize());
    tieu.wristBend(1); tieu.wristBend(-1); tieu.grip(1, 0.9); tieu.grip(-1, 0.9);
  }
  const CYCLE = 120;
  let lastPhase = 0;

  function tieuPose(st) {
    const p = (st % CYCLE) / CYCLE;
    const spiral = k => { const r = 9 - 8 * k, a = k * Math.PI * 6; return [PILE.x + Math.cos(a) * r, PILE.z + Math.sin(a) * r]; };
    let x, z, ry, sweeping = false, walking = true;
    if (p < 0.82) {
      const k = p / 0.82; [x, z] = spiral(k); const [x2, z2] = spiral(Math.min(1, k + 0.002));
      ry = Math.atan2(x2 - x, z2 - z); sweeping = true;
    } else if (p < 0.88) { [x, z] = spiral(1); ry = 0; sweeping = true; walking = false; }
    else { const k = (p - 0.88) / 0.12; const [sx, sz] = spiral(1); const [ex, ez] = spiral(0); x = sx + (ex - sx) * k; z = sz + (ez - sz) * k; ry = Math.atan2(ex - sx, ez - sz); }
    return { x, z, ry, sweeping, walking, p };
  }

  /* ---- Lá đa rơi (instanced) ---- */
  const N = 420;
  const leafGeo = new THREE.PlaneGeometry(0.26, 0.38); leafGeo.rotateX(-Math.PI / 2);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.85 }), N);
  leaves.castShadow = false; leaves.receiveShadow = true;
  leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const palette = [0xd9a326, 0x8a5a2b, 0xc0702a, 0x9a9a3a, 0xb8862e, 0x6e4a24].map(c => new THREE.Color(c));
  const S = Array.from({ length: N }, (_, i) => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, st: 0, age: 0, delay: 0, seed: Math.random() * 100 }));
  const spawn = (l, delay = 0, ground = false) => {
    const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * 10;
    l.x = BANYAN.x + Math.cos(a) * d; l.z = BANYAN.z + Math.sin(a) * d;
    l.y = ground ? 0.04 : 7 + Math.random() * 6; l.st = ground ? 1 : 0; l.delay = delay; l.age = Math.random() * 60;
    l.vx = l.vz = 0; l.vy = 0; l.rx = Math.random() * 6; l.ry = Math.random() * 6; l.rz = Math.random() * 6;
    if (ground) { l.x += (Math.random() - .5) * 6; l.z += (Math.random() - .5) * 6; l.rx = l.rz = 0; }
  };
  S.forEach((l, i) => { spawn(l, Math.random() * 40, i < N * 0.55); leaves.setColorAt(i, palette[i % palette.length]); });
  scene.add(leaves);
  const dummy = new THREE.Object3D();

  function updateLeaves(dt, t, wind, sw) {
    let pileCount = 0;
    for (let i = 0; i < N; i++) {
      const l = S[i];
      if (l.delay > 0) { l.delay -= dt * (1 + wind); dummy.position.set(0, -50, 0); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix); continue; }
      if (l.st === 0) {           // đang rơi
        l.y -= (0.55 + Math.sin(t * 2 + l.seed) * 0.2) * dt;
        l.x += (Math.sin(t * 1.7 + l.seed) * 0.7 + wind * 1.6) * dt;
        l.z += (Math.cos(t * 1.3 + l.seed) * 0.6 + wind * 0.5) * dt;
        l.rx += dt * 2.2; l.rz += dt * 1.6; l.ry += dt;
        if (l.y <= 0.04) { l.y = 0.04; l.st = 1; l.age = 0; l.rx = (Math.random() - .5) * 0.3; l.rz = (Math.random() - .5) * 0.3; }
      } else if (l.st === 1) {    // trên mặt đất
        l.age += dt;
        if (sw.active) {
          const dx = l.x - sw.tip.x, dz = l.z - sw.tip.z;
          if (dx * dx + dz * dz < 1.0) {
            const cx = PILE.x - l.x, cz = PILE.z - l.z, len = Math.hypot(cx, cz) || 1;
            const push = 2.2 + Math.random();
            l.vx = cx / len * push; l.vz = cz / len * push; l.vy = 1.4; l.ry += 1;
          }
        }
        if (wind > 1.2) { l.vx += wind * 0.6 * dt * Math.sin(l.seed); l.vz += wind * 0.3 * dt; }
        l.x += l.vx * dt; l.z += l.vz * dt; l.y += l.vy * dt; l.vy -= 9 * dt;
        if (l.y < 0.04) { l.y = 0.04; l.vy = 0; }
        const f = Math.exp(-dt * 3.2); l.vx *= f; l.vz *= f;
        if (Math.hypot(l.x - PILE.x, l.z - PILE.z) < 0.9 && Math.abs(l.vx) < 0.4) { l.st = 2; l.y = 0.06 + Math.random() * 0.35; }
        if (l.age > 200) spawn(l, Math.random() * 20);
      } else pileCount++;       // trong đống lá
      l.x = Math.max(-38, Math.min(38, l.x)); l.z = Math.max(11, Math.min(54, l.z));
      dummy.position.set(l.x, l.y, l.z); dummy.rotation.set(l.rx, l.ry, l.rz); dummy.scale.setScalar(1); dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
    }
    leaves.instanceMatrix.needsUpdate = true;
    return pileCount;
  }
  function collectPile() { S.forEach(l => { if (l.st === 2) spawn(l, 5 + Math.random() * 60); }); }

  // đống lá & sọt tre
  const basket = new THREE.Group(); basket.position.set(PILE.x + 1.4, 0, PILE.z - 0.8); scene.add(basket);
  mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.55, 12, 1, true), mat('basket', 0xa8844a, { side: THREE.DoubleSide }), 0, 0.28, 0, basket);

  /* ---- Sư thầy kinh hành quanh lư hương ---- */
  const monks = [];
  for (let i = 0; i < 5; i++) {
    const m = makeHuman({ robe: i === 0 ? '#d9a127' : '#e0ae3a', shaved: true, kasaya: '#a8521f', skinTone: i });
    scene.add(m.root); monks.push(m);
  }
  const monkLabel = makeLabel('Chư Tăng kinh hành', { npc: true }); monkLabel.position.y = 2.1; monkLabel.scale.multiplyScalar(0.8); monks[0].root.add(monkLabel);

  /* ---- Sư thầy tụng kinh gõ mõ trong chánh điện ---- */
  const seated = makeSeated({ robe: '#d9a127', shaved: true, kasaya: '#a8521f', skinTone: 1 });
  seated.root.position.set(MO_MONK.x, POD, MO_MONK.z + 0.78); seated.root.rotation.y = Math.PI; scene.add(seated.root);
  mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.18, 18), mat('cushion', 0xb5452a), 0, 0.09, 0, seated.root);
  seated.closedEyes = true;
  const mallet = new THREE.Group(); seated.armR.wrist.add(mallet);
  mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.38, 6), mat('wood', 0x4a2617), 0, -0.2, 0, mallet);
  mesh(new THREE.SphereGeometry(0.045, 10, 8), mat('red', 0x8e1a10), 0, -0.4, 0, mallet);
  const seatedLbl = makeLabel('Thầy tụng kinh', { npc: true }); seatedLbl.position.y = 1.35; seatedLbl.scale.multiplyScalar(0.75); seated.root.add(seatedLbl);
  let lastTap = 0;

  /* ---- Chú tiểu thỉnh chuông ---- */
  const bellBoy = makeHuman({ robe: '#7b5a3c', shaved: true, tuft: true, child: true, skinTone: 3 });
  bellBoy.root.position.set(BELL.x + 2.9, UP + 0.5, BELL.z + 1.4); bellBoy.root.rotation.y = -Math.PI / 2 - 0.4; scene.add(bellBoy.root);
  let lastBellIdx = null, bellAnim = 0;

  /* ---- Đàn chim bồ câu ---- */
  const birds = new THREE.Group(); scene.add(birds);
  const birdM = [mat('bird1', 0xf2f0ea), mat('bird2', 0x9aa0a8)];
  const wingGeo = new THREE.BoxGeometry(0.5, 0.03, 0.22); wingGeo.translate(0.25, 0, 0);
  const flock = [];
  for (let i = 0; i < 22; i++) {
    const b = new THREE.Group(); birds.add(b);
    const m = birdM[i % 3 === 0 ? 1 : 0];
    mesh(new THREE.SphereGeometry(0.16, 10, 8), m, 0, 0, 0, b, false).scale.set(0.8, 0.8, 1.8);
    mesh(new THREE.SphereGeometry(0.09, 8, 6), m, 0, 0.07, 0.28, b, false);
    const wl = new THREE.Group(), wr = new THREE.Group(); b.add(wl, wr);
    mesh(wingGeo, m, 0, 0, 0, wl, false); const r = mesh(wingGeo, m, 0, 0, 0, wr, false); r.scale.x = -1;
    flock.push({ b, wl, wr, o: Math.random() * 6.28, r: 3 + Math.random() * 7, h: Math.random() * 4, sp: 0.9 + Math.random() * 0.3 });
  }

  /* ---- Cá chép koi ---- */
  const kois = [];
  const koiCols = [0xf26a1b, 0xffffff, 0xe8341c, 0xf5b52a];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group(); scene.add(g);
    const m = mat('koi' + (i % 4), koiCols[i % 4], { roughness: 0.4 });
    mesh(new THREE.SphereGeometry(0.16, 10, 8), m, 0, 0, 0, g, false).scale.set(0.7, 0.45, 2.2);
    const tail = mesh(new THREE.ConeGeometry(0.14, 0.3, 4), m, 0, 0, -0.42, g, false); tail.rotation.x = -Math.PI / 2; tail.scale.x = 0.25;
    if (i % 2) mesh(new THREE.SphereGeometry(0.07, 6, 6), mat('koiSpot', 0xd8261a), 0, 0.05, 0.1, g, false);
    kois.push({ g, tail, r: 1.8 + Math.random() * 3, sp: (0.3 + Math.random() * 0.3) * (i % 3 ? 1 : -1), o: Math.random() * 6.28 });
  }

  /* ---- Cờ Phật giáo bay phấp phới ---- */
  const flagTex = canvasTex(300, 180, (g, w, h) => {
    const C = ['#0050c8', '#ffd400', '#e00000', '#ffffff', '#ff8c00'], cw = w / 6;
    C.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * cw, 0, cw + 1, h); });
    C.forEach((c, i) => { g.fillStyle = c; g.fillRect(5 * cw, i * h / 5, cw, h / 5 + 1); });
  });
  const flags = W.flagSpots.map(s => {
    const y0 = s.y + heightAt(s.x, s.z) * 0;
    mesh(new THREE.CylinderGeometry(0.06, 0.09, 9, 8), mat('pole', 0xe8e1d0), s.x, y0 + 4.5, s.z);
    mesh(new THREE.SphereGeometry(0.16, 10, 8), mat('gold', 0xe2aa3c), s.x, y0 + 9.1, s.z, undefined, false);
    const geo = new THREE.PlaneGeometry(2.8, 1.7, 16, 6); geo.translate(1.4, 0, 0);
    const fm = mesh(geo, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.8 }), s.x, y0 + 8, s.z, scene, false);
    fm.rotation.y = Math.PI * 0.9;
    return { m: fm, base: Float32Array.from(geo.attributes.position.array), ph: Math.random() * 6 };
  });

  /* ---- Hoa đăng trên hồ ---- */
  const lanterns = new Map();
  const petalM = mat('hdPetal', 0xf4a3b8, { emissive: 0x7a2038, emissiveIntensity: 0.6 });
  const candleM = new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffa040, emissiveIntensity: 2.5 });
  function addLantern(l) {
    if (lanterns.has(l.id)) return;
    const g = new THREE.Group(); scene.add(g);
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28, p = mesh(new THREE.SphereGeometry(0.2, 8, 6), petalM, Math.cos(a) * 0.26, 0.1, Math.sin(a) * 0.26, g, false); p.scale.set(0.55, 0.9, 1.3); p.rotation.y = -a; p.rotation.z = 0.6; }
    mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 10), candleM, 0, 0.2, 0, g, false);
    const fl = mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd28a }), 0, 0.36, 0, g, false); fl.scale.y = 1.7;
    lanterns.set(l.id, { g, l });
  }

  /* ---- Cập nhật ---- */
  L.update = (dt, st, t, env, me) => {
    // chú tiểu
    const tp = tieuPose(st);
    tieu.root.position.set(tp.x, heightAt(tp.x, tp.z), tp.z);
    tieu.root.rotation.y = lerpAngle(tieu.root.rotation.y, tp.ry, Math.min(1, dt * 6));
    const sws = tp.sweeping ? Math.sin(t * 3.2) : 0;
    tieu.upper.rotation.set(0.32, sws * 0.22, 0);
    placeBroom(sws);
    if (tp.walking) tieu.step(t * 6, 0.6); else tieu.step(0, 0);
    tieu.body.position.y = tp.walking ? Math.abs(Math.sin(t * 6)) * 0.02 : 0;
    tieu.idle(dt, t);
    tieu.root.updateMatrixWorld(true);
    tmpV.copy(B).applyMatrix4(tieu.body.matrixWorld);
    const pileCount = updateLeaves(dt, t, env.wind, { active: tp.sweeping && sws * sws > 0.3, tip: tmpV });
    if (lastPhase < 0.86 && tp.p >= 0.86) collectPile();
    lastPhase = tp.p;
    void pileCount;

    // sư thầy kinh hành
    monks.forEach((m, i) => {
      const a = st * 0.055 - i * 0.36, r = 6.6;
      const x = LIHUONG.x + Math.cos(a) * r, z = LIHUONG.z + Math.sin(a) * r;
      m.root.position.set(x, heightAt(x, z), z);
      m.root.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a));
      m.body.position.y = Math.abs(Math.sin(st * 2.2 + i)) * 0.012;
      m.step(st * 2.2 + i, 0.55); m.anjali(); m.idle(dt, t);
    });

    // tụng kinh gõ mõ
    const beat = Math.floor(st / 0.85);
    const ph = (st / 0.85) % 1;
    const lift = Math.max(0, Math.sin(ph * Math.PI * 2));
    seated.reach(1, 0.04, 0.24, 0.24, new THREE.Vector3(1, -0.5, -0.2).normalize());
    seated.orientHand(1, new THREE.Vector3(0, 1, 0.15));
    seated.reach(-1, -0.1, 0.24 + lift * 0.1, 0.33, new THREE.Vector3(-1, -0.4, -0.3).normalize());
    seated.orientHand(-1, new THREE.Vector3(0.12, -0.35 + lift * 0.4, 1)); seated.grip(-1, 0.9);
    seated.idle(dt, t);
    if (beat !== lastTap) {
      lastTap = beat;
      W.anim.monkMo.scale.set(1.18, 0.72, 0.9);
      if (me) {
        const d = me.root.position.distanceTo(seated.root.position);
        if (d < 22) sfx.mo(0.28 * (1 - d / 22));
      }
    }
    W.anim.monkMo.scale.lerp(new THREE.Vector3(1.1, 0.8, 0.9), Math.min(1, dt * 10));

    // chú tiểu thỉnh chuông mỗi 2 phút (đồng bộ mọi người chơi)
    const bi = Math.floor((st + 60) / 120);
    if (lastBellIdx === null) lastBellIdx = bi;
    if (bi !== lastBellIdx) { lastBellIdx = bi; bellAnim = 1; L.onAutoBell?.(); }
    if (bellAnim > 0) {
      bellAnim = Math.max(0, bellAnim - dt * 0.5);
      const pull = Math.sin((1 - bellAnim) * Math.PI * 3) * bellAnim;
      bellBoy.reach(1, 0.06, 0.78 - pull * 0.18, 0.3); bellBoy.reach(-1, -0.06, 0.7 - pull * 0.18, 0.3);
      bellBoy.wristBend(1); bellBoy.wristBend(-1); bellBoy.grip(1, 0.9); bellBoy.grip(-1, 0.9);
      bellBoy.upper.rotation.x = -pull * 0.15;
    } else { bellBoy.anjali(); bellBoy.upper.rotation.x = 0; }
    bellBoy.idle(dt, t);

    // chim
    birds.visible = env.birds > 0.5;
    if (birds.visible) {
      const cx = Math.sin(st * 0.05) * 25, cz = Math.cos(st * 0.037) * 25;
      flock.forEach((f, i) => {
        const a = st * 0.35 * f.sp + f.o;
        const x = cx + Math.cos(a) * (12 + f.r), z = cz + Math.sin(a) * (12 + f.r), y = 26 + f.h + Math.sin(st * 0.5 + i) * 2;
        f.b.position.set(x, y, z); f.b.rotation.y = -a;
        const fl = Math.sin(t * 14 + i) * 0.8; f.wl.rotation.z = fl; f.wr.rotation.z = -fl;
      });
    }

    // koi
    kois.forEach((k, i) => {
      const a = st * k.sp + k.o, r = k.r + Math.sin(st * 0.3 + i) * 0.6;
      k.g.position.set(22 + Math.cos(a) * r, 0.12, 20 + Math.sin(a) * r);
      k.g.rotation.y = -a + (k.sp > 0 ? 0 : Math.PI);
      k.tail.rotation.y = Math.sin(t * 8 + i) * 0.5;
    });

    // cờ
    const wind = 0.35 + env.wind;
    flags.forEach(f => {
      const p = f.m.geometry.attributes.position, b = f.base;
      for (let i = 0; i < p.count; i++) {
        const x = b[i * 3], y = b[i * 3 + 1], u = x / 2.8;
        p.array[i * 3 + 2] = Math.sin(u * 5 - t * (3 + wind * 3) + f.ph) * 0.28 * u * Math.min(1.5, wind);
        p.array[i * 3 + 1] = y - u * u * Math.max(0, 0.9 - wind) * 0.9;
        p.array[i * 3] = x * (0.92 + 0.08 * Math.min(1, wind));
      }
      p.needsUpdate = true; f.m.geometry.computeVertexNormals();
    });

    // hoa đăng
    for (const [id, o] of lanterns) {
      const age = st - o.l.t / 1000;
      if (age > 300 || age < -5) { scene.remove(o.g); lanterns.delete(id); continue; }
      const a = Math.max(0, age);
      o.g.position.set(-41 - a * 0.22 - Math.min(a, 6) * 0.3, -0.42 + Math.sin(t * 1.5 + o.l.seed) * 0.03, o.l.z + Math.sin(a * 0.05 + o.l.seed) * 4);
      o.g.rotation.y = a * 0.1;
    }
  };
  L.addLantern = addLantern;
  L.bellBoy = bellBoy;
  return L;
}
