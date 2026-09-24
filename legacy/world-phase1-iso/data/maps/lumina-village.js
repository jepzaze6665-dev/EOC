// Lumina Village - Starting City (100 x 100 tiles).
// Layout follows the concept art in docs/Map/LUMINA VILLAGE:
//
//            Route A (N)         Elder Tree            Route B (NE, snow)
//                 |            (fenced garden)                 |
//   river  north houses ---- ring road ---- Inn ---------- snow bridge
//     |      market  \          |              /   blacksmith  storage
//     |   farmhouse --+---- PLAZA + fountain --+----------- east house
//    mill              \        |              /  Class Hall  training ground
//     |          SW houses --- ring road --- Guild Hall       farm fields
//      \___ river _________ south bridge ___________________________
//
// Tile x = east in the art, tile y = south in the art. On screen (isometric) the
// art's north edge becomes the upper-right edge of the diamond.
//
// The map is built from shapes (roads, rivers, areas) instead of a 10,000-entry
// hand-written grid, but the RESULT is plain data in the same shape the Phase 2
// JSON files will have: { id, width, height, layers, props, npcs, portals, ... }.

const WIDTH = 100;
const HEIGHT = 100;

// ---------------------------------------------------------------- helpers

function hash2(x, y, seed = 0) {
  let h = (x + seed * 7919) * 374761393 + (y - seed * 104729) * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) >>> 0;
}

function rand01(x, y, seed = 0) {
  return (hash2(x, y, seed) % 100000) / 100000;
}

// Smooth value noise (0..1) - used for irregular cliff edges.
function smoothNoise(x, y, scale, seed) {
  const gx = x / scale;
  const gy = y / scale;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = rand01(x0, y0, seed);
  const b = rand01(x0 + 1, y0, seed);
  const c = rand01(x0, y0 + 1, seed);
  const d = rand01(x0 + 1, y0 + 1, seed);
  return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
}

function inside(x, y) {
  return x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT;
}

function setTile(ground, x, y, id) {
  if (inside(x, y)) ground[y][x] = id;
}

function fillRect(ground, x, y, w, h, id) {
  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) setTile(ground, tx, ty, id);
  }
}

function fillOctagon(ground, cx, cy, r, id) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (Math.abs(x - cx) + Math.abs(y - cy) <= r * 1.4) setTile(ground, x, y, id);
    }
  }
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

// Paints a thick line through a list of [x, y] points (roads, rivers, paths).
// A tile is painted when its center is closer than width/2 to the line.
function stroke(ground, points, width, id, onTile = null) {
  const r = width / 2;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const x0 = Math.floor(Math.min(ax, bx) - r - 1);
    const x1 = Math.ceil(Math.max(ax, bx) + r + 1);
    const y0 = Math.floor(Math.min(ay, by) - r - 1);
    const y1 = Math.ceil(Math.max(ay, by) + r + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!inside(x, y)) continue;
        if (distToSegment(x + 0.5, y + 0.5, ax, ay, bx, by) < r) {
          ground[y][x] = id;
          if (onTile) onTile(x, y);
        }
      }
    }
  }
}

// ---------------------------------------------------------------- layout data

// Distance from the map edge where the cliff wall ends (3..5 tiles, irregular).
function rimThickness(x, y) {
  return 3 + Math.floor(smoothNoise(x, y, 6, 11) * 3);
}

function isSnowArea(x, y) {
  return x > 78 && y < 26 && (x - 78) + (26 - y) > 12 + smoothNoise(x, y, 4, 5) * 4;
}

const RIVER = [
  [9, -1], [8.5, 8], [6.5, 18], [5, 28], [4.5, 38], [5, 48], [6.5, 56], [8, 63],
  [10, 70], [13, 76], [19, 81], [27, 85], [36, 88], [45, 90], [54, 91], [62, 93], [70, 97], [73, 101]
];
const ICE_STREAM = [[78, 2], [84, 8.5], [90, 9], [96, 8], [101, 7.5]];

const ROADS = {
  north: [[50, 36], [50, 18]],
  south: [[50, 56], [50, 87]],
  west: [[40, 46], [14, 46], [14, 61]],
  east: [[60, 46], [91, 46]],
  ring: [[31, 28], [69, 28], [72, 31], [72, 61], [69, 64], [31, 64], [28, 61], [28, 31], [31, 28]],
  northEast: [[57, 39], [69, 28]],
  southWest: [[43, 53], [31, 64], [20, 72]],
  southEast: [[57, 53], [69, 64]],
  routeA: [[31, 28], [28, 22], [26, 15], [26, -1]],
  routeB: [[69, 28], [78, 25], [86, 21], [92, 16], [93, 12], [93, -1]]
};

