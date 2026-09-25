# ECLIPSE ONLINE — Roadmap & Decisions

อัปเดตล่าสุด: 2026-09-25

เอกสารนี้เก็บ **แผนงานที่เหลือ** และ **การตัดสินใจที่ตกลงกันแล้ว** เพื่อให้ทำงานต่อบนเครื่องอื่นได้
Brief ต้นฉบับอยู่ใน `docs/briefs/`

---

## สถานะปัจจุบัน

### เสร็จแล้ว
- **RPG Phase 1–4 (แผนเดิม):** สร้างตัวละคร, Class, Stats/EXP/Inventory/Equipment, NPC/Quest, Combat แบบ real-time, Skill tree, เลื่อนคลาสที่ Lv.20
- **World Phase 1R + 2:** Image map engine (หมู่บ้าน/ป่าแบบรูปวาด), Map Manager, Map Transition แบบ fade, spawn แบบตั้งชื่อ
- **Map System Milestone 1:** A1 Whispering Forest แบบ Isometric 150×150 tiles
  - Chunk (32×32), Collision, Camera bounds, Zoom 1.0 / 1.25 / 1.5
  - ความสูง 3 ระดับ + บันได + ผนังหน้าผา
  - ขอบพื้นกลืนกัน, ตลิ่ง/ฟองน้ำ, เงาใต้วัตถุ, โทนสีอุ่น, ขอบจอมืด
  - สะพานชิ้นเดียว, บันไดเป็นภาพเดียวต่อชุด
  - ~2 ms/frame
- **(2026-09-25) Phase 9 — การควบคุมตาม brief:** WASD เดิน, เมาส์เล็ง (ตัวละครหันตามเมาส์), คลิกซ้ายบนมอนสเตอร์ = เลือกเป้า, กดค้างคลิกซ้าย = โจมตีปกติ, 1–4 สกิล, **R = Ultimate** (Dawn Bastion / Eclipse Rend / Celestial Loom), Shift กัน, Q หลบ, F โพชั่น, E คุย — Space ตี และ Tab ล็อกเป้า ถูกตัดออก; HUD: LMB 1 2 3 R Q F
- **(2026-09-25) Phase 10 — คลาส = ตัวละครสำเร็จรูป:** `preset` / `weapon` / `animationSet` / `vfx` ใน `classes.js`, หน้าตามาจากคลาส (`buildAppearance(classId)`), หน้าสร้างตัวละคร **Class → Name → Confirm**, Umbral Blade → **Umbral Sword** (เซฟเก่าแปลงอัตโนมัติ), โจมตีปกติใช้สี `vfx.primary` ของคลาส; ระบบหน้าตา 6 แบบเก่าเก็บใน `legacy/appearance-presets/`
- ทดสอบ: `npm test` 229 ผ่าน + ทดสอบใน Chrome จริง (`tools/out/cdp/p9.mjs`, `p10.mjs` — อยู่ใน tools/out ไม่ขึ้น git)

### เข้า A1 ได้อย่างไร
เดินออกทางเหนือของหมู่บ้าน (บันได Route A) → A1

---

## การตัดสินใจที่ตกลงแล้ว (ไม่ต้องถามซ้ำ)

1. **ทิศทางแมพ: Isometric Tile + Chunk** สร้างจาก tile sheet ที่ผู้ใช้สร้างด้วย AI (`assets/maps/map1/`)
   - รูปวาดใน `docs/Map/` = **Master Map** ใช้อ้างอิงผังเท่านั้น
   - ห้ามกลับไปใช้ภาพวาดโค้ดแบบ placeholder เวอร์ชันแรก (ผู้ใช้ไม่ต้องการ)
2. **FPS สำคัญที่สุด (MMORPG)**
   - เอฟเฟกต์ที่เก็บไว้: โทนสีอุ่น, ขอบจอมืด, เงาใต้วัตถุ (ทั้งหมด cache ไว้ ไม่คำนวณทุกเฟรม)
   - ลบออกแล้ว ห้ามเพิ่มกลับโดยไม่ถาม: แสงแดด, ใบไม้ร่วง, หิ่งห้อย, ต้นไม้ไหว, น้ำระยิบ, particle ของกองไฟในแมพ
