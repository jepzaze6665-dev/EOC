// F8 map debug overlay - drawn on top of the world, developer mode only.
//
//   [COLLISION] non-walkable collision cells, coloured by code
//   [GRID]      tile outlines + chunk borders (cyan)
//   [OBJECT]    object feet + collision shapes, ids near the mouse, NPCs, monsters,
//               spawn points, exit zones
//   [SECRET]    secret triggers (map.secrets) - none exist yet (secret system: NOT IMPLEMENTED)
//   hover / selected tile highlight
//
// Speed: collision, grid and object outlines never move, so on isometric maps they are
// drawn ONCE per 8 x 8-tile block into cached canvases (like the ground); each frame only
// copies the visible blocks. Only the few moving things (NPCs, monsters, highlights,
// labels) are drawn every frame.

import { groundToScreen, screenToWorld, isoLevelPx } from '../core/projection.js';
import { COLLISION_DEBUG_COLORS } from '../collision/collision-system.js';

const LABEL_RADIUS = 5; // object ids are only written for objects this close to the mouse (tiles)
const BLOCK = 8;

function levelOf(map, x, y) {
  return map.levelAt ? map.levelAt(Math.floor(x), Math.floor(y)) : 0;
}

// Entity-pixel position of a point on the ground at a given terrain level.
function at(map, tx, ty, level = levelOf(map, tx, ty)) {
  const e = groundToScreen(tx, ty);
  return { x: e.x, y: e.y - (map.projection === 'iso' ? level * isoLevelPx() : 0) };
}

function polygon(g, points) {
  g.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
  g.closePath();
}

function tileCorners(map, x, y) {
  const level = levelOf(map, x, y);
  return [at(map, x, y, level), at(map, x + 1, y, level), at(map, x + 1, y + 1, level), at(map, x, y + 1, level)];
}

function shapeOutline(g, map, o) {
  const shape = o.collisionShape;
  const lv = levelOf(map, o.tx, o.ty);
  if (shape.circle) {
    const r = shape.circle * (o.scale || 1);
    const pts = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      pts.push(at(map, o.tx + Math.cos(a) * r, o.ty + Math.sin(a) * r, lv));
    }
    polygon(g, pts);
  } else if (shape.rect) {
    const w = (shape.rect[0] * (o.scale || 1)) / 2;
    const d = (shape.rect[1] * (o.scale || 1)) / 2;
    polygon(g, [at(map, o.tx - w, o.ty - d, lv), at(map, o.tx + w, o.ty - d, lv), at(map, o.tx + w, o.ty + d, lv), at(map, o.tx - w, o.ty + d, lv)]);
  }
}

// Mouse -> tile: shared with mouse aiming (core/pointer.js).
export { pointerToWorld as pickTile } from '../core/pointer.js';

// Tile rectangle covering the screen (generic for both projections).
function visibleRange(renderer, map) {
  const pad = 2;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const left = -renderer.offsetX;
  const top = -renderer.offsetY;
  for (const [sx, sy] of [[left, top], [left + renderer.width, top], [left, top + renderer.height], [left + renderer.width, top + renderer.height]]) {
    const w = screenToWorld(sx, sy);
    x0 = Math.min(x0, w.tx);
    x1 = Math.max(x1, w.tx);
    y0 = Math.min(y0, w.ty);
    y1 = Math.max(y1, w.ty);
  }
  return {
    x0: Math.max(0, Math.floor(x0) - pad),
    y0: Math.max(0, Math.floor(y0) - pad),
    x1: Math.min(map.width - 1, Math.ceil(x1) + pad),
    y1: Math.min(map.height - 1, Math.ceil(y1) + pad * 4)
  };
}

// ------------------------------------------------------------------ static layers

