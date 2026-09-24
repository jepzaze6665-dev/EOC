// Collision System - every map has a numeric collision grid.
//
//   0 = Walkable          เดินได้
//   1 = Blocked           สิ่งกีดขวางทั่วไป (ต้นไม้ หิน รั้ว)
//   2 = Water             น้ำ - เดินไม่ได้ แต่ของที่บินได้ (ลูกไฟ ลูกธนู) ข้ามได้
//   3 = Cliff             หน้าผา
//   4 = Building          อาคาร
//   5 = Special           กั้นแบบพิเศษ - เปิด/ปิดได้ด้วยเงื่อนไข (Boss Gate ใน Phase 4)
//
// The grid can be finer than the game's tiles: with cellsPerTile = 2, each 16px
// tile is split into four 8px cells, so collision can follow the shapes in the
// painted map (fences, tree trunks, building corners) more closely.
// All public methods take WORLD coordinates in tiles - callers never see cells.
//
// Adding a new code = adding a row to COLLISION_RULES. Nothing else has to change.

export const COLLISION = {
  WALKABLE: 0,
  BLOCKED: 1,
  WATER: 2,
  CLIFF: 3,
  BUILDING: 4,
  SPECIAL: 5
};

// walk       = can a character stand here
// projectile = can a flying projectile pass over it
export const COLLISION_RULES = {
  0: { name: 'walkable', walk: true, projectile: true },
  1: { name: 'blocked', walk: false, projectile: false },
  2: { name: 'water', walk: false, projectile: true },
  3: { name: 'cliff', walk: false, projectile: false },
  4: { name: 'building', walk: false, projectile: false },
  5: { name: 'special', walk: false, projectile: true }
};

// Colors used by the F3 debug overlay and the map preview tool.
export const COLLISION_DEBUG_COLORS = {
  1: '#ff4a4a',
  2: '#3aa0ff',
  3: '#b06cff',
  4: '#ffae3a',
  5: '#ff3ad8'
};

const UNKNOWN_RULE = { name: 'unknown', walk: false, projectile: false };

// Run-length encoding keeps a 160x160 grid down to a short string in the map JSON:
// "0x120,1x40,..." = 120 walkable cells, then 40 blocked cells, row by row.
export function encodeCollision(grid) {
  const parts = [];
  let current = grid[0];
  let count = 0;
  for (const code of grid) {
    if (code === current) {
      count++;
    } else {
      parts.push(`${current}x${count}`);
      current = code;
      count = 1;
    }
  }
  parts.push(`${current}x${count}`);
  return parts.join(',');
}

// ArrayType lets tile maps reuse this for tile indexes (Uint16Array: more than 255 tile types).
export function decodeCollision(text, length, ArrayType = Uint8Array) {
  const grid = new ArrayType(length);
  let index = 0;
  for (const part of text.split(',')) {
    const [code, count] = part.split('x').map(Number);
    grid.fill(code, index, index + count);
    index += count;
  }
  if (index !== length) throw new Error(`collision data has ${index} cells, expected ${length}`);
  return grid;
}

export class CollisionSystem {
  // cols / rows = size of the grid in CELLS
  constructor(cols, rows, cellsPerTile = 1, grid = null) {
    this.cols = cols;
    this.rows = rows;
    this.cellsPerTile = cellsPerTile;
    // One byte per cell. A flat typed array stays fast and small even for huge maps.
    this.grid = grid || new Uint8Array(cols * rows);
  }

  inBounds(cx, cy) {
    return cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows;
  }

  // Cell (integer) lookup. Anything outside the map counts as a wall - this is the map boundary.
  codeAtCell(cx, cy) {
    if (!this.inBounds(cx, cy)) return COLLISION.BLOCKED;
    return this.grid[cy * this.cols + cx];
  }

  setCell(cx, cy, code) {
    if (!this.inBounds(cx, cy)) return;
    this.grid[cy * this.cols + cx] = code;
  }

  // World-space (tiles, float) queries.
  codeAt(tx, ty) {
    return this.codeAtCell(Math.floor(tx * this.cellsPerTile), Math.floor(ty * this.cellsPerTile));
  }

  ruleAt(tx, ty) {
    return COLLISION_RULES[this.codeAt(tx, ty)] || UNKNOWN_RULE;
  }

  isWalkable(tx, ty) {
    return this.ruleAt(tx, ty).walk;
  }

  isBlocked(tx, ty) {
    return !this.isWalkable(tx, ty);
  }

  blocksProjectile(tx, ty) {
    return !this.ruleAt(tx, ty).projectile;
  }

  // A character is a small square (radius in tiles) around its feet.
  // All four corners must be on walkable cells.
  canStand(tx, ty, radius = 0.28) {
    return (
      this.isWalkable(tx - radius, ty - radius) &&
      this.isWalkable(tx + radius, ty - radius) &&
      this.isWalkable(tx - radius, ty + radius) &&
      this.isWalkable(tx + radius, ty + radius)
    );
  }

  // Tries to move from (tx, ty) by (dx, dy). Each axis is checked on its own,
  // so a character walking diagonally into a wall slides along it instead of stopping dead.
  resolveMove(tx, ty, dx, dy, radius = 0.28) {
    let x = tx;
    let y = ty;
    let blockedX = false;
    let blockedY = false;

    if (dx !== 0) {
      if (this.canStand(x + dx, y, radius)) x += dx;
      else blockedX = true;
    }
    if (dy !== 0) {
      if (this.canStand(x, y + dy, radius)) y += dy;
      else blockedY = true;
    }
    return { tx: x, ty: y, blockedX, blockedY };
  }

  // Counts per code - used by the debug overlay and the headless tests.
  stats() {
    const counts = {};
    for (const code of this.grid) counts[code] = (counts[code] || 0) + 1;
    return counts;
  }
}
