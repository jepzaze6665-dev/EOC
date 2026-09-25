// Development helpers. Toggle the panel with the ` (backquote) key.
//
// This exists so Phase 4+ content can be tested without grinding. It edits the
// local character directly, so it must be removed (or gated behind a server
// permission) in Phase 7 when the server becomes authoritative.

import { hydrate, saveCharacter } from './character.js';
import { addExp, expToNext, MAX_LEVEL } from './stats.js';
import { addItem, countItem } from './inventory.js';
import { getQuestDef } from '../data/quests.js';
import { acceptQuest, activeEntry, isActive, isCompleted, completeQuest } from './quest.js';
import { trialQuestId, advancementState, ADVANCE_LEVEL } from './progression.js';

const PANEL_ID = 'dev-panel';

export function installDevTools(game) {
  const scene = () => (game.scenes.current && game.scenes.current.character ? game.scenes.current : null);
  const character = () => {
    const current = scene();
    return current ? current.character : null;
  };

  const refresh = (message, kind = 'good') => {
    const current = scene();
    if (current && current.onCharacterChanged) current.onCharacterChanged();
    if (message) game.toasts.push(message, kind);
    renderPanel();
  };

  const requireWorld = () => {
    if (character()) return true;
    game.toasts.push('ต้องอยู่ในโลกเกมก่อน (เข้าหมู่บ้านแล้วค่อยใช้)', 'warn');
    return false;
  };

  const api = {
    setLevel(level) {
      if (!requireWorld()) return;
      const c = character();
      c.level = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
      c.exp = 0;
      hydrate(c);
      c.hp = c.maxHp;
      c.mp = c.maxMp;
      refresh(`ตั้งเลเวลเป็น Lv.${c.level}`, 'level');
    },

    addLevels(count = 1) {
      if (!requireWorld()) return;
      api.setLevel(character().level + count);
    },

    addExp(amount) {
      if (!requireWorld()) return;
      const c = character();
      const levels = addExp(c, amount);
      hydrate(c);
      if (levels.length) {
        c.hp = c.maxHp;
        c.mp = c.maxMp;
      }
      refresh(`+${amount} EXP${levels.length ? ` · Lv.${c.level}` : ''}`, levels.length ? 'level' : 'good');
    },

    gold(amount = 1000) {
      if (!requireWorld()) return;
      character().gold += amount;
      refresh(`+${amount} Gold`);
    },

    give(itemId, count = 1) {
      if (!requireWorld()) return;
      const leftover = addItem(character().inventory, itemId, count);
      refresh(leftover > 0 ? 'กระเป๋าเต็ม' : `ได้รับ ${itemId} ×${count}`, leftover > 0 ? 'warn' : 'good');
    },

    heal() {
      if (!requireWorld()) return;
      const c = character();
      c.hp = c.maxHp;
      c.mp = c.maxMp;
      refresh('ฟื้นฟูเต็ม');
    },

    // Fills in every objective of a quest so it can be handed in normally.
    satisfyQuest(questId) {
      if (!requireWorld()) return false;
      const c = character();
      const def = getQuestDef(questId);
      if (!def) {
        game.toasts.push(`ไม่พบเควส ${questId}`, 'warn');
        return false;
      }
      if (isCompleted(c, questId)) return true;
      if (!isActive(c, questId)) acceptQuest(c, questId);

      const entry = activeEntry(c, questId);
      for (const objective of def.objectives) {
        if (objective.type === 'talk') {
          if (!entry.talked.includes(objective.target)) entry.talked.push(objective.target);
        } else if (objective.type === 'kill') {
          if (!entry.kills) entry.kills = {};
          entry.kills[objective.target] = objective.count;
        } else if (objective.type === 'collect') {
          const have = countItem(c.inventory, objective.target);
          if (have < objective.count) addItem(c.inventory, objective.target, objective.count - have);
        }
      }
      refresh(`เควส ${def.title} พร้อมส่งแล้ว`);
      return true;
    },

    finishQuest(questId) {
      if (!api.satisfyQuest(questId)) return;
      const result = completeQuest(character(), questId);
      if (result && result.error) {
        game.toasts.push(result.error, 'warn');
        return;
      }
      refresh(result ? `เควสสำเร็จ: ${result.def.title}` : 'ส่งเควสแล้ว', 'level');
    },

    // One click: level 20 + class trial cleared, ready to choose a path.
    readyToAdvance() {
      if (!requireWorld()) return;
      const c = character();
      if (c.level < ADVANCE_LEVEL) api.setLevel(ADVANCE_LEVEL);
      const trial = trialQuestId(c);
      if (trial && !isCompleted(c, trial)) api.finishQuest(trial);
      refresh('พร้อมเปลี่ยนคลาสแล้ว — เปิดแท็บ Skills (K)', 'level');
    },

    killAll() {
      const current = scene();
      if (!current || !current.monsters) return;
      const alive = current.monsters.filter((monster) => monster.alive);
      if (alive.length === 0) {
        game.toasts.push('ไม่มีมอนสเตอร์ในแมปนี้', 'warn');
        return;
      }
      for (const monster of alive) current.damageMonster(monster, monster.hp + 9999, false);
      renderPanel();
    },

    teleport(mapId, spawn = 'default') {
      if (!requireWorld()) return;
      if (!game.maps.has(mapId)) {
        game.toasts.push(`ไม่มีแมป ${mapId} · มี: ${game.maps.ids().join(', ')}`, 'warn');
        return;
      }
      saveCharacter(character());
      scene().travelTo(mapId, spawn);
    },

    god() {
      const current = scene();
      if (!current || !current.player) return;
      const on = !current.player.statuses.has('invulnerable');
      if (on) current.player.statuses.add('invulnerable', 99999);
      else current.player.statuses.map.delete('invulnerable');
      game.toasts.push(`God mode: ${on ? 'ON' : 'OFF'}`, on ? 'level' : 'info');
      renderPanel();
    },

    help() {
      console.log([
        'eclipse.dev.setLevel(20)     ตั้งเลเวล',
        'eclipse.dev.addLevels(5)     เพิ่มเลเวล',
        'eclipse.dev.addExp(5000)     เพิ่ม EXP',
        'eclipse.dev.gold(1000)       เพิ่มทอง',
        'eclipse.dev.give("potion-minor", 5)',
        'eclipse.dev.satisfyQuest("q-moonleaf")   ทำเงื่อนไขเควสให้ครบ',
        'eclipse.dev.finishQuest("q-moonleaf")    จบเควสทันที',
        'eclipse.dev.readyToAdvance() Lv.20 + ผ่าน trial',
        'eclipse.dev.killAll()        ล้างมอนสเตอร์ในแมป',
        'eclipse.dev.teleport("a1")   Whispering Forest (A1)',
        'eclipse.dev.god()            อมตะ'
      ].join('\n'));
    }
  };

  // ---------------------------------------------------------------- panel

  function buildPanel() {
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'hidden';
    document.body.appendChild(panel);
    return panel;
  }

  function renderPanel() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel || panel.classList.contains('hidden')) return;

    const c = character();
    const state = c ? advancementState(c) : null;
    const statusLine = c
      ? `${c.name} · Lv.${c.level} (${c.exp}/${expToNext(c.level)}) · ${c.className} · ${c.gold} G · SP ${c.skillPoints}`
      : 'ยังไม่ได้เข้าโลกเกม';

    panel.innerHTML = `
      <div class="dev-head">
        <b>DEV PANEL</b>
        <span class="dev-hint">กด \` เพื่อปิด</span>
      </div>
      <div class="dev-status">${statusLine}</div>
      ${state ? `<div class="dev-status">Advancement: ${state.state}${state.reason ? ` — ${state.reason}` : ''}</div>` : ''}
      <div class="dev-row">
        <button data-dev="lv1">+1 Lv</button>
        <button data-dev="lv5">+5 Lv</button>
        <button data-dev="lv20">Lv.20</button>
        <button data-dev="lv60">Lv.60</button>
      </div>
      <div class="dev-row">
        <button data-dev="exp">+2000 EXP</button>
        <button data-dev="gold">+1000 G</button>
        <button data-dev="heal">Full heal</button>
        <button data-dev="god">God</button>
      </div>
      <div class="dev-row">
        <button class="wide" data-dev="ready">พร้อมเปลี่ยนคลาส (Lv.20 + ผ่าน trial)</button>
      </div>
      <div class="dev-row">
        <button data-dev="kit">แจกไอเทมทดสอบ</button>
        <button data-dev="killall">ล้างมอนสเตอร์</button>
      </div>
      <div class="dev-row">
        <button data-dev="tp-village">→ Village</button>
        <button data-dev="tp-a1">→ A1 Forest</button>
      </div>`;

    panel.querySelectorAll('button').forEach((button) => {
      button.onclick = () => {
        const action = button.dataset.dev;
        if (action === 'lv1') api.addLevels(1);
        else if (action === 'lv5') api.addLevels(5);
        else if (action === 'lv20') api.setLevel(20);
        else if (action === 'lv60') api.setLevel(MAX_LEVEL);
        else if (action === 'exp') api.addExp(2000);
        else if (action === 'gold') api.gold(1000);
        else if (action === 'heal') api.heal();
        else if (action === 'god') api.god();
        else if (action === 'ready') api.readyToAdvance();
        else if (action === 'killall') api.killAll();
        else if (action === 'tp-village') api.teleport('lumina-village');
        else if (action === 'tp-a1') api.teleport('a1');
        else if (action === 'kit') {
          api.give('potion-minor', 10);
          api.give('ether-minor', 10);
          api.give('relic-shard', 3);
          api.give('ore-ironvein', 10);
          api.give('herb-moonleaf', 10);
        }
        button.blur();
      };
    });
  }

  const panel = buildPanel();

  window.addEventListener('keydown', (event) => {
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
    if (event.code !== 'Backquote') return;
    event.preventDefault();
    panel.classList.toggle('hidden');
    renderPanel();
  });

  api.render = renderPanel;
  return api;
}
