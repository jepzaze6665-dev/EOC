// Asset Store - the only place that knows which picture file belongs to an asset id.
//
// Map data names assets by id ("grass_01", "pine_03"); client/data/asset-registry.json
// (built by `npm run assets`) maps each id to its file, size, anchor and collision.
// Replacing the art later = rebuilding the registry; map files never change.
//
// Sharpness: files are stored large (ISO.MASTER_SCALE). For the current zoom every
// asset is shrunk ONCE with high-quality filtering into a cached canvas; each frame
// then only copies those canvases 1:1 onto whole screen pixels.

const REGISTRY_URL = 'client/data/asset-registry.json';

// Warm golden colour grade (like the Master Map). It is baked into every cached copy
// once per zoom level instead of being painted over the whole screen every frame.
const GRADE = 'rgba(255, 196, 120, 0.35)';

// Soft-light the grade onto a canvas, keeping the canvas's own transparency.
function applyGrade(canvas, source) {
  const g = canvas.getContext('2d');
  g.globalCompositeOperation = 'soft-light';
  g.fillStyle = GRADE;
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(source, 0, 0, canvas.width, canvas.height);
  g.globalCompositeOperation = 'source-over';
}

export class AssetStore {
  constructor() {
    this.registry = null;
    this.images = new Map();
    this.loading = new Map();
    this.cache = new Map();
    this.cacheScale = null;
  }

  async loadRegistry() {
    if (!this.registry) {
      const response = await fetch(REGISTRY_URL);
      if (!response.ok) throw new Error(`Could not load ${REGISTRY_URL} (${response.status}) - run npm run assets`);
      this.registry = await response.json();
    }
    return this.registry;
  }

  meta(id) {
    return this.registry ? this.registry.assets[id] : null;
  }

  // Loads the picture files for these ids (each file only once, however often it is asked for).
  async ensure(ids) {
    await this.loadRegistry();
    await Promise.all([...new Set(ids)].map((id) => this.loadImage(id)));
  }

  loadImage(id) {
    if (this.images.has(id)) return Promise.resolve();
    if (this.loading.has(id)) return this.loading.get(id);
    const meta = this.meta(id);
    if (!meta) return Promise.reject(new Error(`Unknown asset id "${id}" (not in the asset registry)`));
    const job = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        this.images.set(id, image);
        this.loading.delete(id);
        resolve();
      };
      image.onerror = () => reject(new Error(`Missing asset file ${meta.file}`));
      image.src = meta.file;
    });
    this.loading.set(id, job);
    return job;
  }

  // The asset shrunk for screen scale `s` (screen pixels per CSS pixel at the current zoom),
  // times an optional size `variant` (0.86 / 1 / 1.14 for nature objects), optionally
  // mirrored. Colour-graded. Returns { canvas, ax, ay }: (ax, ay) = anchor inside the canvas.
  scaled(id, s, variant = 1, flip = false) {
    this.useScale(s);
    const key = variant === 1 && !flip ? id : `${id}|${variant}|${flip ? 1 : 0}`;
    let entry = this.cache.get(key);
    if (entry) return entry;
    s *= variant;

    const meta = this.meta(id);
    const image = this.images.get(id);
    if (!meta || !image) return null;

    const k = s / this.registry.masterScale;
    const baseW = Math.max(1, Math.round(meta.w * k));
    // ground tiles get 2 extra pixels so neighbouring diamonds overlap instead of showing hairline gaps
    const w = meta.kind === 'tile' ? baseW + 2 : baseW;
    const h = Math.max(1, Math.round(meta.h * k * (w / baseW)));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    if (flip) g.setTransform(-1, 0, 0, 1, w, 0);
    g.drawImage(image, 0, 0, w, h);
    g.setTransform(1, 0, 0, 1, 0, 0);
    applyGrade(canvas, copyOf(canvas));

    const ax = Math.round((meta.ax / meta.w) * w);
    entry = { canvas, ax: flip ? w - ax : ax, ay: Math.round((meta.ay / meta.h) * h) };
    this.cache.set(key, entry);
    return entry;
  }

  useScale(s) {
    if (s !== this.cacheScale) {
      this.cache.clear(); // only the current zoom's copies are kept in memory
      this.cacheScale = s;
    }
  }

  // A part (cliff face, staircase) stretched to exactly w x h screen pixels.
  fitted(id, w, h, s) {
    this.useScale(s);
    w = Math.max(1, Math.round(w));
    h = Math.max(1, Math.round(h));
    const key = `${id}#${w}x${h}`;
    let canvas = this.cache.get(key);
    if (canvas) return canvas;
    const image = this.images.get(id);
    if (!image) return null;
    canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(image, 0, 0, w, h);
    applyGrade(canvas, copyOf(canvas));
    this.cache.set(key, canvas);
    return canvas;
  }
}

// A snapshot of a canvas (used as the alpha mask when grading it).
function copyOf(canvas) {
  const c = document.createElement('canvas');
  c.width = canvas.width;
  c.height = canvas.height;
  c.getContext('2d').drawImage(canvas, 0, 0);
  return c;
}

export const assetStore = new AssetStore();