// Narrow dirt paths from building doors to the roads.
// (Doors are drawn on each building's south-west face, i.e. the +y side.)
const PATHS = [
  [[36, 22], [36, 27]],          // north house
  [[40.5, 23], [40.5, 27]],      // north shed
  [[62.5, 23], [62.5, 27]],      // inn
  [[74.5, 22], [74.5, 25]],      // north-east house
  [[33.5, 44], [33.5, 45]],      // trading post
  [[16.5, 43], [16.5, 45]],      // farmhouse
  [[10.5, 44], [10.5, 46]],      // west house
  [[77.5, 40], [77.5, 45]],      // blacksmith
  [[85.5, 42], [85.5, 45]],      // storage
  [[91.5, 44], [91.5, 45]],      // east house
  [[10.5, 60.5], [14, 60.5]],     // mill
  [[63.5, 56], [63.5, 58]],      // class hall
  [[56.5, 73], [56.5, 74.5], [51, 74.5]], // guild hall
  [[22.5, 65], [22.5, 69]],      // south-west house
  [[50, 17.5], [50, 13]],        // into the Elder Tree garden
  [[69, 64], [75, 68], [86, 68]], // along the farm
  [[34.5, 77], [34.5, 79], [48, 79]], // south houses
  [[41.5, 77], [41.5, 79]],
  [[61.5, 83], [61.5, 84], [52, 84]]
];

const BUILDINGS = [
  { type: 'house_a', tx: 35, ty: 19 },
  { type: 'house_c', tx: 40, ty: 21 },
  { type: 'house_inn', tx: 60, ty: 19 },
  { type: 'house_c', tx: 66, ty: 21 },
  { type: 'house_b', tx: 73, ty: 19 },
  { type: 'house_shop', tx: 32, ty: 41 },
  { type: 'house_b', tx: 15, ty: 40 },
  { type: 'house_a', tx: 9, ty: 41 },
  { type: 'house_mill', tx: 9, ty: 57 },
  { type: 'house_forge', tx: 76, ty: 37 },
  { type: 'house_storage', tx: 84, ty: 39 },
  { type: 'house_a', tx: 90, ty: 41 },
  { type: 'house_hall', tx: 62, ty: 52 },
  { type: 'house_guild', tx: 54, ty: 68 },
  { type: 'house_a', tx: 21, ty: 62 },
  { type: 'house_c', tx: 27, ty: 72 },
  { type: 'house_b', tx: 86, ty: 70 },
  { type: 'house_b', tx: 33, ty: 74 },
  { type: 'house_c', tx: 41, ty: 75 },
  { type: 'house_a', tx: 60, ty: 80 }
];

// ---------------------------------------------------------------- ground (Layer 0)

