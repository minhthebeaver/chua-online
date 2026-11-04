import * as THREE from 'three';

/* =====================================================================
   NHÂN VẬT CHI TIẾT
   - Tỉ lệ người thật (đầu ≈ 1/7 chiều cao), trẻ em đầu to hơn
   - Khuôn mặt: mắt (lòng trắng, tròng đen, mí chớp), lông mày, mũi, môi, tai, cằm
   - Áo tràng: thân áo, cổ chéo, tay áo rộng, gấu áo; ca-sa vắt vai cho chư Tăng
   - Bàn tay có ngón; tay điều khiển bằng IK 2 khớp (vai – khuỷu) nên chắp tay,
     cầm chổi, kéo chuông, cầm dùi mõ đều đặt tay đúng chỗ
   - Hông xoay được (cúi lạy), chân/dép bước khi đi, thở, chớp mắt
   ===================================================================== */

const M = {};
const std = (k, c, o = {}) => (M[k] ??= new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o }));
const SKIN_TONES = [0xe8b896, 0xdcaa86, 0xf0c4a2, 0xd09a76];
const skinMat = i => std('skin' + i, SKIN_TONES[i % SKIN_TONES.length], { roughness: 0.62 });
const LIP = std('lip', 0xb76a5c, { roughness: 0.45 });
const HAIR = std('hair', 0x15100d, { roughness: 0.55 });
const BROW = std('brow', 0x1e1612, { roughness: 0.9 });
const SCLERA = std('sclera', 0xf4efe8, { roughness: 0.25 });
const IRIS = std('iris', 0x2a1a12, { roughness: 0.15, metalness: 0.1 });
const SANDAL = std('sandal', 0x3a2a1e, { roughness: 0.8 });
const SOLE = std('sole', 0x1d1712, { roughness: 0.9 });

function add(parent, geo, mat, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
}
const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg);

/* ---------- Đầu & khuôn mặt ---------- */
const R = 0.112;                   // bán kính đầu người lớn
const SX = 0.86, SY = 1.12, SZ = 0.98;
// z của bề mặt mặt tại (x, y) – để gắn mắt, mũi, môi đúng trên da
function faceZ(x, y) {
  const a = 1 - (x / (SX * R)) ** 2 - (y / (SY * R)) ** 2;
  const z1 = a > 0 ? SZ * R * Math.sqrt(a) : 0;
  const jx = x / 0.072, jy = (y + 0.042) / 0.075;
  const b = 1 - jx * jx - jy * jy;
  const z2 = b > 0 ? 0.02 + 0.078 * Math.sqrt(b) : 0;
  return Math.max(z1, z2);
}

