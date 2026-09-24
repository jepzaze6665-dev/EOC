// IsoMap - an isometric tile map (built by tools/build-iso-maps.mjs).
//
// The data keeps the layers apart:
//   VISUAL     tiles.palette + tiles.rle   ground tile ids, one per tile
//              objects.palette + list      static objects (trees, rocks, buildings ...)
//   HEIGHT     heights.rle                 terrain level of every tile (0, 1, 2 ...)
//              stairs                      [x, y, 'n' | 'w'] tiles that climb one level
//   COLLISION  built here, never painted by hand:
//                1. each tile's code from its palette entry (water 2, deep forest 1 ...)
//                2. height steps: you can only change level on stairs
//                3. each object's collision shape from the asset registry
//                   (circle / rectangle in tiles) - not the object's picture
//                4. collisionZones from the map data (e.g. bridges make water walkable)
//   OBJECT     spawns, exits, npcs, monsterSpawns ...  (MapBase)
//   SECRET     reserved (Milestone 3)
//
// Pictures are never looked at - only ids. The asset registry supplies sizes and shapes.

import { MapBase } from './map-base.js';
import { ChunkManager } from './chunk-manager.js';
import { CollisionSystem, decodeCollision, COLLISION } from '../collision/collision-system.js';
import { ISO } from '../data/iso-config.js';

// scale steps for object variety (index 1 = normal size)
export const OBJECT_SCALES = [0.86, 1, 1.14];

export class IsoMap extends MapBase {
  // registry = parsed client/data/asset-registry.json
  constructor(data, registry) {
    super(data);
    if (data.type !== 'iso') throw new Error(`IsoMap: ${data.id} is not an iso map`);
    this.projection = 'iso';
    this.registry = registry;
    this.masterMap = data.masterMap || null;
    this.secrets = data.secrets || [];

    // ---- ground + terrain height
    this.palette = data.tiles.palette; // [{ id, collision, group }]
    const cells = data.width * data.height;
    this.ground = decodeCollision(data.tiles.rle, cells, Uint16Array);
    this.heights = data.heights ? decodeCollision(data.heights.rle, cells) : new Uint8Array(cells);
    this.stairs = new Map((data.stairs || []).map(([x, y, dir]) => [y * data.width + x, dir]));

    // ---- static objects, grouped into chunks
    this.chunks = new ChunkManager(data.width, data.height, data.chunkSize ?? ISO.CHUNK_SIZE);
    const objPalette = data.objects.palette;
    this.objects = data.objects.list.map(([p, tx, ty, variant = 2], i) => {
      const asset = objPalette[p];
      const meta = registry.assets[asset];
      if (!meta) throw new Error(`IsoMap ${data.id}: unknown asset "${asset}"`);
      // variant = scaleIndex * 2 + flip
      const scale = OBJECT_SCALES[Math.floor(variant / 2)] ?? 1;
      const object = {
        id: `${asset}#${i}`, asset, tx, ty, scale, flip: variant % 2 === 1,
        flat: !!meta.flat, collisionShape: meta.collision || null
      };
      this.chunks.add(object);
      return object;
    });

    this.buildCollision(data.cellsPerTile ?? ISO.CELLS_PER_TILE, data.collisionZones || []);
  }

  // ---- terrain height

  levelAt(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    return this.heights[y * this.width + x];
  }

  stairAt(x, y) {
    return this.stairs.get(y * this.width + x) || null;
  }

  // Height (in levels) of the ground under a point. On a staircase it rises smoothly
  // from the stair's own level to the level above.
  heightAt(tx, ty) {
    const x = Math.floor(tx);
    const y = Math.floor(ty);
    const h = this.levelAt(x, y);
    const stair = this.stairAt(x, y);
    if (!stair) return h;
    const progress = stair === 'n' ? 1 - (ty - y) : 1 - (tx - x);
    return h + Math.max(0, Math.min(1, progress));
  }

  // Is the edge between two neighbouring tiles a staircase connection?
  stairLinks(x, y, nx, ny) {
    const up = (sx, sy, dir, hx, hy) =>
      this.stairAt(sx, sy) === dir && hx === sx + (dir === 'w' ? -1 : 0) && hy === sy + (dir === 'n' ? -1 : 0);
    return up(x, y, 'n', nx, ny) || up(x, y, 'w', nx, ny) || up(nx, ny, 'n', x, y) || up(nx, ny, 'w', x, y);
  }

  // ---- collision

