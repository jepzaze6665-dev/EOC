// Isometric map renderer.
//
// Coordinate systems used across the engine:
//   Tile / Grid coordinate  (x, y) integers        -> which tile.  map.ground[y][x]
//   World coordinate        (tx, ty) floats        -> exact position on the map, in tile units
//   Screen coordinate       (sx, sy) buffer pixels -> worldToScreen(tx, ty) in core/iso.js
//   Camera coordinate       camera.x / camera.y    -> the screen point at the center of the view
//
// Layers (drawn bottom to top):
//   0 GROUND             flat tiles                 - drawn directly, visible tiles only
//   1 GROUND_DECORATION  flowers, grass tufts ...   - drawn directly, visible tiles only
//   2 OBJECTS            props you can walk behind  - depth sorted (Y sort)
//   3 COLLISION_OBJECTS  solid props, cliff blocks  - depth sorted
//   4 ENTITIES           NPCs, monsters             - depth sorted
//   5 PLAYER             the local player           - depth sorted
//   6 EFFECTS            particles                  - depth sorted
//   7 UI                 names, damage numbers, HUD - drawn last (overlay text / DOM)
//
// Layers 2-6 share one depth-sorted pass: an object further "south" (bigger tx + ty)
// is drawn later, so it correctly covers things behind it. The layer number only
// breaks ties. A new layer = a new number here; nothing else has to change.

import { TILE_W, TILE_H, worldToScreen, screenToWorld } from '../core/iso.js';
import { TILE_DEFS } from '../data/tiles.js';
import { getTileSprite, getBlockSprite, getDecorSprite, getPropSprite } from './sprites.js';
import { COLLISION_DEBUG_COLORS } from '../collision/collision-system.js';

export const RENDER_LAYERS = {
  GROUND: 0,
  GROUND_DECORATION: 1,
  OBJECTS: 2,
  COLLISION_OBJECTS: 3,
  ENTITIES: 4,
  PLAYER: 5,
  EFFECTS: 6,
  UI: 7
};

// How far outside the screen we still draw, so tall things (trees, cliffs,
// building roofs) do not pop in at the edges.
const MARGIN_SIDE = TILE_W * 2;
const MARGIN_TOP = TILE_H * 2;
const MARGIN_BOTTOM = 128; // tall sprites are anchored at their feet, below their top

function tileHash(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) >>> 0;
}

export class IsoRenderer {
  constructor() {
    this.stats = { tiles: 0, decorations: 0, blocks: 0, objects: 0, objectsTotal: 0 };
    this.visibleObjects = [];
    this.pendingDecor = [];
    this.lastView = null;
    this.lastRange = null;
  }

  // Screen rectangle to draw, in screen pixels (includes the margins above).
  viewRect(renderer, camera) {
    const rect = camera.viewRect(renderer.width, renderer.height);
    return {
      left: rect.left - MARGIN_SIDE,
      right: rect.right + MARGIN_SIDE,
      top: rect.top - MARGIN_TOP,
      bottom: rect.bottom + MARGIN_BOTTOM
    };
  }

