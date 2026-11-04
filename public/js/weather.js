import * as THREE from 'three';
import { softDot } from './util.js';

/* Các kiểu thời tiết. Server chọn ngẫu nhiên và đồng bộ cho mọi người chơi. */
export const PRESETS = {
  nang:     { label: '☀️ Nắng đẹp',  top: 0x2f6fc0, mid: 0x8dbfe8, bot: 0xe2ecef, sun: 0xfff0d2, sunI: 3.2, el: 0.9,  hemi: 1.1, fog: 0xc9dce6, fogNear: 70, fogFar: 380, exp: 1.0,  rain: 0,   cloud: 0.3,  cloudDark: 0,   wind: 0.25, night: 0,    stars: 0, mist: 0,   storm: 0, birds: 1, petals: 1, disc: 1 },
  hoanghon: { label: '🌇 Hoàng hôn', top: 0x283a78, mid: 0xd47f86, bot: 0xf5a565, sun: 0xffa860, sunI: 2.6, el: 0.13, hemi: 0.85, fog: 0xe3a07c, fogNear: 60, fogFar: 320, exp: 1.08, rain: 0,   cloud: 0.4,  cloudDark: 0.1, wind: 0.3,  night: 0.35, stars: 0, mist: 0,   storm: 0, birds: 1, petals: 1, disc: 1 },
  may:      { label: '☁️ Trời âm u', top: 0x67778a, mid: 0x9ea9b3, bot: 0xc0c5c8, sun: 0xdfe6ee, sunI: 0.9, el: 0.75, hemi: 1.35, fog: 0xb1b9be, fogNear: 45, fogFar: 260, exp: 1.0,  rain: 0,   cloud: 1,    cloudDark: 0.35, wind: 0.7, night: 0.1,  stars: 0, mist: 0.1, storm: 0, birds: 1, petals: 0.5, disc: 0 },
  mua:      { label: '🌧️ Mưa',       top: 0x39424c, mid: 0x5b666f, bot: 0x79838a, sun: 0xc8d0d8, sunI: 0.4, el: 0.75, hemi: 1.0, fog: 0x6c767c, fogNear: 12, fogFar: 150, exp: 1.05, rain: 0.6, cloud: 1,    cloudDark: 0.7, wind: 0.9,  night: 0.3,  stars: 0, mist: 0.3, storm: 0, birds: 0, petals: 0, disc: 0 },
  giong:    { label: '⛈️ Giông bão', top: 0x1a2028, mid: 0x2f3741, bot: 0x444c55, sun: 0xaeb8c4, sunI: 0.25, el: 0.75, hemi: 0.7, fog: 0x39414a, fogNear: 8, fogFar: 115, exp: 1.1,  rain: 1,   cloud: 1,    cloudDark: 1,   wind: 1.8,  night: 0.6,  stars: 0, mist: 0.3, storm: 1, birds: 0, petals: 0, disc: 0 },
  suong:    { label: '🌫️ Sương mù',  top: 0xa7b2b8, mid: 0xcdd4d7, bot: 0xe3e7e8, sun: 0xfff6e8, sunI: 0.9, el: 0.35, hemi: 1.5, fog: 0xdce2e4, fogNear: 2, fogFar: 75, exp: 1.0,   rain: 0,   cloud: 0.5,  cloudDark: 0,   wind: 0.1,  night: 0.15, stars: 0, mist: 1,   storm: 0, birds: 0, petals: 0.3, disc: 0.3 },
  dem:      { label: '🌙 Đêm trăng', top: 0x040818, mid: 0x0e1836, bot: 0x22304e, sun: 0x9fb6ff, sunI: 0.55, el: 0.65, hemi: 0.3, fog: 0x121a30, fogNear: 30, fogFar: 230, exp: 1.2,  rain: 0,   cloud: 0.25, cloudDark: 0.6, wind: 0.2,  night: 1,    stars: 1, mist: 0.1, storm: 0, birds: 0, petals: 0, disc: 0 }
};
const COLOR_KEYS = ['top', 'mid', 'bot', 'sun', 'fog'];

