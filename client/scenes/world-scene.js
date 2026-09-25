// The playable world. Handles one map at a time (village, forest, ...),
// real-time combat, NPC interaction, gathering and zone transitions.
//
// The map arrives already loaded (LoadingScene -> world/map-loader.js).
// Map drawing (the map image, placed objects, culling) lives in
// rendering/map-renderer.js; this scene adds the entities on top and handles
// camera + zoom input.

import { Camera } from '../rendering/camera.js';
import { worldToScreen, depthOf, setProjection, setHeightFn } from '../core/projection.js';
import { getItem } from '../data/items.js';
import { rollDrops, rollGold } from '../data/monsters.js';
import { MapRenderer } from '../rendering/map-renderer.js';
import { IsoMapRenderer } from '../rendering/iso-map-renderer.js';
import { MIN_ZOOM, MAX_ZOOM } from '../rendering/camera.js';
import { ISO } from '../data/iso-config.js';
import { DEV_MODE } from '../core/env.js';
import { DebugPanel } from '../ui/debug-panel.js';
import { drawDebugOverlay, pickTile } from '../rendering/debug-overlay.js';
import { MapTransition } from '../world/map-transition.js';
import { CHARACTER_HEIGHT } from '../rendering/sprites.js';
import { Particles } from '../rendering/particles.js';
import { Player } from '../entities/player.js';
import { Npc } from '../entities/npc.js';
import { GatherNode } from '../entities/gather-node.js';
import { Monster } from '../entities/monster.js';
import { Projectile } from '../entities/projectile.js';
import { hideAllScreens } from '../ui/screens.js';
import { hydrate, saveCharacter } from '../systems/character.js';
import { addItem } from '../systems/inventory.js';
import { addExp } from '../systems/stats.js';
import { applyDefensiveEffects, computeDamage, distanceTiles, canAct } from '../systems/combat.js';
import { useSkill, useBasicAttack, getClassSkills } from '../systems/skill-system.js';
import {
  noteTalk, noteKill, availableQuests, questsReadyToTurnIn,
  acceptQuest, completeQuest, trackedQuest
} from '../systems/quest.js';

const INTERACT_RANGE = 1.7;
const LABEL_RANGE = 13;
const TARGET_DROP_RANGE = 12;
const SKILL_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4'];
const DODGE_COOLDOWN = 1.4;
const REGEN_HP_PER_SEC = 0.045;
const REGEN_MP_PER_SEC = 0.06;

export class WorldScene {
  constructor(game) {
    this.game = game;
    this.camera = new Camera();
    this.mapRenderer = new MapRenderer();
    this.isoRenderer = new IsoMapRenderer();
    this.debug = DEV_MODE ? new DebugPanel() : null; // F8 map debug (developer mode only)
    this.particles = new Particles();
    this.time = 0;
    this.stepTimer = 0;
    this.dialogue = null;
    this.nearest = null;
    this.target = null;
    this.floaters = [];
    this.saveTimer = 0;

    // Map changes inside the world (exits, respawn, dev teleport) all go through here.
    this.transition = new MapTransition(game.maps, {
      onArrive: (map, point) => this.setMap(map, point),
      onError: (err) => {
        this.game.toasts.push(`เดินทางไม่สำเร็จ: ${err.message}`, 'warn');
        this.revivePlayer();
      }
    });
  }

  // First entry into the world (from the loading screen).
  // `spawn` is a spawn name ('from_forest') or a { tx, ty } point.
  enter({ character, map, spawn = 'default' }) {
    hideAllScreens();

    this.character = character;
    this.player = new Player(character, map.getSpawn(spawn));
    this.time = 0;
    this.dodgeCooldown = 0;
    this.dodgeTimer = 0;
    this.dodgeVec = { x: 0, y: 0 };
    this.deathTimer = 0;
    this.regen = { hp: 0, mp: 0 };
    this.saveTimer = 10;

    this.game.maps.setCurrent(map);
    this.setMap(map, map.getSpawn(spawn));
    this.game.maps.preloadNeighbors();
    this.transition.showTitle(map.name);

    this.game.panels.setCharacter(character);
    this.game.hud.setCharacter(character);
    this.game.hud.setupSkillbar(character);
    this.game.hud.setQuestTracker(trackedQuest(character));
    this.game.hud.show();
  }

