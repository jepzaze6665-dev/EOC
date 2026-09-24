// Each scene implements: enter(params), exit(), update(dt), render(renderer)

export class SceneManager {
  constructor(game) {
    this.game = game;
    this.scenes = new Map();
    this.current = null;
    this.currentName = null;
  }

  register(name, scene) {
    this.scenes.set(name, scene);
    return this;
  }

  change(name, params = {}) {
    const next = this.scenes.get(name);
    if (!next) throw new Error(`Unknown scene: ${name}`);

    if (this.current && this.current.exit) this.current.exit();
    this.current = next;
    this.currentName = name;
    if (next.enter) next.enter(params);
  }

  update(dt) {
    if (this.current && this.current.update) this.current.update(dt);
  }

  render(renderer) {
    if (this.current && this.current.render) this.current.render(renderer);
  }
}
