// Quest log. Progress for 'collect' objectives is read live from the bag,
// so picking up an item updates the tracker immediately.

import { QUEST_DEFS, getQuestDef } from '../data/quests.js';
import { countItem, removeItem, addItem } from './inventory.js';
import { addExp } from './stats.js';

export function createQuestLog() {
  return { active: [], completed: [] };
}

function entryKills(entry) {
  if (!entry.kills) entry.kills = {};
  return entry.kills;
}

export function isCompleted(character, id) {
  return character.quests.completed.includes(id);
}

export function activeEntry(character, id) {
  return character.quests.active.find((entry) => entry.id === id) || null;
}

export function isActive(character, id) {
  return !!activeEntry(character, id);
}

export function meetsRequirements(character, def) {
  if (!def.requires) return true;
  if (def.requires.quest && !isCompleted(character, def.requires.quest)) return false;
  if (def.requires.level && character.level < def.requires.level) return false;
  if (def.requires.classId && character.classId !== def.requires.classId) return false;
  return true;
}

export function availableQuests(character, giverId = null) {
  return QUEST_DEFS.filter(
    (def) =>
      !isCompleted(character, def.id) &&
      !isActive(character, def.id) &&
      meetsRequirements(character, def) &&
      (giverId === null || def.giver === giverId)
  );
}

export function acceptQuest(character, id) {
  const def = getQuestDef(id);
  if (!def || isActive(character, id) || isCompleted(character, id)) return false;
  character.quests.active.push({ id, talked: [] });
  return true;
}

export function objectiveProgress(character, def) {
  const entry = activeEntry(character, def.id);
  return def.objectives.map((objective) => {
    let current = 0;
    if (objective.type === 'collect') {
      current = countItem(character.inventory, objective.target);
    } else if (objective.type === 'talk') {
      current = entry && entry.talked.includes(objective.target) ? 1 : 0;
    } else if (objective.type === 'kill') {
      current = entry ? entryKills(entry)[objective.target] || 0 : 0;
    }
    return { ...objective, current: Math.min(current, objective.count), done: current >= objective.count };
  });
}

export function isQuestComplete(character, def) {
  return objectiveProgress(character, def).every((objective) => objective.done);
}

// Call this whenever the player talks to an NPC.
export function noteTalk(character, npcId) {
  let changed = false;
  for (const entry of character.quests.active) {
    const def = getQuestDef(entry.id);
    if (!def) continue;
    const needed = def.objectives.some((o) => o.type === 'talk' && o.target === npcId);
    if (needed && !entry.talked.includes(npcId)) {
      entry.talked.push(npcId);
      changed = true;
    }
  }
  return changed;
}

// Call this whenever the player kills a monster.
export function noteKill(character, monsterType) {
  let changed = false;
  for (const entry of character.quests.active) {
    const def = getQuestDef(entry.id);
    if (!def) continue;
    for (const objective of def.objectives) {
      if (objective.type !== 'kill' || objective.target !== monsterType) continue;
      const kills = entryKills(entry);
      if ((kills[monsterType] || 0) >= objective.count) continue;
      kills[monsterType] = (kills[monsterType] || 0) + 1;
      changed = true;
    }
  }
  return changed;
}

export function questsReadyToTurnIn(character, npcId) {
  return character.quests.active
    .map((entry) => getQuestDef(entry.id))
    .filter((def) => def && (def.turnIn || def.giver) === npcId && isQuestComplete(character, def));
}

export function rewardItemsFor(character, def) {
  const items = [...(def.rewards.items || [])];
  const classItem = def.rewards.itemByClass ? def.rewards.itemByClass[character.classId] : null;
  if (classItem) items.push({ id: classItem, count: 1 });
  return items;
}

export function completeQuest(character, id) {
  const def = getQuestDef(id);
  if (!def || !isActive(character, id) || !isQuestComplete(character, def)) return null;

  const rewardItems = rewardItemsFor(character, def);

  // Simulate the bag changes first so a full inventory can never eat a reward.
  const simulated = JSON.parse(JSON.stringify(character.inventory));
  for (const objective of def.objectives) {
    if (objective.type === 'collect') removeItem(simulated, objective.target, objective.count);
  }
  let overflow = 0;
  for (const item of rewardItems) overflow += addItem(simulated, item.id, item.count);
  if (overflow > 0) return { error: 'กระเป๋าไม่พอรับของรางวัล — ลองจัดกระเป๋าก่อน' };

  character.inventory.length = 0;
  character.inventory.push(...simulated);
  character.quests.active = character.quests.active.filter((entry) => entry.id !== id);
  character.quests.completed.push(id);
  character.gold += def.rewards.gold || 0;
  const levels = addExp(character, def.rewards.exp || 0);

  return { def, levels, items: rewardItems, exp: def.rewards.exp || 0, gold: def.rewards.gold || 0 };
}

export function trackedQuest(character) {
  const entry = character.quests.active[0];
  if (!entry) return null;
  const def = getQuestDef(entry.id);
  if (!def) return null;
  return { def, objectives: objectiveProgress(character, def) };
}
