// Isometric coordinate math.
// World space = tile units (floats). Screen space = pixels in the low-res render buffer.

export const TILE_W = 32;
export const TILE_H = 16;

export function worldToScreen(tx, ty) {
  return { x: (tx - ty) * (TILE_W / 2), y: (tx + ty) * (TILE_H / 2) };
}

// The transform is linear, so this also converts a screen-space *vector* into a world-space vector.
export function screenToWorld(sx, sy) {
  return { tx: sx / TILE_W + sy / TILE_H, ty: sy / TILE_H - sx / TILE_W };
}

// Objects further "south" on screen are drawn later so they overlap correctly.
export function depthOf(tx, ty) {
  return tx + ty;
}

export function facingFromScreenVector(dx, dy) {
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dy) >= Math.abs(dx)) return dy > 0 ? 's' : 'n';
  return dx > 0 ? 'e' : 'w';
}
