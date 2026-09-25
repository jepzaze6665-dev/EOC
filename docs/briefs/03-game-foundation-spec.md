# Brief: Stylized Isometric Pixel MMORPG — Main Spec (ได้รับ 2026-09-25)

> ผู้ใช้เลือกให้ใช้ brief นี้เป็น **สเปกหลักของทั้งเกม** และ **ต่อยอดโปรเจกต์เดิม** (ไม่เริ่มใหม่)
> ฉบับย่อ — เก็บทุกข้อกำหนดครบ

## Identity
- ECLIPSE ONLINE — Stylized Isometric Pixel MMORPG, Web Browser (PC), HTML5/CSS3/Vanilla JS/Canvas/ES Modules
- อนาคต: Node.js + WebSocket — เริ่มเป็น local prototype แล้วขยายเป็น MMORPG, ห้ามสร้างทั้งหมดทีเดียว

## 1–3 Visual / Camera / Pixel rules
- ต้องรู้สึก: fantasy MMORPG, colorful แต่ลึกลับ, environment ละเอียด, gameplay อ่านง่าย, pixel art คม, silhouette ชัด, landmark เด่น, โซนใหญ่, terrain แบบ modular, เน้นตัวละคร
- ห้ามดูเหมือน: 3D RPG, photorealistic, isometric strategy แบบสมจริง, 2D top-down แบน, painterly, vector, pixel art เบลอ
- Isometric projection เดียวกันทุกอย่าง (terrain, buildings, trees, rocks, cliffs, rivers, characters, monsters, effects) — ห้ามสลับ top-down/side/iso
- Pixel: hard edges, pixel cluster ควบคุม, palette สอดคล้อง, pixel density สม่ำเสมอ, shading อ่านง่าย, highlight จำกัด
- ห้าม: anti-aliasing, blur, soft edges, vector curves, painterly, photorealistic, 3D, gradient มากเกิน
- `ctx.imageSmoothingEnabled = false` (ไม่อ้างว่าเพิ่มรายละเอียด)

## 4–9 World
- World = TILE + OBJECT SPRITE + CHARACTER SPRITE + VFX — ห้ามใช้ภาพใหญ่ภาพเดียวเป็น runtime map
- Terrain: Grass, Dirt, Stone, Water, Shallow Water, Mud, Sand, Forest Floor, Ruined Stone, Cliff, Elevated Ground — ต่อกันแบบ seamless
- Road: straight, diagonal, corner, T, 4-way, ending, road→grass/water/stone — ช่วยนำทางแต่ไม่บังคับเดินบนถนน
- Cliff: top, straight wall, left/right-facing, outer/inner corner, stairs, ramps, elevation transitions — modular, เดินทะลุไม่ได้
- Water: surface, edges, corners, shallow, river, small waterfall, bridge — animation เบา ๆ ถ้าจำเป็น อย่ามากไป
- Objects: FOREST (pine, broadleaf, large, ancient trees, bushes, flowers, mushrooms, logs, stumps), TERRAIN (rocks, stones, gravestones, broken pillars, ruins, fences, signs), VILLAGE (houses, shops, camp, gates, watchtower, decorations)

## 10–12 Classes
- **Class = Preset Character**: body preset, hairstyle, outfit, signature weapon, animation set, VFX theme — ไม่ต้องมีระบบสลับอาวุธใน sprite
  - Umbral Sword = Umbral preset + Shadow Blade + Umbral animation + Shadow VFX
  - Aegis Guardian = Aegis preset + Shield + Sword + Aegis animation + Holy VFX
  - Astral Weaver = Astral preset + Celestial Loom + Astral Thread + Astral animation + Astral VFX
- 3 คลาสเริ่มต้น: Umbral Sword, Aegis Guardian, Astral Weaver — แต่ละคลาสในที่สุดมี basic attack, active, passive, ultimate, unique resource, progression, class 2 (ยังไม่ต้องทำครบ)
- Class 2: Umbral → Nightfall Reaper / Duskrunner / Blade of Echoes; Aegis → Warden of Dawn / Bulwark Sentinel / Oathbreaker; Astral → Stormcaller / Void Scribe / Lumen Oracle — ต้องเป็นการเปลี่ยน gameplay จริง

## 13–14 Combat
- Real-time: WASD เดิน, Mouse เล็ง/เลือกเป้า, Left Click โจมตีปกติ, Number keys สกิล, R Ultimate
- รองรับ HP, Damage, Defense, Target, Hitbox, Skill, Cooldown, Resource, Status Effect, Damage Number, Death, Respawn
- Manual-first: ห้าม auto combat/บอทเดิน-เลือกศัตรู-ฟาร์ม-ใช้สกิล-หลบ-ฆ่าบอส (QoL อนาคตได้: auto loot, target assist, pickup assist)

