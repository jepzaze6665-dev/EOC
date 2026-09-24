// Image helpers for the asset tools (Node only). Images are { width, height, data }
// with RGBA data, as returned by lib/png.mjs.

import { createImage } from './png.mjs';

const idx = (img, x, y) => (y * img.width + x) * 4;

// ------------------------------------------------------------------ background removal
//
// The AI tile sheets have a light-grey / white CHECKERBOARD painted into the picture
// (it only looks transparent). A pixel counts as "background-like" when it is very
// light and almost colourless. We remove background-like regions that either touch
// the sheet border or are big (the checkerboard between pieces), but keep small
// light specks inside a sprite (white flowers, water sparkles).

export function isBackgroundLike(r, g, b, { minLight = 222, maxSat = 14 } = {}) {
  return Math.min(r, g, b) >= minLight && Math.max(r, g, b) - Math.min(r, g, b) <= maxSat;
}

export function removeBackground(img, { minLight = 222, maxSat = 14, minRegion = 400, fringe = 3 } = {}) {
  const { width, height, data } = img;
  const n = width * height;
  const bgLike = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const k = i * 4;
    if (data[k + 3] > 0 && isBackgroundLike(data[k], data[k + 1], data[k + 2], { minLight, maxSat })) bgLike[i] = 1;
  }

  // connected regions of background-like pixels (4-way)
  const region = new Int32Array(n).fill(-1);
  const remove = new Uint8Array(n);
  const stack = [];
  let regionId = 0;
  for (let start = 0; start < n; start++) {
    if (!bgLike[start] || region[start] !== -1) continue;
    const members = [];
    let touchesBorder = false;
    stack.push(start);
    region[start] = regionId;
    while (stack.length) {
      const i = stack.pop();
      members.push(i);
      const x = i % width;
      const y = (i - x) / width;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesBorder = true;
      if (x > 0 && bgLike[i - 1] && region[i - 1] === -1) { region[i - 1] = regionId; stack.push(i - 1); }
      if (x < width - 1 && bgLike[i + 1] && region[i + 1] === -1) { region[i + 1] = regionId; stack.push(i + 1); }
      if (y > 0 && bgLike[i - width] && region[i - width] === -1) { region[i - width] = regionId; stack.push(i - width); }
      if (y < height - 1 && bgLike[i + width] && region[i + width] === -1) { region[i + width] = regionId; stack.push(i + width); }
    }
    // Small pockets trapped inside a sprite (gaps between leaves) are removed too when
    // they are the exact checkerboard greys - real white details (petals, sparkles)
    // are rarely that colourless.
    let pocketIsChecker = false;
    if (!touchesBorder && members.length < minRegion && members.length >= 4) {
      let strict = 0;
      for (const i of members) {
        const k = i * 4;
        const lo = Math.min(data[k], data[k + 1], data[k + 2]);
        const hi = Math.max(data[k], data[k + 1], data[k + 2]);
        if (lo >= 232 && hi - lo <= 4) strict++;
      }
      pocketIsChecker = strict / members.length > 0.85;
    }
    if (touchesBorder || members.length >= minRegion || pocketIsChecker) for (const i of members) remove[i] = 1;
    regionId++;
  }

  // the anti-aliased halo around each sprite: light, greyish pixels next to removed ones
  for (let pass = 0; pass < fringe; pass++) {
    const next = remove.slice();
    for (let i = 0; i < n; i++) {
      if (remove[i]) continue;
      const x = i % width;
      const y = (i - x) / width;
      const nearRemoved =
        (x > 0 && remove[i - 1]) || (x < width - 1 && remove[i + 1]) ||
        (y > 0 && remove[i - width]) || (y < height - 1 && remove[i + width]);
      if (!nearRemoved) continue;
      const k = i * 4;
      if (isBackgroundLike(data[k], data[k + 1], data[k + 2], { minLight: minLight - 30, maxSat: maxSat + 12 })) next[i] = 1;
    }
    remove.set(next);
  }

  const out = createImage(width, height);
  data.copy(out.data);
  for (let i = 0; i < n; i++) if (remove[i]) out.data[i * 4 + 3] = 0;
  return out;
}

// ------------------------------------------------------------------ pieces