function buildHead(skin, o) {
  const head = new THREE.Group();
  const skull = add(head, new THREE.SphereGeometry(R, 32, 24), skin); skull.scale.set(SX, SY, SZ);
  const jaw = add(head, new THREE.SphereGeometry(0.078, 24, 18), skin, 0, -0.042, 0.02); jaw.scale.set(0.92, 0.96, 1);
  // gò má
  for (const sx of [-1, 1]) { const c = add(head, new THREE.SphereGeometry(0.03, 12, 10), skin, sx * 0.05, -0.012, faceZ(sx * 0.05, -0.012) - 0.022, false); c.scale.set(1.2, 0.8, 0.8); }

  // mắt
  const lids = [];
  const eyeY = 0.012, eyeX = 0.036;
  for (const sx of [-1, 1]) {
    const z = faceZ(sx * eyeX, eyeY) - 0.007;
    const eye = new THREE.Group(); eye.position.set(sx * eyeX, eyeY, z); head.add(eye);
    const sc = add(eye, new THREE.SphereGeometry(0.0145, 16, 12), SCLERA, 0, 0, 0, false); sc.scale.set(1.25, 0.82, 0.75);
    add(eye, new THREE.SphereGeometry(0.0078, 14, 10), IRIS, 0, 0.0006, 0.0098, false).scale.set(1, 1, 0.45);
    const hl = add(eye, new THREE.SphereGeometry(0.0018, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), sx * -0.002, 0.003, 0.0135, false); void hl;
    // mí trên (bán cầu da) – xoay xuống để chớp mắt
    const lid = add(eye, new THREE.SphereGeometry(0.0165, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), skin, 0, 0, 0, false);
    lid.scale.set(1.25, 0.9, 0.9);
    lids.push(lid);
    // viền mi theo mép mí trên
    const lash = add(lid, new THREE.TorusGeometry(0.0165, 0.0013, 4, 18, Math.PI), BROW, 0, 0, 0, false);
    lash.rotation.x = Math.PI / 2;
    // lông mày
    const bz = faceZ(sx * 0.04, 0.036);
    const brow = add(head, new THREE.CapsuleGeometry(0.0042, 0.03, 3, 8), BROW, sx * 0.039, 0.037, bz - 0.001, false);
    brow.position.z += 0.001; brow.rotation.z = Math.PI / 2 + sx * 0.12; brow.scale.set(o.child ? 0.7 : 1, 1, 0.55);
  }
  // mũi: sống mũi + đầu mũi + cánh mũi
  const nz = faceZ(0, -0.012);
  const bridge = add(head, new THREE.CapsuleGeometry(0.0085, 0.03, 4, 8), skin, 0, -0.004, faceZ(0, 0.004) - 0.002, false);
  bridge.rotation.x = -0.32; bridge.scale.set(1, 1, 0.9);
  add(head, new THREE.SphereGeometry(0.0125, 12, 10), skin, 0, -0.024, nz + 0.006, false).scale.set(1.15, 0.9, 1);
  for (const sx of [-1, 1]) add(head, new THREE.SphereGeometry(0.0085, 10, 8), skin, sx * 0.0115, -0.027, nz - 0.001, false).scale.set(1, 0.8, 0.9);
  // môi
  const mz = faceZ(0, -0.05);
  const up = add(head, new THREE.CapsuleGeometry(0.0055, 0.022, 3, 10), LIP, 0, -0.0465, mz - 0.0005, false); up.rotation.z = Math.PI / 2; up.scale.set(1, 1, 0.6);
  const lo = add(head, new THREE.CapsuleGeometry(0.0065, 0.018, 3, 10), LIP, 0, -0.0565, mz - 0.0018, false); lo.rotation.z = Math.PI / 2; lo.scale.set(1, 1, 0.6);
  // tai
  for (const sx of [-1, 1]) {
    const ear = add(head, new THREE.SphereGeometry(0.03, 14, 10), skin, sx * SX * R * 0.98, -0.004, -0.008, false);
    ear.scale.set(0.32, 0.7, 0.48); ear.rotation.z = sx * -0.08;
    const lobe = add(head, new THREE.SphereGeometry(0.009, 8, 6), skin, sx * SX * R * 0.99, -0.03, -0.004, false); void lobe;
  }

  // tóc
  if (o.shaved) {
    const scalp = add(head, new THREE.SphereGeometry(R * 1.008, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.52), std('scalp', 0x9d8676, { roughness: 0.85 }), 0, 0.004, -0.004, false);
    scalp.scale.set(SX, SY, SZ); scalp.rotation.x = -0.32;
    if (o.tuft) { // chỏm tóc của chú tiểu
      const t = add(head, new THREE.SphereGeometry(0.032, 14, 10), HAIR, 0, 0.12, 0.035, false); t.scale.set(1, 0.5, 1.15);
    }
  } else {
    const cap = add(head, new THREE.SphereGeometry(R * 1.06, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.55), HAIR, 0, 0.006, -0.006, false);
    cap.scale.set(SX * 1.02, SY, SZ); cap.rotation.x = -0.42;
    const back = add(head, new THREE.SphereGeometry(R * 1.045, 24, 16, Math.PI, Math.PI, Math.PI * 0.3, Math.PI * 0.42), HAIR, 0, 0, -0.004, false);
    back.scale.set(SX * 1.02, SY, SZ);
    if (o.hair === 'bun') { add(head, new THREE.SphereGeometry(0.045, 16, 12), HAIR, 0, 0.02, -0.125, false); }
    else { for (const sx of [-1, 1]) { const s = add(head, new THREE.SphereGeometry(0.03, 10, 8), HAIR, sx * 0.084, 0.03, 0.01, false); s.scale.set(0.5, 1.2, 1); } }
  }
  return { head, lids };
}

/* ---------- Bàn tay ---------- */
const fingerGeo = new THREE.CapsuleGeometry(0.0082, 0.042, 3, 6);
function buildHand(skin, side) {
  const hand = new THREE.Group();
  add(hand, new THREE.CylinderGeometry(0.022, 0.024, 0.04, 10), skin, 0, -0.005, 0);           // cổ tay
  const palm = add(hand, new THREE.SphereGeometry(0.04, 12, 10), skin, 0, -0.05, 0); palm.scale.set(0.42, 1, 0.9);
  const fingers = new THREE.Group(); fingers.position.y = -0.085; hand.add(fingers);
  [[-0.024, 0.9], [-0.008, 1.05], [0.008, 1], [0.023, 0.82]].forEach(([z, l]) => {
    const f = add(fingers, fingerGeo, skin, 0, -0.024 * l, z, false); f.scale.y = l;
  });
  const thumb = add(hand, fingerGeo, skin, side * 0.006, -0.055, 0.036, false);
  thumb.rotation.set(0.6, 0, side * 0.3); thumb.scale.y = 0.85;
  return { hand, fingers };
}

