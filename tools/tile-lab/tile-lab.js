// Tile Lab - Step 0 visual test for the isometric tile + sprite pipeline.
// Open http://localhost:5173/tools/tile-lab/   (npm start first)
//
//   WASD  walk          1 / 2 / 3 or mouse wheel   zoom 1.0 / 1.25 / 1.5
//   G     show collision shapes
//
// Not the game: a small hand-made 30x30 scene that shows what maps built from the
// AI tile sheets look like, and proves the art stays sharp at every zoom level.
// How sharpness is kept:
//   * the canvas is sized in REAL screen pixels (devicePixelRatio), so the browser
//     never stretches it (stretching = blur, e.g. with Windows display scaling 125%)
//   * assets are stored large (ISO.MASTER_SCALE) and, per zoom level, shrunk ONCE with
//     high-quality filtering into a cache; every frame then draws the cached copies
//     1:1 at whole-pixel positions with imageSmoothingEnabled = false

import { ISO } from '../../client/data/iso-config.js';
import { buildCharacterSheet, drawSheetFrame } from '../../client/rendering/sprites.js';

const canvas = document.getElementById('lab');
const ctx = canvas.getContext('2d');
const info = document.getElementById('info');
const params = new URLSearchParams(location.search);

// ------------------------------------------------------------------ assets

const registry = await (await fetch('../../client/data/asset-registry.json')).json();
const ASSETS = registry.assets;
const MASTER = registry.masterScale;
const images = {};
await Promise.all(Object.entries(ASSETS).map(([id, a]) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => { images[id] = img; resolve(); };
  img.onerror = () => reject(new Error(`missing asset file ${a.file}`));
  img.src = `../../${a.file}`;
})));

// scaled copies: one per asset per screen scale, made once
const cache = new Map();
function scaled(id, s) {
  const key = `${id}@${s}`;
  let entry = cache.get(key);
  if (entry) return entry;
  const a = ASSETS[id];
  const k = s / MASTER;
  // ground tiles get 2 extra pixels so neighbouring diamonds overlap instead of leaving hairline gaps
  const extra = a.kind === 'tile' ? 2 : 0;
  const w = Math.max(1, Math.round(a.w * k) + extra);
  const h = Math.max(1, Math.round(a.h * k * (w / Math.max(1, Math.round(a.w * k)))));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(images[id], 0, 0, w, h);
  entry = { canvas: c, ax: Math.round((a.ax / a.w) * w), ay: Math.round((a.ay / a.h) * h) };
  cache.set(key, entry);
  return entry;
}

// ------------------------------------------------------------------ test scene (30 x 30 tiles)

const W = 30;
const H = 30;
const hash = (x, y, seed = 0) => {
  let h = (x + seed * 7919) * 374761393 + (y - seed * 104729) * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
};
const pick = (list, x, y, seed) => list[Math.floor(hash(x, y, seed) * list.length)];

const ground = [];
const reserved = new Set();
const key = (x, y) => `${x},${y}`;
for (let y = 0; y < H; y++) {
  const row = [];
  for (let x = 0; x < W; x++) {
    const r = hash(x, y, 1);
    row.push(r < 0.5 ? 'grass_01' : r < 0.75 ? 'grass_02' : pick(['grass_03', 'grass_04', 'grass_05', 'grass_06'], x, y, 2));
  }
  ground.push(row);
}
const set = (x, y, id) => { if (x >= 0 && y >= 0 && x < W && y < H) { ground[y][x] = id; reserved.add(key(x, y)); } };
const dirt = ['dirt_01', 'dirt_02', 'dirt_03', 'dirt_04', 'dirt_05', 'dirt_06'];
const water = ['water_01', 'water_02', 'water_03'];
const stone = ['stone_01', 'stone_02', 'stone_03'];

