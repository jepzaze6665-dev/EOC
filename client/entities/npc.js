import { worldToScreen, facingFromWorldVector, depthOf } from '../core/projection.js';
import { buildCharacterSheet, drawSheetFrame, drawShadow, WALK_FRAMES, CHARACTER_HEIGHT } from '../rendering/sprites.js';

const WANDER_SPEED = 0.9; // tiles per second

export class Npc {
  constructor(def) {
    this.id = def.id;
    this.name = def.name;
    this.role = def.role || '';
    this.kind = def.kind || 'person';
    this.lines = def.lines || [];
    this.tx = def.tx;
    this.ty = def.ty;
    this.homeTx = def.tx;
    this.homeTy = def.ty;
    this.dir = def.dir || 's';
    this.wanderRadius = def.wanderRadius || 0;
    this.radius = 0.24;

    this.target = null;
    this.waitTimer = 1 + Math.random() * 3;
    this.frame = 0;
    this.animTime = 0;
    this.sheet = this.kind === 'person' ? buildCharacterSheet(def.look) : null;
  }

  update(dt, map) {
    if (this.kind !== 'person' || this.wanderRadius <= 0) return;

    if (!this.target) {
      this.waitTimer -= dt;
      this.animTime = 0;
      this.frame = 0;
      if (this.waitTimer > 0) return;

      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * this.wanderRadius;
      const tx = this.homeTx + Math.cos(angle) * dist;
      const ty = this.homeTy + Math.sin(angle) * dist;
      if (map.canStand(tx, ty, this.radius)) this.target = { tx, ty };
      this.waitTimer = 1.5 + Math.random() * 3;
      return;
    }

    const dx = this.target.tx - this.tx;
    const dy = this.target.ty - this.ty;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.08) {
      this.target = null;
      return;
    }

    const stepX = (dx / dist) * WANDER_SPEED * dt;
    const stepY = (dy / dist) * WANDER_SPEED * dt;
    if (map.canStand(this.tx + stepX, this.ty, this.radius)) this.tx += stepX;
    else this.target = null;
    if (map.canStand(this.tx, this.ty + stepY, this.radius)) this.ty += stepY;
    else this.target = null;

    const facing = facingFromWorldVector(stepX, stepY);
    if (facing) this.dir = facing;

    this.animTime += dt;
    this.frame = Math.floor(this.animTime * 7) % WALK_FRAMES;
  }

  faceTowards(tx, ty) {
    const dx = tx - this.tx;
    const dy = ty - this.ty;
    const facing = facingFromWorldVector(dx, dy);
    if (facing) this.dir = facing;
  }

  // Signs and boards are part of the map picture (or a placed object) -
  // the NPC entry only makes them talkable.
  render(renderer) {
    if (this.kind !== 'person') return;
    const pos = worldToScreen(this.tx, this.ty);
    renderer.queue(depthOf(this.tx, this.ty), (g) => {
      drawShadow(g, pos.x, pos.y, 4);
      drawSheetFrame(g, this.sheet, this.dir, this.frame, pos.x, pos.y);
    });
    renderer.overlayText(this.name, pos.x, pos.y - CHARACTER_HEIGHT - 6, { color: '#ffd98a', size: 11 });
  }
}
