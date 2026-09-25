// Map builder:  npm run maps          (all maps)
//               npm run maps -- lumina-village
//
// Reads each map source in tools/map-src/<id>.mjs (written in MAP IMAGE PIXELS,
// so coordinates can be read straight off the painting), then:
//   1. copies the painting to assets/maps/<id>.png (what the game shows)
//   2. builds the collision grid:
//        a. automatic guess from colors (water, dense forest)   - optional per map
//        b. cleanup: removes speckles, fills small holes
//        c. hand-drawn shapes, applied in order (last one wins)
//   3. converts spawn / exits / NPCs / monsters ... from pixels to tiles
//   4. writes client/data/maps/<id>.json   (what the game loads)
//   5. writes tools/out/<id>-collision.png (the painting with collision + markers on top,
//      for checking by eye) and prints what cannot be reached on foot.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readPng, writePng, createImage } from './lib/png.mjs';
import { encodeCollision, COLLISION_DEBUG_COLORS } from '../client/collision/collision-system.js';
import { TILE_SIZE } from '../client/core/projection.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'tools', 'map-src');
const OUT_DIR = path.join(ROOT, 'tools', 'out');

// ------------------------------------------------------------------ color statistics

function cellStats(img, cellPx, cols, rows) {
  const stats = new Array(cols * rows);
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let l2 = 0;
      const n = cellPx * cellPx;
      for (let y = 0; y < cellPx; y++) {
        for (let x = 0; x < cellPx; x++) {
          const k = ((cy * cellPx + y) * img.width + cx * cellPx + x) * 4;
          r += img.data[k];
          g += img.data[k + 1];
          b += img.data[k + 2];
          const l = (img.data[k] + img.data[k + 1] + img.data[k + 2]) / 3;
          l2 += l * l;
        }
      }
      r /= n;
      g /= n;
      b /= n;
      const L = (r + g + b) / 3;
      stats[cy * cols + cx] = {
        r, g, b, L,
        sat: Math.max(r, g, b) - Math.min(r, g, b),
        contrast: Math.sqrt(Math.max(0, l2 / n - L * L))
      };
    }
  }
  return stats;
}

// Majority filter for one code: a cell becomes `code` when at least `keep` of the
// 9 cells around it (itself included) are `code`, and stops being it otherwise.
// Removes single-cell noise and closes tiny gaps, so the automatic guess is smooth.
function smooth(grid, cols, rows, code, keep = 5, passes = 1) {
  for (let p = 0; p < passes; p++) {
    const copy = grid.slice();
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const x = Math.min(cols - 1, Math.max(0, cx + dx));
            const y = Math.min(rows - 1, Math.max(0, cy + dy));
            if (copy[y * cols + x] === code) count++;
          }
        }
        const i = cy * cols + cx;
        if (count >= keep) grid[i] = code;
        else if (copy[i] === code) grid[i] = 0;
      }
    }
  }
}

// ------------------------------------------------------------------ shapes (pixels)

function pointInPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

// Does the shape cover the point (the center of a collision cell)?
function shapeCovers(shape, x, y) {
  if (shape.rect) {
    const [rx, ry, rw, rh] = shape.rect;
    return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
  }
  if (shape.poly) return pointInPolygon(x, y, shape.poly);
  if (shape.circle) {
    const [cx, cy, r] = shape.circle;
    return Math.hypot(x - cx, y - cy) <= r;
  }
  if (shape.ellipse) {
    const [cx, cy, rx, ry] = shape.ellipse;
    return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  }
  if (shape.line) {
    const r = (shape.width ?? 8) / 2;
    for (let i = 0; i < shape.line.length - 1; i++) {
      const [ax, ay] = shape.line[i];
      const [bx, by] = shape.line[i + 1];
      if (distToSegment(x, y, ax, ay, bx, by) <= r) return true;
    }
    return false;
  }
  throw new Error(`unknown shape ${JSON.stringify(shape)}`);
}

function applyShape(grid, cols, rows, cellPx, shape) {
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const x = cx * cellPx + cellPx / 2;
      const y = cy * cellPx + cellPx / 2;
      if (!shapeCovers(shape, x, y)) continue;
      const i = cy * cols + cx;
      // `onlyOver`: e.g. make water walkable only where it is currently water (bridges)
      if (shape.onlyOver !== undefined && grid[i] !== shape.onlyOver) continue;
      grid[i] = shape.code;
    }
  }
}

