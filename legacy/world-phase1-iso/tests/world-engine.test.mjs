// World Engine (World Scope Phase 1) - headless tests.
// Run with:  npm test
//
// Checks the parts of the engine that do not need a browser:
//   - every map builds, and its collision grid matches the tile + prop data
//   - the player spawn is valid and every NPC / resource / exit can be reached on foot
//   - collision codes, map boundary and wall sliding behave as specified
//   - the camera never shows anything outside the map
//   - visible-tile culling never skips a tile that is actually on screen

import { createMap, mapIds } from '../client/data/maps.js';
import { CollisionSystem, COLLISION } from '../client/collision/collision-system.js';
import { Camera } from '../client/rendering/camera.js';
import { IsoRenderer } from '../client/rendering/iso-renderer.js';
import { worldToScreen, TILE_W, TILE_H } from '../client/core/iso.js';
import { PROP_DEFS } from '../client/data/props.js';
import { TILE_DEFS, DECOR_DEFS } from '../client/data/tiles.js';

let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

// Tiles reachable on foot from the spawn (4-way flood fill over walkable tiles).
function reachableFrom(map, start) {
  const seen = new Uint8Array(map.width * map.height);
  const queue = [[Math.floor(start.tx), Math.floor(start.ty)]];
  seen[queue[0][1] * map.width + queue[0][0]] = 1;
  while (queue.length) {
    const [x, y] = queue.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!map.inBounds(nx, ny)) continue;
      const index = ny * map.width + nx;
      if (seen[index] || map.collision.codeAt(nx, ny) !== COLLISION.WALKABLE) continue;
      seen[index] = 1;
      queue.push([nx, ny]);
    }
  }
  return seen;
}

// Is there a reachable tile whose center is within `range` of (tx, ty)?
function canReachNear(map, seen, tx, ty, range) {
  for (let y = Math.floor(ty - range - 1); y <= Math.ceil(ty + range + 1); y++) {
    for (let x = Math.floor(tx - range - 1); x <= Math.ceil(tx + range + 1); x++) {
      if (!map.inBounds(x, y) || !seen[y * map.width + x]) continue;
      if (Math.hypot(x + 0.5 - tx, y + 0.5 - ty) <= range) return true;
    }
  }
  return false;
}

// ------------------------------------------------------------------ data

section('Data definitions');
for (const [id, def] of Object.entries(TILE_DEFS)) {
  check(`tile ${id} has a collision code`, Number.isInteger(def.collision));
}
for (const [id, def] of Object.entries(PROP_DEFS)) {
  check(`prop ${id} has a footprint`, def.w >= 1 && def.d >= 1 && def.height > 0);
}
check('decorations defined', Object.keys(DECOR_DEFS).length > 0);

// ------------------------------------------------------------------ maps

for (const id of mapIds()) {
  section(`Map: ${id}`);
  const t0 = performance.now();
  const map = createMap(id);
  const buildMs = performance.now() - t0;

  check('size comes from data', map.width > 0 && map.height > 0 && map.ground.length === map.height);
  check('every row is full width', map.ground.every((row) => row.length === map.width));
  check('every ground tile is defined', map.ground.every((row) => row.every((t) => TILE_DEFS[t])));
  check('every prop type is defined', map.props.every((p) => PROP_DEFS[p.type]));

  // solid props must show up in the collision grid
  let missing = 0;
  for (const prop of map.props) {
    const def = PROP_DEFS[prop.type];
    if (!def.solid) continue;
    for (let y = prop.ty; y < prop.ty + def.d; y++) {
      for (let x = prop.tx; x < prop.tx + def.w; x++) {
        if (map.inBounds(x, y) && map.collision.codeAt(x, y) === COLLISION.WALKABLE) missing++;
      }
    }
  }
  check('solid props are written into collision', missing === 0, `${missing} tiles`);

  check('spawn is standable', map.canStand(map.spawn.tx, map.spawn.ty));
  const seen = reachableFrom(map, map.spawn);
  const reachable = seen.reduce((sum, v) => sum + v, 0);

  for (const npc of map.npcs) {
    const isPerson = !npc.kind || npc.kind === 'person';
    if (isPerson) check(`NPC ${npc.id} stands on a walkable spot`, map.canStand(npc.tx, npc.ty), `(${npc.tx}, ${npc.ty})`);
    check(`NPC ${npc.id} can be reached`, canReachNear(map, seen, npc.tx, npc.ty, 1.7), `(${npc.tx}, ${npc.ty})`);
  }
  for (const node of map.gatherNodes) {
    const def = PROP_DEFS[node.prop];
    check(`resource ${node.id} can be reached`, canReachNear(map, seen, node.tx + def.w / 2, node.ty + def.d / 2, 1.7), `(${node.tx}, ${node.ty})`);
  }
  for (const portal of map.portals) {
    let touches = false;
    for (let y = Math.floor(portal.ty); y < portal.ty + portal.d; y++) {
      for (let x = Math.floor(portal.tx); x < portal.tx + portal.w; x++) {
        if (map.inBounds(x, y) && seen[y * map.width + x]) touches = true;
      }
    }
    check(`exit to ${portal.to} can be reached`, touches);
    const target = createMap(portal.to);
    check(`exit to ${portal.to} lands on a standable spot`, target.canStand(portal.spawn.tx, portal.spawn.ty));
  }
  for (const spawn of map.monsterSpawns) {
    check(`monster ${spawn.id} spawns on a walkable spot`, map.canStand(spawn.tx, spawn.ty));
  }

  const walkable = map.collision.stats()[COLLISION.WALKABLE] || 0;
  console.log(`  ${map.width}x${map.height}, ${map.props.length} objects, built in ${buildMs.toFixed(0)} ms`);
  console.log(`  walkable ${walkable} tiles, reachable from spawn ${reachable} (${Math.round((reachable / walkable) * 100)}%)`);
}

