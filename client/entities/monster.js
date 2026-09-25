// Monster with a small state machine: idle -> chase -> attack -> return.

import { worldToScreen, facingFromWorldVector, depthOf } from '../core/projection.js';
import { buildMonsterSheet, drawSheetFrame, drawShadow, MONSTER_HEIGHT } from '../rendering/sprites.js';
import { getMonsterDef } from '../data/monsters.js';
import { Statuses, distanceTiles, speedMultiplier, canAct } from '../systems/combat.js';

const sheetCache = new Map();

function sheetFor(def) {
  if (!sheetCache.has(def.body)) sheetCache.set(def.body, buildMonsterSheet(def));
  return sheetCache.get(def.body);
}

export class Monster {
  constructor(spawn) {
    this.defId = spawn.type;
    this.def = getMonsterDef(spawn.type);
    this.spawnTx = spawn.tx;
    this.spawnTy = spawn.ty;

    this.tx = spawn.tx;
    this.ty = spawn.ty;
    this.name = this.def.name;
    this.level = this.def.level;
    this.maxHp = this.def.hp;
    this.hp = this.def.hp;
    this.atk = this.def.atk;
    this.def_ = this.def.def;
    this.radius = this.def.radius;

    this.state = 'idle';
    this.target = null;
    this.aggroTimer = 0;
    this.attackTimer = 0;
    this.hurtTimer = 0;
    this.deathTimer = 0;
    this.respawnTimer = 0;
    this.alive = true;
    this.dir = 's';
    this.frame = 0;
    this.animTime = 0;
    this.statuses = new Statuses();
    this.sheet = sheetFor(this.def);
    this.wanderTimer = Math.random() * 3;
    this.wanderTarget = null;
  }

  // `def` is a reserved-ish name on the instance, so combat reads this.
  get defense() {
    return this.def_;
  }

  forceAggro(target, duration) {
    this.target = target;
    this.aggroTimer = duration;
    this.state = 'chase';
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.hurtTimer = 0.16;
    if (this.hp <= 0) {
      this.alive = false;
      this.deathTimer = 0.6;
      this.respawnTimer = this.def.respawn;
      this.statuses.clear();
      return true;
    }
    return false;
  }

