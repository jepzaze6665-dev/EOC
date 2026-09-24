// Three equipment slots. Each holds an item id or null.
// Phase 4 adds class restrictions - for now any class may wear anything.

import { getItem } from '../data/items.js';
import { addItem, removeAtSlot, freeSlots } from './inventory.js';

export const EQUIP_SLOTS = ['weapon', 'armor', 'accessory'];

export const SLOT_LABELS = {
  weapon: 'Weapon',
  armor: 'Armor',
  accessory: 'Accessory'
};

export function createEquipment() {
  return { weapon: null, armor: null, accessory: null };
}

export function equipmentBonus(equipment) {
  const bonus = { hp: 0, mp: 0, atk: 0, def: 0, spd: 0 };
  for (const slot of EQUIP_SLOTS) {
    const def = getItem(equipment[slot]);
    if (!def || !def.stats) continue;
    for (const key of Object.keys(bonus)) {
      bonus[key] += def.stats[key] || 0;
    }
  }
  return bonus;
}

// Weapons are restricted by type; armor and accessories are open to everyone.
export function canEquip(character, itemId) {
  const def = getItem(itemId);
  if (!def || def.type !== 'equipment') return { ok: false, reason: 'ไอเทมนี้สวมใส่ไม่ได้' };
  if (def.slot !== 'weapon') return { ok: true };

  const allowed = character.allowedWeapons || ['basic'];
  const type = def.weaponType || 'basic';
  if (!allowed.includes(type)) {
    return { ok: false, reason: `${character.className} ใช้อาวุธประเภท ${type} ไม่ได้` };
  }
  return { ok: true };
}

// Equip the item sitting in an inventory slot. The previously equipped item
// goes back into the bag.
export function equipFromInventory(character, inventoryIndex) {
  const slotData = character.inventory[inventoryIndex];
  if (!slotData) return { ok: false, reason: 'ช่องนี้ว่างอยู่' };

  const allowed = canEquip(character, slotData.id);
  if (!allowed.ok) return allowed;

  const def = getItem(slotData.id);

  const previous = character.equipment[def.slot];
  removeAtSlot(character.inventory, inventoryIndex, 1);
  character.equipment[def.slot] = slotData.id;

  if (previous) addItem(character.inventory, previous, 1);
  return { ok: true, equipped: slotData.id, replaced: previous };
}

export function unequip(character, slot) {
  const itemId = character.equipment[slot];
  if (!itemId) return { ok: false, reason: 'ไม่มีไอเทมในช่องนี้' };
  if (freeSlots(character.inventory) === 0) return { ok: false, reason: 'กระเป๋าเต็ม' };

  character.equipment[slot] = null;
  addItem(character.inventory, itemId, 1);
  return { ok: true, removed: itemId };
}