/* ---------- IK 2 khớp ---------- */
const _d = new THREE.Vector3(), _n = new THREE.Vector3(), _u = new THREE.Vector3(), _e = new THREE.Vector3(),
  _f = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _m = new THREE.Matrix4(),
  _qd = new THREE.Quaternion(), _qp = new THREE.Quaternion();
function solveArm(arm, target, pole) {
  const a = arm.a, b = arm.b, S = arm.shoulder.position;
  _d.subVectors(target, S); let dist = _d.length();
  dist = THREE.MathUtils.clamp(dist, Math.abs(a - b) + 1e-3, a + b - 1e-3); _d.normalize();
  const cosA = (a * a + dist * dist - b * b) / (2 * a * dist);
  const alpha = Math.acos(THREE.MathUtils.clamp(cosA, -1, 1));
  const cosB = (a * a + b * b - dist * dist) / (2 * a * b);
  const bend = Math.PI - Math.acos(THREE.MathUtils.clamp(cosB, -1, 1));
  _n.copy(pole).addScaledVector(_d, -_d.dot(pole)).normalize();
  _u.copy(_d).multiplyScalar(Math.cos(alpha)).addScaledVector(_n, Math.sin(alpha)).normalize();
  _e.copy(S).addScaledVector(_u, a);
  _f.copy(S).addScaledVector(_d, dist).sub(_e).normalize();
  _z.copy(_f).addScaledVector(_u, -_u.dot(_f));
  if (_z.lengthSq() < 1e-8) _z.copy(_n).multiplyScalar(-1);
  _z.normalize();
  _y.copy(_u).negate();
  _x.crossVectors(_y, _z).normalize();
  _m.makeBasis(_x, _y, _z);
  arm.shoulder.quaternion.setFromRotationMatrix(_m);
  arm.elbow.rotation.set(-bend, 0, 0);
}

