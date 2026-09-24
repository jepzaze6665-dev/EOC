// Map Loader - fetches a map's JSON data, loads what it needs, builds the map object.
//
//   type 'iso'   -> IsoMap   (tile map; loads only the asset pictures this map uses)
//   otherwise    -> GameMap  (painted top-down image map)
//
// Downloads are cached, so walking back and forth between two maps is instant.

import { GameMap } from './game-map.js';
import { IsoMap } from './iso-map.js';
import { mapFile } from '../data/maps.js';
import { assetStore } from '../rendering/asset-store.js';

const cache = new Map();

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load map image: ${src}`));
    image.src = src;
  });
}

async function loadMapAssets(id) {
  const file = mapFile(id);
  if (!file) throw new Error(`Unknown map: ${id}`);
  const response = await fetch(file);
  if (!response.ok) throw new Error(`Could not load map data: ${file} (${response.status})`);
  const data = await response.json();

  if (data.type === 'iso') {
    const registry = await assetStore.loadRegistry();
    const probe = new IsoMap(data, registry); // validates asset ids, lists what to load
    await assetStore.ensure(probe.assetIds());
    return { data, image: null };
  }
  return { data, image: await loadImage(data.image) };
}

// Returns a fresh map object every time (so per-visit state never leaks between visits),
// but downloads only happen once.
export async function loadMap(id) {
  if (!cache.has(id)) {
    const pending = loadMapAssets(id);
    cache.set(id, pending);
    pending.catch(() => cache.delete(id));
  }
  const { data, image } = await cache.get(id);
  if (data.type === 'iso') return new IsoMap(data, assetStore.registry);
  return new GameMap(data, image);
}
