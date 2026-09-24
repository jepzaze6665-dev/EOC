// The Character / Inventory / Quests window (C / I / J).
// Every action mutates the character then calls onChange(), which re-derives
// stats, saves, and re-renders everything that is open.

import { getItem, itemRarityColor, RARITY } from '../data/items.js';
import { INVENTORY_SIZE, freeSlots, removeAtSlot } from '../systems/inventory.js';
import { EQUIP_SLOTS, SLOT_LABELS, equipFromInventory, unequip } from '../systems/equipment.js';
import { expToNext } from '../systems/stats.js';
import { availableQuests, acceptQuest, objectiveProgress, isQuestComplete, rewardItemsFor } from '../systems/quest.js';
import { getQuestDef } from '../data/quests.js';
import { renderItemIcon, renderCharacterPortrait } from '../rendering/sprites.js';
import {
  treeFor, buyNode, respec, availablePoints, advancementState, advanceTo,
  RESPEC_COST, ADVANCE_LEVEL
} from '../systems/progression.js';

const TABS = ['character', 'inventory', 'quests', 'skills'];

export class Panels {
  constructor({ onChange, onToast }) {
    this.onChange = onChange;
    this.onToast = onToast;
    this.character = null;
    this.tab = 'character';
    this.boardMode = false;
    this.selectedSlot = null;

    this.root = document.getElementById('panel-window');
    this.body = document.getElementById('panel-body');

    document.querySelectorAll('.panel-tab-btn').forEach((button) => {
      button.onclick = () => this.open(button.dataset.tab, { board: this.boardMode });
    });
    document.getElementById('panel-close').onclick = () => this.close();
  }

  setCharacter(character) {
    this.character = character;
  }

  get isOpen() {
    return !this.root.classList.contains('hidden');
  }

  open(tab = 'character', { board = false } = {}) {
    if (!TABS.includes(tab)) tab = 'character';
    this.tab = tab;
    this.boardMode = board;
    this.root.classList.remove('hidden');
    this.refresh();
  }

  close() {
    this.root.classList.add('hidden');
    this.boardMode = false;
    this.selectedSlot = null;
  }

  toggle(tab) {
    if (this.isOpen && this.tab === tab) this.close();
    else this.open(tab);
  }

