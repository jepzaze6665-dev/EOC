// Straight-flying bolt used by ranged basic attacks.
// Moves along its screen-space facing direction.

import { worldToScreen, screenVectorToWorld, depthOf } from '../core/projection.js';
import { RENDER_LAYERS } from '../rendering/map-renderer.js';

export class Projectile {
  constructor({ tx, ty, facing, speed, range, power, color }) {
    this.tx = tx;
    this.ty = ty;
    this.facing = facing;
    this.speed = speed; // tiles per second
    this.power = power;
    this.color = color || '#c6b8ff';
    this.travelled = 0;
    this.maxTravel = range;
    this.alive = true;
    this.hitRadius = 0.55;
  }

  update(dt, map, monsters, onHit) {
    if (!this.alive) return;

    const delta = screenVectorToWorld(this.facing.x * this.speed * dt, this.facing.y * this.speed * dt);
    this.tx += delta.tx;
    this.ty += delta.ty;
    this.travelled += Math.hypot(delta.tx, delta.ty);

    if (this.travelled >= this.maxTravel || map.blocksProjectile(this.tx, this.ty)) {
      this.alive = false;
      return;
    }

    for (const monster of monsters) {
      if (!monster.alive) continue;
      if (Math.hypot(monster.tx - this.tx, monster.ty - this.ty) <= this.hitRadius + monster.radius) {
        this.alive = false;
        onHit(monster, this);
        return;
      }
    }
  }

  render(renderer) {
    if (!this.alive) return;
    const pos = worldToScreen(this.tx, this.ty);
    renderer.queue(depthOf(this.tx, this.ty) + 0.3, (g) => {
      g.save();
      g.globalAlpha = 0.9;
      g.fillStyle = this.color;
      g.fillRect(Math.round(pos.x - 1), Math.round(pos.y - 10), 3, 3);
      g.globalAlpha = 0.45;
      g.fillRect(Math.round(pos.x - 2), Math.round(pos.y - 11), 5, 5);
      g.restore();
    }, RENDER_LAYERS.EFFECTS);
  }
}
