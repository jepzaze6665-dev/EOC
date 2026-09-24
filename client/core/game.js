import { Renderer } from '../rendering/renderer.js';
import { Input } from './input.js';
import { SceneManager } from './scene-manager.js';

export class Game {
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.input = new Input(window);
    this.scenes = new SceneManager(this);
    this.hud = null;

    this.time = 0;
    this.fps = 0;
    this.fpsFrames = 0;
    this.fpsTimer = 0;
    this.lastTime = 0;
    this.running = false;
  }

  start(sceneName, params = {}) {
    this.scenes.change(sceneName, params);
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  loop(now) {
    if (!this.running) return;

    // Delta time in seconds, clamped so a background tab does not teleport entities.
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.time += dt;

    this.scenes.update(dt);
    this.scenes.render(this.renderer);
    this.input.endFrame();

    this.fpsFrames++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsTimer);
      this.fpsFrames = 0;
      this.fpsTimer = 0;
    }

    requestAnimationFrame((t) => this.loop(t));
  }
}
