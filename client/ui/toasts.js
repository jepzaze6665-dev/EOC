// Short-lived messages: item pickups, EXP, level ups, quest updates.

const LIFETIME_MS = 2600;
const MAX_VISIBLE = 6;

export class Toasts {
  constructor() {
    this.root = document.getElementById('toasts');
  }

  push(text, kind = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${kind}`;
    toast.textContent = text;
    this.root.appendChild(toast);

    while (this.root.children.length > MAX_VISIBLE) this.root.firstChild.remove();

    setTimeout(() => {
      toast.classList.add('out');
      setTimeout(() => toast.remove(), 400);
    }, LIFETIME_MS);
  }

  clear() {
    this.root.innerHTML = '';
  }
}