  refresh() {
    if (!this.isOpen || !this.character) return;
    document.querySelectorAll('.panel-tab-btn').forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === this.tab);
    });

    if (this.tab === 'character') this.renderCharacterTab();
    else if (this.tab === 'inventory') this.renderInventoryTab();
    else if (this.tab === 'skills') this.renderSkillsTab();
    else this.renderQuestsTab();
  }

  // ------------------------------------------------------------ skills / advancement

  renderSkillsTab() {
    const c = this.character;
    const nodes = treeFor(c);
    const points = availablePoints(c);
    const advancement = advancementState(c);

    const branches = [
      { key: 'base', label: `${c.baseClassName} — สายพื้นฐาน` },
      { key: 'advanced', label: advancement.state === 'done' ? `${c.className} — สายอาชีพขั้นสูง` : 'สายอาชีพขั้นสูง (ล็อก)' }
    ];

    const nodeHtml = (node) => {
      const maxed = node.rank >= node.maxRank;
      const buyable = node.status.ok;
      const classes = ['tree-node'];
      if (maxed) classes.push('maxed');
      else if (buyable) classes.push('buyable');
      else classes.push('locked');

      return `
        <div class="${classes.join(' ')}">
          <div class="node-head">
            <b>${node.name}</b>
            <span class="node-rank">${node.rank}/${node.maxRank}</span>
          </div>
          <p>${node.desc}</p>
          ${maxed
            ? '<span class="node-state done">เต็มแล้ว</span>'
            : buyable
              ? `<button class="btn btn-small" data-buy="${node.id}">ลงแต้ม (${node.cost})</button>`
              : `<span class="node-state">${node.status.reason}</span>`}
        </div>`;
    };

    const branchHtml = (branch) => {
      const branchNodes = nodes.filter((node) => node.branch === branch.key);
      if (branchNodes.length === 0) return '';
      const tiers = [1, 2, 3].filter((tier) => branchNodes.some((node) => node.tier === tier));
      return `
        <h4>${branch.label}</h4>
        <div class="tree-grid">
          ${tiers.map((tier) => `
            <div class="tree-tier">
              <div class="tier-label">Tier ${tier}</div>
              ${branchNodes.filter((node) => node.tier === tier).map(nodeHtml).join('')}
            </div>`).join('<div class="tier-arrow">→</div>')}
        </div>`;
    };

    this.body.innerHTML = `
      <div class="skills-header">
        <span class="points">Skill Points: <b>${points}</b></span>
        <button class="btn btn-small" data-respec ${c.gold < RESPEC_COST ? 'disabled' : ''}>
          Respec (${RESPEC_COST} G)
        </button>
      </div>
      ${this.advancementHtml(advancement)}
      ${branches.map(branchHtml).join('')}
    `;

    this.body.querySelectorAll('[data-buy]').forEach((button) => {
      button.onclick = () => {
        const result = buyNode(this.character, button.dataset.buy);
        if (!result.ok) this.onToast(result.reason, 'warn');
        else this.onToast(`${result.node.name} → แรงก์ ${result.rank}`, 'good');
        this.onChange();
      };
    });

    const respecButton = this.body.querySelector('[data-respec]');
    if (respecButton) {
      respecButton.onclick = () => {
        if (this.character.gold < RESPEC_COST) {
          this.onToast('ทองไม่พอ', 'warn');
          return;
        }
        this.character.gold -= RESPEC_COST;
        respec(this.character);
        this.onToast('คืนแต้มสกิลทั้งหมดแล้ว', 'good');
        this.onChange();
      };
    }

    this.body.querySelectorAll('[data-advance]').forEach((button) => {
      button.onclick = () => {
        const result = advanceTo(this.character, button.dataset.advance);
        if (!result.ok) {
          this.onToast(result.reason, 'warn');
          return;
        }
        this.onToast(`เปลี่ยนคลาสเป็น ${result.advanced.name}!`, 'level');
        this.onChange();
      };
    });
  }

  advancementHtml(advancement) {
    if (advancement.state === 'done') {
      return `<div class="advance-box done">
        <b>สายอาชีพ: ${advancement.advanced.name}</b>
        <p>${advancement.advanced.description}</p>
      </div>`;
    }
    if (advancement.state === 'locked' || advancement.state === 'trial') {
      return `<div class="advance-box locked">
        <b>Class Advancement (Lv.${ADVANCE_LEVEL})</b>
        <p>${advancement.reason}</p>
      </div>`;
    }

    return `
      <div class="advance-box ready">
        <b>เลือกสายอาชีพขั้นสูง — เลือกแล้วเปลี่ยนไม่ได้</b>
        <div class="advance-options">
          ${advancement.options.map((option) => `
            <div class="advance-card" style="--class-color:${option.color}">
              <span class="class-role">${option.role}</span>
              <strong>${option.name}</strong>
              <p>${option.description}</p>
              <small>HP +${option.statBonus.hp} · ATK +${option.statBonus.atk} · DEF +${option.statBonus.def} · SPD +${option.statBonus.spd}</small>
              <button class="btn btn-small" data-advance="${option.id}">เลือกสายนี้</button>
            </div>`).join('')}
        </div>
      </div>`;
  }

  // ------------------------------------------------------------ character

  renderCharacterTab() {
    const c = this.character;
    const expNeeded = expToNext(c.level);
    const expPct = Math.min(100, (c.exp / expNeeded) * 100);

    const statRow = (label, value, bonus) => `
      <div class="panel-stat">
        <span>${label}</span>
        <b>${value}</b>
        ${bonus ? `<em class="bonus">+${bonus}</em>` : ''}
      </div>`;

    this.body.innerHTML = `
      <div class="char-layout">
        <div class="char-side">
          <canvas id="panel-portrait" width="100" height="132"></canvas>
          <div class="char-name">${c.name}</div>
          <div class="char-class" style="color:${c.appearance.cloth}">${c.className}</div>
          <div class="char-role">${c.role}</div>
        </div>
        <div class="char-main">
          <div class="level-row">
            <span class="level-badge">Lv. ${c.level}</span>
            <div class="exp-bar"><div style="width:${expPct}%"></div><span>${c.exp} / ${expNeeded} EXP</span></div>
          </div>

          <h4>Stats</h4>
          <div class="panel-stats">
            ${statRow('HP', c.stats.hp, c.bonus.hp)}
            ${statRow(c.resource, c.stats.mp, c.bonus.mp)}
            ${statRow('ATK', c.stats.atk, c.bonus.atk)}
            ${statRow('DEF', c.stats.def, c.bonus.def)}
            ${statRow('SPD', c.stats.spd, c.bonus.spd)}
          </div>

          <h4>Equipment</h4>
          <div class="equip-slots">
            ${EQUIP_SLOTS.map((slot) => this.equipSlotHtml(slot)).join('')}
          </div>
        </div>
      </div>`;

    renderCharacterPortrait(document.getElementById('panel-portrait'), c.appearance, { scale: 4 });

    this.body.querySelectorAll('.equip-slot canvas').forEach((canvas) => {
      const def = getItem(canvas.dataset.item);
      if (def) renderItemIcon(canvas, def, 2);
    });

    this.body.querySelectorAll('[data-unequip]').forEach((button) => {
      button.onclick = () => {
        const result = unequip(this.character, button.dataset.unequip);
        if (!result.ok) this.onToast(result.reason, 'warn');
        else this.onToast(`ถอด ${getItem(result.removed).name}`, 'info');
        this.onChange();
      };
    });
  }

  equipSlotHtml(slot) {
    const itemId = this.character.equipment[slot];
    const def = getItem(itemId);
    return `
      <div class="equip-slot">
        <div class="equip-icon">${def ? `<canvas width="40" height="40" data-item="${itemId}"></canvas>` : '<span class="empty">—</span>'}</div>
        <div class="equip-info">
          <span class="equip-label">${SLOT_LABELS[slot]}</span>
          <b style="color:${def ? itemRarityColor(itemId) : '#6a6a8c'}">${def ? def.name : 'ว่าง'}</b>
          ${def ? `<small>${Object.entries(def.stats || {}).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(' · ')}</small>` : ''}
        </div>
        ${def ? `<button class="btn btn-small" data-unequip="${slot}">Unequip</button>` : ''}
      </div>`;
  }

  // ------------------------------------------------------------ inventory

  renderInventoryTab() {
    const c = this.character;
    const cells = [];
    for (let i = 0; i < INVENTORY_SIZE; i++) {
      const slot = c.inventory[i];
      const def = slot ? getItem(slot.id) : null;
      cells.push(`
        <button class="inv-cell ${this.selectedSlot === i ? 'selected' : ''} ${def ? '' : 'empty'}" data-slot="${i}"
                style="${def ? `--rarity:${itemRarityColor(slot.id)}` : ''}">
          ${def ? `<canvas width="36" height="36" data-item="${slot.id}"></canvas>` : ''}
          ${def && slot.count > 1 ? `<span class="inv-count">${slot.count}</span>` : ''}
        </button>`);
    }

    this.body.innerHTML = `
      <div class="inv-header">
        <span class="gold">◆ ${c.gold} Gold</span>
        <span class="slots">ช่องว่าง ${freeSlots(c.inventory)} / ${INVENTORY_SIZE}</span>
      </div>
      <div class="inv-grid">${cells.join('')}</div>
      <div class="inv-detail" id="inv-detail"></div>`;

    this.body.querySelectorAll('.inv-cell canvas').forEach((canvas) => {
      renderItemIcon(canvas, getItem(canvas.dataset.item), 2);
    });

    this.body.querySelectorAll('.inv-cell').forEach((cell) => {
      cell.onclick = () => {
        const index = Number(cell.dataset.slot);
        this.selectedSlot = this.character.inventory[index] ? index : null;
        this.refresh();
      };
    });

    this.renderItemDetail();
  }

  renderItemDetail() {
    const detail = document.getElementById('inv-detail');
    if (!detail) return;
    const index = this.selectedSlot;
    const slot = index === null ? null : this.character.inventory[index];
    if (!slot) {
      detail.innerHTML = '<p class="detail-empty">เลือกไอเทมเพื่อดูรายละเอียด</p>';
      return;
    }

    const def = getItem(slot.id);
    const rarity = RARITY[def.rarity] || RARITY.common;
    const stats = def.stats ? Object.entries(def.stats).map(([k, v]) => `${k.toUpperCase()} +${v}`).join(' · ') : '';
    const effect = def.effect ? Object.entries(def.effect).map(([k, v]) => `ฟื้นฟู ${k.toUpperCase()} ${v}`).join(' · ') : '';

    detail.innerHTML = `
      <div class="detail-head">
        <canvas width="48" height="48" data-item="${slot.id}"></canvas>
        <div>
          <b style="color:${rarity.color}">${def.name}</b>
          <small>${rarity.label} · ${def.type}${def.slot ? ` · ${SLOT_LABELS[def.slot]}` : ''}</small>
        </div>
      </div>
      <p class="detail-desc">${def.desc || ''}</p>
      ${stats ? `<p class="detail-stats">${stats}</p>` : ''}
      ${effect ? `<p class="detail-stats">${effect}</p>` : ''}
      <div class="detail-actions">
        ${def.type === 'equipment' ? '<button class="btn btn-small" data-action="equip">Equip</button>' : ''}
        ${def.type === 'consumable' ? '<button class="btn btn-small" data-action="use">Use</button>' : ''}
        <span class="detail-value">มูลค่า ${def.value} G</span>
      </div>`;

    renderItemIcon(detail.querySelector('canvas'), def, 3);

    const equipButton = detail.querySelector('[data-action="equip"]');
    if (equipButton) {
      equipButton.onclick = () => {
        const result = equipFromInventory(this.character, index);
        if (!result.ok) this.onToast(result.reason, 'warn');
        else this.onToast(`สวมใส่ ${getItem(result.equipped).name}`, 'good');
        this.selectedSlot = null;
        this.onChange();
      };
    }

    const useButton = detail.querySelector('[data-action="use"]');
    if (useButton) {
      useButton.onclick = () => {
        this.useConsumable(index);
      };
    }
  }

  useConsumable(index) {
    const slot = this.character.inventory[index];
    if (!slot) return;
    const def = getItem(slot.id);
    if (!def || def.type !== 'consumable') return;

    const c = this.character;
    const healedHp = def.effect.hp ? Math.min(def.effect.hp, c.maxHp - c.hp) : 0;
    const healedMp = def.effect.mp ? Math.min(def.effect.mp, c.maxMp - c.mp) : 0;

    if (healedHp === 0 && healedMp === 0) {
      this.onToast('ยังไม่จำเป็นต้องใช้ตอนนี้', 'warn');
      return;
    }

    c.hp += healedHp;
    c.mp += healedMp;
    removeAtSlot(c.inventory, index, 1);
    if (!c.inventory[index]) this.selectedSlot = null;

    const parts = [];
    if (healedHp) parts.push(`HP +${healedHp}`);
    if (healedMp) parts.push(`MP +${healedMp}`);
    this.onToast(parts.join(' · '), 'good');
    this.onChange();
  }

  // ------------------------------------------------------------ quests

  renderQuestsTab() {
    const c = this.character;
    const active = c.quests.active.map((entry) => getQuestDef(entry.id)).filter(Boolean);
    const board = this.boardMode ? availableQuests(c, 'quest-board') : [];
    const completed = c.quests.completed.map((id) => getQuestDef(id)).filter(Boolean);

    this.body.innerHTML = `
      ${board.length ? `
        <h4>Available on the Board</h4>
        <div class="quest-list">
          ${board.map((def) => `
            <div class="quest-card available">
              <div class="quest-head"><b>${def.title}</b><span class="quest-lv">Lv.${def.level}</span></div>
              <p>${def.summary}</p>
              <div class="quest-rewards">${this.rewardText(def)}</div>
              <button class="btn btn-small" data-accept="${def.id}">Accept</button>
            </div>`).join('')}
        </div>` : ''}

      <h4>Active (${active.length})</h4>
      <div class="quest-list">
        ${active.length ? active.map((def) => this.questCardHtml(def)).join('') : '<p class="detail-empty">ยังไม่มีเควสที่รับอยู่ — ลองคุยกับ NPC หรือดูที่กระดานประกาศ</p>'}
      </div>

      <h4>Completed (${completed.length})</h4>
      <div class="quest-done">
        ${completed.length ? completed.map((def) => `<span>✔ ${def.title}</span>`).join('') : '<span class="detail-empty">ยังไม่มี</span>'}
      </div>`;

    this.body.querySelectorAll('[data-accept]').forEach((button) => {
      button.onclick = () => {
        const def = getQuestDef(button.dataset.accept);
        if (acceptQuest(this.character, button.dataset.accept)) {
          this.onToast(`รับเควส: ${def.title}`, 'good');
          this.onChange();
        }
      };
    });
  }

  questCardHtml(def) {
    const objectives = objectiveProgress(this.character, def);
    const ready = isQuestComplete(this.character, def);
    const turnIn = def.turnIn || def.giver;

    return `
      <div class="quest-card ${ready ? 'ready' : ''}">
        <div class="quest-head">
          <b>${def.title}</b>
          ${ready ? '<span class="quest-ready">พร้อมส่ง</span>' : `<span class="quest-lv">Lv.${def.level}</span>`}
        </div>
        <p>${def.summary}</p>
        <ul class="objective-list">
          ${objectives.map((o) => `
            <li class="${o.done ? 'done' : ''}">
              <span>${o.done ? '✔' : '•'} ${o.text}</span>
              <b>${o.current} / ${o.count}</b>
            </li>`).join('')}
        </ul>
        <div class="quest-rewards">${this.rewardText(def)}</div>
        ${ready ? `<small class="quest-hint">ไปส่งเควสที่ ${turnIn === 'quest-board' ? 'กระดานประกาศ' : turnIn}</small>` : ''}
      </div>`;
  }

  rewardText(def) {
    const items = rewardItemsFor(this.character, def)
      .map((item) => `${getItem(item.id)?.name || item.id} ×${item.count}`);
    return `รางวัล: ${def.rewards.exp} EXP · ${def.rewards.gold} G${items.length ? ` · ${items.join(' · ')}` : ''}`;
  }
}
