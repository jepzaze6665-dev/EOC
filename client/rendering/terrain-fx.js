// Terrain effects - the pieces that make tile ground look painted instead of stamped.
//
//   Blending   where two kinds of ground meet (grass / dirt / stone), the stronger one
//              creeps over the border with a ragged, noisy edge and a thin shadow line,
//              instead of stopping at the diamond's straight edge.
//   Foam       a broken white line where water touches land in front of it.
//   Occlusion  a soft dark band at the foot of a cliff face (ambient occlusion).
//   Shade      a dark wash over deep-forest ground.
//   Shadow     one soft ellipse picture, stretched under trees, rocks and buildings.
//
// Every mask is generated once per zoom level in tile-sprite pixels and reused for every
// tile. Masks are continuous across tiles: at a diamond's corners every mask has the
// same depth, so neighbouring tiles' edges always join up.

import { ISO } from '../data/iso-config.js';

// neighbour directions in tile coordinates, and which diamond edge they touch
//   -x = upper-left edge   +x = lower-right edge   -y = upper-right edge   +y = lower-left edge
export const EDGE_DIRS = [
  { key: 'mx', dx: -1, dy: 0 },
  { key: 'px', dx: 1, dy: 0 },
  { key: 'my', dx: 0, dy: -1 },
  { key: 'py', dx: 0, dy: 1 }
];
//   corners: top (-x,-y)  right (+x,-y)  bottom (+x,+y)  left (-x,+y)
export const CORNER_DIRS = [
  { key: 'top', dx: -1, dy: -1 },
  { key: 'right', dx: 1, dy: -1 },
  { key: 'bottom', dx: 1, dy: 1 },
  { key: 'left', dx: -1, dy: 1 }
];

const VARIANTS = 4;

