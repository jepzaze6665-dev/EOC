// Forest asset set - which pieces of the AI tile sheets become which game asset.
// Build with:  npm run assets
//
// piece   = number shown on tools/out/sheets/<sheet>-index.png  (run tools/index-sheets.mjs)
// rect    = [x, y, w, h] in sheet pixels, for pieces the auto-cutter merged together
//
// TILES are ground diamonds. anchor:
//   'top'        flat tile, the diamond's top corner is the top of the picture (default)
//   'slab'       tile whose bank sticks up above the diamond - placed from the bottom instead
//   'base'       raised block (cliff) - the bottom corner of the picture sits on the ground
//
// OBJECTS stand on the ground. width = how wide the object is, in tiles.
//   anchor 'bottom' (default): feet at the bottom centre;  'center': flat things (bridges, platforms)
//   collision (in tiles): { circle: r } or { rect: [w, d] }  - used by the map system, not the art

export default {
  tiles: [
    ...[0, 1, 2, 3, 4, 5].map((piece, i) => ({ id: `grass_0${i + 1}`, sheet: 'ground', piece })),
    ...[6, 7, 8, 9, 10, 11].map((piece, i) => ({ id: `dirt_0${i + 1}`, sheet: 'ground', piece })),
    ...[12, 13, 14, 15].map((piece, i) => ({ id: `dirt_edge_0${i + 1}`, sheet: 'ground', piece })),
    ...[18, 19, 20].map((piece, i) => ({ id: `water_0${i + 1}`, sheet: 'ground', piece })),
    ...[21, 22, 23, 24].map((piece, i) => ({ id: `shore_0${i + 1}`, sheet: 'ground', piece })),
    ...[25, 26, 27, 28].map((piece, i) => ({ id: `bank_0${i + 1}`, sheet: 'ground', piece, anchor: 'slab' })),
    ...[30, 31, 32].map((piece, i) => ({ id: `stone_0${i + 1}`, sheet: 'ground', piece })),
    { id: 'ruin_floor_01', sheet: 'ground', piece: 33, anchor: 'slab' },
    { id: 'ruin_floor_02', sheet: 'ground', piece: 34, anchor: 'slab' },
    { id: 'rune_floor_01', sheet: 'ground', piece: 35 },
    ...[36, 37, 38, 39, 40, 41].map((piece, i) => ({ id: `cliff_0${i + 1}`, sheet: 'ground', piece, anchor: 'base' })),
    // ---- edges sheet (added 2026-09-25)
    { id: 'dirt_07', sheet: 'edges', piece: 10 },
    { id: 'dirt_08', sheet: 'edges', piece: 11 },
    // water with a grass bank along BOTH back edges; the renderer cuts it in half
    // when only one back edge touches land
    ...[23, 24, 25, 35].map((piece, i) => ({ id: `shore_back_0${i + 1}`, sheet: 'edges', piece, anchor: 'slab' })),
    { id: 'beach_01', sheet: 'edges', piece: 36, anchor: 'slab' },
    { id: 'beach_02', sheet: 'edges', piece: 37, anchor: 'slab' }
  ],

  // PARTS are stretched by the renderer into a box it works out from the terrain
  // (a cliff face between two heights, a staircase). width = tiles, only sets the file size.
  //   wall_l_*  face on a raised tile's lower-left edge  (top edge slopes down to the right)
  //   wall_r_*  face on its lower-right edge              (top edge slopes up to the right)
  //   wall_c_*  both faces (outer corner)
  //   stairs_n  climbs toward the upper-right (-y)   stairs_w  climbs toward the upper-left (-x)
  parts: [
    { id: 'wall_l_01', sheet: 'edges', piece: 14, width: 0.5 },
    { id: 'wall_l_02', sheet: 'edges', piece: 19, width: 0.5 },
    { id: 'wall_r_01', sheet: 'edges', piece: 15, width: 0.5 },
    { id: 'wall_r_02', sheet: 'edges', piece: 20, width: 0.5 },
    { id: 'wall_c_01', sheet: 'edges', piece: 16, width: 1 },
    { id: 'wall_c_02', sheet: 'edges', piece: 17, width: 1 },
    { id: 'wall_c_03', sheet: 'edges', piece: 18, width: 1 },
    { id: 'stairs_n', sheet: 'edges', piece: 21, width: 1 },
    { id: 'stairs_w', sheet: 'edges', piece: 22, width: 1 }
  ],

  objects: [
    // trees
    { id: 'pine_01', sheet: 'props', piece: 0, width: 1.3, collision: { circle: 0.3 } },
    { id: 'pine_02', sheet: 'props', piece: 1, width: 1.15, collision: { circle: 0.28 } },
    { id: 'pine_03', sheet: 'props', piece: 2, width: 1.05, collision: { circle: 0.25 } },
    { id: 'pine_04', sheet: 'props', piece: 3, width: 1.2, collision: { circle: 0.28 } },
    { id: 'pine_05', sheet: 'props', piece: 4, width: 1.0, collision: { circle: 0.25 } },
    { id: 'tree_01', sheet: 'props', piece: 5, width: 1.35, collision: { circle: 0.3 } },
    { id: 'tree_02', sheet: 'props', piece: 6, width: 1.15, collision: { circle: 0.28 } },
    { id: 'tree_03', sheet: 'props', rect: [1060, 220, 134, 192], width: 1.1, collision: { circle: 0.28 } },
    { id: 'great_tree_01', sheet: 'props', rect: [1195, 14, 425, 446], width: 4.6, collision: { circle: 1.3 } },
    { id: 'great_tree_02', sheet: 'props', piece: 8, width: 3.8, collision: { circle: 1.1 } },
    // undergrowth (walkable - no collision)
    ...[9, 10, 11, 12].map((piece, i) => ({ id: `bush_0${i + 1}`, sheet: 'props', piece, width: 0.95 })),
    ...[13, 14, 15, 16].map((piece, i) => ({ id: `flowers_0${i + 1}`, sheet: 'props', piece, width: 0.55 })),
    ...[17, 18, 19].map((piece, i) => ({ id: `mushroom_0${i + 1}`, sheet: 'props', piece, width: 0.32 })),
    { id: 'log_01', sheet: 'props', piece: 20, width: 2.0, collision: { rect: [1.6, 0.5] } },
    { id: 'log_02', sheet: 'props', piece: 21, width: 1.8, collision: { rect: [1.4, 0.5] } },
    { id: 'stump_01', sheet: 'props', piece: 22, width: 1.0, collision: { circle: 0.3 } },
    { id: 'stump_02', sheet: 'props', piece: 23, width: 0.8, collision: { circle: 0.25 } },
    { id: 'stump_03', sheet: 'props', piece: 24, width: 0.6, collision: { circle: 0.2 } },
    // rocks
    { id: 'pebble_01', sheet: 'props', piece: 25, width: 0.45 },
    { id: 'pebble_02', sheet: 'props', piece: 26, width: 0.45 },
    { id: 'rock_01', sheet: 'props', piece: 27, width: 0.55, collision: { circle: 0.2 } },
    { id: 'rock_02', sheet: 'props', piece: 28, width: 0.8, collision: { circle: 0.3 } },
    { id: 'rock_03', sheet: 'props', piece: 29, width: 1.0, collision: { circle: 0.4 } },
    { id: 'rock_04', sheet: 'props', piece: 30, width: 1.6, collision: { circle: 0.65 } },
    { id: 'rock_05', sheet: 'props', piece: 31, width: 1.4, collision: { circle: 0.55 } },
    { id: 'rock_moss_01', sheet: 'props', piece: 32, width: 1.0, collision: { circle: 0.4 } },
    { id: 'rock_moss_02', sheet: 'props', piece: 33, width: 1.2, collision: { circle: 0.45 } },
    // ruins and stones
    { id: 'obelisk_01', sheet: 'props', piece: 34, width: 0.9, collision: { circle: 0.3 } },
    { id: 'obelisk_02', sheet: 'props', piece: 35, width: 0.8, collision: { circle: 0.28 } },
    { id: 'pillar_01', sheet: 'props', piece: 36, width: 0.7, collision: { circle: 0.25 } },
    { id: 'pillar_02', sheet: 'props', piece: 37, width: 0.65, collision: { circle: 0.25 } },
    { id: 'grave_01', sheet: 'props', piece: 43, width: 0.6, collision: { circle: 0.2 } },
    { id: 'grave_02', sheet: 'props', piece: 38, width: 0.6, collision: { circle: 0.2 } },
    { id: 'ruin_wall_01', sheet: 'props', piece: 39, width: 1.7, collision: { rect: [1.4, 0.5] } },
    { id: 'ruin_arch_01', sheet: 'props', piece: 40, width: 1.3, collision: { rect: [1.0, 0.4] } },
    { id: 'rubble_01', sheet: 'props', piece: 46, width: 1.2, collision: { circle: 0.4 } },
    { id: 'rubble_02', sheet: 'props', piece: 47, width: 1.2, collision: { circle: 0.4 } },
    { id: 'statue_01', sheet: 'props', piece: 41, width: 0.8, collision: { circle: 0.3 } },
    { id: 'statue_02', sheet: 'props', piece: 42, width: 0.9, collision: { circle: 0.3 } },
    // buildings and camp
    { id: 'house_01', sheet: 'props', piece: 48, width: 3.3, collision: { rect: [2.6, 2.4] } },
    { id: 'house_02', sheet: 'props', piece: 49, width: 3.3, collision: { rect: [2.6, 2.4] } },
    { id: 'stall_01', sheet: 'props', piece: 50, width: 2.2, collision: { rect: [1.6, 1.4] } },
    { id: 'stall_02', sheet: 'props', piece: 51, width: 2.3, collision: { rect: [1.7, 1.4] } },
    { id: 'hut_01', sheet: 'props', piece: 52, width: 2.3, collision: { rect: [1.8, 1.8] } },
    { id: 'gate_01', sheet: 'props', piece: 53, width: 2.3, collision: { rect: [2.0, 0.4] } },
    { id: 'gate_02', sheet: 'props', piece: 54, width: 1.9, collision: { rect: [1.6, 0.4] } },
    { id: 'sign_01', sheet: 'props', piece: 56, width: 0.6, collision: { circle: 0.15 } },
    { id: 'sign_02', sheet: 'props', piece: 57, width: 0.5, collision: { circle: 0.15 } },
    { id: 'campfire_01', sheet: 'mixed', rect: [1086, 1524, 106, 78], width: 1.2, collision: { circle: 0.4 } },
    { id: 'tent_01', sheet: 'mixed', rect: [1174, 1408, 176, 178], width: 2.4, collision: { rect: [1.8, 1.6] } },
    // landmarks
    { id: 'waterfall_01', sheet: 'props', piece: 58, width: 4.6, collision: { rect: [3.8, 3.0] } },
    { id: 'shrine_01', sheet: 'props', piece: 59, width: 3.2, collision: { rect: [1.4, 1.4] } },
    { id: 'rune_platform_01', sheet: 'props', piece: 60, width: 3.2, anchor: 'center' },
    { id: 'crystal_arch_01', sheet: 'props', piece: 61, width: 3.4, collision: { rect: [1.2, 0.8] } },
    { id: 'obelisk_shrine_01', sheet: 'props', piece: 62, width: 2.0, collision: { circle: 0.6 } },
    // bridges (flat, walkable)
    ...[42, 43, 44, 45, 46, 47].map((piece, i) => ({ id: `bridge_0${i + 1}`, sheet: 'ground', piece, width: 2.2, anchor: 'center' })),
    // one bridge spanning a 4-tile river (runs along tile x): (5 long + 1.5 wide) tiles on screen
    { id: 'bridge_long_01', sheet: 'ground', piece: 44, width: 3.3, anchor: 'center' }
  ]
};
