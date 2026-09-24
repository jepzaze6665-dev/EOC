// Lumina Village - the Phase 1 starting map.
// Ground is generated with small helpers instead of a giant string grid so it
// stays easy to edit. Phase 5 can swap this for a Tiled JSON loader.

import { TILE_DEFS } from './tiles.js';
import { PROP_DEFS } from './props.js';

function hash2(x, y) {
  let h = x * 374761393 + y * 668265263;
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
      row.push(h % 7 === 0 ? 'grass2' : h % 29 === 0 ? 'flower' : 'grass');
    }
    tiles.push(row);
  }

  fillRim(tiles, 2, 'rock');

  // pond in the north-east
  fillEllipse(tiles, 27, 7, 4.6, 3.3, 'sand');
  fillEllipse(tiles, 27, 7, 3.5, 2.3, 'water');

  // village square
  fillRect(tiles, 14, 14, 7, 7, 'plaza');

  // main roads
  fillRect(tiles, 16, 2, 2, 12, 'path');
  fillRect(tiles, 16, 21, 2, 11, 'path');
  fillRect(tiles, 2, 16, 12, 2, 'path');
  fillRect(tiles, 21, 16, 11, 2, 'path');

  // side roads to each building
  fillRect(tiles, 12, 12, 4, 2, 'path');
  fillRect(tiles, 18, 13, 4, 1, 'path');
  fillRect(tiles, 12, 22, 4, 1, 'path');
  fillRect(tiles, 18, 22, 4, 1, 'path');
  fillRect(tiles, 24, 15, 3, 1, 'path');

  // training ground
  fillRect(tiles, 4, 23, 5, 5, 'sand');

  // south gate: cut through the rocky rim so the road leaves the village
  fillRect(tiles, 16, 30, 2, 4, 'path');

  return tiles;
}

function buildProps() {
  const props = [
    { type: 'house_shop', tx: 9, ty: 10 },
    { type: 'house_forge', tx: 21, ty: 10 },
    { type: 'house_inn', tx: 9, ty: 21 },
    { type: 'house_storage', tx: 22, ty: 21 },
    { type: 'house_guild', tx: 25, ty: 12 },

    { type: 'fountain', tx: 16, ty: 16 },
    { type: 'quest_board', tx: 14, ty: 12 },
    { type: 'teleport_pad', tx: 19, ty: 11 },
    { type: 'well', tx: 12, ty: 19 },
    { type: 'anvil', tx: 24, ty: 11 },
    { type: 'crate', tx: 12, ty: 21 },
    { type: 'barrel', tx: 12, ty: 20 },
    { type: 'crate', tx: 21, ty: 20 },
    { type: 'sign', tx: 18, ty: 29 },
    { type: 'gate_pillar', tx: 15, ty: 30 },
    { type: 'gate_pillar', tx: 18, ty: 30 },

    { type: 'lamp', tx: 13, ty: 13 },
    { type: 'lamp', tx: 21, ty: 13 },
    { type: 'lamp', tx: 13, ty: 21 },
    { type: 'lamp', tx: 21, ty: 21 },

    { type: 'dummy', tx: 5, ty: 25 },
    { type: 'dummy', tx: 7, ty: 25 },
    { type: 'dummy', tx: 6, ty: 26 }
  ];

  // training ground fence, with a gap at x=6 to walk in
  for (const x of [4, 5, 7, 8]) props.push({ type: 'fence_x', tx: x, ty: 23 });
  for (const x of [4, 5, 6, 7, 8]) props.push({ type: 'fence_x', tx: x, ty: 27 });
  for (const y of [24, 25, 26]) props.push({ type: 'fence_y', tx: 4, ty: y });
  for (const y of [24, 25, 26]) props.push({ type: 'fence_y', tx: 8, ty: y });

  const trees = [
    [3, 3], [6, 4], [9, 3], [12, 5], [4, 7], [6, 9], [3, 11], [3, 14], [5, 13],
    [14, 5], [13, 8], [18, 8], [19, 3], [22, 5], [20, 7],
    [31, 12], [30, 18], [29, 22], [31, 27], [27, 28], [25, 25], [24, 29], [20, 28],
    [4, 19], [3, 22], [6, 20], [4, 29], [7, 30], [11, 28], [12, 26]
  ];
  trees.forEach(([tx, ty], i) => props.push({ type: i % 3 === 0 ? 'tree_b' : 'tree_a', tx, ty }));

  const rocks = [[2, 5], [31, 4], [2, 26], [30, 30], [23, 31], [10, 31], [2, 13]];
  rocks.forEach(([tx, ty]) => props.push({ type: 'rock', tx, ty }));

  return props;
}

