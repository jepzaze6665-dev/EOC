# Brief: World Scope V1.0 (ได้รับ 2026-09-24)

> สำเนาต้นฉบับที่ผู้ใช้ส่งมา — เก็บไว้เพื่อทำงานต่อบนเครื่องอื่น
> หมายเหตุ: ต่อมา (2026-09-25) brief "Map System" (`02-map-system.md`) เปลี่ยนวิธีทำแมพเป็น Isometric Tile + Chunk
> ส่วนเนื้อหาโลก (เมือง, Route, บอส, ความลับ) ยังใช้ตาม brief นี้

```
คุณคือ Senior Game Developer, Game Designer และ World/Level Designer
ที่เชี่ยวชาญการสร้างเกม MMORPG 2D Pixel Art แบบ Isometric ด้วย HTML5, CSS3 และ JavaScript

จงช่วยสร้างระบบ WORLD ของเกม

# ECLIPSE ONLINE
World Scope V1.0

เกมเป็น MMORPG Fantasy RPG
รูปแบบ:
- 2D Pixel Art
- Isometric
- Real-time Combat
- Large Explorable World
- Full Online Multiplayer ในอนาคต
- พัฒนาใน VS Code
- HTML5 + CSS3 + JavaScript
- ใช้ HTML5 Canvas เป็น Renderer หลัก

==================================================
1. CORE WORLD VISION
==================================================

ECLIPSE ONLINE ต้องมีโลกที่ผู้เล่นรู้สึกว่าเป็น "โลกจริง"
ที่สามารถเดินทาง สำรวจ และค้นพบสิ่งต่าง ๆ ได้

World V1.0 ประกอบด้วย:

- 2 เมือง
- 2 เส้นทางหลักระหว่างเมือง
- 6 Field Maps
- 6 Area Boss
- 2 Major Boss
- Hidden Areas
- Hidden Quest
- Secret Dungeon
- Secret Content
- Map Transition
- Collision
- Isometric Movement
- Camera
- NPC
- World Trigger

โครงสร้างหลัก:

CITY 1
Lumina Village
      |
      +---------------- Route A ----------------+
      |                                         |
      |      A1 -> A2 -> A3 -> Major Boss      |
      |                                         |
      +---------------- Route B ----------------+
            B1 -> B2 -> B3 -> Major Boss
                              |
                              |
                           CITY 2


ทั้ง Route A และ Route B ต้องสามารถเดินทางจาก City 1
ไปยัง City 2 ได้

==================================================
2. CITY 1
==================================================

ชื่อ:

Lumina Village

หน้าที่:

- Starting City
- Safe Zone
- Tutorial Hub
- Quest Hub
- Shopping Hub
- Character Progression Hub

สิ่งที่ต้องมี:

- Player Spawn Point
- NPC
- General Shop
- Blacksmith
- Storage
- Inn
- Quest Board
- Class NPC
- Party/Guild NPC Placeholder
- Teleport NPC Placeholder
- Route A Entrance
- Route B Entrance
- Hidden Area

เมืองต้องสามารถเดินสำรวจได้ทั่วบริเวณที่อนุญาต

ต้องมี Collision สำหรับ:

- Buildings
- Walls
- Large Trees
- Rocks
- Water
- Cliffs
- Other Obstacles

ผู้เล่นไม่สามารถเดินทะลุสิ่งเหล่านี้ได้

==================================================
3. ROUTE A
==================================================

Theme:

Nature / Forest / Ancient Ruins

เส้นทาง:

Lumina Village
↓
A1 Whispering Forest
↓
A2 Ancient Valley
↓
A3 Ruins of Asteria
↓
Major Boss
↓
City 2


-------------------------------
A1 — Whispering Forest
-------------------------------

ระดับ:

Early Game

Theme:

- Dense Forest
- River
- Small Bridge
- Forest Path
- Ruined Camp
- Small Cave

ต้องมี:

- Normal Monsters
- NPC
- Quest
- Exploration Area
- Hidden Area
- Area Boss

Boss:

Guardian of the Forest

เมื่อ Boss ถูกกำจัด:

- เปิด Exit ไป A2
- เปลี่ยน World State
- สามารถปลดล็อก Quest ใหม่ได้

ห้ามทำให้ Map เป็นทางเดินเส้นตรงอย่างเดียว

ต้องมีพื้นที่ให้ผู้เล่นเดินสำรวจ


-------------------------------
A2 — Ancient Valley
-------------------------------

Theme:

- Valley
- Waterfall
- Cliff
- Cave
- Ancient Structures

ต้องมี:

- Normal Monsters
- Elite Monsters
- NPC
- Hidden Quest
- Hidden Area
- Dungeon Entrance Placeholder
- Area Boss

Boss:

Ancient Beast

Boss ต้องมี Boss Arena

เมื่อ Boss ถูกกำจัด:

- เปิดทางไป A3
- เปลี่ยน World State


-------------------------------
A3 — Ruins of Asteria
-------------------------------

Theme:

- Ancient Ruins
- Temple
- Broken Buildings
- Rune
- Ancient Gate
- Corrupted Area

ต้องมี:

- Strong Monsters
- Elite Monsters
- Hidden Area
- Lore NPC
- Secret Door Placeholder
- Major Boss Arena

Major Boss:

Asteria Guardian

เมื่อกำจัด Major Boss:

- Route A Complete
- เปิดทางเข้าสู่ City 2


==================================================
4. ROUTE B
==================================================

Theme:

Ice / Crystal / Underground

เส้นทาง:

Lumina Village
↓
B1 Frostwind Plains
↓
B2 Crystal Caverns
↓
B3 Frostpeak
↓
Major Boss
↓
City 2


-------------------------------
B1 — Frostwind Plains
-------------------------------

Theme:

- Snow Field
- Frozen Lake
- Ice Rocks
- Explorer Camp
- Snow Storm Area

ต้องมี:

- Normal Monsters
- NPC
- Quest
- Hidden Area
- Area Boss

Boss:

Frostfang

เมื่อ Boss ถูกกำจัด:

- เปิดทาง B2


-------------------------------
B2 — Crystal Caverns
-------------------------------

Theme:

- Large Cave
- Crystal
- Underground River
- Mining Area
- Multiple Paths

ต้องมี:

- Normal Monsters
- Elite Monsters
- Crystal Resource Placeholder
- Hidden Rooms
- Secret Door
- Area Boss

Boss:

Crystal Golem

เมื่อ Boss ถูกกำจัด:

- เปิดทาง B3


-------------------------------
B3 — Frostpeak
-------------------------------

Theme:

- Mountain
- Snow
- Blizzard
- Cliffs
- Ancient Fortress

ต้องมี:

- Strong Monsters
- Elite Monsters
- Hidden Area
- Ancient Structure
- Major Boss Arena

Major Boss:

Frost Warden

เมื่อ Boss ถูกกำจัด:

- Route B Complete
- เปิดทางเข้าสู่ City 2


==================================================
5. CITY 2
==================================================

ชื่อ:

Asteria City

City 2 ต้องทำหน้าที่เป็น:

- Second Major Hub
- Reward สำหรับผู้เล่นที่เดินทางมาถึง
- New Quest Hub
- New Equipment Hub
- Class Progression Hub
- Future World Expansion Hub

ต้องมี Placeholder สำหรับ:

- Shop
- Blacksmith
- Inn
- Storage
- Quest NPC
- Class Advancement NPC
- Guild NPC
- Teleport NPC
- Dungeon Entrance
- Future Region Entrances

City 2 ต้องสามารถขยายต่อไปยัง Region ใหม่ในอนาคตได้

ตัวอย่าง:

Asteria City
|
+-- Region C
|
+-- Region D
|
+-- Eclipse Frontier
|
+-- High Level Dungeon


==================================================
6. MAP SIZE
==================================================

ต้องการ Map ขนาดใหญ่และสามารถเดินสำรวจได้จริง

เบื้องต้น:

City:
80 x 80 ถึง 100 x 100 Tiles

Field Map:
100 x 100 ถึง 150 x 150 Tiles

Dungeon:
60 x 60 ถึง 100 x 100 Tiles

อย่างไรก็ตาม:

อย่าใช้ขนาด Map เป็นข้อจำกัดตายตัว

ระบบต้องสามารถรองรับ Map ที่ใหญ่ขึ้นได้ในอนาคต

ห้าม hard-code ระบบให้รองรับแค่ 6 Map

ต้องออกแบบ Map System ให้สามารถเพิ่ม:

Map 7
Map 8
Map 20
Map 50

ได้โดยไม่ต้องแก้ Core Engine


==================================================
7. MAP EXPLORATION
==================================================

ผู้เล่นต้องสามารถเดินสำรวจพื้นที่ของ Map ได้อย่างอิสระ

Map ต้องไม่เป็นเพียง:

Spawn
↓
ทางตรง
↓
Boss
↓
Exit

แต่ควรมี:

- Main Path
- Side Path
- Open Area
- Optional Area
- Hidden Area
- NPC Area
- Monster Area
- Resource Area
- Boss Area

ตัวอย่าง:

                Hidden Area
                     |
                     |
Main Spawn ---- Main Path -------- Boss
                     |
                     |
                 Side Area
                     |
                  NPC / Quest


==================================================
8. ISOMETRIC WORLD
==================================================

ใช้ Isometric Coordinate System

ต้องมี:

- Grid Coordinate
- World Coordinate
- Screen Coordinate
- Tile Coordinate
- Camera Coordinate

ต้องรองรับ:

- Isometric Tile Rendering
- Depth Sorting
- Y Sorting
- Object Layer
- Ground Layer
- Decoration Layer
- Collision Layer
- Trigger Layer
- NPC Layer
- Player Layer

ใช้:

canvasContext.imageSmoothingEnabled = false

เพื่อรักษาความคมของ Pixel Art


==================================================
9. MAP LAYERS
==================================================

ทุก Map ควรรองรับ Layer:

Layer 0:
Ground

Layer 1:
Ground Decoration

Layer 2:
Objects

Layer 3:
Collision Objects

Layer 4:
NPC / Monsters

Layer 5:
Player

Layer 6:
Effects

Layer 7:
UI

ระบบต้องสามารถเพิ่ม Layer ใหม่ได้ในอนาคต


==================================================
10. COLLISION SYSTEM
==================================================

ต้องมี Collision System

Collision สามารถใช้ข้อมูลจาก Tile Map

ตัวอย่าง:

0 = Walkable

1 = Blocked

2 = Water

3 = Cliff

4 = Building

5 = Special Collision


ตัวอย่าง:

collisionMap = [
  [0,0,0,1,1],
  [0,0,0,0,1],
  [0,2,2,0,0],
  [0,0,0,0,0]
]

ผู้เล่น:

- เดินบน 0
- ห้ามเดินบน 1
- 2 เป็นพื้นที่พิเศษ
- 3/4 เป็นพื้นที่ Blocked

ต้องตรวจ Collision ก่อน Movement ทุกครั้ง


==================================================
11. CAMERA
==================================================

ใช้ Follow Camera

Camera ติดตาม Player

แต่:

Camera ห้ามออกนอกขอบ Map

ต้องรองรับ:

- Camera Bounds
- Zoom
- Screen Resize
- Window Resize
- Different Resolution

ในอนาคตสามารถเพิ่ม:

- Camera Shake
- Cinematic Camera
- Boss Camera


==================================================
12. MAP TRANSITION
==================================================

แต่ละ Map ต้องมี Exit Zone

ตัวอย่าง:

A1
↓
Exit Zone
↓
Fade Out
↓
Load A2
↓
Spawn Player
↓
Fade In


ต้องมี Transition Manager

เช่น:

MapTransition.changeMap(
    "A2",
    "A2_Entrance"
)

ห้ามเขียนระบบ Transition แบบ hard-code เฉพาะ A1 → A2

ต้องรองรับ:

A1 → A2
A2 → A3
B1 → B2
B2 → B3
A3 → City2
B3 → City2

และสามารถเพิ่ม Map ใหม่ได้


==================================================
13. BOSS GATE SYSTEM
==================================================

นี่คือ Core Gameplay System

ผู้เล่นไม่สามารถผ่าน Map ต่อไปได้
จนกว่าจะกำจัด Boss ที่กำหนด

ตัวอย่าง:

A1
↓
Guardian of the Forest
↓
Boss Defeated
↓
A2 Unlocked

ต้องมีระบบ World State

ตัวอย่าง:

worldState.bosses.guardianForest.defeated = true

จากนั้น:

worldState.routes.routeA.map2Unlocked = true


Boss Gate ต้องไม่เป็นเพียง Door ธรรมดา

เมื่อ Boss ถูกกำจัด:

- เปิดทาง
- เปลี่ยน NPC Dialogue
- เปลี่ยน Environment
- เปิด Quest
- เปิดพื้นที่
- เปลี่ยน Monster บางชนิด
- เปิด Secret Content ได้


==================================================
14. BOSS ARENA
==================================================

ทุก Boss ต้องมี Boss Arena

Boss Arena ควรมี:

- Entrance
- Combat Area
- Boundary
- Boss Spawn
- Player Spawn
- Exit
- Boss HP Bar
- Boss Music Placeholder
- Boss Effects Placeholder

เมื่อเริ่ม Boss Fight:

ไม่ให้ผู้เล่นสามารถเดินออกจาก Arena
จนกว่า Boss จะถูกกำจัดหรือ Fight Reset


==================================================
15. SECRET SYSTEM
==================================================

ทุก Map ต้องมีอย่างน้อย 1 Hidden Element

ตัวอย่าง:

A1:
Secret NPC

A2:
Hidden Cave

A3:
Secret Room

B1:
Frozen Lake Secret

B2:
Hidden Crystal Room

B3:
Secret Mountain Area

Secret System ต้องรองรับ:

- Hidden NPC
- Hidden Item
- Hidden Door
- Hidden Area
- Hidden Quest
- Secret Dungeon
- Secret Boss
- Secret Class Requirement


==================================================
16. QUEST SYSTEM
==================================================

รองรับ:

Normal Quest
Hidden Quest
Secret Quest

Quest ต้องสามารถกำหนด:

- ID
- Name
- Description
- NPC
- Requirement
- Objective
- Reward
- Next Quest
- Hidden Flag

ตัวอย่าง:

questId:
forest_001

type:
hidden

requirements:
boss.guardianForest == defeated


==================================================
17. WORLD TRIGGER SYSTEM
==================================================

ต้องมีระบบ Trigger

Trigger สามารถทำงานเมื่อ:

- Player เดินเข้า Area
- Boss ถูกฆ่า
- Item ถูกเก็บ
- NPC ถูกคุย
- Quest สำเร็จ
- เวลาเปลี่ยน
- World Event เกิด

ตัวอย่าง:

onTrigger("forest_secret_area") {
    unlockQuest("hidden_forest_001");
}


==================================================
18. WORLD STATE
==================================================

สร้างระบบ Global World State

ตัวอย่าง:

WorldState:

- Current Map
- Boss Status
- Quest Status
- Route Status
- Dungeon Status
- Secret Status
- Eclipse Event Status

ตัวอย่าง:

worldState = {
    bosses: {},
    quests: {},
    routes: {},
    dungeons: {},
    secrets: {},
    events: {}
}

ต้องออกแบบให้สามารถ Save/Load ได้ในอนาคต


==================================================
19. WORLD DATA
==================================================

อย่า hard-code ข้อมูล Map ทั้งหมดใน Renderer

แยก:

WORLD ENGINE

ออกจาก:

WORLD DATA

ตัวอย่าง:

maps/
    lumina-village.json
    route-a1.json
    route-a2.json
    route-a3.json
    route-b1.json
    route-b2.json
    route-b3.json
    asteria-city.json


Map JSON สามารถเก็บ:

- Width
- Height
- Tiles
- Collision
- Spawn
- Exits
- NPC
- Monsters
- Boss
- Triggers
- Secrets


ตัวอย่าง:

{
    "id": "route_a1",
    "name": "Whispering Forest",
    "width": 120,
    "height": 120,
    "spawn": {},
    "exits": [],
    "boss": {},
    "triggers": [],
    "secrets": []
}


==================================================
20. PERFORMANCE
==================================================

แม้ Map จะใหญ่:

อย่าวาดทุก Object ทุก Frame หากไม่จำเป็น

ใช้:

- Camera Culling
- Visible Tile Rendering
- Object Culling

Render เฉพาะ Object ที่อยู่ใกล้หรืออยู่ใน Viewport

เป้าหมาย:

60 FPS บน PC Browser ทั่วไปใน Prototype


==================================================
21. MULTIPLAYER READY
==================================================

World System ต้องออกแบบให้รองรับ Multiplayer ในอนาคต

แต่ V1 ยังไม่ต้องสร้าง Network จริง

อย่าให้ World System ผูกติดกับ Single Player โดยตรง

แยก:

Local Player

ออกจาก:

World State

และ:

Server State

ในอนาคต Server จะเป็นผู้ควบคุม:

- Player Position
- Boss State
- World State
- Quest State
- Map State


==================================================
22. PROJECT STRUCTURE
==================================================

(โครงสร้างที่แนะนำ: client/core, world, rendering, collision, entities, systems, data/maps, assets/...)


==================================================
23. DEVELOPMENT ORDER
==================================================

ห้ามสร้าง World ทั้งหมดพร้อมกัน ให้ทำตามลำดับ:

PHASE 1 World Engine — Canvas, Isometric Renderer, Camera, Tile Map, Player, Movement, Collision
PHASE 2 Map System — Map JSON, Map Loader, Map Manager, Spawn Point, Exit Point, Map Transition
PHASE 3 City 1 — Lumina Village, Buildings, NPC, Collision, Route A Entrance, Route B Entrance
PHASE 4 Route A — A1, A2, A3, Boss Arena, Boss Gate, Route Completion
PHASE 5 Route B — B1, B2, B3, Boss Arena, Boss Gate, Route Completion
PHASE 6 City 2 — Asteria City, NPC, Shops Placeholder, Class Progression Placeholder, Future Region Entrance
PHASE 7 Secret System — Hidden Areas, Hidden NPC, Hidden Quest, Secret Door, Secret Dungeon Placeholder
PHASE 8 World State — Boss State, Route State, Quest State, Secret State, Save/Load Preparation
PHASE 9 Optimization — Culling, Performance Optimization, Asset Loading, Memory Management


==================================================
24. FIRST PLAYABLE TARGET
==================================================

Vertical Slice ก่อน:

Lumina Village → A1 Whispering Forest → Guardian of the Forest → A2 Ancient Valley

ผู้เล่นต้องสามารถ:
1. เข้าเกม 2. Spawn ที่ Lumina Village 3. เดินได้ทั่วพื้นที่ที่กำหนด
4. เดินชนสิ่งกีดขวางไม่ได้ 5. เดินไปทาง Route A 6. โหลด A1 7. เดินสำรวจ A1
8. พบ Monster 9. พบ Boss 10. ต่อสู้กับ Boss 11. ฆ่า Boss 12. World State เปลี่ยน
13. Exit ถูกปลดล็อก 14. เดินเข้า A2 15. Spawn ในตำแหน่งของ A2 16. เดินสำรวจ A2

ถ้าขั้นตอนนี้ทำงานได้ จึงค่อยสร้าง Map อื่น


==================================================
25. IMPORTANT DESIGN RULES
==================================================

1. อย่าสร้าง Map เป็นทางเดินเส้นตรง
2. ทุก Map ต้องมีพื้นที่ให้สำรวจ
3. ทุก Map ต้องมี Landmark ที่ผู้เล่นจำได้
4. ทุก Map ต้องมีอย่างน้อยหนึ่ง Hidden Element
5. Boss ต้องมีความหมายต่อ World Progression
6. Boss ไม่ควรเป็นเพียง Enemy ตัวใหญ่
7. Map System ต้องเพิ่ม Map ใหม่ได้ง่าย
8. ห้าม hard-code World ให้รองรับเฉพาะ 8 Map
9. ห้ามเขียนระบบ Multiplayer ใน Phase แรก
10. ห้ามใช้ Asset จากเกม อนิเมะ หรือ IP อื่น
11. ถ้ายังไม่มี Pixel Art Asset ให้ใช้ Placeholder
12. Placeholder ต้องถูกออกแบบให้เปลี่ยนเป็น Asset จริงได้ง่าย
13. อย่าสร้างระบบที่ไม่ได้อยู่ใน Scope โดยไม่จำเป็น
14. ถ้าต้องตัดสินใจเรื่องสำคัญที่ยังไม่ได้กำหนด ให้ถามก่อน
15. อย่าสร้างโค้ดทั้งหมดในครั้งเดียว
16. ทุก Phase ต้องสามารถ Run และ Test ได้
17. เมื่อแก้ไฟล์ ให้ระบุว่าไฟล์ใดถูกสร้างหรือแก้ไข
18. เมื่อให้โค้ด ให้บอกตำแหน่งไฟล์อย่างชัดเจน
19. ห้ามทำระบบที่ผูกกับขนาด Map แบบตายตัว
20. Architecture ต้องรองรับการขยายไปสู่ MMORPG
```

(หัวข้อ 22–24 ย่อรูปแบบให้สั้นลง เนื้อหาครบตามต้นฉบับ)