for (let y = 0; y < H; y++) for (const x of [8, 9]) set(x, y, pick(water, x, y, 3));           // river
for (let x = 0; x < W; x++) for (const y of [15, 16]) if (x !== 8 && x !== 9) set(x, y, pick(dirt, x, y, 4)); // east-west road
for (let y = 17; y < H; y++) for (const x of [15, 16]) set(x, y, pick(dirt, x, y, 5)); // road south
for (let y = 4; y <= 9; y++) for (let x = 20; x <= 25; x++) set(x, y, pick(stone, x, y, 6));    // ruins plaza
set(22, 6, 'rune_floor_01');
set(20, 4, 'ruin_floor_01');
set(25, 9, 'ruin_floor_02');
for (let x = 11; x < W; x++) set(x, 0, pick(['cliff_01', 'cliff_02'], x, 0, 7));                // cliff edge (north)

const objects = [];
const place = (id, tx, ty, radius = 1) => {
  objects.push({ id, tx, ty });
  for (let y = Math.floor(ty - radius); y <= Math.floor(ty + radius); y++) {
    for (let x = Math.floor(tx - radius); x <= Math.floor(tx + radius); x++) reserved.add(key(x, y));
  }
};
place('bridge_01', 9, 16, 2);
place('waterfall_01', 9.2, 3.2, 2);
place('great_tree_01', 22.5, 22.5, 2);
place('tent_01', 4.2, 21.5, 2);
place('campfire_01', 6.6, 23.6, 1);
place('log_01', 3.6, 25.2, 1);
place('stump_01', 6.8, 20.4, 0);
place('hut_01', 26.5, 26.5, 2);
place('pillar_01', 20.4, 4.4, 0);
place('pillar_02', 25.6, 4.4, 0);
place('obelisk_01', 20.4, 9.6, 0);
place('obelisk_02', 25.6, 9.6, 0);
place('ruin_wall_01', 23, 3.2, 1);
place('statue_01', 22.5, 10.4, 0);
place('rubble_01', 19.2, 7, 0);
place('sign_01', 17.5, 17.8, 0);
place('rock_04', 12.5, 22.5, 1);
place('rock_moss_02', 27.5, 13.5, 1);

// nature fills the rest - denser along the edges, like a forest clearing
for (let y = 1; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (reserved.has(key(x, y))) continue;
    const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
    const r = hash(x, y, 11);
    const tree = edge < 3 ? 0.42 : 0.035;
    const jx = x + 0.3 + hash(x, y, 12) * 0.4;
    const jy = y + 0.3 + hash(x, y, 13) * 0.4;
    if (r < tree) objects.push({ id: pick(['pine_01', 'pine_02', 'pine_03', 'pine_04', 'pine_05', 'tree_01', 'tree_02', 'tree_03'], x, y, 14), tx: jx, ty: jy });
    else if (r < tree + 0.05) objects.push({ id: pick(['bush_01', 'bush_02', 'bush_03', 'bush_04'], x, y, 15), tx: jx, ty: jy });
    else if (r < tree + 0.09) objects.push({ id: pick(['flowers_01', 'flowers_02', 'flowers_03', 'flowers_04'], x, y, 16), tx: jx, ty: jy });
    else if (r < tree + 0.105) objects.push({ id: pick(['rock_01', 'rock_02', 'rock_03', 'pebble_01'], x, y, 17), tx: jx, ty: jy });
    else if (r < tree + 0.115) objects.push({ id: pick(['mushroom_01', 'mushroom_02', 'mushroom_03'], x, y, 18), tx: jx, ty: jy });
  }
}

// collision: water + cliffs from the ground, shapes from the asset registry
const isBlockedTile = (x, y) => x < 0 || y < 0 || x >= W || y >= H || /^(water|cliff)/.test(ground[y][x]);
function blocked(tx, ty, r = 0.25) {
  for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
    const x = Math.floor(tx + dx);
    const y = Math.floor(ty + dy);
    if (isBlockedTile(x, y)) {
      // the bridge makes its two water tiles walkable
      const onBridge = (y === 15 || y === 16) && (x === 8 || x === 9);
      if (!onBridge) return true;
    }
  }
  for (const o of objects) {
    const c = ASSETS[o.id].collision;
    if (!c) continue;
    if (c.circle && Math.hypot(tx - o.tx, ty - o.ty) < c.circle + r) return true;
    if (c.rect && Math.abs(tx - o.tx) < c.rect[0] / 2 + r && Math.abs(ty - o.ty) < c.rect[1] / 2 + r) return true;
  }
  return false;
}

