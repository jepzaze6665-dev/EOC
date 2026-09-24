// Isometric world settings (used by the tile-map system and the asset builder).
//
// TILE_W / TILE_H   size of one ground tile at zoom 1.0, in CSS pixels (a 2:1 diamond)
// ZOOM_LEVELS       the only zoom steps allowed - no free zoom
// MASTER_SCALE      asset files are stored this many times larger than zoom 1.0.
//                   2 covers the biggest zoom (1.5) even on a screen with Windows
//                   display scaling at 125-133%, so the game almost only ever SHRINKS
//                   art - which is what keeps it sharp.
//
// After changing TILE_W or MASTER_SCALE run `npm run assets` to rebuild the images.

// ENTITY_SCALE       characters/monsters are small pixel-art sprites; on iso maps each of
//                   their pixels is drawn as a whole-number block about this many CSS
//                   pixels wide at zoom 1.0 (whole numbers keep pixel art crisp).
// CHUNK_SIZE        maps are split into square chunks of this many tiles; only the
//                   chunks near the camera are drawn and searched for objects.
// CELLS_PER_TILE    collision is stored this many times finer than a tile.

// LEVEL_H           one step of terrain height (a terrace, a plateau), in CSS pixels at
//                   zoom 1.0 (1.5 x a tile's height, so cliffs read as cliffs like in the
//                   Master Map; the cliff-face pictures are stretched to fit).

export const ISO = {
  TILE_W: 64,
  TILE_H: 32,
  LEVEL_H: 48,
  ZOOM_LEVELS: [1, 1.25, 1.5],
  MASTER_SCALE: 2,
  ENTITY_SCALE: 2,
  CHUNK_SIZE: 32,
  CELLS_PER_TILE: 2
};
