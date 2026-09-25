// Quest definitions.
//   type:       'normal' (shows markers) | 'hidden' (Phase 6: no marker, must be discovered)
//   giver       npc id that offers it, turnIn defaults to the giver
//   requires    { quest: id, level: n } - both optional
//   objectives  { type: 'talk' | 'collect', target, count, text }
//   rewards     { exp, gold, items:[{id,count}], itemByClass:{classId: itemId} }

export const QUEST_DEFS = [
  {
    id: 'q-first-steps',
    type: 'normal',
    title: 'First Steps',
    giver: 'elder-maren',
    level: 1,
    summary: 'ผู้เฒ่า Maren อยากให้เจ้าไปทำความรู้จักกับคนในหมู่บ้านก่อนออกเดินทาง',
    offerText: 'ก่อนจะออกไปข้างนอก ไปคุยกับ Kael ที่ลานฝึก และ Tomas ที่โรงเตี๊ยมเสียก่อน',
    completionText: 'ดีมาก ตอนนี้เจ้ารู้จักหมู่บ้านนี้พอจะเรียกว่าบ้านได้แล้ว',
    objectives: [
      { type: 'talk', target: 'kael-drill', count: 1, text: 'คุยกับ Kael ที่ลานฝึก' },
      { type: 'talk', target: 'tomas-inn', count: 1, text: 'คุยกับ Tomas ที่โรงเตี๊ยม' }
    ],
    rewards: { exp: 60, gold: 30, items: [{ id: 'potion-minor', count: 2 }] }
  },
  {
    id: 'q-moonleaf',
    type: 'normal',
    title: 'Moonleaf for the Inn',
    giver: 'tomas-inn',
    level: 1,
    requires: { quest: 'q-first-steps' },
    summary: 'Tomas ต้องการใบ Moonleaf ไปต้มยาให้แขกที่พัก',
    offerText: 'ช่วยเก็บ Moonleaf Herb มาให้ข้า 5 ใบได้ไหม มันขึ้นอยู่ตามพงหญ้ารอบหมู่บ้าน',
    completionText: 'ขอบใจมาก เอาเสื้อตัวนี้ไป มันเก่าแต่ยังกันลมได้ดี',
    objectives: [
      { type: 'collect', target: 'herb-moonleaf', count: 5, text: 'เก็บ Moonleaf Herb' }
    ],
    rewards: { exp: 90, gold: 40, items: [{ id: 'tunic-cloth', count: 1 }] }
  },
  {
    id: 'q-iron-for-forge',
    type: 'normal',
    title: 'Iron for the Forge',
    giver: 'brann-smith',
    level: 2,
    requires: { quest: 'q-first-steps' },
    summary: 'Brann ต้องการแร่เหล็กเพื่อจุดเตาไฟอีกครั้ง',
    offerText: 'ข้าต้องการ Ironvein Ore 4 ก้อน หาได้ตามกองหินรอบหมู่บ้าน เอามาแล้วข้าจะตีอาวุธให้',
    completionText: 'เตาไฟติดแล้ว! นี่อาวุธที่เหมาะกับแนวทางของเจ้า ใช้ให้คุ้มล่ะ',
    objectives: [
      { type: 'collect', target: 'ore-ironvein', count: 4, text: 'เก็บ Ironvein Ore' }
    ],
    rewards: {
      exp: 120,
      gold: 60,
      itemByClass: {
        'aegis-guardian': 'mace-guard',
        'umbral-sword': 'edge-duskfang',
        'astral-weaver': 'staff-apprentice'
      }
    }
  },
  {
    id: 'q-cull-slimes',
    type: 'normal',
    title: 'Thin the Gloom',
    giver: 'kael-drill',
    level: 2,
    requires: { quest: 'q-first-steps' },
    summary: 'Kael อยากให้เจ้าพิสูจน์ฝีมือกับ Gloom Slime ที่ชายป่า',
    offerText: 'ออกไปทางประตูใต้ แล้วจัดการ Gloom Slime ให้ได้ 5 ตัว อย่าลืมกด Shift ค้างเพื่อกันดาเมจ',
    completionText: 'ไม่เลวเลย ตอนนี้เจ้าพอจะเรียกว่านักสู้ได้แล้ว',
    objectives: [
      { type: 'kill', target: 'gloom-slime', count: 5, text: 'ปราบ Gloom Slime' }
    ],
    rewards: { exp: 130, gold: 55, items: [{ id: 'vest-leather', count: 1 }] }
  },
  {
    id: 'q-hollow-threat',
    type: 'normal',
    title: 'What Walks in the Hollow',
    giver: 'elder-maren',
    level: 4,
    requires: { quest: 'q-cull-slimes' },
    summary: 'มีเงาบางอย่างเดินอยู่ทางใต้ของชายป่า ผู้เฒ่าอยากรู้ว่ามันคืออะไร',
    offerText: 'ทางใต้สุดของชายป่ามีสิ่งที่ไม่ควรมีอยู่ที่นั่น จัดการมันสัก 3 ตัวแล้วกลับมาเล่าให้ข้าฟัง',
    completionText: 'Hollow Stalker งั้นหรือ... พวกมันไม่เคยเข้ามาใกล้ขนาดนี้มาก่อน มีบางอย่างกำลังเปลี่ยนไป',
    objectives: [
      { type: 'kill', target: 'hollow-stalker', count: 3, text: 'ปราบ Hollow Stalker' }
    ],
    rewards: { exp: 220, gold: 90, items: [{ id: 'charm-focus', count: 1 }] }
  },
  {
    id: 'q-village-survey',
    type: 'normal',
    title: 'Know Your Neighbours',
    giver: 'quest-board',
    level: 1,
    summary: 'ป้ายประกาศขอให้มีคนไปสำรวจว่าชาวบ้านแต่ละคนต้องการอะไรบ้าง',
    offerText: 'ประกาศ: ต้องการผู้ช่วยเดินสำรวจหมู่บ้าน พูดคุยกับ Sera, Ida และคนแปลกหน้าที่ชายป่า',
    completionText: 'รายงานครบแล้ว รับค่าจ้างไปได้เลย',
    objectives: [
      { type: 'talk', target: 'sera-merchant', count: 1, text: 'คุยกับ Sera' },
      { type: 'talk', target: 'ida-storage', count: 1, text: 'คุยกับ Ida' },
      { type: 'talk', target: 'nym-wanderer', count: 1, text: 'คุยกับคนแปลกหน้า' }
    ],
    rewards: { exp: 70, gold: 25, items: [{ id: 'ring-copper', count: 1 }] }
  }
];