function buildGround(reserve) {
  const ground = [];
  for (let y = 0; y < HEIGHT; y++) {
    const row = [];
    for (let x = 0; x < WIDTH; x++) row.push(rand01(x, y, 1) < 0.18 ? 'grass2' : 'grass');
    ground.push(row);
  }

  // snowy north-east corner (the way to Route B)
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) if (isSnowArea(x, y)) ground[y][x] = 'snow';
  }

  // cliff wall around the whole map, with a darker forest floor just inside it
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const edge = Math.min(x, y, WIDTH - 1 - x, HEIGHT - 1 - y);
      const t = rimThickness(x, y);
      const snow = isSnowArea(x, y);
      if (edge < t) ground[y][x] = snow ? 'cliff_snow' : 'cliff';
      else if (edge < t + 4 && !snow) ground[y][x] = 'grass_dark';
    }
  }

  // districts
  fillRect(ground, 31, 31, 10, 9, 'dirt');         // market square
  fillRect(ground, 75, 51, 13, 12, 'sand');        // training ground
  fillRect(ground, 64, 70, 20, 12, 'farmland');    // south-east fields
  fillRect(ground, 19, 50, 7, 5, 'farmland');      // farmhouse field
  fillRect(ground, 43, 6, 14, 11, 'grass');        // Elder Tree garden
  for (let y = 6; y < 17; y++) {
    for (let x = 43; x < 57; x++) if (rand01(x, y, 3) < 0.35) ground[y][x] = 'flower';
  }

  // roads and the central plaza
  const markRoad = (x, y) => reserve(x, y);
  for (const points of Object.values(ROADS)) stroke(ground, points, 3, 'road', markRoad);
  fillOctagon(ground, 50, 46, 10, 'plaza');
  for (let y = 36; y <= 56; y++) for (let x = 40; x <= 60; x++) if (ground[y][x] === 'plaza') reserve(x, y);
  for (const points of PATHS) stroke(ground, points, 1.5, 'path', markRoad);

  // water: the river (west + south) and the icy stream (north-east)
  stroke(ground, RIVER, 3.4, 'water');
  stroke(ground, ICE_STREAM, 2.6, 'ice_water');

  // bridges and the stair cut through the north cliff (Route A)
  fillRect(ground, 49, 86, 3, 7, 'bridge');        // south bridge
  fillRect(ground, 44, 93, 13, 3, 'grass');        // clearing past the south bridge
  fillRect(ground, 92, 6, 3, 5, 'bridge');         // Route B bridge over the stream
  fillRect(ground, 25, 0, 3, 7, 'stairs');         // Route A stairs
  fillRect(ground, 92, 0, 3, 6, 'road');           // Route B road past the bridge

  // Both exits are narrow passes: cliff walls on each side, so the only way out
  // is through the gate (Route A) or the barrier (Route B).
  fillRect(ground, 21, 0, 4, 7, 'cliff');
  fillRect(ground, 28, 0, 4, 7, 'cliff');
  fillRect(ground, 88, 0, 4, 6, 'cliff_snow');
  fillRect(ground, 95, 0, 4, 6, 'cliff_snow');

  for (const [x, y, w, h] of [[49, 86, 3, 7], [44, 93, 13, 3], [92, 0, 3, 11], [25, 0, 3, 7]]) {
    for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) reserve(tx, ty);
  }

  return ground;
}

// ---------------------------------------------------------------- objects (Layer 2/3)

function buildProps(ground, reserve, isReserved) {
  const props = [];
  const place = (type, tx, ty, w = 1, d = 1, margin = 0) => {
    props.push({ type, tx, ty });
    for (let y = ty - margin; y < ty + d + margin; y++) {
      for (let x = tx - margin; x < tx + w + margin; x++) reserve(x, y);
    }
  };

  const SIZES = {
    house_a: [3, 3], house_b: [4, 3], house_c: [2, 2], house_inn: [5, 4], house_shop: [3, 3],
    house_mill: [3, 3], house_forge: [4, 3], house_storage: [3, 3], house_hall: [4, 4], house_guild: [5, 5]
  };
  for (const b of BUILDINGS) {
    const [w, d] = SIZES[b.type];
    place(b.type, b.tx, b.ty, w, d, 1);
  }

  // Elder Tree and its fenced garden (gap in the south fence at x 49-51)
  place('great_tree', 48, 8, 4, 4, 1);
  for (let x = 42; x <= 57; x++) {
    place('fence_x', x, 5);
    if (x < 49 || x > 51) place('fence_x', x, 17);
  }
  for (let y = 6; y <= 16; y++) {
    place('fence_y', 42, y);
    place('fence_y', 57, y);
  }
  for (let y = 6; y <= 16; y++) for (let x = 43; x <= 56; x++) reserve(x, y);

  // plaza
  place('fountain', 49, 45, 2, 2, 1);
  for (const [x, y] of [[43, 40], [56, 40], [43, 52], [56, 52], [47, 36], [53, 36], [47, 56], [53, 56]]) place('lamp', x, y);
  place('teleport_pad', 44, 48, 2, 2);
  place('quest_board', 53, 57, 1, 1, 1);
  place('well', 41, 51, 1, 1, 1);

  // market square: two rows of stalls with walkable gaps between them
  const stalls = ['stall_blue', 'stall_red', 'stall_cream'];
  [32, 35, 38].forEach((x, i) => {
    place(stalls[i], x, 32, 2, 2);
    place(stalls[(i + 1) % 3], x, 37, 2, 2);
  });
  place('crate', 31, 35);
  place('barrel', 40, 35);

  // blacksmith yard
  place('forge', 80, 38);
  place('anvil', 80, 40);
  place('barrel', 81, 38);
  place('crate', 75, 40);

  // training ground: fence with an opening on the west side (y 55-57)
  for (let x = 74; x <= 88; x++) {
    place('fence_x', x, 50);
    place('fence_x', x, 63);
  }
  for (let y = 51; y <= 62; y++) {
    if (y < 55 || y > 57) place('fence_y', 74, y);
    place('fence_y', 88, y);
  }
  for (const x of [79, 81, 83]) place('dummy', x, 53);
  for (const y of [57, 60]) place('target', 86, y);
  for (let y = 51; y <= 62; y++) for (let x = 75; x <= 87; x++) reserve(x, y);

  // Route A gate: pillars at the foot of the stairs, sign beside the road
  place('gate_pillar', 24, 7);
  place('gate_pillar', 28, 7);
  place('sign', 29, 18, 1, 1, 1);

  // Route B: the far side of the bridge is closed for now (collision 5 "special")
  for (const x of [92, 93, 94]) place('barrier', x, 5);
  place('sign', 90, 13, 1, 1, 1);

  // farm
  place('crate', 85, 74);
  place('barrel', 84, 70);

  // lamps along the main roads
  for (const [x, y] of [[33, 26], [45, 26], [55, 26], [67, 26], [74, 36], [74, 44], [74, 58], [26, 36], [26, 56], [38, 66], [62, 66], [48, 76], [48, 84]]) {
    if (!isReserved(x, y)) place('lamp', x, y);
  }

  return props;
}

