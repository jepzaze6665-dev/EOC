// Renderer - two ways of getting the world onto the screen.
//
// 'pixel' mode  (title screen, loading screen, painted top-down maps)
//   Everything is drawn into a small buffer canvas, which is then enlarged by a
//   whole number with smoothing off. Crisp, blocky pixel art at any window size.
//   Zoom = one more / one less whole step of enlargement.
//
// 'hd' mode  (isometric tile maps)
//   The canvas has exactly as many pixels as the screen (devicePixelRatio included),
//   so the browser never stretches it - stretching is what blurs a canvas when
//   Windows display scaling is 125% / 150%. Ground and objects are drawn straight
//   onto it from pre-shrunk copies (see asset-store.js). Characters and effects are
//   drawn through a whole-number transform (`scale`), so pixel art stays crisp.
//   Zoom = one of ISO.ZOOM_LEVELS (1.0 / 1.25 / 1.5).
//
// In both modes, entities and the camera work in "entity pixels"; `scale` is how
// many real screen pixels one entity pixel covers.

import { ISO } from '../data/iso-config.js';
import { setIsoUnit } from '../core/projection.js';

const TARGET_BUFFER_HEIGHT = 330; // pixel mode: about how many game pixels tall the view should be
const MIN_SCALE = 2; // below 2x the pixel art is too small to read, and far more tiles are on screen
const MAX_SCALE = 10;