function hash(a, b, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// A wiggly line 0..1 -> -1..1 made of a few sines with per-variant phases.
function wiggle(t, variant, salt) {
  let sum = 0;
  for (let i = 1; i <= 3; i++) sum += Math.sin(t * Math.PI * (i * 2 + 1) + hash(variant, i, salt) * 6.283) / i;
  return sum / 1.83;
}

export class TerrainFx {
  constructor() {
    this.scale = null;
  }

  // s = screen pixels per CSS pixel at the current zoom. Builds every mask for that size.
  prepare(s) {
    if (s === this.scale) return;
    this.scale = s;
    // same geometry as a scaled ground tile (see asset-store: tiles get +2 px)
    this.hw = (ISO.TILE_W * s) / 2 + 1;
    this.hh = this.hw / 2;
    this.w = Math.ceil(this.hw * 2) + 2;
    this.h = Math.ceil(this.hh * 2 + this.hw * 0.25) + 2; // room for the tile's side thickness
    this.ax = this.w / 2;
    this.ay = this.hh + 1;

    this.edge = {};
    this.corner = {};
    this.foam = {};
    this.ao = {};
    for (const d of EDGE_DIRS) {
      this.edge[d.key] = [];
      this.foam[d.key] = [];
      for (let v = 0; v < VARIANTS; v++) {
        this.edge[d.key].push(this.makeEdge(d.key, v));
        this.foam[d.key].push(this.makeFoam(d.key, v));
      }
      this.ao[d.key] = this.makeAo(d.key);
    }
    for (const c of CORNER_DIRS) {
      this.corner[c.key] = [];
      for (let v = 0; v < VARIANTS; v++) this.corner[c.key].push(this.makeCorner(c.key, v));
    }
    this.shade = this.makeShade();
    this.temp = document.createElement('canvas');
    this.shadowSprite = this.shadowSprite || this.makeShadowSprite();
  }

  // Tile-local coordinates of a pixel: u runs along tile x, v along tile y, 0..1 on the diamond.
  uv(px, py) {
    const dx = px + 0.5 - this.ax;
    const dy = py + 0.5 - this.ay;
    return { u: (dx / this.hw + dy / this.hh) / 2 + 0.5, v: (dy / this.hh - dx / this.hw) / 2 + 0.5 };
  }

  // Pixel mask from a test (u, v, px, py) -> alpha 0..1. Pixels outside the diamond but
  // below it (the tile's thickness) are clamped onto its lower edges so they match too.
  paint(test) {
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    const g = c.getContext('2d');
    const img = g.createImageData(this.w, this.h);
    for (let py = 0; py < this.h; py++) {
      for (let px = 0; px < this.w; px++) {
        let { u, v } = this.uv(px, py);
        const below = u > 1 || v > 1;
        if (u < -0.02 || v < -0.02) continue;
        if (below && (u > 1.6 || v > 1.6)) continue;
        u = Math.min(1, Math.max(0, u));
        v = Math.min(1, Math.max(0, v));
        const a = test(u, v, px, py);
        if (a > 0) img.data[(py * this.w + px) * 4 + 3] = Math.round(Math.min(1, a) * 255);
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // depth of a point from the edge a direction touches, and its position along that edge
  static edgeCoords(key, u, v) {
    if (key === 'mx') return { depth: u, along: v };
    if (key === 'px') return { depth: 1 - u, along: v };
    if (key === 'my') return { depth: v, along: u };
    return { depth: 1 - v, along: u };
  }

  // Grass-over-dirt style border: ragged pixel edge + a darker rim just beyond it.
  makeEdge(key, variant) {
    const limit = (along) => 0.17 + 0.16 * Math.sin(Math.PI * along) * (0.55 + 0.45 * wiggle(along, variant, 1));
    const mask = this.paint((u, v, px, py) => {
      const { depth, along } = TerrainFx.edgeCoords(key, u, v);
      return depth < limit(along) + (hash(px, py, variant) - 0.5) * 0.05 ? 1 : 0;
    });
    const rim = this.paint((u, v, px, py) => {
      const { depth, along } = TerrainFx.edgeCoords(key, u, v);
      const t = limit(along);
      return depth >= t - 0.01 && depth < t + 0.045 + (hash(py, px, variant) - 0.5) * 0.03 ? 0.32 : 0;
    });
    return { mask, rim: this.tint(rim, '#12160a') };
  }

  makeCorner(key, variant) {
    const center = { top: [0, 0], right: [1, 0], bottom: [1, 1], left: [0, 1] }[key];
    const mask = this.paint((u, v, px, py) => {
      const d = Math.hypot(u - center[0], v - center[1]);
      const angle = Math.atan2(v - center[1], u - center[0]);
      return d < 0.2 + 0.06 * wiggle(angle / Math.PI, variant, 2) + (hash(px, py, variant + 9) - 0.5) * 0.05 ? 1 : 0;
    });
    return { mask, rim: null };
  }

  makeFoam(key, variant) {
    const foam = this.paint((u, v, px, py) => {
      const { depth, along } = TerrainFx.edgeCoords(key, u, v);
      const t = 0.035 + 0.035 * (0.5 + 0.5 * wiggle(along, variant, 3));
      if (depth > t) return 0;
      return hash(px, py, variant + 5) < 0.75 ? 0.7 : 0.25;
    });
    return this.tint(foam, '#e8f6ff');
  }

  makeAo(key) {
    const ao = this.paint((u, v) => {
      const { depth } = TerrainFx.edgeCoords(key, u, v);
      return depth < 0.5 ? 0.5 * (1 - depth / 0.5) ** 1.6 : 0;
    });
    return this.tint(ao, '#050805');
  }

  makeShade() {
    const shade = this.paint(() => 0.3);
    return this.tint(shade, '#04120a');
  }

  // Fill a mask with one colour, keeping the mask's alpha.
  tint(mask, color) {
    const g = mask.getContext('2d');
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, mask.width, mask.height);
    g.globalCompositeOperation = 'source-over';
    return mask;
  }

  // Draws `sprite` (a scaled ground tile of a neighbouring kind) onto g, cut to `mask`,
  // with the tile's anchor at (x, y).
  drawMasked(g, sprite, mask, x, y) {
    const t = this.temp;
    if (t.width < sprite.canvas.width || t.height < sprite.canvas.height) {
      t.width = Math.max(t.width, sprite.canvas.width);
      t.height = Math.max(t.height, sprite.canvas.height);
    }
    const tg = t.getContext('2d');
    tg.globalCompositeOperation = 'source-over';
    tg.clearRect(0, 0, t.width, t.height);
    tg.drawImage(sprite.canvas, 0, 0);
    tg.globalCompositeOperation = 'destination-in';
    tg.drawImage(mask, sprite.ax - this.ax, sprite.ay - this.ay);
    tg.globalCompositeOperation = 'source-over';
    g.drawImage(t, 0, 0, sprite.canvas.width, sprite.canvas.height, x - sprite.ax, y - sprite.ay, sprite.canvas.width, sprite.canvas.height);
  }

  // A ready-made overlay (rim, foam, occlusion, shade) with the tile anchor at (x, y).
  drawOverlay(g, overlay, x, y) {
    g.drawImage(overlay, x - this.ax, y - this.ay);
  }

  variant(x, y, salt) {
    return Math.floor(hash(x, y, salt) * VARIANTS);
  }

  makeShadowSprite() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 32;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 16, 2, 32, 16, 32);
    grad.addColorStop(0, 'rgba(8, 14, 6, 0.5)');
    grad.addColorStop(0.55, 'rgba(8, 14, 6, 0.3)');
    grad.addColorStop(1, 'rgba(8, 14, 6, 0)');
    g.setTransform(1, 0, 0, 0.5, 0, 8);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(32, 16, 32, 0, Math.PI * 2);
    g.fill();
    return c;
  }
}