// Trees, bushes and rocks fill every free tile - dense near the cliffs, sparse in town.
function buildNature(ground, props, isReserved) {
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      if (isReserved(x, y)) continue;
      const id = ground[y][x];
      const r = rand01(x, y, 21);

      if (id === 'grass_dark') {
        if (r < 0.42) props.push({ type: 'pine', tx: x, ty: y });
        else if (r < 0.47) props.push({ type: 'bush', tx: x, ty: y });
        else if (r < 0.49) props.push({ type: 'rock', tx: x, ty: y });
      } else if (id === 'snow') {
        if (r < 0.14) props.push({ type: 'pine_snow', tx: x, ty: y });
        else if (r < 0.17) props.push({ type: 'rock', tx: x, ty: y });
      } else if (id === 'grass' || id === 'grass2') {
        if (r < 0.022) props.push({ type: 'tree_a', tx: x, ty: y });
        else if (r < 0.034) props.push({ type: 'tree_b', tx: x, ty: y });
        else if (r < 0.042) props.push({ type: 'pine', tx: x, ty: y });
        else if (r < 0.056) props.push({ type: 'bush', tx: x, ty: y });
        else if (r < 0.059) props.push({ type: 'rock', tx: x, ty: y });
      }
    }
  }
}

// ---------------------------------------------------------------- ground decoration (Layer 1)

function buildDecoration(ground, occupied) {
  const list = [];
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      if (occupied(x, y)) continue;
      const id = ground[y][x];
      const r = rand01(x, y, 33);
      let decor = null;

      if (id === 'farmland') decor = 'crop';
      else if (id === 'grass' || id === 'grass2') {
        if (r < 0.09) decor = 'tuft';
        else if (r < 0.115) decor = 'flowers_y';
        else if (r < 0.135) decor = 'flowers_p';
        else if (r < 0.15) decor = 'flowers_w';
        else if (r < 0.16) decor = 'pebbles';
      } else if (id === 'grass_dark') {
        if (r < 0.12) decor = 'tuft';
        else if (r < 0.16) decor = 'mushroom';
      } else if (id === 'snow') {
        if (r < 0.08) decor = 'snow_tuft';
      } else if (id === 'path' || id === 'dirt') {
        if (r < 0.06) decor = 'pebbles';
      }

      if (decor) list.push({ id: decor, x, y });
    }
  }
  return list;
}

// ---------------------------------------------------------------- NPCs & resources

const VILLAGER = { skin: '#e0a97e', hair: '#3a2a1e', hairStyle: 'short', accent: '#c8b48a', cloth: '#6f7a63', kit: 'none' };