// ------------------------------------------------------------------ player (existing pixel character)

const player = { tx: 12.5, ty: 16, dir: 'w', frame: 0, anim: 0 };
if (params.has('x')) { player.tx = +params.get('x'); player.ty = +params.get('y'); }
const sheet = buildCharacterSheet({ skin: '#e7b18b', hair: '#2f2118', hairStyle: 'short', cloth: '#3f6aa8', accent: '#c3cbdd', kit: 'shield' });

// ------------------------------------------------------------------ view

let zoomIndex = Math.min(ISO.ZOOM_LEVELS.length - 1, Math.max(0, +(params.get('zoom') ?? 0)));
let showCollision = params.has('debug');
let dpr = 1;
let s = 1; // screen pixels per zoom-1.0 pixel
const cam = { tx: player.tx, ty: player.ty };

function resize() {
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  s = ISO.ZOOM_LEVELS[zoomIndex] * dpr;
}
window.addEventListener('resize', resize);
resize();

const toScreen = (tx, ty) => ({ x: (tx - ty) * (ISO.TILE_W / 2) * s, y: (tx + ty) * (ISO.TILE_H / 2) * s });

const keys = new Set();
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  const n = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
  if (n >= 0 && n < ISO.ZOOM_LEVELS.length) { zoomIndex = n; resize(); }
  if (e.code === 'KeyG') showCollision = !showCollision;
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('wheel', (e) => {
  zoomIndex = Math.max(0, Math.min(ISO.ZOOM_LEVELS.length - 1, zoomIndex - Math.sign(e.deltaY)));
  resize();
}, { passive: true });

// ------------------------------------------------------------------ loop

let last = performance.now();
let fps = 0;
let frames = 0;
let fpsTimer = 0;

