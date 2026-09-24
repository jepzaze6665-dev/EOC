// Skill definitions. The skill system executes them by `effect` type, so a new
// skill is usually just a new entry here.
//
//   effect: 'melee'      single target in front, within range
//           'cone'       everything in an arc in front
//           'aoe_target' circle centred on the current target
//           'dash'       move through/behind the target, damage on arrival
//           'buff'       applies a status to the player
//           'taunt'      pulls aggro from everything nearby
//   power:  multiplier applied to ATK
//   status: { type, duration, value } applied to whoever is hit (or to the player for buffs)

export const SKILL_DEFS = {
  // ---------- Aegis Guardian ----------
  'shield-bash': {
    name: 'Shield Bash', classId: 'aegis-guardian', effect: 'melee',
    mp: 8, cooldown: 5, range: 1.7, power: 1.6,
    status: { type: 'stun', duration: 1.2 },
    color: '#7cc4ff',
    desc: 'กระแทกด้วยโล่ สร้างความเสียหายและทำให้ศัตรูมึนงง 1.2 วินาที'
  },
  'iron-wall': {
    name: 'Iron Wall', classId: 'aegis-guardian', effect: 'buff',
    mp: 12, cooldown: 14,
    selfStatus: { type: 'damage_reduction', duration: 4, value: 0.6 },
    color: '#9fd8ff',
    desc: 'ลดความเสียหายที่ได้รับ 60% เป็นเวลา 4 วินาที'
  },
  'challenge': {
    name: 'Challenge', classId: 'aegis-guardian', effect: 'taunt',
    mp: 10, cooldown: 12, radius: 4.5,
    status: { type: 'slow', duration: 2.5, value: 0.5 },
    color: '#ffc46b',
    desc: 'ดึงความสนใจศัตรูรอบตัวและทำให้เคลื่อนที่ช้าลง'
  },

  // ---------- Umbral Blade ----------
  'crescent-slash': {
    name: 'Crescent Slash', classId: 'umbral-blade', effect: 'cone',
    mp: 8, cooldown: 4, range: 2.2, arc: 130, power: 1.35,
    color: '#ff9a6b',
    desc: 'ฟันเป็นวงกว้างโดนศัตรูทุกตัวด้านหน้า'
  },
  'shadow-step': {
    name: 'Shadow Step', classId: 'umbral-blade', effect: 'dash',
    mp: 10, cooldown: 7, distance: 3.2, power: 1.1,
    selfStatus: { type: 'invulnerable', duration: 0.45 },
    color: '#b07be0',
    desc: 'พุ่งไปข้างหน้าอย่างรวดเร็ว ช่วงสั้น ๆ จะไม่ได้รับความเสียหาย'
  },
  'echo-strike': {
    name: 'Echo Strike', classId: 'umbral-blade', effect: 'melee',
    mp: 14, cooldown: 8, range: 1.6, power: 2.5,
    color: '#ff6b6b',
    desc: 'โจมตีหนักใส่เป้าหมายเดียว ดาเมจสูงที่สุดของคลาส'
  },

  // ---------- Astral Weaver ----------
  starfall: {
    name: 'Starfall', classId: 'astral-weaver', effect: 'aoe_target',
    mp: 18, cooldown: 6, range: 6.5, radius: 2.2, power: 1.5,
    color: '#c6b8ff',
    desc: 'เรียกแสงดาวตกใส่พื้นที่รอบเป้าหมาย'
  },
  'gravity-well': {
    name: 'Gravity Well', classId: 'astral-weaver', effect: 'aoe_target',
    mp: 16, cooldown: 10, range: 6.5, radius: 2.8, power: 0.6,
    status: { type: 'slow', duration: 3.5, value: 0.45 },
    color: '#8f7bff',
    desc: 'สร้างหลุมแรงโน้มถ่วง ทำดาเมจเบาและชะลอศัตรูในพื้นที่'
  },
  'astral-shield': {
    name: 'Astral Shield', classId: 'astral-weaver', effect: 'buff',
    mp: 20, cooldown: 16,
    selfStatus: { type: 'shield', duration: 8, value: 70 },
    color: '#9fe8ff',
    desc: 'สร้างโล่เวทดูดซับความเสียหาย 70 หน่วย เป็นเวลา 8 วินาที'
  }
};