function buildNpcs() {
  return [
    {
      id: 'elder-maren', name: 'Elder Maren', role: 'Village Elder', tx: 53.5, ty: 47.5, dir: 's',
      look: { ...VILLAGER, skin: '#d8c0a4', hair: '#d8d4cc', hairStyle: 'long', cloth: '#5a5f8a', accent: '#c9a94a' },
      lines: [
        'ยินดีต้อนรับสู่ Lumina Village นักเดินทาง',
        'หมู่บ้านนี้ปลอดภัย... แต่โลกข้างนอกไม่ใช่',
        'จำไว้ว่า สิ่งที่สำคัญที่สุดในโลกนี้ มักไม่มีใครบอกทางให้'
      ]
    },
    {
      id: 'brann-smith', name: 'Brann', role: 'Blacksmith', tx: 79.5, ty: 42.5, dir: 's',
      look: { ...VILLAGER, skin: '#b07a52', hair: '#40281c', hairStyle: 'bald', cloth: '#6b4a3a', accent: '#8a8a98' },
      lines: [
        'เตาไฟยังร้อนอยู่ แต่ร้านยังไม่เปิดขายนะ',
        'กลับมาใหม่ตอนที่เจ้ามีของให้ข้าตีเถอะ'
      ]
    },
    {
      id: 'sera-merchant', name: 'Sera', role: 'Merchant', tx: 37.5, ty: 35.5, dir: 's',
      look: { ...VILLAGER, skin: '#e8c3a0', hair: '#8a4a24', hairStyle: 'ponytail', cloth: '#7a5c8a', accent: '#e0c070' },
      lines: [
        'ของดีมีไม่เยอะ แต่ราคาคุยกันได้',
        'ระบบร้านค้ายังไม่เปิด — รอ Phase ถัดไปก่อนนะ'
      ]
    },
    {
      id: 'tomas-inn', name: 'Tomas', role: 'Innkeeper', tx: 63.5, ty: 24.5, dir: 's',
      look: { ...VILLAGER, skin: '#dcae82', hair: '#5a3a22', hairStyle: 'short', cloth: '#8a6a4a', accent: '#c9b07a' },
      lines: [
        'เหนื่อยไหม? เข้ามานั่งพักในโรงเตี๊ยมได้เสมอ',
        'เมื่อคืนมีคนแปลกหน้าถามถึงซากปรักหักพังทางทิศเหนือ... ข้าไม่ได้บอกอะไรไป'
      ]
    },
    {
      id: 'ida-storage', name: 'Ida', role: 'Storage Keeper', tx: 86.5, ty: 43.5, dir: 's',
      look: { ...VILLAGER, skin: '#c99a70', hair: '#2e2a26', hairStyle: 'braid', cloth: '#5f6f7a', accent: '#b0b8c0' },
      lines: ['ของของเจ้าจะปลอดภัยกับข้า สัญญา']
    },
    {
      id: 'kael-drill', name: 'Kael', role: 'Drillmaster', tx: 77.5, ty: 56.5, dir: 'e',
      look: { ...VILLAGER, skin: '#a8724a', hair: '#1e1a16', hairStyle: 'short', cloth: '#6a3a3a', accent: '#c0a060', kit: 'blade' },
      lines: [
        'ยืนตัวตรง! หลังจากนี้เจ้าจะต้องสู้ของจริง',
        'หุ่นฝึกกับเป้าธนูตั้งไว้ให้ซ้อมมือ — ศัตรูตัวจริงอยู่นอกหมู่บ้าน'
      ]
    },
    {
      id: 'veyra-trainer', name: 'Master Veyra', role: 'Class Trainer', tx: 65.5, ty: 57.5, dir: 's',
      look: { skin: '#c9a077', hair: '#5a4a6a', hairStyle: 'long', cloth: '#3f4a6b', accent: '#c9a94a', kit: 'blade' },
      lines: [
        'ข้าเคยเห็นนักผจญภัยมานับไม่ถ้วน คนที่ไปได้ไกลคือคนที่รู้ว่าตัวเองถนัดอะไร',
        'เมื่อเจ้าถึงระดับ 20 กลับมาหาข้า ข้าจะให้บททดสอบที่เหมาะกับคลาสของเจ้า'
      ]
    },
    {
      id: 'nym-wanderer', name: 'Nym', role: '???', tx: 45.5, ty: 14.5, dir: 's', wanderRadius: 2,
      look: { skin: '#cfae8e', hair: '#22202c', hairStyle: 'hood', cloth: '#3b3550', accent: '#8f7bff', kit: 'none' },
      lines: [
        'เจ้าเห็นดวงจันทร์เมื่อคืนไหม',
        'เมื่อเงาของมันบังแสงจนมืดสนิท ประตูบางบานจะเปิดขึ้น',
        '...ข้าไม่ได้พูดอะไรทั้งนั้น'
      ]
    },
    {
      id: 'pip-kid', name: 'Pip', role: 'Villager', tx: 46.5, ty: 42.5, dir: 's', wanderRadius: 3,
      look: { ...VILLAGER, skin: '#edc39c', hair: '#c9a227', hairStyle: 'short', cloth: '#7a8a5c', accent: '#d8d0a0' },
      lines: ['วิ่งแข่งกันไหม! เอ่อ... เจ้าตัวใหญ่กว่าข้าเยอะเลย']
    },
    {
      id: 'lio-kid', name: 'Lio', role: 'Villager', tx: 54.5, ty: 50.5, dir: 'w', wanderRadius: 3,
      look: { ...VILLAGER, skin: '#c98a5e', hair: '#2a2018', hairStyle: 'short', cloth: '#5c7a8a', accent: '#a0c8d8' },
      lines: ['ข้าเคยเห็นแสงสีม่วงตรงแท่นหินนั่นตอนกลางคืน จริงนะ!']
    },
    {
      id: 'gate-sign', name: 'Route A', role: 'Sign', kind: 'sign', tx: 29.5, ty: 18.5, dir: 's',
      lines: [
        'ขึ้นบันไดไปทางเหนือ: Whispering Forest',
        'พ้นประตูนี้ไปไม่ใช่เขตปลอดภัยแล้ว เตรียมตัวให้พร้อมก่อนออกไป'
      ]
    },
    {
      id: 'routeb-sign', name: 'Route B', role: 'Sign', kind: 'sign', tx: 90.5, ty: 13.5, dir: 's',
      lines: [
        'ข้ามสะพานไปทางเหนือ: Frostwind Plains',
        'สะพานถูกปิดไว้ — หิมะยังหนาเกินกว่าจะเดินทางได้'
      ]
    },
    {
      id: 'quest-board', name: 'Quest Board', role: 'Board', kind: 'board', tx: 53.5, ty: 57.5, dir: 's',
      lines: ['กระดานประกาศงานของหมู่บ้าน']
    }
  ];
}