## 15–20 Maps
- โซนใหญ่เดินได้จริง ไม่ใช่ทางแคบ — CITY 1 → Route A (A1, A2, A3) / Route B (B1, B2, B3) → CITY 2
- Map Data + Tile + Object + Collision + NPC + Monster + Boss + Secret — ห้ามใช้ภาพเป็น collision / หาทางเดินจากสีภาพ
- Chunk (เช่น 200×200, chunk 32×32) render เฉพาะใกล้กล้อง, asset caching, cleanup, reusable data
- Camera: ตามผู้เล่น, map bounds, zoom 1.0 / 1.25 / 1.5, ไม่เห็นนอกโลก, smoothing ถ้าเหมาะ, หลีกเลี่ยง fractional scaling ที่เบลอ
- Layers: Ground → Terrain/Elevation → Static Objects → Dynamic Entities → VFX → UI, depth sort ตาม world position

## 21–24 Secrets / Bosses
- LOCAL (1 แมพ: hidden area, hidden boss, special reward), REGIONAL (2–3 แมพ: hidden quest/NPC/dungeon), WORLD (หลายแมพ, หลาย item/NPC, world event, secret dungeon/boss, secret class) — ตอนนี้แค่ให้ architecture รองรับ
- Local secret ค้นพบจาก environmental clue ไม่ใช่ RNG ต่ำมาก
- Main Boss: Enter → Explore → Objective → Find Boss → Defeat → Unlock Exit → Next Map — ต้องมี mechanic ไม่ใช่แค่ HP เยอะ
- Secret Boss: optional, hidden, แยกจาก main progression, รางวัลพิเศษ (rare item, relic, cosmetic, title, lore, skill modifier) ไม่จำเป็นต้องดีที่สุดทุกครั้ง

## 25–27 UI / Debug / Performance
- HUD: ซ้ายบน portrait, ชื่อ, level, class, HP, resource, EXP, currency / ล่าง skill bar / ขวาบน map name, coordinates, danger status, minimap (optional) — อ่านง่าย ไม่บังโลก
- Debug **F8**: world coords, tile coords, collision, current chunk, FPS, player position, object IDs, secret triggers — ไม่แสดงใน production
- Performance: rendering, asset caching, object reuse, cleanup, chunk rendering, particles, dynamic entities — ห้ามสร้าง object ไม่จำเป็นทุกเฟรม

## 28 Multiplayer (อนาคต)
Browser Client → WebSocket → Node.js Server → Authoritative World State — server ตรวจ movement, damage, HP, inventory, rewards, quests, player state — client ห้ามเป็น authority ข้อมูลสำคัญ

## 29 Project structure (แนะนำ)
client/{main, game, renderer, camera, input}, client/map, client/combat, client/classes/{umbral,aegis,astral}, client/entities, client/animation, client/vfx, client/ui, assets/{tiles,objects,characters,skills,vfx,ui}, server/ — ปรับได้แต่ต้องอธิบายก่อนเปลี่ยนมาก

## 30 Development order
1 Foundation, 2 Iso Renderer, 3 Tile Map, 4 Camera, 5 Player Movement, 6 Collision, 7 Objects/Depth, 8 Basic HUD, 9 Combat Foundation, 10 Class System, 11 Umbral Sword, 12 Aegis Guardian, 13 Astral Weaver, 14 Map Secrets, 15 Dungeon/Boss, 16 Multiplayer foundation

## 31 First milestone
HTML/CSS/JS/Canvas, iso renderer, 64×32 terrain tiles, grass/dirt/stone/water/road, trees, rocks, player placeholder, camera, WASD, collision, depth sorting, zoom 1.0/1.25/1.5, FPS display, Debug Mode — ป่าเล็กที่เล่นได้

## 32–34 Rules
อธิบายภาษาไทย, อธิบายก่อนเขียนโค้ด, ระบุทุกไฟล์และหน้าที่, ไม่ dump โค้ดก้อนใหญ่, modular, data-driven, ไม่มี dependency เกินจำเป็น, ตั้งชื่อชัด, comment ที่จำเป็น, ห้ามสร้าง asset path ที่ไม่มีจริง (ใช้ placeholder), ถ้าแก้แล้วทำของเดิมพังต้องบอก — ห้ามปุ่มหลอก (ใช้ NOT IMPLEMENTED), ห้ามอ้าง "MMORPG ready" ถ้ายังไม่มี multiplayer จริง
ตอบท้าย: วิธี run ใน VS Code, วิธีทดสอบ, ผลที่ควรเห็น, error ที่มือใหม่เจอบ่อย, สิ่งที่ยังไม่ได้ทำ, ขั้นต่อไป
