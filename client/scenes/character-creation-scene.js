import { showScreen } from '../ui/screens.js';
import { drawNightSky } from '../rendering/backdrop.js';
import { CharacterCreationUI } from '../ui/character-creation-ui.js';
import { createCharacter, saveCharacter } from '../systems/character.js';

export class CharacterCreationScene {
  constructor(game) {
    this.game = game;
    this.time = 0;
    this.ui = null;
  }

  enter() {
    this.time = 0;
    showScreen('screen-creation');

    this.ui = new CharacterCreationUI({
      onCancel: () => this.game.scenes.change('title'),
      onConfirm: (selection) => {
        const character = createCharacter(selection);
        saveCharacter(character);
        this.game.scenes.change('loading', { character });
      }
    });
    this.ui.open();
  }

  exit() {
    if (this.ui) this.ui.close();
    this.ui = null;
  }

  update(dt) {
    this.time += dt;
    if (this.ui) this.ui.update(dt);
  }

  render(renderer) {
    renderer.beginScreen();
    drawNightSky(renderer, this.time, { eclipse: true, dim: 0.45 });
    renderer.end();
  }
}
