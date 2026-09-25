// Step 1 Class -> Step 2 Name -> Step 3 Confirm.
// Class = Preset Character: picking a class also picks the look, weapon, animation and
// effects (the class's `preset` in data/classes.js). The class grid is generated from
// the data file, so adding a class needs no change here.

import { randomName } from '../data/names.js';
import { getStartingClasses, getClass, getAdvancements, getSecretSlots } from '../systems/class-system.js';
import { getClassSkills, getUltimate } from '../systems/skill-system.js';
import { buildAppearance } from '../systems/character.js';
import { renderCharacterPortrait } from '../rendering/sprites.js';

const STEPS = ['class', 'name', 'confirm'];
const PREVIEW_DIRS = ['s', 'w', 'n', 'e'];
const NAME_PATTERN = /^[A-Za-z0-9ก-๙]{2,12}$/;

export class CharacterCreationUI {
  constructor({ onConfirm, onCancel }) {
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;

    this.el = {
      name: document.getElementById('creation-name'),
      randomize: document.getElementById('btn-randomize'),
      classGrid: document.getElementById('class-grid'),
      classDetail: document.getElementById('class-detail'),
      confirmSummary: document.getElementById('confirm-summary'),
      preview: document.getElementById('preview-canvas'),
      previewName: document.getElementById('preview-name'),
      previewClass: document.getElementById('preview-class'),
      error: document.getElementById('creation-error'),
      back: document.getElementById('btn-back'),
      next: document.getElementById('btn-next')
    };

    this.state = { step: 'class', classId: null, name: '' };
    this.time = 0;
  }

  open() {
    const starting = getStartingClasses();
    this.state = {
      step: 'class',
      classId: starting.length ? starting[0].id : null,
      name: randomName()
    };
    this.time = 0;

    this.renderClassGrid();
    this.el.name.value = this.state.name;

    this.el.name.oninput = () => {
      this.state.name = this.el.name.value;
      this.setError('');
      this.refreshPreview();
    };
    this.el.randomize.onclick = () => this.randomize();
    this.el.back.onclick = () => this.goBack();
    this.el.next.onclick = () => this.goNext();

    this.setStep('class');
  }

  close() {
    this.el.name.oninput = null;
    this.el.randomize.onclick = null;
    this.el.back.onclick = null;
    this.el.next.onclick = null;
  }

  // ---------------------------------------------------------------- steps

  setStep(step) {
    this.state.step = step;
    document.querySelectorAll('.step-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.step === step);
    });
    document.querySelectorAll('.stepper li').forEach((li) => {
      const index = STEPS.indexOf(li.dataset.step);
      li.classList.toggle('current', li.dataset.step === step);
      li.classList.toggle('done', index < STEPS.indexOf(step));
    });