// ------------------------------------------------------------------ helpers

const toTiles = (px) => Math.round((px / TILE_SIZE) * 100) / 100;

function convertPoint(p) {
  return { tx: toTiles(p[0]), ty: toTiles(p[1]) };
}

function reachable(grid, cols, rows, start) {
  const seen = new Uint8Array(cols * rows);
  const stack = [start];
  if (grid[start[1] * cols + start[0]] !== 0) return seen;
  seen[start[1] * cols + start[0]] = 1;
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const i = ny * cols + nx;
      if (seen[i] || grid[i] !== 0) continue;
      seen[i] = 1;
      stack.push([nx, ny]);
    }
  }
  return seen;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ------------------------------------------------------------------ build one map

async function buildMap(id) {
  const src = (await import(pathToFileURL(path.join(SRC_DIR, `${id}.mjs`)).href)).default;
  const sourceFile = path.join(ROOT, src.source);
  const img = readPng(sourceFile);
  if (img.width % TILE_SIZE || img.height % TILE_SIZE) {
    throw new Error(`${id}: image ${img.width}x${img.height} is not a multiple of ${TILE_SIZE}px`);
  }

  const cellsPerTile = src.cellsPerTile ?? 2;
  const cellPx = TILE_SIZE / cellsPerTile;
  const cols = img.width / cellPx;
  const rows = img.height / cellPx;
  const grid = new Uint8Array(cols * rows);

  // a. automatic guess
  if (src.classify) {
    const stats = cellStats(img, cellPx, cols, rows);
    for (let i = 0; i < grid.length; i++) grid[i] = src.classify(stats[i]) ?? 0;
  }
  // b. cleanup
  for (const s of src.smooth || []) smooth(grid, cols, rows, s.code, s.keep ?? 5, s.passes ?? 1);
  // c. hand-drawn shapes
  for (const shape of src.shapes || []) applyShape(grid, cols, rows, cellPx, shape);
  // the outermost ring is always solid, so nothing can walk off the picture
  for (let cx = 0; cx < cols; cx++) {
    if (grid[cx] === 0) grid[cx] = 1;
    if (grid[(rows - 1) * cols + cx] === 0) grid[(rows - 1) * cols + cx] = 1;
  }
  for (let cy = 0; cy < rows; cy++) {
    if (grid[cy * cols] === 0) grid[cy * cols] = 1;
    if (grid[cy * cols + cols - 1] === 0) grid[cy * cols + cols - 1] = 1;
  }
  // exits may sit on the edge ring - open them again
  for (const e of src.exits || []) applyShape(grid, cols, rows, cellPx, { rect: e.rect, code: 0 });

  // copy the painting for the game
  const imageRel = `assets/maps/${id}.png`;
  fs.mkdirSync(path.join(ROOT, 'assets', 'maps'), { recursive: true });
  fs.copyFileSync(sourceFile, path.join(ROOT, imageRel));

  const data = {
    id,
    name: src.name,
    safeZone: !!src.safeZone,
    image: imageRel,
    tileSize: TILE_SIZE,
    width: img.width / TILE_SIZE,
    height: img.height / TILE_SIZE,
    background: src.background || '#06060e',
    spawns: Object.fromEntries(Object.entries(src.spawns).map(([name, p]) => [name, convertPoint(p)])),
    collision: { cols, rows, cellsPerTile, rle: encodeCollision(grid) },
    exits: (src.exits || []).map((e) => ({
      id: e.id, tx: toTiles(e.rect[0]), ty: toTiles(e.rect[1]), w: toTiles(e.rect[2]), d: toTiles(e.rect[3]),
      to: e.to, spawn: e.spawn || 'default', label: e.label
    })),
    npcs: (src.npcs || []).map(({ at, ...npc }) => ({ ...npc, ...convertPoint(at) })),
    gatherNodes: (src.gatherNodes || []).map(({ at, ...node }) => ({ ...node, ...convertPoint(at) })),
    monsterSpawns: (src.monsterSpawns || []).map(({ at, ...m }) => ({ ...m, ...convertPoint(at) })),
    objects: (src.objects || []).map(({ at, ...o }) => ({ ...o, ...convertPoint(at) })),
    ambient: (src.ambient || []).map(({ at, ...a }) => ({ ...a, ...convertPoint(at) })),
    labels: (src.labels || []).map(({ at, ...l }) => ({ ...l, ...convertPoint(at) }))
  };
  const jsonFile = path.join(ROOT, 'client', 'data', 'maps', `${id}.json`);
  fs.writeFileSync(jsonFile, `${JSON.stringify(data, null, 1)}\n`);

  // ---- report: what can be reached from the spawn
  const cellOf = (p) => [Math.floor(p[0] / cellPx), Math.floor(p[1] / cellPx)];
  const seen = reachable(grid, cols, rows, cellOf(src.spawns.default));
  const nearReachable = (p, rangePx) => {
    const [cx, cy] = cellOf(p);
    const r = Math.ceil(rangePx / cellPx);
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        if (seen[y * cols + x] && Math.hypot((x + 0.5) * cellPx - p[0], (y + 0.5) * cellPx - p[1]) <= rangePx) return true;
      }
    }
    return false;
  };
  // Same test the game uses: the whole body box (radius in pixels) must be on walkable cells.
  const canStand = (p, radiusPx) => {
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = Math.floor((p[0] + dx * radiusPx) / cellPx);
      const cy = Math.floor((p[1] + dy * radiusPx) / cellPx);
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows || grid[cy * cols + cx] !== 0) return false;
    }
    return true;
  };
  const problems = [];
  if (!seen.some(Boolean)) problems.push('spawn is not on a walkable cell');
  for (const [name, p] of Object.entries(src.spawns)) {
    if (!canStand(p, 5)) problems.push(`player cannot stand on spawn "${name}"`);
    else if (!nearReachable(p, 8)) problems.push(`spawn "${name}" is cut off from the default spawn`);
    const inExit = (src.exits || []).find((e) => p[0] >= e.rect[0] && p[0] <= e.rect[0] + e.rect[2] && p[1] >= e.rect[1] && p[1] <= e.rect[1] + e.rect[3]);
    if (inExit) problems.push(`spawn "${name}" is inside exit ${inExit.id} (players would bounce straight back)`);
  }
  for (const n of src.npcs || []) {
    if (!nearReachable(n.at, 24)) problems.push(`NPC ${n.id} cannot be reached`);
    if ((!n.kind || n.kind === 'person') && !canStand(n.at, 4)) problems.push(`NPC ${n.id} stands inside something`);
  }
  for (const n of src.gatherNodes || []) if (!nearReachable(n.at, 24)) problems.push(`resource ${n.id} cannot be reached`);
  for (const m of src.monsterSpawns || []) {
    if (!nearReachable(m.at, 8)) problems.push(`monster ${m.id} spawns off the walkable area`);
    else if (!canStand(m.at, 5)) problems.push(`monster ${m.id} spawns touching a wall (move it a little)`);
  }
  for (const p of src.exits || []) {
    const center = [p.rect[0] + p.rect[2] / 2, p.rect[1] + p.rect[3] / 2];
    if (!nearReachable(center, Math.max(p.rect[2], p.rect[3]))) problems.push(`exit to ${p.to} cannot be reached`);
  }
  const walkable = grid.reduce((n, c) => n + (c === 0 ? 1 : 0), 0);
  const reached = seen.reduce((n, v) => n + v, 0);

  // ---- preview image
  const preview = createImage(img.width, img.height);
  const colors = Object.fromEntries(Object.entries(COLLISION_DEBUG_COLORS).map(([k, v]) => [k, hexToRgb(v)]));
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const k = (y * img.width + x) * 4;
      const cell = Math.floor(y / cellPx) * cols + Math.floor(x / cellPx);
      const code = grid[cell];
      let [r, g, b] = [img.data[k], img.data[k + 1], img.data[k + 2]];
      if (code !== 0) {
        const c = colors[code] || [255, 255, 255];
        r = (r * 0.45 + c[0] * 0.55) | 0;
        g = (g * 0.45 + c[1] * 0.55) | 0;
        b = (b * 0.45 + c[2] * 0.55) | 0;
      } else if (!seen[cell]) {
        r = (r * 0.6) | 0; // walkable but unreachable: darkened
        g = (g * 0.6) | 0;
        b = (b * 0.6) | 0;
      }
      preview.data[k] = r;
      preview.data[k + 1] = g;
      preview.data[k + 2] = b;
      preview.data[k + 3] = 255;
    }
  }
  const mark = (p, color, size = 3) => {
    for (let y = -size; y <= size; y++) {
      for (let x = -size; x <= size; x++) {
        const px = Math.round(p[0]) + x;
        const py = Math.round(p[1]) + y;
        if (px < 0 || py < 0 || px >= img.width || py >= img.height) continue;
        const k = (py * img.width + px) * 4;
        const edge = Math.abs(x) === size || Math.abs(y) === size;
        const c = edge ? [0, 0, 0] : color;
        preview.data[k] = c[0];
        preview.data[k + 1] = c[1];
        preview.data[k + 2] = c[2];
      }
    }
  };
  for (const p of Object.values(src.spawns)) mark(p, [60, 255, 90], 5);
  for (const p of src.exits || []) mark([p.rect[0] + p.rect[2] / 2, p.rect[1] + p.rect[3] / 2], [255, 60, 255], 5);
  for (const n of src.npcs || []) mark(n.at, [255, 255, 255]);
  for (const n of src.gatherNodes || []) mark(n.at, [255, 230, 80]);
  for (const m of src.monsterSpawns || []) mark(m.at, [255, 40, 40]);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  writePng(path.join(OUT_DIR, `${id}-collision.png`), preview);

  console.log(`${id}: ${data.width}x${data.height} tiles, ${cols}x${rows} collision cells`);
  console.log(`  walkable ${walkable} cells, reachable from spawn ${reached} (${Math.round((reached / Math.max(1, walkable)) * 100)}%)`);
  console.log(`  -> ${path.relative(ROOT, jsonFile)}, ${imageRel}, tools/out/${id}-collision.png`);
  for (const p of problems) console.log(`  PROBLEM: ${p}`);
  return problems.length;
}