// Harvestable spots (used by the existing gather quests).
function buildGatherNodes() {
  const herbs = [[38, 24], [21, 33], [24, 57], [67, 35], [92, 58], [40, 80]];
  const ores = [[13, 12], [66, 11], [90, 80], [30, 91]];

  const nodes = herbs.map(([tx, ty], i) => ({
    id: `herb-${i}`, prop: 'herb_bush', itemId: 'herb-moonleaf', tx, ty, respawn: 14
  }));
  ores.forEach(([tx, ty], i) => nodes.push({
    id: `ore-${i}`, prop: 'ore_node', itemId: 'ore-ironvein', tx, ty, respawn: 20
  }));
  return nodes;
}

// ---------------------------------------------------------------- build

export function createLuminaVillageData() {
  const reserved = new Uint8Array(WIDTH * HEIGHT);
  const reserve = (x, y) => {
    if (inside(x, y)) reserved[y * WIDTH + x] = 1;
  };
  const isReserved = (x, y) => !inside(x, y) || reserved[y * WIDTH + x] === 1;

  const npcs = buildNpcs();
  const gatherNodes = buildGatherNodes();
  const spawn = { tx: 50.5, ty: 52.5 };

  // keep the spawn, NPCs and resources clear of random trees
  for (const p of [spawn, ...npcs]) {
    for (let y = Math.floor(p.ty) - 1; y <= Math.floor(p.ty) + 1; y++) {
      for (let x = Math.floor(p.tx) - 1; x <= Math.floor(p.tx) + 1; x++) reserve(x, y);
    }
  }
  for (const n of gatherNodes) {
    for (let y = n.ty - 1; y <= n.ty + 1; y++) for (let x = n.tx - 1; x <= n.tx + 1; x++) reserve(x, y);
  }

  const ground = buildGround(reserve);
  const props = buildProps(ground, reserve, isReserved);
  buildNature(ground, props, isReserved);

  const occupied = new Set(props.map((p) => `${p.tx},${p.ty}`));
  const decoration = buildDecoration(ground, (x, y) => occupied.has(`${x},${y}`));

  return {
    id: 'lumina-village',
    name: 'Lumina Village',
    safeZone: true,
    width: WIDTH,
    height: HEIGHT,
    background: '#0a120c',
    spawn,
    layers: { ground, decoration },
    props,
    npcs,
    gatherNodes,
    monsterSpawns: [],
    portals: [
      { tx: 25, ty: 0, w: 3, d: 1.2, to: 'forest-edge', spawn: { tx: 15, ty: 5.5 }, label: 'Whispering Forest' }
    ]
  };
}