  // The smallest tile rectangle that covers the view. The four screen corners are
  // turned back into tile coordinates; in isometric the view is a diamond in tile
  // space, so the box around it is a bit bigger than needed - the per-tile screen
  // check in drawGround() throws away the extra tiles cheaply.
  visibleTileRange(map, view) {
    const points = [
      screenToWorld(view.left, view.top),
      screenToWorld(view.right, view.top),
      screenToWorld(view.left, view.bottom),
      screenToWorld(view.right, view.bottom)
    ];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.tx);
      maxX = Math.max(maxX, p.tx);
      minY = Math.min(minY, p.ty);
      maxY = Math.max(maxY, p.ty);
    }
    return {
      x0: Math.max(0, Math.floor(minX)),
      y0: Math.max(0, Math.floor(minY)),
      x1: Math.min(map.width - 1, Math.ceil(maxX)),
      y1: Math.min(map.height - 1, Math.ceil(maxY))
    };
  }

  // Layers 0-3 of the map. Entities (layers 4-6) are queued by their own classes.
  renderMap(renderer, camera, map, time) {
    const view = this.viewRect(renderer, camera);
    const range = this.visibleTileRange(map, view);

    this.stats.tiles = 0;
    this.stats.decorations = 0;
    this.stats.blocks = 0;

    this.drawGroundAndQueueBlocks(renderer, map, view, range, time);
    this.drawDecorations(renderer);
    this.queueObjects(renderer, map, view, range);

    this.lastView = view;
    this.lastRange = range;
  }

  drawGroundAndQueueBlocks(renderer, map, view, range, time) {
    const pending = this.pendingDecor;
    pending.length = 0;

    for (let y = range.y0; y <= range.y1; y++) {
      const row = map.ground[y];
      for (let x = range.x0; x <= range.x1; x++) {
        const sx = (x - y) * (TILE_W / 2);
        const sy = (x + y + 1) * (TILE_H / 2);
        if (sx < view.left || sx > view.right || sy < view.top || sy > view.bottom) continue;

        const id = row[x];
        const def = TILE_DEFS[id];

        if (def && def.block) {
          // Raised tile: draw it with the objects so depth sorting hides whatever is behind it.
          const sprite = getBlockSprite(id, tileHash(x, y));
          if (sprite) {
            this.stats.blocks++;
            renderer.queue(x + y + 1, () => renderer.drawSprite(sprite, sx, sy), RENDER_LAYERS.COLLISION_OBJECTS);
          }
          continue;
        }

        renderer.drawSprite(getTileSprite(id, time), sx, sy);
        this.stats.tiles++;

        const decor = map.decoration[y * map.width + x];
        if (decor) pending.push(decor, x, y, sx, sy);
      }
    }
  }

  // Decorations go in their own pass so a flower is never painted over by the
  // ground tile of the next row.
  drawDecorations(renderer) {
    const pending = this.pendingDecor;
    for (let i = 0; i < pending.length; i += 5) {
      const sprite = getDecorSprite(pending[i], tileHash(pending[i + 1], pending[i + 2]));
      if (!sprite) continue;
      renderer.drawSprite(sprite, pending[i + 3], pending[i + 4]);
      this.stats.decorations++;
    }
  }

  // Only objects in the spatial-grid cells near the camera are even looked at.
  queueObjects(renderer, map, view, range) {
    const list = this.visibleObjects;
    list.length = 0;
    map.objectIndex.query(range.x0 - 2, range.y0 - 2, range.x1 + 2, range.y1 + 2, list);
    this.stats.objectsTotal = map.objectIndex.count;
    this.stats.objects = 0;

    for (const entry of list) {
      const sprite = getPropSprite(entry.prop.type);
      if (!sprite) continue;
      const { x, y } = entry.screen;
      const left = x - sprite.ax;
      const top = y - sprite.ay;
      if (left > view.right || left + sprite.canvas.width < view.left) continue;
      if (top > view.bottom || top + sprite.canvas.height < view.top) continue;

      const layer = entry.def.solid ? RENDER_LAYERS.COLLISION_OBJECTS : RENDER_LAYERS.OBJECTS;
      renderer.queue(entry.depth, () => renderer.drawSprite(sprite, x, y), layer);
      this.stats.objects++;
    }
  }

  // F3 debug view: colors every non-walkable tile by its collision code.
  // Called after renderer.flush() so it sits on top of buildings and cliffs.
  drawCollisionOverlay(renderer, map) {
    const view = this.lastView;
    const range = this.lastRange;
    if (!view || !range) return;
    const g = renderer.ctx;
    g.save();
    g.globalAlpha = 0.38;
    for (let y = range.y0; y <= range.y1; y++) {
      for (let x = range.x0; x <= range.x1; x++) {
        const code = map.collision.codeAt(x, y);
        if (code === 0) continue;
        const top = worldToScreen(x, y);
        if (top.x < view.left || top.x > view.right || top.y < view.top || top.y > view.bottom) continue;
        g.fillStyle = COLLISION_DEBUG_COLORS[code] || '#ffffff';
        g.beginPath();
        g.moveTo(top.x, top.y);
        g.lineTo(top.x + TILE_W / 2, top.y + TILE_H / 2);
        g.lineTo(top.x, top.y + TILE_H);
        g.lineTo(top.x - TILE_W / 2, top.y + TILE_H / 2);
        g.closePath();
        g.fill();
      }
    }
    g.restore();
  }
}
