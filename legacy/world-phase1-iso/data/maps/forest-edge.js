// Whispering Forest - Edge. The first non-safe zone: monsters live here.
// Reached from Lumina Village's north stairs (Route A).
// World Scope Phase 4 replaces this small map with the full A1 Whispering Forest.
//
// Returns plain map data; world/tile-map.js builds the collision grid from it.

function hash2(x, y) {
  let h = x * 668265263 + y * 374761393;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) >>> 0;
}

function fillRect(tiles, x, y, w, h, type) {
  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) {
      if (tiles[ty] && tiles[ty][tx] !== undefined) tiles[ty][tx] = type;
    }
  }
}

function fillEllipse(tiles, cx, cy, rx, ry, type) {
  for (let ty = Math.floor(cy - ry); ty <= Math.ceil(cy + ry); ty++) {
    for (let tx = Math.floor(cx - rx); tx <= Math.ceil(cx + rx); tx++) {
      const dx = (tx - cx) / rx;
      const dy = (ty - cy) / ry;
      if (dx * dx + dy * dy <= 1 && tiles[ty] && tiles[ty][tx] !== undefined) tiles[ty][tx] = type;
    }
  }
}

function fillRim(tiles, thickness, type) {
  const h = tiles.length;
  const w = tiles[0].length;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < thickness || y < thickness || x >= w - thickness || y >= h - thickness) tiles[y][x] = type;
    }
  }
}

function buildGround(width, height) {
  const tiles = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const h = hash2(x, y);
      row.push(h % 4 === 0 ? 'grass2' : h % 31 === 0 ? 'flower' : 'grass');
    }
    tiles.push(row);
  }

  fillRim(tiles, 2, 'rock');

  // road coming down from the village gate at the top
  fillRect(tiles, 14, 2, 2, 12, 'path');
  // clearing in the middle
  fillEllipse(tiles, 15, 18, 7, 5.5, 'sand');
  // creek along the east side
  fillEllipse(tiles, 26, 20, 2.6, 7, 'water');
  fillRect(tiles, 16, 22, 2, 8, 'path');
  // southern hollow where the tougher monsters live
  fillEllipse(tiles, 16, 29, 6, 4, 'grass2');

  return tiles;
}

function buildProps() {
  const props = [
    { type: 'campfire', tx: 15, ty: 17 },
    { type: 'crate', tx: 13, ty: 16 },
    { type: 'barrel', tx: 17, ty: 16 },
    { type: 'ruin_pillar', tx: 11, ty: 20 },
    { type: 'ruin_pillar', tx: 19, ty: 20 },
    { type: 'ruin_pillar', tx: 11, ty: 27 },
    { type: 'ruin_pillar', tx: 20, ty: 28 },
    { type: 'sign', tx: 13, ty: 13 },
    { type: 'gate_pillar', tx: 13, ty: 2 },
    { type: 'gate_pillar', tx: 16, ty: 2 }
  ];

  const trees = [
    [4, 4], [7, 3], [10, 5], [3, 8], [6, 9], [9, 11], [4, 13], [7, 15], [3, 18], [5, 22], [3, 26],
    [6, 28], [9, 30], [12, 31], [19, 31], [23, 30], [26, 28], [29, 25], [28, 12], [25, 8], [22, 5],
    [19, 4], [27, 4], [30, 9], [29, 17], [24, 14], [21, 11], [12, 8], [17, 7], [20, 15], [22, 24],
    [8, 19], [8, 24], [24, 19]
  ];
  trees.forEach(([tx, ty], i) => props.push({ type: i % 3 === 1 ? 'tree_b' : 'tree_a', tx, ty }));

  const rocks = [[5, 6], [12, 24], [21, 27], [27, 15], [9, 27], [24, 22], [18, 25]];
  rocks.forEach(([tx, ty]) => props.push({ type: 'rock', tx, ty }));

  return props;
}

function buildGatherNodes() {
  const herbs = [[12, 19], [18, 19], [14, 24], [20, 23], [10, 15]];
  const ores = [[22, 17], [8, 21], [19, 29], [13, 29]];

  const nodes = herbs.map(([tx, ty], i) => ({
    id: `f-herb-${i}`, prop: 'herb_bush', itemId: 'herb-moonleaf', tx, ty, respawn: 12
  }));
  ores.forEach(([tx, ty], i) => nodes.push({
    id: `f-ore-${i}`, prop: 'ore_node', itemId: 'ore-ironvein', tx, ty, respawn: 16
  }));
  return nodes;
}

// Coordinates are tile centres so a monster's body never overlaps the tile next door.
function buildMonsterSpawns() {
  const slimes = [[11, 17], [19, 17], [13, 21], [21, 21], [9, 23], [22, 22], [15, 14]];
  const stalkers = [[15, 29], [18, 28], [11, 30], [22, 29]];

  const spawns = slimes.map(([tx, ty], i) => ({ id: `slime-${i}`, type: 'gloom-slime', tx: tx + 0.5, ty: ty + 0.5 }));
  stalkers.forEach(([tx, ty], i) => spawns.push({
    id: `stalker-${i}`, type: 'hollow-stalker', tx: tx + 0.5, ty: ty + 0.5
  }));
  return spawns;
}

export function createForestEdgeData() {
  const width = 32;
  const height = 34;
  const tiles = buildGround(width, height);
  const props = buildProps();
  const gatherNodes = buildGatherNodes();
  const monsterSpawns = buildMonsterSpawns();

  return {
    id: 'forest-edge',
    name: 'Whispering Forest — Edge',
    safeZone: false,
    width,
    height,
    layers: { ground: tiles, decoration: [] },
    props,
    gatherNodes,
    monsterSpawns,
    spawn: { tx: 15, ty: 4.5 },
    npcs: [
      {
        id: 'forest-sign', name: 'Weathered Sign', role: 'Sign', kind: 'sign', tx: 13.5, ty: 13.5, dir: 's',
        lines: [
          'ระวัง: พ้นจากจุดนี้ไปไม่ใช่เขตปลอดภัยของหมู่บ้าน',
          'มีคนขีดข้อความเพิ่มไว้ด้วยลายมือสั่น ๆ ว่า "อย่าลงไปทางใต้ตอนที่ฟ้ามืด"'
        ]
      }
    ],
    portals: [
      { tx: 14, ty: 2, w: 2, d: 2, to: 'lumina-village', spawn: { tx: 26.5, ty: 3.5 }, label: 'Lumina Village' }
    ]
  };
}
