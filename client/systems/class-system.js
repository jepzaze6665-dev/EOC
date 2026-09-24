// Class registry. The rest of the game asks this module for classes and never
// imports the data file directly, so new classes only need a data entry.

import { CLASS_DEFS, SECRET_CLASS_SLOTS } from '../data/classes.js';

const registry = new Map();
const secretSlots = [];

export function registerClass(def) {
  if (!def || !def.id) throw new Error('Class definition needs an id');
  if (registry.has(def.id)) throw new Error(`Duplicate class id: ${def.id}`);
  registry.set(def.id, { tier: 'starting', hidden: false, advancements: [], ...def });
}

export function initClassSystem() {
  registry.clear();
  secretSlots.length = 0;
  CLASS_DEFS.forEach(registerClass);
  SECRET_CLASS_SLOTS.forEach((slot) => secretSlots.push(slot));
}

export function getClass(id) {
  return registry.get(id) || null;
}

export function getStartingClasses() {
  return [...registry.values()].filter((c) => c.tier === 'starting' && !c.hidden);
}

export function getAdvancements(id) {
  const base = getClass(id);
  if (!base) return [];
  return base.advancements.map((childId) => getClass(childId)).filter(Boolean);
}

// Used by the UI to show locked "???" slots without revealing anything.
export function getSecretSlots() {
  return secretSlots.map((slot) => ({ id: slot.id, hint: slot.hint }));
}

export function getClassTree() {
  return getStartingClasses().map((base) => ({
    ...base,
    children: getAdvancements(base.id)
  }));
}
