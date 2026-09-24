// Item definitions.
//   type: 'material' | 'consumable' | 'equipment' | 'quest'
//   stack: how many fit in one inventory slot
//   slot:  equipment only - which equipment slot it goes into
//   stats: equipment only - flat bonuses added to the character
//   icon:  { shape, color } - shape is drawn by rendering/sprites.js

export const RARITY = {
  common: { label: 'Common', color: '#b8b8c8' },
  uncommon: { label: 'Uncommon', color: '#6fd08a' },
  rare: { label: 'Rare', color: '#5b9fe0' },
  epic: { label: 'Epic', color: '#b07be0' }
};

export const ITEM_DEFS = {
  // ---------- materials ----------
  'herb-moonleaf': {
    name: 'Moonleaf Herb', type: 'material', rarity: 'common', stack: 20, value: 6,
    icon: { shape: 'leaf', color: '#6fd08a' },
    desc: 'ใบไม้เรืองแสงจาง ๆ ในเวลากลางคืน ใช้ต้มยาได้'
  },
  'ore-ironvein': {
    name: 'Ironvein Ore', type: 'material', rarity: 'common', stack: 20, value: 10,
    icon: { shape: 'ore', color: '#9aa4b4' },
    desc: 'แร่เหล็กคุณภาพดีจากหินรอบหมู่บ้าน'
  },

  // ---------- consumables ----------
  'potion-minor': {
    name: 'Minor Vigor Potion', type: 'consumable', rarity: 'common', stack: 10, value: 25,
    effect: { hp: 45 },
    icon: { shape: 'potion', color: '#e26a6a' },
    desc: 'ฟื้นฟู HP 45 หน่วย'
  },
  'ether-minor': {
    name: 'Minor Ether', type: 'consumable', rarity: 'common', stack: 10, value: 30,
    effect: { mp: 35 },
    icon: { shape: 'potion', color: '#6a9de6' },
    desc: 'ฟื้นฟู MP 35 หน่วย'
  },

  // ---------- weapons ----------
  'blade-training': {
    name: 'Training Blade', type: 'equipment', slot: 'weapon', weaponType: 'basic', rarity: 'common', stack: 1, value: 40,
    stats: { atk: 4 },
    icon: { shape: 'sword', color: '#c9cdd9' },
    desc: 'ดาบฝึกหัดที่ไม่คมนัก แต่ก็ดีกว่ามือเปล่า'
  },
  'mace-guard': {
    name: 'Guardian Mace', type: 'equipment', slot: 'weapon', weaponType: 'mace', rarity: 'uncommon', stack: 1, value: 120,
    stats: { atk: 6, def: 2 },
    icon: { shape: 'mace', color: '#8a8a98' },
    desc: 'กระบองหนักที่ใช้เป็นอาวุธและเครื่องกันได้ในตัว'
  },
  'edge-duskfang': {
    name: 'Duskfang Edge', type: 'equipment', slot: 'weapon', weaponType: 'blade', rarity: 'uncommon', stack: 1, value: 130,
    stats: { atk: 9, spd: 1 },
    icon: { shape: 'sword', color: '#c0553f' },
    desc: 'ดาบเบาที่ตีเร็วกว่าดาบทั่วไป'
  },
  'staff-apprentice': {
    name: 'Apprentice Staff', type: 'equipment', slot: 'weapon', weaponType: 'staff', rarity: 'uncommon', stack: 1, value: 125,
    stats: { atk: 7, mp: 15 },
    icon: { shape: 'staff', color: '#7b5cff' },
    desc: 'ไม้เท้าสำหรับผู้เริ่มร่ายเวท เพิ่มมานาสูงสุด'
  },

  // ---------- armor ----------
  'tunic-cloth': {
    name: 'Cloth Tunic', type: 'equipment', slot: 'armor', rarity: 'common', stack: 1, value: 35,
    stats: { def: 3 },
    icon: { shape: 'armor', color: '#8a7a5c' },
    desc: 'เสื้อผ้าธรรมดา ดีกว่าไม่ใส่อะไรเลย'
  },
  'vest-leather': {
    name: 'Leather Vest', type: 'equipment', slot: 'armor', rarity: 'uncommon', stack: 1, value: 95,
    stats: { def: 6, hp: 10 },
    icon: { shape: 'armor', color: '#8a5c3a' },
    desc: 'เกราะหนังเบา ๆ ที่นักเดินทางนิยมใช้'
  },

  // ---------- accessories ----------
  'ring-copper': {
    name: 'Copper Band', type: 'equipment', slot: 'accessory', rarity: 'common', stack: 1, value: 50,
    stats: { hp: 18 },
    icon: { shape: 'ring', color: '#c08a4a' },
    desc: 'แหวนทองแดงเรียบง่าย เพิ่มความทนทานเล็กน้อย'
  },
  'charm-focus': {
    name: 'Focus Charm', type: 'equipment', slot: 'accessory', rarity: 'uncommon', stack: 1, value: 85,
    stats: { mp: 20, spd: 1 },
    icon: { shape: 'ring', color: '#6a9de6' },
    desc: 'เครื่องรางที่ช่วยให้จิตใจนิ่งขึ้น'
  },

  // ---------- quest ----------
  'relic-shard': {
    name: 'Strange Shard', type: 'quest', rarity: 'rare', stack: 5, value: 0,
    icon: { shape: 'relic', color: '#b07be0' },
    desc: 'เศษหินที่ยังอุ่นอยู่ ไม่มีใครในหมู่บ้านรู้ว่ามันคืออะไร'
  }
};

export function getItem(id) {
  return ITEM_DEFS[id] || null;
}

export function itemRarityColor(id) {
  const def = ITEM_DEFS[id];
  if (!def) return RARITY.common.color;
  return (RARITY[def.rarity] || RARITY.common).color;
}
