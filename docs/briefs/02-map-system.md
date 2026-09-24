# Brief: Map System — Isometric Tile + Chunk (ได้รับ 2026-09-25)

> สำเนาต้นฉบับที่ผู้ใช้ส่งมา (จัดรูปแบบให้กระชับ เนื้อหาครบทุกข้อ)
> สถานะ: Milestone 1 เสร็จแล้ว — ดูแผนต่อใน `docs/ROADMAP.md`

## GOAL
ระบบ Map เดิมใช้ภาพแผนที่ใหญ่เป็นภาพหลัก เมื่อ Zoom ภาพแตก/เบลอ ต้องการปรับระบบ Map ใหม่:
1. Map ใหญ่ 2. เดินสำรวจพื้นที่ที่เปิดให้เดินได้ทั่ว Map 3. Camera ตามผู้เล่น 4. รองรับ Isometric
5. Zoom ได้โดยคุณภาพไม่เสียเกินที่กำหนด 6. ไม่ใช้ภาพเดียวขนาดเล็กแล้วขยายไร้ขีดจำกัด
7. ใช้ Master Map เป็น Visual Base / World Layout 8. แยก Visual Map ออกจาก Gameplay Data
9. Collision 10. NPC 11. Monster 12. Boss 13. Secret Area 14. Map Transition 15. Chunk 16. รองรับ Multiplayer ในอนาคต

## IMPORTANT DESIGN DECISION
ห้ามทำแบบ Single Image → Scale Up → Camera Zoom หลายเท่า → Player เดินบนภาพโดยตรง
(ภาพแตก, Collision ยาก, Secret ยาก, NPC placement ยาก, Map ใหญ่จริงยาก, Performance ไม่ดี, ต่อ Multiplayer ยาก)

ให้เปลี่ยนเป็น: MASTER MAP → MAP DATA → CHUNK / REGION → VISUAL LAYER + COLLISION LAYER + OBJECT LAYER + SECRET LAYER → CAMERA → PLAYER

## 1. MASTER MAP
ใช้เป็น World Layout Reference, Visual Base, Environment Guide, Landmark Reference
ห้ามใช้เป็น Collision โดยตรง, ห้ามให้ผู้เล่นชน pixel จากภาพ, ห้ามตรวจสีของภาพเพื่อหาพื้นที่เดิน
(หมายเหตุการ implement: เครื่องมือ build อ่านสีของ Master Map ตอนสร้างแมพเพื่อกำหนดผังเท่านั้น — เกมไม่เคยอ่านภาพตอน runtime)

## 2. MAP REPRESENTATION
Map เป็นข้อมูลเชิงโครงสร้าง เช่น `{ id, name, width, height, tileSize, chunkSize, spawnPoints, exits, objects, collision, secrets }`
width/height เปลี่ยนได้จาก Config, ห้าม hardcode ขนาด Map ในระบบ Camera

## 3. MAP SIZE
Prototype 150×150 ถึง 300×300 tiles, Production ใหญ่กว่านี้ได้ — ให้ใหญ่จาก World Coordinate จริง ไม่ใช่ยืดภาพ

## 4. TILE SYSTEM
Default 32×32 แต่เปลี่ยนได้ — ประเภท: Grass, Dirt, Water, Stone, Cliff, Road, Bridge, Sand, Snow, Ruins — Tile Data แยกจาก Rendering

## 5. CHUNK SYSTEM
แบ่ง Map เป็น Chunk (เช่น 300×300 → 32×32) — Chunk จัดการ พื้นที่, load/unload, Render, Collision, Object, Secret, NPC, Monster
ห้ามวาดทุก Tile ทุก Frame — Render เฉพาะ Current/Nearby Chunks และ Chunks ใน Camera View

## 6. WORLD COORDINATE
Player / Camera / Map ใช้ worldX, worldY — ไม่ผูก Position กับ Canvas Pixel

## 7. ISOMETRIC CONVERSION
Grid → World → Screen, มี `worldToScreen()` และ `screenToWorld()` สำหรับ Mouse, Click, Targeting, Placement, Debugging

## 8. CAMERA
Follow Camera + Boundary (ไม่เห็นนอก Map) — Position, Zoom, Bounds, Follow, Smoothing, Viewport

## 9. ZOOM
MIN_ZOOM / MAX_ZOOM เช่น 1.0 / 1.25 / 1.5 หรือค่าที่เหมาะกับ Asset — ใช้ `imageSmoothingEnabled = false`
(แต่ห้ามอ้างว่ามันเพิ่มรายละเอียดภาพ — มันแค่รักษาขอบ)

## 10. PIXEL PERFECT RENDERING
CSS ต้องไม่ยืด Canvas ผิดสัดส่วน, หลีกเลี่ยง Fractional Scaling ที่ทำให้เบลอ, ถ้า Zoom ทำให้เบลอให้ปรับ Zoom Levels

