// Ground tile types (Layer 0).
//   collision = code from collision/collision-system.js (0 walkable, 1 blocked, 2 water, 3 cliff ...)
//   palette   = colors for the generated placeholder art
//   speckle   = how noisy the surface looks
//   pattern   = optional surface pattern: 'cobble' | 'rows' | 'planks' | 'steps'
//   frames    = animation frames (water)
//   block     = draw this tile as a raised block (cliffs). It is depth-sorted with
//               objects, so a character behind a cliff is hidden correctly.
//
// Adding a tile = adding an entry here. Nothing in the engine needs to change.
// When real pixel art arrives, only rendering/sprites.js (the generator) is swapped.

export const TILE_DEFS = {
  grass: {
    collision: 0,
    speckle: 0.10,
    palette: { base: '#3d6b3c', light: '#4e8049', dark: '#2d5230' }
  },
  grass2: {
    collision: 0,
    speckle: 0.14,
    palette: { base: '#39653a', light: '#497743', dark: '#294c2c' }
  },
  grass_dark: {
    collision: 0,
    speckle: 0.16,
    palette: { base: '#2f5631', light: '#3c6a3c', dark: '#223f25' }
  },
  flower: {
    collision: 0,
    speckle: 0.20,
    palette: { base: '#3d6b3c', light: '#d8d071', dark: '#a85f8f' }
  },
  path: {
    collision: 0,
    speckle: 0.12,
    palette: { base: '#8a7350', light: '#9e8663', dark: '#6d5a3e' }
  },
  road: {
    collision: 0,
    speckle: 0.06,
    pattern: 'cobble',
    palette: { base: '#a39275', light: '#b9a98a', dark: '#7f7059' }
  },
  plaza: {
    collision: 0,
    speckle: 0.06,
    pattern: 'cobble',
    palette: { base: '#8b8b98', light: '#a2a2ae', dark: '#6b6b78' }
  },
  sand: {
    collision: 0,
    speckle: 0.12,
    palette: { base: '#b09a6c', light: '#c4ae7f', dark: '#8f7c55' }
  },
  dirt: {
    collision: 0,
    speckle: 0.16,
    palette: { base: '#8f7148', light: '#a3845a', dark: '#6f5636' }
  },
  farmland: {
    collision: 0,
    speckle: 0.08,
    pattern: 'rows',
    palette: { base: '#6b4f33', light: '#86653f', dark: '#4e3924' }
  },
  snow: {
    collision: 0,
    speckle: 0.10,
    palette: { base: '#d6e2ee', light: '#f2f7fc', dark: '#aebfd2' }
  },
  bridge: {
    collision: 0,
    speckle: 0.04,
    pattern: 'planks',
    palette: { base: '#8a6442', light: '#a57b53', dark: '#5e422a' }
  },
  bridge_x: {
    collision: 0,
    speckle: 0.04,
    pattern: 'planks_x',
    palette: { base: '#8a6442', light: '#a57b53', dark: '#5e422a' }
  },
  stairs: {
    collision: 0,
    speckle: 0.04,
    pattern: 'steps',
    palette: { base: '#8d8d99', light: '#a9a9b4', dark: '#62626e' }
  },
  water: {
    collision: 2,
    speckle: 0.16,
    frames: 3,
    animSpeed: 2.2,
    palette: { base: '#27507f', light: '#4a7fbb', dark: '#1c3a60' }
  },
  ice_water: {
    collision: 2,
    speckle: 0.14,
    frames: 3,
    animSpeed: 1.6,
    palette: { base: '#4f86ad', light: '#9fd0ee', dark: '#35607f' }
  },
  rock: {
    collision: 1,
    speckle: 0.18,
    palette: { base: '#4a4a56', light: '#5e5e6b', dark: '#33333d' }
  },
  cliff: {
    collision: 3,
    speckle: 0.14,
    palette: { base: '#3a5a36', light: '#4a7044', dark: '#2a4228' },
    block: {
      heights: [14, 18, 22],
      top: '#3f6a3b', topLight: '#528a4b',
      left: '#4d4a55', right: '#66636f', edge: '#7c7986'
    }
  },
  cliff_snow: {
    collision: 3,
    speckle: 0.10,
    palette: { base: '#c9d6e4', light: '#eef4fa', dark: '#a3b4c8' },
    block: {
      heights: [14, 18, 22],
      top: '#dfe8f2', topLight: '#f6f9fc',
      left: '#5a6272', right: '#78808f', edge: '#9aa3b2'
    }
  }
};

// Ground decorations (Layer 1) - small flat details on top of the ground.
// They never block movement; they only break up large areas of the same tile.
export const DECOR_DEFS = {
  tuft: { art: 'tuft', palette: { a: '#5a9451', b: '#2f5a30' } },
  flowers_y: { art: 'flowers', palette: { a: '#e8d56a', b: '#fff3b0', stem: '#3f7a3c' } },
  flowers_p: { art: 'flowers', palette: { a: '#b86fc4', b: '#e2b6ea', stem: '#3f7a3c' } },
  flowers_w: { art: 'flowers', palette: { a: '#e9ecf2', b: '#ffffff', stem: '#3f7a3c' } },
  pebbles: { art: 'pebbles', palette: { a: '#8a8a96', b: '#5e5e6a' } },
  mushroom: { art: 'mushroom', palette: { a: '#c0463a', b: '#f0e0c8' } },
  crop: { art: 'crop', palette: { a: '#8fbf4a', b: '#c9a83a', stem: '#557a2c' } },
  snow_tuft: { art: 'tuft', palette: { a: '#ffffff', b: '#b8c8da' } }
};

export function tileCollision(id) {
  const def = TILE_DEFS[id];
  return def ? def.collision : 1;
}
