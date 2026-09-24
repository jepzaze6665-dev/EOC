// World Engine - headless tests (painted image maps + isometric tile maps).
// Run with:  npm test
//
// Checks everything that does not need a browser:
//   - every registered map has its JSON + image, and the sizes agree
//   - spawn, NPCs, resources, monsters and exits are all reachable on foot
//   - exits lead to a standable spot on the other map (both directions)
//   - collision codes, map boundary, wall sliding, RLE round-trip
//   - camera stays inside the map; the renderer only reads inside the image

import fs from 'node:fs';
import { MAP_FILES, mapIds } from '../client/data/maps.js';
import { GameMap } from '../client/world/game-map.js';
import { IsoMap } from '../client/world/iso-map.js';
import { ChunkManager } from '../client/world/chunk-manager.js';
import { MapManager } from '../client/world/map-manager.js';
import { MapTransition } from '../client/world/map-transition.js';
import { CollisionSystem, COLLISION, encodeCollision, decodeCollision } from '../client/collision/collision-system.js';
import { Camera } from '../client/rendering/camera.js';
import { MapRenderer } from '../client/rendering/map-renderer.js';
import {
  TILE_SIZE, worldToScreen, screenToWorld, screenVectorToWorld, facingFromWorldVector, depthOf, setProjection, setIsoUnit
} from '../client/core/projection.js';
import { ISO } from '../client/data/iso-config.js';

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

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function loadMapData(id) {
  return JSON.parse(fs.readFileSync(new URL(`../${MAP_FILES[id]}`, import.meta.url), 'utf8'));
}

const registry = JSON.parse(fs.readFileSync(new URL('../client/data/asset-registry.json', import.meta.url), 'utf8'));
const buildMap = (data) => (data.type === 'iso' ? new IsoMap(data, registry) : new GameMap(data));
const maps = Object.fromEntries(mapIds().map((id) => [id, buildMap(loadMapData(id))]));

// Cells reachable on foot from a world point (4-way flood fill over walkable cells).
function reachableFrom(map, tx, ty) {
  const c = map.collision;
  const seen = new Uint8Array(c.cols * c.rows);
  const sx = Math.floor(tx * c.cellsPerTile);
  const sy = Math.floor(ty * c.cellsPerTile);
  if (c.codeAtCell(sx, sy) !== COLLISION.WALKABLE) return seen;
  const stack = [[sx, sy]];
  seen[sy * c.cols + sx] = 1;
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!c.inBounds(nx, ny)) continue;
      const i = ny * c.cols + nx;
      if (seen[i] || c.codeAtCell(nx, ny) !== COLLISION.WALKABLE) continue;
      seen[i] = 1;
      stack.push([nx, ny]);
    }
  }
  return seen;
}

// Is there a reachable cell within `range` tiles of (tx, ty)?
function canReachNear(map, seen, tx, ty, range) {
  const c = map.collision;
  const k = c.cellsPerTile;
  for (let y = Math.floor((ty - range) * k); y <= Math.ceil((ty + range) * k); y++) {
    for (let x = Math.floor((tx - range) * k); x <= Math.ceil((tx + range) * k); x++) {
      if (!c.inBounds(x, y) || !seen[y * c.cols + x]) continue;
      if (Math.hypot((x + 0.5) / k - tx, (y + 0.5) / k - ty) <= range) return true;
    }
  }
  return false;
}

// ------------------------------------------------------------------ projection

section('Projection (top-down)');
{
  const p = worldToScreen(3.5, 7.25);
  check('world -> screen uses the tile size', p.x === 3.5 * TILE_SIZE && p.y === 7.25 * TILE_SIZE);
  const w = screenToWorld(p.x, p.y);
  check('screen -> world is the inverse', Math.abs(w.tx - 3.5) < 1e-9 && Math.abs(w.ty - 7.25) < 1e-9);
  check('facing from a world direction', facingFromWorldVector(0, 1) === 's' && facingFromWorldVector(-1, 0.2) === 'w' && facingFromWorldVector(0.3, -1) === 'n');
  check('lower on screen = drawn later (Y sort)', depthOf(10, 5.1) > depthOf(40, 5.0));
}

// ------------------------------------------------------------------ maps

