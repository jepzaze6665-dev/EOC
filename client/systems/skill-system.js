// Executes skills against a `world` interface supplied by the scene, so the
// rules stay independent from rendering.
//
// world = { character, player, map, monsters, aimPoint (mouse, in tiles),
//           damageMonster(monster, amount, crit), applyStatus(monster, status),
//           floatingText(tx, ty, text, color), effect(name, tx, ty, options) }
//
// Aiming: player.facingVec is the direction toward the mouse, so cones, dashes and
// projectiles go where the player points.

import { getSkill, SKILL_DEFS } from '../data/skills.js';
import { getClass } from './class-system.js';
import { computeDamage, critChanceFor, canAct, inCircle, inCone, distanceTiles } from './combat.js';

export function getClassSkills(classId, advancedClassId = null) {
  const classDef = getClass(classId);
  if (!classDef) return [];
  const ids = [...(classDef.skills || [])];

  const advanced = advancedClassId ? getClass(advancedClassId) : null;
  if (advanced) ids.push(...(advanced.skills || []));

  return ids.map((id) => ({ id, ...SKILL_DEFS[id] })).filter((skill) => skill.name);
}

// The class's ultimate (R). Advanced classes keep the ultimate of their base class.
export function getUltimate(classId) {
  const classDef = getClass(classId);
  const id = classDef && classDef.ultimate;
  return id && SKILL_DEFS[id] ? { id, ...SKILL_DEFS[id] } : null;
}

// Applies skill-tree ranks and passive cooldown reduction to a skill definition.
export function resolveSkill(character, skillId) {
  const base = getSkill(skillId);
  if (!base) return null;

  const mods = (character.skillMods && character.skillMods[skillId]) || {};
  const cdr = (character.passives && character.passives.cooldownReductionPct) || 0;

  const resolved = {
    ...base,
    power: (base.power || 0) + (mods.power || 0),
    cooldown: Math.max(0.5, base.cooldown * (1 - cdr) + (mods.cooldown || 0))
  };

  if (base.status && mods.duration) {
    resolved.status = { ...base.status, duration: base.status.duration + mods.duration };
  }
  if (base.selfStatus && (mods.duration || mods.value)) {
    resolved.selfStatus = {
      ...base.selfStatus,
      duration: base.selfStatus.duration + (mods.duration || 0),
      value: base.selfStatus.value + (mods.value || 0)
    };
  }
  return resolved;
}

export function cooldownLeft(player, skillId) {
  return player.cooldowns[skillId] || 0;
}

function nearestMonster(world, range, requireFront = true) {
  const { player } = world;
  if (world.target && world.target.alive && distanceTiles(player, world.target) <= range) return world.target;

  let best = null;
  let bestDist = range;
  for (const monster of world.monsters) {
    if (!monster.alive) continue;
    const dist = distanceTiles(player, monster);
    if (dist > bestDist) continue;
    if (requireFront && !inCone(player, player.facingVec, monster, range, 200)) continue;
    best = monster;
    bestDist = dist;
  }
  return best;
}

function hit(world, monster, power, skill) {
  const stats = world.character.stats;
  const critBonus = (world.character.passives && world.character.passives.critBonus) || 0;
  const { amount, crit } = computeDamage({
    atk: stats.atk,
    power,
    targetDef: monster.defense,
    critChance: critChanceFor(stats) + critBonus
  });
  world.damageMonster(monster, amount, crit);
  if (skill && skill.status) world.applyStatus(monster, skill.status);
  return amount;
}

export function canUseSkill(world, skillId) {
  const def = resolveSkill(world.character, skillId);
  if (!def) return { ok: false, reason: 'ไม่มีสกิลนี้' };
  if (cooldownLeft(world.player, skillId) > 0) return { ok: false, reason: 'สกิลยังคูลดาวน์' };
  if (world.character.mp < def.mp) return { ok: false, reason: `${world.character.resource} ไม่พอ` };
  if (!canAct(world.player)) return { ok: false, reason: 'ขยับไม่ได้ตอนนี้' };
  return { ok: true, def };
}