// ------------------------------------------------------------------ Lumina Village specifics

section('Lumina Village layout');
{
  const map = createMap('lumina-village');
  check('size is 100 x 100', map.width === 100 && map.height === 100);
  const seen = reachableFrom(map, map.spawn);
  const reachable = seen.reduce((sum, v) => sum + v, 0);
  check('large explorable area (5000+ tiles reachable)', reachable >= 5000, `${reachable}`);

  const codes = map.collision.stats();
  for (const [name, code] of Object.entries(COLLISION)) {
    check(`uses collision code ${code} (${name})`, (codes[code] || 0) > 0);
  }

  // Route B: the bridge can be walked onto, the closed barrier stops you past it.
  check('Route B bridge reachable', seen[8 * map.width + 93] === 1);
  check('Route B closed by special collision', map.collision.codeAt(93, 5) === COLLISION.SPECIAL);
  check('nothing reachable past the Route B barrier', seen[3 * map.width + 93] === 0);

  // every building footprint is collision code 4
  const building = map.props.find((p) => p.type === 'house_guild');
  check('buildings use collision code 4', map.collision.codeAt(building.tx + 1, building.ty + 1) === COLLISION.BUILDING);
  check('river uses collision code 2', map.collision.codeAt(6, 30) === COLLISION.WATER);
  check('rim uses collision code 3', map.collision.codeAt(1, 50) === COLLISION.CLIFF);
}

// ------------------------------------------------------------------ collision system

section('Collision system');
{
  const c = new CollisionSystem(5, 4);
  const grid = [
    [0, 0, 0, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 2, 2, 0, 0],
    [0, 0, 0, 0, 0]
  ];
  grid.forEach((row, y) => row.forEach((code, x) => c.setCode(x, y, code)));

  check('0 is walkable', c.isWalkable(0.5, 0.5));
  check('1 is blocked', c.isBlocked(3.5, 0.5));
  check('2 (water) blocks walking', c.isBlocked(1.5, 2.5));
  check('2 (water) lets projectiles pass', !c.blocksProjectile(1.5, 2.5));
  check('outside the map is blocked (boundary)', c.isBlocked(-0.1, 1) && c.isBlocked(5.1, 1) && c.isBlocked(1, 4.2));
  check('canStand checks the body, not just the center', !c.canStand(2.9, 0.5, 0.28));

  // walking diagonally into the wall at x=3 should slide down the Y axis, not stop
  const moved = c.resolveMove(2.5, 1.5, 0.4, 0.2, 0.28);
  check('diagonal move into a wall slides along it', moved.blockedX === false || moved.ty > 1.5);
  const into = c.resolveMove(2.5, 0.5, 0.5, 0, 0.28);
  check('moving straight into a wall is stopped', into.blockedX && into.tx === 2.5);

  // walk every direction for a long time across the real village: never inside a blocked tile
  const map = createMap('lumina-village');
  let pos = { tx: map.spawn.tx, ty: map.spawn.ty };
  let violations = 0;
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
  for (let step = 0; step < 40000; step++) {
    const [dx, dy] = dirs[Math.floor(step / 250) % dirs.length];
    const next = map.collision.resolveMove(pos.tx, pos.ty, dx * 0.06, dy * 0.06, 0.26);
    pos = { tx: next.tx, ty: next.ty };
    if (!map.canStand(pos.tx, pos.ty, 0.26)) violations++;
  }
  check('40,000 movement steps never enter a blocked tile', violations === 0, `${violations}`);
}

