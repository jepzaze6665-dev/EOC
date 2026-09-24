// Isometric tile-map renderer (used for maps of type 'iso', in the renderer's 'hd' mode).
//
// Pipeline, every frame:
//   1. Camera -> which tiles can be on screen -> which chunks / ground blocks those are
//   2. Ground, level by level (0, 1, 2 ...). Each 8 x 8-tile block of each level is drawn
//      ONCE per zoom into a cached canvas: tiles, blended borders, water banks and foam,
//      cliff faces, stairs, ambient occlusion and the soft shadows of the objects standing
//      on it. Levels are drawn bottom-up, so a cliff face of a higher level always lies
//      over the lower ground in front of it.
//   3. Objects of the visible chunks go into the renderer's depth sort (as plain sprites)
//      together with the player, NPCs, monsters and effects.
//   4. Vignette (one pre-made picture), then UI text in screen space.
//
// Performance comes first (MMORPG): nothing on the map is animated, and everything that
// can be worked out once - ground, shadows, the warm colour grade (asset-store.js),
// mirrored copies, the vignette - is cached, so a frame is mostly plain drawImage calls.
//
// Art comes from the asset store, already shrunk for the current zoom, and is copied
// onto whole screen pixels - never stretched (except cliff faces, which are fitted).

import { groundToScreen, worldToScreen, screenToWorld, depthOf, isoLevelPx } from '../core/projection.js';
import { assetStore } from './asset-store.js';
import { RENDER_LAYERS } from './map-renderer.js';
import { TerrainFx, EDGE_DIRS, CORNER_DIRS } from './terrain-fx.js';
import { COLLISION_DEBUG_COLORS } from '../collision/collision-system.js';

const FLAT_DEPTH = -1e6;          // bridges and platforms: under everything that stands on them
const BLOCK = 8;                  // ground is cached in blocks of 8 x 8 tiles (per level)
const MAX_CACHED_PIXELS = 48e6;   // ground cache budget (~190 MB); oldest blocks dropped first
const BLEND_PRIORITY = { stone: 1, dirt: 2, grass: 3 }; // higher creeps over lower
const SHADOW = /^(pine|tree|great_tree|rock|house|hut|stall|tent|statue|obelisk|pillar|stump|log|ruin|rubble|shrine|crystal|gate)/;

