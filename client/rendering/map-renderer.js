// Map renderer for painted image maps (top-down 3/4 view).
//
// Layers (drawn bottom to top):
//   0 GROUND             the map image                  - only the part inside the camera view
//   1 GROUND_DECORATION  reserved (ground effects, decals)
//   2 OBJECTS            small placed sprites           - Y sorted
//   3 COLLISION_OBJECTS  solid placed sprites           - Y sorted
//   4 ENTITIES           NPCs, monsters                 - Y sorted
//   5 PLAYER             the local player               - Y sorted
//   6 EFFECTS            particles, projectiles         - Y sorted
//   7 UI                 names, damage numbers, HUD     - drawn last
//
// Layers 2-6 share one Y-sorted pass (renderer.queue / flush): whatever stands
// lower on the screen is drawn later, so it covers what is behind it.
// The layer number only breaks ties. A new layer = a new number here.

import { worldToScreen, depthOf, TILE_SIZE } from '../core/projection.js';
import { getObjectSprite } from './sprites.js';
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

export class MapRenderer {
  constructor() {
    this.stats = { imageArea: '0x0', objects: 0, objectsTotal: 0, overlayRects: 0 };
  }

  // The part of the map (in pixels) the camera can see, clamped to the map.
  visibleRect(renderer, camera, map, margin = 0) {
    const view = camera.viewRect(renderer.width, renderer.height, margin);
    const left = Math.max(0, Math.floor(view.left));
    const top = Math.max(0, Math.floor(view.top));
    const right = Math.min(map.pixelWidth, Math.ceil(view.right));
    const bottom = Math.min(map.pixelHeight, Math.ceil(view.bottom));
    return { left, top, right, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  }

  // options.visual = false (F8 debug [VISUAL] off): draw nothing.
  renderMap(renderer, camera, map, options = {}) {
    const rect = this.visibleRect(renderer, camera, map);
    this.stats.imageArea = `${rect.width}x${rect.height}`;
    if (options.visual === false) return;

    // Layer 0: copy only the visible rectangle of the image, never the whole picture.
    if (map.image && rect.width > 0 && rect.height > 0) {
      renderer.ctx.drawImage(
        map.image,
        rect.left, rect.top, rect.width, rect.height,
        rect.left, rect.top, rect.width, rect.height
      );
    }

    this.queueObjects(renderer, camera, map);
  }

  // Layers 2/3: placed objects, culled to the view (with a margin for tall sprites).
  queueObjects(renderer, camera, map) {
    const view = camera.viewRect(renderer.width, renderer.height, 48);
    this.stats.objects = 0;
    this.stats.objectsTotal = map.objects.length;

    for (const obj of map.objects) {
      const sprite = getObjectSprite(obj.type);
      if (!sprite) continue;
      const pos = worldToScreen(obj.tx, obj.ty);
      if (pos.x < view.left || pos.x > view.right || pos.y < view.top || pos.y > view.bottom) continue;
      const layer = obj.solid ? RENDER_LAYERS.COLLISION_OBJECTS : RENDER_LAYERS.OBJECTS;
      renderer.queue(depthOf(obj.tx, obj.ty), () => renderer.drawSprite(sprite, pos.x, pos.y), layer);
      this.stats.objects++;
    }
  }

  // F8 debug [COLLISION] on painted maps: every non-walkable collision cell in its code's color.
  // Neighbouring cells with the same code are merged into one rectangle per row.
  drawCollisionOverlay(renderer, camera, map) {
    const c = map.collision;
    const cellPx = TILE_SIZE / c.cellsPerTile;
    const rect = this.visibleRect(renderer, camera, map);
    const cx0 = Math.floor(rect.left / cellPx);
    const cy0 = Math.floor(rect.top / cellPx);
    const cx1 = Math.ceil(rect.right / cellPx);
    const cy1 = Math.ceil(rect.bottom / cellPx);

    const g = renderer.ctx;
    g.save();
    g.globalAlpha = 0.4;
    let rects = 0;
    for (let cy = cy0; cy < cy1; cy++) {
      let cx = cx0;
      while (cx < cx1) {
        const code = c.codeAtCell(cx, cy);
        let end = cx + 1;
        while (end < cx1 && c.codeAtCell(end, cy) === code) end++;
        if (code !== 0) {
          g.fillStyle = COLLISION_DEBUG_COLORS[code] || '#ffffff';
          g.fillRect(cx * cellPx, cy * cellPx, (end - cx) * cellPx, cellPx);
          rects++;
        }
        cx = end;
      }
    }
    g.restore();
    this.stats.overlayRects = rects;
  }
}
