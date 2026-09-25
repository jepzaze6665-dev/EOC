// Mouse pointer -> game coordinates.
//
//   pointerToEntity(renderer, mouse)     screen (CSS pixels) -> entity pixels
//   pointerToWorld(renderer, map, mouse) screen (CSS pixels) -> world tile position
//
// On isometric maps the highest terrain level whose tile is under the pointer wins,
// so pointing at a plateau picks the plateau, not the ground "behind" it.
// Used for mouse aiming, clicking targets and the F8 debug tools.

import { screenToWorld, isoLevelPx } from './projection.js';

export function pointerToEntity(renderer, mouse) {
  const dpr = renderer.mode === 'hd' ? renderer.dpr : 1;
  return {
    x: (mouse.x * dpr - renderer.deviceOffsetX) / renderer.scale,
    y: (mouse.y * dpr - renderer.deviceOffsetY) / renderer.scale
  };
}

export function pointerToWorld(renderer, map, mouse) {
  const e = pointerToEntity(renderer, mouse);
  if (map.projection === 'iso' && map.heights) {
    if (map._maxLevel === undefined) map._maxLevel = map.heights.reduce((m, h) => Math.max(m, h), 0);
    for (let level = map._maxLevel; level > 0; level--) {
      const w = screenToWorld(e.x, e.y + level * isoLevelPx());
      if (map.inBounds(w.tx, w.ty) && map.levelAt(Math.floor(w.tx), Math.floor(w.ty)) === level) return w;
    }
  }
  return screenToWorld(e.x, e.y);
}
