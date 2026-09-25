import { screenVectorToWorld, worldToScreen, facingFromScreenVector, depthOf } from '../core/projection.js';
import { buildCharacterSheet, drawSheetFrame, drawShadow, WALK_FRAMES } from '../rendering/sprites.js';
import { Statuses, speedMultiplier, canAct } from '../systems/combat.js';
import { RENDER_LAYERS } from '../rendering/map-renderer.js';

const GUARD_SPEED_SCALE = 0.45;

export class Player {
  constructor(character, spawn) {
    this.character = character;
    this.tx = spawn.tx;
    this.ty = spawn.ty;
    this.radius = 0.26;
    this.speed = 4; // tiles per second, the same in every direction
    this.dir = 's';
    // facingVec = the direction attacks and skills go: toward the mouse (see setAim).
    // It is a unit vector in screen space.
    this.facingVec = { x: 0, y: 1 };
    this.aimVec = null;      // latest direction to the mouse, null when the mouse is off the map
    this.faceAimTimer = 0;   // > 0: the sprite turns to the mouse (just attacked / used a skill)
    this.frame = 0;
    this.animTime = 0;
    this.moving = false;
    this.alive = true;

    this.statuses = new Statuses();
    this.cooldowns = {};
    this.attackCooldown = 0;
    this.swingTimer = 0;
    this.guarding = false;
    this.hurtTimer = 0;
    this.combatTimer = 0; // >0 means "in combat"

    this.sheet = buildCharacterSheet(character.appearance);
  }

  get inCombat() {
    return this.combatTimer > 0;
  }

  markCombat(seconds = 5) {
    this.combatTimer = Math.max(this.combatTimer, seconds);
  }

  tickTimers(dt) {
    this.statuses.update(dt);
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.swingTimer > 0) this.swingTimer -= dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.combatTimer > 0) this.combatTimer -= dt;
    if (this.faceAimTimer > 0) this.faceAimTimer -= dt;
    for (const id of Object.keys(this.cooldowns)) {
      if (this.cooldowns[id] > 0) this.cooldowns[id] -= dt;
    }
  }

  // Mouse aim, in screen space. Attacks and skills always go toward the mouse.
  setAim(vec) {
    this.aimVec = vec;
    if (vec) this.facingVec = { x: vec.x, y: vec.y };
  }

  // After an attack the sprite looks where it struck for a moment, even while walking.
  faceAim(seconds = 0.45) {
    this.faceAimTimer = Math.max(this.faceAimTimer, seconds);
    const facing = facingFromScreenVector(this.facingVec.x, this.facingVec.y);
    if (facing) this.dir = facing;
  }

  // `move` is a normalized screen-space vector from Input.moveVector()
  update(dt, move, map) {
    this.tickTimers(dt);

    const blocked = !canAct(this);
    this.moving = !blocked && (move.x !== 0 || move.y !== 0);

    if (this.faceAimTimer > 0) {
      const facing = facingFromScreenVector(this.facingVec.x, this.facingVec.y);
      if (facing) this.dir = facing;
    }

    if (this.moving) {
      // walking: the sprite faces where it walks (unless it just attacked);
      // without a mouse on the map, attacks go the walking direction too
      if (this.faceAimTimer <= 0) {
        const facing = facingFromScreenVector(move.x, move.y);
        if (facing) this.dir = facing;
      }
      if (!this.aimVec) this.facingVec = { x: move.x, y: move.y };

      const scale = speedMultiplier(this) * (this.guarding ? GUARD_SPEED_SCALE : 1);
      // WASD is a screen direction; the projection turns it into a map direction
      // of the same length, so speed in tiles per second is equal in every direction.
      const delta = screenVectorToWorld(move.x * this.speed * scale * dt, move.y * this.speed * scale * dt);

      // Collision is checked BEFORE the move is applied. Each axis is tested on its
      // own, so walking diagonally into a wall slides along it instead of sticking.
      const next = map.collision.resolveMove(this.tx, this.ty, delta.tx, delta.ty, this.radius);
      this.tx = next.tx;
      this.ty = next.ty;

      this.animTime += dt;
      this.frame = Math.floor(this.animTime * 8) % WALK_FRAMES;
    } else {
      this.animTime = 0;
      this.frame = 0;
    }
  }

  // Used by dash skills; returns false when the step is blocked.
  moveByScreenVector(dx, dy, map) {
    const delta = screenVectorToWorld(dx, dy);
    const nextTx = this.tx + delta.tx;
    const nextTy = this.ty + delta.ty;
    if (!map.canStand(nextTx, nextTy, this.radius)) return false;
    this.tx = nextTx;
    this.ty = nextTy;
    return true;
  }

  get screenPos() {
    return worldToScreen(this.tx, this.ty);
  }

  render(renderer) {
    const pos = this.screenPos;
    renderer.queue(depthOf(this.tx, this.ty), (g) => {
      drawShadow(g, pos.x, pos.y, 4);

      g.save();
      if (this.statuses.has('invulnerable')) g.globalAlpha = 0.55;
      drawSheetFrame(g, this.sheet, this.dir, this.frame, pos.x, pos.y);

      if (this.hurtTimer > 0) {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 0.8 * (this.hurtTimer / 0.16);
        drawSheetFrame(g, this.sheet, this.dir, this.frame, pos.x, pos.y);
      }
      g.restore();

      // swing arc
      if (this.swingTimer > 0) {
        const t = this.swingTimer / 0.18;
        g.save();
        g.globalAlpha = t * 0.85;
        g.strokeStyle = '#ffffff';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(pos.x + this.facingVec.x * 8, pos.y - 8 + this.facingVec.y * 6, 7, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      }

      if (this.guarding) {
        g.save();
        g.globalAlpha = 0.8;
        g.strokeStyle = '#9fd8ff';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(pos.x, pos.y - 9, 10, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      }

      if (this.statuses.has('shield')) {
        g.save();
        g.globalAlpha = 0.65;
        g.strokeStyle = '#c6b8ff';
        g.lineWidth = 1;
        g.beginPath();
        g.arc(pos.x, pos.y - 10, 12, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      }

      if (this.statuses.has('damage_reduction')) {
        g.save();
        g.globalAlpha = 0.5;
        g.fillStyle = '#7cc4ff';
        g.fillRect(Math.round(pos.x - 10), Math.round(pos.y - 22), 20, 1);
        g.restore();
      }
    }, RENDER_LAYERS.PLAYER);
  }
}