## 11. ART PIPELINE
Master Map ไม่ใช่ Final Tile Asset — ใช้กำหนดถนน แม่น้ำ ป่า อาคาร ซากโบราณ พื้นที่สำคัญ Landmark
Visual จริงใช้ Tile + Object Sprite + Decoration — ถ้ายังไม่มี Asset ใช้ Placeholder — ห้ามสร้าง Asset Path ที่ไม่มีไฟล์จริง

## 12. MAP LAYERS
1 VISUAL (Ground, Water, Road, Trees, Rocks, Buildings, Ruins, Decorations)
2 COLLISION (0 Walkable / 1 Blocked — Tree, Rock, Wall, Cliff, Building, Deep Water)
3 OBJECT (NPC, Monster, Boss, Chest, Door, Sign, Interaction Object, Teleport, Map Exit)
4 SECRET (Hidden Area, Secret Trigger, Hidden NPC, Secret Chest, Secret Boss, Secret Interaction, Environmental Clue)

## 13. WALKABLE WORLD
เดินได้ทั่วพื้นที่ Walkable — Main Road เป็นแค่ Navigation Aid ไม่ใช่ Path Constraint
ผู้เล่นออกนอกถนน เดินในป่าเปิด สำรวจ เข้า Hidden Area ค้นหา Secret ได้ ตราบใดที่ Collision อนุญาต

## 14. COLLISION
แยกจาก Visual, ไม่ใช้ Pixel Collision — Tile, Object, Building, Tree, Rock, Cliff, Water — ห้ามทะลุ Object ที่ Blocked

## 15. LARGE OBJECT COLLISION
ไม่ต้องใช้ตาม Sprite ทั้งหมด — Rectangle / Circle / Polygon (Tree: collisionRadius, Building: collisionRectangle, Cliff: polygon/rectangle)

## 16. DEPTH SORTING
Player หน้าต้นไม้ → Player อยู่หน้า / หลังต้นไม้ → ต้นไม้บัง — Sort ตาม World Y หรือ Depth ห้ามใช้ Layer คงที่อย่างเดียว

## 17. OBJECT DATA (ตัวอย่าง)
```
{ id: "tree_001", type: "decoration", x: 120, y: 80, collision: true, collisionShape: "circle", interaction: null }
{ id: "elder_maren", type: "npc", x: 140, y: 92, interaction: "elder_dialogue" }
{ id: "forest_guardian", type: "boss", x: 240, y: 180, spawnCondition: "main_boss" }
{ id: "hidden_hollow", type: "secret", x: 220, y: 150, discoveryType: "environment" }
```

## 18. MAP EXIT
```
{ id: "exit_to_A2", type: "map_exit", x: 290, y: 150, width: 4, height: 8, destinationMap: "A2", destinationSpawn: "A2_ENTRY" }
```
เดินเข้า Exit Zone → Fade → Load Map → Spawn Player → Continue

## 19. MAIN BOSS GATE
A1 → Main Boss → Boss Defeated → Exit A2 Unlock — Boss State อย่าอยู่ใน Client อย่างเดียว
Prototype เก็บ Local ได้ แต่ Architecture ต้องรองรับ Server-authoritative State

## 20. LOCAL SECRET
ทุก Map มี Local Secret ที่จบในแมพเดียว (เดินสำรวจ → Hidden Area → Secret Boss → Special Reward) ไม่ใช้ Item จากแมพอื่น — แยกจาก Main Quest

## 21. SECRET AREA
```
{ id: "moonlit_hollow", mapId: "A1", discoveryType: "environment", trigger: { type: "walk_near" }, hiddenUntilDiscovered: true }
```
เปิดด้วย เดินผ่าน / Interaction / NPC / Environmental Clue / Time / Event — Prototype ใช้ Trigger ง่าย ๆ ได้

## 22. SECRET BOSS
อยู่ใน Map, ซ่อนจาก Main Route, มี Spawn Condition, Reward, Boss State
```
{ id: "hollowfang", mapId: "A1", type: "secret_boss", spawnCondition: "moonlit_hollow_discovered", rewardTable: "hollowfang_rewards" }
```

## 23. WORLD SECRET COMPATIBILITY
รองรับในอนาคต (Item หลายแมพ, หลาย Quest/NPC/Boss, World Event, Secret Dungeon, Secret Class) — ยังไม่ต้องสร้าง

## 24–25. MASTER MAP REFERENCE MODE / DEBUG TOOLS
กด **F8** → MAP DEBUG MODE: Tile Grid, Coordinates, Collision, Objects, Secret Triggers, Spawn Points, Exit Points
เปิด/ปิด Layer: [VISUAL] [COLLISION] [OBJECT] [SECRET] [GRID] — เฉพาะ Developer ไม่แสดงใน Production
Mouse แสดง World X/Y, Tile X/Y — Click แสดงข้อมูล Tile (x, y, Walkable, Object, Secret)

