// Map registry. Adding a map = one line here + one JSON file in data/maps/.
//   painted top-down maps: built from tools/map-src/ with `npm run maps`
//   isometric tile maps:   built from tools/iso-map-src/ with `npm run isomaps`
// No engine code changes are needed for a new map.

export const MAP_FILES = {
  'lumina-village': 'client/data/maps/lumina-village.json',
  'a1': 'client/data/maps/a1.json' // isometric tile map
};

export const DEFAULT_MAP_ID = 'lumina-village';

export function mapIds() {
  return Object.keys(MAP_FILES);
}

// null for an unknown id - the loader turns that into a clear error.
export function mapFile(id) {
  return MAP_FILES[id] || null;
}
