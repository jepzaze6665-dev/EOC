// Map Manager - the one place that knows which maps exist and which one is active.
//
//   load(id)            -> Promise<GameMap>   (JSON + image, cached after the first time)
//   setCurrent(map)     marks the map the local player is on
//   preloadNeighbors()  quietly starts loading every map the current map's exits lead to,
//                       so walking through an exit is instant
//
// The manager does not know about the player, the camera or the screen - those
// belong to the scene. That keeps it usable by a server later (Phase 7), where
// many players are on many maps at once.

import { MAP_FILES, DEFAULT_MAP_ID } from '../data/maps.js';
import { loadMap } from './map-loader.js';

export class MapManager {
  // `loader` can be swapped out (the headless tests load JSON from disk instead of fetch).
  constructor({ loader = loadMap, registry = MAP_FILES } = {}) {
    this.loader = loader;
    this.registry = registry;
    this.current = null;
    this.pending = new Map();
  }

  get defaultMapId() {
    return DEFAULT_MAP_ID;
  }

  has(id) {
    return Object.prototype.hasOwnProperty.call(this.registry, id);
  }

  ids() {
    return Object.keys(this.registry);
  }

  load(id) {
    if (!this.has(id)) return Promise.reject(new Error(`Unknown map: ${id}`));
    return this.loader(id);
  }

  setCurrent(map) {
    this.current = map;
  }

  get currentId() {
    return this.current ? this.current.id : null;
  }

  // Warm the cache for every map reachable from the current one. Errors are ignored
  // here - a real transition will report them if it happens.
  preloadNeighbors() {
    if (!this.current) return;
    for (const exit of this.current.exits) {
      if (!this.has(exit.to) || this.pending.has(exit.to)) continue;
      const job = this.load(exit.to).catch(() => null);
      this.pending.set(exit.to, job);
    }
  }
}
