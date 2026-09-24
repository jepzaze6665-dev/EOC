# ECLIPSE ONLINE — notes for Claude

Original-IP 2D pixel-art isometric MMORPG. HTML5 Canvas, vanilla ES modules, no build step, Node ≥ 18.
Solo developer, beginner, Thai-speaking.

**Read `docs/ROADMAP.md` first**: it has the current status, the decisions already made (do not
re-ask them) and the remaining milestones. The original briefs are in `docs/briefs/`.

## Working rules
- Answer in Thai. Explain the architecture before coding. Say which files were created or changed, how to run, how to test.
- Build only the current milestone; never skip ahead. Ask before big decisions the brief does not settle.
- Archive, don't delete: superseded code goes to `legacy/`.
- **FPS comes first.** Do not add animated map effects (sun rays, leaves, fireflies, sway, sparkles) without asking.
- Verify for real: `npm test`, plus headless Chrome screenshots via the DevTools protocol (the Chrome extension is not available).
- UI labels in English (pixel font has no Thai glyphs); dialogue and explanations in Thai.

## Commands
| Command | What it does |
|---|---|
| `npm start` | dev server at http://localhost:5173 |
| `npm test` | headless engine tests (`tests/world-engine.test.mjs`) |
| `npm run sheets` | number the pieces of the tile sheets → `tools/out/sheets/*-index.png` |
| `npm run assets` | cut sheets into `assets/tiles|objects|parts/*.png` + `client/data/asset-registry.json` |
| `npm run isomaps` | build isometric maps from `tools/iso-map-src/*.mjs` → `client/data/maps/*.json` |
| `npm run maps` | build the painted top-down maps (village, old forest) from `tools/map-src/` |

`tools/out/` is generated (previews) and not committed; re-run the commands above to recreate it.

## Layout
- `client/core` — game loop, input, projection (top-down + iso, terrain height)
- `client/world` — maps (`iso-map.js`, `game-map.js`, `map-base.js`), chunks, loader, manager, transition
- `client/rendering` — renderer ('pixel' / 'hd' modes), iso map renderer, terrain effects, asset store, sprites
- `client/collision` — collision grid (codes 0 walk, 1 blocked, 2 water, 3 cliff, 4 building, 5 special)
- `client/systems`, `client/entities`, `client/ui`, `client/scenes` — RPG, combat, quests, HUD
- `client/data/iso-config.js` — tile size, zoom levels, level height, chunk size
- `tools/asset-src/` — which sheet piece becomes which asset; `tools/iso-map-src/` — map sources
- `assets/maps/map1/` — the AI tile sheets (no file extension, painted checkerboard background)
- `docs/Map`, `docs/UI` — concept art (Master Maps, UI mockups; PNGs without extension)