// Draws collision / grid / object outlines of the tiles x0..x1, y0..y1 onto g.
// g must use entity-pixel coordinates; px = one screen pixel in entity pixels.
function drawStatic(g, map, layers, x0, y0, x1, y1, px, objects) {
  if (layers.collision && map.collision) {
    const c = map.collision;
    const k = c.cellsPerTile;
    g.globalAlpha = 0.42;
    for (let cy = y0 * k; cy <= (y1 + 1) * k - 1; cy++) {
      for (let cx = x0 * k; cx <= (x1 + 1) * k - 1; cx++) {
        const code = c.codeAtCell(cx, cy);
        if (!code) continue;
        const lv = levelOf(map, cx / k, cy / k);
        g.fillStyle = COLLISION_DEBUG_COLORS[code] || '#ffffff';
        g.beginPath();
        polygon(g, [at(map, cx / k, cy / k, lv), at(map, (cx + 1) / k, cy / k, lv), at(map, (cx + 1) / k, (cy + 1) / k, lv), at(map, cx / k, (cy + 1) / k, lv)]);
        g.fill();
      }
    }
    g.globalAlpha = 1;
  }
  if (layers.grid) {
    g.lineWidth = px;
    g.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    g.beginPath();
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) polygon(g, tileCorners(map, x, y));
    g.stroke();
    if (map.chunks) {
      const size = map.chunks.size;
      g.lineWidth = 2 * px;
      g.strokeStyle = 'rgba(80, 220, 255, 0.9)';
      g.beginPath();
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const c = tileCorners(map, x, y);
          if (x % size === 0) { g.moveTo(c[0].x, c[0].y); g.lineTo(c[3].x, c[3].y); }
          if (y % size === 0) { g.moveTo(c[0].x, c[0].y); g.lineTo(c[1].x, c[1].y); }
        }
      }
      g.stroke();
    }
  }
  if (layers.object && objects.length) {
    g.lineWidth = px;
    g.strokeStyle = 'rgba(255, 210, 70, 0.9)';
    g.beginPath();
    for (const o of objects) if (o.collisionShape) shapeOutline(g, map, o);
    g.stroke();
    for (const o of objects) {
      const p = at(map, o.tx, o.ty);
      g.fillStyle = o.collisionShape ? '#ffd24a' : '#9fe0a0';
      g.fillRect(p.x - 1.5 * px, p.y - 1.5 * px, 3 * px, 3 * px);
    }
  }
}

const cache = { key: '', blocks: new Map() };

// One cached block of static debug layers (isometric maps).
function staticBlock(renderer, map, layers, bx, by) {
  const key = `${bx},${by}`;
  if (cache.blocks.has(key)) return cache.blocks.get(key);
  const k = renderer.scale;
  const x0 = bx * BLOCK;
  const y0 = by * BLOCK;
  const x1 = Math.min(map.width - 1, x0 + BLOCK - 1);
  const y1 = Math.min(map.height - 1, y0 + BLOCK - 1);
  // bounds in entity pixels (all levels + a margin for shapes that stick out)
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of [[x0, y0], [x1 + 1, y0], [x0, y1 + 1], [x1 + 1, y1 + 1]]) {
    const e = groundToScreen(x, y);
    minX = Math.min(minX, e.x);
    maxX = Math.max(maxX, e.x);
    minY = Math.min(minY, e.y);
    maxY = Math.max(maxY, e.y);
  }
  const margin = 24;
  minX -= margin;
  maxX += margin;
  minY -= margin + (map._maxLevel || 2) * isoLevelPx();
  maxY += margin;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil((maxX - minX) * k));
  canvas.height = Math.max(1, Math.ceil((maxY - minY) * k));
  const g = canvas.getContext('2d');
  g.setTransform(k, 0, 0, k, -minX * k, -minY * k);
  const objects = map.chunks.inTileRange(x0, y0, x1, y1, []).flatMap((c) => c.objects)
    .filter((o) => o.tx >= x0 && o.tx < x1 + 1 && o.ty >= y0 && o.ty < y1 + 1);
  drawStatic(g, map, layers, x0, y0, x1, y1, 1 / k, objects);
  const block = { canvas, x: minX, y: minY };
  cache.blocks.set(key, block);
  return block;
}

// ------------------------------------------------------------------ frame

