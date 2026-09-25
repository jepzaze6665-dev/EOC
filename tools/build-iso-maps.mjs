// Isometric tile-map builder:  npm run isomaps            (all maps in tools/iso-map-src/)
//                              npm run isomaps -- a1
//
// For every map source it:
//   1. reads the Master Map painting and gives every tile a terrain class
//      (water / path / stone / forest / dense forest / grass) from the colours under it
//   2. applies the hand-painted areas (cliffs, stairs, stone circle ...) and the edge ring
//   3. picks a ground tile for every tile, and places landmarks + nature as objects
//   4. writes client/data/maps/<id>.json   - tiles, objects, spawns, exits (what the game loads)
//   5. builds the map exactly like the game does (IsoMap) and reports what cannot be
//      reached on foot; writes tools/out/<id>-layout.png (top-down check picture)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readPng, writePng, createImage } from './lib/png.mjs';
import { encodeCollision, COLLISION } from '../client/collision/collision-system.js';
import { IsoMap } from '../client/world/iso-map.js';
import { ISO } from '../client/data/iso-config.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'tools', 'iso-map-src');
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'client', 'data', 'asset-registry.json'), 'utf8'));

function hash(x, y, seed) {
  let h = (x + seed * 7919) * 374761393 + (y - seed * 104729) * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

// weighted pick from { id: weight } using a 0..1 number
function pickWeighted(weights, r) {
  const entries = Object.entries(weights);
  const total = entries.reduce((n, [, w]) => n + w, 0);
  let t = r * total;
  for (const [id, w] of entries) {
    t -= w;
    if (t < 0) return id;
  }
  return entries[entries.length - 1][0];
}

// Smooth value noise 0..1 (scale = size of the blobs in tiles) - forest clusters, flower patches.
function noise(x, y, scale, seed) {
  const gx = x / scale;
  const gy = y / scale;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, seed);
  const b = hash(x0 + 1, y0, seed);
  const c = hash(x0, y0 + 1, seed);
  const d = hash(x0 + 1, y0 + 1, seed);
  const top = a + (b - a) * sx;
  const bottom = c + (d - c) * sx;
  return top + (bottom - top) * sy;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

function covers(shape, x, y) {
  const px = x + 0.5;
  const py = y + 0.5;
  if (shape.rect) {
    const [rx, ry, rw, rh] = shape.rect;
    return px >= rx && px < rx + rw && py >= ry && py < ry + rh;
  }
  if (shape.ellipse) {
    const [cx, cy, rx, ry] = shape.ellipse;
    return ((px - cx) / rx) ** 2 + ((py - cy) / ry) ** 2 <= 1;
  }
  if (shape.poly) {
    let inside = false;
    const pts = shape.poly;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  if (shape.line) {
    const r = (shape.width ?? 1) / 2;
    for (let i = 0; i < shape.line.length - 1; i++) {
      const [ax, ay] = shape.line[i];
      const [bx, by] = shape.line[i + 1];
      if (distToSegment(px, py, ax, ay, bx, by) <= r) return true;
    }
    return false;
  }
  throw new Error(`unknown shape ${JSON.stringify(shape)}`);
}

function sampleMaster(img, width, height) {
  const sx = img.width / width;
  const sy = img.height / height;
  const out = [];
  for (let ty = 0; ty < height; ty++) {
    for (let tx = 0; tx < width; tx++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let l2 = 0;
      let n = 0;
      for (let y = Math.floor(ty * sy); y < Math.floor((ty + 1) * sy); y++) {
        for (let x = Math.floor(tx * sx); x < Math.floor((tx + 1) * sx); x++) {
          const k = (y * img.width + x) * 4;
          r += img.data[k];
          g += img.data[k + 1];
          b += img.data[k + 2];
          const l = (img.data[k] + img.data[k + 1] + img.data[k + 2]) / 3;
          l2 += l * l;
          n++;
        }
      }
      r /= n;
      g /= n;
      b /= n;
      const L = (r + g + b) / 3;
      out.push({ r, g, b, L, sat: Math.max(r, g, b) - Math.min(r, g, b), contrast: Math.sqrt(Math.max(0, l2 / n - L * L)) });
    }
  }
  return out;
}

// Majority smoothing: a tile takes the class most of its 3x3 neighbourhood has
// (only when that class wins clearly), which removes single-tile noise.
function smoothClasses(classes, width, height) {
  const out = classes.slice();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const counts = {};
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          const c = classes[ny * width + nx];
          counts[c] = (counts[c] || 0) + 1;
        }
      }
      const [best, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (n >= 6) out[y * width + x] = best;
    }
  }
  return out;
}