  // Puts the (existing) player on a map: rebuilds everything that belongs to the map,
  // keeps everything that belongs to the character (HP, cooldowns, buffs).
  setMap(map, point) {
    this.map = map;
    this.mapId = map.id;

    // Compatibility layer: painted top-down maps and isometric tile maps each get
    // their own projection, render mode and zoom steps. Everything else is shared.
    const iso = map.projection === 'iso';
    setProjection(map.projection);
    setHeightFn(iso ? (tx, ty) => map.heightAt(tx, ty) : null);
    this.game.renderer.setMode(iso ? 'hd' : 'pixel');
    this.camera.setZoomRange(iso ? 0 : MIN_ZOOM, iso ? ISO.ZOOM_LEVELS.length - 1 : MAX_ZOOM);
    this.game.renderer.setZoom(this.camera.zoom);

    this.player.tx = point.tx;
    this.player.ty = point.ty;
    this.player.moving = false;
    this.revivePlayer();
    this.portalCooldown = 0.5;

    this.npcs = map.npcs.map((def) => new Npc(def));
    this.nodes = map.gatherNodes.map((def) => new GatherNode(def));
    this.monsters = map.monsterSpawns.map((def) => new Monster(def));
    this.projectiles = [];
    this.floaters = [];
    this.particles.clear();
    this.dialogue = null;
    this.nearest = null;
    this.target = null;
    this.game.hud.hideDialogue();
    this.game.hud.setPrompt(null);

    // Particle emitters placed on the map (fountain spray, fires, lamps).
    // Their screen position is worked out when they fire (it changes with iso zoom).
    this.emitters = map.ambient.map((a) => ({
      type: a.type,
      tx: a.tx,
      ty: a.ty,
      depth: depthOf(a.tx, a.ty) + 0.4,
      timer: Math.random()
    }));

    // The camera never shows anything outside the map.
    this.updateCameraBounds();
    const start = this.player.screenPos;
    this.camera.snapTo(start.x, start.y);

    document.getElementById('death-overlay').classList.add('hidden');
    this.game.hud.setZone(map.name, map.safeZone);
    this.game.hud.setTarget(null);
    saveCharacter(this.character);
  }

  // The map renderer for the current kind of map.
  get mapView() {
    return this.map.projection === 'iso' ? this.isoRenderer : this.mapRenderer;
  }

  updateCameraBounds() {
    if (this.map.projection === 'iso') this.camera.setBounds(this.isoRenderer.cameraBounds(this.map));
    else this.camera.setBounds({ minX: 0, maxX: this.map.pixelWidth, minY: 0, maxY: this.map.pixelHeight });
  }

  // Public entry point used by exits, respawn and the dev panel.
  travelTo(mapId, spawnName = 'default') {
    return this.transition.changeMap(mapId, spawnName);
  }

  exit() {
    if (this.debug) this.debug.hide();
    this.game.renderer.setMode('pixel');
    this.game.renderer.setZoom(0);
    setProjection('topdown');
    setHeightFn(null);
    this.game.hud.hide();
    this.game.panels.close();
    saveCharacter(this.character);
  }

  refreshHud() {
    this.game.hud.setCharacter(this.character);
  }

  onCharacterChanged() {
    hydrate(this.character);
    saveCharacter(this.character);
    this.game.hud.setCharacter(this.character);
    this.game.hud.setupSkillbar(this.character);
    this.game.hud.setQuestTracker(trackedQuest(this.character));
    this.game.panels.refresh();
  }

  // The interface the skill system talks to.
  get world() {
    return {
      character: this.character,
      player: this.player,
      map: this.map,
      monsters: this.monsters,
      target: this.target,
      damageMonster: (monster, amount, crit) => this.damageMonster(monster, amount, crit),
      applyStatus: (monster, status) => monster.statuses.add(status.type, status.duration, status.value),
      floatingText: (tx, ty, text, color) => this.addFloater(tx, ty, text, color),
      effect: (name, tx, ty, options) => this.spawnEffect(name, tx, ty, options),
      spawnProjectile: (options) => this.projectiles.push(new Projectile(options)),
      movePlayerByScreenVector: (dx, dy) => this.player.moveByScreenVector(dx, dy, this.map)
    };
  }

  // ---------------------------------------------------------------- update

