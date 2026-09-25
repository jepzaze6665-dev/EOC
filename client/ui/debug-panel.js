// F8 map debug panel (developer mode only - see core/env.js).
//
// A small HTML panel on the left of the screen:
//   layer buttons  [VISUAL] [COLLISION] [OBJECT] [SECRET] [GRID]  - every button works
//   live info      map, FPS, zoom, player world/tile position, chunk, mouse position
//   tile info      click a tile on the map: terrain, height, collision, objects, secret
//
// The panel text is refreshed 4 times a second, not every frame (DOM updates are slow).

import { COLLISION_RULES } from '../collision/collision-system.js';

const LAYERS = ['visual', 'collision', 'object', 'secret', 'grid'];

export class DebugPanel {
  constructor() {
    this.active = false;
    this.layers = { visual: true, collision: true, object: true, secret: true, grid: false };
    this.hover = null;
    this.selected = null;
    this.timer = 0;
    this.build();
  }

  build() {
    const root = document.createElement('div');
    root.id = 'debug-panel';
    root.className = 'hidden';
    root.innerHTML = `
      <div class="debug-title">F8 · MAP DEBUG <span>(developer only)</span></div>
      <div class="debug-layers">${LAYERS.map((l) => `<button data-layer="${l}">${l.toUpperCase()}</button>`).join('')}</div>
      <pre class="debug-info"></pre>
      <div class="debug-sub">TILE (click the map)</div>
      <pre class="debug-tile">-</pre>`;
    document.body.appendChild(root);
    root.querySelectorAll('button[data-layer]').forEach((button) => {
      button.addEventListener('click', () => {
        const layer = button.dataset.layer;
        this.layers[layer] = !this.layers[layer];
        this.syncButtons();
      });
    });
    this.root = root;
    this.infoEl = root.querySelector('.debug-info');
    this.tileEl = root.querySelector('.debug-tile');
    this.syncButtons();
  }

  syncButtons() {
    this.root.querySelectorAll('button[data-layer]').forEach((button) => {
      button.classList.toggle('on', !!this.layers[button.dataset.layer]);
    });
  }

  toggle() {
    this.active = !this.active;
    this.root.classList.toggle('hidden', !this.active);
    if (!this.active) this.selected = null;
  }

  hide() {
    this.active = false;
    this.root.classList.add('hidden');
  }

  // Called every frame while active; rewrites the text only 4 times a second.
  update(dt, scene) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.25;
    const map = scene.map;
    const game = scene.game;
    const r = game.renderer;
    const p = scene.player;
    const iso = map.projection === 'iso';
    const stats = scene.mapView.stats;
    const chunk = map.chunks ? map.chunks.chunkAt(p.tx, p.ty) : null;
    const h = this.hover;
    const lines = [
      `map      ${map.id}  ${map.width}x${map.height} tiles  (${iso ? 'isometric tiles' : 'painted image'})`,
      `FPS      ${game.fps}    zoom ${iso ? r.zoomLevel : scene.camera.zoom}    pixel scale ${r.scale}x  dpr ${r.dpr}`,
      `player   world ${p.tx.toFixed(2)}, ${p.ty.toFixed(2)}   tile ${Math.floor(p.tx)}, ${Math.floor(p.ty)}${iso ? `   height ${map.heightAt(p.tx, p.ty).toFixed(2)}` : ''}`,
      `chunk    ${chunk ? `${chunk.cx}, ${chunk.cy}   visible ${stats.chunks}  active ${stats.activeChunks} / ${map.chunks.chunks.length}` : '- (image maps have no chunks)'}`,
      `drawn    ${iso ? `ground ${stats.tiles}  objects ${stats.objects} / ${stats.objectsTotal}` : `image ${stats.imageArea}px  objects ${stats.objects} / ${stats.objectsTotal}`}`,
      `mouse    ${h ? `world ${h.tx.toFixed(2)}, ${h.ty.toFixed(2)}   tile ${Math.floor(h.tx)}, ${Math.floor(h.ty)}` : '(move over the map)'}`,
      `secrets  ${(map.secrets || []).length} on this map   (secret system: NOT IMPLEMENTED)`
    ];
    this.infoEl.textContent = lines.join('\n');
    this.tileEl.textContent = this.selected ? this.describeTile(scene, this.selected) : '-';
  }

  describeTile(scene, t) {
    const map = scene.map;
    const x = Math.floor(t.tx);
    const y = Math.floor(t.ty);
    if (!map.inBounds(x + 0.5, y + 0.5)) return `x=${x} y=${y}\noutside the map`;
    const code = map.collisionAt(x + 0.5, y + 0.5);
    const rule = COLLISION_RULES[code] || { name: 'unknown', walk: false };
    const lines = [`x=${x}  y=${y}`];
    if (map.projection === 'iso') {
      const tile = map.tileAt(x, y);
      const stair = map.stairAt(x, y);
      const chunk = map.chunks.chunkAt(x, y);
      lines.push(`terrain   ${tile.id} (${tile.group})`);
      lines.push(`height    level ${map.levelAt(x, y)}${stair ? `   stairs up (${stair})` : ''}`);
      lines.push(`chunk     ${chunk.cx}, ${chunk.cy}`);
    }
    lines.push(`collision ${code} ${rule.name}   walkable at centre: ${rule.walk ? 'YES' : 'NO'}`);
    const here = (o) => Math.floor(o.tx) === x && Math.floor(o.ty) === y;
    const objects = map.chunks ? map.chunks.chunkAt(x, y).objects.filter(here).map((o) => o.id) : (map.objects || []).filter(here).map((o) => o.type);
    lines.push(`objects   ${objects.length ? objects.join(', ') : 'none'}`);
    const npcs = scene.npcs.filter(here).map((n) => n.id);
    if (npcs.length) lines.push(`npc       ${npcs.join(', ')}`);
    const monsters = scene.monsters.filter((m) => m.alive && here(m)).map((m) => m.defId);
    if (monsters.length) lines.push(`monster   ${monsters.join(', ')}`);
    const exit = map.exitAt(x + 0.5, y + 0.5);
    if (exit) lines.push(`exit      ${exit.id} → ${exit.to} @ ${exit.spawn}`);
    const secret = (map.secrets || []).find((s) => s.tx !== undefined && Math.hypot(s.tx - (x + 0.5), s.ty - (y + 0.5)) <= (s.radius || 1));
    lines.push(`secret    ${secret ? secret.id : 'none'}`);
    return lines.join('\n');
  }
}
