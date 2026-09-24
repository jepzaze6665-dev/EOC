// Placeholder pixel art, generated with Canvas at startup.
// Every sprite is baked once into an offscreen canvas and then blitted, which is
// exactly how a real sprite sheet would be used - swapping in real .png assets later
// only means changing the builders in this file.

import { TILE_W, TILE_H } from '../core/iso.js';
import { TILE_DEFS, DECOR_DEFS } from '../data/tiles.js';
import { PROP_DEFS } from '../data/props.js';

const HALF_W = TILE_W / 2;   // 16
const HALF_H = TILE_H / 2;   // 8
const QUARTER_W = TILE_W / 4; // 8
const QUARTER_H = TILE_H / 4; // 4

// ---------------------------------------------------------------- helpers

export function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  return { canvas, g };
}

function rng(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function px(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let gg = (n >> 8) & 255;
  let b = n & 255;
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  r = Math.round(r + (target - r) * t);
  gg = Math.round(gg + (target - gg) * t);
  b = Math.round(b + (target - b) * t);
  return `#${((1 << 24) | (r << 16) | (gg << 8) | b).toString(16).slice(1)}`;
}

// Screen-space corners of an isometric footprint centered on (ox, oy).
function corners(ox, oy, w, d) {
  return {
    n: { x: ox + (d - w) * QUARTER_W, y: oy - (w + d) * QUARTER_H },
    e: { x: ox + (w + d) * QUARTER_W, y: oy + (w - d) * QUARTER_H },
    s: { x: ox + (w - d) * QUARTER_W, y: oy + (w + d) * QUARTER_H },
    w: { x: ox - (w + d) * QUARTER_W, y: oy + (d - w) * QUARTER_H }
  };
}

function up(p, h) {
  return { x: p.x, y: p.y - h };
}

function poly(g, points, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
  g.closePath();
  g.fill();
}

// A point on a wall face. u = along the base edge (0..1), v = height (0..1).
function faceP(p0, p1, h, u, v) {
  return { x: p0.x + (p1.x - p0.x) * u, y: p0.y + (p1.y - p0.y) * u - h * v };
}

function faceRect(g, p0, p1, h, u0, u1, v0, v1, color) {
  poly(g, [faceP(p0, p1, h, u0, v0), faceP(p0, p1, h, u1, v0), faceP(p0, p1, h, u1, v1), faceP(p0, p1, h, u0, v1)], color);
}

function drawBlock(g, c, h, colors) {
  poly(g, [c.w, c.s, up(c.s, h), up(c.w, h)], colors.left);
  poly(g, [c.s, c.e, up(c.e, h), up(c.s, h)], colors.right);
  poly(g, [up(c.n, h), up(c.e, h), up(c.s, h), up(c.w, h)], colors.top);
}

// ---------------------------------------------------------------- tiles

const tileSprites = {};

function buildTileFrame(def, seed) {
  const { canvas, g } = makeCanvas(TILE_W, TILE_H);
  const p = def.palette;
  const rand = rng(seed);
  const step = TILE_W / HALF_H; // 4px wider per row

  for (let i = 0; i < HALF_H; i++) {
    const w = (i + 1) * step;
    const x = (TILE_W - w) / 2;
    px(g, x, i, w, 1, p.base);
    px(g, x, TILE_H - 1 - i, w, 1, p.base);
  }

  if (def.pattern) drawTilePattern(g, def.pattern, p);

  const density = def.speckle ?? 0.1;
  for (let i = 0; i < HALF_H; i++) {
    const w = (i + 1) * step;
    const x0 = (TILE_W - w) / 2;
    for (const y of [i, TILE_H - 1 - i]) {
      for (let k = 0; k < w; k++) {
        if (rand() < density) px(g, x0 + k, y, 1, 1, rand() < 0.5 ? p.light : p.dark);
      }
    }
  }
  return { canvas, ax: HALF_W, ay: HALF_H };
}

// Is pixel (x, y) of a 32x16 tile canvas inside the diamond?
function inDiamond(x, y) {
  const i = y < HALF_H ? y : TILE_H - 1 - y;
  const w = (i + 1) * (TILE_W / HALF_H);
  const x0 = (TILE_W - w) / 2;
  return x >= x0 && x < x0 + w;
}

// Tile-local coordinates of a pixel: u runs along world X, v along world Y, both 0..1.
function tileUV(x, y) {
  const dx = x + 0.5 - HALF_W;
  const dy = y + 0.5 - HALF_H;
  return { u: dx / TILE_W + dy / TILE_H + 0.5, v: dy / TILE_H - dx / TILE_W + 0.5 };
}

const frac = (n) => n - Math.floor(n);

function drawTilePattern(g, pattern, p) {
  for (let y = 0; y < TILE_H; y++) {
    for (let x = 0; x < TILE_W; x++) {
      if (!inDiamond(x, y)) continue;
      const { u, v } = tileUV(x, y);
      let color = null;

      if (pattern === 'cobble') {
        const row = Math.floor(v * 3);
        const fu = frac(u * 3 + (row % 2) * 0.5);
        const fv = frac(v * 3);
        if (fu < 0.1 || fv < 0.12) color = p.dark;
        else if (fu < 0.2 || fv < 0.22) color = p.light;
      } else if (pattern === 'rows') {
        const f = frac(u * 4);
        if (f < 0.28) color = p.dark;
        else if (f > 0.8) color = p.light;
      } else if (pattern === 'planks') {
        const f = frac(v * 5);
        if (f < 0.14) color = p.dark;
        else if (f > 0.86) color = p.light;
      } else if (pattern === 'planks_x') {
        const f = frac(u * 5);
        if (f < 0.14) color = p.dark;
        else if (f > 0.86) color = p.light;
      } else if (pattern === 'steps') {
        const f = frac(v * 4);
        if (f < 0.22) color = p.dark;
        else if (f > 0.82) color = p.light;
      }

      if (color) px(g, x, y, 1, 1, color);
    }
  }
}

export function getTileSprite(id, time = 0) {
  const entry = tileSprites[id] || tileSprites.grass;
  if (!entry) return null;
  if (entry.frames.length === 1) return entry.frames[0];
  const index = Math.floor(time * entry.speed) % entry.frames.length;
  return entry.frames[index];
}

// ---------------------------------------------------------------- props

const propSprites = {};

function buildBuildingArt(g, ox, oy, def) {
  const p = def.palette;
  const c = corners(ox, oy, def.w, def.d);
  const h = def.height;

  drawBlock(g, c, h, { left: p.wallDark, right: p.wall, top: p.wall });

  // stone foundation
  faceRect(g, c.w, c.s, h, 0, 1, 0, 0.12, p.base);
  faceRect(g, c.s, c.e, h, 0, 1, 0, 0.12, shade(p.base, 0.12));

  // door on the left-front wall
  faceRect(g, c.w, c.s, h, 0.38, 0.63, 0.05, 0.68, p.door);
  faceRect(g, c.w, c.s, h, 0.57, 0.6, 0.3, 0.38, shade(p.window, 0.2));

  // windows on the right-front wall
  faceRect(g, c.s, c.e, h, 0.2, 0.36, 0.42, 0.74, p.window);
  faceRect(g, c.s, c.e, h, 0.62, 0.78, 0.42, 0.74, p.window);

  // roof (hipped, with a small overhang)
  const over = 0.45;
  const rc = corners(ox, oy, def.w + over, def.d + over);
  const apex = { x: ox, y: oy - h - (def.roofHeight ?? 10) };
  poly(g, [up(rc.w, h), up(rc.n, h), apex], p.roofDark);
  poly(g, [up(rc.n, h), up(rc.e, h), apex], p.roofDark);
  poly(g, [up(rc.w, h), up(rc.s, h), apex], p.roof);
  poly(g, [up(rc.s, h), up(rc.e, h), apex], p.roofLight ?? p.roof);
  // ridge highlight
  poly(g, [up(rc.s, h), apex, { x: apex.x + 1, y: apex.y + 1 }], shade(p.roofLight ?? p.roof, 0.25));
}

function buildFountainArt(g, ox, oy, def) {
  const p = def.palette;
  const baseH = 6;
  drawBlock(g, corners(ox, oy, def.w, def.d), baseH, {
    left: p.stoneDark, right: p.stone, top: p.stone
  });
  const inner = corners(ox, oy - baseH, def.w - 0.55, def.d - 0.55);
  poly(g, [inner.n, inner.e, inner.s, inner.w], p.water);
  poly(g, [inner.n, inner.e, { x: inner.e.x - 4, y: inner.e.y - 2 }, { x: inner.n.x + 2, y: inner.n.y + 2 }], p.waterLight);

  const pillar = corners(ox, oy - baseH, 0.55, 0.55);
  drawBlock(g, pillar, 8, { left: p.stoneDark, right: p.stone, top: shade(p.stone, 0.2) });
  px(g, ox - 1, oy - baseH - 12, 2, 4, p.waterLight);
}

function buildWellArt(g, ox, oy, def) {
  const p = def.palette;
  const baseH = 7;
  drawBlock(g, corners(ox, oy, 1, 1), baseH, { left: p.stoneDark, right: p.stone, top: p.stone });
  const inner = corners(ox, oy - baseH, 0.6, 0.6);
  poly(g, [inner.n, inner.e, inner.s, inner.w], p.water);

  px(g, ox - 7, oy - baseH - 10, 2, 10, p.wood);
  px(g, ox + 5, oy - baseH - 10, 2, 10, p.wood);
  poly(g, [
    { x: ox - 10, y: oy - baseH - 10 },
    { x: ox + 10, y: oy - baseH - 10 },
    { x: ox, y: oy - baseH - 17 }
  ], p.roof);
}

function buildBoardArt(g, ox, oy, def) {
  const p = def.palette;
  px(g, ox - 7, oy - 10, 2, 10, p.woodDark);
  px(g, ox + 5, oy - 10, 2, 10, p.woodDark);
  px(g, ox - 9, oy - 17, 18, 9, p.wood);
  px(g, ox - 9, oy - 17, 18, 1, shade(p.wood, 0.25));
  px(g, ox - 6, oy - 15, 5, 5, p.paper);
  px(g, ox + 1, oy - 14, 4, 4, p.paper);
  px(g, ox - 4, oy - 15, 1, 1, p.pin);
  px(g, ox + 2, oy - 14, 1, 1, p.pin);
}

function buildPadArt(g, ox, oy, def) {
  const p = def.palette;
  const outer = corners(ox, oy, def.w, def.d);
  poly(g, [outer.n, outer.e, outer.s, outer.w], p.stone);
  const mid = corners(ox, oy, def.w - 0.5, def.d - 0.5);
  poly(g, [mid.n, mid.e, mid.s, mid.w], shade(p.stone, -0.2));
  const inner = corners(ox, oy, def.w - 1.1, def.d - 1.1);
  poly(g, [inner.n, inner.e, inner.s, inner.w], p.rune);
  const core = corners(ox, oy, def.w - 1.5, def.d - 1.5);
  poly(g, [core.n, core.e, core.s, core.w], p.glow);
}

function buildLampArt(g, ox, oy, def) {
  const p = def.palette;
  px(g, ox - 1, oy - def.height, 2, def.height, p.post);
  px(g, ox - 3, oy - 2, 6, 2, p.metal);
  px(g, ox - 3, oy - def.height - 1, 6, 6, p.metal);
  px(g, ox - 2, oy - def.height, 4, 4, p.glow);
  g.globalAlpha = 0.25;
  g.fillStyle = p.glow;
  g.beginPath();
  g.arc(ox, oy - def.height + 2, 7, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
}

function buildTreeArt(g, ox, oy, def) {
  const p = def.palette;
  const trunkH = Math.round(def.height * 0.34);
  px(g, ox - 2, oy - trunkH, 4, trunkH, p.trunk);
  px(g, ox - 2, oy - trunkH, 1, trunkH, p.trunkLight);

  const cy = oy - trunkH - Math.round(def.height * 0.26);
  const blobs = [
    [0, 0, 10, p.leaf],
    [-6, 3, 7, p.leafDark],
    [6, 3, 7, p.leafDark],
    [0, -7, 8, p.leaf],
    [-3, -3, 6, p.leafLight],
    [3, 1, 5, p.leafLight]
  ];
  for (const [dx, dy, r, color] of blobs) {
    g.fillStyle = color;
    g.beginPath();
    g.arc(ox + dx, cy + dy, r, 0, Math.PI * 2);
    g.fill();
  }
}

function buildRockArt(g, ox, oy, def) {
  const p = def.palette;
  poly(g, [
    { x: ox - 11, y: oy + 2 }, { x: ox - 5, y: oy - 8 }, { x: ox + 4, y: oy - 9 },
    { x: ox + 11, y: oy + 1 }, { x: ox + 3, y: oy + 5 }, { x: ox - 5, y: oy + 5 }
  ], p.stone);
  poly(g, [{ x: ox - 5, y: oy - 8 }, { x: ox + 4, y: oy - 9 }, { x: ox + 1, y: oy - 3 }, { x: ox - 4, y: oy - 2 }], p.stoneLight);
  poly(g, [{ x: ox - 11, y: oy + 2 }, { x: ox - 5, y: oy + 5 }, { x: ox + 3, y: oy + 5 }, { x: ox + 11, y: oy + 1 }], p.stoneDark);
}

function buildPillarArt(g, ox, oy, def) {
  const p = def.palette;
  drawBlock(g, corners(ox, oy, 0.85, 0.85), def.height, {
    left: p.stoneDark, right: p.stone, top: shade(p.stone, 0.15)
  });
  px(g, ox - 2, oy - def.height - 4, 4, 4, p.glow);
  g.globalAlpha = 0.22;
  g.fillStyle = p.glow;
  g.beginPath();
  g.arc(ox, oy - def.height - 2, 7, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
}

function buildCrateArt(g, ox, oy, def) {
  const p = def.palette;
  const c = corners(ox, oy, 0.8, 0.8);
  drawBlock(g, c, def.height, { left: p.bodyDark, right: p.body, top: shade(p.body, 0.18) });
  faceRect(g, c.s, c.e, def.height, 0.1, 0.9, 0.42, 0.52, p.edge);
  faceRect(g, c.w, c.s, def.height, 0.1, 0.9, 0.42, 0.52, shade(p.edge, -0.2));
}

function buildDummyArt(g, ox, oy, def) {
  const p = def.palette;
  px(g, ox - 1, oy - def.height, 2, def.height, p.post);
  px(g, ox - 6, oy - def.height + 6, 12, 2, p.post);
  g.fillStyle = p.straw;
  g.beginPath();
  g.arc(ox, oy - def.height + 4, 6, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = p.strawDark;
  g.beginPath();
  g.arc(ox + 2, oy - def.height + 6, 3, 0, Math.PI * 2);
  g.fill();
  px(g, ox - 6, oy - def.height + 8, 12, 2, p.band);
}

function buildFenceArt(g, ox, oy, def) {
  const p = def.palette;
  const dir = def.axis === 'y' ? { x: -HALF_W, y: HALF_H } : { x: HALF_W, y: HALF_H };
  const a = { x: ox - dir.x, y: oy - dir.y };
  const b = { x: ox + dir.x, y: oy + dir.y };
  const h = def.height;

  poly(g, [{ x: a.x, y: a.y - h + 2 }, { x: b.x, y: b.y - h + 2 }, { x: b.x, y: b.y - h + 4 }, { x: a.x, y: a.y - h + 4 }], p.wood);
  poly(g, [{ x: a.x, y: a.y - 3 }, { x: b.x, y: b.y - 3 }, { x: b.x, y: b.y - 1 }, { x: a.x, y: a.y - 1 }], p.woodDark);
  px(g, a.x - 1, a.y - h, 2, h, p.woodDark);
  px(g, b.x - 1, b.y - h, 2, h, p.wood);
}

function buildSignArt(g, ox, oy, def) {
  const p = def.palette;
  px(g, ox - 1, oy - def.height, 2, def.height, p.woodDark);
  px(g, ox - 8, oy - def.height, 16, 8, p.board);
  px(g, ox - 8, oy - def.height, 16, 1, shade(p.board, 0.25));
  px(g, ox - 6, oy - def.height + 3, 8, 1, p.text);
  px(g, ox - 6, oy - def.height + 5, 5, 1, p.text);
}

function buildHerbArt(g, ox, oy, def) {
  const p = def.palette;
  const blades = [[-4, 10, -6], [0, 13, 0], [4, 10, 6], [-2, 7, -3], [2, 8, 3]];
  for (const [dx, len, lean] of blades) {
    poly(g, [
      { x: ox + dx - 1, y: oy },
      { x: ox + dx + 1, y: oy },
      { x: ox + dx + lean, y: oy - len }
    ], dx % 2 === 0 ? p.leaf : p.leafLight);
  }
  px(g, ox - 3, oy - 9, 1, 1, p.glow);
  px(g, ox + 2, oy - 11, 1, 1, p.glow);
  px(g, ox, oy - 14, 1, 1, p.glow);
  px(g, ox - 1, oy - 2, 2, 2, p.stem);
}

function buildOreArt(g, ox, oy, def) {
  const p = def.palette;
  poly(g, [
    { x: ox - 10, y: oy + 2 }, { x: ox - 6, y: oy - 9 }, { x: ox + 2, y: oy - 13 },
    { x: ox + 9, y: oy - 4 }, { x: ox + 8, y: oy + 3 }, { x: ox - 3, y: oy + 5 }
  ], p.stone);
  poly(g, [{ x: ox - 6, y: oy - 9 }, { x: ox + 2, y: oy - 13 }, { x: ox + 1, y: oy - 6 }, { x: ox - 4, y: oy - 4 }], p.stoneLight);
  poly(g, [{ x: ox - 10, y: oy + 2 }, { x: ox - 3, y: oy + 5 }, { x: ox + 8, y: oy + 3 }, { x: ox + 5, y: oy + 5 }], p.stoneDark);
  px(g, ox - 3, oy - 7, 2, 2, p.vein);
  px(g, ox + 2, oy - 4, 2, 2, p.vein);
  px(g, ox - 1, oy - 2, 1, 1, p.veinLight);
  px(g, ox + 4, oy - 8, 1, 1, p.veinLight);
}

function buildCampfireArt(g, ox, oy, def) {
  const p = def.palette;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    px(g, ox + Math.cos(angle) * 9 - 1, oy + Math.sin(angle) * 4 - 1, 3, 3, p.stone);
  }
  poly(g, [{ x: ox - 7, y: oy - 1 }, { x: ox + 6, y: oy - 5 }, { x: ox + 7, y: oy - 3 }, { x: ox - 6, y: oy + 1 }], p.log);
  poly(g, [{ x: ox - 6, y: oy - 5 }, { x: ox + 7, y: oy - 1 }, { x: ox + 6, y: oy + 1 }, { x: ox - 7, y: oy - 3 }], p.logDark);

  poly(g, [{ x: ox, y: oy - 14 }, { x: ox + 5, y: oy - 4 }, { x: ox - 5, y: oy - 4 }], p.flame);
  poly(g, [{ x: ox, y: oy - 10 }, { x: ox + 3, y: oy - 4 }, { x: ox - 3, y: oy - 4 }], p.flameLight);
}

function buildRuinArt(g, ox, oy, def) {
  const p = def.palette;
  const c = corners(ox, oy, 0.7, 0.7);
  drawBlock(g, c, def.height, { left: p.stoneDark, right: p.stone, top: shade(p.stone, 0.18) });
  // broken top edge
  poly(g, [
    up(c.w, def.height), { x: ox - 3, y: oy - def.height - 4 }, { x: ox + 2, y: oy - def.height + 2 },
    up(c.e, def.height - 5)
  ], shade(p.stone, 0.1));
  px(g, ox - 5, oy - 8, 4, 2, p.moss);
  px(g, ox + 2, oy - 14, 3, 2, p.moss);
}

function circle(g, x, y, r, color) {
  g.fillStyle = color;
  g.beginPath();
  g.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
  g.fill();
}

function buildPineArt(g, ox, oy, def) {
  const p = def.palette;
  const h = def.height;
  px(g, ox - 1, oy - 7, 3, 7, p.trunk);
  // four stacked cones, widest at the bottom
  const layers = 4;
  for (let i = 0; i < layers; i++) {
    const t = i / layers;
    const baseY = oy - 5 - t * (h - 12);
    const half = Math.round(11 - i * 2.2);
    const tall = Math.round((h - 8) / layers + 6);
    poly(g, [{ x: ox - half, y: baseY }, { x: ox + half, y: baseY }, { x: ox, y: baseY - tall }], p.leafDark);
    poly(g, [{ x: ox - half + 2, y: baseY - 1 }, { x: ox + half - 3, y: baseY - 1 }, { x: ox, y: baseY - tall + 1 }], p.leaf);
    poly(g, [{ x: ox + 1, y: baseY - 2 }, { x: ox + half - 3, y: baseY - 2 }, { x: ox + 1, y: baseY - tall + 3 }], p.leafLight);
  }
}

function buildGreatTreeArt(g, ox, oy, def) {
  const p = def.palette;
  const h = def.height;
  // roots spreading over the footprint
  poly(g, [{ x: ox - 26, y: oy + 4 }, { x: ox - 8, y: oy - 10 }, { x: ox - 4, y: oy - 2 }], p.trunkDark);
  poly(g, [{ x: ox + 26, y: oy + 4 }, { x: ox + 8, y: oy - 10 }, { x: ox + 4, y: oy - 2 }], p.trunk);
  poly(g, [{ x: ox - 4, y: oy + 12 }, { x: ox - 6, y: oy - 8 }, { x: ox + 6, y: oy - 8 }, { x: ox + 4, y: oy + 12 }], p.trunkDark);
  // trunk
  const trunkTop = oy - Math.round(h * 0.45);
  poly(g, [{ x: ox - 11, y: oy - 2 }, { x: ox - 7, y: trunkTop }, { x: ox + 7, y: trunkTop }, { x: ox + 11, y: oy - 2 }], p.trunk);
  poly(g, [{ x: ox - 11, y: oy - 2 }, { x: ox - 7, y: trunkTop }, { x: ox - 2, y: trunkTop }, { x: ox - 4, y: oy - 2 }], p.trunkDark);
  px(g, ox + 3, trunkTop + 6, 2, Math.round(h * 0.3), p.trunkLight);
  // canopy
  const cy = oy - Math.round(h * 0.68);
  const blobs = [
    [0, 4, 26, p.leafDark], [-22, 8, 16, p.leafDark], [22, 8, 16, p.leafDark],
    [-14, -4, 18, p.leaf], [14, -4, 18, p.leaf], [0, -12, 20, p.leaf],
    [-8, -18, 12, p.leafLight], [10, -10, 11, p.leafLight], [-18, 2, 9, p.leafLight], [20, 4, 7, p.leafLight]
  ];
  for (const [dx, dy, r, color] of blobs) circle(g, ox + dx, cy + dy, r, color);
  // hanging lanterns
  for (const [dx, dy] of [[-24, 18], [-8, 24], [12, 22], [26, 16], [2, 10]]) {
    px(g, ox + dx, cy + dy - 3, 1, 3, p.trunkDark);
    px(g, ox + dx - 1, cy + dy, 3, 3, p.lantern);
  }
}

function buildBushArt(g, ox, oy, def) {
  const p = def.palette;
  circle(g, ox - 4, oy - 4, 5, p.leafDark);
  circle(g, ox + 4, oy - 4, 5, p.leafDark);
  circle(g, ox, oy - 7, 6, p.leaf);
  circle(g, ox - 2, oy - 9, 3, p.leafLight);
}

function buildStallArt(g, ox, oy, def) {
  const p = def.palette;
  const h = def.height;
  const c = corners(ox, oy, def.w * 0.8, def.d * 0.8);
  // counter
  drawBlock(g, corners(ox, oy, def.w * 0.7, def.d * 0.5), 7, { left: shade(p.table, -0.2), right: p.table, top: shade(p.table, 0.15) });
  px(g, ox - 6, oy - 10, 3, 2, p.goods);
  px(g, ox + 1, oy - 9, 3, 2, p.goods);
  px(g, ox + 5, oy - 11, 2, 2, shade(p.goods, 0.3));
  // posts
  for (const k of ['w', 's', 'e']) px(g, c[k].x - 1, c[k].y - h, 2, h, p.post);
  // striped awning
  const a = corners(ox, oy - h, def.w * 0.9, def.d * 0.9);
  poly(g, [a.n, a.e, a.s, a.w], p.cloth);
  for (let i = 0; i < 4; i++) {
    const u0 = i / 4;
    const u1 = u0 + 0.125;
    const lerp = (p0, p1, t) => ({ x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t });
    poly(g, [lerp(a.w, a.s, u0), lerp(a.w, a.s, u1), lerp(a.n, a.e, u1), lerp(a.n, a.e, u0)], p.clothLight);
  }
  poly(g, [a.w, a.s, { x: a.s.x, y: a.s.y + 3 }, { x: a.w.x, y: a.w.y + 3 }], shade(p.cloth, -0.25));
  poly(g, [a.s, a.e, { x: a.e.x, y: a.e.y + 3 }, { x: a.s.x, y: a.s.y + 3 }], shade(p.cloth, -0.1));
}

function buildForgeArt(g, ox, oy, def) {
  const p = def.palette;
  const c = corners(ox, oy, 0.9, 0.9);
  drawBlock(g, c, 12, { left: p.stoneDark, right: p.stone, top: shade(p.stone, 0.15) });
  faceRect(g, c.w, c.s, 12, 0.3, 0.75, 0.1, 0.65, p.fire);
  faceRect(g, c.w, c.s, 12, 0.4, 0.65, 0.1, 0.4, p.fireLight);
  drawBlock(g, corners(ox + 3, oy - 12, 0.35, 0.35), def.height - 12, { left: p.stoneDark, right: p.stone, top: '#222228' });
}

function buildTargetArt(g, ox, oy, def) {
  const p = def.palette;
  px(g, ox - 5, oy - 8, 2, 8, p.post);
  px(g, ox + 3, oy - 8, 2, 8, p.post);
  const cy = oy - def.height + 7;
  g.fillStyle = p.ring;
  g.beginPath();
  g.ellipse(ox, cy, 7, 8, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = p.red;
  g.beginPath();
  g.ellipse(ox, cy, 5, 6, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = p.ring;
  g.beginPath();
  g.ellipse(ox, cy, 3, 3.5, 0, 0, Math.PI * 2);
  g.fill();
  px(g, ox - 1, cy - 1, 2, 2, p.red);
}

function buildBarrierArt(g, ox, oy, def) {
  const p = def.palette;
  const h = def.height;
  px(g, ox - 9, oy - h, 2, h, p.woodDark);
  px(g, ox + 7, oy - h, 2, h, p.woodDark);
  poly(g, [{ x: ox - 10, y: oy - h + 2 }, { x: ox + 10, y: oy - h + 2 }, { x: ox + 10, y: oy - h + 6 }, { x: ox - 10, y: oy - h + 6 }], p.wood);
  for (let i = 0; i < 3; i++) px(g, ox - 8 + i * 6, oy - h + 2, 3, 4, p.stripe);
  poly(g, [{ x: ox - 9, y: oy - 2 }, { x: ox + 8, y: oy - h + 7 }, { x: ox + 9, y: oy - h + 8 }, { x: ox - 8, y: oy - 1 }], p.woodDark);
}

const PROP_ART = {
  building: buildBuildingArt,
  campfire: buildCampfireArt,
  ruin: buildRuinArt,
  herb: buildHerbArt,
  ore: buildOreArt,
  fountain: buildFountainArt,
  well: buildWellArt,
  board: buildBoardArt,
  pad: buildPadArt,
  lamp: buildLampArt,
  tree: buildTreeArt,
  rock: buildRockArt,
  pillar: buildPillarArt,
  crate: buildCrateArt,
  dummy: buildDummyArt,
  fence: buildFenceArt,
  sign: buildSignArt,
  pine: buildPineArt,
  great_tree: buildGreatTreeArt,
  bush: buildBushArt,
  stall: buildStallArt,
  forge: buildForgeArt,
  target: buildTargetArt,
  barrier: buildBarrierArt
};

function buildProp(def) {
  const margin = 14;
  const canvasW = (def.w + def.d) * HALF_W + margin * 2;
  const canvasH = (def.w + def.d) * HALF_H + def.height + (def.roofHeight ?? 0) + margin;
  const { canvas, g } = makeCanvas(canvasW, canvasH);

  const ox = canvasW / 2;
  const oy = canvasH - (def.w + def.d) * QUARTER_H - 2;

  const art = PROP_ART[def.art] || PROP_ART.crate;
  art(g, ox, oy, def);

  return { canvas, ax: ox, ay: oy };
}

export function getPropSprite(id) {
  return propSprites[id] || null;
}

// ---------------------------------------------------------------- raised tiles (cliffs)

const blockSprites = {};

function buildBlockTile(def, height, seed) {
  const b = def.block;
  const { canvas, g } = makeCanvas(TILE_W, TILE_H + height + 2);
  const ox = HALF_W;
  const oy = height + HALF_H;
  const c = corners(ox, oy, 1, 1);
  const rand = rng(seed);

  drawBlock(g, c, height, { left: b.left, right: b.right, top: b.top });

  // rock strata on the two visible sides
  for (let i = 0; i < 3; i++) {
    const v = 0.25 + i * 0.25 + (rand() - 0.5) * 0.1;
    faceRect(g, c.w, c.s, height, 0.05, 0.95, v, v + 0.06, shade(b.left, -0.18));
    faceRect(g, c.s, c.e, height, 0.05, 0.95, v, v + 0.06, shade(b.right, -0.15));
  }
  // lit top edge + a few speckles on the top face
  poly(g, [up(c.w, height), up(c.s, height), { x: c.s.x, y: c.s.y - height + 1 }, { x: c.w.x, y: c.w.y - height + 1 }], b.edge);
  poly(g, [up(c.s, height), up(c.e, height), { x: c.e.x, y: c.e.y - height + 1 }, { x: c.s.x, y: c.s.y - height + 1 }], b.edge);
  for (let i = 0; i < 10; i++) {
    const x = ox + Math.round((rand() - 0.5) * 20);
    const y = oy - height + Math.round((rand() - 0.5) * 8);
    px(g, x, y, 1, 1, rand() < 0.5 ? b.topLight : shade(b.top, -0.15));
  }

  return { canvas, ax: ox, ay: oy };
}

// variant picks one of the block heights (so cliff edges look rough, not flat).
export function getBlockSprite(id, variant = 0) {
  const list = blockSprites[id];
  if (!list) return null;
  return list[variant % list.length];
}

// ---------------------------------------------------------------- ground decorations

const decorSprites = {};
const DECOR_VARIANTS = 3;
const DECOR_RISE = 8; // decorations may stick up to 8px above the ground (crops)

function buildDecor(def, seed) {
  const { canvas, g } = makeCanvas(TILE_W, TILE_H + DECOR_RISE);
  const p = def.palette;
  const rand = rng(seed);
  const cx = HALF_W;
  const cy = HALF_H + DECOR_RISE;
  // random point inside the inner part of the diamond
  const spot = () => {
    const u = rand() - 0.5;
    const v = rand() - 0.5;
    return { x: Math.round(cx + (u - v) * 20), y: Math.round(cy + (u + v) * 10) };
  };

  if (def.art === 'tuft') {
    for (let i = 0; i < 4; i++) {
      const s = spot();
      px(g, s.x, s.y - 2, 1, 2, p.a);
      px(g, s.x + 1, s.y - 3, 1, 3, p.b);
      px(g, s.x + 2, s.y - 2, 1, 2, p.a);
    }
  } else if (def.art === 'flowers') {
    for (let i = 0; i < 5; i++) {
      const s = spot();
      px(g, s.x, s.y - 1, 1, 2, p.stem);
      px(g, s.x, s.y - 2, 1, 1, i % 2 ? p.a : p.b);
      px(g, s.x - 1, s.y - 2, 1, 1, p.a);
    }
  } else if (def.art === 'pebbles') {
    for (let i = 0; i < 4; i++) {
      const s = spot();
      px(g, s.x, s.y, 2, 1, p.a);
      px(g, s.x, s.y + 1, 2, 1, p.b);
    }
  } else if (def.art === 'mushroom') {
    for (let i = 0; i < 2; i++) {
      const s = spot();
      px(g, s.x, s.y - 1, 1, 2, p.b);
      px(g, s.x - 1, s.y - 3, 3, 2, p.a);
      px(g, s.x, s.y - 3, 1, 1, p.b);
    }
  } else if (def.art === 'crop') {
    // stalks laid out in rows along world X, matching the farmland furrows
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 5; k++) {
        const u = (row + 0.6) / 4 - 0.5;
        const v = (k + 0.5) / 5 - 0.5;
        const x = Math.round(cx + (u - v) * 30);
        const y = Math.round(cy + (u + v) * 15);
        const tall = 3 + Math.floor(rand() * 4);
        px(g, x, y - tall, 1, tall, p.stem);
        px(g, x, y - tall - 1, 1, 2, rand() < 0.5 ? p.a : p.b);
      }
    }
  }

  return { canvas, ax: cx, ay: cy };
}

export function getDecorSprite(id, variant = 0) {
  const list = decorSprites[id];
  if (!list) return null;
  return list[variant % list.length];
}

let worldSpritesBuilt = false;

export function buildWorldSprites() {
  if (worldSpritesBuilt) return;
  worldSpritesBuilt = true;

  for (const [id, def] of Object.entries(TILE_DEFS)) {
    const frames = [];
    const count = def.frames ?? 1;
    for (let f = 0; f < count; f++) frames.push(buildTileFrame(def, hashString(id) + f * 7919));
    tileSprites[id] = { frames, speed: def.animSpeed ?? 0 };

    if (def.block) {
      blockSprites[id] = def.block.heights.map((height, i) => buildBlockTile(def, height, hashString(id) + i * 104729));
    }
  }
  for (const [id, def] of Object.entries(DECOR_DEFS)) {
    decorSprites[id] = [];
    for (let v = 0; v < DECOR_VARIANTS; v++) decorSprites[id].push(buildDecor(def, hashString(id) + v * 7919));
  }
  for (const [id, def] of Object.entries(PROP_DEFS)) {
    propSprites[id] = buildProp(def);
  }
}

// ---------------------------------------------------------------- characters

export const FRAME_W = 20;
export const FRAME_H = 32;
const FEET_X = 10;
const FEET_Y = 30;
const DIR_ROW = { s: 0, w: 1, e: 2, n: 3 };
export const WALK_FRAMES = 4;

function drawKit(g, kit, ox, bodyTop, side, accent, cloth) {
  if (kit === 'shield') {
    const x = side > 0 ? ox + 5 : ox - 10;
    px(g, x, bodyTop, 5, 10, shade(accent, -0.4));
    px(g, x + 1, bodyTop + 1, 3, 8, accent);
    px(g, x + 2, bodyTop + 4, 1, 2, shade(cloth, 0.3));
  } else if (kit === 'blade') {
    const x = side > 0 ? ox - 9 : ox + 7;
    px(g, x, bodyTop - 7, 2, 13, '#c9cdd9');
    px(g, x, bodyTop - 7, 1, 13, '#eef1f7');
    px(g, x - 1, bodyTop + 5, 4, 1, '#8a7a4a');
    px(g, x, bodyTop + 6, 2, 3, '#5a4429');
  } else if (kit === 'staff') {
    const x = side > 0 ? ox - 9 : ox + 7;
    px(g, x, bodyTop - 7, 2, 16, '#6b4f33');
    px(g, x - 1, bodyTop - 10, 4, 4, shade(accent, 0.35));
    px(g, x, bodyTop - 9, 2, 2, '#ffffff');
  }
}

export function drawCharacterFrame(g, look, dir, frame, ox, oy) {
  const back = dir === 'n';
  const skin = look.skin || '#e7b18b';
  const hair = look.hair || '#2f2118';
  const cloth = look.cloth || '#6b7a8f';
  const accent = look.accent || '#c3cbdd';
  const clothDark = shade(cloth, -0.32);
  const clothLight = shade(cloth, 0.2);
  const pants = '#2e2a36';
  const boots = '#1c1a24';

  const bob = frame === 1 || frame === 3 ? -1 : 0;
  const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;

  // legs
  for (const [lx, off] of [[-4, step], [1, -step]]) {
    const top = oy - 8 + Math.max(0, off);
    const h = 8 - Math.abs(off);
    px(g, ox + lx, top, 3, h, pants);
    px(g, ox + lx, top + h - 2, 3, 2, boots);
  }

  const bodyTop = oy - 18 + bob;
  const headTop = oy - 26 + bob;

  // arms behind the body
  px(g, ox - 7, bodyTop + 1, 2, 7, clothDark);
  px(g, ox + 5, bodyTop + 1, 2, 7, clothDark);
  px(g, ox - 7, bodyTop + 7, 2, 2, skin);
  px(g, ox + 5, bodyTop + 7, 2, 2, skin);

  // torso
  px(g, ox - 5, bodyTop, 10, 10, cloth);
  px(g, ox - 5, bodyTop, 10, 2, clothLight);
  px(g, ox - 5, bodyTop + 2, 2, 5, clothDark);
  px(g, ox - 5, bodyTop + 7, 10, 2, accent);

  // head
  px(g, ox - 4, headTop, 8, 8, skin);

  const style = look.hairStyle || 'short';
  if (style === 'bald') {
    px(g, ox - 4, headTop, 8, 1, shade(skin, -0.18));
  } else if (style === 'hood') {
    px(g, ox - 5, headTop - 1, 10, 6, clothDark);
    px(g, ox - 5, headTop + 5, 10, 3, cloth);
    if (!back) px(g, ox - 3, headTop + 3, 6, 3, shade(skin, -0.45));
  } else {
    px(g, ox - 4, headTop, 8, 3, hair);
    px(g, ox - 4, headTop + 3, 1, 2, hair);
    px(g, ox + 3, headTop + 3, 1, 2, hair);
    if (style === 'long') {
      px(g, ox - 5, headTop + 1, 1, 8, hair);
      px(g, ox + 4, headTop + 1, 1, 8, hair);
      if (back) px(g, ox - 4, headTop, 8, 9, hair);
    } else if (style === 'ponytail') {
      px(g, ox + (back ? -2 : 3), headTop + 2, 2, 7, hair);
    } else if (style === 'braid') {
      px(g, ox - 5, headTop + 2, 1, 6, hair);
      px(g, ox + 4, headTop + 2, 1, 6, hair);
      px(g, ox + (back ? -1 : 3), headTop + 7, 2, 4, hair);
    }
  }

  // face
  if (!back && style !== 'hood') {
    const eye = '#20202c';
    if (dir === 's') {
      px(g, ox - 2, headTop + 4, 1, 2, eye);
      px(g, ox + 1, headTop + 4, 1, 2, eye);
    } else if (dir === 'e') {
      px(g, ox + 1, headTop + 4, 1, 2, eye);
    } else if (dir === 'w') {
      px(g, ox - 2, headTop + 4, 1, 2, eye);
    }
  }

  const shieldSide = dir === 'w' || dir === 'n' ? 1 : -1;
  drawKit(g, look.kit, ox, bodyTop, shieldSide, accent, cloth);
}

export function buildCharacterSheet(look) {
  const dirs = Object.keys(DIR_ROW);
  const { canvas, g } = makeCanvas(FRAME_W * WALK_FRAMES, FRAME_H * dirs.length);
  for (const dir of dirs) {
    for (let frame = 0; frame < WALK_FRAMES; frame++) {
      const ox = frame * FRAME_W + FEET_X;
      const oy = DIR_ROW[dir] * FRAME_H + FEET_Y;
      drawCharacterFrame(g, look, dir, frame, ox, oy);
    }
  }
  return { canvas, frameW: FRAME_W, frameH: FRAME_H, feetX: FEET_X, feetY: FEET_Y };
}

export function drawSheetFrame(g, sheet, dir, frame, x, y) {
  const row = DIR_ROW[dir] ?? 0;
  const fw = sheet.frameW;
  const fh = sheet.frameH;
  g.drawImage(
    sheet.canvas,
    frame * fw, row * fh, fw, fh,
    Math.round(x - sheet.feetX), Math.round(y - sheet.feetY), fw, fh
  );
}

// ---------------------------------------------------------------- monsters

const MONSTER_W = 28;
const MONSTER_H = 30;
const MONSTER_FEET_X = 14;
const MONSTER_FEET_Y = 28;

function drawSlimeFrame(g, colors, dir, frame, ox, oy) {
  // squash and stretch across the 4 frames
  const squash = [0, 1, 2, 1][frame];
  const w = 20 + squash * 2;
  const h = 16 - squash * 2;
  const top = oy - h;

  g.fillStyle = colors.body;
  g.beginPath();
  g.ellipse(ox, top + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = colors.bodyDark;
  g.beginPath();
  g.ellipse(ox, top + h * 0.78, w / 2.4, h / 3.4, 0, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = colors.bodyLight;
  g.beginPath();
  g.ellipse(ox - w * 0.18, top + h * 0.3, w / 5, h / 5, 0, 0, Math.PI * 2);
  g.fill();

  if (dir !== 'n') {
    const shift = dir === 'e' ? 3 : dir === 'w' ? -3 : 0;
    px(g, ox - 5 + shift, top + Math.round(h * 0.38), 2, 3, colors.eye);
    px(g, ox + 3 + shift, top + Math.round(h * 0.38), 2, 3, colors.eye);
  }
}

function drawWraithFrame(g, colors, dir, frame, ox, oy) {
  const bob = [0, -1, 0, 1][frame];
  const top = oy - 26 + bob;

  // tattered lower body
  g.fillStyle = colors.bodyDark;
  g.beginPath();
  g.moveTo(ox - 8, top + 12);
  g.lineTo(ox + 8, top + 12);
  g.lineTo(ox + 6, oy - 1);
  g.lineTo(ox + 2, oy - 4 + (frame % 2));
  g.lineTo(ox - 2, oy - 1);
  g.lineTo(ox - 6, oy - 4 - (frame % 2));
  g.closePath();
  g.fill();

  // hooded torso
  g.fillStyle = colors.body;
  g.beginPath();
  g.moveTo(ox, top - 2);
  g.lineTo(ox + 9, top + 8);
  g.lineTo(ox + 7, top + 16);
  g.lineTo(ox - 7, top + 16);
  g.lineTo(ox - 9, top + 8);
  g.closePath();
  g.fill();

  g.fillStyle = colors.bodyLight;
  g.beginPath();
  g.moveTo(ox, top - 2);
  g.lineTo(ox + 9, top + 8);
  g.lineTo(ox + 4, top + 9);
  g.closePath();
  g.fill();

  if (dir !== 'n') {
    const shift = dir === 'e' ? 2 : dir === 'w' ? -2 : 0;
    px(g, ox - 4 + shift, top + 6, 2, 2, colors.eye);
    px(g, ox + 2 + shift, top + 6, 2, 2, colors.eye);
  }

  // arms
  px(g, ox - 11, top + 9, 2, 6, colors.bodyDark);
  px(g, ox + 9, top + 9, 2, 6, colors.bodyDark);
}

const MONSTER_BODIES = {
  slime: drawSlimeFrame,
  wraith: drawWraithFrame
};

export function buildMonsterSheet(def) {
  const dirs = Object.keys(DIR_ROW);
  const { canvas, g } = makeCanvas(MONSTER_W * WALK_FRAMES, MONSTER_H * dirs.length);
  const draw = MONSTER_BODIES[def.body] || MONSTER_BODIES.slime;

  for (const dir of dirs) {
    for (let frame = 0; frame < WALK_FRAMES; frame++) {
      const ox = frame * MONSTER_W + MONSTER_FEET_X;
      const oy = DIR_ROW[dir] * MONSTER_H + MONSTER_FEET_Y;
      draw(g, def.colors, dir, frame, ox, oy);
    }
  }
  return { canvas, frameW: MONSTER_W, frameH: MONSTER_H, feetX: MONSTER_FEET_X, feetY: MONSTER_FEET_Y };
}

export function drawShadow(g, x, y, radius = 6) {
  g.save();
  g.globalAlpha = 0.28;
  g.fillStyle = '#000000';
  g.beginPath();
  g.ellipse(Math.round(x), Math.round(y), radius, radius / 2, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

// ---------------------------------------------------------------- item icons

const ICON_SIZE = 16;
let iconBuffer = null;

const ICON_SHAPES = {
  leaf(g, c) {
    px(g, 7, 9, 2, 6, '#3a6b44');
    poly(g, [{ x: 8, y: 2 }, { x: 13, y: 7 }, { x: 8, y: 11 }, { x: 4, y: 6 }], c);
    poly(g, [{ x: 8, y: 3 }, { x: 11, y: 6 }, { x: 8, y: 8 }], shade(c, 0.3));
  },
  ore(g, c) {
    poly(g, [{ x: 3, y: 12 }, { x: 4, y: 5 }, { x: 9, y: 2 }, { x: 13, y: 7 }, { x: 12, y: 13 }], c);
    poly(g, [{ x: 4, y: 5 }, { x: 9, y: 2 }, { x: 9, y: 7 }, { x: 5, y: 8 }], shade(c, 0.3));
    px(g, 6, 9, 2, 2, '#d8b063');
    px(g, 9, 6, 2, 2, '#d8b063');
  },
  potion(g, c) {
    px(g, 6, 2, 4, 3, '#8a6a4a');
    px(g, 6, 5, 4, 1, shade(c, -0.4));
    poly(g, [{ x: 5, y: 6 }, { x: 11, y: 6 }, { x: 12, y: 13 }, { x: 4, y: 13 }], shade(c, -0.25));
    poly(g, [{ x: 5, y: 8 }, { x: 11, y: 8 }, { x: 11, y: 12 }, { x: 5, y: 12 }], c);
    px(g, 6, 9, 1, 2, shade(c, 0.5));
  },
  sword(g, c) {
    px(g, 7, 2, 2, 9, c);
    px(g, 7, 2, 1, 9, shade(c, 0.4));
    px(g, 4, 11, 8, 1, '#8a7a4a');
    px(g, 7, 12, 2, 3, '#5a4429');
  },
  mace(g, c) {
    px(g, 7, 9, 2, 6, '#5a4429');
    poly(g, [{ x: 8, y: 1 }, { x: 12, y: 5 }, { x: 8, y: 9 }, { x: 4, y: 5 }], c);
    poly(g, [{ x: 8, y: 2 }, { x: 10, y: 4 }, { x: 8, y: 6 }, { x: 6, y: 4 }], shade(c, 0.3));
  },
  staff(g, c) {
    px(g, 7, 5, 2, 10, '#6b4f33');
    poly(g, [{ x: 8, y: 1 }, { x: 12, y: 5 }, { x: 8, y: 8 }, { x: 4, y: 5 }], c);
    px(g, 7, 4, 2, 2, '#ffffff');
  },
  armor(g, c) {
    poly(g, [{ x: 4, y: 3 }, { x: 7, y: 2 }, { x: 9, y: 2 }, { x: 12, y: 3 }, { x: 12, y: 12 }, { x: 4, y: 12 }], c);
    poly(g, [{ x: 4, y: 3 }, { x: 7, y: 2 }, { x: 8, y: 6 }, { x: 5, y: 7 }], shade(c, 0.28));
    px(g, 7, 6, 2, 6, shade(c, -0.35));
  },
  ring(g, c) {
    g.fillStyle = shade(c, -0.1);
    g.beginPath();
    g.arc(8, 10, 5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0d0d1a';
    g.beginPath();
    g.arc(8, 10, 3, 0, Math.PI * 2);
    g.fill();
    poly(g, [{ x: 8, y: 1 }, { x: 11, y: 4 }, { x: 8, y: 7 }, { x: 5, y: 4 }], shade(c, 0.4));
  },
  relic(g, c) {
    poly(g, [{ x: 8, y: 1 }, { x: 12, y: 8 }, { x: 8, y: 14 }, { x: 4, y: 8 }], c);
    poly(g, [{ x: 8, y: 3 }, { x: 10, y: 8 }, { x: 8, y: 11 }, { x: 6, y: 8 }], shade(c, 0.4));
    px(g, 7, 6, 1, 3, '#ffffff');
  }
};

export function renderItemIcon(canvas, itemDef, scale = 2) {
  if (!iconBuffer) iconBuffer = makeCanvas(ICON_SIZE, ICON_SIZE);
  const { canvas: src, g: sg } = iconBuffer;
  sg.clearRect(0, 0, ICON_SIZE, ICON_SIZE);

  const shape = ICON_SHAPES[itemDef?.icon?.shape] || ICON_SHAPES.relic;
  shape(sg, itemDef?.icon?.color || '#b8b8c8');

  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.drawImage(
    src, 0, 0, ICON_SIZE, ICON_SIZE,
    Math.round((canvas.width - ICON_SIZE * scale) / 2),
    Math.round((canvas.height - ICON_SIZE * scale) / 2),
    ICON_SIZE * scale, ICON_SIZE * scale
  );
}

let portraitBuffer = null;

export function renderCharacterPortrait(canvas, look, { scale = 3, dir = 's', frame = 0 } = {}) {
  if (!portraitBuffer) portraitBuffer = makeCanvas(FRAME_W, FRAME_H);
  const { canvas: src, g: sg } = portraitBuffer;
  sg.clearRect(0, 0, FRAME_W, FRAME_H);
  drawCharacterFrame(sg, look, dir, frame, FEET_X, FEET_Y);

  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.drawImage(
    src, 0, 0, FRAME_W, FRAME_H,
    Math.round((canvas.width - FRAME_W * scale) / 2),
    Math.round((canvas.height - FRAME_H * scale) / 2),
    FRAME_W * scale, FRAME_H * scale
  );
}