async function buildMap(id) {
  const src = (await import(pathToFileURL(path.join(SRC_DIR, `${id}.mjs`)).href)).default;
  const { width, height } = src;
  const t0 = Date.now();

  // 1. terrain classes from the Master Map
  const master = readPng(path.join(ROOT, src.masterMap));
  let classes = sampleMaster(master, width, height).map((c) => src.classify(c));
  classes = smoothClasses(classes, width, height);

  // 2. edge ring, then hand-painted areas (in order)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (Math.min(x, y, width - 1 - x, height - 1 - y) < (src.edgeWidth ?? 0)) classes[y * width + x] = src.edgeClass;
    }
  }
  for (const shape of src.paint || []) {
    if (!src.terrain[shape.terrain]) throw new Error(`${id}: paint uses unknown terrain "${shape.terrain}"`);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) if (covers(shape, x, y)) classes[y * width + x] = shape.terrain;
    }
  }

  // 3a. ground tiles -> palette
  const palette = [];
  const paletteIndex = new Map();
  const ground = new Uint16Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cls = src.terrain[classes[y * width + x]];
      const tileId = pickWeighted(cls.tiles, hash(x, y, 3));
      if (!registry.assets[tileId]) throw new Error(`${id}: tile "${tileId}" is not in the asset registry`);
      const group = cls.group || classes[y * width + x];
      const key = `${tileId}|${cls.collision || 0}|${group}`;
      if (!paletteIndex.has(key)) {
        paletteIndex.set(key, palette.length);
        palette.push({ id: tileId, collision: cls.collision || 0, group });
      }
      ground[y * width + x] = paletteIndex.get(key);
    }
  }

  // 3c. terrain height: base level, then painted areas (later ones win)
  const heights = new Uint8Array(width * height).fill(src.baseLevel ?? 0);
  for (const shape of src.heights || []) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) if (covers(shape, x, y)) heights[y * width + x] = shape.level;
    }
  }
  const levelAt = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : heights[y * width + x]);

  // stairs: for every column of a stair run, find the step from one level to the next
  // near the given row (the stair tile is the LOWER tile; 'n' climbs to y-1, 'w' to x-1)
  const stairs = [];
  for (const run of src.stairs || []) {
    const [sx, sy] = run.at;
    for (let i = 0; i < (run.width ?? 1); i++) {
      const x = run.dir === 'n' ? sx + i : sx;
      const y0 = run.dir === 'n' ? sy : sy + i;
      let found = null;
      for (let d = 0; d <= 6 && !found; d++) {
        for (const y of [y0 + d, y0 - d]) {
          for (const xx of run.dir === 'w' ? [x + d, x - d] : [x]) {
            const hx = run.dir === 'w' ? xx - 1 : xx;
            const hy = run.dir === 'n' ? y - 1 : y;
            if (!found && levelAt(hx, hy) === levelAt(xx, y) + 1) found = [xx, y];
          }
        }
      }
      if (!found) throw new Error(`${id}: no level step found for stairs at ${run.at} (column ${i})`);
      stairs.push([found[0], found[1], run.dir]);
    }
  }

  // 3b. objects: landmarks first, then nature on free tiles
  const objPalette = [];
  const objIndex = new Map();
  const list = [];
  const reserved = new Uint8Array(width * height);
  const reserve = (cx, cy, r) => {
    for (let y = Math.floor(cy - r); y <= Math.floor(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.floor(cx + r); x++) {
        if (x >= 0 && y >= 0 && x < width && y < height) reserved[y * width + x] = 1;
      }
    }
  };
  const addObject = (asset, tx, ty, variant = 2) => {
    if (!registry.assets[asset]) throw new Error(`${id}: object "${asset}" is not in the asset registry`);
    if (!objIndex.has(asset)) {
      objIndex.set(asset, objPalette.length);
      objPalette.push(asset);
    }
    const entry = [objIndex.get(asset), Math.round(tx * 100) / 100, Math.round(ty * 100) / 100];
    if (variant !== 2) entry.push(variant); // scale index * 2 + flip; 2 = normal size, not flipped
    list.push(entry);
  };

  const widthInTiles = (asset) => registry.assets[asset].w / (ISO.TILE_W * ISO.MASTER_SCALE);
  for (const [asset, tx, ty] of src.landmarks || []) {
    addObject(asset, tx, ty);
    reserve(tx, ty, Math.max(1, widthInTiles(asset) / 2 + 0.5));
  }
  for (const p of Object.values(src.spawns)) reserve(p[0], p[1], 2.5);
  // creatures, resources and NPCs stand on open ground
  for (const p of [...(src.monsterSpawns || []), ...(src.gatherNodes || []), ...(src.npcs || [])]) reserve(p.tx, p.ty, 1);
  for (const e of src.exits || []) reserve(e.rect[0] + e.rect[2] / 2, e.rect[1] + e.rect[3] / 2, Math.max(e.rect[2], e.rect[3]));
  for (const z of src.collisionZones || []) reserve(z.rect[0] + z.rect[2] / 2, z.rect[1] + z.rect[3] / 2, Math.max(z.rect[2], z.rect[3]) / 2 + 1);

  // keep the stairs and the ground in front of them clear, so they can be seen and reached
  for (const [x, y, dir] of stairs) {
    reserve(x + 0.5, y + 0.5, 1);
    reserve(x + 0.5 + (dir === 'w' ? 2 : 0), y + 0.5 + (dir === 'n' ? 2 : 0), 2);
  }
  const footOfCliff = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const h = levelAt(x, y);
      // hidden behind raised ground (the game blocks these tiles too): nothing goes there
      if (levelAt(x + 1, y) > h || levelAt(x, y + 1) > h || levelAt(x + 1, y + 1) > h) reserved[y * width + x] = 1;
      // the 2 tiles in front of a cliff face stay free of trees, so the cliff can be seen
      for (let d = 1; d <= 2; d++) {
        if (levelAt(x - d, y) > h || levelAt(x, y - d) > h || levelAt(x - d, y - d) > h) {
          footOfCliff[y * width + x] = d;
          break;
        }
      }
    }
  }

  // Nature. A rule is [chance, { asset: weight }, options]:
  //   options.cluster = [blob size in tiles, low, high]  chance *= low..high by smooth noise
  //                     (dense groves with clearings, flower patches ...)
  //   options.vary    = false to keep the picture's size and direction
  let natureCount = 0;
  const variantOf = (x, y) => Math.floor(hash(x, y, 25) * 3) * 2 + (hash(x, y, 26) < 0.5 ? 1 : 0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (reserved[y * width + x]) continue;
      const cls = classes[y * width + x];
      let rules = [...((src.nature || {})[cls] || [])];
      if (footOfCliff[y * width + x] && cls !== 'water') {
        // right at the foot: fallen rocks and bushes; one tile further: only small things
        rules = footOfCliff[y * width + x] === 1 ? [...(src.cliffFoot || [])] : rules.filter(([, w]) => !Object.keys(w).some((a) => /^(pine|tree)/.test(a)));
      }
      if (!rules.length) continue;
      let r = hash(x, y, 21);
      for (const [baseChance, weights, options = {}] of rules) {
        let chance = baseChance;
        if (options.cluster) {
          const [size, lo, hi] = options.cluster;
          chance *= lo + (hi - lo) * noise(x, y, size, 31 + Math.round(size));
        }
        if (r < chance) {
          const asset = pickWeighted(weights, hash(x, y, 22));
          const tx = x + 0.2 + hash(x, y, 23) * 0.6;
          const ty = y + 0.2 + hash(x, y, 24) * 0.6;
          addObject(asset, tx, ty, options.vary === false ? 2 : variantOf(x, y));
          natureCount++;
          break;
        }
        r -= chance;
      }
    }
  }

  // 4. map JSON
  const toPoint = ([tx, ty]) => ({ tx, ty });
  const data = {
    id,
    type: 'iso',
    name: src.name,
    safeZone: !!src.safeZone,
    width,
    height,
    chunkSize: src.chunkSize ?? ISO.CHUNK_SIZE,
    cellsPerTile: src.cellsPerTile ?? ISO.CELLS_PER_TILE,
    background: src.background || '#06060e',
    masterMap: src.masterMap,
    spawns: Object.fromEntries(Object.entries(src.spawns).map(([name, p]) => [name, toPoint(p)])),
    exits: (src.exits || []).map((e) => ({ id: e.id, tx: e.rect[0], ty: e.rect[1], w: e.rect[2], d: e.rect[3], to: e.to, spawn: e.spawn || 'default', label: e.label })),
    tiles: { palette, rle: encodeCollision(ground) },
    heights: { rle: encodeCollision(heights) },
    stairs,
    objects: { palette: objPalette, list },
    collisionZones: src.collisionZones || [],
    npcs: src.npcs || [],
    monsterSpawns: src.monsterSpawns || [],
    gatherNodes: src.gatherNodes || [],
    ambient: (src.ambient || []).map(({ at, ...a }) => ({ ...a, tx: at[0], ty: at[1] })),
    labels: src.labels || [],
    secrets: []
  };
  const jsonFile = path.join(ROOT, 'client', 'data', 'maps', `${id}.json`);
  fs.writeFileSync(jsonFile, `${JSON.stringify(data)}\n`);

  // 5. build it the way the game does, and check it
  const map = new IsoMap(data, registry);
  const c = map.collision;
  const k = c.cellsPerTile;
  const seen = new Uint8Array(c.cols * c.rows);
  const start = [Math.floor(map.spawn.tx * k), Math.floor(map.spawn.ty * k)];
  const problems = [];
  if (!map.canStand(map.spawn.tx, map.spawn.ty)) problems.push('player cannot stand on the default spawn');
  const stack = [start];
  seen[start[1] * c.cols + start[0]] = 1;
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!c.inBounds(nx, ny)) continue;
      const i = ny * c.cols + nx;
      if (seen[i] || c.codeAtCell(nx, ny) !== COLLISION.WALKABLE) continue;
      seen[i] = 1;
      stack.push([nx, ny]);
    }
  }
  const reachedAt = (tx, ty) => seen[Math.floor(ty * k) * c.cols + Math.floor(tx * k)] === 1;
  for (const [name, p] of Object.entries(map.spawns)) if (!reachedAt(p.tx, p.ty)) problems.push(`spawn "${name}" cannot be reached`);
  for (const e of map.exits) if (!reachedAt(e.tx + e.w / 2, e.ty + e.d / 2)) problems.push(`exit ${e.id} cannot be reached`);
  const walkable = c.stats()[0] || 0;
  const reached = seen.reduce((n, v) => n + v, 0);

  // layout picture: 6 px per tile, terrain colour, objects as dots, unreachable darkened
  const COLORS = { grass: [86, 140, 60], forest: [48, 96, 44], dense: [22, 56, 28], path: [176, 140, 90], stone: [140, 140, 150], rune: [170, 160, 200], ruin: [120, 120, 110], water: [50, 110, 190], cliff: [100, 80, 70] };
  const S = 6;
  const pic = createImage(width * S, height * S);
  for (let y = 0; y < height * S; y++) {
    for (let x = 0; x < width * S; x++) {
      const tx = x / S;
      const ty = y / S;
      const col = COLORS[classes[Math.floor(ty) * width + Math.floor(tx)]] || [255, 0, 255];
      const cell = Math.floor(ty * k) * c.cols + Math.floor(tx * k);
      const lvl = heights[Math.floor(ty) * width + Math.floor(tx)];
      const dim = (c.grid[cell] === 0 && !seen[cell] ? 0.45 : c.grid[cell] !== 0 ? 0.7 : 1) * (0.75 + 0.15 * lvl);
      const o = (y * pic.width + x) * 4;
      pic.data[o] = Math.min(255, col[0] * dim);
      pic.data[o + 1] = Math.min(255, col[1] * dim);
      pic.data[o + 2] = Math.min(255, col[2] * dim);
      pic.data[o + 3] = 255;
    }
  }
  const dot = (tx, ty, color, r = 1) => {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = Math.round(tx * S) + dx;
        const y = Math.round(ty * S) + dy;
        if (x < 0 || y < 0 || x >= pic.width || y >= pic.height) continue;
        const o = (y * pic.width + x) * 4;
        pic.data[o] = color[0];
        pic.data[o + 1] = color[1];
        pic.data[o + 2] = color[2];
      }
    }
  };
  for (const [p, tx, ty] of list) {
    const asset = objPalette[p];
    const big = !asset.startsWith('pine') && !asset.startsWith('tree') && !asset.startsWith('bush') && !asset.startsWith('flowers') && !asset.startsWith('mushroom') && !asset.startsWith('pebble');
    dot(tx, ty, big ? [255, 220, 80] : [10, 30, 12], big ? 3 : 1);
  }
  for (const [x, y] of stairs) dot(x + 0.5, y + 0.5, [255, 140, 40], 2);
  for (const p of Object.values(map.spawns)) dot(p.tx, p.ty, [60, 255, 90], 5);
  for (const e of map.exits) dot(e.tx + e.w / 2, e.ty + e.d / 2, [255, 60, 255], 5);
  fs.mkdirSync(path.join(ROOT, 'tools', 'out'), { recursive: true });
  writePng(path.join(ROOT, 'tools', 'out', `${id}-layout.png`), pic);

  const count = (cls) => classes.filter((v) => v === cls).length;
  console.log(`${id}: ${width}x${height} tiles, ${map.chunks.cols}x${map.chunks.rows} chunks, ${palette.length} tile types, ${list.length} objects (${natureCount} nature, ${(src.landmarks || []).length} landmarks) in ${Date.now() - t0} ms`);
  console.log(`  terrain: ${Object.keys(src.terrain).map((t) => `${t} ${count(t)}`).join(', ')}`);
  console.log(`  walkable ${walkable} of ${c.cols * c.rows} cells, reachable from spawn ${reached} (${Math.round((reached / Math.max(1, walkable)) * 100)}%)`);
  console.log(`  -> ${path.relative(ROOT, jsonFile)} (${Math.round(fs.statSync(jsonFile).size / 1024)} KB), tools/out/${id}-layout.png`);
  for (const p of problems) console.log(`  PROBLEM: ${p}`);
  return problems.length;
}

const only = process.argv.slice(2);
const ids = only.length ? only : fs.readdirSync(SRC_DIR).filter((f) => f.endsWith('.mjs')).map((f) => f.replace(/\.mjs$/, ''));
let problemCount = 0;
for (const id of ids) problemCount += await buildMap(id);
if (problemCount) process.exitCode = 1;
