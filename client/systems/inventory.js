// Slot-based bag. A slot is either null or { id, count }.

import { getItem } from '../data/items.js';

export const INVENTORY_SIZE = 24;

export function createInventory() {
  return new Array(INVENTORY_SIZE).fill(null);
}

export function countItem(inventory, itemId) {
  let total = 0;
  for (const slot of inventory) {
    if (slot && slot.id === itemId) total += slot.count;
  }
  return total;
}

export function freeSlots(inventory) {
  return inventory.filter((slot) => slot === null).length;
}

// Returns how many could NOT be added (0 means everything fit).
export function addItem(inventory, itemId, count = 1) {
  const def = getItem(itemId);
  if (!def) return count;
  const maxStack = def.stack || 1;
  let left = count;

  // top up existing stacks first
  for (const slot of inventory) {
    if (left <= 0) break;
    if (slot && slot.id === itemId && slot.count < maxStack) {
      const space = maxStack - slot.count;
      const moved = Math.min(space, left);
      slot.count += moved;
      left -= moved;
    }
  }

  // then fill empty slots
  for (let i = 0; i < inventory.length && left > 0; i++) {
    if (inventory[i] !== null) continue;
    const moved = Math.min(maxStack, left);
    inventory[i] = { id: itemId, count: moved };
    left -= moved;
  }

  return left;
}

export function removeItem(inventory, itemId, count = 1) {
  if (countItem(inventory, itemId) < count) return false;
  let left = count;

  for (let i = 0; i < inventory.length && left > 0; i++) {
    const slot = inventory[i];
    if (!slot || slot.id !== itemId) continue;
    const taken = Math.min(slot.count, left);
    slot.count -= taken;
    left -= taken;
    if (slot.count <= 0) inventory[i] = null;
  }
  return true;
}

export function removeAtSlot(inventory, index, count = 1) {
  const slot = inventory[index];
  if (!slot) return null;
  const taken = Math.min(slot.count, count);
  slot.count -= taken;
  const itemId = slot.id;
  if (slot.count <= 0) inventory[index] = null;
  return { id: itemId, count: taken };
}