export function baseScaleFor(windowHeight) {
  return Math.max(2, Math.round(windowHeight / TARGET_BUFFER_HEIGHT));
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.display = canvas.getContext('2d');
    this.mode = 'pixel';
    this.zoomStep = 0;       // pixel mode: extra whole steps; hd mode: index into ISO.ZOOM_LEVELS
    this.scale = baseScaleFor(window.innerHeight);
    this.dpr = 1;
    this.hdScale = 1;        // hd mode: screen pixels per CSS pixel at the current zoom

    this.buffer = document.createElement('canvas');
    this.bufferCtx = this.buffer.getContext('2d');
    this.ctx = this.bufferCtx;

    this.queued = [];
    this.queueSize = 0;
    this.overlays = [];
    this.offsetX = 0;        // camera offset in ENTITY pixels (pixel mode) ...
    this.offsetY = 0;
    this.deviceOffsetX = 0;  // ... and in real screen pixels (both modes)
    this.deviceOffsetY = 0;
    this.sizeKey = '';

    this.resize();
  }

  // View size in entity pixels.
  get width() {
    return this.mode === 'hd' ? this.canvas.width / this.scale : this.buffer.width;
  }

  get height() {
    return this.mode === 'hd' ? this.canvas.height / this.scale : this.buffer.height;
  }

  get zoomLevel() {
    return this.mode === 'hd' ? ISO.ZOOM_LEVELS[this.zoomStep] : this.zoomStep;
  }

  setMode(mode) {
    const next = mode === 'hd' ? 'hd' : 'pixel';
    if (next === this.mode) return false;
    this.mode = next;
    this.zoomStep = 0;
    this.sizeKey = '';
    this.resize();
    return true;
  }

  // Zoom step comes from the camera. Returns true when the scale actually changed.
  setZoom(step) {
    if (step === this.zoomStep) return false;
    this.zoomStep = step;
    this.resize();
    return true;
  }

  resize() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);

    if (this.mode === 'hd') {
      const dpr = window.devicePixelRatio || 1;
      this.zoomStep = Math.max(0, Math.min(ISO.ZOOM_LEVELS.length - 1, this.zoomStep));
      const hdScale = ISO.ZOOM_LEVELS[this.zoomStep] * dpr;
      const key = `hd:${w}x${h}@${dpr}:${this.zoomStep}`;
      if (key === this.sizeKey) return;
      this.sizeKey = key;
      this.dpr = dpr;
      this.hdScale = hdScale;
      this.scale = Math.max(1, Math.round(ISO.ENTITY_SCALE * hdScale));
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.ctx = this.display;
      this.display.imageSmoothingEnabled = false;
      // one CSS pixel at this zoom = hdScale screen pixels = hdScale / scale entity pixels
      setIsoUnit(hdScale / this.scale);
      return;
    }

    const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, baseScaleFor(h) + this.zoomStep));
    const key = `px:${w}x${h}@${scale}`;
    if (key === this.sizeKey) return;
    this.sizeKey = key;
    this.dpr = 1;
    this.scale = scale;
    this.canvas.width = w;
    this.canvas.height = h;
    this.buffer.width = Math.ceil(w / this.scale);
    this.buffer.height = Math.ceil(h / this.scale);
    this.ctx = this.bufferCtx;
    this.display.imageSmoothingEnabled = false;
    this.ctx.imageSmoothingEnabled = false;
  }

  // Menu background rendering: no camera transform (pixel mode only).
  beginScreen(clearColor = '#07070f') {
    this.setMode('pixel');
    this.resize();
    this.offsetX = 0;
    this.offsetY = 0;
    this.deviceOffsetX = 0;
    this.deviceOffsetY = 0;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = clearColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  beginWorld(camera, clearColor = '#07070f') {
    this.resize();
    const g = this.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = clearColor;

    if (this.mode === 'hd') {
      g.fillRect(0, 0, this.canvas.width, this.canvas.height);
      // whole screen pixels, so nothing shimmers while the camera glides
      this.deviceOffsetX = Math.round(this.canvas.width / 2 - camera.x * this.scale);
      this.deviceOffsetY = Math.round(this.canvas.height / 2 - camera.y * this.scale);
      this.offsetX = this.deviceOffsetX / this.scale;
      this.offsetY = this.deviceOffsetY / this.scale;
      this.useEntityTransform();
      return;
    }

    g.fillRect(0, 0, this.width, this.height);
    // Rounding the camera offset keeps sprites on whole pixels (no shimmering).
    this.offsetX = Math.round(this.width / 2 - camera.x);
    this.offsetY = Math.round(this.height / 2 - camera.y);
    this.deviceOffsetX = this.offsetX * this.scale;
    this.deviceOffsetY = this.offsetY * this.scale;
    g.setTransform(1, 0, 0, 1, this.offsetX, this.offsetY);
  }

  // hd mode: switch the context back to entity pixels (after drawing in screen pixels).
  useEntityTransform() {
    if (this.mode !== 'hd') {
      this.ctx.setTransform(1, 0, 0, 1, this.offsetX, this.offsetY);
      return;
    }
    this.ctx.setTransform(this.scale, 0, 0, this.scale, this.deviceOffsetX, this.deviceOffsetY);
    this.ctx.imageSmoothingEnabled = false;
  }

  // Entity pixels -> real screen pixels.
  toDevice(x, y) {
    return { x: x * this.scale + this.deviceOffsetX, y: y * this.scale + this.deviceOffsetY };
  }

  drawSprite(sprite, x, y) {
    if (!sprite) return;
    this.ctx.drawImage(sprite.canvas, Math.round(x - sprite.ax), Math.round(y - sprite.ay));
  }

  // Depth-sorted pass: everything queued here is drawn back-to-front on flush().
  // depth = how far "south" on the map (Y sort). When two things share a depth,
  // the higher layer (see RENDER_LAYERS in map-renderer.js) is drawn on top.
  //
  // Queue entries are recycled from frame to frame (no garbage for the collector).
  // For static map objects the scene passes a ready-made sprite and device-pixel position
  // instead of a function (queueSprite) - the cheapest way to draw hundreds of trees.
  queue(depth, drawFn, layer = 4) {
    const item = this.nextItem();
    item.depth = depth;
    item.layer = layer;
    item.drawFn = drawFn;
    item.canvas = null;
  }

  // Draws `canvas` with its top-left at (x, y) in real screen pixels.
  queueSprite(depth, canvas, x, y, layer = 3) {
    const item = this.nextItem();
    item.depth = depth;
    item.layer = layer;
    item.drawFn = null;
    item.canvas = canvas;
    item.x = x;
    item.y = y;
  }

  nextItem() {
    if (this.queueSize === this.queued.length) this.queued.push({});
    return this.queued[this.queueSize++];
  }

  flush() {
    const items = this.queued;
    const n = this.queueSize;
    const active = items.length === n ? items : (this.sortBuffer = items.slice(0, n));
    active.sort((a, b) => a.depth - b.depth || a.layer - b.layer);
    const g = this.ctx;
    let deviceSpace = false;
    for (let i = 0; i < n; i++) {
      const item = active[i];
      if (item.canvas) {
        if (!deviceSpace) {
          g.setTransform(1, 0, 0, 1, 0, 0);
          deviceSpace = true;
        }
        g.drawImage(item.canvas, item.x, item.y);
      } else {
        if (deviceSpace) {
          this.useEntityTransform();
          deviceSpace = false;
        }
        item.drawFn(g);
      }
    }
    if (deviceSpace) this.useEntityTransform();
    // keep the pooled entries in their slots for next frame
    if (active !== items) for (let i = 0; i < n; i++) items[i] = active[i];
    this.queueSize = 0;
  }

  // Text drawn at display resolution (after upscaling) so labels stay readable.
  overlayText(text, worldX, worldY, options = {}) {
    this.overlays.push({ text, worldX, worldY, options });
  }

  end() {
    const g = this.display;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;

    if (this.mode === 'pixel') {
      g.clearRect(0, 0, this.canvas.width, this.canvas.height);
      // Whole-number upscale only: the buffer may be up to (scale - 1) pixels bigger than
      // the window, and the extra is simply cut off at the right/bottom edge.
      g.drawImage(this.buffer, 0, 0, this.buffer.width * this.scale, this.buffer.height * this.scale);
    }

    if (this.overlays.length === 0) return;
    const fontScale = this.mode === 'hd' ? this.dpr : 1;
    for (const item of this.overlays) {
      const { color = '#e8e8f4', size = 11, align = 'center', outline = '#0a0a14', weight = '600' } = item.options;
      const p = this.toDevice(item.worldX, item.worldY);
      g.font = `${weight} ${Math.round(size * fontScale)}px system-ui, "Segoe UI", sans-serif`;
      g.textAlign = align;
      g.textBaseline = 'middle';
      g.lineWidth = 3 * fontScale;
      g.strokeStyle = outline;
      g.strokeText(item.text, p.x, p.y);
      g.fillStyle = color;
      g.fillText(item.text, p.x, p.y);
    }
    this.overlays.length = 0;
  }

  // ---- full-screen effects, drawn on the display canvas AFTER end()

  // Covers the whole screen (map transitions). alpha 0 = nothing, 1 = solid.
  fadeScreen(alpha, color = '#000000') {
    if (alpha <= 0) return;
    const g = this.display;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = Math.min(1, alpha);
    g.fillStyle = color;
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    g.restore();
  }

  // Text at a position given as a fraction of the screen (0.5, 0.5 = center).
  screenText(text, fx, fy, { size = 24, color = '#f2e6c4', alpha = 1, font = '"Press Start 2P", monospace' } = {}) {
    if (alpha <= 0) return;
    const g = this.display;
    const fontScale = this.mode === 'hd' ? this.dpr : 1;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = Math.min(1, alpha);
    g.font = `${Math.round(size * fontScale)}px ${font}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 6 * fontScale;
    g.strokeStyle = '#07070f';
    const x = this.canvas.width * fx;
    const y = this.canvas.height * fy;
    g.strokeText(text, x, y);
    g.fillStyle = color;
    g.fillText(text, x, y);
    g.restore();
  }
}