  update(dt) {
    this.time += dt;
    this.frameDt = dt;
    const input = this.game.input;
    const panels = this.game.panels;

    // During a map transition the world is frozen behind the fade.
    if (this.transition.active) {
      this.transition.update(dt);
      this.player.update(dt, { x: 0, y: 0 }, this.map);
      this.particles.update(dt);
      this.updateFloaters(dt);
      const pos = this.player.screenPos;
      this.camera.follow(pos.x, pos.y, dt, 30);
      this.updateCameraBounds();
      this.camera.clampToBounds(this.game.renderer.width, this.game.renderer.height);
      return;
    }
    this.transition.update(dt); // counts down the map-name banner

    if (this.deathTimer > 0) {
      this.deathTimer -= dt;
      this.particles.update(dt);
      this.updateFloaters(dt);
      if (this.deathTimer <= 0) this.respawnPlayer();
      return;
    }

    if (!this.dialogue) {
      if (input.wasPressed('KeyC')) panels.toggle('character');
      if (input.wasPressed('KeyI')) panels.toggle('inventory');
      if (input.wasPressed('KeyJ')) panels.toggle('quests');
      if (input.wasPressed('KeyK')) panels.toggle('skills');
    }

    let move = { x: 0, y: 0 };

    if (this.dialogue) {
      if (input.wasPressed('KeyE') || input.wasPressed('Space') || input.wasPressed('Enter')) this.advanceDialogue();
      else if (input.wasPressed('Escape')) this.closeDialogue();
      this.player.guarding = false;
    } else {
      if (input.wasPressed('Escape') && panels.isOpen) panels.close();
      move = input.moveVector();
      this.handleCombatInput(input, dt);
    }

    if (this.dodgeTimer > 0) {
      this.dodgeTimer -= dt;
      this.player.moveByScreenVector(this.dodgeVec.x * 14 * dt, this.dodgeVec.y * 14 * dt, this.map);
      move = { x: 0, y: 0 };
    }

    this.player.update(dt, move, this.map);
    if (this.dodgeCooldown > 0) this.dodgeCooldown -= dt;
    if (this.portalCooldown > 0) this.portalCooldown -= dt;

    for (const npc of this.npcs) npc.update(dt, this.map);
    for (const node of this.nodes) node.update(dt);
    this.updateMonsters(dt);
    this.updateProjectiles(dt);

    this.updateInteraction(input);
    this.updateAmbient(dt);
    this.updateFloaters(dt);
    this.particles.update(dt);
    this.updateRegen(dt);
    this.updateTarget();
    this.checkExits();

    this.updateCameraInput(input);
    const pos = this.player.screenPos;
    this.camera.follow(pos.x, pos.y, dt);
    this.updateCameraBounds();
    this.camera.clampToBounds(this.game.renderer.width, this.game.renderer.height);

    this.saveTimer -= dt;
    if (this.saveTimer <= 0) {
      this.saveTimer = 10;
      saveCharacter(this.character);
    }

    this.game.hud.setStatus({ tx: this.player.tx, ty: this.player.ty, fps: this.game.fps });
    this.game.hud.updateSkillbar(this.character, this.player, this.dodgeCooldown / DODGE_COOLDOWN);
    this.game.hud.setCombatState(this.player.inCombat);
  }

  // Zoom: mouse wheel or +/- , 0 resets.  F8: map debug mode (developer mode only).
  updateCameraInput(input) {
    let step = -input.consumeWheel();
    if (!this.dialogue) {
      if (input.wasPressed('Equal') || input.wasPressed('NumpadAdd')) step += 1;
      if (input.wasPressed('Minus') || input.wasPressed('NumpadSubtract')) step -= 1;
      if (input.wasPressed('Digit0')) this.camera.resetZoom();
    }
    if (step !== 0) this.camera.zoomBy(step);
    if (this.game.renderer.setZoom(this.camera.zoom) && this.map.projection === 'iso') {
      // iso zoom changes the size of the world in entity pixels: re-centre instantly
      const p = this.player.screenPos;
      this.camera.snapTo(p.x, p.y);
    }

    if (this.debug) this.updateDebug(input);
  }

  updateDebug(input) {
    const debug = this.debug;
    if (input.wasPressed('F8')) debug.toggle();
    if (!debug.active) return;
    debug.hover = input.mouse.inside ? pickTile(this.game.renderer, this.map, input.mouse) : null;
    if (input.wasPressed('Mouse0') && debug.hover) debug.selected = { ...debug.hover };
    debug.update(this.frameDt || 1 / 60, this);
  }

  handleCombatInput(input, dt) {
    const player = this.player;
    player.guarding = input.isDown('ShiftLeft') || input.isDown('ShiftRight');

    if (input.wasPressed('Tab')) this.cycleTarget();
    if (input.wasPressed('KeyF')) this.quickPotion();

    if (input.wasPressed('KeyQ') && this.dodgeCooldown <= 0 && canAct(player)) {
      this.dodgeCooldown = DODGE_COOLDOWN;
      this.dodgeTimer = 0.22;
      this.dodgeVec = { ...player.facingVec };
      player.statuses.add('invulnerable', 0.38);
      this.spawnEffect('dash', player.tx, player.ty, { color: '#9fe8ff' });
    }

    if (input.wasPressed('Space') && !this.game.panels.isOpen) {
      const result = useBasicAttack(this.world);
      if (result.ok) this.player.markCombat(4);
    }

    const skills = getClassSkills(this.character.classId);
    SKILL_KEYS.forEach((key, index) => {
      if (!input.wasPressed(key)) return;
      const skill = skills[index];
      if (!skill) return;
      const result = useSkill(this.world, skill.id);
      if (!result.ok) {
        if (result.reason) this.game.toasts.push(result.reason, 'warn');
        return;
      }
      this.player.markCombat(5);
      this.refreshHud();
    });
  }