  update(dt, map, player) {
    this.statuses.update(dt);
    if (this.hurtTimer > 0) this.hurtTimer -= dt;

    if (!this.alive) {
      if (this.deathTimer > 0) this.deathTimer -= dt;
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) this.respawn();
      return;
    }

    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.aggroTimer > 0) this.aggroTimer -= dt;

    if (!canAct(this)) {
      this.animTime = 0;
      return;
    }

    const playerAlive = player && player.alive !== false;
    const distToPlayer = playerAlive ? distanceTiles(this, player) : Infinity;
    const distFromHome = Math.hypot(this.tx - this.spawnTx, this.ty - this.spawnTy);

    if (this.state === 'idle' && playerAlive && distToPlayer <= this.def.aggroRange) {
      this.target = player;
      this.state = 'chase';
    }

    if (this.state === 'chase') {
      const keepAggro = this.aggroTimer > 0;
      if (!playerAlive || (!keepAggro && (distToPlayer > this.def.aggroRange * 1.6 || distFromHome > this.def.leashRange))) {
        this.state = 'return';
        this.target = null;
      } else if (distToPlayer <= this.def.attackRange) {
        this.state = 'attack';
      } else {
        this.moveToward(dt, map, player.tx, player.ty);
      }
    } else if (this.state === 'attack') {
      if (!playerAlive || distToPlayer > this.def.attackRange * 1.25) {
        this.state = 'chase';
      } else {
        this.faceTowards(player.tx, player.ty);
        this.animTime += dt;
        this.frame = Math.floor(this.animTime * 4) % 4;
        if (this.attackTimer <= 0) {
          this.attackTimer = this.def.attackCooldown;
          this.pendingAttack = true;
        }
      }
    } else if (this.state === 'return') {
      if (distFromHome < 0.2) {
        this.state = 'idle';
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.5);
      } else {
        this.moveToward(dt, map, this.spawnTx, this.spawnTy);
      }
    } else {
      this.idleWander(dt, map);
    }
  }

  idleWander(dt, map) {
    this.wanderTimer -= dt;
    if (!this.wanderTarget) {
      this.animTime = 0;
      this.frame = 0;
      if (this.wanderTimer > 0) return;
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.5 + Math.random() * 1.8;
      const tx = this.spawnTx + Math.cos(angle) * dist;
      const ty = this.spawnTy + Math.sin(angle) * dist;
      if (map.canStand(tx, ty, this.radius)) this.wanderTarget = { tx, ty };
      this.wanderTimer = 2 + Math.random() * 3;
      return;
    }

    const reached = this.moveToward(dt, map, this.wanderTarget.tx, this.wanderTarget.ty, 0.45);
    if (reached) this.wanderTarget = null;
  }

  // Returns true when the destination is reached (or movement is blocked).
  moveToward(dt, map, tx, ty, speedScale = 1) {
    const dx = tx - this.tx;
    const dy = ty - this.ty;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.06) return true;

    const speed = this.def.speed * speedScale * speedMultiplier(this) * dt;
    const stepX = (dx / dist) * speed;
    const stepY = (dy / dist) * speed;

    let moved = false;
    if (map.canStand(this.tx + stepX, this.ty, this.radius)) {
      this.tx += stepX;
      moved = true;
    }
    if (map.canStand(this.tx, this.ty + stepY, this.radius)) {
      this.ty += stepY;
      moved = true;
    }

    this.faceTowards(tx, ty);
    this.animTime += dt;
    this.frame = Math.floor(this.animTime * 6) % 4;
    return !moved;
  }

  faceTowards(tx, ty) {
    const dx = tx - this.tx;
    const dy = ty - this.ty;
    const facing = facingFromWorldVector(dx, dy);
    if (facing) this.dir = facing;
  }

  respawn() {
    this.tx = this.spawnTx;
    this.ty = this.spawnTy;
    this.hp = this.maxHp;
    this.alive = true;
    this.state = 'idle';
    this.target = null;
    this.wanderTarget = null;
    this.statuses.clear();
  }

  // targeted = the player's current target (yellow frame), hovered = under the mouse (white frame)
  render(renderer, { targeted = false, hovered = false } = {}) {
    if (!this.alive && this.deathTimer <= 0) return;

    const pos = worldToScreen(this.tx, this.ty);
    const dying = !this.alive;
    const hpPct = this.hp / this.maxHp;
    const height = MONSTER_HEIGHT[this.def.body] || 16;

    renderer.queue(depthOf(this.tx, this.ty), (g) => {
      g.save();
      if (dying) g.globalAlpha = Math.max(0, this.deathTimer / 0.6);
      drawShadow(g, pos.x, pos.y, 5);

      drawSheetFrame(g, this.sheet, this.dir, this.frame, pos.x, pos.y);

      // Hit flash: redrawing the same frame additively brightens the silhouette.
      if (this.hurtTimer > 0) {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 0.85 * (this.hurtTimer / 0.16);
        drawSheetFrame(g, this.sheet, this.dir, this.frame, pos.x, pos.y);
      }
      g.restore();

      if (dying) return;

      // health bar
      const barW = 16;
      const x = Math.round(pos.x - barW / 2);
      const y = Math.round(pos.y - height - 5);
      g.fillStyle = 'rgba(0,0,0,0.65)';
      g.fillRect(x - 1, y - 1, barW + 2, 4);
      g.fillStyle = targeted ? '#ffd24a' : '#d05050';
      g.fillRect(x, y, Math.max(0, Math.round(barW * hpPct)), 2);

      if (targeted || hovered) {
        g.strokeStyle = targeted ? '#ffd24a' : 'rgba(255, 255, 255, 0.85)';
        g.lineWidth = 1;
        g.strokeRect(Math.round(pos.x - 9) + 0.5, Math.round(pos.y - height - 2) + 0.5, 18, height + 3);
      }
    });

    if (!dying) {
      renderer.overlayText(`${this.name} Lv.${this.level}`, pos.x, pos.y - height - 11, {
        color: targeted ? '#ffd24a' : '#e0a0a0',
        size: 10
      });
    }
  }
}