const only = process.argv.slice(2);
const ids = only.length ? only : fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.mjs')).map((f) => f.replace(/\.mjs$/, ''));
let problemCount = 0;
for (const id of ids) problemCount += await buildMap(id);

// Links between maps: every exit must point at a map that exists and a spawn that
// exists in that map. Checked across ALL map sources, even when building just one.
const allIds = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.mjs')).map((f) => f.replace(/\.mjs$/, ''));
const sources = {};
for (const id of allIds) sources[id] = (await import(pathToFileURL(path.join(SRC_DIR, `${id}.mjs`)).href)).default;
// isometric maps (tools/iso-map-src) can be exit targets too
const ISO_SRC_DIR = path.join(ROOT, 'tools', 'iso-map-src');
for (const file of fs.readdirSync(ISO_SRC_DIR).filter((n) => n.endsWith('.mjs'))) {
  const isoSrc = (await import(pathToFileURL(path.join(ISO_SRC_DIR, file)).href)).default;
  sources[isoSrc.id] = { ...isoSrc, exits: [] }; // their own exits are checked by the tests
}
const registry = fs.readFileSync(path.join(ROOT, 'client', 'data', 'maps.js'), 'utf8');
console.log('links between maps:');
for (const [id, src] of Object.entries(sources)) {
  if (!registry.includes(`'${id}'`)) {
    console.log(`  PROBLEM: ${id} is not registered in client/data/maps.js`);
    problemCount++;
  }
  for (const exit of src.exits || []) {
    const target = sources[exit.to];
    const spawn = exit.spawn || 'default';
    if (!target) {
      console.log(`  PROBLEM: ${id} exit "${exit.id}" leads to unknown map "${exit.to}"`);
      problemCount++;
    } else if (!target.spawns[spawn]) {
      console.log(`  PROBLEM: ${id} exit "${exit.id}" uses spawn "${spawn}", which ${exit.to} does not have`);
      problemCount++;
    } else {
      console.log(`  ${id} --[${exit.id}]--> ${exit.to} @ ${spawn}`);
    }
  }
}
if (problemCount) process.exitCode = 1;
