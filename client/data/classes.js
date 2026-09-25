// Class definitions. The engine never hard-codes a class: adding one here is enough.
//
//   tier: 'starting' | 'advanced' | 'secret'
//   kit:  which weapon/gear the sprite generator draws ('shield' | 'blade' | 'staff')
//   advancements: ids of the classes this one can grow into (the class tree)
//   ultimate: the R skill (advanced classes keep their base class's ultimate)
//
// Class = Preset Character (brief section 10). A starting class fixes everything about
// how the character looks and fights - the player picks a class, not a face:
//   preset        the character's look: skin, hair, hairStyle, cloth, accent, kit
//   weapon        signature weapon (part of the preset - no free weapon swapping in sprites;
//                 equipment still adds stats, it never changes the weapon picture)
//   animationSet  which animation set the class uses. Only the shared walk cycle exists
//                 today - class animation sets: NOT IMPLEMENTED (brief phases 11-13)
//   vfx           colour theme of the class's effects (basic attack, projectiles, ultimate)
// Advanced classes keep their base class's preset, with their own colour and kit.
//
// NOTE (Phase 7): unlock conditions for secret classes must move to the server.
// Anything shipped in client code can be read by players.

export const CLASS_DEFS = [
  // ---------- Starting classes ----------
  {
    id: 'aegis-guardian',
    tier: 'starting',
    name: 'Aegis Guardian',
    role: 'Tank',
    kit: 'shield',
    color: '#4a7fd0',
    preset: { skin: '#e3b48c', hair: '#c9a227', hairStyle: 'short', cloth: '#4a7fd0', accent: '#e8d8a0', kit: 'shield' },
    weapon: 'Shield + Sword',
    animationSet: 'aegis',
    vfx: { theme: 'holy', primary: '#ffd873', secondary: '#fff3c8' },
    tagline: 'Hold the line. Nothing passes.',
    description: 'ผู้ปกป้องแนวหน้า เลือดเยอะ เกราะหนา ดึงความสนใจศัตรู และกันดาเมจแทนเพื่อนร่วมทีม เล่นง่ายที่สุดสำหรับผู้เริ่มต้น',
    stats: { hp: 140, mp: 50, atk: 9, def: 15, spd: 7 },
    growth: { hp: 14, mp: 3, atk: 1.4, def: 2.2, spd: 0.3 },
    resource: 'Vigor',
    basicAttack: { effect: 'melee', range: 1.6, arc: 120, power: 1.0, cooldown: 0.7 },
    skills: ['shield-bash', 'iron-wall', 'challenge'],
    ultimate: 'dawn-bastion',
    allowedWeapons: ['mace'],
    trial: 'q-trial-guardian',
    advancements: ['warden-of-dawn', 'bulwark-sentinel', 'oath-breaker']
  },
  {
    id: 'umbral-sword',
    tier: 'starting',
    name: 'Umbral Sword',
    role: 'Melee DPS',
    kit: 'blade',
    color: '#8a5ad0',
    preset: { skin: '#d8a07a', hair: '#1e1a24', hairStyle: 'ponytail', cloth: '#3a2f4a', accent: '#a070ff', kit: 'blade' },
    weapon: 'Shadow Blade',
    animationSet: 'umbral',
    vfx: { theme: 'shadow', primary: '#a070ff', secondary: '#4a2a70' },
    tagline: 'Strike first. Strike twice.',
    description: 'นักดาบระยะประชิด ดาเมจสูง เคลื่อนที่ไว เน้นต่อคอมโบและหาจังหวะเข้าหลังศัตรู แลกมากับเลือดที่น้อยกว่า',
    stats: { hp: 100, mp: 60, atk: 16, def: 8, spd: 11 },
    growth: { hp: 9, mp: 4, atk: 2.6, def: 1.1, spd: 0.7 },
    resource: 'Focus',
    basicAttack: { effect: 'melee', range: 1.5, arc: 110, power: 0.95, cooldown: 0.5 },
    skills: ['crescent-slash', 'shadow-step', 'echo-strike'],
    ultimate: 'eclipse-rend',
    allowedWeapons: ['blade'],
    trial: 'q-trial-blade',
    advancements: ['nightfall-reaper', 'duskrunner', 'blade-of-echoes']
  },
  {
    id: 'astral-weaver',
    tier: 'starting',
    name: 'Astral Weaver',
    role: 'Ranged / Magic',
    kit: 'staff',
    color: '#7b5cff',
    preset: { skin: '#f0d2b8', hair: '#d6d0e6', hairStyle: 'long', cloth: '#3f4a8b', accent: '#9fd8ff', kit: 'staff' },
    weapon: 'Celestial Loom + Astral Thread',
    animationSet: 'astral',
    vfx: { theme: 'astral', primary: '#9fd8ff', secondary: '#c6b8ff' },
    tagline: 'The sky answers those who ask.',
    description: 'ผู้ร่ายเวทระยะไกล เก่งดาเมจเป็นพื้นที่และควบคุมศัตรู ต้องบริหารมานาให้ดี เพราะร่างกายบอบบางที่สุดในสามคลาส',
    stats: { hp: 85, mp: 130, atk: 14, def: 6, spd: 9 },
    growth: { hp: 7, mp: 11, atk: 2.3, def: 0.9, spd: 0.5 },
    resource: 'Mana',
    basicAttack: { effect: 'projectile', range: 7, power: 1.0, cooldown: 0.85, speed: 9 },
    skills: ['starfall', 'gravity-well', 'astral-shield'],
    ultimate: 'celestial-loom',
    allowedWeapons: ['staff'],
    trial: 'q-trial-weaver',
    advancements: ['stormcaller', 'void-scribe', 'lumen-oracle']
  },

  // ---------- Advanced classes (Phase 4) ----------
  // statBonus applies once on advancing; growth replaces the base growth from then on.
  {
    id: 'warden-of-dawn', tier: 'advanced', parent: 'aegis-guardian',
    name: 'Warden of Dawn', role: 'Tank / Support', kit: 'shield', color: '#e0b463',
    requires: { level: 20 }, description: 'สายป้องกันที่ประคองตัวเองและทีมได้ ฟื้น HP และสร้างโล่',
    statBonus: { hp: 60, mp: 40, atk: 2, def: 6, spd: 0 },
    growth: { hp: 16, mp: 6, atk: 1.5, def: 2.4, spd: 0.3 },
    allowedWeapons: ['mace'], skills: ['dawn-ward']
  },
  {
    id: 'bulwark-sentinel', tier: 'advanced', parent: 'aegis-guardian',
    name: 'Bulwark Sentinel', role: 'Tank / Counter', kit: 'shield', color: '#5a8fa8',
    requires: { level: 20 }, description: 'สายสวนกลับ สะท้อนความเสียหายที่ได้รับกลับไปหาศัตรู',
    statBonus: { hp: 80, mp: 20, atk: 3, def: 8, spd: 0 },
    growth: { hp: 18, mp: 3, atk: 1.6, def: 2.8, spd: 0.2 },
    allowedWeapons: ['mace'], skills: ['counter-stance']
  },
  {
    id: 'oath-breaker', tier: 'advanced', parent: 'aegis-guardian',
    name: 'Oathbreaker', role: 'Tank / Bruiser', kit: 'blade', color: '#8a4a5c',
    requires: { level: 20 }, description: 'ทิ้งคำสาบานของผู้พิทักษ์ แลกเกราะบางส่วนเป็นพลังโจมตี',
    statBonus: { hp: 50, mp: 25, atk: 9, def: 2, spd: 1 },
    growth: { hp: 13, mp: 3, atk: 2.6, def: 1.5, spd: 0.4 },
    allowedWeapons: ['mace', 'blade'], skills: ['oath-strike']
  },

  {
    id: 'nightfall-reaper', tier: 'advanced', parent: 'umbral-sword',
    name: 'Nightfall Reaper', role: 'Burst DPS', kit: 'blade', color: '#7a3a6a',
    requires: { level: 20 }, description: 'ตีตราเป้าหมายแล้วปิดจบด้วยดาเมจก้อนใหญ่ครั้งเดียว',
    statBonus: { hp: 25, mp: 30, atk: 11, def: 2, spd: 1 },
    growth: { hp: 9, mp: 5, atk: 3.2, def: 1.1, spd: 0.6 },
    allowedWeapons: ['blade'], skills: ['death-mark']
  },
  {
    id: 'duskrunner', tier: 'advanced', parent: 'umbral-sword',
    name: 'Duskrunner', role: 'Mobility DPS', kit: 'blade', color: '#3f8a76',
    requires: { level: 20 }, description: 'เร็วที่สุดในเกม เข้า-ออกวงต่อสู้ได้อย่างอิสระ',
    statBonus: { hp: 35, mp: 25, atk: 7, def: 3, spd: 4 },
    growth: { hp: 10, mp: 4, atk: 2.7, def: 1.2, spd: 1.0 },
    allowedWeapons: ['blade'], skills: ['phantom-rush']
  },
  {
    id: 'blade-of-echoes', tier: 'advanced', parent: 'umbral-sword',
    name: 'Blade of Echoes', role: 'Combo DPS', kit: 'blade', color: '#b07a3a',
    requires: { level: 20 }, description: 'ฟันซ้ำหลายครั้งในจังหวะเดียว เก่งเมื่อเจอศัตรูเป็นกลุ่ม',
    statBonus: { hp: 30, mp: 35, atk: 8, def: 3, spd: 2 },
    growth: { hp: 10, mp: 5, atk: 2.9, def: 1.2, spd: 0.7 },
    allowedWeapons: ['blade'], skills: ['echo-cascade']
  },

  {
    id: 'stormcaller', tier: 'advanced', parent: 'astral-weaver',
    name: 'Stormcaller', role: 'AoE Magic', kit: 'staff', color: '#4a9fd0',
    requires: { level: 20 }, description: 'ดาเมจพื้นที่กว้างที่สุด แลกมากับมานาที่หมดเร็ว',
    statBonus: { hp: 20, mp: 70, atk: 10, def: 1, spd: 1 },
    growth: { hp: 7, mp: 14, atk: 3.0, def: 0.9, spd: 0.5 },
    allowedWeapons: ['staff'], skills: ['tempest']
  },
  {
    id: 'void-scribe', tier: 'advanced', parent: 'astral-weaver',
    name: 'Void Scribe', role: 'Control Magic', kit: 'staff', color: '#5c4a8a',
    requires: { level: 20 }, description: 'ควบคุมสนามรบด้วยการหยุดและชะลอศัตรูทั้งกลุ่ม',
    statBonus: { hp: 30, mp: 55, atk: 7, def: 3, spd: 1 },
    growth: { hp: 9, mp: 12, atk: 2.5, def: 1.2, spd: 0.5 },
    allowedWeapons: ['staff'], skills: ['null-field']
  },
  {
    id: 'lumen-oracle', tier: 'advanced', parent: 'astral-weaver',
    name: 'Lumen Oracle', role: 'Healer', kit: 'staff', color: '#d8c86a',
    requires: { level: 20 }, description: 'สายประคองตัว ฟื้น HP ได้มากที่สุดในบรรดาทุกคลาส',
    statBonus: { hp: 45, mp: 60, atk: 5, def: 4, spd: 1 },
    growth: { hp: 11, mp: 13, atk: 2.1, def: 1.5, spd: 0.5 },
    allowedWeapons: ['staff'], skills: ['radiant-mend']
  }
];

// Secret classes are intentionally described as little as possible.
// Players must discover the real conditions in the world (Phase 6).
export const SECRET_CLASS_SLOTS = [
  { id: 'secret-01', tier: 'secret', hidden: true, hint: 'Something waits where the light does not reach.' },
  { id: 'secret-02', tier: 'secret', hidden: true, hint: 'A name spoken only during the eclipse.' },
  { id: 'secret-03', tier: 'secret', hidden: true, hint: '???' }
];
