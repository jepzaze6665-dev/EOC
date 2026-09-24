// Skill trees. One point per level is spent on these nodes.
//
//   tier      which column the node sits in (1 -> 2 -> 3)
//   maxRank   how many times it can be bought
//   requires  { level, node, points } - node means "that node must have at least 1 rank"
//   effect
//     { kind: 'skillRank', skillId, power, cooldown, duration }  per-rank skill upgrade
//     { kind: 'passive', passive: { ... } }                      per-rank passive bonus
//     { kind: 'skill', skillId }                                 unlocks a new active skill
//
// Passive keys: hpPct mpPct atkPct defPct spdFlat critBonus
//               damageReductionPct lifestealPct cooldownReductionPct expBonusPct

export const TREE_NODES = [
  // ================= Aegis Guardian =================
  {
    id: 'g-bash-rank', classId: 'aegis-guardian', branch: 'base', tier: 1, maxRank: 3, cost: 1,
    name: 'Heavier Shield', desc: 'Shield Bash แรงขึ้น +25% ต่อแรงก์',
    effect: { kind: 'skillRank', skillId: 'shield-bash', power: 0.25 }
  },
  {
    id: 'g-wall-rank', classId: 'aegis-guardian', branch: 'base', tier: 1, maxRank: 2, cost: 1,
    name: 'Deeper Roots', desc: 'Iron Wall อยู่นานขึ้น +1.5 วินาทีต่อแรงก์',
    effect: { kind: 'skillRank', skillId: 'iron-wall', duration: 1.5 }
  },
  {
    id: 'g-vitality', classId: 'aegis-guardian', branch: 'base', tier: 1, maxRank: 3, cost: 1,
    name: 'Vitality', desc: 'HP สูงสุด +6% ต่อแรงก์',
    effect: { kind: 'passive', passive: { hpPct: 0.06 } }
  },
  {
    id: 'g-stoneskin', classId: 'aegis-guardian', branch: 'base', tier: 2, maxRank: 3, cost: 1,
    name: 'Stoneskin', desc: 'DEF +8% ต่อแรงก์', requires: { node: 'g-vitality', level: 6 },
    effect: { kind: 'passive', passive: { defPct: 0.08 } }
  },
  {
    id: 'g-bash-cd', classId: 'aegis-guardian', branch: 'base', tier: 2, maxRank: 2, cost: 1,
    name: 'Quick Guard', desc: 'Shield Bash คูลดาวน์ลดลง 0.6 วินาทีต่อแรงก์', requires: { node: 'g-bash-rank', level: 8 },
    effect: { kind: 'skillRank', skillId: 'shield-bash', cooldown: -0.6 }
  },
  {
    id: 'g-bulwark', classId: 'aegis-guardian', branch: 'base', tier: 3, maxRank: 2, cost: 2,
    name: 'Unbreakable', desc: 'ลดความเสียหายที่ได้รับทั้งหมด 5% ต่อแรงก์',
    requires: { node: 'g-stoneskin', level: 14, points: 6 },
    effect: { kind: 'passive', passive: { damageReductionPct: 0.05 } }
  },
  {
    id: 'g-momentum', classId: 'aegis-guardian', branch: 'base', tier: 3, maxRank: 2, cost: 2,
    name: 'Momentum', desc: 'คูลดาวน์ทุกสกิลลดลง 6% ต่อแรงก์', requires: { level: 16, points: 8 },
    effect: { kind: 'passive', passive: { cooldownReductionPct: 0.06 } }
  },
  {
    id: 'g-adv-rank', classId: 'aegis-guardian', branch: 'advanced', tier: 1, maxRank: 3, cost: 1,
    name: 'Path Mastery', desc: 'สกิลประจำสายอาชีพแรงขึ้น +20% ต่อแรงก์',
    effect: { kind: 'advancedSkillRank', power: 0.2 }
  },
  {
    id: 'g-adv-power', classId: 'aegis-guardian', branch: 'advanced', tier: 2, maxRank: 3, cost: 1,
    name: 'Oathbound', desc: 'ATK +6% ต่อแรงก์', requires: { node: 'g-adv-rank' },
    effect: { kind: 'passive', passive: { atkPct: 0.06 } }
  },

  // ================= Umbral Blade =================
  {
    id: 'b-slash-rank', classId: 'umbral-blade', branch: 'base', tier: 1, maxRank: 3, cost: 1,
    name: 'Wider Arc', desc: 'Crescent Slash แรงขึ้น +25% ต่อแรงก์',
    effect: { kind: 'skillRank', skillId: 'crescent-slash', power: 0.25 }
  },
  {
    id: 'b-echo-rank', classId: 'umbral-blade', branch: 'base', tier: 1, maxRank: 3, cost: 1,
    name: 'Killing Edge', desc: 'Echo Strike แรงขึ้น +35% ต่อแรงก์',
    effect: { kind: 'skillRank', skillId: 'echo-strike', power: 0.35 }
  },
  {
    id: 'b-agility', classId: 'umbral-blade', branch: 'base', tier: 1, maxRank: 3, cost: 1,
    name: 'Agility', desc: 'SPD +2 ต่อแรงก์',
    effect: { kind: 'passive', passive: { spdFlat: 2 } }
  },
  {
    id: 'b-precision', classId: 'umbral-blade', branch: 'base', tier: 2, maxRank: 3, cost: 1,
    name: 'Precision', desc: 'โอกาสคริต +4% ต่อแรงก์', requires: { node: 'b-agility', level: 6 },
    effect: { kind: 'passive', passive: { critBonus: 0.04 } }
  },
  {
    id: 'b-step-cd', classId: 'umbral-blade', branch: 'base', tier: 2, maxRank: 2, cost: 1,
    name: 'Fleeting Shadow', desc: 'Shadow Step คูลดาวน์ลดลง 1 วินาทีต่อแรงก์', requires: { node: 'b-slash-rank', level: 8 },
    effect: { kind: 'skillRank', skillId: 'shadow-step', cooldown: -1 }
  },
  {
    id: 'b-bloodthirst', classId: 'umbral-blade', branch: 'base', tier: 3, maxRank: 2, cost: 2,
    name: 'Bloodthirst', desc: 'ดูดเลือด 4% ของดาเมจที่ทำได้ ต่อแรงก์',
    requires: { node: 'b-precision', level: 14, points: 6 },
    effect: { kind: 'passive', passive: { lifestealPct: 0.04 } }
  },
  {
    id: 'b-ferocity', classId: 'umbral-blade', branch: 'base', tier: 3, maxRank: 2, cost: 2,
    name: 'Ferocity', desc: 'ATK +7% ต่อแรงก์', requires: { level: 16, points: 8 },
    effect: { kind: 'passive', passive: { atkPct: 0.07 } }
  },
  {
    id: 'b-adv-rank', classId: 'umbral-blade', branch: 'advanced', tier: 1, maxRank: 3, cost: 1,
    name: 'Path Mastery', desc: 'สกิลประจำสายอาชีพแรงขึ้น +20% ต่อแรงก์',
    effect: { kind: 'advancedSkillRank', power: 0.2 }
  },
  {
    id: 'b-adv-crit', classId: 'umbral-blade', branch: 'advanced', tier: 2, maxRank: 3, cost: 1,
    name: 'Executioner', desc: 'โอกาสคริต +5% ต่อแรงก์', requires: { node: 'b-adv-rank' },
    effect: { kind: 'passive', passive: { critBonus: 0.05 } }
  },

  // ================= Astral Weaver =================
  {
    id: 'w-star-rank', classId: 'astral-weaver', branch: 'base', tier: 1, maxRank: 3, cost: 1,
    name: 'Brighter Stars', desc: 'Starfall แรงขึ้น +25% ต่อแรงก์',
    effect: { kind: 'skillRank', skillId: 'starfall', power: 0.25 }
  },
  {
    id: 'w-shield-rank', classId: 'astral-weaver', branch: 'base', tier: 1, maxRank: 3, cost: 1,
    name: 'Woven Barrier', desc: 'Astral Shield ดูดซับเพิ่ม +30 ต่อแรงก์',
    effect: { kind: 'skillRank', skillId: 'astral-shield', value: 30 }
  },
  {
    id: 'w-attunement', classId: 'astral-weaver', branch: 'base', tier: 1, maxRank: 3, cost: 1,
    name: 'Attunement', desc: 'MP สูงสุด +8% ต่อแรงก์',
    effect: { kind: 'passive', passive: { mpPct: 0.08 } }
  },
  {
    id: 'w-focus', classId: 'astral-weaver', branch: 'base', tier: 2, maxRank: 3, cost: 1,
    name: 'Deep Focus', desc: 'ATK +7% ต่อแรงก์', requires: { node: 'w-attunement', level: 6 },
    effect: { kind: 'passive', passive: { atkPct: 0.07 } }
  },
  {
    id: 'w-gravity-rank', classId: 'astral-weaver', branch: 'base', tier: 2, maxRank: 2, cost: 1,
    name: 'Heavier Pull', desc: 'Gravity Well ชะลอนานขึ้น +1.5 วินาทีต่อแรงก์', requires: { node: 'w-star-rank', level: 8 },
    effect: { kind: 'skillRank', skillId: 'gravity-well', duration: 1.5 }
  },
  {
    id: 'w-flow', classId: 'astral-weaver', branch: 'base', tier: 3, maxRank: 2, cost: 2,
    name: 'Mana Flow', desc: 'คูลดาวน์ทุกสกิลลดลง 7% ต่อแรงก์',
    requires: { node: 'w-focus', level: 14, points: 6 },
    effect: { kind: 'passive', passive: { cooldownReductionPct: 0.07 } }
  },
  {
    id: 'w-warding', classId: 'astral-weaver', branch: 'base', tier: 3, maxRank: 2, cost: 2,
    name: 'Warding Sigils', desc: 'ลดความเสียหายที่ได้รับ 5% ต่อแรงก์', requires: { level: 16, points: 8 },
    effect: { kind: 'passive', passive: { damageReductionPct: 0.05 } }
  },
  {
    id: 'w-adv-rank', classId: 'astral-weaver', branch: 'advanced', tier: 1, maxRank: 3, cost: 1,
    name: 'Path Mastery', desc: 'สกิลประจำสายอาชีพแรงขึ้น +20% ต่อแรงก์',
    effect: { kind: 'advancedSkillRank', power: 0.2 }
  },
  {
    id: 'w-adv-mana', classId: 'astral-weaver', branch: 'advanced', tier: 2, maxRank: 3, cost: 1,
    name: 'Starbound', desc: 'MP สูงสุด +10% ต่อแรงก์', requires: { node: 'w-adv-rank' },
    effect: { kind: 'passive', passive: { mpPct: 0.1 } }
  }
];

export function treeNodesFor(classId) {
  return TREE_NODES.filter((node) => node.classId === classId);
}

export function getTreeNode(id) {
  return TREE_NODES.find((node) => node.id === id) || null;
}
