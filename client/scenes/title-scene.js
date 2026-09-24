import { showScreen } from '../ui/screens.js';
import { drawNightSky } from '../rendering/backdrop.js';
import { loadCharacter, clearCharacter } from '../systems/character.js';

export class TitleScene {
  constructor(game) {
    this.game = game;
    this.time = 0;
  }

  enter() {
    this.time = 0;
    showScreen('screen-title');

    const saved = loadCharacter();
    const btnContinue = document.getElementById('btn-continue');
    const btnNew = document.getElementById('btn-new');
    const btnDelete = document.getElementById('btn-delete');
    const savedInfo = document.getElementById('saved-info');

    btnContinue.classList.toggle('hidden', !saved);
    btnDelete.classList.toggle('hidden', !saved);
    savedInfo.textContent = saved ? `${saved.name} · ${saved.className} · Lv.${saved.level}` : '';

    btnContinue.onclick = () => {
      if (saved) this.game.scenes.change('loading', { character: saved });
    };
    btnNew.onclick = () => this.game.scenes.change('creation');
    btnDelete.onclick = () => {
      clearCharacter();
      this.enter();
    };
  }

  exit() {
    document.getElementById('btn-continue').onclick = null;
    document.getElementById('btn-new').onclick = null;
    document.getElementById('btn-delete').onclick = null;
  }

  update(dt) {
    this.time += dt;
  }

  render(renderer) {
    renderer.beginScreen();
    drawNightSky(renderer, this.time, { eclipse: true });
    renderer.end();
  }
}