// ---------- Advanced class skills (Phase 4) ----------
// Unlocked by advancing; each advanced class brings one signature skill.
Object.assign(SKILL_DEFS, {
  'dawn-ward': {
    name: 'Dawn Ward', classId: 'warden-of-dawn', effect: 'heal',
    mp: 24, cooldown: 18, healPct: 0.3,
    selfStatus: { type: 'shield', duration: 8, value: 90 },
    color: '#e0b463',
    desc: 'ฟื้น HP 30% และสร้างโล่ดูดซับ 90 หน่วย'
  },
  'counter-stance': {
    name: 'Counter Stance', classId: 'bulwark-sentinel', effect: 'buff',
    mp: 16, cooldown: 15,
    selfStatus: { type: 'thorns', duration: 6, value: 0.6 },
    color: '#5a8fa8',
    desc: 'สะท้อนความเสียหายที่ได้รับ 60% กลับไปหาผู้โจมตี เป็นเวลา 6 วินาที'
  },
  'oath-strike': {
    name: 'Oath Strike', classId: 'oath-breaker', effect: 'melee',
    mp: 20, cooldown: 11, range: 1.7, power: 3.2,
    color: '#8a4a5c',
    desc: 'ทุ่มพลังทั้งหมดใส่การโจมตีครั้งเดียว ดาเมจสูงมาก'
  },

  'death-mark': {
    name: 'Death Mark', classId: 'nightfall-reaper', effect: 'melee',
    mp: 18, cooldown: 10, range: 1.7, power: 2.0,
    status: { type: 'vulnerable', duration: 6, value: 0.35 },
    color: '#7a3a6a',
    desc: 'ตีตราเป้าหมาย ทำให้ได้รับความเสียหายเพิ่ม 35% เป็นเวลา 6 วินาที'
  },
  'phantom-rush': {
    name: 'Phantom Rush', classId: 'duskrunner', effect: 'dash',
    mp: 14, cooldown: 9, distance: 4.5, power: 1.6,
    selfStatus: { type: 'haste', duration: 5, value: 0.45 },
    color: '#3f8a76',
    desc: 'พุ่งไกลกว่าเดิมและเคลื่อนที่เร็วขึ้น 45% เป็นเวลา 5 วินาที'
  },
  'echo-cascade': {
    name: 'Echo Cascade', classId: 'blade-of-echoes', effect: 'cone',
    mp: 22, cooldown: 12, range: 2.4, arc: 150, power: 0.95, hits: 3,
    color: '#b07a3a',
    desc: 'ฟันซ้ำ 3 ครั้งในวงกว้าง'
  },

  tempest: {
    name: 'Tempest', classId: 'stormcaller', effect: 'aoe_target',
    mp: 30, cooldown: 14, range: 7, radius: 3.4, power: 2.2,
    color: '#4a9fd0',
    desc: 'เรียกพายุลงพื้นที่กว้าง ดาเมจสูงสุดในสายเวท'
  },
  'null-field': {
    name: 'Null Field', classId: 'void-scribe', effect: 'aoe_target',
    mp: 26, cooldown: 16, range: 7, radius: 3, power: 0.8,
    status: { type: 'stun', duration: 2 },
    color: '#5c4a8a',
    desc: 'สร้างสนามว่างเปล่า ทำให้ศัตรูในพื้นที่มึนงง 2 วินาที'
  },
  'radiant-mend': {
    name: 'Radiant Mend', classId: 'lumen-oracle', effect: 'heal',
    mp: 28, cooldown: 14, healPct: 0.55,
    color: '#d8c86a',
    desc: 'ฟื้นฟู HP 55% ของค่าสูงสุด'
  }
});

export function getSkill(id) {
  return SKILL_DEFS[id] || null;
}