  buildCollision(cellsPerTile, zones) {
    const k = cellsPerTile;
    const cols = this.width * k;
    const rows = this.height * k;
    const collision = new CollisionSystem(cols, rows, k);
    const block = (tileX, tileY, cx0, cy0, cx1, cy1, code) => {
      for (let cy = cy0; cy < cy1; cy++) {
        for (let cx = cx0; cx < cx1; cx++) collision.setCell(tileX * k + cx, tileY * k + cy, code);
      }
    };

    // 1. tiles
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tile = this.ground[Math.floor(y / k) * this.width + Math.floor(x / k)];
        const code = this.palette[tile].collision || 0;
        if (code) collision.setCell(x, y, code);
      }
    }

    // 2. height steps. A lower tile next to a higher one:
    //    - in FRONT of it (the cliff face hangs over it): its half next to the face is blocked
    //    - BEHIND it (hidden by the raised ground): the whole tile is blocked
    //    Stairs are the only way between levels.
    const half = Math.max(1, Math.floor(k / 2));
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const h = this.levelAt(x, y);
        const higher = (nx, ny) => nx >= 0 && ny >= 0 && nx < this.width && ny < this.height &&
          this.levelAt(nx, ny) > h && !this.stairLinks(x, y, nx, ny);
        // behind: the higher tile is at +x, +y or diagonally in front
        if (higher(x + 1, y) || higher(x, y + 1) || higher(x + 1, y + 1)) {
          block(x, y, 0, 0, k, k, COLLISION.CLIFF);
          continue;
        }
        if (higher(x - 1, y)) block(x, y, 0, 0, half, k, COLLISION.CLIFF);
        if (higher(x, y - 1)) block(x, y, 0, 0, k, half, COLLISION.CLIFF);
        if (higher(x - 1, y - 1) && this.levelAt(x - 1, y) <= h && this.levelAt(x, y - 1) <= h) block(x, y, 0, 0, half, half, COLLISION.CLIFF);
      }
    }

    // 3. object shapes (a cell is blocked when its centre is inside the shape)
    const mark = (tx0, ty0, tx1, ty1, inside, code) => {
      for (let cy = Math.floor(ty0 * k); cy <= Math.ceil(ty1 * k); cy++) {
        for (let cx = Math.floor(tx0 * k); cx <= Math.ceil(tx1 * k); cx++) {
          const px = (cx + 0.5) / k;
          const py = (cy + 0.5) / k;
          if (inside(px, py) && collision.codeAtCell(cx, cy) === 0) collision.setCell(cx, cy, code);
        }
      }
    };
    for (const o of this.objects) {
      const shape = o.collisionShape;
      if (!shape) continue;
      if (shape.circle) {
        const r = shape.circle * o.scale;
        mark(o.tx - r, o.ty - r, o.tx + r, o.ty + r, (px, py) => Math.hypot(px - o.tx, py - o.ty) <= r, 1);
        // a small circle can miss every cell centre - the cell under the trunk is always solid
        const cx = Math.floor(o.tx * k);
        const cy = Math.floor(o.ty * k);
        if (collision.codeAtCell(cx, cy) === 0) collision.setCell(cx, cy, 1);
      } else if (shape.rect) {
        const w = shape.rect[0] * o.scale;
        const d = shape.rect[1] * o.scale;
        mark(o.tx - w / 2, o.ty - d / 2, o.tx + w / 2, o.ty + d / 2,
          (px, py) => Math.abs(px - o.tx) <= w / 2 && Math.abs(py - o.ty) <= d / 2, shape.code || 4);
      }
    }

    // 4. hand-made zones, last so they always win (a bridge over water is code 0)
    for (const z of zones) {
      const [tx, ty, w, d] = z.rect;
      for (let cy = Math.floor(ty * k); cy < Math.ceil((ty + d) * k); cy++) {
        for (let cx = Math.floor(tx * k); cx < Math.ceil((tx + w) * k); cx++) collision.setCell(cx, cy, z.code);
      }
    }

    this.collision = collision;
  }

  tileIndexAt(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return -1;
    return this.ground[y * this.width + x];
  }

  tileAt(x, y) {
    const i = this.tileIndexAt(Math.floor(x), Math.floor(y));
    return i < 0 ? null : this.palette[i];
  }

  // Every asset id the map needs (for loading the pictures before the map is shown).
  assetIds() {
    const ids = new Set([...this.palette.map((p) => p.id), ...this.objects.map((o) => o.asset)]);
    // the renderer also uses these when the map has water edges, cliffs or stairs
    for (const [id, meta] of Object.entries(this.registry.assets)) {
      if (meta.kind === 'part' || id.startsWith('shore_back')) ids.add(id);
    }
    return [...ids];
  }
}