// Harvestable resource spots (the Phase 2 item source; monsters drop items in Phase 3).
function buildGatherNodes() {
  const herbs = [[6, 15], [5, 18], [12, 25], [20, 24], [26, 20], [13, 6]];
  const ores = [[3, 9], [29, 11], [24, 4], [30, 25]];

  const nodes = herbs.map(([tx, ty], i) => ({
    id: `herb-${i}`, prop: 'herb_bush', itemId: 'herb-moonleaf', tx, ty, respawn: 14
  }));
  ores.forEach(([tx, ty], i) => nodes.push({
    id: `ore-${i}`, prop: 'ore_node', itemId: 'ore-ironvein', tx, ty, respawn: 20
  }));
  return nodes;
}

const VILLAGER = { skin: '#e0a97e', hair: '#3a2a1e', hairStyle: 'short', accent: '#c8b48a', cloth: '#6f7a63', kit: 'none' };

function buildNpcs() {
  return [
    {
      id: 'elder-maren', name: 'Elder Maren', role: 'Village Elder', tx: 18.5, ty: 14.5, dir: 's',
      look: { ...VILLAGER, skin: '#d8c0a4', hair: '#d8d4cc', hairStyle: 'long', cloth: '#5a5f8a', accent: '#c9a94a' },
      lines: [
        'ยินดีต้อนรับสู่ Lumina Village นักเดินทาง',
        'หมู่บ้านนี้ปลอดภัย... แต่โลกข้างนอกไม่ใช่',
        'จำไว้ว่า สิ่งที่สำคัญที่สุดในโลกนี้ มักไม่มีใครบอกทางให้'
      ]
    },
    {
      id: 'brann-smith', name: 'Brann', role: 'Blacksmith', tx: 21.5, ty: 13.5, dir: 'n',
      look: { ...VILLAGER, skin: '#b07a52', hair: '#40281c', hairStyle: 'bald', cloth: '#6b4a3a', accent: '#8a8a98' },
      lines: [
        'เตาไฟยังร้อนอยู่ แต่ร้านยังไม่เปิดขายนะ',
        'กลับมาใหม่ตอนที่เจ้ามีของให้ข้าตีเถอะ'
      ]
    },
    {
      id: 'sera-merchant', name: 'Sera', role: 'Merchant', tx: 10.5, ty: 12.5, dir: 's',
      look: { ...VILLAGER, skin: '#e8c3a0', hair: '#8a4a24', hairStyle: 'ponytail', cloth: '#7a5c8a', accent: '#e0c070' },
      lines: [
        'ของดีมีไม่เยอะ แต่ราคาคุยกันได้',
        'ระบบร้านค้ายังไม่เปิด — รอ Phase ถัดไปก่อนนะ'
      ]
    },
    {
      id: 'tomas-inn', name: 'Tomas', role: 'Innkeeper', tx: 10.5, ty: 20.5, dir: 's',
      look: { ...VILLAGER, skin: '#dcae82', hair: '#5a3a22', hairStyle: 'short', cloth: '#8a6a4a', accent: '#c9b07a' },
      lines: [
        'เหนื่อยไหม? เข้ามานั่งพักในโรงเตี๊ยมได้เสมอ',
        'เมื่อคืนมีคนแปลกหน้าถามถึงซากปรักหักพังทางทิศเหนือ... ข้าไม่ได้บอกอะไรไป'
      ]
    },
    {
      id: 'ida-storage', name: 'Ida', role: 'Storage Keeper', tx: 23.5, ty: 20.5, dir: 's',
      look: { ...VILLAGER, skin: '#c99a70', hair: '#2e2a26', hairStyle: 'braid', cloth: '#5f6f7a', accent: '#b0b8c0' },
      lines: ['ของของเจ้าจะปลอดภัยกับข้า สัญญา']
    },
    {
      id: 'kael-drill', name: 'Kael', role: 'Drillmaster', tx: 6.5, ty: 22.5, dir: 's',
      look: { ...VILLAGER, skin: '#a8724a', hair: '#1e1a16', hairStyle: 'short', cloth: '#6a3a3a', accent: '#c0a060', kit: 'blade' },
      lines: [
        'ยืนตัวตรง! หลังจากนี้เจ้าจะต้องสู้ของจริง',
        'ตอนนี้ลานฝึกยังว่าง — ระบบต่อสู้จะมาใน Phase 3'
      ]
    },
    {
      id: 'veyra-trainer', name: 'Master Veyra', role: 'Class Trainer', tx: 10.5, ty: 25.5, dir: 'e',
      look: { skin: '#c9a077', hair: '#5a4a6a', hairStyle: 'long', cloth: '#3f4a6b', accent: '#c9a94a', kit: 'blade' },
      lines: [
        'ข้าเคยเห็นนักผจญภัยมานับไม่ถ้วน คนที่ไปได้ไกลคือคนที่รู้ว่าตัวเองถนัดอะไร',
        'เมื่อเจ้าถึงระดับ 20 กลับมาหาข้า ข้าจะให้บททดสอบที่เหมาะกับคลาสของเจ้า'
      ]
    },
    {
      id: 'nym-wanderer', name: 'Nym', role: '???', tx: 24.5, ty: 26.5, dir: 's', wanderRadius: 2.5,
      look: { skin: '#cfae8e', hair: '#22202c', hairStyle: 'hood', cloth: '#3b3550', accent: '#8f7bff', kit: 'none' },
      lines: [
        'เจ้าเห็นดวงจันทร์เมื่อคืนไหม',
        'เมื่อเงาของมันบังแสงจนมืดสนิท ประตูบางบานจะเปิดขึ้น',
        '...ข้าไม่ได้พูดอะไรทั้งนั้น'
      ]
    },
    {
      id: 'pip-kid', name: 'Pip', role: 'Villager', tx: 15.5, ty: 19.5, dir: 's', wanderRadius: 3,
      look: { ...VILLAGER, skin: '#edc39c', hair: '#c9a227', hairStyle: 'short', cloth: '#7a8a5c', accent: '#d8d0a0' },
      lines: ['วิ่งแข่งกันไหม! เอ่อ... เจ้าตัวใหญ่กว่าข้าเยอะเลย']
    },
    {
      id: 'lio-kid', name: 'Lio', role: 'Villager', tx: 19.5, ty: 18.5, dir: 'w', wanderRadius: 3,
      look: { ...VILLAGER, skin: '#c98a5e', hair: '#2a2018', hairStyle: 'short', cloth: '#5c7a8a', accent: '#a0c8d8' },
      lines: ['ข้าเคยเห็นแสงสีม่วงตรงแท่นหินนั่นตอนกลางคืน จริงนะ!']
    },
    {
      id: 'gate-sign', name: 'Village Gate', role: 'Sign', kind: 'sign', tx: 18.5, ty: 29.5, dir: 's',
      lines: [
        'ทางนี้ไปสู่ Whispering Forest',
        'พ้นประตูนี้ไปไม่ใช่เขตปลอดภัยแล้ว เตรียมตัวให้พร้อมก่อนออกไป'
      ]
    },
    {
      id: 'quest-board', name: 'Quest Board', role: 'Board', kind: 'board', tx: 14.5, ty: 12.5, dir: 's',
      lines: ['กระดานประกาศงานของหมู่บ้าน']
    }
  ];
}

