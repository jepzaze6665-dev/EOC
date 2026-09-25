// Keyboard + mouse state. Uses e.code so WASD works on any keyboard layout.
// Mouse buttons are reported like keys: 'Mouse0' = left, 'Mouse2' = right - but only for
// clicks on the game canvas, never on UI panels.

const PREVENT_DEFAULT = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'F8'
]);

function isTypingInField() {
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
}

export class Input {
  constructor(target = window) {
    this.held = new Set();
    this.justPressed = new Set();
    this.wheel = 0;
    this.mouse = { x: 0, y: 0, inside: false }; // CSS pixels over the game canvas

    target.addEventListener('keydown', (e) => {
      if (isTypingInField()) return;
      if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
      if (!e.repeat) this.justPressed.add(e.code);
      this.held.add(e.code);
    });

    target.addEventListener('keyup', (e) => {
      this.held.delete(e.code);
    });

    // Mouse wheel over the game canvas (not over UI panels, which scroll normally).
    target.addEventListener('wheel', (e) => {
      if (e.target && e.target.id === 'game-canvas') this.wheel += Math.sign(e.deltaY);
    }, { passive: true });

    target.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.inside = !!e.target && e.target.id === 'game-canvas';
    });
    target.addEventListener('mousedown', (e) => {
      if (!e.target || e.target.id !== 'game-canvas') return;
      this.justPressed.add(`Mouse${e.button}`);
      this.held.add(`Mouse${e.button}`);
    });
    target.addEventListener('mouseup', (e) => this.held.delete(`Mouse${e.button}`));
    target.addEventListener('contextmenu', (e) => {
      if (e.target && e.target.id === 'game-canvas') e.preventDefault();
    });

    // Keys stay stuck down if the window loses focus mid-press.
    window.addEventListener('blur', () => this.held.clear());
  }

  isDown(code) {
    return this.held.has(code);
  }

  wasPressed(code) {
    return this.justPressed.has(code);
  }

  // Screen-space movement direction, normalized.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) y -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) y += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.SQRT2;
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  // Wheel steps since the last call: negative = scrolled up (zoom in).
  consumeWheel() {
    const steps = this.wheel;
    this.wheel = 0;
    return steps;
  }

  endFrame() {
    this.justPressed.clear();
    this.wheel = 0;
  }
}