  quickPotion() {
    const index = this.character.inventory.findIndex((slot) => {
      if (!slot) return false;
      const def = getItem(slot.id);
      return def && def.type === 'consumable' && def.effect.hp;
    });
    if (index === -1) {
      this.game.toasts.push('ไม่มีโพชั่นในกระเป๋า', 'warn');
      return;
    }
    this.game.panels.useConsumable(index);
  }

  updateMonsters(dt) {
    for (const monster of this.monsters) {
      monster.update(dt, this.map, this.player.alive ? this.player : null);

      if (monster.pendingAttack) {
        monster.pendingAttack = false;
        this.monsterAttacksPlayer(monster);
      }
    }
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.update(dt, this.map, this.monsters, (monster) => {
        const stats = this.character.stats;
        const { amount, crit } = computeDamage({
          atk: stats.atk,
          power: projectile.power,
          targetDef: monster.defense,
          critChance: 0.05 + stats.spd * 0.004
        });
        this.damageMonster(monster, amount, crit);
        this.spawnEffect('slash', monster.tx, monster.ty, { color: projectile.color });
      });
      if (!projectile.alive) this.projectiles.splice(i, 1);
    }
  }

  updateRegen(dt) {
    if (!this.player.alive || this.player.inCombat) return;
    const c = this.character;
    if (c.hp >= c.maxHp && c.mp >= c.maxMp) return;

    this.regen.hp += c.maxHp * REGEN_HP_PER_SEC * dt;
    this.regen.mp += c.maxMp * REGEN_MP_PER_SEC * dt;

    let changed = false;
    if (this.regen.hp >= 1) {
      const gain = Math.floor(this.regen.hp);
      this.regen.hp -= gain;
      c.hp = Math.min(c.maxHp, c.hp + gain);
      changed = true;
    }
    if (this.regen.mp >= 1) {
      const gain = Math.floor(this.regen.mp);
      this.regen.mp -= gain;
      c.mp = Math.min(c.maxMp, c.mp + gain);
      changed = true;
    }
    if (changed) this.refreshHud();
  }

  updateTarget() {
    if (this.target && (!this.target.alive || distanceTiles(this.player, this.target) > TARGET_DROP_RANGE)) {
      this.target = null;
    }
    this.game.hud.setTarget(this.target);
  }

  cycleTarget() {
    const candidates = this.monsters
      .filter((monster) => monster.alive && distanceTiles(this.player, monster) <= TARGET_DROP_RANGE)
      .sort((a, b) => distanceTiles(this.player, a) - distanceTiles(this.player, b));

    if (candidates.length === 0) {
      this.target = null;
      return;
    }
    const currentIndex = candidates.indexOf(this.target);
    this.target = candidates[(currentIndex + 1) % candidates.length];
  }

  // Exit Zones: stepping into one starts the transition to the map it points at.
  checkExits() {
    if (this.portalCooldown > 0 || !this.player.alive) return;
    const exit = this.map.exitAt(this.player.tx, this.player.ty);
    if (!exit) return;
    saveCharacter(this.character);
    this.travelTo(exit.to, exit.spawn);
  }

  // ---------------------------------------------------------------- damage

  damageMonster(monster, amount, crit) {
    // Death Mark and similar debuffs make the target take extra damage.
    const vulnerable = monster.statuses.value('vulnerable');
    const final = vulnerable ? Math.round(amount * (1 + vulnerable)) : amount;

    const died = monster.takeDamage(final);
    this.addFloater(monster.tx, monster.ty, crit ? `${final}!` : `${final}`, crit ? '#ffd24a' : '#ffffff', crit ? 15 : 12);
    this.player.markCombat(5);

    const lifesteal = this.character.passives.lifestealPct || 0;
    if (lifesteal > 0 && this.character.hp < this.character.maxHp) {
      const healed = Math.max(1, Math.round(final * lifesteal));
      this.character.hp = Math.min(this.character.maxHp, this.character.hp + healed);
      this.refreshHud();
    }

    if (monster.state === 'idle' || monster.state === 'return') monster.forceAggro(this.player, 5);
    if (died) this.onMonsterDeath(monster);
  }

  monsterAttacksPlayer(monster) {
    if (!this.player.alive) return;
    if (distanceTiles(monster, this.player) > monster.def.attackRange * 1.4) return;

    const { amount, crit } = computeDamage({
      atk: monster.atk,
      power: 1,
      targetDef: this.character.stats.def,
      critChance: 0.04
    });

    const result = applyDefensiveEffects(this.player, amount, {
      guarding: this.player.guarding,
      flatReductionPct: this.character.passives.damageReductionPct || 0
    });
    this.player.markCombat(5);

    if (result.blocked) {
      this.addFloater(this.player.tx, this.player.ty, 'หลบ!', '#9fe8ff');
      return;
    }

    // Counter Stance reflects part of the hit back at the attacker.
    const thorns = this.player.statuses.value('thorns');
    if (thorns > 0 && monster.alive) {
      const reflected = Math.max(1, Math.round(result.amount * thorns));
      this.damageMonster(monster, reflected, false);
    }
    if (result.absorbed > 0) {
      this.addFloater(this.player.tx, this.player.ty, `โล่ -${result.absorbed}`, '#c6b8ff');
    }
    if (result.amount <= 0) return;

    this.character.hp = Math.max(0, this.character.hp - result.amount);
    this.player.hurtTimer = 0.16;
    this.addFloater(this.player.tx, this.player.ty, `-${result.amount}`, this.player.guarding ? '#9fd8ff' : '#ff6b6b', crit ? 15 : 12);
    this.refreshHud();

    if (this.character.hp <= 0) this.onPlayerDeath();
  }

  onMonsterDeath(monster) {
    if (this.target === monster) this.target = null;

    const def = monster.def;
    const gold = rollGold(def);
    const drops = rollDrops(def);
    const levels = addExp(this.character, def.exp);
    this.character.gold += gold;

    this.game.toasts.push(`ปราบ ${def.name} · +${def.exp} EXP · +${gold} G`, 'good');

    for (const drop of drops) {
      const leftover = addItem(this.character.inventory, drop.id, drop.count);
      if (leftover > 0) this.game.toasts.push('กระเป๋าเต็ม — ไอเทมตกหล่น', 'warn');
      else this.game.toasts.push(`ได้รับ ${getItem(drop.id).name} ×${drop.count}`, 'good');
    }

    if (noteKill(this.character, monster.defId)) {
      this.game.toasts.push('ความคืบหน้าเควสอัปเดต', 'info');
    }

    const pos = worldToScreen(monster.tx, monster.ty);
    for (let i = 0; i < 14; i++) {
      this.particles.emit(pos.x, pos.y - 7, {
        vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 20, gravity: 60,
        life: 0.7, color: def.colors.bodyLight, depth: depthOf(monster.tx, monster.ty) + 0.5
      });
    }

    this.onCharacterChanged();

    if (levels.length > 0) {
      this.character.hp = this.character.maxHp;
      this.character.mp = this.character.maxMp;
      for (const level of levels) this.game.toasts.push(`LEVEL UP!  Lv.${level}`, 'level');
      this.onCharacterChanged();
      this.levelUpBurst();
    }
  }

  onPlayerDeath() {
    this.player.alive = false;
    this.player.guarding = false;
    this.player.statuses.clear();
    this.character.hp = 0;

    const lost = Math.floor(this.character.exp * 0.1);
    this.character.exp = Math.max(0, this.character.exp - lost);

    this.game.toasts.push('เจ้าพ่ายแพ้...', 'warn');
    if (lost > 0) this.game.toasts.push(`สูญเสีย ${lost} EXP`, 'warn');

    document.getElementById('death-overlay').classList.remove('hidden');
    this.deathTimer = 2.6;
    this.onCharacterChanged();
  }

  respawnPlayer() {
    this.character.hp = Math.max(1, Math.ceil(this.character.maxHp * 0.5));
    this.character.mp = Math.max(0, Math.ceil(this.character.maxMp * 0.5));
    this.onCharacterChanged();

    // The player is revived in setMap(), once the village is on screen behind the fade.
    this.travelTo(this.game.maps.defaultMapId, 'respawn');
  }

  revivePlayer() {
    if (this.player.alive) return;
    this.player.alive = true;
    this.player.statuses.clear();
    this.player.hurtTimer = 0;
    document.getElementById('death-overlay').classList.add('hidden');
  }

  levelUpBurst() {
    const pos = this.player.screenPos;
    for (let i = 0; i < 26; i++) {
      const angle = (i / 26) * Math.PI * 2;
      this.particles.emit(pos.x, pos.y - 9, {
        vx: Math.cos(angle) * 26, vy: Math.sin(angle) * 14 - 16, gravity: 30,
        life: 1.1, color: i % 2 === 0 ? '#ffd873' : '#fff3c8',
        depth: depthOf(this.player.tx, this.player.ty) + 0.5
      });
    }
  }

  // ---------------------------------------------------------------- effects

  addFloater(tx, ty, text, color, size = 12) {
    this.floaters.push({ tx, ty, text, color, size, timer: 0.9, life: 0.9 });
  }

  updateFloaters(dt) {
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      this.floaters[i].timer -= dt;
      if (this.floaters[i].timer <= 0) this.floaters.splice(i, 1);
    }
  }

  spawnEffect(name, tx, ty, options = {}) {
    const pos = worldToScreen(tx, ty);
    const color = options.color || '#ffffff';
    const depth = depthOf(tx, ty) + 0.5;

    if (name === 'slash') {
      for (let i = 0; i < 8; i++) {
        this.particles.emit(pos.x, pos.y - 9, {
          vx: (Math.random() - 0.5) * 46, vy: -12 - Math.random() * 20, gravity: 50,
          life: 0.35, color, depth
        });
      }
    } else if (name === 'cone') {
      const facing = options.facing || { x: 0, y: 1 };
      for (let i = 0; i < 20; i++) {
        const spread = (Math.random() - 0.5) * 1.6;
        const dist = 10 + Math.random() * options.range * 16;
        this.particles.emit(
          pos.x + (facing.x + spread) * dist,
          pos.y - 9 + (facing.y + spread * 0.5) * dist * 0.75,
          { vy: -6, life: 0.3, color, depth }
        );
      }
    } else if (name === 'aoe') {
      const radius = (options.radius || 2) * 16;
      for (let i = 0; i < 26; i++) {
        const angle = (i / 26) * Math.PI * 2;
        this.particles.emit(pos.x + Math.cos(angle) * radius, pos.y - 4 + Math.sin(angle) * radius * 0.75, {
          vy: -22, life: 0.55, color, depth, size: 2
        });
      }
    } else if (name === 'buff') {
      for (let i = 0; i < 16; i++) {
        this.particles.emit(pos.x + (Math.random() * 20 - 10), pos.y - 2, {
          vy: -26 - Math.random() * 16, life: 0.8, color, depth
        });
      }
    } else if (name === 'taunt') {
      const radius = (options.radius || 3) * 16;
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        this.particles.emit(pos.x, pos.y - 7, {
          vx: Math.cos(angle) * radius, vy: Math.sin(angle) * radius * 0.75, life: 0.5, color, depth
        });
      }
    } else if (name === 'dash') {
      for (let i = 0; i < 12; i++) {
        this.particles.emit(pos.x + (Math.random() * 10 - 5), pos.y - 6, {
          vx: (Math.random() - 0.5) * 12, vy: -8, life: 0.4, color, depth: depth - 1
        });
      }
    }
  }

  // ---------------------------------------------------------------- interaction

  findNearestInteractable() {
    let best = null;
    let bestDist = INTERACT_RANGE;

    for (const npc of this.npcs) {
      const dist = Math.hypot(npc.tx - this.player.tx, npc.ty - this.player.ty);
      if (dist < bestDist) {
        best = { kind: 'npc', npc };
        bestDist = dist;
      }
    }
    for (const node of this.nodes) {
      if (!node.available) continue;
      const dist = Math.hypot(node.centerX - this.player.tx, node.centerY - this.player.ty);
      if (dist < bestDist) {
        best = { kind: 'node', node };
        bestDist = dist;
      }
    }
    return best;
  }

  updateInteraction(input) {
    if (this.dialogue) {
      this.game.hud.setPrompt(null);
      return;
    }

    this.nearest = this.findNearestInteractable();
    if (!this.nearest) {
      this.game.hud.setPrompt(null);
      return;
    }

    if (this.nearest.kind === 'node') {
      this.game.hud.setPrompt(`[E] เก็บ ${this.nearest.node.name}`);
      if (input.wasPressed('KeyE') && !this.game.panels.isOpen) this.harvest(this.nearest.node);
      return;
    }

    const npc = this.nearest.npc;
    const marker = this.questMarkerFor(npc);
    const markerText = marker === '!' ? ' [มีเควสใหม่]' : marker === '?' ? ' [ส่งเควสได้]' : '';
    this.game.hud.setPrompt(`[E] ${npc.name}${npc.role ? ` · ${npc.role}` : ''}${markerText}`);
    if (input.wasPressed('KeyE') && !this.game.panels.isOpen) this.openDialogue(npc);
  }

  questMarkerFor(npc) {
    if (questsReadyToTurnIn(this.character, npc.id).length > 0) return '?';
    if (availableQuests(this.character, npc.id).length > 0) return '!';
    return null;
  }

  harvest(node) {
    const leftover = addItem(this.character.inventory, node.itemId, 1);
    if (leftover > 0) {
      this.game.toasts.push('กระเป๋าเต็ม', 'warn');
      return;
    }

    node.harvest();
    const pos = worldToScreen(node.centerX, node.centerY);
    for (let i = 0; i < 10; i++) {
      this.particles.emit(pos.x + (Math.random() * 12 - 6), pos.y - 6 - Math.random() * 8, {
        vx: (Math.random() - 0.5) * 18, vy: -20 - Math.random() * 14, gravity: 40,
        life: 0.7, color: '#ffe9a8', depth: depthOf(node.centerX, node.centerY) + 0.5
      });
    }

    this.game.toasts.push(`ได้รับ ${getItem(node.itemId).name} ×1`, 'good');
    this.onCharacterChanged();
  }

  updateAmbient(dt) {
    if (this.player.moving) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = 0.28;
        const pos = this.player.screenPos;
        this.particles.emit(pos.x + (Math.random() * 6 - 3), pos.y - 1, {
          vx: (Math.random() - 0.5) * 8, vy: -6, life: 0.45,
          color: '#b9ae93', depth: depthOf(this.player.tx, this.player.ty) - 0.1
        });
      }
    }

    for (const emitter of this.emitters) {
      emitter.timer -= dt;
      if (emitter.timer > 0) continue;
      const pos = worldToScreen(emitter.tx, emitter.ty);

      if (emitter.type === 'fountain') {
        emitter.timer = 0.07;
        this.particles.emit(pos.x + (Math.random() * 6 - 3), pos.y, {
          vx: (Math.random() - 0.5) * 12, vy: -20 - Math.random() * 10, gravity: 70,
          life: 0.8, color: Math.random() < 0.5 ? '#9fd0ff' : '#ffffff', depth: emitter.depth
        });
      } else if (emitter.type === 'lamp') {
        emitter.timer = 0.5 + Math.random() * 0.7;
        this.particles.emit(pos.x + (Math.random() * 4 - 2), pos.y, {
          vy: -7, life: 1.5, color: '#ffcf7a', depth: emitter.depth
        });
      } else if (emitter.type === 'campfire') {
        emitter.timer = 0.08;
        this.particles.emit(pos.x + (Math.random() * 6 - 3), pos.y, {
          vx: (Math.random() - 0.5) * 6, vy: -22 - Math.random() * 14, life: 0.7,
          color: Math.random() < 0.6 ? '#ff9a3c' : '#ffd24a', depth: emitter.depth
        });
      } else {
        emitter.timer = 0.16;
        this.particles.emit(pos.x + (Math.random() * 20 - 10), pos.y + (Math.random() * 8 - 4), {
          vy: -12 - Math.random() * 10, life: 1.2,
          color: Math.random() < 0.5 ? '#c6b8ff' : '#8f7bff', depth: emitter.depth
        });
      }
    }
  }

  // ---------------------------------------------------------------- dialogue

  openDialogue(npc) {
    if (npc.kind === 'board') {
      this.game.panels.open('quests', { board: true });
      return;
    }
    if (!npc.lines.length) return;

    this.game.panels.close();
    if (npc.kind === 'person') npc.faceTowards(this.player.tx, this.player.ty);

    if (noteTalk(this.character, npc.id)) {
      this.game.toasts.push('ความคืบหน้าเควสอัปเดต', 'info');
      this.onCharacterChanged();
    }

    const pages = npc.lines.map((text) => ({ text }));
    const ready = questsReadyToTurnIn(this.character, npc.id)[0];
    const offer = availableQuests(this.character, npc.id)[0];

    if (ready) pages.push({ text: ready.completionText, action: 'complete', quest: ready });
    else if (offer) pages.push({ text: offer.offerText, action: 'offer', quest: offer });

    this.dialogue = { npc, index: 0, pages };
    this.showDialoguePage();
  }

  showDialoguePage() {
    const page = this.dialogue.pages[this.dialogue.index];
    let hint;
    if (page.action === 'offer') hint = '[E] รับเควส · [Esc] ไว้ก่อน';
    else if (page.action === 'complete') hint = '[E] ส่งเควส · [Esc] ไว้ก่อน';
    this.game.hud.showDialogue(this.dialogue.npc.name, page.text, hint);
  }

  advanceDialogue() {
    const page = this.dialogue.pages[this.dialogue.index];

    if (page.action === 'offer') {
      if (acceptQuest(this.character, page.quest.id)) {
        this.game.toasts.push(`รับเควส: ${page.quest.title}`, 'good');
        this.onCharacterChanged();
      }
      this.closeDialogue();
      return;
    }

    if (page.action === 'complete') {
      this.turnInQuest(page.quest);
      this.closeDialogue();
      return;
    }

    const next = this.dialogue.index + 1;
    if (next >= this.dialogue.pages.length) {
      this.closeDialogue();
      return;
    }
    this.dialogue.index = next;
    this.showDialoguePage();
  }

  turnInQuest(questDef) {
    const result = completeQuest(this.character, questDef.id);
    if (!result) return;
    if (result.error) {
      this.game.toasts.push(result.error, 'warn');
      return;
    }

    this.game.toasts.push(`เควสสำเร็จ: ${result.def.title}`, 'good');
    this.game.toasts.push(`+${result.exp} EXP · +${result.gold} G`, 'good');
    for (const item of result.items) {
      this.game.toasts.push(`ได้รับ ${getItem(item.id)?.name || item.id} ×${item.count}`, 'good');
    }

    this.onCharacterChanged();

    if (result.levels.length > 0) {
      this.character.hp = this.character.maxHp;
      this.character.mp = this.character.maxMp;
      for (const level of result.levels) this.game.toasts.push(`LEVEL UP!  Lv.${level}`, 'level');
      this.onCharacterChanged();
      this.levelUpBurst();
    }
  }

  closeDialogue() {
    this.dialogue = null;
    this.game.hud.hideDialogue();
  }

  // ---------------------------------------------------------------- render

  render(renderer) {
    renderer.beginWorld(this.camera, this.map.background);

    // Layer 0: the visible part of the map image. Layers 2-3: placed objects.
    const debug = this.debug && this.debug.active ? this.debug : null;
    this.mapView.renderMap(renderer, this.camera, this.map, { visual: !debug || debug.layers.visual });

    // Layers 4-6: NPCs / monsters, player, effects - all Y-sorted together
    for (const node of this.nodes) node.render(renderer);
    for (const npc of this.npcs) this.renderNpc(renderer, npc);
    for (const monster of this.monsters) monster.render(renderer, { targeted: monster === this.target });
    for (const projectile of this.projectiles) projectile.render(renderer);
    if (this.player.alive) this.player.render(renderer);
    this.particles.render(renderer);
    renderer.flush();

    if (this.map.projection === 'iso') this.isoRenderer.drawAtmosphere(renderer);
    // collision view: iso maps draw it (cached) inside the debug overlay, image maps here
    if (debug && debug.layers.collision && this.map.projection !== 'iso') this.mapView.drawCollisionOverlay(renderer, this.camera, this.map);
    if (debug) drawDebugOverlay(renderer, this, debug);

    // Layer 7: text drawn at display resolution
    this.renderLabels(renderer);
    if (this.player.alive) {
      const pos = this.player.screenPos;
      renderer.overlayText(this.character.name, pos.x, pos.y - CHARACTER_HEIGHT - 6, { color: '#9fe8ff', size: 12 });
    }
    this.renderFloaters(renderer);
    renderer.end();

    // Map transition: black fade, "Loading..." if the map is slow, then the map's name.
    const t = this.transition;
    renderer.fadeScreen(t.alpha);
    if (t.showLoading) renderer.screenText('Loading...', 0.5, 0.5, { size: 16, color: '#9d9ad8' });
    if (t.title) renderer.screenText(t.title, 0.5, 0.28, { size: 26, alpha: t.titleAlpha });
  }

  renderFloaters(renderer) {
    for (const floater of this.floaters) {
      const progress = 1 - floater.timer / floater.life;
      const pos = worldToScreen(floater.tx, floater.ty);
      renderer.overlayText(floater.text, pos.x, pos.y - CHARACTER_HEIGHT - 4 - progress * 14, {
        color: floater.color,
        size: floater.size,
        weight: '800'
      });
    }
  }

  renderNpc(renderer, npc) {
    npc.render(renderer);
    const marker = this.questMarkerFor(npc);
    if (!marker) return;
    const pos = worldToScreen(npc.tx, npc.ty);
    renderer.overlayText(marker, pos.x, pos.y - (npc.kind === 'person' ? CHARACTER_HEIGHT + 16 : 20), {
      color: marker === '!' ? '#ffd24a' : '#7fe0a0',
      size: 20,
      weight: '800'
    });
  }

  // Place names written in the map data (buildings, landmarks), shown when the player is near.
  renderLabels(renderer) {
    for (const label of this.map.labels) {
      if (Math.hypot(label.tx - this.player.tx, label.ty - this.player.ty) > LABEL_RANGE) continue;
      const pos = worldToScreen(label.tx, label.ty);
      renderer.overlayText(label.text, pos.x, pos.y, { color: '#f2e6c4', size: 11 });
    }
  }
}
