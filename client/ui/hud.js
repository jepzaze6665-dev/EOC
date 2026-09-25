// In-world HUD: portrait, vitals, EXP, gold, zone info, quest tracker,
// interact prompt and dialogue box.

import { renderCharacterPortrait } from '../rendering/sprites.js';
import { expToNext } from '../systems/stats.js';

const DEFAULT_HINT = '[E] ต่อไป · [Esc] ปิด';

export class Hud {
  constructor() {
    this.root = document.getElementById('hud');
    this.el = {
      portrait: document.getElementById('portrait-canvas'),
      name: document.getElementById('hud-name'),
      level: document.getElementById('hud-level'),
      className: document.getElementById('hud-class'),
      hp: document.getElementById('hud-hp'),
      hpText: document.getElementById('hud-hp-text'),
      mp: document.getElementById('hud-mp'),
      mpText: document.getElementById('hud-mp-text'),
      exp: document.getElementById('hud-exp'),
      expText: document.getElementById('hud-exp-text'),
      gold: document.getElementById('hud-gold'),
      zone: document.getElementById('hud-zone'),
      coords: document.getElementById('hud-coords'),
      fps: document.getElementById('hud-fps'),
      skillbar: document.getElementById('hud-skillbar'),
      prompt: document.getElementById('interact-prompt'),
      dialogue: document.getElementById('dialogue'),
      dialogueName: document.getElementById('dialogue-name'),
      dialogueText: document.getElementById('dialogue-text'),
      dialogueHint: document.getElementById('dialogue-hint'),
      tracker: document.getElementById('quest-tracker'),
      targetFrame: document.getElementById('target-frame'),
      targetName: document.getElementById('target-name'),
      targetHp: document.getElementById('target-hp'),
      targetHpText: document.getElementById('target-hp-text'),
      combatFlag: document.getElementById('combat-flag')
    };
    this.skillSlots = [];
  }

  show() {
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
    this.setPrompt(null);
    this.hideDialogue();
  }

  setCharacter(character) {
    this.el.name.textContent = character.name;
    this.el.level.textContent = character.level;
    this.el.className.textContent = `${character.className} · ${character.role}`;

    this.el.hp.style.width = `${(character.hp / character.maxHp) * 100}%`;
    this.el.hpText.textContent = `${character.hp} / ${character.maxHp}`;
    this.el.mp.style.width = `${(character.mp / character.maxMp) * 100}%`;
    this.el.mpText.textContent = `${character.mp} / ${character.maxMp}`;

    const needed = expToNext(character.level);
    this.el.exp.style.width = `${Math.min(100, (character.exp / needed) * 100)}%`;
    this.el.expText.textContent = `EXP ${character.exp} / ${needed}`;
    this.el.gold.textContent = `◆ ${character.gold}`;

    renderCharacterPortrait(this.el.portrait, character.appearance, { scale: 2 });
  }

  // Built once per zone entry; only the cooldown overlay changes per frame.
  setupSkillbar(character) {
    this.el.skillbar.innerHTML = '';
    this.skillSlots = [];

    // basic attack (left mouse button)
    const attack = document.createElement('div');
    attack.className = 'skill-slot utility';
    attack.title = 'Basic attack - คลิกซ้ายไปทางเมาส์ (กดค้างเพื่อโจมตีต่อเนื่อง)';
    attack.innerHTML = '<b>LMB</b><span>Attack</span>';
    this.el.skillbar.appendChild(attack);

    const skills = character.skills || [];
    skills.slice(0, 4).forEach((skill, index) => {
      const slot = document.createElement('div');
      slot.className = 'skill-slot';
      slot.title = `${skill.name} — ${skill.desc}`;
      slot.innerHTML = `
        <div class="cooldown"></div>
        <b>${index + 1}</b>
        <span>${skill.name}</span>
        <em>${skill.mp}</em>`;
      this.el.skillbar.appendChild(slot);
      this.skillSlots.push({ id: skill.id, mp: skill.mp, el: slot, cooldownEl: slot.querySelector('.cooldown'), def: skill });
    });

    // ultimate (R)
    this.ultimateSlot = null;
    if (character.ultimate) {
      const ult = character.ultimate;
      const slot = document.createElement('div');
      slot.className = 'skill-slot ultimate';
      slot.title = `${ult.name} (Ultimate) — ${ult.desc}`;
      slot.innerHTML = `<div class="cooldown"></div><b>R</b><span>${ult.name}</span>`;
      this.el.skillbar.appendChild(slot);
      this.ultimateSlot = { id: ult.id, el: slot, cooldownEl: slot.querySelector('.cooldown'), def: ult };
    }

    const dodge = document.createElement('div');
    dodge.className = 'skill-slot utility';
    dodge.title = 'Dodge roll — หลบสั้น ๆ พร้อมช่วงอมตะ';
    dodge.innerHTML = '<div class="cooldown"></div><b>Q</b><span>Dodge</span>';
    this.el.skillbar.appendChild(dodge);
    this.dodgeSlot = { el: dodge, cooldownEl: dodge.querySelector('.cooldown') };

    const potion = document.createElement('div');
    potion.className = 'skill-slot utility';
    potion.title = 'ดื่มโพชั่นฟื้น HP ชิ้นแรกในกระเป๋า';
    potion.innerHTML = '<b>F</b><span>Potion</span>';
    this.el.skillbar.appendChild(potion);
  }

