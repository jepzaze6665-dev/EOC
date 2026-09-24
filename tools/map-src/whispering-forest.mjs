// Whispering Forest (A1) - map source.  Build with:  npm run maps
// Coordinates are MAP IMAGE PIXELS of docs/Map/WHISPERING FOREST (1280 x 1280).
//
// World Phase 1R scope: walkable forest, the way back to the village, and the
// existing monsters / resources so combat and quests keep working.
// The Guardian of the Forest (stone circle, north-east) and the exit to A2
// arrive in World Phase 4.

const WALK = 0;
const BLOCK = 1;
const WATER = 2;
const CLIFF = 3;
const BUILDING = 4;

export default {
  name: 'Whispering Forest',
  safeZone: false,
  source: 'docs/Map/WHISPERING FOREST',
  background: '#07100a',

  classify(c) {
    if (c.b > c.r + 25 && c.b > c.g - 5 && c.L > 45) return WATER;
    if (c.L < 52) return BLOCK;
    if (c.g > c.r + 8 && c.g > c.b + 8 && c.L < 70 && c.contrast > 14) return BLOCK;
    return WALK;
  },
  smooth: [
    { code: BLOCK, keep: 5, passes: 2 },
    { code: WATER, keep: 4, passes: 1 }
  ],

  shapes: [
    // ===== hamlet in the north-west corner
    { code: BUILDING, rect: [58, 42, 56, 60] },
    { code: BUILDING, rect: [90, 90, 48, 56] },
    { code: BUILDING, rect: [18, 112, 60, 60] },
    { code: BUILDING, rect: [34, 178, 60, 64] },
    { code: BUILDING, rect: [138, 122, 34, 40] },
    { code: BUILDING, rect: [158, 156, 40, 36] },
    { code: BUILDING, rect: [188, 206, 34, 40] },
    { code: BLOCK, width: 6, line: [[0, 262], [124, 262]] },    // hamlet fence (west of the gate)
    { code: BLOCK, width: 6, line: [[172, 262], [250, 256]] },  // hamlet fence (east of the gate)

    // ===== the great tree and its terrace
    { code: BLOCK, ellipse: [512, 95, 135, 100] },              // canopy
    { code: BLOCK, ellipse: [515, 215, 88, 62] },               // trunk and roots
    { code: CLIFF, width: 18, line: [[268, 296], [330, 330], [420, 362], [508, 372]] }, // terrace edge (west of the stairs)
    { code: CLIFF, width: 18, line: [[552, 372], [640, 380]] },                          // terrace edge (east of the stairs)

    // ===== hunter camp (centre-west): tents, crates, campfire, standing stone
    { code: BLOCK, poly: [[452, 575], [510, 570], [540, 620], [535, 675], [488, 675], [450, 655]] }, // tents
    { code: BLOCK, rect: [398, 548, 38, 36] },
    { code: BLOCK, rect: [372, 568, 30, 32] },
    { code: BLOCK, rect: [330, 598, 34, 30] },
    { code: BLOCK, rect: [402, 592, 58, 26] },
    { code: BLOCK, rect: [392, 636, 32, 24] },
    { code: BLOCK, circle: [450, 676, 14] },    // campfire
    { code: BLOCK, rect: [364, 680, 24, 42] },  // standing stone
    { code: BLOCK, rect: [336, 646, 32, 32] },
    { code: BLOCK, rect: [458, 696, 30, 28] },
    // south camp campfire
    { code: BLOCK, circle: [672, 974, 14] },

    // ===== cliffs along the south edge (the stairs up from the village cut through them)
    { code: CLIFF, poly: [[600, 1180], [790, 1150], [790, 1280], [600, 1280]] },
    { code: CLIFF, poly: [[855, 1150], [1150, 1170], [1280, 1150], [1280, 1280], [855, 1280]] },

    // ===== walkable fixes
    { code: WALK, width: 36, line: [[822, 1280], [822, 1190], [826, 1125], [850, 1075]] }, // stairs from the village
    { code: WALK, width: 26, line: [[530, 250], [528, 300]] },                             // stairs down from the tree
    { code: WALK, width: 26, line: [[530, 345], [530, 395]] },                             // stairs down the terrace
    { code: WALK, width: 40, line: [[147, 250], [147, 290]] },                             // hamlet gate
    { code: WALK, width: 40, line: [[660, 640], [770, 640]] },                             // main bridge
    { code: WALK, width: 26, line: [[990, 250], [1000, 300]] }                             // stairs to the stone circle
  ],

  spawns: {
    default: [822, 1226],
    from_village: [822, 1226]   // top of the stairs up from Lumina Village
  },

  exits: [
    { id: 'to_village', rect: [800, 1264, 46, 16], to: 'lumina-village', spawn: 'from_forest', label: 'Lumina Village' }
    // A2 Ancient Valley exit arrives in World Phase 4 (behind the Guardian of the Forest)
  ],

  objects: [
    { type: 'sign', at: [856, 1112] }
  ],

  ambient: [
    { type: 'campfire', at: [441, 680] },
    { type: 'campfire', at: [672, 970] }
  ],

  npcs: [
    {
      id: 'forest-sign', name: 'Weathered Sign', role: 'Sign', kind: 'sign', at: [856, 1116],
      lines: [
        'ระวัง: พ้นจากจุดนี้ไปไม่ใช่เขตปลอดภัยของหมู่บ้าน',
        'มีคนขีดข้อความเพิ่มไว้ด้วยลายมือสั่น ๆ ว่า "อย่าเข้าใกล้วงหินทางตะวันออกเฉียงเหนือตอนที่ฟ้ามืด"'
      ]
    }
  ],

  // gloom-slime = easy, around the camp and the paths near the entrance
  // hollow-stalker = tougher, deeper in on the eastern loop
  monsterSpawns: [
    { id: 'slime-0', type: 'gloom-slime', at: [752, 1008] },
    { id: 'slime-1', type: 'gloom-slime', at: [700, 880] },
    { id: 'slime-2', type: 'gloom-slime', at: [611, 785] },
    { id: 'slime-3', type: 'gloom-slime', at: [380, 640] },
    { id: 'slime-4', type: 'gloom-slime', at: [304, 520] },
    { id: 'slime-5', type: 'gloom-slime', at: [560, 520] },
    { id: 'slime-6', type: 'gloom-slime', at: [182, 860] },
    { id: 'stalker-0', type: 'hollow-stalker', at: [1000, 1010] },
    { id: 'stalker-1', type: 'hollow-stalker', at: [1168, 872] },
    { id: 'stalker-2', type: 'hollow-stalker', at: [1054, 768] },
    { id: 'stalker-3', type: 'hollow-stalker', at: [930, 780] }
  ],

  gatherNodes: [
    { id: 'f-herb-0', kind: 'herb', itemId: 'herb-moonleaf', at: [470, 470], respawn: 12 },
    { id: 'f-herb-1', kind: 'herb', itemId: 'herb-moonleaf', at: [720, 900], respawn: 12 },
    { id: 'f-herb-2', kind: 'herb', itemId: 'herb-moonleaf', at: [1060, 760], respawn: 12 },
    { id: 'f-herb-3', kind: 'herb', itemId: 'herb-moonleaf', at: [210, 560], respawn: 12 },
    { id: 'f-herb-4', kind: 'herb', itemId: 'herb-moonleaf', at: [330, 700], respawn: 12 },
    { id: 'f-ore-0', kind: 'ore', itemId: 'ore-ironvein', at: [140, 390], respawn: 16 },
    { id: 'f-ore-1', kind: 'ore', itemId: 'ore-ironvein', at: [880, 740], respawn: 16 },
    { id: 'f-ore-2', kind: 'ore', itemId: 'ore-ironvein', at: [430, 1080], respawn: 16 },
    { id: 'f-ore-3', kind: 'ore', itemId: 'ore-ironvein', at: [960, 1050], respawn: 16 }
  ]
};