export function createVillageMap() {
  const width = 34;
  const height = 34;
  const tiles = buildGround(width, height);
  const props = buildProps();
  const npcs = buildNpcs();
  const gatherNodes = buildGatherNodes();

  // Blocked grid = unwalkable tiles + every solid prop footprint.
  const blocked = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) row.push(!TILE_DEFS[tiles[y][x]].walkable);
    blocked.push(row);
  }
  const blockFootprint = (tx, ty, def) => {
    for (let y = ty; y < ty + def.d; y++) {
      for (let x = tx; x < tx + def.w; x++) {
        if (blocked[y] && blocked[y][x] !== undefined) blocked[y][x] = true;
      }
    }
  };

  for (const prop of props) {
    const def = PROP_DEFS[prop.type];
    if (def && def.solid) blockFootprint(prop.tx, prop.ty, def);
  }
  for (const node of gatherNodes) {
    const def = PROP_DEFS[node.prop];
    if (def && def.solid) blockFootprint(node.tx, node.ty, def);
  }

  return {
    id: 'lumina-village',
    name: 'Lumina Village',
    safeZone: true,
    width,
    height,
    tiles,
    props,
    npcs,
    gatherNodes,
    blocked,
    spawn: { tx: 17.5, ty: 20.5 },
    monsterSpawns: [],
    portals: [
      { tx: 16, ty: 32, w: 2, d: 2, to: 'forest-edge', spawn: { tx: 15, ty: 5.5 }, label: 'Whispering Forest' }
    ],

    tileAt(tx, ty) {
      const x = Math.floor(tx);
      const y = Math.floor(ty);
      if (x < 0 || y < 0 || x >= width || y >= height) return null;
      return tiles[y][x];
    },

    isBlocked(tx, ty) {
      const x = Math.floor(tx);
      const y = Math.floor(ty);
      if (x < 0 || y < 0 || x >= width || y >= height) return true;
      return blocked[y][x];
    },

    // Axis-aligned box check around a point, in tile units.
    canStand(tx, ty, radius = 0.28) {
      return (
        !this.isBlocked(tx - radius, ty - radius) &&
        !this.isBlocked(tx + radius, ty - radius) &&
        !this.isBlocked(tx - radius, ty + radius) &&
        !this.isBlocked(tx + radius, ty + radius)
      );
    }
  };
}
