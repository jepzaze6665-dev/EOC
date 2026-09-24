// MapBase - what every kind of map offers the rest of the game.
//
// Two kinds exist:  GameMap (painted image, top-down)  and  IsoMap (isometric tiles).
// Scenes, entities and the transition system only use what is defined here, so a
// map of either kind can be loaded, walked on and left in exactly the same way.
//
//   spawns         named spawn points: { default, from_forest, ... }
//   exits          exit zones: { id, tx, ty, w, d, to: 'map-id', spawn: 'spawn-name' }
//   npcs / gatherNodes / monsterSpawns / ambient / labels
//   collision      a CollisionSystem (collision/collision-system.js)

export class MapBase {
  constructor(data) {
    if (!data || !data.width || !data.height) throw new Error('map data needs width and height');
    this.id = data.id;
    this.name = data.name || data.id;
    this.safeZone = !!data.safeZone;
    this.width = data.width;   // in tiles
    this.height = data.height;
    this.background = data.background || '#06060e';

    this.spawns = data.spawns || {};
    if (!this.spawns.default) throw new Error(`map ${data.id} has no "default" spawn point`);
    this.exits = data.exits || [];
    this.npcs = data.npcs || [];
    this.gatherNodes = data.gatherNodes || [];
    this.monsterSpawns = data.monsterSpawns || [];
    this.ambient = data.ambient || [];
    this.labels = data.labels || [];
    this.collision = null; // set by the subclass
  }

  get spawn() {
    return this.spawns.default;
  }

  // A spawn by name ('from_village'), or a raw { tx, ty } point. Unknown names fall
  // back to the default spawn, so a typo never leaves the player stuck in a wall.
  getSpawn(nameOrPoint = 'default') {
    if (nameOrPoint && typeof nameOrPoint === 'object') return nameOrPoint;
    const point = this.spawns[nameOrPoint];
    if (!point && typeof console !== 'undefined') console.warn(`Map ${this.id} has no spawn "${nameOrPoint}", using default`);
    return point || this.spawns.default;
  }

  // The exit zone the point is standing in, if any.
  exitAt(tx, ty) {
    return this.exits.find((e) => tx >= e.tx && tx <= e.tx + e.w && ty >= e.ty && ty <= e.ty + e.d) || null;
  }

  inBounds(tx, ty) {
    return tx >= 0 && ty >= 0 && tx < this.width && ty < this.height;
  }

  collisionAt(tx, ty) {
    return this.collision.codeAt(tx, ty);
  }

  isBlocked(tx, ty) {
    return this.collision.isBlocked(tx, ty);
  }

  blocksProjectile(tx, ty) {
    return this.collision.blocksProjectile(tx, ty);
  }

  canStand(tx, ty, radius = 0.28) {
    return this.collision.canStand(tx, ty, radius);
  }
}