function update(dt) {
  let sx = 0;
  let sy = 0;
  if (keys.has('KeyW')) sy -= 1;
  if (keys.has('KeyS')) sy += 1;
  if (keys.has('KeyA')) sx -= 1;
  if (keys.has('KeyD')) sx += 1;
  if (sx || sy) {
    // screen direction -> map direction (2:1 diamond), same speed in every direction
    let dx = sx + 2 * sy;
    let dy = 2 * sy - sx;
    const len = Math.hypot(dx, dy);
    dx = (dx / len) * 4 * dt;
    dy = (dy / len) * 4 * dt;
    if (!blocked(player.tx + dx, player.ty)) player.tx += dx;
    if (!blocked(player.tx, player.ty + dy)) player.ty += dy;
    player.dir = Math.abs(sy) >= Math.abs(sx) ? (sy > 0 ? 's' : 'n') : (sx > 0 ? 'e' : 'w');
    player.anim += dt;
    player.frame = Math.floor(player.anim * 8) % 4;
  } else {
    player.frame = 0;
  }
  const t = 1 - Math.exp(-10 * dt);
  cam.tx += (player.tx - cam.tx) * t;
  cam.ty += (player.ty - cam.ty) * t;
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0b0f0c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // camera, kept inside the map's bounding box
  const c = toScreen(cam.tx, cam.ty);
  const minX = toScreen(0, H).x;
  const maxX = toScreen(W, 0).x;
  const maxY = toScreen(W, H).y;
  const clamp = (v, lo, hi, view) => (hi - lo <= view ? (lo + hi) / 2 : Math.max(lo + view / 2, Math.min(hi - view / 2, v)));
  const cx = clamp(c.x, minX, maxX, canvas.width);
  const cy = clamp(c.y, 0, maxY, canvas.height);
  const ox = Math.round(canvas.width / 2 - cx);
  const oy = Math.round(canvas.height / 2 - cy);
  const onScreen = (x, y, margin) => x > -margin && y > -margin && x < canvas.width + margin && y < canvas.height + margin;

  // ground - back to front along the diagonals, so each tile's thickness is covered by the one in front
  const sorted = [];
  for (let sum = 0; sum <= W + H - 2; sum++) {
    for (let x = Math.max(0, sum - H + 1); x <= Math.min(W - 1, sum); x++) {
      const y = sum - x;
      const id = ground[y][x];
      const p = toScreen(x + 0.5, y + 0.5);
      const px = Math.round(p.x + ox);
      const py = Math.round(p.y + oy);
      if (!onScreen(px, py, 200 * s)) continue;
      if (id.startsWith('cliff')) { sorted.push({ depth: x + y + 1, id, px, py }); continue; }
      const img = scaled(id, s);
      ctx.drawImage(img.canvas, px - img.ax, py - img.ay);
    }
  }

  // objects + player, sorted by depth (further "south" on the map = drawn later)
  for (const o of objects) {
    const p = toScreen(o.tx, o.ty);
    const px = Math.round(p.x + ox);
    const py = Math.round(p.y + oy);
    if (!onScreen(px, py, 400 * s)) continue;
    sorted.push({ depth: o.tx + o.ty + (o.id.startsWith('bridge') ? -1 : 0), id: o.id, px, py });
  }
  const pp = toScreen(player.tx, player.ty);
  sorted.push({ depth: player.tx + player.ty, player: true, px: Math.round(pp.x + ox), py: Math.round(pp.y + oy) });
  sorted.sort((a, b) => a.depth - b.depth);

  const charScale = Math.max(1, Math.round(2 * s)); // pixel-art character: whole-number scale only
  for (const item of sorted) {
    if (item.player) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(item.px, item.py, 5 * charScale, 2.5 * charScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(item.px, item.py);
      ctx.scale(charScale, charScale);
      drawSheetFrame(ctx, sheet, player.dir, player.frame, 0, 0);
      ctx.restore();
      continue;
    }
    const img = scaled(item.id, s);
    ctx.drawImage(img.canvas, item.px - img.ax, item.py - img.ay);
  }

  if (showCollision) {
    ctx.save();
    ctx.strokeStyle = '#ff4a4a';
    ctx.lineWidth = Math.max(1, Math.round(s));
    for (const o of objects) {
      const col = ASSETS[o.id].collision;
      if (!col) continue;
      const p = toScreen(o.tx, o.ty);
      ctx.beginPath();
      if (col.circle) {
        ctx.ellipse(p.x + ox, p.y + oy, col.circle * ISO.TILE_W * s * 0.707, col.circle * ISO.TILE_H * s * 0.707, 0, 0, Math.PI * 2);
      } else {
        const [w, d] = col.rect;
        const corners = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => toScreen(o.tx + a, o.ty + b));
        ctx.moveTo(corners[0].x + ox, corners[0].y + oy);
        for (const q of corners.slice(1)) ctx.lineTo(q.x + ox, q.y + oy);
        ctx.closePath();
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  info.textContent =
    `Tile Lab - Step 0   zoom ${ISO.ZOOM_LEVELS[zoomIndex]} (keys 1/2/3)   devicePixelRatio ${dpr}   ${fps} FPS\n` +
    `tile ${ISO.TILE_W}x${ISO.TILE_H} at zoom 1 -> ${Math.round(ISO.TILE_W * s)}x${Math.round(ISO.TILE_H * s)} screen px   ` +
    `player ${player.tx.toFixed(1)}, ${player.ty.toFixed(1)}   WASD walk   G collision`;
}

function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  frames++;
  fpsTimer += dt;
  if (fpsTimer >= 0.5) { fps = Math.round(frames / fpsTimer); frames = 0; fpsTimer = 0; }
  update(dt);
  render();
  requestAnimationFrame(loop);
}
cam.tx = player.tx;
cam.ty = player.ty;
render();
document.title = 'READY';
requestAnimationFrame(loop);