3. **Tile sheet จาก AI ส่งออกพื้นหลังโปร่งใสไม่ได้** — ลายหมากรุกเป็นสีจริงในภาพ, เครื่องมือ `tools/lib/image-ops.mjs` ลบให้
4. **ผู้ใช้จะส่ง tile sheet + Master Map ของอีก 7 แมพมาทีหลัง** (A2, A3, B1, B2, B3, Asteria City)
5. **Collision:** ผมเป็นคนวางเอง ผู้ใช้ชี้จุดที่ต้องแก้ แล้วผมแก้ในไฟล์ map source
6. **Route A** = บันไดทิศเหนือของหมู่บ้าน, **Route B** = สะพานหิมะทิศตะวันออกเฉียงเหนือ (ปิดไว้ด้วย collision 5)
7. **ความก้าวหน้า RPG:** skill tree แบบ point-buy, เลื่อนคลาสผ่าน trial quest ที่ Lv.20, cap Lv.60, อาวุธจำกัดตามประเภท
8. **Secret content ต้องไม่บอกใบ้ใน UI** (pillar ของเกมคือการค้นพบ)
9. **(2026-09-25) `docs/briefs/03-game-foundation-spec.md` เป็นสเปกหลัก** — ต่อยอดของเดิม ไม่เริ่มใหม่
10. **การควบคุมตาม brief อย่างเดียว:** WASD เดิน, เมาส์เล็ง/เลือกเป้า, คลิกซ้ายโจมตี, 1–4 สกิล, R Ultimate (ตัดปุ่มเดิมที่ซ้ำหน้าที่ เช่น Space ตี, Tab ล็อกเป้า)
11. **คลาส = ตัวละครสำเร็จรูป:** หน้าตา/อาวุธ/แอนิเมชัน/VFX ผูกกับคลาส ตัดการเลือกหน้าตา 6 แบบ, Equipment ยังเพิ่มค่าสถานะได้แต่ไม่เปลี่ยนภาพอาวุธ, เปลี่ยนชื่อ Umbral Blade → **Umbral Sword**
12. **ความคมของพิกเซล: แบบ B = พิกเซลแท้ 32×16 ต่อ tile** (`ISO.ART_PIXEL = 2`) ขอบแข็ง, ขอบพื้นกลืนกันเป็นพิกเซลขนาดเดียวกัน — ดูแบบอื่นได้ด้วย `?artpx=0` / `?artpx=4`
13. **โหมดนักพัฒนา** (`client/core/env.js`): เปิดเฉพาะ localhost — F8, แผง ` (backquote) และ `window.eclipse` ไม่มีใน production (ทดสอบด้วย `?production`)

14. **(2026-09-25) งานแมพพักไว้ — เกมมีแค่ 2 แมพ: Lumina Village ↔ A1** ทางออกเหนือของหมู่บ้านไป A1 แล้ว, มอนสเตอร์/สมุนไพร/แร่/ป้ายเตือนย้ายเข้า A1, ป่าแบบรูปวาดเดิมเก็บใน `legacy/image-forest/` (งานแมพอื่น ๆ — บอส, ความลับ, หมู่บ้าน iso — พักจนกว่าผู้ใช้สั่ง)

---

## 🔧 งานที่ค้างอยู่ (ทำต่อจากตรงนี้)

ไม่มีงานค้างครึ่งทาง — Phase 9 และ 10 เสร็จแล้ว
**ขั้นต่อไปที่เสนอ (brief Phase 11–13):** animation set + VFX theme ต่อคลาส (ตอนนี้ทุกคลาสใช้ท่าเดินชุดเดียวกัน, `animationSet` ยังเป็นแค่ข้อมูล)
งานแมพ (บอส, ความลับ, หมู่บ้าน iso, แมพใหม่) ยังพักตามข้อ 14 จนกว่าผู้ใช้สั่ง

### เทียบ brief หลัก (03) กับของที่มี
| Phase ใน brief | สถานะ |
|---|---|
| 1 Foundation, 2 Iso Renderer, 3 Tile Map, 4 Camera, 5 Movement, 6 Collision, 7 Objects/Depth | ✅ มีแล้ว (A1) — ขาด tile: Shallow Water, Mud, Sand, Snow, ชิ้นถนนแยก/ทางแยก, ramp |
| First milestone: FPS display | ✅ (มุมขวาบน) |
| First milestone: Debug Mode **F8** | ✅ (2026-09-25) แผงข้อมูล + ปุ่มชั้น VISUAL/COLLISION/OBJECT/SECRET/GRID + เมาส์ชี้/คลิกดูข้อมูลช่อง, ปิดใน production |
| 8 Basic HUD | ✅ มีแล้ว — ขาด minimap (optional) |
| 9 Combat Foundation | ✅ เมาส์เล็ง + คลิกซ้าย + R Ultimate (Phase 9) |
| 10 Class System | ✅ class = preset (Phase 10) |
| 11–13 Umbral / Aegis / Astral | ⚠️ มีสกิล/passive/resource/skill tree/Ultimate แล้ว — ขาด animation set และ VFX ต่อคลาส (มีแค่สีธีม) |
| 14 Map Secrets | ❌ (Milestone 3 เดิม) |
| 15 Dungeon / Boss | ❌ (Milestone 2 เดิม: Forest Guardian) |
| 16 Multiplayer foundation | ❌ |

---

## แผนงานที่เหลือ

> brief Map System กำหนดรายละเอียดไว้แค่ Milestone 1 — การแบ่ง Milestone 2+ เป็นข้อเสนอที่ผู้ใช้ยังปรับลำดับได้
> ทุก Milestone ต้องทำงานได้จริงและทดสอบผ่านก่อนไปขั้นถัดไป

### Milestone 2 — A1 เล่นได้จริง (brief Step 10–12, World Phase 4 ส่วน A1)
1. Object Layer: มอนสเตอร์ / NPC / ป้าย / จุดเก็บของใน A1, โซนมอนสเตอร์ตามความยาก
2. Route A → A1: บันไดเหนือของหมู่บ้านพาไป A1 แทนป่าเดิม (ป่าเดิมย้ายไป `legacy/`)
3. Boss Arena ที่วงหินรูน: ทางเข้า, ขอบเขต, จุดเกิดบอส, แถบ HP บอส, สู้แล้วออกไม่ได้จนจบ
4. Boss Forest Guardian: มีท่าโจมตีหลายแบบ
5. Boss Gate + World State: ชนะแล้วทางไป A2 เปิด, เก็บใน `worldState` แยกจากตัวละคร (พร้อมย้ายไปเซิร์ฟเวอร์)
6. ผลหลังชนะบอส: บทพูด NPC เปลี่ยน, เควสใหม่ปลดล็อก
7. A2 ชั่วคราว (แผนที่เล็ก) จนกว่าจะได้ภาพ A2

### Milestone 3 — Local Secret (brief Step 13–14, World Phase 7)
1. Secret Layer + Trigger (เดินใกล้ / ตรวจดู / NPC / เวลา)
2. Hidden Forest Hollow ใน A1 (เบาะแส: ศาลคริสตัลฝั่งตะวันออก)
3. Secret Boss **Hollowfang**: เงื่อนไขเกิด, รางวัล, สถานะ
4. เควสลับแยกจากเควสหลัก ไม่บอกใบ้ใน UI

### Milestone 4 — F8 Map Debug Mode (brief Step 15)
1. เปิด/ปิดชั้น: [VISUAL] [COLLISION] [OBJECT] [SECRET] [GRID] + Master Map ซ้อน
2. เมาส์แสดงพิกัด World/Tile, คลิกดูข้อมูลช่อง (เดินได้ไหม / วัตถุ / ความลับ)
3. ไม่แสดงใน Production Mode

### Milestone 5 — หมู่บ้าน Isometric (World Phase 3 ที่พักไว้)
1. แปลง Lumina Village เป็น tile โดยใช้รูปวาดเป็น Master Map
2. อาคาร/ตลาด/โรงตีเหล็ก/โรงเตี๊ยม/ลานฝึกจาก sheet
3. NPC ครบ รวม Teleport / Guild (placeholder)
4. ทางเข้า Route B + Hidden Area ในถ้ำหน้าผาตะวันออกเฉียงใต้
5. หลังจากนี้ทั้งเกมเป็น Isometric — ระบบ image map ย้ายไป `legacy/`

### Milestone 6 — Route A ที่เหลือ (World Phase 4, รอภาพ)
- **A2 Ancient Valley:** น้ำตก, หน้าผา, ถ้ำ, Elite, เควสลับ, ทางเข้า Dungeon (placeholder), บอส **Ancient Beast**
- **A3 Ruins of Asteria:** วิหาร, ประตูโบราณ, พื้นที่กัดกร่อน, NPC ตำนาน, ประตูลับ, Major Boss **Asteria Guardian**
- ชนะ → Route A สำเร็จ → เปิดทางเข้า City 2

### Milestone 7 — Route B (World Phase 5, รอภาพ)
- **B1 Frostwind Plains:** บอส Frostfang
- **B2 Crystal Caverns:** ห้องลับ, ประตูลับ, บอส Crystal Golem
- **B3 Frostpeak:** ป้อมโบราณ, พายุหิมะ, Major Boss **Frost Warden**

### Milestone 8 — City 2 Asteria City (World Phase 6)
ร้านค้า, ช่างตีเหล็ก, โรงเตี๊ยม, คลัง, NPC เควส, NPC เลื่อนคลาส, ทางเข้า Region อนาคต (placeholder)

### Milestone 9 — World State + Save/Load (World Phase 8)
บันทึกบอส/เส้นทาง/เควส/ความลับ/แมพล่าสุด (ตอนนี้ Continue เริ่มที่หมู่บ้านเสมอ) — ออกแบบให้ย้ายไปเซิร์ฟเวอร์ได้

### Milestone 10 — Optimization (World Phase 9)
โหลด asset เฉพาะแมพที่ใช้, คืนหน่วยความจำแมพที่ออกไป, ทดสอบเครื่องสเปกต่ำ, บีบอัดภาพ

### ยังไม่อยู่ในแผน (brief ให้ไว้ทีหลัง)
Multiplayer/Server, Login, Database, Party, Guild, Trading, PvP, World Event ขนาดใหญ่

---

## สิ่งที่ต้องได้จากผู้ใช้
| เมื่อไหร่ | สิ่งที่ต้องใช้ |
|---|---|
| Milestone 2 | ภาพ Boss Forest Guardian (ไม่มีก็ใช้ placeholder ได้) |
| Milestone 5 | tile หมู่บ้านเพิ่ม (ถ้าต้องการ) |
| Milestone 6–8 | tile sheet + Master Map ของ A2, A3, B1, B2, B3, Asteria City |
| เมื่อไหร่ก็ได้ | สไปรต์ตัวละคร/มอนสเตอร์สไตล์เดียวกับฉาก |