// ---------- Class trials (Phase 4) ----------
// One per starting class. Completing your own trial unlocks Class Advancement.
QUEST_DEFS.push(
  {
    id: 'q-trial-guardian',
    type: 'normal',
    title: 'Trial of the Wall',
    giver: 'veyra-trainer',
    level: 20,
    requires: { level: 20, classId: 'aegis-guardian' },
    summary: 'บททดสอบของผู้พิทักษ์: ยืนหยัดต่อหน้าสิ่งที่คนอื่นหนี',
    offerText: 'ผู้พิทักษ์ที่แท้จริงวัดกันที่การยืนอยู่ได้ จัดการ Hollow Stalker 6 ตัว แล้วนำ Strange Shard มาให้ข้า 1 ชิ้น',
    completionText: 'เจ้ายืนหยัดได้จนถึงที่สุด — เส้นทางข้างหน้าเปิดให้เจ้าแล้ว เลือกเองว่าจะเดินทางไหน',
    objectives: [
      { type: 'kill', target: 'hollow-stalker', count: 6, text: 'ปราบ Hollow Stalker' },
      { type: 'collect', target: 'relic-shard', count: 1, text: 'เก็บ Strange Shard' }
    ],
    rewards: { exp: 400, gold: 200, items: [{ id: 'potion-minor', count: 5 }] }
  },
  {
    id: 'q-trial-blade',
    type: 'normal',
    title: 'Trial of the Edge',
    giver: 'veyra-trainer',
    level: 20,
    requires: { level: 20, classId: 'umbral-sword' },
    summary: 'บททดสอบของนักดาบ: ความเร็วและความแม่นยำ',
    offerText: 'ดาบที่ลังเลคือดาบที่ตาย จัดการ Gloom Slime 12 ตัว และ Hollow Stalker 4 ตัว',
    completionText: 'คมพอแล้ว ต่อจากนี้เจ้าต้องเลือกเองว่าจะคมไปในทางไหน',
    objectives: [
      { type: 'kill', target: 'gloom-slime', count: 12, text: 'ปราบ Gloom Slime' },
      { type: 'kill', target: 'hollow-stalker', count: 4, text: 'ปราบ Hollow Stalker' }
    ],
    rewards: { exp: 400, gold: 200, items: [{ id: 'potion-minor', count: 5 }] }
  },
  {
    id: 'q-trial-weaver',
    type: 'normal',
    title: 'Trial of the Sky',
    giver: 'veyra-trainer',
    level: 20,
    requires: { level: 20, classId: 'astral-weaver' },
    summary: 'บททดสอบของผู้ร่ายเวท: เข้าใจสิ่งที่มองไม่เห็น',
    offerText: 'เวทมนตร์ไม่ได้อยู่ที่พลัง แต่อยู่ที่ความเข้าใจ นำ Strange Shard มาให้ข้า 2 ชิ้น และจัดการ Hollow Stalker 5 ตัว',
    completionText: 'เจ้าอ่านสิ่งที่อยู่ในเศษหินนั้นออกแล้วใช่ไหม... ถึงเวลาเลือกทางของเจ้าเอง',
    objectives: [
      { type: 'collect', target: 'relic-shard', count: 2, text: 'เก็บ Strange Shard' },
      { type: 'kill', target: 'hollow-stalker', count: 5, text: 'ปราบ Hollow Stalker' }
    ],
    rewards: { exp: 400, gold: 200, items: [{ id: 'ether-minor', count: 5 }] }
  }
);

export function getQuestDef(id) {
  return QUEST_DEFS.find((q) => q.id === id) || null;
}