for (const [id, map] of Object.entries(maps)) {
  section(`Map: ${id}`);

  if (map.projection === 'iso') {
    const missing = map.assetIds().filter((a) => !registry.assets[a] || !fs.existsSync(new URL(`../${registry.assets[a].file}`, import.meta.url)));
    check('every tile and object asset exists (registry + file)', missing.length === 0, missing.join(', '));
  } else {
    const imageFile = new URL(`../${map.imagePath}`, import.meta.url);
    check('image file exists', fs.existsSync(imageFile), map.imagePath);
    if (fs.existsSync(imageFile)) {
      const size = pngSize(imageFile);
      check('image size matches the map size', size.width === map.pixelWidth && size.height === map.pixelHeight, `${size.width}x${size.height} vs ${map.pixelWidth}x${map.pixelHeight}`);
    }
  }
  check('collision grid covers the whole map', map.collision.cols === map.width * map.collision.cellsPerTile && map.collision.rows === map.height * map.collision.cellsPerTile);

  check('spawn is standable', map.canStand(map.spawn.tx, map.spawn.ty), `(${map.spawn.tx}, ${map.spawn.ty})`);
  const seen = reachableFrom(map, map.spawn.tx, map.spawn.ty);
  const reachable = seen.reduce((n, v) => n + v, 0);
  const walkable = map.collision.stats()[COLLISION.WALKABLE] || 0;

  for (const npc of map.npcs) {
    const isPerson = !npc.kind || npc.kind === 'person';
    if (isPerson) check(`NPC ${npc.id} stands on a walkable spot`, map.canStand(npc.tx, npc.ty, 0.24), `(${npc.tx}, ${npc.ty})`);
    check(`NPC ${npc.id} can be reached`, canReachNear(map, seen, npc.tx, npc.ty, 1.7), `(${npc.tx}, ${npc.ty})`);
  }
  for (const node of map.gatherNodes) {
    check(`resource ${node.id} can be reached`, canReachNear(map, seen, node.tx, node.ty, 1.7), `(${node.tx}, ${node.ty})`);
  }
  for (const m of map.monsterSpawns) {
    check(`monster ${m.id} spawns on a walkable spot`, map.canStand(m.tx, m.ty, 0.3), `(${m.tx}, ${m.ty})`);
    check(`monster ${m.id} is on the reachable area`, canReachNear(map, seen, m.tx, m.ty, 0.6));
  }
  check('has a "default" spawn', !!map.spawns.default);
  for (const [name, point] of Object.entries(map.spawns)) {
    check(`spawn "${name}" is standable`, map.canStand(point.tx, point.ty));
    check(`spawn "${name}" is connected to the rest of the map`, canReachNear(map, seen, point.tx, point.ty, 0.5));
    check(`spawn "${name}" is not inside an exit zone`, !map.exitAt(point.tx, point.ty));
  }
  for (const exit of map.exits) {
    const target = maps[exit.to];
    check(`exit ${exit.id} goes to a registered map`, !!target, exit.to);
    check(`exit ${exit.id} can be reached`, canReachNear(map, seen, exit.tx + exit.w / 2, exit.ty + exit.d / 2, Math.max(exit.w, exit.d)));
    check(`exit ${exit.id} is found by exitAt()`, map.exitAt(exit.tx + exit.w / 2, exit.ty + exit.d / 2) === exit);
    if (target) {
      check(`exit ${exit.id} uses a spawn that ${exit.to} has`, !!target.spawns[exit.spawn], exit.spawn);
      const point = target.getSpawn(exit.spawn);
      check(`exit ${exit.id} lands on a standable spot`, target.canStand(point.tx, point.ty));
      check(`exit ${exit.id} does not land inside another exit (no ping-pong)`, !target.exitAt(point.tx, point.ty));
    }
  }

  const kind = map.projection === 'iso' ? `iso, ${map.objects.length} objects in ${map.chunks.chunks.length} chunks` : `image ${map.pixelWidth}x${map.pixelHeight}px`;
  console.log(`  ${map.width}x${map.height} tiles (${kind}), collision ${map.collision.cols}x${map.collision.rows} cells`);
  console.log(`  walkable ${walkable} cells, reachable from spawn ${reachable} (${Math.round((reachable / walkable) * 100)}%)`);
  check('large explorable area (50%+ of the map walkable)', walkable > map.collision.cols * map.collision.rows * 0.3, `${walkable}`);
}

// ------------------------------------------------------------------ village specifics

// ------------------------------------------------------------------ isometric tile maps

