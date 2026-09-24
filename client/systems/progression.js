// Skill points, skill-tree purchases, passive totals and class advancement.

import { treeNodesFor, getTreeNode } from '../data/skill-tree.js';
import { getClass, getAdvancements } from './class-system.js';
import { isCompleted } from './quest.js';

export const POINTS_PER_LEVEL = 1;
export const ADVANCE_LEVEL = 20;
export const ADVANCE_BONUS_POINTS = 3;
export const RESPEC_COST = 250;

const EMPTY_PASSIVES = {
  hpPct: 0, mpPct: 0, atkPct: 0, defPct: 0, spdFlat: 0,
  critBonus: 0, damageReductionPct: 0, lifestealPct: 0,
  cooldownReductionPct: 0, expBonusPct: 0
};

export function nodeRank(character, nodeId) {
  return (character.skillRanks && character.skillRanks[nodeId]) || 0;
}

export function earnedPoints(character) {
  const fromLevels = Math.max(0, character.level - 1) * POINTS_PER_LEVEL;
  return fromLevels + (character.advancedClassId ? ADVANCE_BONUS_POINTS : 0);
}

export function spentPoints(character) {
  let spent = 0;
  for (const [nodeId, rank] of Object.entries(character.skillRanks || {})) {
    const node = getTreeNode(nodeId);
    if (node) spent += node.cost * rank;
  }
  return spent;
}

export function availablePoints(character) {
  return earnedPoints(character) - spentPoints(character);
}

export function isBranchOpen(character, node) {
  return node.branch !== 'advanced' || !!character.advancedClassId;
}

export function canBuyNode(character, nodeId) {
  const node = getTreeNode(nodeId);
  if (!node) return { ok: false, reason: 'ไม่พบโหนดนี้' };
  if (node.classId !== character.classId) return { ok: false, reason: 'โหนดนี้ไม่ใช่ของคลาสเจ้า' };
  if (!isBranchOpen(character, node)) return { ok: false, reason: 'ต้องเปลี่ยนคลาสก่อน' };

  const rank = nodeRank(character, nodeId);
  if (rank >= node.maxRank) return { ok: false, reason: 'อัปเกรดเต็มแล้ว' };
  if (availablePoints(character) < node.cost) return { ok: false, reason: 'Skill Point ไม่พอ' };

  const requires = node.requires || {};
  if (requires.level && character.level < requires.level) return { ok: false, reason: `ต้องถึง Lv.${requires.level}` };
  if (requires.points && spentPoints(character) < requires.points) {
    return { ok: false, reason: `ต้องลงแต้มในสายนี้ ${requires.points} แต้มก่อน` };
  }
  if (requires.node && nodeRank(character, requires.node) === 0) {
    const parent = getTreeNode(requires.node);
    return { ok: false, reason: `ต้องปลด ${parent ? parent.name : requires.node} ก่อน` };
  }
  return { ok: true, node };
}

export function buyNode(character, nodeId) {
  const check = canBuyNode(character, nodeId);
  if (!check.ok) return check;
  if (!character.skillRanks) character.skillRanks = {};
  character.skillRanks[nodeId] = nodeRank(character, nodeId) + 1;
  return { ok: true, node: check.node, rank: character.skillRanks[nodeId] };
}

export function respec(character) {
  character.skillRanks = {};
  return { ok: true };
}

// ---------------------------------------------------------------- derived

export function aggregatePassives(character) {
  const totals = { ...EMPTY_PASSIVES };
  for (const [nodeId, rank] of Object.entries(character.skillRanks || {})) {
    const node = getTreeNode(nodeId);
    if (!node || node.effect.kind !== 'passive') continue;
    for (const [key, value] of Object.entries(node.effect.passive)) {
      totals[key] = (totals[key] || 0) + value * rank;
    }
  }
  return totals;
}

// { skillId: { power, cooldown, duration, value } }
export function skillModifiers(character) {
  const mods = {};
  const bump = (skillId, key, amount) => {
    if (!mods[skillId]) mods[skillId] = { power: 0, cooldown: 0, duration: 0, value: 0 };
    mods[skillId][key] += amount;
  };

  const advanced = character.advancedClassId ? getClass(character.advancedClassId) : null;

  for (const [nodeId, rank] of Object.entries(character.skillRanks || {})) {
    const node = getTreeNode(nodeId);
    if (!node) continue;

    if (node.effect.kind === 'skillRank') {
      for (const key of ['power', 'cooldown', 'duration', 'value']) {
        if (node.effect[key]) bump(node.effect.skillId, key, node.effect[key] * rank);
      }
    } else if (node.effect.kind === 'advancedSkillRank' && advanced) {
      for (const skillId of advanced.skills || []) {
        for (const key of ['power', 'cooldown', 'duration', 'value']) {
          if (node.effect[key]) bump(skillId, key, node.effect[key] * rank);
        }
      }
    }
  }
  return mods;
}

export function treeFor(character) {
  return treeNodesFor(character.classId).map((node) => ({
    ...node,
    rank: nodeRank(character, node.id),
    open: isBranchOpen(character, node),
    status: canBuyNode(character, node.id)
  }));
}

// ---------------------------------------------------------------- advancement

export function trialQuestId(character) {
  const base = getClass(character.classId);
  return base ? base.trial : null;
}

export function advancementState(character) {
  if (character.advancedClassId) {
    return { state: 'done', advanced: getClass(character.advancedClassId) };
  }
  if (character.level < ADVANCE_LEVEL) {
    return { state: 'locked', reason: `ต้องถึง Lv.${ADVANCE_LEVEL} ก่อน (ตอนนี้ Lv.${character.level})` };
  }
  const trial = trialQuestId(character);
  if (trial && !isCompleted(character, trial)) {
    return { state: 'trial', reason: 'ต้องผ่านเควสทดสอบประจำคลาสจาก Master Veyra ก่อน', trial };
  }
  return { state: 'ready', options: getAdvancements(character.classId) };
}

export function advanceTo(character, advancedId) {
  const state = advancementState(character);
  if (state.state !== 'ready') return { ok: false, reason: state.reason || 'ยังเปลี่ยนคลาสไม่ได้' };

  const target = state.options.find((option) => option.id === advancedId);
  if (!target) return { ok: false, reason: 'สายอาชีพนี้ไม่ใช่ของคลาสเจ้า' };

  character.advancedClassId = advancedId;
  if (!character.unlockedClasses.includes(advancedId)) character.unlockedClasses.push(advancedId);
  return { ok: true, advanced: target };
}

export function allowedWeapons(character) {
  const base = getClass(character.classId);
  const advanced = character.advancedClassId ? getClass(character.advancedClassId) : null;
  const weapons = new Set(['basic', ...(base?.allowedWeapons || [])]);
  for (const weapon of advanced?.allowedWeapons || []) weapons.add(weapon);
  return [...weapons];
}
