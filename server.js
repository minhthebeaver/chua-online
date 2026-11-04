const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

const players = new Map();
const incense = [];
const lanterns = [];
let merit = 0;

const WEATHERS = ['nang', 'hoanghon', 'may', 'mua', 'giong', 'suong', 'dem'];
const WEATHER_NAMES = { nang: 'Nắng đẹp', hoanghon: 'Hoàng hôn', may: 'Trời âm u', mua: 'Mưa', giong: 'Giông bão', suong: 'Sương mù', dem: 'Đêm trăng' };
let weather = 'nang';
let weatherTimer = null;
let lastWeatherChange = 0;

function setWeather(key, by) {
  if (!WEATHERS.includes(key)) return false;
  weather = key; lastWeatherChange = Date.now();
  io.emit('weather', { key, by: by || null });
  scheduleWeather();
  return true;
}
function scheduleWeather() {
  clearTimeout(weatherTimer);
  weatherTimer = setTimeout(() => {
    const options = WEATHERS.filter(w => w !== weather);
    setWeather(options[Math.floor(Math.random() * options.length)]);
  }, 150000 + Math.random() * 120000); // 2.5 – 4.5 phút đổi thời tiết
}
scheduleWeather();

const clean = (v, max) => String(v ?? '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
const clamp = (n, a, b) => Math.max(a, Math.min(b, Number(n) || 0));
const COLORS = ['#c9772b', '#7a4a2a', '#6b6f78', '#d9a227', '#e9e2d0', '#b4495c'];

app.get('/health', (_q, res) => res.json({ ok: true, players: players.size, merit, weather }));

io.on('connection', socket => {
  let lastAction = 0, lastChat = 0;

  // Gửi trạng thái thế giới ngay khi mở trang (để màn hình chờ cũng đúng thời tiết)
  const now = Date.now();
  while (lanterns.length && now - lanterns[0].t > 300000) lanterns.shift();
  socket.emit('hello', { now, weather, lanterns, merit, count: players.size });

  socket.on('join', d => {
    if (players.has(socket.id)) return;
    const p = {
      id: socket.id,
      name: clean(d?.name, 20) || 'Phật tử ' + socket.id.slice(0, 4),
      color: COLORS.includes(d?.color) ? d.color : COLORS[0],
      x: (Math.random() - 0.5) * 6, z: 50, ry: Math.PI, moving: false
    };
    players.set(socket.id, p);
    socket.emit('init', { selfId: socket.id, players: [...players.values()], incense, now: Date.now() });
    socket.broadcast.emit('joined', p);
    io.emit('count', players.size);
    io.emit('system', `${p.name} đã bước qua cổng Tam Quan`);
  });

  socket.on('move', d => {
    const p = players.get(socket.id); if (!p) return;
    p.x = clamp(d?.x, -40, 40); p.z = clamp(d?.z, -58, 56); p.ry = clamp(d?.ry, -10, 10);
    p.moving = !!d?.moving;
    socket.broadcast.volatile.emit('moved', { id: socket.id, x: p.x, z: p.z, ry: p.ry, moving: p.moving });
  });

  socket.on('action', d => {
    const p = players.get(socket.id); if (!p) return;
    const now = Date.now(); if (now - lastAction < 700) return; lastAction = now;
    const type = ['bow', 'bell', 'drum', 'incense', 'mo', 'lantern'].includes(d?.type) ? d.type : null;
    if (!type) return;
    merit++;
    io.emit('action', { id: socket.id, type, name: p.name, merit });
    if (type === 'incense') {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 1.3;
      const stick = { id: now + '-' + socket.id.slice(0, 4), x: Math.cos(a) * r, z: Math.sin(a) * r };
      incense.push(stick); if (incense.length > 80) incense.shift();
      io.emit('incense', stick);
    }
    if (type === 'lantern') {
      const l = { id: now + '-' + socket.id.slice(0, 4), z: 4 + Math.random() * 28, seed: Math.random() * 100, t: now, by: p.name };
      lanterns.push(l); if (lanterns.length > 40) lanterns.shift();
      io.emit('lantern', l);
    }
  });

  socket.on('weather:set', key => {
    const p = players.get(socket.id); if (!p) return;
    if (Date.now() - lastWeatherChange < 8000) return socket.emit('system', 'Trời vừa đổi, đợi chút rồi hẵng cầu mưa gọi gió nhé 😄');
    if (setWeather(key, p.name)) io.emit('system', `${p.name} đã khấn được “${WEATHER_NAMES[key]}”`);
  });

  socket.on('chat', msg => {
    const p = players.get(socket.id); if (!p) return;
    const now = Date.now(); if (now - lastChat < 600) return; lastChat = now;
    const text = clean(msg, 140); if (!text) return;
    io.emit('chat', { id: socket.id, name: p.name, color: p.color, text });
  });

  socket.on('disconnect', () => {
    const p = players.get(socket.id); if (!p) return;
    players.delete(socket.id);
    io.emit('left', socket.id);
    io.emit('count', players.size);
    io.emit('system', `${p.name} đã rời chùa`);
  });
});

server.listen(PORT, () => console.log(`🏯 Chùa Online v3: http://localhost:${PORT}`));
