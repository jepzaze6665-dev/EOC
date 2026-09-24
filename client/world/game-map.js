// GameMap - a painted top-down image map (the original Lumina Village / forest).
//
// A map = a painted image (what the player sees) + invisible data on top of it
// (what the game uses). Everything shared with tile maps - spawns, exits, NPCs,
// collision helpers - lives in MapBase.
//
//   image          the map picture, drawn at 1:1 (1 image pixel = 1 world pixel)
//   collision      numeric grid decoded from the map JSON
//   objects        small generated sprites placed on the map (barriers, signs ...)
//
// Size is read from the data - nothing here assumes a particular map size.

import { CollisionSystem, decodeCollision } from '../collision/collision-system.js';
import { TILE_SIZE } from '../core/projection.js';
import { MapBase } from './map-base.js';

export class GameMap extends MapBase {
  // data = parsed map JSON, image = loaded HTMLImageElement (null in headless tests)
  constructor(data, image = null) {
    super(data);
    if (data.tileSize && data.tileSize !== TILE_SIZE) {
      throw new Error(`GameMap: ${data.id} uses tileSize ${data.tileSize}, engine uses ${TILE_SIZE}`);
    }
    this.projection = 'topdown';
    this.pixelWidth = data.width * TILE_SIZE;
    this.pixelHeight = data.height * TILE_SIZE;
    this.imagePath = data.image;
    this.image = image;
    this.objects = data.objects || [];

    const c = data.collision;
    this.collision = new CollisionSystem(c.cols, c.rows, c.cellsPerTile, decodeCollision(c.rle, c.cols * c.rows));
  }
}