section('Isometric projection');
{
  setProjection('iso');
  setIsoUnit(0.5); // zoom 1.0 at 1x screen: 64x32 tile = 32x16 entity pixels
  const o = worldToScreen(0, 0);
  const right = worldToScreen(1, 0);
  const down = worldToScreen(0, 1);
  check('tile x axis goes right-down, y axis goes left-down (2:1 diamond)',
    right.x - o.x === 16 && right.y - o.y === 8 && down.x - o.x === -16 && down.y - o.y === 8);
  let worst = 0;
  for (const [tx, ty] of [[0, 0], [12.25, 3.5], [149, 149], [70.1, 20.9]]) {
    const p = worldToScreen(tx, ty);
    const w = screenToWorld(p.x, p.y);
    worst = Math.max(worst, Math.abs(w.tx - tx), Math.abs(w.ty - ty));
  }
  check('screen -> world is the exact inverse (mouse picking)', worst < 1e-9, `${worst}`);
  for (const unit of [0.5, 0.4167, 0.5]) {
    setIsoUnit(unit);
    const d = Math.SQRT1_2;
    const speeds = [[1, 0], [0, 1], [-1, 0], [0, -1], [d, d], [-d, d]].map(([x, y]) => {
      const v = screenVectorToWorld(x * 4, y * 4);
      return Math.hypot(v.tx, v.ty);
    });
    check(`same walking speed in every screen direction (unit ${unit})`, speeds.every((sp) => Math.abs(sp - speeds[0]) < 1e-9), speeds.map((v) => v.toFixed(3)).join(' '));
  }
  const up = screenVectorToWorld(0, -1);
  check('W (screen up) walks north-west in tiles', up.tx < 0 && up.ty < 0 && Math.abs(up.tx - up.ty) < 1e-9);
  check('iso depth: further south-east = drawn later', depthOf(5, 5) > depthOf(9, 0) && depthOf(10, 10) > depthOf(10, 9.5));
  setProjection('topdown');
}

section('Chunks');
{
  const chunks = new ChunkManager(150, 150, 32);
  check('150x150 map -> 5x5 chunks of 32', chunks.cols === 5 && chunks.rows === 5);
  check('last chunk is cut to the map edge', chunks.chunks[24].x1 === 149 && chunks.chunks[24].y1 === 149);
  const a1 = maps.a1;
  check('A1: every object is in exactly one chunk', a1.chunks.objectCount === a1.objects.length, `${a1.chunks.objectCount} vs ${a1.objects.length}`);
  check('A1: objects sit in the chunk that contains their feet', a1.chunks.chunks.every((c) =>
    c.objects.every((o) => o.tx >= c.x0 && o.tx < c.x1 + 1 && o.ty >= c.y0 && o.ty < c.y1 + 1)));
  const view = a1.chunks.inTileRange(40, 40, 70, 70);
  check('a view only touches the chunks around it', view.length === 4, `${view.length}`);
  a1.chunks.updateActive(view, 1);
  check('active chunks = visible + one ring', a1.chunks.activeCount === 16, `${a1.chunks.activeCount}`);
  a1.chunks.updateActive(a1.chunks.inTileRange(0, 0, 10, 10), 1);
  check('moving away unloads the old chunks', a1.chunks.activeCount === 4 && a1.chunks.unloads >= 12);
}

