// Âm thanh tổng hợp bằng WebAudio – không cần file mp3
let ctx = null, master = null, rainGain = null, on = true;

function noiseBuffer(sec) {
  const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

export const sfx = {
  init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(2); src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    rainGain = ctx.createGain(); rainGain.gain.value = 0;
    src.connect(lp).connect(rainGain).connect(master); src.start();
  },
  get on() { return on; },
  toggle() { on = !on; if (master) master.gain.value = on ? 0.9 : 0; return on; },
  ready: () => !!ctx,
  bell(vol = 1) {
    if (!ctx || vol < 0.02) return; const t = ctx.currentTime;
    [[98, 1, 9], [196, 0.55, 7], [233, 0.35, 5.5], [294, 0.28, 4.5], [392, 0.16, 3], [523, 0.08, 2]].forEach(([f, g, d]) => {
      const o = ctx.createOscillator(), v = ctx.createGain(); o.frequency.value = f;
      const o2 = ctx.createOscillator(); o2.frequency.value = f * 1.004; const v2 = ctx.createGain(); v2.gain.value = 0.5;
      v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g * 0.32 * vol, t + 0.015); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(v); o2.connect(v2).connect(v); v.connect(master); o.start(t); o2.start(t); o.stop(t + d); o2.stop(t + d);
    });
  },
  mo(vol = 1) {
    if (!ctx || vol < 0.02) return; const t = ctx.currentTime;
    const o = ctx.createOscillator(), v = ctx.createGain(); o.type = 'triangle';
    o.frequency.setValueAtTime(760, t); o.frequency.exponentialRampToValueAtTime(400, t + 0.12);
    v.gain.setValueAtTime(0.5 * vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(v).connect(master); o.start(t); o.stop(t + 0.22);
  },
  drum(vol = 1) {
    if (!ctx || vol < 0.02) return; const t = ctx.currentTime;
    const o = ctx.createOscillator(), v = ctx.createGain();
    o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.6);
    v.gain.setValueAtTime(0.9 * vol, t); v.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    o.connect(v).connect(master); o.start(t); o.stop(t + 1.25);
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.2); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
    const nv = ctx.createGain(); nv.gain.setValueAtTime(0.4 * vol, t); nv.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    n.connect(f).connect(nv).connect(master); n.start(t);
  },
  chime(vol = 0.5) {
    if (!ctx) return; const t = ctx.currentTime;
    [880, 1320, 1760].forEach((f, i) => {
      const o = ctx.createOscillator(), v = ctx.createGain(); o.frequency.value = f; const s = t + i * 0.09;
      v.gain.setValueAtTime(0, s); v.gain.linearRampToValueAtTime(0.1 * vol, s + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, s + 1.5);
      o.connect(v).connect(master); o.start(s); o.stop(s + 1.6);
    });
  },
  thunder(delay = 1, vol = 1) {
    if (!ctx) return; const t = ctx.currentTime + delay;
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(4);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(120, t + 3);
    const v = ctx.createGain(); v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(0.9 * vol, t + 0.08); v.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
    n.connect(f).connect(v).connect(master); n.start(t);
  },
  setRain(level) { if (rainGain) rainGain.gain.setTargetAtTime(level * 0.22, ctx.currentTime, 0.8); },
  chirp(vol = 0.3) {
    if (!ctx) return; const t = ctx.currentTime;
    for (let i = 0; i < 2 + (Math.random() * 3 | 0); i++) {
      const s = t + i * 0.13, o = ctx.createOscillator(), v = ctx.createGain(), f0 = 2600 + Math.random() * 1400;
      o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(f0 * 1.5, s + 0.07);
      v.gain.setValueAtTime(0, s); v.gain.linearRampToValueAtTime(0.05 * vol, s + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, s + 0.09);
      o.connect(v).connect(master); o.start(s); o.stop(s + 0.1);
    }
  },
  cricket(vol = 0.3) {
    if (!ctx) return; const t = ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      const s = t + i * 0.05, o = ctx.createOscillator(), v = ctx.createGain(); o.frequency.value = 4400;
      v.gain.setValueAtTime(0, s); v.gain.linearRampToValueAtTime(0.025 * vol, s + 0.01); v.gain.exponentialRampToValueAtTime(0.0001, s + 0.04);
      o.connect(v).connect(master); o.start(s); o.stop(s + 0.05);
    }
  }
};