// Bounding boxes of opaque pixel groups (8-way). Groups closer than `mergeGap`
// pixels are merged, so a flower with separate petals is one piece.
export function findPieces(img, { minPixels = 60, mergeGap = 6 } = {}) {
  const { width, height, data } = img;
  const n = width * height;
  const seen = new Uint8Array(n);
  const boxes = [];
  const stack = [];
  for (let start = 0; start < n; start++) {
    if (seen[start] || data[start * 4 + 3] === 0) continue;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let count = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop();
      const x = i % width;
      const y = (i - x) / width;
      count++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const j = ny * width + nx;
          if (!seen[j] && data[j * 4 + 3] > 0) {
            seen[j] = 1;
            stack.push(j);
          }
        }
      }
    }
    if (count >= minPixels) boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, pixels: count });
  }

  // merge boxes that overlap or nearly touch
  let merged = true;
  while (merged) {
    merged = false;
    for (let a = 0; a < boxes.length && !merged; a++) {
      for (let b = a + 1; b < boxes.length && !merged; b++) {
        const A = boxes[a];
        const B = boxes[b];
        const close =
          A.x - mergeGap <= B.x + B.w && B.x - mergeGap <= A.x + A.w &&
          A.y - mergeGap <= B.y + B.h && B.y - mergeGap <= A.y + A.h;
        if (!close) continue;
        const x = Math.min(A.x, B.x);
        const y = Math.min(A.y, B.y);
        boxes[a] = { x, y, w: Math.max(A.x + A.w, B.x + B.w) - x, h: Math.max(A.y + A.h, B.y + B.h) - y, pixels: A.pixels + B.pixels };
        boxes.splice(b, 1);
        merged = true;
      }
    }
  }

  // reading order: rows (by vertical centre), then left to right
  boxes.sort((A, B) => (A.y + A.h / 2) - (B.y + B.h / 2));
  const rows = [];
  for (const box of boxes) {
    const cy = box.y + box.h / 2;
    const row = rows.find((r) => Math.abs(r.cy - cy) < Math.max(40, box.h * 0.35));
    if (row) row.items.push(box);
    else rows.push({ cy, items: [box] });
  }
  return rows.flatMap((r) => r.items.sort((A, B) => A.x - B.x));
}

export function crop(img, x, y, w, h) {
  const out = createImage(w, h);
  for (let j = 0; j < h; j++) {
    const sy = y + j;
    if (sy < 0 || sy >= img.height) continue;
    for (let i = 0; i < w; i++) {
      const sx = x + i;
      if (sx < 0 || sx >= img.width) continue;
      img.data.copy(out.data, (j * w + i) * 4, idx(img, sx, sy), idx(img, sx, sy) + 4);
    }
  }
  return out;
}

// High-quality downscale (area average with premultiplied alpha, so transparent
// pixels never darken the edges). Also works for mild upscaling.
export function resize(img, newW, newH) {
  const out = createImage(newW, newH);
  const sx = img.width / newW;
  const sy = img.height / newH;
  for (let y = 0; y < newH; y++) {
    const y0 = y * sy;
    const y1 = y0 + sy;
    for (let x = 0; x < newW; x++) {
      const x0 = x * sx;
      const x1 = x0 + sx;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let area = 0;
      for (let py = Math.floor(y0); py < Math.ceil(y1); py++) {
        const wy = Math.min(y1, py + 1) - Math.max(y0, py);
        if (wy <= 0 || py >= img.height) continue;
        for (let px = Math.floor(x0); px < Math.ceil(x1); px++) {
          const wx = Math.min(x1, px + 1) - Math.max(x0, px);
          if (wx <= 0 || px >= img.width) continue;
          const w = wx * wy;
          const k = idx(img, px, py);
          const alpha = img.data[k + 3] / 255;
          r += img.data[k] * alpha * w;
          g += img.data[k + 1] * alpha * w;
          b += img.data[k + 2] * alpha * w;
          a += alpha * w;
          area += w;
        }
      }
      const k = (y * newW + x) * 4;
      if (a > 0) {
        out.data[k] = Math.round(r / a);
        out.data[k + 1] = Math.round(g / a);
        out.data[k + 2] = Math.round(b / a);
      }
      const alpha = area > 0 ? a / area : 0;
      // hard-ish edge: keep sprites crisp instead of semi-transparent fuzz
      out.data[k + 3] = alpha < 0.35 ? 0 : alpha > 0.75 ? 255 : Math.round(alpha * 255);
    }
  }
  return out;
}

// Trim fully transparent borders.
export function trim(img) {
  let minX = img.width;
  let minY = img.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[idx(img, x, y) + 3] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return { image: createImage(1, 1), x: 0, y: 0 };
  return { image: crop(img, minX, minY, maxX - minX + 1, maxY - minY + 1), x: minX, y: minY };
}

// ------------------------------------------------------------------ drawing (for contact sheets)

export function fillRect(img, x, y, w, h, [r, g, b, a = 255]) {
  for (let j = Math.max(0, y); j < Math.min(img.height, y + h); j++) {
    for (let i = Math.max(0, x); i < Math.min(img.width, x + w); i++) {
      const k = idx(img, i, j);
      img.data[k] = r;
      img.data[k + 1] = g;
      img.data[k + 2] = b;
      img.data[k + 3] = a;
    }
  }
}

export function strokeRect(img, x, y, w, h, color, t = 2) {
  fillRect(img, x, y, w, t, color);
  fillRect(img, x, y + h - t, w, t, color);
  fillRect(img, x, y, t, h, color);
  fillRect(img, x + w - t, y, t, h, color);
}

// 3x5 digit font
const DIGITS = [
  '111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
  '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'
];

export function drawNumber(img, x, y, value, scale = 4, color = [255, 255, 255], bg = [200, 0, 120]) {
  const text = String(value);
  fillRect(img, x - scale, y - scale, text.length * 4 * scale + scale, 7 * scale, bg);
  for (let c = 0; c < text.length; c++) {
    const bits = DIGITS[Number(text[c])];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        if (bits[row * 3 + col] === '1') fillRect(img, x + (c * 4 + col) * scale, y + row * scale, scale, scale, color);
      }
    }
  }
}