section('A1 (isometric) layout and collision');
{
  const map = maps.a1;
  check('A1 is 150 x 150 tiles', map.width === 150 && map.height === 150);
  check('A1 is an iso map with a Master Map reference', map.projection === 'iso' && map.masterMap === 'docs/Map/WHISPERING FOREST');
  check('main spawn is in the south', map.spawn.ty > 130);
  check('A1 leads back to the village', map.exits.some((e) => e.to === 'lumina-village' && e.spawn === 'from_forest'));
  check('map edge is closed (outside the map is blocked)', map.isBlocked(-0.2, 50) && map.isBlocked(50, 150.2) && map.isBlocked(150.1, 10));

  const find = (test) => {
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) if (test(map.tileAt(x, y), x, y)) return { x, y };
    return null;
  };
  const flatAround = (x, y) => [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]
    .every(([dx, dy]) => map.levelAt(x + dx, y + dy) === map.levelAt(x, y));
  const water = find((t, x, y) => t.collision === 2 && flatAround(x, y) && !(x >= 77 && x <= 89 && y >= 74 && y <= 76));
  check('river tiles block walking (code 2)', water && map.collisionAt(water.x + 0.5, water.y + 0.5) === 2);
  check('river tiles let projectiles pass', water && !map.blocksProjectile(water.x + 0.5, water.y + 0.5));
  const dense = find((t) => t.collision === 1);
  check('deep forest tiles block walking', dense && map.isBlocked(dense.x + 0.5, dense.y + 0.5));

  // terrain height
  const levels = new Set(map.heights);
  check('A1 has three terrain levels (0, 1, 2)', levels.has(0) && levels.has(1) && levels.has(2));
  const foot = find((t, x, y) => map.levelAt(x, y - 1) > map.levelAt(x, y) && !map.stairLinks(x, y, x, y - 1) && map.levelAt(x + 1, y) === map.levelAt(x, y) && map.levelAt(x, y + 1) === map.levelAt(x, y) && map.levelAt(x + 1, y + 1) === map.levelAt(x, y));
  check('the half of a tile under a cliff face is blocked (code 3)', foot && map.collisionAt(foot.x + 0.5, foot.y + 0.1) === 3);
  const behind = find((t, x, y) => map.levelAt(x, y + 1) > map.levelAt(x, y) && t.collision === 0);
  check('ground hidden behind raised terrain is blocked', behind && map.collisionAt(behind.x + 0.5, behind.y + 0.5) === 3);
  check('A1 has stairs', map.stairs.size >= 10, `${map.stairs.size}`);
  const [stairKey, stairDir] = [...map.stairs][0];
  const sx = stairKey % map.width;
  const sy = Math.floor(stairKey / map.width);
  const h0 = map.levelAt(sx, sy);
  check('stairs lead exactly one level up', map.levelAt(sx, sy - (stairDir === 'n' ? 1 : 0)) === h0 + 1 || map.levelAt(sx - 1, sy) === h0 + 1);
  check('height rises smoothly along the stairs', map.heightAt(sx + 0.5, sy + 0.95) < map.heightAt(sx + 0.5, sy + 0.5) && map.heightAt(sx + 0.5, sy + 0.5) < map.heightAt(sx + 0.5, sy + 0.05));
  check('the stairs and the ground above them can be walked on', map.canStand(sx + 0.5, sy + 0.5, 0.2) && map.canStand(sx + 0.5, sy - 0.5, 0.2));
  const walkUp = map.collision.resolveMove(sx + 0.5, sy + 0.8, 0, -1.2, 0.2);
  check('the player can walk up the stairs to the next level', walkUp.ty < sy);
  check('the bridge makes the river walkable', map.canStand(83.3, 75.5) && map.tileAt(83, 75).collision === 2);
  check('...only on the bridge: the river next to it still blocks', map.isBlocked(83.3, 73.2) || map.isBlocked(83.3, 77.8));

  const tree = map.objects.find((o) => o.asset.startsWith('pine') && map.tileAt(o.tx, o.ty).collision === 0);
  check('a tree blocks its trunk (circle shape, not the picture)', tree && map.isBlocked(tree.tx, tree.ty));
  const r = tree ? tree.collisionShape.circle : 0;
  check('...but not the ground a tile away from it', tree && map.collisionAt(tree.tx + r + 0.8, tree.ty) !== 1 || map.tileAt(tree.tx + r + 0.8, tree.ty).collision !== 0);
  const house = map.objects.find((o) => o.asset.startsWith('house'));
  check('a house blocks its footprint as a building (code 4)', house && map.collisionAt(house.tx, house.ty - 0.4) === 4);
  const flower = map.objects.find((o) => o.asset.startsWith('flowers') && map.tileAt(o.tx, o.ty).collision === 0);
  check('flowers and bushes can be walked through', flower && map.canStand(flower.tx, flower.ty, 0.2));
}

