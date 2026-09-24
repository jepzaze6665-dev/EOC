// Tile-sheet indexer:  node tools/index-sheets.mjs
//
// For every sheet listed below it:
//   1. removes the painted checkerboard background
//   2. finds every separate piece (tile, tree, rock ...)
//   3. writes tools/out/sheets/<sheet>-index.png  - the sheet on a dark background,
//      every piece boxed and numbered (read these numbers into tools/asset-src/*.mjs)
//   4. writes tools/out/sheets/<sheet>-pieces.json - the box of every numbered piece

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPng, writePng, createImage } from './lib/png.mjs';
import { removeBackground, findPieces, strokeRect, drawNumber } from './lib/image-ops.mjs';
import { SHEETS } from './asset-src/sheets.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tools', 'out', 'sheets');
fs.mkdirSync(OUT, { recursive: true });

for (const [name, file] of Object.entries(SHEETS)) {
  const t0 = Date.now();
  const clean = removeBackground(readPng(path.join(ROOT, file)));
  const pieces = findPieces(clean);

  const view = createImage(clean.width, clean.height);
  for (let i = 0; i < clean.width * clean.height; i++) {
    const k = i * 4;
    const a = clean.data[k + 3] / 255;
    view.data[k] = Math.round(clean.data[k] * a + 24 * (1 - a));
    view.data[k + 1] = Math.round(clean.data[k + 1] * a + 20 * (1 - a));
    view.data[k + 2] = Math.round(clean.data[k + 2] * a + 40 * (1 - a));
    view.data[k + 3] = 255;
  }
  pieces.forEach((p, i) => {
    strokeRect(view, p.x - 2, p.y - 2, p.w + 4, p.h + 4, [255, 60, 200], 2);
    drawNumber(view, p.x + 2, p.y + 2, i, 4);
  });

  writePng(path.join(OUT, `${name}-index.png`), view);
  fs.writeFileSync(path.join(OUT, `${name}-pieces.json`), JSON.stringify(pieces.map((p, i) => ({ i, ...p }))));
  console.log(`${name}: ${pieces.length} pieces (${Date.now() - t0} ms) -> tools/out/sheets/${name}-index.png`);
}
