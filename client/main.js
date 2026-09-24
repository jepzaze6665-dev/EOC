// ECLIPSE ONLINE - entry point.
// Flow: TITLE -> CHARACTER CREATION (preset / class / confirm) -> LOADING -> VILLAGE

import { Game } from './core/game.js';
import { Hud } from './ui/hud.js';
import { Panels } from './ui/panels.js';
import { Toasts } from './ui/toasts.js';
import { initClassSystem } from './systems/class-system.js';
import { installDevTools } from './systems/dev-tools.js';
import { TitleScene } from './scenes/title-scene.js';
import { CharacterCreationScene } from './scenes/character-creation-scene.js';
import { LoadingScene } from './scenes/loading-scene.js';
import { WorldScene } from './scenes/world-scene.js';
import { MapManager } from './world/map-manager.js';

function boot() {
  initClassSystem();

  const canvas = document.getElementById('game-canvas');
  const game = new Game(canvas);
  game.maps = new MapManager();
  game.hud = new Hud();
  game.toasts = new Toasts();
  game.panels = new Panels({
    onChange: () => {
      const scene = game.scenes.current;
      if (scene && scene.onCharacterChanged) scene.onCharacterChanged();
    },
    onToast: (text, kind) => game.toasts.push(text, kind)
  });

  game.scenes
    .register('title', new TitleScene(game))
    .register('creation', new CharacterCreationScene(game))
    .register('loading', new LoadingScene(game))
    .register('world', new WorldScene(game));

  window.addEventListener('resize', () => game.renderer.resize());
  game.start('title');

  // Handy while developing: window.eclipse.dev.help() lists the commands,
  // or press ` in game for the dev panel.
  window.eclipse = game;
  game.dev = installDevTools(game);
  window.eclipse.dev = game.dev;
}

boot();
