// A harvestable spot in the world (herbs, ore). The item it gives is data-driven:
//   { id, kind: 'herb' | 'ore', itemId, tx, ty, respawn }
// (tx, ty) is where the sprite's feet stand - also the point used for "is the player close enough".

import { worldToScreen, depthOf } from '../core/projection.js';
import { getObjectSprite } from '../rendering/sprites.js';
import { RENDER_LAYERS } from '../rendering/map-renderer.js';
import { getItem } from '../data/items.js';

export class GatherNode {
  constructor(def) {
    this.id = def.id;
    this.kind = def.kind;
    this.itemId = def.itemId;
    this.tx = def.tx;
    this.ty = def.ty;
    this.centerX = def.tx;
    this.centerY = def.ty;
    this.respawnTime = def.respawn ?? 15;
    this.available = true;
    this.timer = 0;
    this.name = getItem(def.itemId)?.name || 'Resource';
  }

  update(dt) {
    if (this.available) return;
    this.timer -= dt;
    if (this.timer <= 0) this.available = true;
  }

  harvest() {
    if (!this.available) return false;
    this.available = false;
    this.timer = this.respawnTime;
    return true;
  }

  render(renderer) {
    if (!this.available) return;
    const sprite = getObjectSprite(this.kind);
    if (!sprite) return;
    const pos = worldToScreen(this.tx, this.ty);
    renderer.queue(depthOf(this.tx, this.ty), () => renderer.drawSprite(sprite, pos.x, pos.y), RENDER_LAYERS.OBJECTS);
  }
}