  updateSkillbar(character, player, dodgeRatio = 0) {
    for (const slot of this.skillSlots) {
      const cooldown = player.cooldowns[slot.id] || 0;
      const ratio = cooldown > 0 ? Math.min(1, cooldown / slot.def.cooldown) : 0;
      slot.cooldownEl.style.height = `${ratio * 100}%`;
      slot.el.classList.toggle('on-cooldown', cooldown > 0);
      slot.el.classList.toggle('no-resource', character.mp < slot.mp);
    }
    if (this.ultimateSlot) {
      const slot = this.ultimateSlot;
      const cooldown = player.cooldowns[slot.id] || 0;
      slot.cooldownEl.style.height = `${cooldown > 0 ? Math.min(1, cooldown / slot.def.cooldown) * 100 : 0}%`;
      slot.el.classList.toggle('on-cooldown', cooldown > 0);
    }
    if (this.dodgeSlot) {
      this.dodgeSlot.cooldownEl.style.height = `${Math.max(0, Math.min(1, dodgeRatio)) * 100}%`;
    }
  }

  setTarget(monster) {
    if (!monster) {
      this.el.targetFrame.classList.add('hidden');
      return;
    }
    this.el.targetFrame.classList.remove('hidden');
    this.el.targetName.textContent = `${monster.name}  Lv.${monster.level}`;
    const pct = Math.max(0, (monster.hp / monster.maxHp) * 100);
    this.el.targetHp.style.width = `${pct}%`;
    this.el.targetHpText.textContent = `${Math.ceil(monster.hp)} / ${monster.maxHp}`;
  }

  setCombatState(inCombat) {
    this.el.combatFlag.classList.toggle('hidden', !inCombat);
  }

  setQuestTracker(tracked) {
    if (!tracked) {
      this.el.tracker.classList.add('hidden');
      return;
    }
    this.el.tracker.classList.remove('hidden');
    this.el.tracker.innerHTML = `
      <div class="tracker-title">${tracked.def.title}</div>
      ${tracked.objectives.map((o) => `
        <div class="tracker-line ${o.done ? 'done' : ''}">
          <span>${o.done ? '✔' : '•'} ${o.text}</span><b>${o.current}/${o.count}</b>
        </div>`).join('')}`;
  }

  setZone(name, safeZone = true) {
    this.el.zone.textContent = name;
    const flag = document.getElementById('zone-flag');
    flag.textContent = safeZone ? 'SAFE ZONE' : 'DANGER ZONE';
    flag.classList.toggle('safe', safeZone);
    flag.classList.toggle('danger', !safeZone);
  }

  setStatus({ tx, ty, fps }) {
    this.el.coords.textContent = `X ${tx.toFixed(1)}  Y ${ty.toFixed(1)}`;
    this.el.fps.textContent = `${fps} FPS`;
  }

  setPrompt(text) {
    if (!text) {
      this.el.prompt.classList.add('hidden');
      return;
    }
    this.el.prompt.textContent = text;
    this.el.prompt.classList.remove('hidden');
  }

  showDialogue(name, text, hint = DEFAULT_HINT) {
    this.el.dialogueName.textContent = name;
    this.el.dialogueText.textContent = text;
    this.el.dialogueHint.textContent = hint;
    this.el.dialogue.classList.remove('hidden');
  }

  hideDialogue() {
    this.el.dialogue.classList.add('hidden');
  }
}