export function drawDebugOverlay(renderer, scene, state) {
  const map = scene.map;
  const g = renderer.ctx;
  const px = 1 / renderer.scale; // one screen pixel, in entity pixels
  const range = visibleRange(renderer, map);
  const layers = state.layers;
  renderer.useEntityTransform();
  g.save();

  // ---- static layers
  if (map.projection === 'iso') {
    const key = `${map.id}|${renderer.scale}|${isoLevelPx()}|${layers.collision}|${layers.grid}|${layers.object}`;
    if (key !== cache.key) {
      cache.key = key;
      cache.blocks.clear();
    }
    if (layers.collision || layers.grid || layers.object) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      for (let by = Math.floor(range.y0 / BLOCK); by <= Math.floor(range.y1 / BLOCK); by++) {
        for (let bx = Math.floor(range.x0 / BLOCK); bx <= Math.floor(range.x1 / BLOCK); bx++) {
          const b = staticBlock(renderer, map, layers, bx, by);
          const p = renderer.toDevice(b.x, b.y);
          g.drawImage(b.canvas, Math.round(p.x), Math.round(p.y));
        }
      }
      renderer.useEntityTransform();
    }
  } else {
    // small painted maps: draw directly (their collision view comes from map-renderer)
    const objects = (map.objects || []).map((o, i) => ({ ...o, id: `${o.type}#${i}`, asset: o.type }));
    drawStatic(g, map, { ...layers, collision: false }, range.x0, range.y0, range.x1, range.y1, px, objects);
  }

  // ---- labels of objects near the mouse
  if (layers.object && state.hover && map.chunks) {
    const h = state.hover;
    for (const chunk of map.chunks.inTileRange(h.tx - LABEL_RADIUS, h.ty - LABEL_RADIUS, h.tx + LABEL_RADIUS, h.ty + LABEL_RADIUS, [])) {
      for (const o of chunk.objects) {
        if (Math.hypot(o.tx - h.tx, o.ty - h.ty) >= LABEL_RADIUS) continue;
        const p = at(map, o.tx, o.ty);
        renderer.overlayText(o.id, p.x, p.y + 6 * px, { size: 10, color: '#ffe9a8' });
      }
    }
  }

  // ---- moving things + markers
  if (layers.object) {
    const marker = (tx, ty, color, label) => {
      const p = at(map, tx, ty);
      g.fillStyle = color;
      g.beginPath();
      polygon(g, [{ x: p.x, y: p.y - 5 * px }, { x: p.x + 5 * px, y: p.y }, { x: p.x, y: p.y + 5 * px }, { x: p.x - 5 * px, y: p.y }]);
      g.fill();
      if (label) renderer.overlayText(label, p.x, p.y - 10 * px, { size: 11, color });
    };
    for (const npc of scene.npcs) marker(npc.tx, npc.ty, '#7fd0ff', `NPC ${npc.id}`);
    for (const m of scene.monsters) if (m.alive) marker(m.tx, m.ty, '#ff7070', null);
    for (const [name, p] of Object.entries(map.spawns)) marker(p.tx, p.ty, '#60ff80', `spawn: ${name}`);
    g.strokeStyle = '#ff5cf0';
    g.lineWidth = 2 * px;
    for (const e of map.exits) {
      const lv = levelOf(map, e.tx + e.w / 2, e.ty + e.d / 2);
      g.beginPath();
      polygon(g, [at(map, e.tx, e.ty, lv), at(map, e.tx + e.w, e.ty, lv), at(map, e.tx + e.w, e.ty + e.d, lv), at(map, e.tx, e.ty + e.d, lv)]);
      g.stroke();
      const c = at(map, e.tx + e.w / 2, e.ty + e.d / 2, lv);
      renderer.overlayText(`exit ${e.id} → ${e.to} @ ${e.spawn}`, c.x, c.y - 8 * px, { size: 11, color: '#ff9cf5' });
    }
  }

  // ---- secret triggers
  if (layers.secret) {
    g.strokeStyle = '#c070ff';
    g.lineWidth = 2 * px;
    for (const s of map.secrets || []) {
      if (s.tx === undefined) continue;
      const r = s.radius || 1;
      const pts = [];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        pts.push(at(map, s.tx + Math.cos(a) * r, s.ty + Math.sin(a) * r));
      }
      g.beginPath();
      polygon(g, pts);
      g.stroke();
      const c = at(map, s.tx, s.ty);
      renderer.overlayText(`secret ${s.id}`, c.x, c.y, { size: 11, color: '#d9a8ff' });
    }
  }

  // ---- hovered + selected tile
  const highlight = (t, fill, stroke) => {
    if (!t || !map.inBounds(t.tx, t.ty)) return;
    g.beginPath();
    polygon(g, tileCorners(map, Math.floor(t.tx), Math.floor(t.ty)));
    g.fillStyle = fill;
    g.fill();
    g.strokeStyle = stroke;
    g.lineWidth = 2 * px;
    g.stroke();
  };
  highlight(state.hover, 'rgba(255, 255, 255, 0.18)', 'rgba(255, 255, 255, 0.9)');
  highlight(state.selected, 'rgba(255, 220, 80, 0.25)', '#ffd24a');
  g.restore();
}
