// World objects (Layer 2 Objects / Layer 3 Collision Objects).
//   w / d      = footprint in tiles (world x / world y)
//   height     = pixel height of the body
//   solid      = blocks movement over its whole footprint
//   collision  = collision code written for a solid prop (default 1 = blocked, buildings use 4)
//   art        = which generator in rendering/sprites.js draws it
//   label      = floating name shown in the world (optional)

export const PROP_DEFS = {
  house_shop: {
    art: 'building', w: 3, d: 3, height: 20, roofHeight: 12, solid: true, collision: 4, label: 'Trading Post',
    palette: { wall: '#a48c63', wallDark: '#7e6a49', roof: '#43668c', roofDark: '#2f4a68', roofLight: '#557aa2', door: '#4a3324', window: '#e8c977', base: '#484038' }
  },
  house_forge: {
    art: 'building', w: 4, d: 3, height: 22, roofHeight: 13, solid: true, collision: 4, label: 'Blacksmith',
    palette: { wall: '#8d7f74', wallDark: '#6a5e55', roof: '#8c3f34', roofDark: '#642a22', roofLight: '#a35146', door: '#3a2a1e', window: '#ff9d4a', base: '#443c36' }
  },
  house_inn: {
    art: 'building', w: 5, d: 4, height: 28, roofHeight: 17, solid: true, collision: 4, label: 'Inn',
    palette: { wall: '#b09873', wallDark: '#8a7455', roof: '#6b5a8f', roofDark: '#4c3f6b', roofLight: '#8271a8', door: '#4f3626', window: '#ffd98a', base: '#4a4238' }
  },
  house_storage: {
    art: 'building', w: 3, d: 3, height: 20, roofHeight: 11, solid: true, collision: 4, label: 'Storage',
    palette: { wall: '#8f7f6a', wallDark: '#6c5f4f', roof: '#55703f', roofDark: '#3d522d', roofLight: '#688750', door: '#3f2d1f', window: '#d8c079', base: '#443c34' }
  },
  house_guild: {
    art: 'building', w: 5, d: 5, height: 32, roofHeight: 20, solid: true, collision: 4, label: 'Guild Hall',
    palette: { wall: '#9a9ab0', wallDark: '#73738a', roof: '#3f5a86', roofDark: '#2c4063', roofLight: '#50719f', door: '#3b3048', window: '#9fd0ff', base: '#41414f' }
  },
  fountain: {
    art: 'fountain', w: 2, d: 2, height: 14, solid: true,
    palette: { stone: '#9b9ba8', stoneDark: '#75757f', water: '#4a86c4', waterLight: '#7fb6e6' }
  },
  well: {
    art: 'well', w: 1, d: 1, height: 20, solid: true,
    palette: { stone: '#8f8f9a', stoneDark: '#6a6a76', wood: '#6b4f33', roof: '#7a4b3a', water: '#2d5680' }
  },
  quest_board: {
    art: 'board', w: 1, d: 1, height: 17, solid: true, label: 'Quest Board',
    palette: { wood: '#6f4f31', woodDark: '#503826', paper: '#e6dcc0', pin: '#c04a3a' }
  },
  teleport_pad: {
    art: 'pad', w: 2, d: 2, height: 3, solid: false, label: 'Waypoint',
    palette: { stone: '#7c7c92', rune: '#8f7bff', glow: '#c6b8ff' }
  },
  lamp: {
    art: 'lamp', w: 1, d: 1, height: 21, solid: false,
    palette: { post: '#4a4450', metal: '#6b6478', glow: '#ffcf7a' }
  },
  tree_a: {
    art: 'tree', w: 1, d: 1, height: 34, solid: true,
    palette: { trunk: '#5a4029', trunkLight: '#6e5034', leaf: '#356b39', leafLight: '#48874a', leafDark: '#234a28' }
  },
  tree_b: {
    art: 'tree', w: 1, d: 1, height: 28, solid: true,
    palette: { trunk: '#4f3a26', trunkLight: '#63492f', leaf: '#2f5f52', leafLight: '#3f7a68', leafDark: '#1f453c' }
  },
  rock: {
    art: 'rock', w: 1, d: 1, height: 11, solid: true,
    palette: { stone: '#6a6a78', stoneLight: '#82828f', stoneDark: '#4a4a56' }
  },
  gate_pillar: {
    art: 'pillar', w: 1, d: 1, height: 30, solid: true,
    palette: { stone: '#8a8a98', stoneDark: '#63636f', glow: '#ffcf7a' }
  },
  crate: {
    art: 'crate', w: 1, d: 1, height: 10, solid: true,
    palette: { body: '#8a6a43', bodyDark: '#6b5133', edge: '#a88355' }
  },
  barrel: {
    art: 'crate', w: 1, d: 1, height: 11, solid: true,
    palette: { body: '#6f5236', bodyDark: '#523c27', edge: '#8a8a98' }
  },
  anvil: {
    art: 'crate', w: 1, d: 1, height: 8, solid: true,
    palette: { body: '#4c4c58', bodyDark: '#35353f', edge: '#63636f' }
  },
  dummy: {
    art: 'dummy', w: 1, d: 1, height: 19, solid: true, label: 'Training Dummy',
    palette: { post: '#6b4f33', straw: '#c7a25a', strawDark: '#9c7c42', band: '#7a3f35' }
  },
  fence_x: {
    art: 'fence', axis: 'x', w: 1, d: 1, height: 9, solid: true,
    palette: { wood: '#7a5c3a', woodDark: '#5a4229' }
  },
  fence_y: {
    art: 'fence', axis: 'y', w: 1, d: 1, height: 9, solid: true,
    palette: { wood: '#7a5c3a', woodDark: '#5a4229' }
  },
  campfire: {
    art: 'campfire', w: 1, d: 1, height: 12, solid: true,
    palette: { log: '#5a4029', logDark: '#3d2b1b', flame: '#ff9a3c', flameLight: '#ffd24a', stone: '#6a6a78' }
  },
  ruin_pillar: {
    art: 'ruin', w: 1, d: 1, height: 26, solid: true,
    palette: { stone: '#8f8f9c', stoneDark: '#5f5f6c', moss: '#4e8f57' }
  },
  herb_bush: {
    art: 'herb', w: 1, d: 1, height: 13, solid: false,
    palette: { leaf: '#4e8f57', leafLight: '#6fd08a', glow: '#c8f4d8', stem: '#3a6b44' }
  },
  ore_node: {
    art: 'ore', w: 1, d: 1, height: 14, solid: true,
    palette: { stone: '#5f5f6d', stoneLight: '#7c7c8a', stoneDark: '#42424e', vein: '#c9a05a', veinLight: '#ecd09a' }
  },
  sign: {
    art: 'sign', w: 1, d: 1, height: 15, solid: true,
    palette: { wood: '#6f4f31', woodDark: '#503826', board: '#8a6a43', text: '#e6dcc0' }
  },

  // ---- Lumina Village (100x100) additions ----
  house_a: {
    art: 'building', w: 3, d: 3, height: 20, roofHeight: 12, solid: true, collision: 4,
    palette: { wall: '#c2ab85', wallDark: '#977f5c', roof: '#b0532e', roofDark: '#7e3a20', roofLight: '#c96a40', door: '#4a3324', window: '#ffd98a', base: '#4a4238' }
  },
  house_b: {
    art: 'building', w: 4, d: 3, height: 24, roofHeight: 14, solid: true, collision: 4,
    palette: { wall: '#b8a07a', wallDark: '#8c7654', roof: '#a4492a', roofDark: '#73311c', roofLight: '#bf5e3a', door: '#4f3626', window: '#ffd98a', base: '#4a4238' }
  },
  house_c: {
    art: 'building', w: 2, d: 2, height: 16, roofHeight: 9, solid: true, collision: 4,
    palette: { wall: '#a88f69', wallDark: '#7f6a4b', roof: '#9a4b2c', roofDark: '#6b321c', roofLight: '#b35f3c', door: '#3f2d1f', window: '#e8c977', base: '#443c34' }
  },
  house_hall: {
    art: 'building', w: 4, d: 4, height: 26, roofHeight: 15, solid: true, collision: 4, label: 'Class Hall',
    palette: { wall: '#8a8a94', wallDark: '#64646e', roof: '#a4492a', roofDark: '#73311c', roofLight: '#bf5e3a', door: '#3b3048', window: '#ff9d4a', base: '#41414f' }
  },
  house_mill: {
    art: 'building', w: 3, d: 3, height: 22, roofHeight: 13, solid: true, collision: 4, label: 'Mill',
    palette: { wall: '#9c8462', wallDark: '#735f44', roof: '#a4492a', roofDark: '#73311c', roofLight: '#bf5e3a', door: '#3f2d1f', window: '#e8c977', base: '#50504f' }
  },
  pine: {
    art: 'pine', w: 1, d: 1, height: 38, solid: true,
    palette: { trunk: '#4f3a26', leaf: '#24553a', leafLight: '#347049', leafDark: '#173d29' }
  },
  pine_snow: {
    art: 'pine', w: 1, d: 1, height: 38, solid: true,
    palette: { trunk: '#4f3a26', leaf: '#2c4f4a', leafLight: '#e9f1f8', leafDark: '#1f3935' }
  },
  great_tree: {
    art: 'great_tree', w: 4, d: 4, height: 96, solid: true, label: 'Elder Tree',
    palette: { trunk: '#5e4228', trunkLight: '#7a5836', trunkDark: '#3f2c1a', leaf: '#3f7a3a', leafLight: '#62a352', leafDark: '#2a5528', lantern: '#ffcf7a' }
  },
  bush: {
    art: 'bush', w: 1, d: 1, height: 10, solid: true,
    palette: { leaf: '#3d7a3f', leafLight: '#55984f', leafDark: '#2a5a2d' }
  },
  stall_blue: {
    art: 'stall', w: 2, d: 2, height: 17, solid: true, collision: 4,
    palette: { post: '#6b4f33', table: '#8a6a43', cloth: '#3f6aa8', clothLight: '#e8e4d8', goods: '#c9a05a' }
  },
  stall_red: {
    art: 'stall', w: 2, d: 2, height: 17, solid: true, collision: 4,
    palette: { post: '#6b4f33', table: '#8a6a43', cloth: '#b8483a', clothLight: '#e8e4d8', goods: '#7fb04a' }
  },
  stall_cream: {
    art: 'stall', w: 2, d: 2, height: 17, solid: true, collision: 4,
    palette: { post: '#6b4f33', table: '#8a6a43', cloth: '#d8c89a', clothLight: '#f2ead2', goods: '#b86fc4' }
  },
  forge: {
    art: 'forge', w: 1, d: 1, height: 26, solid: true,
    palette: { stone: '#5a5a66', stoneDark: '#3e3e48', fire: '#ff7a2a', fireLight: '#ffd24a' }
  },
  target: {
    art: 'target', w: 1, d: 1, height: 18, solid: true,
    palette: { post: '#6b4f33', ring: '#e8e0d0', red: '#b8483a' }
  },
  barrier: {
    art: 'barrier', w: 1, d: 1, height: 12, solid: true, collision: 5,
    palette: { wood: '#7a5c3a', woodDark: '#5a4229', stripe: '#c9a94a' }
  }
};