function hash(a, b, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export class IsoMapRenderer {
  constructor() {
    this.stats = { tiles: '', objects: 0, objectsTotal: 0, chunks: 0, activeChunks: 0, range: '', cachedBlocks: 0 };
    this.visibleChunks = [];
    this.lastRange = null;
    this.blocks = new Map();
    this.cachedPixels = 0;
    this.blockScale = null;
    this.blockMap = null;
    this.fx = new TerrainFx();
    this.vignette = null;
    this.effects = true; // vignette on/off
  }

  // Camera limits in entity pixels: the box around the map's diamond.
  cameraBounds(map) {
    return {
      minX: groundToScreen(0, map.height).x,
      maxX: groundToScreen(map.width, 0).x,
      minY: groundToScreen(0, 0).y - isoLevelPx() * 2,
      maxY: groundToScreen(map.width, map.height).y
    };
  }

  // The tile rectangle that covers the screen. Tall objects stand below the point where
  // they are drawn and raised ground is drawn above its tiles, hence the extra margins.
  visibleRange(renderer, map) {
    const unit = renderer.hdScale / renderer.scale; // entity pixels per CSS pixel
    const left = -renderer.offsetX - 64 * unit;
    const right = renderer.width - renderer.offsetX + 64 * unit;
    const top = -renderer.offsetY - 64 * unit;
    const bottom = renderer.height - renderer.offsetY + 420 * unit;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [sx, sy] of [[left, top], [right, top], [left, bottom], [right, bottom]]) {
      const w = screenToWorld(sx, sy);
      x0 = Math.min(x0, w.tx);
      x1 = Math.max(x1, w.tx);
      y0 = Math.min(y0, w.ty);
      y1 = Math.max(y1, w.ty);
    }
    return {
      x0: Math.max(0, Math.floor(x0)),
      y0: Math.max(0, Math.floor(y0)),
      x1: Math.min(map.width - 1, Math.ceil(x1)),
      y1: Math.min(map.height - 1, Math.ceil(y1))
    };
  }

  // ------------------------------------------------------------------ frame

  renderMap(renderer, camera, map) {
    const s = renderer.hdScale;
    const g = renderer.ctx;
    const W = renderer.canvas.width;
    const H = renderer.canvas.height;
    const range = this.visibleRange(renderer, map);
    this.lastRange = range;
    this.fx.prepare(s);

    const chunks = map.chunks.inTileRange(range.x0, range.y0, range.x1, range.y1, this.visibleChunks);
    map.chunks.updateActive(chunks);

    if (this.blockScale !== s || this.blockMap !== map) {
      this.blocks.clear();
      this.cachedPixels = 0;
      this.blockScale = s;
      this.blockMap = map;
    }

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;

    // ---- ground, level by level
    const bx0 = Math.floor(range.x0 / BLOCK);
    const by0 = Math.floor(range.y0 / BLOCK);
    const bx1 = Math.floor(range.x1 / BLOCK);
    const by1 = Math.floor(range.y1 / BLOCK);
    const maxLevel = this.maxLevel(map);
    let blocksDrawn = 0;
    for (let level = 0; level <= maxLevel; level++) {
      for (let sum = bx0 + by0; sum <= bx1 + by1; sum++) {
        for (let bx = Math.max(bx0, sum - by1); bx <= Math.min(bx1, sum - by0); bx++) {
          const block = this.groundBlock(renderer, map, bx, sum - bx, level, s);
          if (!block) continue;
          const dx = block.x + renderer.deviceOffsetX;
          const dy = block.y + renderer.deviceOffsetY;
          if (dx > W || dy > H || dx + block.canvas.width < 0 || dy + block.canvas.height < 0) continue;
          g.drawImage(block.canvas, dx, dy);
          blocksDrawn++;
        }
      }
    }

    // ---- static objects of the visible chunks, into the depth sort as plain sprites.
    // An object's map position and depth never change, so they are worked out once per zoom.
    let objects = 0;
    const k = renderer.scale;
    const ox = renderer.deviceOffsetX;
    const oy = renderer.deviceOffsetY;
    for (const chunk of chunks) {
      for (const o of chunk.objects) {
        const sprite = assetStore.scaled(o.asset, s, o.scale, o.flip);
        if (!sprite) continue;
        if (o.screenScale !== k) {
          const e = worldToScreen(o.tx, o.ty);
          o.devX = Math.round(e.x * k);
          o.devY = Math.round(e.y * k);
          o.screenScale = k;
          o.depth = o.flat ? FLAT_DEPTH + depthOf(o.tx, o.ty) : depthOf(o.tx, o.ty);
        }
        const x = o.devX + ox - sprite.ax;
        const y = o.devY + oy - sprite.ay;
        if (x > W || y > H || x + sprite.canvas.width < 0 || y + sprite.canvas.height < 0) continue;
        objects++;
        renderer.queueSprite(o.depth, sprite.canvas, x, y, o.flat ? RENDER_LAYERS.OBJECTS : RENDER_LAYERS.COLLISION_OBJECTS);
      }
    }

    renderer.useEntityTransform();
    Object.assign(this.stats, {
      tiles: `${blocksDrawn} blocks`,
      cachedBlocks: this.blocks.size,
      objects,
      objectsTotal: map.objects.length,
      chunks: chunks.length,
      activeChunks: map.chunks.activeCount,
      range: `${range.x1 - range.x0 + 1}x${range.y1 - range.y0 + 1}`
    });
  }

  maxLevel(map) {
    if (map._maxLevel === undefined) map._maxLevel = map.heights.reduce((m, h) => Math.max(m, h), 0);
    return map._maxLevel;
  }

  // ------------------------------------------------------------------ ground blocks

  // One block of one level, drawn once per zoom. Positions inside are "map device pixels"
  // (the camera offset is added when the block is drawn).
  groundBlock(renderer, map, bx, by, level, s) {
    const key = `${bx},${by},${level}`;
    if (this.blocks.has(key)) {
      const cached = this.blocks.get(key);
      // refresh: most recently used blocks are dropped last
      this.blocks.delete(key);
      this.blocks.set(key, cached);
      return cached;
    }

    const k = renderer.scale;
    const lift = isoLevelPx() * k; // one height level in device pixels
    const x0 = bx * BLOCK;
    const y0 = by * BLOCK;
    const x1 = Math.min(map.width - 1, x0 + BLOCK - 1);
    const y1 = Math.min(map.height - 1, y0 + BLOCK - 1);

    // collect draw steps first to know the block's size
    const steps = [];
    const late = []; // drawn after every tile of the block (staircases)
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const grow = (x, y, w, h) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    };
    const toDev = (tx, ty, h) => {
      const e = groundToScreen(tx, ty);
      return { x: Math.round(e.x * k), y: Math.round(e.y * k - h * lift) };
    };

    for (let sum = x0 + y0; sum <= x1 + y1; sum++) {
      for (let x = Math.max(x0, sum - y1); x <= Math.min(x1, sum - y0); x++) {
        const y = sum - x;
        const h = map.levelAt(x, y);
        const stair = map.stairAt(x, y);
        // A staircase is ONE picture covering its whole run of stair tiles, rising from
        // level h in front to level h + 1 behind. It is drawn with the upper level, in the
        // block of the run's front-most tile, after that block's tiles.
        const run = stair && h + 1 === level ? this.stairRuns(map).get(y * map.width + x) : null;
        if (run) {
          const box = run.dir === 'n'
            ? { left: toDev(run.x, run.y + 1, h).x, right: toDev(run.x + run.len, run.y, h).x,
                top: toDev(run.x, run.y, h + 1).y, bottom: toDev(run.x + run.len, run.y + 1, h).y }
            : { left: toDev(run.x, run.y + run.len, h).x, right: toDev(run.x + 1, run.y, h).x,
                top: toDev(run.x, run.y, h + 1).y, bottom: toDev(run.x + 1, run.y + run.len, h).y };
          const b = { x: box.left, y: box.top, w: box.right - box.left, h: box.bottom - box.top };
          late.push({ type: 'stairs', id: run.dir === 'n' ? 'stairs_n' : 'stairs_w', box: b });
          grow(b.x, b.y, b.w, b.h);
        }
        if (h !== level) continue;
        const center = toDev(x + 0.5, y + 0.5, h);
        const tile = map.palette[map.ground[y * map.width + x]];
        const sprite = assetStore.scaled(tile.id, s);
        if (!sprite) continue;

        // cliff faces toward lower ground in front (drawn before the top so its rim covers them)
        const walls = this.wallsFor(map, x, y, h, toDev, lift);
        for (const wall of walls) {
          steps.push(wall);
          grow(wall.box.x, wall.box.y, wall.box.w, wall.box.h);
        }
        steps.push({ type: 'tile', x, y, h, tile, sprite, cx: center.x, cy: center.y });
        grow(center.x - sprite.ax, center.y - sprite.ay, sprite.canvas.width, sprite.canvas.height);
        grow(center.x - this.fx.ax, center.y - this.fx.ay, this.fx.w, this.fx.h);
      }
    }
    const shadows = this.shadowsFor(map, bx, by, level, s, k, lift);
    for (const sh of shadows) grow(sh.x, sh.y, sh.w, sh.h);
    if (!steps.length && !late.length) {
      this.blocks.set(key, null);
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, maxX - minX);
    canvas.height = Math.max(1, maxY - minY);
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (const step of [...steps, ...late]) {
      if (step.type === 'tile') this.drawTile(g, map, step, step.cx - minX, step.cy - minY, s);
      else {
        const art = assetStore.fitted(step.id, step.box.w, step.box.h, s);
        if (art) g.drawImage(art, step.box.x - minX, step.box.y - minY);
      }
    }

    // soft shadows, only on this block's own ground (so neighbouring blocks never double them)
    if (shadows.length) {
      g.globalCompositeOperation = 'source-atop';
      for (const sh of shadows) g.drawImage(this.fx.shadowSprite, sh.x - minX, sh.y - minY, sh.w, sh.h);
      g.globalCompositeOperation = 'source-over';
    }

    const block = { canvas, x: minX, y: minY };
    this.blocks.set(key, block);
    this.cachedPixels += canvas.width * canvas.height;
    for (const [oldKey, old] of this.blocks) {
      if (this.cachedPixels <= MAX_CACHED_PIXELS) break;
      if (oldKey === key) continue;
      if (old) this.cachedPixels -= old.canvas.width * old.canvas.height;
      this.blocks.delete(oldKey);
    }
    return block;
  }

  // Stair tiles grouped into runs (neighbours with the same direction on the same row /
  // column), keyed by the run's front-most tile. Worked out once per map.
  stairRuns(map) {
    if (map._stairRuns) return map._stairRuns;
    const runs = new Map();
    const W = map.width;
    const seen = new Set();
    for (const [key, dir] of map.stairs) {
      if (seen.has(key)) continue;
      const step = dir === 'n' ? 1 : W; // runs go along x for 'n', along y for 'w'
      let first = key;
      while (map.stairs.get(first - step) === dir) first -= step;
      let len = 0;
      while (map.stairs.get(first + len * step) === dir) seen.add(first + len++ * step);
      const fx = first % W;
      const fy = Math.floor(first / W);
      runs.set(first + (len - 1) * step, { x: fx, y: fy, len, dir });
    }
    map._stairRuns = runs;
    return runs;
  }

  // Cliff faces hanging from a raised tile toward lower neighbours in front of it.
  // lift = one height level in device pixels. Each face is fitted into the box between
  // the raised tile's edge and the same edge down on the lower ground.
  wallsFor(map, x, y, h, toDev, lift) {
    const lowR = x + 1 < map.width ? map.levelAt(x + 1, y) : h;   // neighbour on the lower-right edge
    const lowL = y + 1 < map.height ? map.levelAt(x, y + 1) : h;  // neighbour on the lower-left edge
    const faceR = lowR < h && !map.stairLinks(x, y, x + 1, y);
    const faceL = lowL < h && !map.stairLinks(x, y, x, y + 1);
    if (!faceR && !faceL) return [];
    const left = toDev(x, y + 1, h);
    const bottom = toDev(x + 1, y + 1, h);
    const right = toDev(x + 1, y, h);
    if (faceR && faceL && lowR === lowL) {
      const box = { x: left.x, y: left.y, w: right.x - left.x, h: bottom.y - left.y + (h - lowL) * lift };
      return [{ type: 'wall', id: `wall_c_0${Math.floor(hash(x, y, 78) * 3) + 1}`, box }];
    }
    const v = Math.floor(hash(x, y, 77) * 2) + 1;
    const out = [];
    if (faceL) out.push({ type: 'wall', id: `wall_l_0${v}`, box: { x: left.x, y: left.y, w: bottom.x - left.x, h: bottom.y - left.y + (h - lowL) * lift } });
    if (faceR) out.push({ type: 'wall', id: `wall_r_0${v}`, box: { x: bottom.x, y: right.y, w: right.x - bottom.x, h: bottom.y - right.y + (h - lowR) * lift } });
    return out;
  }

  // One ground tile with everything that makes it blend into its neighbours.
  drawTile(g, map, step, cx, cy, s) {
    const { x, y, h, tile, sprite } = step;
    const fx = this.fx;
    const neighbour = (dx, dy) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) return null;
      if (map.levelAt(nx, ny) !== h) return null;
      return map.palette[map.ground[ny * map.width + nx]];
    };

    if (tile.group === 'water') {
      // banks on the back edges when land touches them (the shore piece has both; cut it in half for one)
      const landL = neighbour(-1, 0);
      const landR = neighbour(0, -1);
      const isLand = (t) => t && t.group !== 'water';
      const shoreId = `shore_back_0${Math.floor(hash(x, y, 5) * 4) + 1}`;
      const shore = assetStore.scaled(shoreId, s);
      g.drawImage(sprite.canvas, cx - sprite.ax, cy - sprite.ay);
      if (shore && (isLand(landL) || isLand(landR))) {
        if (isLand(landL) && isLand(landR)) {
          g.drawImage(shore.canvas, cx - shore.ax, cy - shore.ay);
        } else {
          g.save();
          g.beginPath();
          if (isLand(landL)) g.rect(cx - shore.ax, cy - shore.ay, shore.ax, shore.canvas.height);
          else g.rect(cx, cy - shore.ay, shore.canvas.width - shore.ax, shore.canvas.height);
          g.clip();
          g.drawImage(shore.canvas, cx - shore.ax, cy - shore.ay);
          g.restore();
        }
      }
      // foam where land is in front
      for (const d of EDGE_DIRS) {
        if (d.dx < 0 || d.dy < 0) continue;
        if (isLand(neighbour(d.dx, d.dy))) fx.drawOverlay(g, fx.foam[d.key][fx.variant(x, y, 11 + d.dx)], cx, cy);
      }
    } else {
      g.drawImage(sprite.canvas, cx - sprite.ax, cy - sprite.ay);
      const mine = BLEND_PRIORITY[tile.group] ?? 0;
      // neighbours of a stronger kind creep over this tile's edges ...
      const edgeCovered = {};
      for (const d of EDGE_DIRS) {
        const n = neighbour(d.dx, d.dy);
        if (!n || (BLEND_PRIORITY[n.group] ?? 0) <= mine) continue;
        const nSprite = assetStore.scaled(n.id, s);
        if (!nSprite) continue;
        const edge = fx.edge[d.key][fx.variant(x + (d.dx > 0 ? 1 : 0), y + (d.dy > 0 ? 1 : 0), d.dx === 0 ? 21 : 22)];
        fx.drawOverlay(g, edge.rim, cx, cy);
        fx.drawMasked(g, nSprite, edge.mask, cx, cy);
        edgeCovered[`${d.dx},${d.dy}`] = true;
      }
      // ... and their corners, when only the diagonal neighbour is of that kind
      for (const c of CORNER_DIRS) {
        if (edgeCovered[`${c.dx},0`] || edgeCovered[`0,${c.dy}`]) continue;
        const n = neighbour(c.dx, c.dy);
        if (!n || (BLEND_PRIORITY[n.group] ?? 0) <= mine) continue;
        const nSprite = assetStore.scaled(n.id, s);
        if (nSprite) fx.drawMasked(g, nSprite, fx.corner[c.key][fx.variant(x, y, 31)].mask, cx, cy);
      }
      if (tile.collision === 1) fx.drawOverlay(g, fx.shade, cx, cy); // deep forest floor
    }

    // ambient occlusion at the foot of a cliff behind this tile
    if (map.levelAt(x - 1, y) > h && x > 0 && !map.stairLinks(x, y, x - 1, y)) fx.drawOverlay(g, fx.ao.mx, cx, cy);
    if (map.levelAt(x, y - 1) > h && y > 0 && !map.stairLinks(x, y, x, y - 1)) fx.drawOverlay(g, fx.ao.my, cx, cy);
  }

  // ------------------------------------------------------------------ per-frame extras

  // Shadows falling on one ground block: every shadow-casting object standing on this
  // level within 2 tiles of the block (a shadow can reach across the block's border),
  // offset away from the light, which comes from the upper left like in the Master Map.
  shadowsFor(map, bx, by, level, s, k, lift) {
    const x0 = bx * BLOCK - 2;
    const y0 = by * BLOCK - 2;
    const x1 = (bx + 1) * BLOCK + 2;
    const y1 = (by + 1) * BLOCK + 2;
    const out = [];
    for (const chunk of map.chunks.inTileRange(x0, y0, x1, y1, [])) {
      for (const o of chunk.objects) {
        if (o.tx < x0 || o.tx >= x1 || o.ty < y0 || o.ty >= y1) continue;
        if (o.flat || !SHADOW.test(o.asset)) continue;
        if (map.levelAt(Math.floor(o.tx), Math.floor(o.ty)) !== level) continue;
        const meta = map.registry.assets[o.asset];
        const w = Math.round((meta.w / map.registry.masterScale) * s * o.scale * (o.asset.startsWith('pine') ? 0.8 : 0.72));
        const e = groundToScreen(o.tx + 0.12, o.ty + 0.05);
        const cx = Math.round(e.x * k);
        const cy = Math.round(e.y * k - level * lift);
        out.push({ x: cx - Math.round(w / 2), y: cy - Math.round(w / 4), w, h: Math.round(w / 2) });
      }
    }
    return out;
  }

  // Vignette: darker screen edges. Made once per screen size, then one drawImage per frame.
  drawAtmosphere(renderer) {
    if (!this.effects) return;
    const W = renderer.canvas.width;
    const H = renderer.canvas.height;
    if (!this.vignette || this.vignette.width !== W || this.vignette.height !== H) {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(4, 8, 4, 0.5)');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      this.vignette = c;
    }
    const g = renderer.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.vignette, 0, 0);
    renderer.useEntityTransform();
  }

  // F3: non-walkable collision cells as coloured diamonds, on top of everything.
  drawCollisionOverlay(renderer, camera, map) {
    const range = this.lastRange;
    if (!range) return;
    const c = map.collision;
    const k = c.cellsPerTile;
    const g = renderer.ctx;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 0.42;
    for (let cy = range.y0 * k; cy <= (range.y1 + 1) * k - 1; cy++) {
      for (let cx = range.x0 * k; cx <= (range.x1 + 1) * k - 1; cx++) {
        const code = c.codeAtCell(cx, cy);
        if (!code) continue;
        const lift = map.levelAt(Math.floor(cx / k), Math.floor(cy / k)) * isoLevelPx();
        const corners = [[cx, cy], [cx + 1, cy], [cx + 1, cy + 1], [cx, cy + 1]].map(([x, y]) => {
          const e = groundToScreen(x / k, y / k);
          return renderer.toDevice(e.x, e.y - lift);
        });
        g.fillStyle = COLLISION_DEBUG_COLORS[code] || '#ffffff';
        g.beginPath();
        g.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < 4; i++) g.lineTo(corners[i].x, corners[i].y);
        g.closePath();
        g.fill();
      }
    }
    g.restore();
    renderer.useEntityTransform();
  }
}
