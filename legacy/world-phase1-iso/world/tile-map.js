// TileMap - one loaded map in memory.
//
// Map DATA (plain objects in data/maps/*.js, JSON files from Phase 2) goes in,
// a TileMap with fast lookups comes out:
//
//   layers.ground      Layer 0  tile id per tile          -> drawn flat
//   layers.decoration  Layer 1  sparse [{ id, x, y }]     -> drawn flat on top of ground
//   props              Layer 2/3 objects, solid ones write into the collision grid
//   collision          built here from tiles + props + collisionZones (numeric codes)
//
// Nothing here knows how big a map "should" be - width/height come from the data,
// so a 40x40 dungeon and a 400x400 field both work the same way.

import { TILE_DEFS, tileCollision } from '../data/tiles.js';
import { PROP_DEFS } from '../data/props.js';
import { CollisionSystem } from '../collision/collision-system.js';
import { worldToScreen, depthOf } from '../core/iso.js';

// Buckets static objects by area, so the renderer only looks at objects near the camera
// instead of every object on the map.
export class SpatialGrid {
  constructor(width, height, cellSize = 8) {
    this.cellSize = cellSize;
    this.cols = Math.max(1, Math.ceil(width / cellSize));
    this.rows = Math.max(1, Math.ceil(height / cellSize));
    this.cells = Array.from({ length: this.cols * this.rows }, () => []);
    this.queryId = 0;
    this.count = 0;
  }

  insert(entry, x, y, w = 1, d = 1) {
    const c0 = Math.max(0, Math.floor(x / this.cellSize));
    const r0 = Math.max(0, Math.floor(y / this.cellSize));
    const c1 = Math.min(this.cols - 1, Math.floor((x + w - 1) / this.cellSize));
    const r1 = Math.min(this.rows - 1, Math.floor((y + d - 1) / this.cellSize));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) this.cells[r * this.cols + c].push(entry);
    }
    entry.queryStamp = 0;
    this.count++;
  }

  // Every entry touching the tile rectangle, each one only once.
  query(minX, minY, maxX, maxY, out = []) {
    const stamp = ++this.queryId;
    const c0 = Math.max(0, Math.floor(minX / this.cellSize));
    const r0 = Math.max(0, Math.floor(minY / this.cellSize));
    const c1 = Math.min(this.cols - 1, Math.floor(maxX / this.cellSize));
    const r1 = Math.min(this.rows - 1, Math.floor(maxY / this.cellSize));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        for (const entry of this.cells[r * this.cols + c]) {
          if (entry.queryStamp === stamp) continue;
          entry.queryStamp = stamp;
          out.push(entry);
        }
      }
    }
    return out;
  }
}

export class TileMap {
  constructor(data) {
    if (!data || !data.width || !data.height) throw new Error('TileMap: map data needs width and height');

    this.id = data.id;
    this.name = data.name || data.id;
    this.safeZone = !!data.safeZone;
    this.width = data.width;
    this.height = data.height;
    this.background = data.background || '#06060e';

    this.ground = data.layers.ground;
    this.props = data.props || [];
    this.npcs = data.npcs || [];
    this.gatherNodes = data.gatherNodes || [];
    this.monsterSpawns = data.monsterSpawns || [];
    this.portals = data.portals || [];
    this.spawn = data.spawn;

    this.buildDecorations(data.layers.decoration || []);
    this.buildCollision(data.collisionZones || []);
    this.buildObjectIndex();
  }

  // Older code reads map.tiles - keep it pointing at the ground layer.
  get tiles() {
    return this.ground;
  }

  buildDecorations(list) {
    this.decoration = new Array(this.width * this.height).fill(null);
    for (const item of list) {
      if (item.x < 0 || item.y < 0 || item.x >= this.width || item.y >= this.height) continue;
      this.decoration[item.y * this.width + item.x] = item.id;
    }
  }

  buildCollision(zones) {
    const collision = new CollisionSystem(this.width, this.height);

    for (let y = 0; y < this.height; y++) {
      const row = this.ground[y];
      for (let x = 0; x < this.width; x++) collision.setCode(x, y, tileCollision(row[x]));
    }

    const markSolid = (type, tx, ty) => {
      const def = PROP_DEFS[type];
      if (!def || !def.solid) return;
      collision.markRect(Math.floor(tx), Math.floor(ty), def.w, def.d, def.collision ?? 1);
    };
    for (const prop of this.props) markSolid(prop.type, prop.tx, prop.ty);
    for (const node of this.gatherNodes) markSolid(node.prop, node.tx, node.ty);

    // Hand-placed areas: e.g. { x, y, w, d, code: 5 } for a gate that opens later.
    for (const zone of zones) {
      for (let y = zone.y; y < zone.y + (zone.d ?? 1); y++) {
        for (let x = zone.x; x < zone.x + (zone.w ?? 1); x++) collision.setCode(x, y, zone.code);
      }
    }

    this.collision = collision;
  }

  // Props never move, so their screen position and sort depth are worked out once here.
  buildObjectIndex() {
    this.objectIndex = new SpatialGrid(this.width, this.height, 8);
    for (const prop of this.props) {
      const def = PROP_DEFS[prop.type];
      if (!def) continue;
      const cx = prop.tx + def.w / 2;
      const cy = prop.ty + def.d / 2;
      this.objectIndex.insert(
        { prop, def, cx, cy, screen: worldToScreen(cx, cy), depth: depthOf(cx, cy) },
        Math.floor(prop.tx), Math.floor(prop.ty), def.w, def.d
      );
    }
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  tileAt(tx, ty) {
    const x = Math.floor(tx);
    const y = Math.floor(ty);
    if (!this.inBounds(x, y)) return null;
    return this.ground[y][x];
  }

  tileDef(tx, ty) {
    const id = this.tileAt(tx, ty);
    return id ? TILE_DEFS[id] : null;
  }

  decorationAt(x, y) {
    if (!this.inBounds(x, y)) return null;
    return this.decoration[y * this.width + x];
  }

  collisionAt(tx, ty) {
    return this.collision.codeAt(Math.floor(tx), Math.floor(ty));
  }

  isBlocked(tx, ty) {
    return this.collision.isBlocked(tx, ty);
  }

  blocksProjectile(tx, ty) {
    return this.collision.blocksProjectile(tx, ty);
  }

  canStand(tx, ty, radius = 0.28) {
    return this.collision.canStand(tx, ty, radius);
  }
}