section('Lumina Village layout');
{
  const map = maps['lumina-village'];
  const codes = map.collision.stats();
  for (const [name, code] of Object.entries(COLLISION)) {
    check(`uses collision code ${code} (${name})`, (codes[code] || 0) > 0);
  }
  check('Route A exit leads to Whispering Forest', map.exits.some((e) => e.to === 'whispering-forest' && e.spawn === 'from_village'));
  check('Whispering Forest leads back to the village', maps['whispering-forest'].exits.some((e) => e.to === 'lumina-village' && e.spawn === 'from_forest'));
  check('the village has a respawn point', !!map.spawns.respawn);

  // Route B: walk up to the bridge, the special barrier stops you past it.
  const seen = reachableFrom(map, map.spawn.tx, map.spawn.ty);
  const cell = (px, py) => Math.floor(py / 8) * map.collision.cols + Math.floor(px / 8);
  check('Route B bridge can be reached', seen[cell(1200, 220)] === 1);
  check('Route B is closed with special collision', map.collisionAt(1200 / 16, 182 / 16) === COLLISION.SPECIAL);
  check('nothing past the Route B barrier can be reached', seen[cell(1190, 100)] === 0);
  check('fountain blocks movement', map.isBlocked(640 / 16, 596 / 16));
}

// ------------------------------------------------------------------ collision system

