// Level, EXP and the final stat numbers.
// Final stat = class base + (growth x levels gained) + equipment bonus.

import { getClass } from './class-system.js';

export const MAX_LEVEL = 60;
export const ADVANCE_LEVEL = 20;

// Tuned so Lv.20 (the class advancement point) takes roughly an hour of play.
export function expToNext(level) {
  return Math.round(50 * level ** 1.15);
}

// class base + growth per level + the one-off bonus from advancing
export function baseStats(character) {
  const classDef = getClass(character.classId);
  const advanced = character.advancedClassId ? getClass(character.advancedClassId) : null;
  const growth = (advanced && advanced.growth) || classDef.growth || { hp: 0, mp: 0, atk: 0, def: 0, spd: 0 };
  const bonus = (advanced && advanced.statBonus) || {};
  const levels = Math.max(0, character.level - 1);

  const stat = (key) =>
    classDef.stats[key] + Math.round(growth[key] * levels) + (bonus[key] || 0);

  return { hp: stat('hp'), mp: stat('mp'), atk: stat('atk'), def: stat('def'), spd: stat('spd') };
}

// equipment is flat, passives are percentages applied on top
export function totalStats(character, bonus, passives = {}) {
  const base = baseStats(character);
  const pct = (value, key) => Math.round(value * (1 + (passives[key] || 0)));

  return {
    hp: pct(base.hp + (bonus.hp || 0), 'hpPct'),
    mp: pct(base.mp + (bonus.mp || 0), 'mpPct'),
    atk: pct(base.atk + (bonus.atk || 0), 'atkPct'),
    def: pct(base.def + (bonus.def || 0), 'defPct'),
    spd: base.spd + (bonus.spd || 0) + (passives.spdFlat || 0)
  };
}

// Returns the list of levels gained, so the caller can show a level-up message.
export function addExp(character, amount) {
  const gained = [];
  character.exp += amount;

  while (character.level < MAX_LEVEL && character.exp >= expToNext(character.level)) {
    character.exp -= expToNext(character.level);
    character.level += 1;
    gained.push(character.level);
  }

  if (character.level >= MAX_LEVEL) character.exp = 0;
  return gained;
}