## 26. PERFORMANCE
ห้าม Render ทั้งโลกทุก Frame, Loop Object ทั้งโลกทุก Frame, Load Asset ทุก Frame, สร้าง Sprite Object ใหม่ทุก Frame
ควร Render เฉพาะ Viewport, ใช้ Chunk, Cache Static Map Data, Cleanup Object, Asset Cache, แยก Static (Ground, Tree, Rock, Building, Decoration) กับ Dynamic (Player, NPC, Monster, Boss, Projectile, VFX)

## 27. RENDER PIPELINE
Camera → Visible Chunks → Ground → Static Objects → Depth Sort Dynamic → Player/NPC/Monster → VFX → UI (UI ไม่อยู่ใน World Coordinate)

## 28. MAP DATA VS ASSET
แยก Asset Registry: `grass_01 → /assets/tiles/grass_01.png`, `tree_large_01 → /assets/objects/tree_large_01.png` — เปลี่ยน Asset ได้โดยไม่แก้ Map Data

## 29. CURRENT MAP
ใช้ Map ปัจจุบันเป็น LUMINA / FOREST REGION — รักษา Concept Layout (Forest, Roads, River, Ruins, Open Areas, Waterfall, Camp, Landmark, Hidden Areas) แต่ไม่ใช้ภาพใหญ่ใบเดียวเป็น Runtime Map

## 30. MIGRATION STRATEGY
ห้ามรื้อเกมทั้งหมดในครั้งเดียว: OLD MAP → NEW MAP SYSTEM → Compatibility Layer → ย้ายทีละส่วน
ขั้นแรก: New Map Data, Camera, Collision, Player Movement, Isometric Render — แล้วค่อย Objects, NPC, Boss, Secret

## 31. PROTOTYPE MAP
A1, 150×150, Forest: Grass, Dirt Road, River, Bridge, Trees, Rocks, Camp, Small Ruins, Waterfall
Main Spawn: South — Main Exit: North-East — Secret Area: Hidden Forest Hollow — Main Boss: Forest Guardian — Secret Boss: Hollowfang

## 32. REQUIRED TEST
Player spawn, movement, Camera follow, Camera boundary, Zoom, Collision, River/Tree/Building collision, Map edge, Map Exit, Main Boss, Secret Area, Secret Boss, NPC, Depth Sorting, Debug Mode, Performance

## 33. ZOOM TEST
Zoom 1.0 / 1.25 / 1.5 — ตรวจ Pixel sharpness, Sprite clarity, Map clarity, Camera stability, No visual jitter — ถ้า 1.5 เสียให้ลด MAX_ZOOM

## 34. NO FAKE FUNCTIONALITY
ห้ามปุ่ม/ระบบหลอก — ถ้ายังไม่เสร็จให้แสดง NOT IMPLEMENTED

## 35. CODING RULES
Beginner: อธิบายภาษาไทย, ระบุไฟล์ทุกครั้ง (สร้าง/แก้), อธิบาย Architecture ก่อน Coding, Vanilla JS, ES Modules,
แยก Renderer/Map/Collision/Camera/Object, Data-driven, ไม่ hardcode Map ใน Game Loop, Collision ใน Player, Secret ใน Renderer

## 36. ห้ามทำตอนนี้
MMORPG Server, WebSocket, Database, Account, Party, Guild, Trading, PvP, World Event ขนาดใหญ่ — โฟกัส WORLD MAP SYSTEM

## 37. ลำดับการทำงาน
1 ตรวจโครงสร้าง 2 อธิบายว่าภาพแตกเพราะอะไร 3 ออกแบบ Architecture 4 Map Data 5 Isometric Coordinate 6 Camera
7 Chunk 8 Tile Rendering 9 Collision 10 Object Layer 11 Map Exit 12 Main Boss State 13 Local Secret
14 Secret Boss 15 Map Debug Mode 16 ย้าย Prototype A1

## 38. FIRST MILESTONE ✅
A1 + Isometric + 150×150 + Player + Camera + Collision + Zoom 1.0/1.25/1.5 + Walkable Area + Map Boundary
(ยังไม่ต้องทำ Boss / Secret / Multiplayer)

## 39. ACCEPTANCE CRITERIA
Map ใหญ่จริง, เดินสำรวจได้, Camera ตาม, ไม่เห็นนอก Map, Collision ทำงาน, ไม่ทะลุ Object, Isometric ถูก,
Depth Sorting ถูก, Zoom ไม่เบลอเกิน, Chunk load/render ถูก, Console ไม่มี Error, เพิ่ม A2 A3 B1 B2 B3 ได้

## 40. RESPONSE FORMAT
ก่อน Code: วิเคราะห์ปัญหาเดิม, ทำไมภาพแตก, เปรียบเทียบระบบ, Architecture, Folder Structure, Migration Plan
แล้วทำทีละ Milestone — แสดงไฟล์ที่สร้าง/แก้, Code, วิธี Run, วิธี Test, วิธีตรวจ Zoom, วิธีตรวจ Collision
ห้ามไป Milestone ถัดไปจนกว่า Milestone ปัจจุบันทำงานได้
