// A1 - Whispering Forest (isometric tile map, 150 x 150).  Build with:  npm run isomaps
//
// Layout comes from the Master Map painting (docs/Map/WHISPERING FOREST): the builder
// looks at the painting only to decide WHERE forest / path / water / stone go.
// The game never sees the painting - it gets tiles and objects from the asset sheets.
//
// Coordinates below are TILES (painting pixel / 8.53). Tile x = east, tile y = south
// in the painting; on screen the painting's north edge becomes the upper-right edge.

export default {
  id: 'a1',
  name: 'Whispering Forest',
  safeZone: false,
  width: 150,
  height: 150,
  masterMap: 'docs/Map/WHISPERING FOREST',
  background: '#0a120c',

  // ---- 1. terrain class of every tile, from the painting's colours
  // c = average colour of the painting area under one tile: r g b, L (lightness),
  // sat (saturation), contrast (how busy the area is)
  classify(c) {
    if (c.b > c.r + 25 && c.b > c.g - 5 && c.L > 45) return 'water';
    if (c.L < 44) return 'dense';                                        // deep forest: no way through
    if (c.g > c.r + 8 && c.g > c.b + 8 && c.L < 70 && c.contrast > 14) return 'forest'; // walkable woods
    if (c.r > c.b + 28 && c.L > 80 && c.sat > 30) return 'path';
    if (c.sat < 26 && c.L > 70 && c.L < 170) return 'stone';
    return 'grass';
  },
  edgeClass: 'dense',  // a 3-tile ring of deep forest keeps the map edge closed
  edgeWidth: 3,

  // ---- 2. what each terrain class looks like and whether it can be walked on.
  // group = which terrains blend into each other at their borders (grass creeps over dirt,
  // dirt over stone; water gets banks and foam instead)
  terrain: {
    grass: { group: 'grass', tiles: { grass_01: 4, grass_02: 3, grass_03: 1, grass_04: 1, grass_05: 1, grass_06: 1 } },
    forest: { group: 'grass', tiles: { grass_01: 3, grass_02: 4 } },
    dense: { group: 'grass', tiles: { grass_02: 1 }, collision: 1 },
    path: { group: 'dirt', tiles: { dirt_01: 3, dirt_02: 3, dirt_03: 1, dirt_04: 2, dirt_05: 1, dirt_06: 1, dirt_07: 2, dirt_08: 1 } },
    stone: { group: 'stone', tiles: { stone_01: 2, stone_02: 2, stone_03: 1 } },
    rune: { group: 'stone', tiles: { stone_01: 1, stone_02: 1 } },
    ruin: { group: 'stone', tiles: { ruin_floor_01: 1, ruin_floor_02: 1, stone_03: 2 } },
    water: { group: 'water', tiles: { water_01: 2, water_02: 2, water_03: 1 }, collision: 2 }
  },

  // ---- 3. hand-painted areas (applied after the painting, in order)
  paint: [
    { terrain: 'grass', rect: [2, 3, 25, 27] },                        // hamlet clearing (north-west)
    // the painted bridge is brown, so the colours read it as path - put the river back under it
    { terrain: 'water', line: [[90, 71], [76, 80]], width: 3.2 },
    // the crossing: the banks reach out so the river is 4 tiles wide under the bridge
    { terrain: 'grass', rect: [76, 74, 4, 3] },
    { terrain: 'grass', rect: [84, 74, 4, 3] },
    { terrain: 'water', rect: [80, 73, 4, 5] },
    { terrain: 'path', line: [[80, 72.5], [78.2, 75.5]], width: 1.8 },
    { terrain: 'path', line: [[85.8, 75.5], [88.5, 78]], width: 1.8 },
    { terrain: 'path', line: [[17, 30], [22, 36], [30, 42]], width: 2.2 }, // hamlet gate road
    { terrain: 'path', rect: [60, 36, 4, 11] },                         // road up the terrace stairs
    { terrain: 'grass', ellipse: [60, 26, 7, 5] },                      // ground around the great tree
    { terrain: 'rune', ellipse: [125, 23.5, 14, 10] },                 // stone circle (future boss arena)
    { terrain: 'grass', ellipse: [124.5, 40.5, 6, 4.5] },                // clearing in front of the circle stairs
    { terrain: 'path', line: [[124.8, 36], [123, 42], [112, 48]], width: 2.6 },
    { terrain: 'ruin', ellipse: [110, 80, 5, 4] },                      // crystal ruins (east)
    { terrain: 'grass', ellipse: [133.5, 66.8, 3, 2.5] },               // hidden shrine clearing
    { terrain: 'grass', ellipse: [12, 121, 5, 4] },                     // south-west shrine
    { terrain: 'dense', rect: [3, 139, 144, 11] },                     // deep forest below the southern cliff ...
    { terrain: 'path', rect: [93, 126, 7, 24] }                         // ... cut by the stairs from the village
  ],

  // ---- 3b. terrain height (levels). The forest floor is level 1; the strip along the south
  // edge (where the road comes up from the village) is lower, the great-tree terrace and
  // the stone-circle plateau are higher. Cliff faces are drawn wherever the level drops.
  baseLevel: 1,
  heights: [
    { level: 0, rect: [0, 138, 150, 12] },
    { level: 2, poly: [[28, 2], [80, 2], [80, 44], [66, 45], [60, 43.5], [45, 40.5], [31, 35.5], [28, 34]] },
    { level: 2, ellipse: [125, 23.5, 16.5, 12.5] }
  ],
  // stair runs: 'n' climbs toward -y. at = first column + the row to search around
  stairs: [
    { at: [94, 138], dir: 'n', width: 5 },  // up from the village road
    { at: [60, 44], dir: 'n', width: 4 },   // up to the great tree
    { at: [123, 36], dir: 'n', width: 4 }   // up to the stone circle
  ],

  // ---- 4. landmarks (asset id, feet position in tiles). Nature is never placed near them.
  landmarks: [
    ['great_tree_01', 60, 26.5],
    ['waterfall_01', 100, 53],
    // hunter camp
    ['tent_01', 58.5, 74], ['campfire_01', 51.7, 79.7], ['log_01', 48, 77.5], ['stump_01', 55.5, 82],
    ['stump_03', 47.5, 81.5], ['log_02', 54, 70.5],
    // south camp
    ['campfire_01', 78.8, 113.7], ['log_02', 81.5, 111.5], ['stump_02', 76.5, 111],
    // main bridge over the river
    ['bridge_long_01', 82, 75.5],
    // stone circle
    ['rune_platform_01', 125, 23.5],
    ['obelisk_01', 113, 23.5], ['obelisk_01', 137, 23.5], ['obelisk_02', 125, 15], ['obelisk_02', 125, 32],
    ['obelisk_02', 116.5, 17.5], ['obelisk_02', 133.5, 17.5], ['obelisk_01', 116.5, 29.5], ['obelisk_01', 133.5, 29.5],
    // crystal ruins
    ['crystal_arch_01', 112, 78], ['pillar_01', 106.5, 77], ['pillar_02', 113.5, 83.5], ['rubble_01', 107.5, 83], ['statue_02', 104.5, 80.5],
    // hidden shrine (east) - a clue for the Hidden Forest Hollow (Milestone 3)
    ['obelisk_shrine_01', 133.5, 67],
    // standing stones on the terrace
    ['obelisk_01', 44, 33], ['obelisk_02', 70, 34.5], ['pillar_02', 50, 36], ['statue_01', 66.5, 31],
    // hamlet
    ['house_01', 10, 10.5], ['house_02', 15.5, 16], ['house_01', 6, 20], ['hut_01', 9, 26.5],
    ['stall_01', 20, 19.5], ['stall_02', 22.5, 24], ['hut_01', 25, 28], ['gate_02', 17.2, 30.6],
    ['sign_01', 20, 33],
    // south-west shrine and ruined walls
    ['shrine_01', 12.5, 121.5],
    ['ruin_wall_01', 64, 127], ['ruin_wall_01', 70, 128], ['ruin_wall_01', 76, 127], ['rubble_02', 73, 125.5],
    // sign at the top of the village stairs
    ['sign_02', 99.5, 133]
  ],

  // ---- 5. nature, per terrain class: [chance per tile, { asset: weight }, options]
  // options.cluster = [blob size, low, high]: chance rises and falls with smooth noise, so
  // trees stand in groves with clearings between them and flowers grow in patches.
  nature: {
    dense: [[0.8, { pine_01: 3, pine_02: 3, pine_03: 2, pine_04: 3, pine_05: 1 }]],
    forest: [
      [0.5, { pine_01: 2, pine_02: 2, pine_03: 2, pine_04: 2, pine_05: 2, tree_01: 1, tree_02: 1, tree_03: 1 }, { cluster: [7, 0.25, 1.5] }],
      [0.1, { bush_01: 1, bush_02: 1, bush_03: 1, bush_04: 1 }, { cluster: [4, 0.2, 1.8] }],
      [0.04, { mushroom_01: 1, mushroom_02: 1, mushroom_03: 1 }, { cluster: [3, 0, 2.5] }],
      [0.03, { flowers_01: 1, flowers_04: 1 }, { cluster: [4, 0, 2.5] }]
    ],
    grass: [
      [0.05, { tree_01: 2, tree_02: 2, tree_03: 1, pine_05: 1 }, { cluster: [6, 0, 2.2] }],
      [0.06, { bush_01: 1, bush_02: 1, bush_03: 1, bush_04: 1 }, { cluster: [4, 0.1, 2] }],
      [0.1, { flowers_01: 1, flowers_02: 1, flowers_03: 1, flowers_04: 1 }, { cluster: [5, 0, 2.6] }],
      [0.012, { rock_01: 2, rock_02: 2, rock_03: 1, rock_moss_01: 1 }, { cluster: [5, 0, 2.5] }],
      [0.012, { pebble_01: 1, pebble_02: 1 }],
      [0.005, { stump_01: 1, stump_02: 1, stump_03: 1 }],
      [0.003, { log_01: 1, log_02: 1 }]
    ],
    path: [[0.025, { pebble_01: 1, pebble_02: 1 }]],
    stone: [[0.03, { pebble_01: 1, rock_01: 1 }]]
  },
  // extra rules for tiles at the foot of a cliff face: fallen rocks and bushes
  cliffFoot: [
    [0.22, { rock_02: 2, rock_03: 2, rock_moss_01: 2, rock_moss_02: 1, rubble_02: 1 }],
    [0.12, { bush_01: 1, bush_03: 1 }]
  ],


  // ---- 6. gameplay data
  spawns: {
    default: [96.4, 141.5],
    from_village: [96.4, 141.5]
  },
  exits: [
    { id: 'to_village', rect: [93, 148.2, 7, 1.8], to: 'lumina-village', spawn: 'from_forest', label: 'Lumina Village' }
    // North-east exit to A2 arrives with the Forest Guardian (Milestone 2)
  ],
  // walkable areas that the tiles would otherwise block (the bridge over the water)
  collisionZones: [
    { rect: [79.4, 74.8, 5.2, 1.4], code: 0 }
  ],
  // no particle emitters on this map: performance first (the campfire picture is enough)
  ambient: []
};