// ------------------------------------------------------------------ camera

section('Camera');
{
  const map = createMap('lumina-village');
  const camera = new Camera();
  const bounds = {
    minX: worldToScreen(0, map.height).x,
    maxX: worldToScreen(map.width, 0).x,
    minY: worldToScreen(0, 0).y,
    maxY: worldToScreen(map.width, map.height).y
  };
  camera.setBounds(bounds);

  let outside = 0;
  for (const [viewW, viewH] of [[640, 360], [480, 270], [960, 540], [320, 700]]) {
    for (const [tx, ty] of [[0, 0], [100, 0], [0, 100], [100, 100], [50, 50], [3, 97]]) {
      const target = worldToScreen(tx, ty);
      camera.snapTo(target.x, target.y);
      camera.clampToBounds(viewW, viewH);
      const view = camera.viewRect(viewW, viewH);
      if (view.left < bounds.minX - 0.01 || view.right > bounds.maxX + 0.01) outside++;
      if (view.top < bounds.minY - 0.01 || view.bottom > bounds.maxY + 0.01) outside++;
    }
  }
  check('camera view never leaves the map bounds', outside === 0, `${outside}`);

  camera.snapTo(0, 0);
  camera.clampToBounds(100000, 100000);
  check('map smaller than the screen gets centered', camera.x === (bounds.minX + bounds.maxX) / 2);

  camera.resetZoom();
  for (let i = 0; i < 20; i++) camera.zoomBy(1);
  const maxZoom = camera.zoom;
  for (let i = 0; i < 40; i++) camera.zoomBy(-1);
  check('zoom is clamped', maxZoom <= 3 && camera.zoom >= -2);
}

// ------------------------------------------------------------------ culling

section('Visible tile culling');
{
  const map = createMap('lumina-village');
  const iso = new IsoRenderer();
  const camera = new Camera();
  let missed = 0;
  let totalVisible = 0;
  let totalScanned = 0;

  for (const [viewW, viewH] of [[640, 360], [960, 540], [427, 240]]) {
    for (let i = 0; i < 30; i++) {
      const target = worldToScreen((i * 37) % 100, (i * 53) % 100);
      camera.snapTo(target.x, target.y);
      const rect = camera.viewRect(viewW, viewH);
      const view = { left: rect.left - TILE_W, right: rect.right + TILE_W, top: rect.top - TILE_H, bottom: rect.bottom + TILE_H };
      const range = iso.visibleTileRange(map, view);
      totalScanned += (range.x1 - range.x0 + 1) * (range.y1 - range.y0 + 1);

      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const p = worldToScreen(x + 0.5, y + 0.5);
          const onScreen = p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom;
          if (!onScreen) continue;
          totalVisible++;
          if (x < range.x0 || x > range.x1 || y < range.y0 || y > range.y1) missed++;
        }
      }
    }
  }
  check('no on-screen tile is culled', missed === 0, `${missed}`);
  console.log(`  avg tiles on screen ${Math.round(totalVisible / 90)}, avg tiles scanned ${Math.round(totalScanned / 90)} of ${map.width * map.height}`);

  // object index returns the same objects as a brute-force search
  const found = map.objectIndex.query(40, 40, 60, 60);
  const brute = map.props.filter((p) => {
    const def = PROP_DEFS[p.type];
    return p.tx + def.w - 1 >= 40 && p.tx <= 60 && p.ty + def.d - 1 >= 40 && p.ty <= 60;
  });
  // (the index works in 8x8 cells, so it may return a few extra nearby objects - never fewer)
  const missing = brute.filter((p) => !found.some((entry) => entry.prop === p)).length;
  check('object index finds every object in an area', missing === 0, `${missing} missing`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
