// Tiny particle system. Particles carry a depth so they sort with the world.

import { RENDER_LAYERS } from './map-renderer.js';

export class Particles {
  constructor(limit = 500) {
    this.limit = limit;
    this.list = [];
  }

  emit(x, y, options = {}) {
    if (this.list.length >= this.limit) return;
    const {
      vx = 0, vy = -10, life = 1, color = '#ffffff',
      size = 1, gravity = 0, depth = 0, fade = true
    } = options;
    this.list.push({ x, y, vx, vy, life, maxLife: life, color, size, gravity, depth, fade });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.list.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  render(renderer) {
    for (const p of this.list) {
      renderer.queue(p.depth, (g) => {
        g.save();
        if (p.fade) g.globalAlpha = Math.max(0, p.life / p.maxLife);
        g.fillStyle = p.color;
        g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        g.restore();
      }, RENDER_LAYERS.EFFECTS);
    }
  }

  clear() {
    this.list.length = 0;
  }
}
