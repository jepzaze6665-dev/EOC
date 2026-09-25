// Character creation, derived stats and local persistence.
// Phase 8 replaces localStorage with an account/database on the server.

import { getClass } from './class-system.js';
import { createInventory, addItem } from './inventory.js';
import { createEquipment, equipmentBonus } from './equipment.js';
import { createQuestLog } from './quest.js';
import { totalStats, expToNext } from './stats.js';
import { getClassSkills, getUltimate } from './skill-system.js';
import { aggregatePassives, skillModifiers, availablePoints, allowedWeapons } from './progression.js';

const STORAGE_KEY = 'eclipse-online.character';

// Class = Preset Character: the look comes from the class, never from a separate choice.
// An advanced class keeps its base class's face and hair, with its own colour and gear.
const FALLBACK_LOOK = { skin: '#e7b18b', hair: '#2f2118', hairStyle: 'short', accent: '#c3cbdd', cloth: '#6b7a8f', kit: 'none' };

export function buildAppearance(classId) {
  const classDef = getClass(classId);
  const base = classDef && classDef.parent ? getClass(classDef.parent) : classDef;
  const preset = base && base.preset;
  if (!preset) return { ...FALLBACK_LOOK };
  if (classDef === base) return { ...preset };
  return { ...preset, cloth: classDef.color, kit: classDef.kit };
}

// Save format changes, applied when an older character is loaded.
const RENAMED_CLASSES = { 'umbral-blade': 'umbral-sword' }; // 2026-09-25 (brief 03)

function migrate(character) {
  if (RENAMED_CLASSES[character.classId]) character.classId = RENAMED_CLASSES[character.classId];
  if (Array.isArray(character.unlockedClasses)) {
    character.unlockedClasses = character.unlockedClasses.map((id) => RENAMED_CLASSES[id] || id);
  }
  delete character.presetId; // appearance presets were replaced by class presets
}

export function createCharacter({ name, classId }) {
  const classDef = getClass(classId);
  if (!classDef) throw new Error(`Unknown class: ${classId}`);

  const character = {
    name: (name || '').trim() || 'Traveler',
    classId,
    level: 1,
    exp: 0,
    gold: 50,
    advancedClassId: null,
    skillRanks: {},
    hp: classDef.stats.hp,
    mp: classDef.stats.mp,
    inventory: createInventory(),
    equipment: createEquipment(),
    quests: createQuestLog(),
    unlockedClasses: [classId],
    discoveries: [],
    createdAt: Date.now()
  };

  addItem(character.inventory, 'potion-minor', 2);
  addItem(character.inventory, 'blade-training', 1);

  return hydrate(character);
}

// Re-derives everything computed from data files, so balance changes apply to
// characters that were saved earlier.
export function hydrate(character) {
  migrate(character);
  // Fields added in Phase 2 - older saves may not have them.
  if (!Array.isArray(character.inventory)) character.inventory = createInventory();
  if (!character.equipment) character.equipment = createEquipment();
  if (!character.quests) character.quests = createQuestLog();
  if (typeof character.gold !== 'number') character.gold = 50;
  if (typeof character.exp !== 'number') character.exp = 0;
  // Phase 4 fields
  if (character.advancedClassId === undefined) character.advancedClassId = null;
  if (!character.skillRanks) character.skillRanks = {};

  const classDef = getClass(character.classId);
  const advancedDef = character.advancedClassId ? getClass(character.advancedClassId) : null;
  const passives = aggregatePassives(character);
  const bonus = equipmentBonus(character.equipment);
  const stats = totalStats(character, bonus, passives);

  character.passives = passives;
  character.skillMods = skillModifiers(character);
  character.skillPoints = availablePoints(character);
  character.allowedWeapons = allowedWeapons(character);
  character.className = advancedDef ? advancedDef.name : classDef ? classDef.name : 'Unknown';
  character.baseClassName = classDef ? classDef.name : 'Unknown';
  character.role = advancedDef ? advancedDef.role : classDef ? classDef.role : '';
  character.resource = classDef ? classDef.resource : 'MP';
  character.skills = getClassSkills(character.classId, character.advancedClassId);
  character.ultimate = getUltimate(character.classId);
  character.appearance = buildAppearance(character.advancedClassId || character.classId);
  character.stats = stats;
  character.bonus = bonus;
  character.maxHp = stats.hp;
  character.maxMp = stats.mp;
  character.expToNext = expToNext(character.level);

  character.hp = Math.min(character.hp ?? stats.hp, stats.hp);
  character.mp = Math.min(character.mp ?? stats.mp, stats.mp);

  return character;
}

// Anything derived is rebuilt by hydrate(), so it never gets written to storage.
const DERIVED_KEYS = [
  'className', 'baseClassName', 'role', 'resource', 'skills', 'ultimate', 'appearance', 'stats', 'bonus',
  'maxHp', 'maxMp', 'expToNext', 'passives', 'skillMods', 'skillPoints', 'allowedWeapons'
];

export function saveCharacter(character) {
  try {
    const persist = {};
    for (const [key, value] of Object.entries(character)) {
      if (!DERIVED_KEYS.includes(key)) persist[key] = value;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
  } catch {
    // Private browsing or blocked storage: the game still runs, it just won't remember.
  }
}

export function loadCharacter() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.classId) return null;
    migrate(data);
    if (!getClass(data.classId)) return null;
    return hydrate(data);
  } catch {
    return null;
  }
}

export function clearCharacter() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
