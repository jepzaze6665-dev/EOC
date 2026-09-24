// Monster definitions.
//   body      which sprite generator draws it ('slime' | 'wraith')
//   aggroRange how far it notices the player, leash how far it chases before returning home
//   drops     { id, chance, min, max } rolled on death

export const MONSTER_DEFS = {
  'gloom-slime': {
    name: 'Gloom Slime',
    body: 'slime',
    level: 2,
    hp: 60,
    atk: 8,
    def: 4,
    speed: 1.6,          // tiles per second
    aggroRange: 4.5,
    leashRange: 9,
    attackRange: 1.1,
    attackCooldown: 1.6,
    exp: 22,
    gold: [3, 9],
    respawn: 12,
    radius: 0.34,
    colors: { body: '#5b4b8a', bodyLight: '#7b68b0', bodyDark: '#3c3060', eye: '#ffe27a' },
    drops: [
      { id: 'herb-moonleaf', chance: 0.35, min: 1, max: 2 },
      { id: 'potion-minor', chance: 0.18, min: 1, max: 1 }
    ]
  },
  'hollow-stalker': {
    name: 'Hollow Stalker',
    body: 'wraith',
    level: 4,
    hp: 95,
    atk: 13,
    def: 7,
    speed: 2.3,
    aggroRange: 6,
    leashRange: 12,
    attackRange: 1.3,
    attackCooldown: 1.2,
    exp: 40,
    gold: [8, 18],
    respawn: 18,
    radius: 0.32,
    colors: { body: '#2b2740', bodyLight: '#463f68', bodyDark: '#171428', eye: '#ff6b6b' },
    drops: [
      { id: 'ore-ironvein', chance: 0.3, min: 1, max: 2 },
      { id: 'relic-shard', chance: 0.18, min: 1, max: 1 },
      { id: 'ether-minor', chance: 0.15, min: 1, max: 1 }
    ]
  }
};

export function getMonsterDef(id) {
  return MONSTER_DEFS[id] || null;
}

export function rollDrops(def) {
  const result = [];
  for (const drop of def.drops || []) {
    if (Math.random() > drop.chance) continue;
    const count = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
    result.push({ id: drop.id, count });
  }
  return result;
}

export function rollGold(def) {
  const [min, max] = def.gold || [0, 0];
  return min + Math.floor(Math.random() * (max - min + 1));
}
