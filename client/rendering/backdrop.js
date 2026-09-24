// Animated menu background: starfield + the eclipse the game is named after.

const stars = [];

function seedStars() {
  if (stars.length) return;
  let s = 20260922;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < 150; i++) {
    stars.push({
      x: rand(),
      y: rand(),
      size: rand() < 0.85 ? 1 : 2,
      phase: rand() * Math.PI * 2,
      speed: 0.6 + rand() * 1.8
    });
  }
}

export function drawNightSky(renderer, time, { eclipse = true, dim = 0 } = {}) {
  seedStars();
  const g = renderer.ctx;
  const w = renderer.width;
  const h = renderer.height;

  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#070714');
  sky.addColorStop(0.55, '#0d0c22');
  sky.addColorStop(1, '#161232');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);

  for (const star of stars) {
    const twinkle = 0.45 + 0.55 * Math.sin(time * star.speed + star.phase);
    g.globalAlpha = Math.max(0, twinkle);
    g.fillStyle = '#dfe2ff';
    g.fillRect(Math.round(star.x * w), Math.round(star.y * h), star.size, star.size);
  }
  g.globalAlpha = 1;

  if (eclipse) {
    const cx = Math.round(w * 0.5);
    const cy = Math.round(h * 0.34);
    const r = Math.round(Math.min(w, h) * 0.15);
    const pulse = 1 + Math.sin(time * 0.8) * 0.04;

    const corona = g.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 2.4 * pulse);
    corona.addColorStop(0, 'rgba(255, 214, 150, 0.55)');
    corona.addColorStop(0.35, 'rgba(160, 120, 255, 0.22)');
    corona.addColorStop(1, 'rgba(10, 10, 25, 0)');
    g.fillStyle = corona;
    g.beginPath();
    g.arc(cx, cy, r * 2.4 * pulse, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = '#f6e3b8';
    g.beginPath();
    g.arc(cx, cy, r + 1, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = '#080812';
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
  }

  if (dim > 0) {
    g.fillStyle = `rgba(4, 4, 12, ${dim})`;
    g.fillRect(0, 0, w, h);
  }
}
