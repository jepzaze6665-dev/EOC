// Follow camera.
// Camera position (x, y) is the center of the view, in render-buffer screen pixels
// (the same space worldToScreen() returns).
//
// Zoom is a whole-number step, not a float: each step changes the pixel scale by 1
// (e.g. 3x -> 4x). Pixel art stays sharp at any zoom because pixels are never
// stretched by fractional amounts.

export const MIN_ZOOM = -2;
export const MAX_ZOOM = 3;

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.bounds = null;
    this.zoom = 0;
    this.minZoom = MIN_ZOOM;
    this.maxZoom = MAX_ZOOM;
  }

  // Each kind of map has its own zoom steps (pixel maps: -2..+3, iso maps: level 0..2).
  setZoomRange(min, max) {
    this.minZoom = min;
    this.maxZoom = max;
    this.zoom = Math.max(min, Math.min(max, this.zoom));
  }

  snapTo(x, y) {
    this.x = x;
    this.y = y;
  }

  // Exponential smoothing keeps the follow speed frame-rate independent.
  follow(x, y, dt, smoothing = 12) {
    const t = 1 - Math.exp(-smoothing * dt);
    this.x += (x - this.x) * t;
    this.y += (y - this.y) * t;
  }

  zoomBy(step) {
    const next = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + step));
    const changed = next !== this.zoom;
    this.zoom = next;
    return changed;
  }

  resetZoom() {
    this.zoom = 0;
  }

  // bounds = { minX, maxX, minY, maxY } in screen pixels - the map's edges.
  setBounds(bounds) {
    this.bounds = bounds;
  }

  // Keeps the view inside the map. If the map is smaller than the screen on
  // one axis, the camera centers the map on that axis instead.
  clampToBounds(viewW, viewH) {
    if (!this.bounds) return;
    const { minX, maxX, minY, maxY } = this.bounds;

    if (maxX - minX <= viewW) {
      this.x = (minX + maxX) / 2;
    } else {
      this.x = Math.max(minX + viewW / 2, Math.min(this.x, maxX - viewW / 2));
    }

    if (maxY - minY <= viewH) {
      this.y = (minY + maxY) / 2;
    } else {
      this.y = Math.max(minY + viewH / 2, Math.min(this.y, maxY - viewH / 2));
    }
  }

  // The rectangle the camera currently shows, grown by `margin` pixels on every side.
  viewRect(viewW, viewH, margin = 0) {
    return {
      left: this.x - viewW / 2 - margin,
      right: this.x + viewW / 2 + margin,
      top: this.y - viewH / 2 - margin,
      bottom: this.y + viewH / 2 + margin
    };
  }
}
