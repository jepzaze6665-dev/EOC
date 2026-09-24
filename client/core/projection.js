// Coordinate systems.
//
//   Tile / World coordinate  (tx, ty)  floats, in tiles    -> game logic: movement, ranges, AI
//   Screen coordinate        "entity pixels" - the units characters, effects and the
//                            camera use. The renderer turns them into real screen pixels.
//   Camera coordinate        camera.x / camera.y = the screen point at the centre of the view
//
// Two projections, picked per map (see WorldScene.setMap):
//   'topdown'  painted image maps (the old village/forest): 1 tile = TILE_SIZE px, straight grid
//   'iso'      tile maps: 2:1 diamonds. The size of a diamond in entity pixels depends
//              on the zoom level, so the renderer updates it with setIsoUnit().
//
// Gameplay code must only use the helpers below (never its own maths), so it works
// the same on both kinds of map.

import { ISO } from '../data/iso-config.js';

export const TILE_SIZE = 16; // top-down maps: pixels per tile

let mode = 'topdown';
let isoHalfW = ISO.TILE_W / 4; // half a diamond, in entity pixels (zoom 1: 64 / 2 / ENTITY_SCALE)
let isoHalfH = ISO.TILE_H / 4;
let isoLevel = ISO.LEVEL_H / 2; // one terrain height step, in entity pixels
let heightAt = null;            // (tx, ty) -> terrain height in levels, set per iso map

export function setProjection(next) {
  mode = next === 'iso' ? 'iso' : 'topdown';
}

export function getProjection() {
  return mode;
}

// unit = entity pixels per CSS pixel at the current zoom (see Renderer.resize).
export function setIsoUnit(unit) {
  isoHalfW = (ISO.TILE_W / 2) * unit;
  isoHalfH = (ISO.TILE_H / 2) * unit;
  isoLevel = ISO.LEVEL_H * unit;
}

// Terrain height for iso maps (terraces, plateaus, stairs). null = flat.
export function setHeightFn(fn) {
  heightAt = fn;
}

export function isoLevelPx() {
  return isoLevel;
}

// Screen position of a point ON THE GROUND at height 0 - the renderer uses this for tiles,
// adding each tile's own height itself.
export function groundToScreen(tx, ty) {
  if (mode === 'iso') return { x: (tx - ty) * isoHalfW, y: (tx + ty) * isoHalfH };
  return { x: tx * TILE_SIZE, y: ty * TILE_SIZE };
}

// Screen position of something standing at (tx, ty): on iso maps it is lifted by the
// terrain height there, so characters walk up stairs and stand on plateaus.
export function worldToScreen(tx, ty) {
  if (mode === 'iso') {
    const lift = heightAt ? heightAt(tx, ty) * isoLevel : 0;
    return { x: (tx - ty) * isoHalfW, y: (tx + ty) * isoHalfH - lift };
  }
  return { x: tx * TILE_SIZE, y: ty * TILE_SIZE };
}

// Exact inverse of groundToScreen (mouse picking, debug tools). Ignores terrain height.
export function screenToWorld(sx, sy) {
  if (mode === 'iso') {
    const a = sx / isoHalfW;
    const b = sy / isoHalfH;
    return { tx: (a + b) / 2, ty: (b - a) / 2 };
  }
  return { tx: sx / TILE_SIZE, ty: sy / TILE_SIZE };
}

// A movement given as a SCREEN direction (WASD, dash, projectile facing) whose length is
// in TILES. Returns the world movement with that same length, so speed is equal in
// every direction on both projections.
export function screenVectorToWorld(dx, dy) {
  const length = Math.hypot(dx, dy);
  if (length === 0) return { tx: 0, ty: 0 };
  if (mode !== 'iso') return { tx: dx, ty: dy };
  // on a 2:1 diamond, screen right = (+1, -1) in tiles and screen down = (+1, +1) * 2
  const wx = dx + 2 * dy;
  const wy = 2 * dy - dx;
  const k = length / Math.hypot(wx, wy);
  return { tx: wx * k, ty: wy * k };
}

// A direction on the map -> the same direction on screen (for aiming cones, facing).
export function worldVectorToScreen(dx, dy) {
  if (mode === 'iso') return { x: dx - dy, y: (dx + dy) / 2 };
  return { x: dx, y: dy };
}

// Draw order: whatever is further "south" on screen is drawn later and covers what is behind.
// The tiny x term only keeps the order stable when two things share the same row.
export function depthOf(tx, ty) {
  if (mode === 'iso') return tx + ty + tx * 0.0001;
  return ty + tx * 0.0001;
}

export function facingFromScreenVector(dx, dy) {
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dy) >= Math.abs(dx)) return dy > 0 ? 's' : 'n';
  return dx > 0 ? 'e' : 'w';
}

export function facingFromWorldVector(dx, dy) {
  const v = worldVectorToScreen(dx, dy);
  return facingFromScreenVector(v.x, v.y);
}