export function useSkill(world, skillId) {
  const check = canUseSkill(world, skillId);
  if (!check.ok) return check;

  const def = check.def;
  const { player, character } = world;
  let executed = false;

  if (def.effect === 'melee') {
    const target = nearestMonster(world, def.range);
    if (!target) return { ok: false, reason: 'ไม่มีเป้าหมายในระยะ' };
    hit(world, target, def.power, def);
    world.effect('slash', target.tx, target.ty, { color: def.color });
    executed = true;
  } else if (def.effect === 'cone') {
    const targets = world.monsters.filter(
      (monster) => monster.alive && inCone(player, player.facingVec, monster, def.range, def.arc)
    );
    const hits = def.hits || 1;
    for (let swing = 0; swing < hits; swing++) {
      for (const target of targets) {
        if (target.alive) hit(world, target, def.power, def);
      }
    }
    world.effect('cone', player.tx, player.ty, { color: def.color, facing: player.facingVec, range: def.range });
    executed = true;
  } else if (def.effect === 'heal') {
    const character = world.character;
    const healed = Math.min(Math.round(character.maxHp * def.healPct), character.maxHp - character.hp);
    character.hp += healed;
    if (def.selfStatus) player.statuses.add(def.selfStatus.type, def.selfStatus.duration, def.selfStatus.value);
    world.floatingText(player.tx, player.ty, `+${healed}`, '#7fe0a0');
    world.effect('buff', player.tx, player.ty, { color: def.color });
    executed = true;
  } else if (def.effect === 'aoe_target') {
    const target = nearestMonster(world, def.range, false);
    if (!target) return { ok: false, reason: 'ไม่มีเป้าหมายในระยะ' };
    const targets = world.monsters.filter((monster) => monster.alive && inCircle(target, monster, def.radius));
    for (const hitTarget of targets) hit(world, hitTarget, def.power, def);
    world.effect('aoe', target.tx, target.ty, { color: def.color, radius: def.radius });
    executed = true;
  } else if (def.effect === 'dash') {
    const steps = 12;
    const stepX = (player.facingVec.x * def.distance) / steps;
    const stepY = (player.facingVec.y * def.distance) / steps;
    world.effect('dash', player.tx, player.ty, { color: def.color });
    for (let i = 0; i < steps; i++) {
      if (!world.movePlayerByScreenVector(stepX, stepY)) break;
    }
    const target = nearestMonster(world, 1.6, false);
    if (target) hit(world, target, def.power, def);
    executed = true;
  } else if (def.effect === 'buff') {
    player.statuses.add(def.selfStatus.type, def.selfStatus.duration, def.selfStatus.value);
    world.effect('buff', player.tx, player.ty, { color: def.color });
    executed = true;
  } else if (def.effect === 'nova') {
    const targets = world.monsters.filter((monster) => monster.alive && inCircle(player, monster, def.radius));
    for (const target of targets) {
      hit(world, target, def.power, def);
      if (def.taunt && target.alive) target.forceAggro(player, 5);
    }
    world.effect('aoe', player.tx, player.ty, { color: def.color, radius: def.radius });
    world.effect('taunt', player.tx, player.ty, { color: def.color, radius: def.radius });
    executed = true;
  } else if (def.effect === 'aoe_point') {
    // centred on the mouse, but never further than the skill's range
    let point = world.aimPoint;
    if (!point) {
      const target = nearestMonster(world, def.range, false);
      point = target ? { tx: target.tx, ty: target.ty } : { tx: player.tx, ty: player.ty };
    }
    const dx = point.tx - player.tx;
    const dy = point.ty - player.ty;
    const dist = Math.hypot(dx, dy);
    if (dist > def.range) point = { tx: player.tx + (dx / dist) * def.range, ty: player.ty + (dy / dist) * def.range };
    const targets = world.monsters.filter((monster) => monster.alive && inCircle(point, monster, def.radius));
    for (const target of targets) hit(world, target, def.power, def);
    world.effect('aoe', point.tx, point.ty, { color: def.color, radius: def.radius });
    executed = true;
  } else if (def.effect === 'taunt') {
    const targets = world.monsters.filter((monster) => monster.alive && inCircle(player, monster, def.radius));
    for (const target of targets) {
      target.forceAggro(player, 5);
      if (def.status) world.applyStatus(target, def.status);
    }
    world.effect('taunt', player.tx, player.ty, { color: def.color, radius: def.radius });
    executed = true;
  }

  if (!executed) return { ok: false, reason: 'ใช้สกิลไม่สำเร็จ' };

  // buff and heal apply their self-status above; every other effect applies it here
  if (def.selfStatus && def.effect !== 'buff' && def.effect !== 'heal') {
    player.statuses.add(def.selfStatus.type, def.selfStatus.duration, def.selfStatus.value);
  }
  character.mp -= def.mp;
  player.cooldowns[skillId] = def.cooldown;
  return { ok: true, def };
}

// Basic attack is described on the class, not in SKILL_DEFS.
export function useBasicAttack(world) {
  const { player, character } = world;
  if (player.attackCooldown > 0) return { ok: false };
  if (!canAct(player)) return { ok: false, reason: 'ขยับไม่ได้ตอนนี้' };

  const classDef = getClass(character.classId);
  const attack = classDef.basicAttack;
  player.attackCooldown = attack.cooldown;
  player.swingTimer = 0.18;

  if (attack.effect === 'projectile') {
    world.spawnProjectile({
      tx: player.tx,
      ty: player.ty,
      facing: { ...player.facingVec },
      speed: attack.speed,
      range: attack.range,
      power: attack.power,
      color: classDef.vfx ? classDef.vfx.primary : classDef.color
    });
    return { ok: true };
  }

  const targets = world.monsters.filter(
    (monster) => monster.alive && inCone(player, player.facingVec, monster, attack.range, attack.arc || 120)
  );
  if (targets.length === 0) return { ok: true, missed: true };
  for (const target of targets) hit(world, target, attack.power, null);
  world.effect('slash', targets[0].tx, targets[0].ty, { color: classDef.vfx ? classDef.vfx.primary : '#ffffff' });
  return { ok: true };
}
