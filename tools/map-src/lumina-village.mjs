// Lumina Village - map source.  Build with:  npm run maps
//
// Every coordinate here is in MAP IMAGE PIXELS (the painting is 1280 x 1280),
// so positions can be read straight off docs/Map/LUMINA VILLAGE.
// The builder converts them to tiles (16 px) for the game.
//
// Collision codes: 0 walk · 1 blocked · 2 water · 3 cliff · 4 building · 5 special

const WALK = 0;
const BLOCK = 1;
const WATER = 2;
const CLIFF = 3;
const BUILDING = 4;
const SPECIAL = 5;

export default {
  name: 'Lumina Village',
  safeZone: true,
  source: 'docs/Map/LUMINA VILLAGE',
  background: '#0b130c',

  // ---- 1. automatic guess from the painting's colors (8x8 px cells)
  classify(c) {
    if (c.b > c.r + 25 && c.b > c.g - 5 && c.L > 45) return WATER;          // river, fountain
    if (c.L < 52) return BLOCK;                                               // deep shadow / dense forest
    if (c.g > c.r + 8 && c.g > c.b + 8 && c.L < 70 && c.contrast > 14) return BLOCK; // tree canopies
    return WALK;
  },
  // ---- 2. cleanup of the guess
  smooth: [
    { code: BLOCK, keep: 5, passes: 2 },
    { code: WATER, keep: 4, passes: 1 }
  ],

  // ---- 3. hand-drawn shapes, applied in order (later shapes win)
  shapes: [
    // ===== outer wilderness (never walkable)
    { code: CLIFF, poly: [[0, 0], [270, 0], [262, 120], [236, 170], [200, 250], [150, 262], [128, 330], [60, 380], [0, 380]] }, // NW cliffs + waterfall
    { code: CLIFF, rect: [0, 380, 58, 400] },                                   // west bank beyond the river
    { code: CLIFF, poly: [[334, 0], [1060, 0], [1060, 90], [980, 125], [820, 125], [800, 100], [520, 110], [470, 125], [390, 120], [334, 110]] }, // north forest edge
    { code: CLIFF, poly: [[1040, 0], [1280, 0], [1280, 430], [1188, 430], [1150, 372], [1090, 300], [1060, 250], [1050, 180]] }, // NE cliffs (snow)
    { code: CLIFF, poly: [[1044, 255], [1120, 255], [1150, 300], [1110, 322], [1060, 340], [1044, 330]] }, // rocks beside the inn
    { code: CLIFF, rect: [1190, 430, 90, 850] },                                // east forest
    { code: CLIFF, poly: [[640, 1160], [900, 1160], [1000, 1120], [1180, 1070], [1280, 1060], [1280, 1280], [640, 1280]] }, // south-east cliffs
    { code: CLIFF, rect: [0, 1150, 520, 130] },                                 // south-west cliffs, pond, forest
    { code: CLIFF, rect: [600, 1180, 40, 100] },
    { code: CLIFF, rect: [520, 1245, 80, 35] },                                 // south road ends at the map edge (future exit)

    // ===== buildings (whole silhouette including the roof)
    { code: BUILDING, rect: [448, 238, 66, 84] },     // north cottage
    { code: BUILDING, rect: [528, 280, 100, 108] },   // north house
    { code: BUILDING, rect: [878, 198, 166, 150] },   // Inn
    { code: BUILDING, rect: [788, 256, 80, 80] },     // house beside the inn
    { code: BUILDING, rect: [932, 408, 186, 102] },   // Blacksmith + forge
    { code: BUILDING, rect: [1118, 380, 64, 62] },    // Storage
    { code: BUILDING, rect: [1166, 554, 100, 94] },   // east house
    { code: BUILDING, rect: [986, 600, 54, 66] },     // small house
    { code: BUILDING, poly: [[784, 650], [900, 650], [964, 700], [964, 790], [900, 812], [784, 812]] }, // Class Hall
    { code: BUILDING, rect: [518, 848, 198, 124] },   // Guild Hall
    { code: BUILDING, rect: [262, 858, 126, 116] },   // south house
    { code: BUILDING, rect: [382, 840, 66, 58] },     // shed
    { code: BUILDING, rect: [26, 762, 168, 124] },    // Mill + water wheel
    { code: BUILDING, rect: [44, 502, 94, 100] },     // west house
    { code: BUILDING, rect: [136, 538, 50, 50] },     // west shed
    { code: BUILDING, rect: [140, 584, 122, 124] },   // farmhouse
    { code: BUILDING, rect: [984, 902, 92, 100] },    // barn

    // ===== landmarks and props
    { code: BLOCK, ellipse: [650, 115, 132, 128] },   // Elder Tree canopy + trunk
    { code: BLOCK, ellipse: [640, 596, 50, 40] },     // fountain
    { code: BLOCK, rect: [586, 730, 52, 58] },        // quest board
    // market stalls
    { code: BLOCK, rect: [234, 412, 48, 50] },
    { code: BLOCK, rect: [284, 388, 38, 44] },
    { code: BLOCK, rect: [344, 388, 44, 44] },
    { code: BLOCK, rect: [384, 424, 62, 48] },
    { code: BLOCK, rect: [224, 468, 48, 44] },
    { code: BLOCK, rect: [270, 492, 52, 40] },
    { code: BLOCK, rect: [354, 488, 58, 44] },
    { code: BLOCK, rect: [418, 458, 54, 44] },
    // crop fields
    { code: BLOCK, poly: [[905, 985], [1000, 935], [1215, 1010], [1215, 1060], [1110, 1120], [1000, 1120]] },

    // ===== fences
    { code: BLOCK, width: 6, line: [[512, 160], [520, 270], [620, 290]] },          // Elder Tree garden (west half)
    { code: BLOCK, width: 6, line: [[668, 290], [770, 270], [800, 160]] },          // Elder Tree garden (east half)
    { code: BLOCK, width: 6, line: [[925, 815], [1030, 875], [1175, 800], [1178, 712]] }, // training ground
    { code: BLOCK, width: 6, line: [[855, 1000], [1000, 938]] },                    // farm (north side)
    { code: BLOCK, width: 6, line: [[840, 1030], [1020, 1150]] },                   // farm (south side)

    // ===== walkable fixes (drawn last so they always win)
    { code: WALK, width: 40, line: [[302, 0], [282, 110], [305, 205], [310, 300], [345, 380]] },  // Route A path + stairs
    { code: WALK, width: 40, line: [[1200, 0], [1185, 70], [1172, 125], [1195, 185], [1202, 250], [1150, 320], [1070, 362], [990, 385]] }, // Route B path + bridge
    { code: WALK, width: 36, onlyOver: WATER, line: [[95, 972], [195, 972]] },      // south-west bridge
    { code: WALK, width: 44, onlyOver: WATER, line: [[577, 1130], [577, 1195]] },   // south bridge
    { code: WALK, width: 24, line: [[640, 290], [645, 250]] },                      // gap in the Elder Tree fence

    // ===== Route B is closed for now: special collision just past the bridge
    { code: SPECIAL, rect: [1160, 176, 80, 12] }
  ],

  // Named spawn points. Exits in OTHER maps refer to these names.
  spawns: {
    default: [640, 684],       // plaza, south of the fountain (new game / continue)
    respawn: [640, 684],       // where a defeated player wakes up
    from_forest: [292, 48]     // top of the Route A path, coming back from the forest
  },

  // Exit Zones: walking into the rect loads `to` and places the player on its `spawn`.
  exits: [
    { id: 'route_a', rect: [276, 0, 52, 14], to: 'a1', spawn: 'from_village', label: 'Whispering Forest' }
  ],

  objects: [
    { type: 'barrier', at: [1188, 190], solid: true },
    { type: 'barrier', at: [1212, 190], solid: true },
    { type: 'sign', at: [1160, 268] },
    { type: 'sign', at: [345, 236] }
  ],

  ambient: [
    { type: 'fountain', at: [640, 566] },
    { type: 'campfire', at: [1080, 488] }
  ],

  labels: [
    { text: 'Elder Tree', at: [650, 20] },
    { text: 'Market', at: [345, 372] },
    { text: 'Inn', at: [960, 192] },
    { text: 'Blacksmith', at: [1020, 400] },
    { text: 'Storage', at: [1150, 374] },
    { text: 'Class Hall', at: [870, 642] },
    { text: 'Training Ground', at: [1050, 700] },
    { text: 'Guild Hall', at: [615, 842] },
    { text: 'Mill', at: [110, 756] },
    { text: 'Quest Board', at: [612, 724] }
  ],

  npcs: [
    {
      id: 'elder-maren', name: 'Elder Maren', role: 'Village Elder', at: [724, 610], dir: 's',
      look: { skin: '#d8c0a4', hair: '#d8d4cc', hairStyle: 'long', cloth: '#5a5f8a', accent: '#c9a94a', kit: 'none' },
      lines: [
        'ยินดีต้อนรับสู่ Lumina Village นักเดินทาง',
        'หมู่บ้านนี้ปลอดภัย... แต่โลกข้างนอกไม่ใช่',
        'จำไว้ว่า สิ่งที่สำคัญที่สุดในโลกนี้ มักไม่มีใครบอกทางให้'
      ]
    },
    {
      id: 'brann-smith', name: 'Brann', role: 'Blacksmith', at: [964, 540], dir: 's',
      look: { skin: '#b07a52', hair: '#40281c', hairStyle: 'bald', cloth: '#6b4a3a', accent: '#8a8a98', kit: 'none' },
      lines: [
        'เตาไฟยังร้อนอยู่ แต่ร้านยังไม่เปิดขายนะ',
        'กลับมาใหม่ตอนที่เจ้ามีของให้ข้าตีเถอะ'
      ]
    },
    {
      id: 'sera-merchant', name: 'Sera', role: 'Merchant', at: [330, 470], dir: 's',
      look: { skin: '#e8c3a0', hair: '#8a4a24', hairStyle: 'ponytail', cloth: '#7a5c8a', accent: '#e0c070', kit: 'none' },
      lines: [
        'ของดีมีไม่เยอะ แต่ราคาคุยกันได้',
        'ระบบร้านค้ายังไม่เปิด — รอ Phase ถัดไปก่อนนะ'
      ]
    },
    {
      id: 'tomas-inn', name: 'Tomas', role: 'Innkeeper', at: [940, 364], dir: 's',
      look: { skin: '#dcae82', hair: '#5a3a22', hairStyle: 'short', cloth: '#8a6a4a', accent: '#c9b07a', kit: 'none' },
      lines: [
        'เหนื่อยไหม? เข้ามานั่งพักในโรงเตี๊ยมได้เสมอ',
        'เมื่อคืนมีคนแปลกหน้าถามถึงซากปรักหักพังทางทิศเหนือ... ข้าไม่ได้บอกอะไรไป'
      ]
    },
    {
      id: 'ida-storage', name: 'Ida', role: 'Storage Keeper', at: [1150, 458], dir: 's',
      look: { skin: '#c99a70', hair: '#2e2a26', hairStyle: 'braid', cloth: '#5f6f7a', accent: '#b0b8c0', kit: 'none' },
      lines: ['ของของเจ้าจะปลอดภัยกับข้า สัญญา']
    },
    {
      id: 'kael-drill', name: 'Kael', role: 'Drillmaster', at: [1010, 790], dir: 'w',
      look: { skin: '#a8724a', hair: '#1e1a16', hairStyle: 'short', cloth: '#6a3a3a', accent: '#c0a060', kit: 'blade' },
      lines: [
        'ยืนตัวตรง! หลังจากนี้เจ้าจะต้องสู้ของจริง',
        'หุ่นฝึกกับเป้าธนูตั้งไว้ให้ซ้อมมือ — ศัตรูตัวจริงอยู่นอกหมู่บ้าน'
      ]
    },
    {
      id: 'veyra-trainer', name: 'Master Veyra', role: 'Class Trainer', at: [840, 836], dir: 's',
      look: { skin: '#c9a077', hair: '#5a4a6a', hairStyle: 'long', cloth: '#3f4a6b', accent: '#c9a94a', kit: 'blade' },
      lines: [
        'ข้าเคยเห็นนักผจญภัยมานับไม่ถ้วน คนที่ไปได้ไกลคือคนที่รู้ว่าตัวเองถนัดอะไร',
        'เมื่อเจ้าถึงระดับ 20 กลับมาหาข้า ข้าจะให้บททดสอบที่เหมาะกับคลาสของเจ้า'
      ]
    },
    {
      id: 'nym-wanderer', name: 'Nym', role: '???', at: [600, 262], dir: 's', wanderRadius: 1.5,
      look: { skin: '#cfae8e', hair: '#22202c', hairStyle: 'hood', cloth: '#3b3550', accent: '#8f7bff', kit: 'none' },
      lines: [
        'เจ้าเห็นดวงจันทร์เมื่อคืนไหม',
        'เมื่อเงาของมันบังแสงจนมืดสนิท ประตูบางบานจะเปิดขึ้น',
        '...ข้าไม่ได้พูดอะไรทั้งนั้น'
      ]
    },
    {
      id: 'pip-kid', name: 'Pip', role: 'Villager', at: [560, 560], dir: 's', wanderRadius: 2.5,
      look: { skin: '#edc39c', hair: '#c9a227', hairStyle: 'short', cloth: '#7a8a5c', accent: '#d8d0a0', kit: 'none' },
      lines: ['วิ่งแข่งกันไหม! เอ่อ... เจ้าตัวใหญ่กว่าข้าเยอะเลย']
    },
    {
      id: 'lio-kid', name: 'Lio', role: 'Villager', at: [704, 668], dir: 'w', wanderRadius: 2.5,
      look: { skin: '#c98a5e', hair: '#2a2018', hairStyle: 'short', cloth: '#5c7a8a', accent: '#a0c8d8', kit: 'none' },
      lines: ['ข้าเคยเห็นแสงสีม่วงแถวต้นไม้ใหญ่ตอนกลางคืน จริงนะ!']
    },
    {
      id: 'gate-sign', name: 'Route A', role: 'Sign', kind: 'sign', at: [345, 240],
      lines: [
        'ขึ้นบันไดไปทางเหนือ: Whispering Forest',
        'พ้นประตูนี้ไปไม่ใช่เขตปลอดภัยแล้ว เตรียมตัวให้พร้อมก่อนออกไป'
      ]
    },
    {
      id: 'routeb-sign', name: 'Route B', role: 'Sign', kind: 'sign', at: [1160, 272],
      lines: [
        'ข้ามสะพานไปทางเหนือ: Frostwind Plains',
        'สะพานถูกปิดไว้ — หิมะยังหนาเกินกว่าจะเดินทางได้'
      ]
    },
    {
      id: 'quest-board', name: 'Quest Board', role: 'Board', kind: 'board', at: [612, 800],
      lines: ['กระดานประกาศงานของหมู่บ้าน']
    }
  ],

  gatherNodes: [
    { id: 'herb-0', kind: 'herb', itemId: 'herb-moonleaf', at: [440, 560], respawn: 14 },
    { id: 'herb-1', kind: 'herb', itemId: 'herb-moonleaf', at: [190, 470], respawn: 14 },
    { id: 'herb-2', kind: 'herb', itemId: 'herb-moonleaf', at: [760, 340], respawn: 14 },
    { id: 'herb-3', kind: 'herb', itemId: 'herb-moonleaf', at: [1100, 650], respawn: 14 },
    { id: 'herb-4', kind: 'herb', itemId: 'herb-moonleaf', at: [430, 1030], respawn: 14 },
    { id: 'herb-5', kind: 'herb', itemId: 'herb-moonleaf', at: [760, 1060], respawn: 14 },
    { id: 'ore-0', kind: 'ore', itemId: 'ore-ironvein', at: [420, 270], respawn: 20 },
    { id: 'ore-1', kind: 'ore', itemId: 'ore-ironvein', at: [1090, 560], respawn: 20 },
    { id: 'ore-2', kind: 'ore', itemId: 'ore-ironvein', at: [880, 1130], respawn: 20 },
    { id: 'ore-3', kind: 'ore', itemId: 'ore-ironvein', at: [150, 1060], respawn: 20 }
  ]
};
