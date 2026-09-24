// Damage maths, status effects and hit-shape helpers.
// Kept free of rendering and scene state so it can be tested on its own.

import { worldVectorToScreen } from '../core/projection.js';

const DEF_CONSTANT = 40;

export function mitigation(def) {
  return def / (def + DEF_CONSTANT);
}

export function computeDamage({ atk, power = 1, targetDef = 0, critChance = 0.05, critMult = 1.8, variance = 0.1 }) {
  const raw = atk * power;
  const afterArmor = raw * (1 - mitigation(targetDef));
  const rolled = afterArmor * (1 + (Math.random() * 2 - 1) * variance);
  const crit = Math.random() < critChance;
  return {
    amount: Math.max(1, Math.round(rolled * (crit ? critMult : 1))),
    crit
  };
}

export function critChanceFor(stats) {
  return Math.min(0.5, 0.05 + (stats.spd || 0) * 0.004);
}

// ---------------------------------------------------------------- statuses

// Effects are keyed by type: re-applying refreshes instead of stacking.
export class Statuses {
  constructor() {
    this.map = new Map();
  }

  add(type, duration, value = 0) {
    const existing = this.map.get(type);
    if (existing && existing.timer > duration && type !== 'shield') {
      existing.value = Math.max(existing.value, value);
      return;
    }
    this.map.set(type, { type, timer: duration, value });
  }

  has(type) {
    return this.map.has(type);
  }

  value(type) {
    const status = this.map.get(type);
    return status ? status.value : 0;
  }

  remaining(type) {
    const status = this.map.get(type);
    return status ? status.timer : 0;
  }

  // Shields soak damage until their pool runs out.
  absorb(amount) {
    const shield = this.map.get('shield');
    if (!shield) return { absorbed: 0, remaining: amount };
    const absorbed = Math.min(shield.value, amount);
    shield.value -= absorbed;
    if (shield.value <= 0) this.map.delete('shield');
    return { absorbed, remaining: amount - absorbed };
  }

  update(dt) {
    for (const [type, status] of this.map) {
      status.timer -= dt;
      if (status.timer <= 0) this.map.delete(type);
    }
  }

  list() {
    return [...this.map.values()];
  }

  clear() {
    this.map.clear();
  }
}

export function canAct(entity) {
  return !entity.statuses.has('stun');
}

export function speedMultiplier(entity) {
  if (entity.statuses.has('stun')) return 0;
  let multiplier = 1;
  if (entity.statuses.has('slow')) multiplier *= 1 - entity.statuses.value('slow');
  if (entity.statuses.has('haste')) multiplier *= 1 + entity.statuses.value('haste');
  return multiplier;
}

// Damage taken after guard, passives, Iron Wall and shields.
export function applyDefensiveEffects(entity, amount, { guarding = false, flatReductionPct = 0 } = {}) {
  if (entity.statuses.has('invulnerable')) return { amount: 0, blocked: true };

  let final = amount;
  if (guarding) final *= 0.35;
  if (flatReductionPct) final *= 1 - flatReductionPct;

  const reduction = entity.statuses.value('damage_reduction');
  if (reduction) final *= 1 - reduction;

  final = Math.max(1, Math.round(final));
  const { absorbed, remaining } = entity.statuses.absorb(final);
  return { amount: remaining, absorbed, blocked: false };
}

// ---------------------------------------------------------------- hit shapes

export function distanceTiles(a, b) {
  return Math.hypot(a.tx - b.tx, a.ty - b.ty);
}

export function inCircle(center, target, radius) {
  return Math.hypot(center.tx - target.tx, center.ty - target.ty) <= radius;
}

// `facing` is a screen-space unit vector; targets are compared in the same space.
export function inCone(origin, facing, target, range, arcDegrees) {
  const dx = target.tx - origin.tx;
  const dy = target.ty - origin.ty;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 0.001) return true;

  // world delta -> screen delta so the cone matches what the player sees
  const { x: sx, y: sy } = worldVectorToScreen(dx, dy);
  const len = Math.hypot(sx, sy) || 1;
  const dot = (sx / len) * facing.x + (sy / len) * facing.y;
  return dot >= Math.cos((arcDegrees / 2) * (Math.PI / 180));
}