/* ---------- Dựng người ---------- */
let seq = 0;
export function makeHuman(o = {}) {
  const child = !!o.child;
  const skin = skinMat(o.skinTone ?? seq++);
  const robeMat = new THREE.MeshStandardMaterial({ color: o.robe || '#c9772b', roughness: 0.82 });
  const robeDark = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.robe || '#c9772b').multiplyScalar(0.72), roughness: 0.85 });

  const root = new THREE.Group();
  const body = new THREE.Group(); body.scale.setScalar(child ? 0.7 : (o.scale || 1)); root.add(body);

  /* phần dưới: gấu áo, chân, dép */
  const lower = new THREE.Group(); body.add(lower);
  const skirt = add(lower, lathe([[0, 0.05], [0.25, 0.05], [0.262, 0.07], [0.25, 0.25], [0.225, 0.55], [0.2, 0.85], [0.185, 0.97], [0, 0.97]]), robeMat);
  skirt.scale.z = 0.8;
  add(lower, new THREE.TorusGeometry(0.25, 0.012, 6, 36), robeDark, 0, 0.058, 0, false).rotation.x = Math.PI / 2;
  // xẻ tà phía trước
  const slit = add(lower, new THREE.BoxGeometry(0.012, 0.85, 0.01), robeDark, 0.06, 0.48, 0.19, false); slit.rotation.x = -0.08;
  const feet = [];
  for (const sx of [-1, 1]) {
    const f = new THREE.Group(); f.position.set(sx * 0.085, 0, 0.03); lower.add(f);
    add(f, new THREE.BoxGeometry(0.085, 0.018, 0.24), SOLE, 0, 0.009, 0.04);
    const foot = add(f, new THREE.SphereGeometry(0.05, 12, 8), skin, 0, 0.035, 0.07); foot.scale.set(0.8, 0.45, 1.6);
    add(f, new THREE.BoxGeometry(0.088, 0.012, 0.03), SANDAL, 0, 0.05, 0.1, false);
    feet.push(f);
  }

  /* phần trên: xoay quanh hông để cúi lạy */
  const upper = new THREE.Group(); upper.position.y = 0.95; body.add(upper);
  const torso = add(upper, lathe([[0, -0.02], [0.19, -0.02], [0.2, 0.12], [0.215, 0.3], [0.205, 0.42], [0.17, 0.48], [0.07, 0.52], [0, 0.525]]), robeMat);
  torso.scale.z = 0.72;
  // cổ áo chéo (vạt trái đè vạt phải)
  const collarPts = [[-0.055, 0.5, 0.06], [-0.01, 0.38, 0.142], [0.07, 0.24, 0.15], [0.14, 0.12, 0.125]].map(p => new THREE.Vector3(...p));
  add(upper, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(collarPts), 16, 0.012, 6), robeDark, 0, 0, 0, false);
  const collarBack = add(upper, new THREE.TorusGeometry(0.075, 0.014, 6, 20, Math.PI * 1.2), robeDark, 0, 0.5, 0, false);
  collarBack.rotation.set(Math.PI / 2, 0, Math.PI * 0.4);
  add(upper, new THREE.TorusGeometry(0.2, 0.014, 6, 30), robeDark, 0, 0.0, 0, false).rotation.x = Math.PI / 2; // dây lưng
  // cổ
  add(upper, new THREE.CylinderGeometry(0.044, 0.05, 0.12, 14), skin, 0, 0.56, 0.005);

  // ca-sa (chư Tăng): vắt chéo từ vai trái xuống hông phải
  if (o.kasaya) {
    const km = new THREE.MeshStandardMaterial({ color: o.kasaya, roughness: 0.78, side: THREE.DoubleSide });
    const drape = [];
    for (let i = 0; i < 32; i++) { const a = i / 32 * Math.PI * 2; drape.push(new THREE.Vector3(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.172)); }
    const band = add(upper, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(drape, true), 64, 0.048, 8, true), km, 0, 0.27, 0);
    band.rotation.z = 0.8; band.scale.set(1, 1, 1);
    const wrap = add(upper, new THREE.CylinderGeometry(0.218, 0.232, 0.3, 28, 1, true), km, 0, 0.06, 0); wrap.scale.z = 0.76;
    const hem = add(lower, new THREE.CylinderGeometry(0.21, 0.255, 0.5, 28, 1, true), km, 0, 0.7, 0); hem.scale.z = 0.8;
    // đường may ô ruộng
    for (let k = -2; k <= 2; k++) add(lower, new THREE.BoxGeometry(0.008, 0.5, 0.008), robeDark, k * 0.08, 0.7, 0.2 - Math.abs(k) * 0.012, false);
  }

  /* đầu */
  const neckTop = new THREE.Group(); neckTop.position.set(0, 0.6, 0.01); upper.add(neckTop);
  const { head, lids } = buildHead(skin, { ...o, child });
  head.position.y = 0.1; neckTop.add(head);
  if (child) head.scale.setScalar(1.32);

  /* tay: vai → khuỷu → cổ tay, tay áo rộng */
  const a = 0.29, b = 0.25;
  const arms = [1, -1].map(side => {
    const shoulder = new THREE.Group(); shoulder.position.set(side * 0.2, 0.43, 0); upper.add(shoulder);
    add(shoulder, new THREE.SphereGeometry(0.066, 14, 10), robeMat, 0, 0, 0);
    add(shoulder, new THREE.CylinderGeometry(0.062, 0.07, a, 14), robeMat, 0, -a / 2, 0);
    const elbow = new THREE.Group(); elbow.position.y = -a; shoulder.add(elbow);
    add(elbow, new THREE.SphereGeometry(0.068, 12, 10), robeMat, 0, 0, 0);
    // tay áo loe rộng (áo tràng)
    const sleeve = add(elbow, new THREE.CylinderGeometry(0.07, 0.108, b - 0.02, 18, 1, true), robeMat, 0, -(b - 0.02) / 2, 0);
    sleeve.scale.z = 0.95;
    const cuff = add(elbow, new THREE.TorusGeometry(0.106, 0.008, 6, 22), robeDark, 0, -(b - 0.02), 0, false); cuff.rotation.x = Math.PI / 2;
    add(elbow, new THREE.CylinderGeometry(0.03, 0.026, b * 0.8, 10), skin, 0, -b * 0.55, 0, false); // cẳng tay trong ống
    const wrist = new THREE.Group(); wrist.position.y = -b; elbow.add(wrist);
    const { hand, fingers } = buildHand(skin, side);
    wrist.add(hand);
    return { side, shoulder, elbow, wrist, hand, fingers, a, b };
  });
  robeMat.side = THREE.DoubleSide;

  const h = {
    root, body, lower, upper, head, neckTop, feet, lids, robeMat, arms,
    armL: arms[0], armR: arms[1], blinkT: 1 + Math.random() * 3, blink: 0, closedEyes: false,
    // đặt bàn tay tới điểm (trong hệ toạ độ "upper")
    reach(side, x, y, z, pole) {
      const arm = side > 0 ? arms[0] : arms[1];
      solveArm(arm, new THREE.Vector3(x, y, z), pole || new THREE.Vector3(side * 1, -0.6, -0.5).normalize());
    },
    wristBend(side, x = 0, z = 0) { const arm = side > 0 ? arms[0] : arms[1]; arm.wrist.rotation.set(x, 0, z); },
    grip(side, k) { const arm = side > 0 ? arms[0] : arms[1]; arm.fingers.rotation.x = 0; arm.fingers.rotation.z = -arm.side * k * 1.3; },
    // xoay bàn tay theo hướng ngón tay (trong hệ "upper")
    orientHand(side, finger, palmX = side > 0 ? -1 : 1) {
      const arm = side > 0 ? arms[0] : arms[1];
      _y.copy(finger).normalize().negate(); _x.set(palmX, 0, 0);
      _x.addScaledVector(_y, -_y.dot(_x)).normalize(); _z.crossVectors(_x, _y);
      _m.makeBasis(_x, _y, _z); _qd.setFromRotationMatrix(_m);
      _qp.copy(arm.shoulder.quaternion).multiply(arm.elbow.quaternion).invert();
      arm.wrist.quaternion.copy(_qp.multiply(_qd));
    },
    // chắp tay trước ngực
    anjali(k = 1) {
      h.reach(1, 0.024, 0.2 + 0.08 * k, 0.17 + 0.05 * k, new THREE.Vector3(1, -0.45, -0.25).normalize());
      h.reach(-1, -0.024, 0.2 + 0.08 * k, 0.17 + 0.05 * k, new THREE.Vector3(-1, -0.45, -0.25).normalize());
      _f.set(0, 1, 0.18); h.orientHand(1, _f); h.orientHand(-1, _f);
      h.grip(1, 0); h.grip(-1, 0);
    },
    // vung tay khi đi
    walkArms(ph, amp = 1) {
      for (const s of [1, -1]) {
        const sw = Math.sin(ph) * s * 0.12 * amp;
        h.reach(s, s * 0.24, -0.08, 0.05 + sw, new THREE.Vector3(s * 0.3, 0, -1).normalize());
        h.wristBend(s, 0, 0); h.grip(s, 0.25);
      }
    },
    // bước chân
    step(ph, amp = 1) {
      feet.forEach((f, i) => {
        const s = Math.sin(ph + i * Math.PI);
        f.position.z = 0.03 + s * 0.13 * amp;
        f.position.y = Math.max(0, Math.cos(ph + i * Math.PI)) * 0.04 * amp;
        f.rotation.x = -s * 0.15 * amp;
      });
      lower.rotation.z = Math.sin(ph) * 0.03 * amp;
    },
    idle(dt, t) {
      // thở
      const br = Math.sin(t * 1.6 + root.id) * 0.008;
      upper.scale.set(1 + br * 0.6, 1 + br, 1 + br * 1.2);
      // chớp mắt
      h.blinkT -= dt;
      if (h.blinkT < 0) { h.blink = 1; h.blinkT = 2 + Math.random() * 4; }
      h.blink = Math.max(0, h.blink - dt * 7);
      const c = h.closedEyes ? 1 : Math.sin(h.blink * Math.PI);
      lids.forEach(l => { l.rotation.x = -0.35 + c * 1.95; });
    }
  };
  h.anjali();
  h.idle(0, 0);
  return h;
}

/* Tư thế ngồi kiết già (cho thầy tụng kinh) */
export function makeSeated(o) {
  const h = makeHuman(o);
  h.lower.visible = false;
  h.body.position.y = -0.95 * h.body.scale.y + 0.32;
  const legs = new THREE.Group(); legs.position.y = 0.95; h.body.add(legs);
  const lap = add(legs, new THREE.SphereGeometry(0.3, 20, 12), h.robeMat, 0, -0.06, 0.12); lap.scale.set(1.3, 0.38, 0.95);
  for (const sx of [-1, 1]) {
    const shin = add(legs, new THREE.CapsuleGeometry(0.07, 0.3, 4, 10), h.robeMat, sx * 0.03, -0.03, 0.22); shin.rotation.set(0, sx * 0.35, Math.PI / 2);
    const foot = add(legs, new THREE.SphereGeometry(0.045, 10, 8), skinMat(o.skinTone ?? 0), sx * 0.15, 0.0, 0.24 - sx * 0.05, false); foot.scale.set(1.6, 0.5, 0.8);
  }
  return h;
}