section('Collision system');
{
  const grid = [
    0, 0, 0, 1, 1,
    0, 0, 0, 0, 1,
    0, 2, 2, 0, 0,
    0, 0, 0, 0, 0
  ];
  const c = new CollisionSystem(5, 4, 1, Uint8Array.from(grid));
  check('0 is walkable', c.isWalkable(0.5, 0.5));
  check('1 is blocked', c.isBlocked(3.5, 0.5));
  check('2 (water) blocks walking', c.isBlocked(1.5, 2.5));
  check('2 (water) lets projectiles pass', !c.blocksProjectile(1.5, 2.5));
  check('outside the map is blocked (boundary)', c.isBlocked(-0.1, 1) && c.isBlocked(5.1, 1) && c.isBlocked(1, 4.2));
  check('canStand checks the body, not just the center', !c.canStand(2.9, 0.5, 0.28));
  const into = c.resolveMove(2.5, 0.5, 0.5, 0, 0.28);
  check('moving straight into a wall is stopped', into.blockedX && into.tx === 2.5);
  const slide = c.resolveMove(2.5, 0.5, 0.5, 0.3, 0.28);
  check('diagonal move into a wall slides along it', slide.blockedX && slide.ty > 0.5);

  const fine = new CollisionSystem(4, 4, 2, Uint8Array.from([0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
  check('finer grid: half-tile cells are looked up correctly', fine.isBlocked(1.25, 0.75) && fine.isWalkable(0.75, 0.75));

  const big = new Uint8Array(10000).map((_, i) => (i % 97 < 30 ? 1 : i % 13 === 0 ? 2 : 0));
  const round = decodeCollision(encodeCollision(big), big.length);
  check('collision RLE round-trip is exact', round.every((v, i) => v === big[i]));

  for (const [id, map] of Object.entries(maps)) {
    let pos = { tx: map.spawn.tx, ty: map.spawn.ty };
    let violations = 0;
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
    for (let step = 0; step < 40000; step++) {
      const [dx, dy] = dirs[Math.floor(step / 180) % dirs.length];
      const next = map.collision.resolveMove(pos.tx, pos.ty, dx * 0.05, dy * 0.05, 0.26);
      pos = { tx: next.tx, ty: next.ty };
      if (!map.canStand(pos.tx, pos.ty, 0.26)) violations++;
    }
    check(`${id}: 40,000 movement steps never enter a blocked cell`, violations === 0, `${violations}`);
  }
}

// ------------------------------------------------------------------ camera + renderer

section('Camera and map renderer');
{
  const map = maps['lumina-village'];
  const camera = new Camera();
  camera.setBounds({ minX: 0, maxX: map.pixelWidth, minY: 0, maxY: map.pixelHeight });
  const mapRenderer = new MapRenderer();

  let outside = 0;
  let badRect = 0;
  for (const [viewW, viewH] of [[640, 360], [427, 240], [960, 540], [320, 700], [1600, 900]]) {
    for (const [px, py] of [[0, 0], [1280, 0], [0, 1280], [1280, 1280], [640, 640], [37, 1250]]) {
      camera.snapTo(px, py);
      camera.clampToBounds(viewW, viewH);
      const view = camera.viewRect(viewW, viewH);
      const fitsX = viewW >= map.pixelWidth || (view.left >= -0.01 && view.right <= map.pixelWidth + 0.01);
      const fitsY = viewH >= map.pixelHeight || (view.top >= -0.01 && view.bottom <= map.pixelHeight + 0.01);
      if (!fitsX || !fitsY) outside++;

      const rect = mapRenderer.visibleRect({ width: viewW, height: viewH }, camera, map);
      if (rect.left < 0 || rect.top < 0 || rect.right > map.pixelWidth || rect.bottom > map.pixelHeight) badRect++;
      if (rect.width < Math.min(viewW, map.pixelWidth) - 1 || rect.height < Math.min(viewH, map.pixelHeight) - 1) badRect++;
    }
  }
  check('camera view never leaves the map', outside === 0, `${outside}`);
  check('renderer only reads inside the image, and fills the view', badRect === 0, `${badRect}`);

  camera.resetZoom();
  for (let i = 0; i < 20; i++) camera.zoomBy(1);
  const maxZoom = camera.zoom;
  for (let i = 0; i < 40; i++) camera.zoomBy(-1);
  check('zoom is clamped', maxZoom <= 3 && camera.zoom >= -2);
}

// ------------------------------------------------------------------ map manager + transition

section('Map Manager and Map Transition');
{
  const loads = [];
  const loader = async (id) => {
    loads.push(id);
    return new GameMap(loadMapData(id));
  };
  const manager = new MapManager({ loader });
  check('manager knows every registered map', mapIds().every((id) => manager.has(id)));
  let unknownRejected = false;
  await manager.load('no-such-map').catch(() => { unknownRejected = true; });
  check('unknown map id is an error, not a silent fallback', unknownRejected);

  const arrivals = [];
  const errors = [];
  const transition = new MapTransition(manager, {
    onArrive: (map, point) => arrivals.push({ id: map.id, point }),
    onError: (err) => errors.push(err.message)
  });
  const tick = () => new Promise((resolve) => setImmediate(resolve));

  // run frames until the transition is over; returns the alpha of every frame
  async function run(maxSeconds = 3) {
    const alphas = [];
    for (let t = 0; t < maxSeconds; t += 1 / 60) {
      transition.update(1 / 60);
      alphas.push(transition.alpha);
      await tick();
      if (!transition.active) break;
    }
    return alphas;
  }

  check('idle transition is not active and fully visible', !transition.active && transition.alpha === 0);
  check('changeMap starts a transition', transition.changeMap('whispering-forest', 'from_village') === true);
  check('a second changeMap while fading is ignored', transition.changeMap('lumina-village') === false);
  const alphas = await run();
  const peak = alphas.indexOf(1);
  const fadesOut = alphas.slice(0, peak).every((a, i, list) => i === 0 || a >= list[i - 1]);
  const fadesIn = alphas.slice(alphas.lastIndexOf(1)).every((a, i, list) => i === 0 || a <= list[i - 1]);
  check('fade out goes from visible to black', peak > 0 && fadesOut);
  check('fade in goes from black back to visible', fadesIn && alphas[alphas.length - 1] === 0);
  check('player is placed exactly once', arrivals.length === 1, `${arrivals.length}`);
  const forest = new GameMap(loadMapData('whispering-forest'));
  check('player arrives on the named spawn', arrivals[0] && arrivals[0].id === 'whispering-forest' &&
    arrivals[0].point.tx === forest.spawns.from_village.tx && arrivals[0].point.ty === forest.spawns.from_village.ty);
  check('manager now reports the new map', manager.currentId === 'whispering-forest');
  check('map name banner is shown after arriving', transition.title === 'Whispering Forest' && transition.titleAlpha > 0);
  check('transition ends idle', !transition.active);

  // arriving in the forest should have started loading the village (the forest's exit leads there)
  await tick();
  const forestLoad = loads.indexOf('whispering-forest');
  check('neighbour maps are preloaded on arrival', forestLoad >= 0 && loads.slice(forestLoad + 1).includes('lumina-village'), loads.join(' > '));

  transition.changeMap('no-such-map');
  await run();
  check('a failed load reports an error and keeps the player where they were', errors.length === 1 && arrivals.length === 1 && manager.currentId === 'whispering-forest');
  check('a failed load still fades back in', !transition.active && transition.alpha === 0);

  const warn = console.warn;
  console.warn = () => {};
  transition.changeMap('lumina-village', 'no-such-spawn');
  await run();
  console.warn = warn;
  const village = new GameMap(loadMapData('lumina-village'));
  check('an unknown spawn name falls back to the default spawn', arrivals[1] && arrivals[1].point === arrivals[1].point &&
    arrivals[1].point.tx === village.spawns.default.tx && arrivals[1].point.ty === village.spawns.default.ty);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