export function createWeather(scene, renderer, sun, hemi) {
  const cur = {}, tgt = {};
  const init = PRESETS.nang;
  for (const k in init) {
    if (k === 'label') continue;
    if (COLOR_KEYS.includes(k)) { cur[k] = new THREE.Color(init[k]); tgt[k] = new THREE.Color(init[k]); }
    else { cur[k] = init[k]; tgt[k] = init[k]; }
  }
  let key = 'nang';

  /* Bầu trời */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: cur.top.clone() }, mid: { value: cur.mid.clone() }, bot: { value: cur.bot.clone() }, sunDir: { value: new THREE.Vector3() }, sunCol: { value: new THREE.Color() }, disc: { value: 1 }, night: { value: 0 }, flash: { value: 0 } },
    vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 top,mid,bot,sunDir,sunCol; uniform float disc,night,flash; varying vec3 vP;
      void main(){ float h = vP.y;
        vec3 c = mix(bot, mid, smoothstep(-0.05, 0.22, h)); c = mix(c, top, smoothstep(0.2, 0.8, h));
        float s = max(dot(vP, sunDir), 0.);
        float glow = pow(s, mix(12., 60., night)) * mix(0.55, 0.15, night);
        float core = smoothstep(mix(0.9993,0.9996,night), mix(0.9997,0.9999,night), s);
        c += sunCol * (glow + core * mix(4., 2., night)) * disc;
        c += vec3(.8,.85,1.) * flash;
        gl_FragColor = vec4(c, 1.); }`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), skyMat); sky.renderOrder = -1; scene.add(sky);
  const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(sky.geometry, skyMat));
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null, envTimer = 0, envDirty = true;
  const updateEnv = () => {
    const rt = pmrem.fromScene(envScene, 0.04, 0.1, 1000);
    if (envRT) envRT.dispose(); envRT = rt; scene.environment = rt.texture;
  };

  /* Sao & trăng */
  const starGeo = new THREE.BufferGeometry(); const sp = [];
  for (let i = 0; i < 1800; i++) { const u = Math.random() * 6.28, v = Math.acos(Math.random() * 0.95); sp.push(Math.sin(v) * Math.cos(u) * 420, Math.cos(v) * 420, Math.sin(v) * Math.sin(u) * 420); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(stars);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot('rgba(240,240,255,1)', 128), transparent: true, opacity: 0, fog: false, depthWrite: false }));
  moon.scale.setScalar(60); scene.add(moon);

  /* Mây */
  const cloudTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    for (let i = 0; i < 26; i++) {
      const x = 50 + Math.random() * 156, y = 90 + Math.random() * 80, r = 30 + Math.random() * 50;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    }
    return new THREE.CanvasTexture(c);
  })();
  const clouds = [];
  for (let i = 0; i < 46; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0 }));
    const a = Math.random() * 6.28, d = 60 + Math.random() * 260;
    s.position.set(Math.cos(a) * d, 70 + Math.random() * 60, Math.sin(a) * d);
    s.scale.set(110 + Math.random() * 120, 60 + Math.random() * 40, 1);
    scene.add(s); clouds.push(s);
  }

  /* Mưa */
  const RN = 6000;
  const rainPos = new Float32Array(RN * 6);
  for (let i = 0; i < RN; i++) { rainPos[i * 6] = (Math.random() - .5) * 80; rainPos[i * 6 + 1] = Math.random() * 40; rainPos[i * 6 + 2] = (Math.random() - .5) * 80; }
  const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xb8c6d4, transparent: true, opacity: 0.45, depthWrite: false }));
  rain.frustumCulled = false; scene.add(rain);
  const rainBase = Array.from({ length: RN }, (_, i) => [rainPos[i * 6], rainPos[i * 6 + 1], rainPos[i * 6 + 2]]);

  /* Sương */
  const mistTex = softDot('rgba(235,238,240,.9)', 128);
  const mists = [];
  for (let i = 0; i < 34; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.position.set((Math.random() - .5) * 90, 1.5 + Math.random() * 5, (Math.random() - .5) * 120);
    s.scale.set(26 + Math.random() * 20, 7 + Math.random() * 5, 1); s.userData.v = 0.3 + Math.random() * 0.6;
    scene.add(s); mists.push(s);
  }

  /* Sét */
  const boltGeo = new THREE.BufferGeometry(); boltGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(3 * 40), 3));
  const bolt = new THREE.Line(boltGeo, new THREE.LineBasicMaterial({ color: 0xe8f0ff, fog: false, transparent: true }));
  bolt.visible = false; bolt.frustumCulled = false; scene.add(bolt);
  let flash = 0, boltT = 0, nextStrike = 4;

  const api = {
    get key() { return key; },
    get label() { return PRESETS[key].label; },
    cur, onThunder: null,
    set(k, instant = false) {
      if (!PRESETS[k]) return; key = k; const p = PRESETS[k];
      for (const n in tgt) { if (COLOR_KEYS.includes(n)) tgt[n].set(p[n]); else tgt[n] = p[n]; }
      if (instant) for (const n in tgt) { if (COLOR_KEYS.includes(n)) cur[n].copy(tgt[n]); else cur[n] = tgt[n]; }
      envDirty = true;
    },
    update(dt, t, camPos) {
      const k = 1 - Math.exp(-dt * 0.45);
      let diff = 0;
      for (const n in tgt) {
        if (COLOR_KEYS.includes(n)) { diff += Math.abs(cur[n].r - tgt[n].r); cur[n].lerp(tgt[n], k); }
        else { diff += Math.abs(cur[n] - tgt[n]); cur[n] += (tgt[n] - cur[n]) * k; }
      }
      // mặt trời / mặt trăng
      const dir = new THREE.Vector3(-0.62, cur.el, -0.78).normalize();
      skyMat.uniforms.sunDir.value.copy(dir);
      skyMat.uniforms.top.value.copy(cur.top); skyMat.uniforms.mid.value.copy(cur.mid); skyMat.uniforms.bot.value.copy(cur.bot);
      skyMat.uniforms.sunCol.value.copy(cur.sun); skyMat.uniforms.disc.value = cur.disc; skyMat.uniforms.night.value = cur.night;
      sun.position.copy(dir).multiplyScalar(110); sun.target.position.set(0, 0, 0);
      sun.color.copy(cur.sun); sun.intensity = cur.sunI;
      hemi.intensity = cur.hemi; hemi.color.copy(cur.mid).lerp(new THREE.Color(0xffffff), 0.5);
      scene.fog.color.copy(cur.fog); scene.fog.near = cur.fogNear; scene.fog.far = cur.fogFar;
      renderer.toneMappingExposure = cur.exp;
      scene.environmentIntensity = 0.55 * (1 - cur.night * 0.75);
      sky.position.copy(camPos); stars.position.copy(camPos);

      stars.material.opacity = cur.stars * (1 - cur.cloud * 0.6);
      moon.position.copy(camPos).addScaledVector(dir, 400); moon.material.opacity = cur.stars;

      // mây
      const cc = new THREE.Color(0xffffff).lerp(new THREE.Color(0x3a4048), cur.cloudDark).lerp(cur.sun, 0.15 * (1 - cur.cloudDark));
      if (cur.night > 0.8) cc.multiplyScalar(0.25);
      clouds.forEach((c, i) => {
        c.position.x += (2 + cur.wind * 6) * dt * (0.7 + (i % 5) * 0.1);
        if (c.position.x > 320) c.position.x = -320;
        c.material.opacity = Math.min(0.95, cur.cloud * (0.55 + (i % 4) * 0.12));
        c.material.color.copy(cc);
      });

      // mưa
      const rn = Math.floor(RN * cur.rain);
      rainGeo.setDrawRange(0, rn * 2);
      rain.visible = rn > 10;
      if (rain.visible) {
        const sp = 28 + cur.rain * 10, slant = cur.wind * 0.35;
        for (let i = 0; i < rn; i++) {
          const b = rainBase[i];
          b[1] -= sp * dt; b[0] += slant * sp * dt * 0.3;
          if (b[1] < 0) { b[1] += 40; b[0] = (Math.random() - .5) * 80; }
          if (b[0] > 40) b[0] -= 80;
          const x = camPos.x + b[0], y = camPos.y - 8 + b[1], z = camPos.z + b[2];
          rainPos[i * 6] = x; rainPos[i * 6 + 1] = y; rainPos[i * 6 + 2] = z;
          rainPos[i * 6 + 3] = x - slant * 0.6; rainPos[i * 6 + 4] = y + 0.7; rainPos[i * 6 + 5] = z;
        }
        rainGeo.attributes.position.needsUpdate = true;
        rain.material.opacity = 0.25 + cur.night * 0.15;
      }

      // sương
      mists.forEach(m => {
        m.position.x += m.userData.v * dt * (0.5 + cur.wind);
        if (m.position.x > 50) m.position.x = -50;
        m.material.opacity = cur.mist * 0.42;
        m.material.color.copy(cur.fog);
      });

      // sét
      flash = Math.max(0, flash - dt * 4);
      if (cur.storm > 0.6) {
        nextStrike -= dt;
        if (nextStrike <= 0) {
          nextStrike = 5 + Math.random() * 10;
          flash = 1.2; boltT = 0.25;
          const a = Math.random() * 6.28, d = 120 + Math.random() * 150;
          let x = camPos.x + Math.cos(a) * d, z = camPos.z + Math.sin(a) * d, y = 130;
          const arr = boltGeo.attributes.position.array;
          for (let i = 0; i < 40; i++) { arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z; x += (Math.random() - .5) * 9; z += (Math.random() - .5) * 9; y -= 3.4; }
          boltGeo.attributes.position.needsUpdate = true;
          api.onThunder?.(0.4 + Math.random() * 1.6, 0.6 + Math.random() * 0.4);
        }
      }
      boltT = Math.max(0, boltT - dt); bolt.visible = boltT > 0 && (boltT * 30 | 0) % 2 === 0;
      const fl = flash > 0 ? Math.max(0, Math.sin(flash * 12)) * flash : 0;
      skyMat.uniforms.flash.value = fl * 0.6; hemi.intensity += fl * 3;

      envTimer -= dt;
      if ((envDirty || diff > 0.05) && envTimer <= 0) { updateEnv(); envTimer = 1.5; envDirty = diff > 0.02; }
    }
  };
  updateEnv();
  return api;
}
