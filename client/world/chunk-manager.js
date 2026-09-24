// Chunk Manager - splits a big map into square chunks (ISO.CHUNK_SIZE tiles a side).
//
// Every static object belongs to the chunk its feet stand in. Each frame the renderer
// asks for the chunks around the camera, so it never looks at the rest of the world:
// a 300 x 300 map with 20,000 trees costs the same per frame as a small one.
//
// "active" chunks = the visible ones plus a ring around them. The active set is
// where NPCs / monsters will be simulated and, later, what the server streams to a
// client. Chunks that leave the ring are counted as unloaded.

export class ChunkManager {
  constructor(width, height, size) {
    this.size = size;
    this.cols = Math.max(1, Math.ceil(width / size));
    this.rows = Math.max(1, Math.ceil(height / size));
    this.chunks = [];
    for (let cy = 0; cy < this.rows; cy++) {
      for (let cx = 0; cx < this.cols; cx++) {
        this.chunks.push({
          cx, cy,
          x0: cx * size, y0: cy * size,
          x1: Math.min(width, (cx + 1) * size) - 1, y1: Math.min(height, (cy + 1) * size) - 1,
          objects: [],
          active: false
        });
      }
    }
    this.activeCount = 0;
    this.loads = 0;
    this.unloads = 0;
  }

  chunkAt(tx, ty) {
    const cx = Math.min(this.cols - 1, Math.max(0, Math.floor(tx / this.size)));
    const cy = Math.min(this.rows - 1, Math.max(0, Math.floor(ty / this.size)));
    return this.chunks[cy * this.cols + cx];
  }

  add(object) {
    this.chunkAt(object.tx, object.ty).objects.push(object);
  }

  // Every chunk overlapping the tile rectangle (inclusive).
  inTileRange(x0, y0, x1, y1, out = []) {
    out.length = 0;
    const c0 = Math.max(0, Math.floor(x0 / this.size));
    const r0 = Math.max(0, Math.floor(y0 / this.size));
    const c1 = Math.min(this.cols - 1, Math.floor(x1 / this.size));
    const r1 = Math.min(this.rows - 1, Math.floor(y1 / this.size));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) out.push(this.chunks[r * this.cols + c]);
    }
    return out;
  }

  // Marks the visible chunks plus a ring of `margin` chunks as active.
  updateActive(visible, margin = 1) {
    const want = new Set();
    for (const chunk of visible) {
      for (let dy = -margin; dy <= margin; dy++) {
        for (let dx = -margin; dx <= margin; dx++) {
          const cx = chunk.cx + dx;
          const cy = chunk.cy + dy;
          if (cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows) want.add(cy * this.cols + cx);
        }
      }
    }
    let count = 0;
    this.chunks.forEach((chunk, i) => {
      const on = want.has(i);
      if (on && !chunk.active) this.loads++;
      if (!on && chunk.active) this.unloads++;
      chunk.active = on;
      if (on) count++;
    });
    this.activeCount = count;
  }

  get objectCount() {
    return this.chunks.reduce((n, c) => n + c.objects.length, 0);
  }
}