    this.el.back.textContent = step === 'class' ? 'Title' : 'Back';
    this.el.next.textContent = step === 'confirm' ? 'Enter World' : 'Next';
    if (step === 'confirm') this.renderSummary();
    this.setError('');
    this.refreshPreview();
  }

  goBack() {
    const index = STEPS.indexOf(this.state.step);
    if (index === 0) {
      this.onCancel();
      return;
    }
    this.setStep(STEPS[index - 1]);
  }

  goNext() {
    if (this.state.step === 'class') {
      if (!this.state.classId) {
        this.setError('เลือกคลาสก่อนจึงจะไปต่อได้');
        return;
      }
      this.setStep('name');
      return;
    }
    if (this.state.step === 'name') {
      if (!NAME_PATTERN.test(this.state.name.trim())) {
        this.setError('ชื่อต้องยาว 2-12 ตัวอักษร (ห้ามเว้นวรรคและอักขระพิเศษ)');
        return;
      }
      this.setStep('confirm');
      return;
    }
    this.onConfirm({
      name: this.state.name.trim(),
      classId: this.state.classId
    });
  }

  setError(message) {
    this.el.error.textContent = message;
    this.el.error.classList.toggle('visible', !!message);
  }

  randomize() {
    this.state.name = randomName();
    this.el.name.value = this.state.name;
    this.setError('');
    this.refreshPreview();
  }

  // ---------------------------------------------------------------- grids

  renderClassGrid() {
    this.el.classGrid.innerHTML = '';
    for (const classDef of getStartingClasses()) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'class-card';
      card.dataset.id = classDef.id;
      card.style.setProperty('--class-color', classDef.color);
      card.innerHTML = `
        <canvas class="class-portrait" width="60" height="96"></canvas>
        <span class="class-role">${classDef.role}</span>
        <strong class="class-name">${classDef.name}</strong>
        <span class="class-weapon">${classDef.weapon}</span>
        <span class="class-tagline">${classDef.tagline}</span>
      `;
      renderCharacterPortrait(card.querySelector('canvas'), buildAppearance(classDef.id), { scale: 3 });
      card.onclick = () => {
        this.state.classId = classDef.id;
        this.markSelected(this.el.classGrid, classDef.id);
        this.renderClassDetail();
        this.refreshPreview();
      };
      this.el.classGrid.appendChild(card);
    }

    const secrets = getSecretSlots();
    if (secrets.length > 0) {
      const locked = document.createElement('div');
      locked.className = 'class-card locked';
      locked.innerHTML = `
        <span class="class-role">Locked</span>
        <strong class="class-name">???</strong>
        <span class="class-tagline">บางเส้นทางไม่ได้เลือกที่นี่ — ต้องออกไปค้นพบเอง</span>
      `;
      this.el.classGrid.appendChild(locked);
    }

    this.markSelected(this.el.classGrid, this.state.classId);
    this.renderClassDetail();
  }

  renderClassDetail() {
    const classDef = getClass(this.state.classId);
    if (!classDef) {
      this.el.classDetail.innerHTML = '';
      return;
    }
    const ultimate = getUltimate(classDef.id);
    const maxStat = 150;
    const statRow = (label, value) => `
      <div class="stat-row">
        <span>${label}</span>
        <div class="stat-bar"><div style="width:${Math.min(100, (value / maxStat) * 100)}%"></div></div>
        <b>${value}</b>
      </div>`;

    this.el.classDetail.innerHTML = `
      <p class="class-desc">${classDef.description}</p>
      <div class="stat-list">
        ${statRow('HP', classDef.stats.hp)}
        ${statRow(classDef.resource, classDef.stats.mp)}
        ${statRow('ATK', classDef.stats.atk)}
        ${statRow('DEF', classDef.stats.def)}
        ${statRow('SPD', classDef.stats.spd)}
      </div>
      <h4>Weapon</h4>
      <p class="class-desc">${classDef.weapon}</p>
      <h4>Starting Skills</h4>
      <ul class="skill-list">
        ${getClassSkills(classDef.id).map((s, i) => `<li><b>[${i + 1}] ${s.name}</b> — ${s.desc}</li>`).join('')}
        ${ultimate ? `<li><b>[R] ${ultimate.name}</b> — ${ultimate.desc}</li>` : ''}
      </ul>
    `;
  }

  renderSummary() {
    const classDef = getClass(this.state.classId);
    const advancements = getAdvancements(this.state.classId);

    this.el.confirmSummary.innerHTML = `
      <div class="summary-line"><span>Name</span><b>${this.state.name.trim()}</b></div>
      <div class="summary-line"><span>Class</span><b style="color:${classDef.color}">${classDef.name}</b></div>
      <div class="summary-line"><span>Weapon</span><b>${classDef.weapon}</b></div>
      <div class="summary-line"><span>Role</span><b>${classDef.role}</b></div>
      <div class="summary-line"><span>Start</span><b>Lumina Village</b></div>
      <div class="tree-preview">
        <span>Class Tree</span>
        <div class="tree-branches">
          ${advancements.map((a) => `<em>${a.name}<small>Lv.${a.requires.level}</small></em>`).join('')}
        </div>
      </div>
      <p class="summary-note">ตัวละครจะถูกบันทึกไว้ในเครื่องนี้ (localStorage) — Phase 8 จะย้ายไปเก็บบนเซิร์ฟเวอร์</p>
    `;
  }

  markSelected(container, id) {
    container.querySelectorAll('[data-id]').forEach((el) => {
      el.classList.toggle('selected', el.dataset.id === id);
    });
  }

  // ---------------------------------------------------------------- preview

  refreshPreview() {
    const classDef = getClass(this.state.classId);
    this.el.previewName.textContent = this.state.name.trim() || '—';
    this.el.previewClass.textContent = classDef ? `${classDef.name} · ${classDef.role}` : 'เลือกคลาส';
    if (classDef) this.el.previewClass.style.color = classDef.color;
  }

  update(dt) {
    this.time += dt;
    if (!this.state.classId) return;
    const look = buildAppearance(this.state.classId);
    const dir = PREVIEW_DIRS[Math.floor(this.time / 1.6) % PREVIEW_DIRS.length];
    const frame = Math.floor(this.time * 6) % 4;
    renderCharacterPortrait(this.el.preview, look, { scale: 4, dir, frame });
  }
}
